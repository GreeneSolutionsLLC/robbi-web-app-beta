const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  platform: process.platform,
  versions: process.versions,
  isElectron: true,
  
  onPlaywrightReady: (callback) => ipcRenderer.on('playwright-ready', callback),
  removePlaywrightListener: () => ipcRenderer.removeAllListeners('playwright-ready')
});