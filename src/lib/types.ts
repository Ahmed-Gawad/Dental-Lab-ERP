export interface Customer {
  id: string;
  name: string;
  phone: string;
  address: string;
  notes: string;
  created_at: string;
}

export interface Case {
  id: string;
  customer_id: string;
  customer_name: string;
  date: string;
  teeth_count: number;
  powder_weight: number;
  work_type: string;
  shade: string;
  status: "pending" | "in_progress" | "completed" | "delivered";
  price: number;
  notes: string;
  created_at: string;
}

export interface InvoiceItem {
  case_id: string;
  description: string;
  quantity: number;
  unit_price: number;
  total: number;
}

export interface Invoice {
  id: string;
  invoice_number: string;
  customer_id: string;
  customer_name: string;
  date: string;
  items: InvoiceItem[];
  subtotal: number;
  discount: number;
  total: number;
  /** Sum of all receipts linked to this invoice. Maintained automatically — do not set manually. */
  paid_amount: number;
  status: "unpaid" | "partial" | "paid";
  notes: string;
  created_at: string;
}

export interface Receipt {
  id: string;
  receipt_number: string;
  invoice_id: string;
  customer_id: string;
  customer_name: string;
  date: string;
  amount: number;
  payment_method: "cash" | "transfer" | "check";
  notes: string;
  created_at: string;
}

export interface InventoryEntry {
  id: string;
  date: string;
  type: "in" | "out";
  quantity: number;
  notes: string;
  created_at: string;
}

export interface CashboxEntry {
  id: string;
  date: string;
  type: "income" | "expense";
  amount: number;
  description: string;
  reference: string;
  /** 'manual' for entries the user typed directly, or 'receipt' / 'expense' for auto-generated entries. */
  source: "manual" | "receipt" | "expense";
  /** id of the receipt/expense that generated this entry, when source !== 'manual'. */
  source_id: string;
  created_at: string;
}

export interface Expense {
  id: string;
  date: string;
  category: string;
  amount: number;
  description: string;
  notes: string;
  created_at: string;
}
