/**
 * Public data-access API used by all pages.
 *
 * Backed by src/lib/store.ts, which keeps an in-memory cache synced with
 * the real on-disk SQLite database (via Electron IPC) so this file can stay
 * fully synchronous — no page needs to change to async/await.
 *
 * IMPORTANT — accounting consistency:
 * Receipts and expenses are mirrored into the cashbox automatically, and
 * receipts update their linked invoice's paid_amount/status automatically.
 * Do not bypass db.receipts / db.expenses to write directly into db.cashbox
 * for those flows, or the two will fall out of sync.
 */
import {
  getAllSync,
  addSync,
  updateSync,
  deleteSync,
  getMutableRows,
  persistTableUpdate,
} from "./store";
import type {
  Customer,
  Case,
  Invoice,
  InvoiceItem,
  Receipt,
  InventoryEntry,
  CashboxEntry,
  Expense,
} from "./types";

export type {
  Customer,
  Case,
  InvoiceItem,
  Invoice,
  Receipt,
  InventoryEntry,
  CashboxEntry,
  Expense,
};

export { initStore, ready as storeReady, subscribe } from "./store";

function nextNumber(prefix: string, items: { invoice_number?: string; receipt_number?: string }[]): string {
  const nums = items.map((it) => {
    const n = (it.invoice_number || it.receipt_number || "").replace(prefix, "");
    return parseInt(n) || 0;
  });
  const max = nums.length ? Math.max(...nums) : 0;
  return `${prefix}${String(max + 1).padStart(4, "0")}`;
}

// ─── Accounting glue: keep cashbox + invoice status in sync locally ───────────
// The Electron main process performs the equivalent logic against SQLite in
// the same transaction as the write. These mirror that logic against the
// in-memory cache so the UI reflects it immediately, without waiting on IPC.

function recalcInvoiceStatusLocal(invoiceId: string): void {
  if (!invoiceId) return;
  const invoices = getMutableRows("invoices");
  const invoice = invoices.find((i) => i.id === invoiceId);
  if (!invoice) return;
  const receipts = getMutableRows("receipts");
  const paid = receipts
    .filter((r) => r.invoice_id === invoiceId)
    .reduce((sum, r) => sum + r.amount, 0);
  let status: Invoice["status"] = "unpaid";
  if (paid >= invoice.total && invoice.total > 0) status = "paid";
  else if (paid > 0) status = "partial";
  invoice.paid_amount = paid;
  invoice.status = status;
  persistTableUpdate("invoices", invoiceId, { paid_amount: paid, status });
}

function syncCashboxForReceiptLocal(receipt: Receipt): void {
  const cashboxRows = getMutableRows("cashbox");
  const existing = cashboxRows.find((c) => c.source === "receipt" && c.source_id === receipt.id);
  const description = `تحصيل من ${receipt.customer_name}${receipt.receipt_number ? " - " + receipt.receipt_number : ""}`;
  if (existing) {
    existing.date = receipt.date;
    existing.amount = receipt.amount;
    existing.description = description;
    existing.reference = receipt.receipt_number || "";
  } else {
    cashboxRows.push({
      id: "cb_" + receipt.id,
      date: receipt.date,
      type: "income",
      amount: receipt.amount,
      description,
      reference: receipt.receipt_number || "",
      source: "receipt",
      source_id: receipt.id,
      created_at: new Date().toISOString(),
    });
  }
  // Persistence to SQLite for the cashbox mirror happens inside the main
  // process transaction triggered by the receipts add/update IPC call —
  // we don't need a separate persist call here for the cashbox row itself.
}

function removeCashboxForSourceLocal(source: CashboxEntry["source"], sourceId: string): void {
  const cashboxRows = getMutableRows("cashbox");
  const idx = cashboxRows.findIndex((c) => c.source === source && c.source_id === sourceId);
  if (idx !== -1) cashboxRows.splice(idx, 1);
}

function syncCashboxForExpenseLocal(expense: Expense): void {
  const cashboxRows = getMutableRows("cashbox");
  const existing = cashboxRows.find((c) => c.source === "expense" && c.source_id === expense.id);
  const description = `مصروف: ${expense.category}${expense.description ? " - " + expense.description : ""}`;
  if (existing) {
    existing.date = expense.date;
    existing.amount = expense.amount;
    existing.description = description;
  } else {
    cashboxRows.push({
      id: "cb_" + expense.id,
      date: expense.date,
      type: "expense",
      amount: expense.amount,
      description,
      reference: "",
      source: "expense",
      source_id: expense.id,
      created_at: new Date().toISOString(),
    });
  }
}

