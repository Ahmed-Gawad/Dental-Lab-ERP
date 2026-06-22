/**
 * In-memory store synced with the on-disk SQLite database (via Electron IPC).
 *
 * Why: the UI (db.ts) needs synchronous reads (getAll() returning an array
 * immediately) so existing pages don't need to become async. SQLite access
 * through IPC is inherently asynchronous, so we load everything into memory
 * once at startup, then keep the in-memory copy and the on-disk database in
 * sync on every write.
 *
 * Falls back to localStorage automatically when window.electronAPI isn't
 * available (e.g. running `npm run dev` in a plain browser without Electron),
 * so the app keeps working during web-only development/preview.
 */
import type {
  Customer,
  Case,
  Invoice,
  Receipt,
  InventoryEntry,
  CashboxEntry,
  Expense,
} from "./types";

export type TableName =
  | "customers"
  | "cases"
  | "invoices"
  | "receipts"
  | "inventory"
  | "cashbox"
  | "expenses";

interface TableRecordMap {
  customers: Customer;
  cases: Case;
  invoices: Invoice;
  receipts: Receipt;
  inventory: InventoryEntry;
  cashbox: CashboxEntry;
  expenses: Expense;
}

const TABLES: TableName[] = [
  "customers",
  "cases",
  "invoices",
  "receipts",
  "inventory",
  "cashbox",
  "expenses",
];

const LS_KEYS: Record<TableName, string> = {
  customers: "dental_customers",
  cases: "dental_cases",
  invoices: "dental_invoices",
  receipts: "dental_receipts",
  inventory: "dental_inventory",
  cashbox: "dental_cashbox",
  expenses: "dental_expenses",
};

function isElectron(): boolean {
  return typeof window !== "undefined" && !!window.electronAPI;
}

// ─── localStorage fallback helpers (used only outside Electron) ───────────────
function lsGetAll<T>(table: TableName): T[] {
  try {
    const raw = localStorage.getItem(LS_KEYS[table]);
    return raw ? (JSON.parse(raw) as T[]) : [];
  } catch {
    return [];
  }
}

function lsSaveAll<T>(table: TableName, data: T[]): void {
  localStorage.setItem(LS_KEYS[table], JSON.stringify(data));
}

// ─── In-memory cache ────────────────────────────────────────────────────────
type Store = { [K in TableName]: TableRecordMap[K][] };

const cache: Store = {
  customers: [],
  cases: [],
  invoices: [],
  receipts: [],
  inventory: [],
  cashbox: [],
  expenses: [],
};

let readyResolve: () => void;
export const ready: Promise<void> = new Promise((resolve) => {
  readyResolve = resolve;
});
let isReady = false;

const listeners = new Set<() => void>();
/** Subscribe to "data changed" notifications (used to trigger React re-renders). */
export function subscribe(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}
function notify() {
  listeners.forEach((fn) => fn());
}

function uuid(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  // Fallback UUID v4-ish generator for older environments
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/** Loads all tables into memory. Call once at app startup before rendering. */
export async function initStore(): Promise<void> {
  if (isReady) return;

  if (isElectron()) {
    const api = window.electronAPI!;
    const results = await Promise.all(TABLES.map((t) => api.db[t].getAll()));
    TABLES.forEach((t, i) => {
      // electronAPI is typed generically per-table; cast is safe since the
      // index `t` and `results[i]` come from the same TABLES array.
      (cache[t] as unknown[]) = results[i] as unknown[];
    });
  } else {
    TABLES.forEach((t) => {
      (cache[t] as unknown[]) = lsGetAll(t);
    });
  }

  isReady = true;
  readyResolve();
}

function sortByCreatedDesc<T extends { created_at: string }>(rows: T[]): T[] {
  return [...rows].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
}

// ─── Generic CRUD against the in-memory cache + background persistence ────────
export function getAllSync<K extends TableName>(table: K): TableRecordMap[K][] {
  return sortByCreatedDesc(cache[table] as { created_at: string }[]) as TableRecordMap[K][];
}

function persistAdd(table: TableName, record: Record<string, unknown>) {
  if (isElectron()) {
    window.electronAPI!.db[table].add(record as never).catch((err) => {
      console.error(`[store] Failed to persist ${table}.add`, err);
    });
  } else {
    lsSaveAll(table, cache[table] as unknown[]);
  }
}

function persistUpdate(table: TableName, id: string, record: Record<string, unknown>) {
  if (isElectron()) {
    window.electronAPI!.db[table].update(id, record as never).catch((err) => {
      console.error(`[store] Failed to persist ${table}.update`, err);
    });
  } else {
    lsSaveAll(table, cache[table] as unknown[]);
  }
}

function persistDelete(table: TableName, id: string) {
  if (isElectron()) {
    window.electronAPI!.db[table].delete(id).catch((err) => {
      console.error(`[store] Failed to persist ${table}.delete`, err);
    });
  } else {
    lsSaveAll(table, cache[table] as unknown[]);
  }
}

export function addSync<K extends TableName>(
  table: K,
  data: Omit<TableRecordMap[K], "id" | "created_at">
): TableRecordMap[K] {
  const record = {
    id: uuid(),
    ...data,
    created_at: new Date().toISOString(),
  } as TableRecordMap[K];
  (cache[table] as TableRecordMap[K][]).push(record);
  persistAdd(table, record as unknown as Record<string, unknown>);
  notify();
  return record;
}

export function updateSync<K extends TableName>(
  table: K,
  id: string,
  data: Partial<TableRecordMap[K]>
): TableRecordMap[K] | undefined {
  const rows = cache[table] as TableRecordMap[K][];
  const idx = rows.findIndex((r) => (r as { id: string }).id === id);
  if (idx === -1) return undefined;
  const updated = { ...rows[idx], ...data };
  rows[idx] = updated;
  persistUpdate(table, id, data as unknown as Record<string, unknown>);
  notify();
  return updated;
}

export function deleteSync(table: TableName, id: string): void {
  const rows = cache[table] as { id: string }[];
  const idx = rows.findIndex((r) => r.id === id);
  if (idx !== -1) rows.splice(idx, 1);
  persistDelete(table, id);
  notify();
}

/** Direct mutable access to a table's in-memory rows (used by accounting helpers in db.ts that need to update related tables, e.g. recalculating invoice status after a receipt changes). Callers must call persistUpdate-equivalent themselves. */
export function getMutableRows<K extends TableName>(table: K): TableRecordMap[K][] {
  return cache[table] as TableRecordMap[K][];
}

export function persistTableUpdate(table: TableName, id: string, record: Record<string, unknown>) {
  persistUpdate(table, id, record);
}

export { isElectron };
