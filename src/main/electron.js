// src/main/electron.js
const {app, BrowserWindow, Menu, ipcMain, dialog} = require('electron')
const path = require('path')
const {protocol} = require('electron');
const fs = require('fs');


const remoteMain = require('@electron/remote/main');
remoteMain.initialize();

// IMPORT the functions
const {
    getAllClients,
    getClientById,
    addClient,
    updateClient,
    getAllCases,
    addCase,
    updateCase,
    getCaseById,
    getCasesByClient,
    addDocument,
    getDocumentsByCase,
    addEvidence,
    getEvidenceByCase,
} = require('./db') // <= ensure the path is correct

const {ensureCaseFolders, addDocumentFile, addEvidenceFile} = require('./filesystem')

let mainWindow

function createWindow() {

    mainWindow = new BrowserWindow({
        width: 1200,
        height: 800,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            enableRemoteModule: false,
            webSecurity: false,
            // allowFileAccessFromFileUrls: true,
            preload: path.join(__dirname, 'preload.js') // important for IPC bridging
        }
    })

    remoteMain.enable(mainWindow.webContents)

    if (process.env.NODE_ENV === 'development') {
        mainWindow.loadURL('http://localhost:3000')
    } else {
        mainWindow.loadFile(path.join(__dirname, '../../dist/renderer/index.html'))
    }

    // Create menu after mainWindow is created
    const isMac = process.platform === 'darwin'

    const template = [
        // App menu (macOS only)
        ...(isMac ? [{
            label: app.name,
            submenu: [
                {role: 'about'},
                {type: 'separator'},
                {role: 'services'},
                {type: 'separator'},
                {role: 'hide'},
                {role: 'hideothers'},
                {role: 'unhide'},
                {type: 'separator'},
                {role: 'quit'}
            ]
        }] : []),

        // File menu
        {
            label: 'File',
            submenu: [
                isMac ? {role: 'close'} : {role: 'quit'}
            ]
        },

        // Edit menu
        {
            label: 'Edit',
            submenu: [
                {role: 'undo'},
                {role: 'redo'},
                {type: 'separator'},
                {role: 'cut'},
                {role: 'copy'},
                {role: 'paste'},
                // etc.
            ]
        },

        // View menu (including your Toggle Dark Mode)
        {
            label: 'View',
            submenu: [
                {role: 'reload'},
                {role: 'forceReload'},
                {role: 'toggleDevTools'},
                {type: 'separator'},
                {
                    label: 'Toggle Dark Mode',
                    accelerator: 'CmdOrCtrl+D',
                    click: () => {
                        console.log('[MAIN] Toggle Dark Mode menu clicked') // <-- Add this log
                        mainWindow.webContents.send('toggle-dark-mode')
                    }
                }
            ]
        },

        // Window menu
        {
            label: 'Window',
            submenu: [
                {role: 'minimize'},
                {role: 'zoom'},
                ...(isMac
                    ? [{type: 'separator'}, {role: 'front'}, {type: 'separator'}, {role: 'window'}]
                    : [{role: 'close'}])
            ]
        },

        // Help menu
        {
            role: 'help',
            submenu: [
                {
                    label: 'Learn More',
                    click: async () => {
                        // open some URL
                    }
                }
            ]
        }
    ]

    const menu = Menu.buildFromTemplate(template)
    Menu.setApplicationMenu(menu)

}


