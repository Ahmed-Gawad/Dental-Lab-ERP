import type {
  Customer,
  Case,
  Invoice,
  Receipt,
  InventoryEntry,
  CashboxEntry,
  Expense,
} from "./types";

type TableRecordMap = {
  customers: Customer;
  cases: Case;
  invoices: Invoice;
  receipts: Receipt;
  inventory: InventoryEntry;
  cashbox: CashboxEntry;
  expenses: Expense;
};

type TableApi<T> = {
  getAll: () => Promise<T[]>;
  add: (data: Omit<T, "id" | "created_at"> & Record<string, unknown>) => Promise<T>;
  update: (id: string, data: Partial<T>) => Promise<T>;
  delete: (id: string) => Promise<{ success: boolean }>;
};

export interface ElectronAPI {
  db: { [K in keyof TableRecordMap]: TableApi<TableRecordMap[K]> };
  getDbPath: () => Promise<string>;
  getVersion: () => Promise<string>;
  backupDatabase: () => Promise<{ success: boolean; path?: string; error?: string }>;
  restoreDatabase: () => Promise<{ success: boolean; restart?: boolean; error?: string }>;
  openBackupsFolder: () => Promise<void>;
  checkForUpdates: () => Promise<void>;
  onMenuBackup: (callback: () => void) => void;
  onMenuRestore: (callback: () => void) => void;
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI;
  }
}

export {};
