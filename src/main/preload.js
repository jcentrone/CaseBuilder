// src/main/preload.js
const {contextBridge, ipcRenderer, shell} = require('electron')
// const path = require('path');
// console.log('Path module loaded:', path);

contextBridge.exposeInMainWorld('electronAPI', {
    // existing dark mode event
    onToggleDarkMode: (callback) => {
        // console.log('[PRELOAD] Registering toggle-dark-mode handler')
        ipcRenderer.on('toggle-dark-mode', callback)
    },

    ipcRenderer: {
        send: (channel, data) => ipcRenderer.send(channel, data),
        on: (channel, callback) =>
            ipcRenderer.on(channel, (_, data) => callback(data)),
        removeAllListeners: (channel) => ipcRenderer.removeAllListeners(channel)
    },

    // clients
    clients: {
        getAll: async () => ipcRenderer.invoke('clients:getAll'),
        add: async (clientData) => ipcRenderer.invoke('clients:add', clientData),
        update: async (clientData) => ipcRenderer.invoke('clients:update', clientData),
        getOne: (clientId) => ipcRenderer.invoke('clients:getOne', clientId),
    },
    // cases
    cases: {
        add: (caseData) => ipcRenderer.invoke('cases:add', caseData),
        getByClient: (clientId) => ipcRenderer.invoke('cases:getByClient', clientId),
        getAll: () => ipcRenderer.invoke('cases:getAll'),
        getOne: (caseId) => ipcRenderer.invoke('cases:getOne', caseId),
        update: (caseId, updatedData) => ipcRenderer.invoke('cases:update', {caseId, updatedData}),

    },
    // dialog
    dialog: {
        showOpenDialog: (options) => ipcRenderer.invoke('dialog:showOpenDialog', options)
    },
    // path
    path: {
        basename: (filePath) => filePath.split(/[/\\]/).pop(), // Mimics path.basename
    },
    // documents
    documents: {
        add: (docData) => ipcRenderer.invoke('documents:add', docData),
        getByCase: (caseId) => ipcRenderer.invoke('documents:getByCase', caseId)
    },
    // evidence
    evidence: {
        add: (eviData) => ipcRenderer.invoke('evidence:add', eviData),
        getByCase: (caseId) => ipcRenderer.invoke('evidence:getByCase', caseId)
    },
    // powerpoint
    pptxConvertToPdf: (pptxPath) => ipcRenderer.invoke('pptx:convertToPdf', pptxPath),
    // shell
    shell: {
        openPath: async (filePath) => {
            return await shell.openPath(filePath);
        },
    },

})
