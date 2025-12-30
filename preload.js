// preload.js
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  isElectron: true,

  // Clipboard işlemlerini Main process'e devrediyoruz (IPC)
  clipboard: {
    writeText: (text) => ipcRenderer.invoke('clipboard:write', String(text)),
    readText: () => ipcRenderer.invoke('clipboard:read')
  },

  permissions: {
    getAll: () => ipcRenderer.invoke('permissions.getAll'),
    set: (key, value) => ipcRenderer.invoke('permissions.set', { key, value })
  },
  
  askMicrophoneNow: () => ipcRenderer.invoke('permissions.set', { key: 'microphone_prompt_requested', value: Date.now() })
});