app.whenReady().then(() => {

    // Remove the Autofill object from all webContents
    // app.on('web-contents-created', (event, webContents) => {
    //     webContents.on('did-finish-load', () => {
    //         webContents.executeJavaScript(`
    //             delete window.Autofill;
    //         `);
    //     });
    // });

    try {
        // Register the protocol
        protocol.handle('safe-file', async (request) => {
            console.log(`Received URL: ${request.url}`);
            const url = request.url.replace('safe-file:///', ''); // Remove protocol prefix
            const filePath = path.normalize(decodeURIComponent(url));
            console.log(`Resolved file path: ${filePath}`);

            try {
                const extension = path.extname(filePath).toLowerCase();
                const mimeTypes = {
                    '.jpg': 'image/jpeg',
                    '.jpeg': 'image/jpeg',
                    '.png': 'image/png',
                    '.gif': 'image/gif',
                    '.bmp': 'image/bmp',
                    '.webp': 'image/webp',
                    '.mp4': 'video/mp4',
                    '.mp3': 'audio/mpeg',
                    '.wav': 'audio/wav',
                };

                const mimeType = mimeTypes[extension] || 'application/octet-stream';

                // Read the file and create a response
                const data = await fs.promises.readFile(filePath);
                console.log(`Returning file with MIME type: ${mimeType}`);
                return new Response(data, {headers: {'Content-Type': mimeType}});
            } catch (error) {
                console.error(`Failed to read file: ${filePath}`, error);
                return new Response(null, {status: 404});
            }
        });
    } catch (error) {
        console.error('Failed to register protocol:', error);
    }


    // IPC for File Dialog
    ipcMain.handle('dialog:showOpenDialog', async (event, options) => {
        const result = await dialog.showOpenDialog(options)
        return result // Returns the dialog result to the renderer process
    })

    // === IPC Handlers for clients ===
    ipcMain.handle('clients:getAll', () => {
        // return the array of clients
        return getAllClients()
    })

    ipcMain.handle('clients:getOne', (event, clientId) => {
        return getClientById(clientId)
    })

    ipcMain.handle('clients:add', (event, clientData) => {
        addClient(clientData)
        return 'OK'
    })

    ipcMain.handle('clients:update', (event, clientData) => {
        updateClient(clientData)
        return 'OK'
    })

    // ---- IPC for Cases ----
    ipcMain.handle('cases:add', (event, caseData) => {
        // Insert into DB
        addCase(caseData)

        // Create folder structure
        ensureCaseFolders(caseData.id)

        return 'OK'
    })
    ipcMain.handle('cases:getByClient', (event, clientId) => {
        return getCasesByClient(clientId)
    })

    ipcMain.handle('cases:getOne', (event, caseId) => {
        return getCaseById(caseId)
    })

    ipcMain.handle('cases:getAll', () => {
        // return the array of clients
        return getAllCases()
    })

    ipcMain.handle('cases:update', async (event, {caseId, updatedData}) => {
        try {
            const result = await updateCase(caseId, updatedData);
            return result;
        } catch (error) {
            console.error('Error updating case:', error);
            throw error;
        }
    });

    // ---- IPC for Documents ----
    ipcMain.handle('documents:add', (event, docData) => {
        // docData might include { id, caseId, type, originalPath, fileName, dateAdded }
        // 1) copy file into /Documents folder
        const destination = addDocumentFile(docData.originalPath, docData.caseId, docData.fileName)

        // 2) insert DB record
        addDocument({
            id: docData.id,
            caseId: docData.caseId,
            type: docData.type,
            filePath: destination,
            dateAdded: docData.dateAdded
        })

        return 'OK'
    })
    ipcMain.handle('documents:getByCase', (event, caseId) => {
        return getDocumentsByCase(caseId)
    })

    // ---- IPC for Evidence ----
    ipcMain.handle('evidence:add', (event, eviData) => {
        // eviData might include { id, caseId, type, originalPath, fileName, dateAdded }
        // copy file
        const destination = addEvidenceFile(eviData.originalPath, eviData.caseId, eviData.fileName)

        // insert DB
        addEvidence({
            id: eviData.id,
            caseId: eviData.caseId,
            type: eviData.type,
            filePath: destination,
            dateAdded: eviData.dateAdded
        })

        return 'OK'
    })
    ipcMain.handle('evidence:getByCase', (event, caseId) => {
        return getEvidenceByCase(caseId)
    })

    createWindow()

})