export const db = {
  customers: {
    getAll(): Customer[] {
      return getAllSync("customers");
    },
    getById(id: string): Customer | undefined {
      return getAllSync("customers").find((c) => c.id === id);
    },
    add(data: Omit<Customer, "id" | "created_at">): Customer {
      return addSync("customers", data);
    },
    update(id: string, data: Partial<Customer>): Customer | undefined {
      return updateSync("customers", id, data);
    },
    delete(id: string): void {
      deleteSync("customers", id);
    },
    search(q: string): Customer[] {
      const lower = q.toLowerCase();
      return db.customers.getAll().filter(
        (c) => c.name.toLowerCase().includes(lower) || c.phone.includes(q)
      );
    },
  },

  cases: {
    getAll(): Case[] {
      return getAllSync("cases");
    },
    getById(id: string): Case | undefined {
      return getAllSync("cases").find((c) => c.id === id);
    },
    getByCustomer(customer_id: string): Case[] {
      return db.cases.getAll().filter((c) => c.customer_id === customer_id);
    },
    add(data: Omit<Case, "id" | "created_at" | "powder_weight">): Case {
      return addSync("cases", {
        ...data,
        powder_weight: data.teeth_count * 2.5,
      });
    },
    update(id: string, data: Partial<Omit<Case, "powder_weight">>): Case | undefined {
      const patch: Partial<Case> = { ...data };
      if (data.teeth_count !== undefined) patch.powder_weight = data.teeth_count * 2.5;
      return updateSync("cases", id, patch);
    },
    delete(id: string): void {
      deleteSync("cases", id);
    },
  },

  invoices: {
    getAll(): Invoice[] {
      return getAllSync("invoices");
    },
    getById(id: string): Invoice | undefined {
      return getAllSync("invoices").find((i) => i.id === id);
    },
    getByCustomer(customer_id: string): Invoice[] {
      return db.invoices.getAll().filter((i) => i.customer_id === customer_id);
    },
    add(data: Omit<Invoice, "id" | "invoice_number" | "created_at" | "paid_amount" | "status"> & { status?: Invoice["status"] }): Invoice {
      const all = getAllSync("invoices");
      return addSync("invoices", {
        ...data,
        invoice_number: nextNumber("INV-", all),
        paid_amount: 0,
        status: "unpaid",
      });
    },
    update(id: string, data: Partial<Invoice>): Invoice | undefined {
      const result = updateSync("invoices", id, data);
      // Total may have changed — recompute status against existing receipts.
      recalcInvoiceStatusLocal(id);
      return getAllSync("invoices").find((i) => i.id === id) ?? result;
    },
    delete(id: string): void {
      deleteSync("invoices", id);
    },
  },

  receipts: {
    getAll(): Receipt[] {
      return getAllSync("receipts");
    },
    getById(id: string): Receipt | undefined {
      return getAllSync("receipts").find((r) => r.id === id);
    },
    getByInvoice(invoice_id: string): Receipt[] {
      return db.receipts.getAll().filter((r) => r.invoice_id === invoice_id);
    },
    add(data: Omit<Receipt, "id" | "receipt_number" | "created_at">): Receipt {
      const all = getAllSync("receipts");
      const receipt = addSync("receipts", {
        ...data,
        receipt_number: nextNumber("RCP-", all),
      });
      syncCashboxForReceiptLocal(receipt);
      if (receipt.invoice_id) recalcInvoiceStatusLocal(receipt.invoice_id);
      return receipt;
    },
    update(id: string, data: Partial<Receipt>): Receipt | undefined {
      const previous = getAllSync("receipts").find((r) => r.id === id);
      const previousInvoiceId = previous?.invoice_id;
      const updated = updateSync("receipts", id, data);
      if (updated) {
        syncCashboxForReceiptLocal(updated);
        if (updated.invoice_id) recalcInvoiceStatusLocal(updated.invoice_id);
        // If the receipt was moved off a different invoice, recompute that one too.
        if (previousInvoiceId && previousInvoiceId !== updated.invoice_id) {
          recalcInvoiceStatusLocal(previousInvoiceId);
        }
      }
      return updated;
    },
    delete(id: string): void {
      const receipt = getAllSync("receipts").find((r) => r.id === id);
      deleteSync("receipts", id);
      removeCashboxForSourceLocal("receipt", id);
      if (receipt?.invoice_id) recalcInvoiceStatusLocal(receipt.invoice_id);
    },
  },

  inventory: {
    getAll(): InventoryEntry[] {
      return [...getAllSync("inventory")].sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
      );
    },
    getBalance(): number {
      const all = getAllSync("inventory");
      return all.reduce((sum, e) => (e.type === "in" ? sum + e.quantity : sum - e.quantity), 0);
    },
    add(data: Omit<InventoryEntry, "id" | "created_at">): InventoryEntry {
      return addSync("inventory", data);
    },
    update(id: string, data: Partial<InventoryEntry>): InventoryEntry | undefined {
      return updateSync("inventory", id, data);
    },
    delete(id: string): void {
      deleteSync("inventory", id);
    },
  },

  cashbox: {
    getAll(): CashboxEntry[] {
      return [...getAllSync("cashbox")].sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
      );
    },
    getBalance(): number {
      const all = getAllSync("cashbox");
      return all.reduce((sum, e) => (e.type === "income" ? sum + e.amount : sum - e.amount), 0);
    },
    /** Adds a manual cashbox movement. For income from a customer payment, use db.receipts.add instead so it links to an invoice correctly. For an operating cost, use db.expenses.add instead so it's categorized in expense reports. */
    add(data: Omit<CashboxEntry, "id" | "created_at" | "source" | "source_id">): CashboxEntry {
      return addSync("cashbox", { ...data, source: "manual", source_id: "" });
    },
    update(id: string, data: Partial<CashboxEntry>): CashboxEntry | undefined {
      const existing = getAllSync("cashbox").find((c) => c.id === id);
      if (existing && existing.source !== "manual") {
        console.warn("[db] Refusing to manually edit an auto-generated cashbox entry; edit the linked receipt/expense instead.");
        return existing;
      }
      return updateSync("cashbox", id, data);
    },
    delete(id: string): void {
      const existing = getAllSync("cashbox").find((c) => c.id === id);
      if (existing && existing.source !== "manual") {
        console.warn("[db] Refusing to delete an auto-generated cashbox entry; delete the linked receipt/expense instead.");
        return;
      }
      deleteSync("cashbox", id);
    },
  },

  expenses: {
    getAll(): Expense[] {
      return [...getAllSync("expenses")].sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
      );
    },
    add(data: Omit<Expense, "id" | "created_at">): Expense {
      const expense = addSync("expenses", data);
      syncCashboxForExpenseLocal(expense);
      return expense;
    },
    update(id: string, data: Partial<Expense>): Expense | undefined {
      const updated = updateSync("expenses", id, data);
      if (updated) syncCashboxForExpenseLocal(updated);
      return updated;
    },
    delete(id: string): void {
      deleteSync("expenses", id);
      removeCashboxForSourceLocal("expense", id);
    },
  },

  reports: {
    summary() {
      const customers = db.customers.getAll();
      const cases = db.cases.getAll();
      const invoices = db.invoices.getAll();
      const receipts = db.receipts.getAll();
      const cashBalance = db.cashbox.getBalance();
      const inventoryBalance = db.inventory.getBalance();
      const totalRevenue = invoices.reduce((s, i) => s + i.total, 0);
      const totalCollected = receipts.reduce((s, r) => s + r.amount, 0);
      const totalPending = invoices.reduce((s, i) => s + Math.max(0, i.total - i.paid_amount), 0);
      return {
        customers: customers.length,
        cases: cases.length,
        casesByStatus: {
          pending: cases.filter((c) => c.status === "pending").length,
          in_progress: cases.filter((c) => c.status === "in_progress").length,
          completed: cases.filter((c) => c.status === "completed").length,
          delivered: cases.filter((c) => c.status === "delivered").length,
        },
        invoices: invoices.length,
        totalRevenue,
        totalCollected,
        totalPending,
        cashBalance,
        inventoryBalance,
      };
    },
    monthlyRevenue(): { month: string; revenue: number; collected: number }[] {
      const invoices = db.invoices.getAll();
      const receipts = db.receipts.getAll();
      const map = new Map<string, { revenue: number; collected: number }>();
      invoices.forEach((inv) => {
        const key = inv.date.slice(0, 7);
        const cur = map.get(key) || { revenue: 0, collected: 0 };
        map.set(key, { ...cur, revenue: cur.revenue + inv.total });
      });
      receipts.forEach((r) => {
        const key = r.date.slice(0, 7);
        const cur = map.get(key) || { revenue: 0, collected: 0 };
        map.set(key, { ...cur, collected: cur.collected + r.amount });
      });
      return Array.from(map.entries())
        .sort((a, b) => a[0].localeCompare(b[0]))
        .slice(-6)
        .map(([month, vals]) => ({ month, ...vals }));
    },
    powderUsageByMonth(): { month: string; usage: number }[] {
      const cases = db.cases.getAll();
      const map = new Map<string, number>();
      cases.forEach((c) => {
        const key = c.date.slice(0, 7);
        map.set(key, (map.get(key) || 0) + c.powder_weight);
      });
      return Array.from(map.entries())
        .sort((a, b) => a[0].localeCompare(b[0]))
        .slice(-6)
        .map(([month, usage]) => ({ month, usage }));
    },
  },
};
