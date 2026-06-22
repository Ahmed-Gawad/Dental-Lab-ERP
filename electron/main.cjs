const { app, BrowserWindow, ipcMain, Menu, dialog, shell } = require('electron');
const path = require('path');
const fs = require('fs');

let mainWindow;
let db;

// ─── Auto Updater ─────────────────────────────────────────────────────────────
function setupAutoUpdater() {
  // Only run in packaged (production) app — skip in dev mode
  if (!app.isPackaged) return null;

  let autoUpdater;
  try {
    autoUpdater = require('electron-updater').autoUpdater;
  } catch (e) {
    console.error('[Updater] electron-updater not available:', e.message);
    return null;
  }

  autoUpdater.autoDownload = false;
  autoUpdater.autoInstallOnAppQuit = true;

  autoUpdater.on('checking-for-update', () => {
    console.log('[Updater] Checking for updates...');
  });

  autoUpdater.on('update-available', (info) => {
    dialog.showMessageBox(mainWindow, {
      type: 'info',
      title: 'تحديث متاح',
      message: `تم العثور على إصدار جديد (${info.version})`,
      detail: 'هل ترغب في تحميل التحديث الآن؟ سيعمل البرنامج بشكل طبيعي أثناء التحميل.',
      buttons: ['تحميل التحديث', 'لاحقاً'],
      defaultId: 0,
      cancelId: 1,
      noLink: true,
    }).then(({ response }) => {
      if (response === 0) {
        autoUpdater.downloadUpdate();
        showDownloadingProgress();
      }
    });
  });

  autoUpdater.on('update-not-available', (info) => {
    console.log('[Updater] Already up to date:', info.version);
  });

  autoUpdater.on('update-downloaded', () => {
    dialog.showMessageBox(mainWindow, {
      type: 'info',
      title: 'التحديث جاهز للتثبيت',
      message: 'تم تحميل التحديث بنجاح',
      detail: 'سيتم تثبيت التحديث عند إغلاق البرنامج. أو اضغط "إعادة تشغيل الآن" للتثبيت فوراً.',
      buttons: ['إعادة تشغيل الآن', 'لاحقاً'],
      defaultId: 0,
      cancelId: 1,
      noLink: true,
    }).then(({ response }) => {
      if (response === 0) {
        autoUpdater.quitAndInstall(false, true);
      }
    });
  });

  autoUpdater.on('error', (err) => {
    console.error('[Updater] Error:', err.message);
    // Silently log errors — don't bother the user with network issues
  });

  // Check for updates 5 seconds after the window is ready (non-blocking)
  setTimeout(() => {
    autoUpdater.checkForUpdates().catch((e) => {
      console.error('[Updater] Check failed:', e.message);
    });
  }, 5000);

  return autoUpdater;
}

let _autoUpdater = null;

function showDownloadingProgress() {
  dialog.showMessageBox(mainWindow, {
    type: 'info',
    title: 'جارٍ التحميل',
    message: 'يتم تحميل التحديث في الخلفية...',
    detail: 'ستظهر رسالة عند اكتمال التحميل. يمكنك مواصلة العمل بشكل طبيعي.',
    buttons: ['حسناً'],
  });
}

// ─── Database paths ───────────────────────────────────────────────────────────
function getUserDataPath() {
  return app.getPath('userData');
}

function getDbPath() {
  return path.join(getUserDataPath(), 'dental_erp.db');
}

function getBackupsDir() {
  const dir = path.join(getUserDataPath(), 'backups');
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return dir;
}

