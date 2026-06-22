const { contextBridge, ipcRenderer } = require('electron');

const tables = ['customers', 'cases', 'invoices', 'receipts', 'inventory', 'cashbox', 'expenses'];

const dbApi = {};
tables.forEach((table) => {
  dbApi[table] = {
    getAll:  ()         => ipcRenderer.invoke(`db:${table}:getAll`),
    add:     (data)     => ipcRenderer.invoke(`db:${table}:add`, data),
    update:  (id, data) => ipcRenderer.invoke(`db:${table}:update`, { id, data }),
    delete:  (id)       => ipcRenderer.invoke(`db:${table}:delete`, id),
  };
});

contextBridge.exposeInMainWorld('electronAPI', {
  db: dbApi,
  getDbPath: () => ipcRenderer.invoke('app:getDbPath'),
  getVersion: () => ipcRenderer.invoke('app:getVersion'),
  backupDatabase: () => ipcRenderer.invoke('app:backupDatabase'),
  restoreDatabase: () => ipcRenderer.invoke('app:restoreDatabase'),
  openBackupsFolder: () => ipcRenderer.invoke('app:openBackupsFolder'),
  checkForUpdates: () => ipcRenderer.invoke('app:checkForUpdates'),
  onMenuBackup: (callback) => ipcRenderer.on('menu:backup', callback),
  onMenuRestore: (callback) => ipcRenderer.on('menu:restore', callback),
});