// ─── Database schema ──────────────────────────────────────────────────────────
function initDatabase() {
  try {
    const Database = require('better-sqlite3');
    const dbPath = getDbPath();
    db = new Database(dbPath);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');

    db.exec(`
      CREATE TABLE IF NOT EXISTS customers (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        phone TEXT DEFAULT '',
        address TEXT DEFAULT '',
        notes TEXT DEFAULT '',
        created_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS cases (
        id TEXT PRIMARY KEY,
        customer_id TEXT NOT NULL,
        customer_name TEXT NOT NULL,
        date TEXT NOT NULL,
        teeth_count INTEGER NOT NULL DEFAULT 1,
        powder_weight REAL NOT NULL DEFAULT 2.5,
        work_type TEXT NOT NULL,
        shade TEXT DEFAULT 'A2',
        status TEXT DEFAULT 'pending',
        price REAL DEFAULT 0,
        notes TEXT DEFAULT '',
        created_at TEXT NOT NULL,
        FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE RESTRICT
      );

      CREATE TABLE IF NOT EXISTS invoices (
        id TEXT PRIMARY KEY,
        invoice_number TEXT NOT NULL UNIQUE,
        customer_id TEXT NOT NULL,
        customer_name TEXT NOT NULL,
        date TEXT NOT NULL,
        items TEXT NOT NULL DEFAULT '[]',
        subtotal REAL DEFAULT 0,
        discount REAL DEFAULT 0,
        total REAL DEFAULT 0,
        paid_amount REAL NOT NULL DEFAULT 0,
        status TEXT DEFAULT 'unpaid',
        notes TEXT DEFAULT '',
        created_at TEXT NOT NULL,
        FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE RESTRICT
      );

      CREATE TABLE IF NOT EXISTS receipts (
        id TEXT PRIMARY KEY,
        receipt_number TEXT NOT NULL UNIQUE,
        invoice_id TEXT DEFAULT '',
        customer_id TEXT NOT NULL,
        customer_name TEXT NOT NULL,
        date TEXT NOT NULL,
        amount REAL DEFAULT 0,
        payment_method TEXT DEFAULT 'cash',
        notes TEXT DEFAULT '',
        created_at TEXT NOT NULL,
        FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE RESTRICT
      );

      CREATE TABLE IF NOT EXISTS inventory (
        id TEXT PRIMARY KEY,
        date TEXT NOT NULL,
        type TEXT NOT NULL,
        quantity REAL NOT NULL,
        notes TEXT DEFAULT '',
        created_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS cashbox (
        id TEXT PRIMARY KEY,
        date TEXT NOT NULL,
        type TEXT NOT NULL,
        amount REAL NOT NULL,
        description TEXT DEFAULT '',
        reference TEXT DEFAULT '',
        source TEXT DEFAULT 'manual',
        source_id TEXT DEFAULT '',
        created_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS expenses (
        id TEXT PRIMARY KEY,
        date TEXT NOT NULL,
        category TEXT NOT NULL,
        amount REAL NOT NULL,
        description TEXT DEFAULT '',
        notes TEXT DEFAULT '',
        created_at TEXT NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_cases_customer ON cases(customer_id);
      CREATE INDEX IF NOT EXISTS idx_invoices_customer ON invoices(customer_id);
      CREATE INDEX IF NOT EXISTS idx_receipts_customer ON receipts(customer_id);
      CREATE INDEX IF NOT EXISTS idx_receipts_invoice ON receipts(invoice_id);
      CREATE INDEX IF NOT EXISTS idx_cashbox_source ON cashbox(source, source_id);
    `);

    migrateSchema();

    console.log('[DB] Initialized at:', dbPath);
  } catch (err) {
    console.error('[DB] Init failed:', err);
    dialog.showErrorBox(
      'خطأ في قاعدة البيانات',
      'تعذّر فتح أو إنشاء قاعدة البيانات. تأكد من صلاحيات الكتابة على الجهاز.\n\n' + (err && err.message ? err.message : String(err))
    );
  }
}

// Lightweight migration: adds columns that may not exist on DBs created by older versions
function migrateSchema() {
  const ensureColumn = (table, column, ddl) => {
    const cols = db.prepare(`PRAGMA table_info(${table})`).all().map((c) => c.name);
    if (!cols.includes(column)) {
      db.exec(`ALTER TABLE ${table} ADD COLUMN ${ddl}`);
      console.log(`[DB] Migrated: added ${table}.${column}`);
    }
  };
  ensureColumn('invoices', 'paid_amount', "paid_amount REAL NOT NULL DEFAULT 0");
  ensureColumn('cashbox', 'source', "source TEXT DEFAULT 'manual'");
  ensureColumn('cashbox', 'source_id', "source_id TEXT DEFAULT ''");
}

// ─── Column whitelists (prevents building SQL from arbitrary keys) ────────────
const TABLE_COLUMNS = {
  customers: ['id', 'name', 'phone', 'address', 'notes', 'created_at'],
  cases: ['id', 'customer_id', 'customer_name', 'date', 'teeth_count', 'powder_weight', 'work_type', 'shade', 'status', 'price', 'notes', 'created_at'],
  invoices: ['id', 'invoice_number', 'customer_id', 'customer_name', 'date', 'items', 'subtotal', 'discount', 'total', 'paid_amount', 'status', 'notes', 'created_at'],
  receipts: ['id', 'receipt_number', 'invoice_id', 'customer_id', 'customer_name', 'date', 'amount', 'payment_method', 'notes', 'created_at'],
  inventory: ['id', 'date', 'type', 'quantity', 'notes', 'created_at'],
  cashbox: ['id', 'date', 'type', 'amount', 'description', 'reference', 'source', 'source_id', 'created_at'],
  expenses: ['id', 'date', 'category', 'amount', 'description', 'notes', 'created_at'],
};

function sanitizeInsert(table, data) {
  const allowed = TABLE_COLUMNS[table];
  const out = {};
  for (const key of Object.keys(data || {})) {
    if (allowed.includes(key)) out[key] = data[key];
  }
  return out;
}

// ─── Accounting helpers (run inside transactions) ──────────────────────────────

// Recompute an invoice's paid_amount/status from the sum of its non-deleted receipts.
function recalcInvoiceStatus(invoiceId) {
  if (!invoiceId) return;
  const invoice = db.prepare('SELECT id, total FROM invoices WHERE id = ?').get(invoiceId);
  if (!invoice) return;
  const row = db.prepare('SELECT COALESCE(SUM(amount), 0) AS paid FROM receipts WHERE invoice_id = ?').get(invoiceId);
  const paid = row.paid || 0;
  let status = 'unpaid';
  if (paid >= invoice.total && invoice.total > 0) status = 'paid';
  else if (paid > 0) status = 'partial';
  db.prepare('UPDATE invoices SET paid_amount = ?, status = ? WHERE id = ?').run(paid, status, invoiceId);
}

// Insert/update the cashbox entry that mirrors a receipt (source='receipt').
function syncCashboxForReceipt(receipt) {
  const existing = db.prepare("SELECT id FROM cashbox WHERE source = 'receipt' AND source_id = ?").get(receipt.id);
  const description = `تحصيل من ${receipt.customer_name}${receipt.receipt_number ? ' - ' + receipt.receipt_number : ''}`;
  if (existing) {
    db.prepare(`UPDATE cashbox SET date = ?, amount = ?, description = ?, reference = ? WHERE id = ?`)
      .run(receipt.date, receipt.amount, description, receipt.receipt_number || '', existing.id);
  } else {
    db.prepare(`INSERT INTO cashbox (id, date, type, amount, description, reference, source, source_id, created_at)
                VALUES (@id, @date, 'income', @amount, @description, @reference, 'receipt', @source_id, @created_at)`)
      .run({
        id: 'cb_' + receipt.id,
        date: receipt.date,
        amount: receipt.amount,
        description,
        reference: receipt.receipt_number || '',
        source_id: receipt.id,
        created_at: new Date().toISOString(),
      });
  }
}

function removeCashboxForSource(source, sourceId) {
  db.prepare('DELETE FROM cashbox WHERE source = ? AND source_id = ?').run(source, sourceId);
}

// Insert/update the cashbox entry that mirrors an expense (source='expense').
function syncCashboxForExpense(expense) {
  const existing = db.prepare("SELECT id FROM cashbox WHERE source = 'expense' AND source_id = ?").get(expense.id);
  const description = `مصروف: ${expense.category}${expense.description ? ' - ' + expense.description : ''}`;
  if (existing) {
    db.prepare(`UPDATE cashbox SET date = ?, amount = ?, description = ? WHERE id = ?`)
      .run(expense.date, expense.amount, description, existing.id);
  } else {
    db.prepare(`INSERT INTO cashbox (id, date, type, amount, description, reference, source, source_id, created_at)
                VALUES (@id, @date, 'expense', @amount, @description, '', 'expense', @source_id, @created_at)`)
      .run({
        id: 'cb_' + expense.id,
        date: expense.date,
        amount: expense.amount,
        description,
        source_id: expense.id,
        created_at: new Date().toISOString(),
      });
  }
}

// ─── IPC Handlers ─────────────────────────────────────────────────────────────
function setupIpcHandlers() {
  const tables = ['customers', 'cases', 'invoices', 'receipts', 'inventory', 'cashbox', 'expenses'];

  if (!db) {
    // Database failed to open — register handlers that reject immediately with
    // a clear error instead of leaving the renderer's IPC calls hanging forever.
    tables.forEach((table) => {
      ipcMain.handle(`db:${table}:getAll`, () => { throw new Error('قاعدة البيانات غير متاحة'); });
      ipcMain.handle(`db:${table}:add`, () => { throw new Error('قاعدة البيانات غير متاحة'); });
      ipcMain.handle(`db:${table}:update`, () => { throw new Error('قاعدة البيانات غير متاحة'); });
      ipcMain.handle(`db:${table}:delete`, () => { throw new Error('قاعدة البيانات غير متاحة'); });
    });
    ipcMain.handle('app:getDbPath', () => getDbPath());
    ipcMain.handle('app:getVersion', () => app.getVersion());
    return;
  }

  tables.forEach((table) => {
    ipcMain.handle(`db:${table}:getAll`, () => {
      const rows = db.prepare(`SELECT * FROM ${table} ORDER BY created_at DESC`).all();
      if (table === 'invoices') {
        return rows.map((r) => ({ ...r, items: JSON.parse(r.items || '[]') }));
      }
      return rows;
    });

    ipcMain.handle(`db:${table}:add`, (_, data) => {
      const insertData = sanitizeInsert(table, data);
      if (table === 'invoices' && Array.isArray(data.items)) {
        insertData.items = JSON.stringify(data.items);
      }
      const columns = Object.keys(insertData);
      const placeholders = columns.map((c) => `@${c}`).join(', ');

      const runInsert = db.transaction(() => {
        db.prepare(`INSERT INTO ${table} (${columns.join(', ')}) VALUES (${placeholders})`).run(insertData);

        if (table === 'receipts') {
          syncCashboxForReceipt(data);
          if (data.invoice_id) recalcInvoiceStatus(data.invoice_id);
        }
        if (table === 'expenses') {
          syncCashboxForExpense(data);
        }
      });
      runInsert();

      return data;
    });

    ipcMain.handle(`db:${table}:update`, (_, { id, data }) => {
      const updateData = sanitizeInsert(table, data);
      if (table === 'invoices' && Array.isArray(data.items)) {
        updateData.items = JSON.stringify(data.items);
      }
      delete updateData.id;
      const sets = Object.keys(updateData).map((k) => `${k} = @${k}`).join(', ');

      const runUpdate = db.transaction(() => {
        if (sets) {
          db.prepare(`UPDATE ${table} SET ${sets} WHERE id = @id`).run({ ...updateData, id });
        }

        if (table === 'receipts') {
          // Need full row (in case invoice_id/amount changed) to resync cashbox + invoice status
          const fullRow = db.prepare('SELECT * FROM receipts WHERE id = ?').get(id);
          if (fullRow) {
            syncCashboxForReceipt(fullRow);
            if (fullRow.invoice_id) recalcInvoiceStatus(fullRow.invoice_id);
          }
        }
        if (table === 'expenses') {
          const fullRow = db.prepare('SELECT * FROM expenses WHERE id = ?').get(id);
          if (fullRow) syncCashboxForExpense(fullRow);
        }
        if (table === 'invoices') {
          recalcInvoiceStatus(id);
        }
      });
      runUpdate();

      return { id, ...data };
    });

    ipcMain.handle(`db:${table}:delete`, (_, id) => {
      const runDelete = db.transaction(() => {
        let linkedInvoiceId = null;
        if (table === 'receipts') {
          const row = db.prepare('SELECT invoice_id FROM receipts WHERE id = ?').get(id);
          linkedInvoiceId = row ? row.invoice_id : null;
        }

        db.prepare(`DELETE FROM ${table} WHERE id = ?`).run(id);

        if (table === 'receipts') {
          removeCashboxForSource('receipt', id);
          if (linkedInvoiceId) recalcInvoiceStatus(linkedInvoiceId);
        }
        if (table === 'expenses') {
          removeCashboxForSource('expense', id);
        }
      });
      runDelete();

      return { success: true };
    });
  });

  ipcMain.handle('app:getDbPath', () => getDbPath());
  ipcMain.handle('app:getVersion', () => app.getVersion());

  // ── Backup / Restore ──────────────────────────────────────────────────────
  ipcMain.handle('app:backupDatabase', async () => {
    const defaultName = `dental_erp_backup_${new Date().toISOString().slice(0, 10)}.db`;
    const { canceled, filePath } = await dialog.showSaveDialog(mainWindow, {
      title: 'حفظ نسخة احتياطية',
      defaultPath: path.join(app.getPath('documents'), defaultName),
      filters: [{ name: 'ملف قاعدة بيانات', extensions: ['db'] }],
    });
    if (canceled || !filePath) return { success: false };
    try {
      db.pragma('wal_checkpoint(FULL)');
      fs.copyFileSync(getDbPath(), filePath);
      return { success: true, path: filePath };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('app:restoreDatabase', async () => {
    const { canceled, filePaths } = await dialog.showOpenDialog(mainWindow, {
      title: 'استعادة نسخة احتياطية',
      filters: [{ name: 'ملف قاعدة بيانات', extensions: ['db'] }],
      properties: ['openFile'],
    });
    if (canceled || !filePaths[0]) return { success: false };

    const confirm = await dialog.showMessageBox(mainWindow, {
      type: 'warning',
      title: 'تأكيد الاستعادة',
      message: 'سيتم استبدال جميع البيانات الحالية بالنسخة الاحتياطية المختارة.',
      detail: 'هذا الإجراء لا يمكن التراجع عنه. هل تريد المتابعة؟',
      buttons: ['استعادة', 'إلغاء'],
      defaultId: 1,
      cancelId: 1,
    });
    if (confirm.response !== 0) return { success: false };

    try {
      db.close();
      fs.copyFileSync(filePaths[0], getDbPath());
      initDatabase();
      return { success: true, restart: true };
    } catch (err) {
      initDatabase();
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('app:openBackupsFolder', () => {
    shell.openPath(getBackupsDir());
  });

  // Manual update check trigger from renderer
  ipcMain.handle('app:checkForUpdates', () => {
    if (_autoUpdater && app.isPackaged) {
      _autoUpdater.checkForUpdates().catch(() => {});
    }
  });
}

// ─── Auto backup on startup (keeps last 10 daily snapshots) ───────────────────
function autoBackup() {
  try {
    const dbPath = getDbPath();
    if (!fs.existsSync(dbPath)) return;
    const backupsDir = getBackupsDir();
    const today = new Date().toISOString().slice(0, 10);
    const target = path.join(backupsDir, `auto_${today}.db`);
    if (!fs.existsSync(target)) {
      fs.copyFileSync(dbPath, target);
    }
    // Prune old backups, keep newest 10
    const files = fs.readdirSync(backupsDir)
      .filter((f) => f.startsWith('auto_') && f.endsWith('.db'))
      .map((f) => ({ f, t: fs.statSync(path.join(backupsDir, f)).mtimeMs }))
      .sort((a, b) => b.t - a.t);
    files.slice(10).forEach(({ f }) => {
      try { fs.unlinkSync(path.join(backupsDir, f)); } catch {}
    });
  } catch (err) {
    console.error('[Backup] Auto backup failed:', err.message);
  }
}

// ─── Menu ─────────────────────────────────────────────────────────────────────
function buildMenu() {
  const template = [
    {
      label: 'الملف',
      submenu: [
        {
          label: 'نسخة احتياطية الآن...',
          click: () => mainWindow.webContents.send('menu:backup'),
        },
        {
          label: 'استعادة نسخة احتياطية...',
          click: () => mainWindow.webContents.send('menu:restore'),
        },
        {
          label: 'فتح مجلد النسخ التلقائية',
          click: () => shell.openPath(getBackupsDir()),
        },
        { type: 'separator' },
        {
          label: 'موقع قاعدة البيانات',
          click: () => dialog.showMessageBox(mainWindow, {
            title: 'موقع ملف قاعدة البيانات',
            message: getDbPath(),
            detail: 'يمكنك نسخ هذا المسار للوصول إلى ملف البيانات أو عمل نسخة احتياطية منه.',
            buttons: ['حسناً']
          })
        },
        { type: 'separator' },
        { label: 'خروج', role: 'quit', accelerator: 'Alt+F4' },
      ],
    },
    {
      label: 'عرض',
      submenu: [
        { role: 'reload', label: 'تحديث الصفحة', accelerator: 'F5' },
        { type: 'separator' },
        { role: 'zoomIn', label: 'تكبير', accelerator: 'CmdOrCtrl+=' },
        { role: 'zoomOut', label: 'تصغير', accelerator: 'CmdOrCtrl+-' },
        { role: 'resetZoom', label: 'الحجم الافتراضي', accelerator: 'CmdOrCtrl+0' },
        { type: 'separator' },
        { role: 'togglefullscreen', label: 'ملء الشاشة', accelerator: 'F11' },
      ],
    },
    {
      label: 'مساعدة',
      submenu: [
        {
          label: 'التحقق من التحديثات',
          click: () => {
            if (!app.isPackaged) {
              dialog.showMessageBox(mainWindow, {
                title: 'وضع التطوير',
                message: 'التحديثات التلقائية تعمل فقط في النسخة المثبّتة (exe).',
                buttons: ['حسناً']
              });
              return;
            }
            if (_autoUpdater) {
              _autoUpdater.checkForUpdates().then((result) => {
                if (!result || !result.updateInfo) {
                  dialog.showMessageBox(mainWindow, {
                    title: 'لا توجد تحديثات',
                    message: 'البرنامج محدّث بالكامل.',
                    detail: `الإصدار الحالي: ${app.getVersion()}`,
                    buttons: ['حسناً'],
                    type: 'info',
                  });
                }
              }).catch(() => {
                dialog.showMessageBox(mainWindow, {
                  title: 'تعذّر التحقق',
                  message: 'تعذّر الاتصال بخادم التحديثات.',
                  detail: 'تأكد من اتصالك بالإنترنت وحاول مرة أخرى.',
                  buttons: ['حسناً'],
                  type: 'warning',
                });
              });
            }
          }
        },
        { type: 'separator' },
        {
          label: 'عن البرنامج',
          click: () => dialog.showMessageBox(mainWindow, {
            title: 'عن البرنامج',
            message: 'A to Z Digital Service\nنظام إدارة مختبر الأسنان',
            detail: `الإصدار ${app.getVersion()}\nجميع الحقوق محفوظة © 2025`,
            buttons: ['حسناً']
          })
        }
      ]
    }
  ];

  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

// ─── Window ───────────────────────────────────────────────────────────────────
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    title: 'A to Z Digital Service — نظام إدارة مختبر الأسنان',
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
    backgroundColor: '#f0f7ff',
    show: false,
    center: true,
  });

  if (process.env.ELECTRON_DEV === 'true') {
    mainWindow.loadURL('http://localhost:3030');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../www/index.html'));
  }

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    mainWindow.focus();
  });

  mainWindow.on('closed', () => { mainWindow = null; });

  buildMenu();
}

// ─── App lifecycle ────────────────────────────────────────────────────────────
app.whenReady().then(() => {
  initDatabase();
  if (db) autoBackup();
  setupIpcHandlers();
  createWindow();
  _autoUpdater = setupAutoUpdater();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (db) {
    try { db.close(); } catch {}
  }
  if (process.platform !== 'darwin') app.quit();
});

app.on('before-quit', () => {
  if (db) {
    try { db.close(); } catch {}
  }
});
