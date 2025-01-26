// src/main/filesystem.js
const fs = require('fs')
const path = require('path')
const {app} = require('electron')

const baseDir = path.join(app.getPath('userData'), 'casesData')

function ensureCaseFolders(caseId) {
    // e.g. /.../AppData/Roaming/YourApp/casesData/<caseId>/Documents etc.
    const caseRoot = path.join(baseDir, caseId)
    const docsFolder = path.join(caseRoot, 'Documents')
    const evidenceFolder = path.join(caseRoot, 'Evidence')

    if (!fs.existsSync(caseRoot)) {
        fs.mkdirSync(caseRoot, {recursive: true})
    }
    if (!fs.existsSync(docsFolder)) {
        fs.mkdirSync(docsFolder)
    }
    if (!fs.existsSync(evidenceFolder)) {
        fs.mkdirSync(evidenceFolder)
    }

    return {caseRoot, docsFolder, evidenceFolder}
}

// Copy or move file into the Documents folder
function addDocumentFile(originalPath, caseId, fileName) {
    ensureCaseFolders(caseId)  // just in case
    const dest = path.join(baseDir, caseId, 'Documents', fileName)
    fs.copyFileSync(originalPath, dest) // or fs.renameSync to move instead of copy
    return dest
}

// Similarly for evidence
function addEvidenceFile(originalPath, caseId, fileName) {
    ensureCaseFolders(caseId)
    const dest = path.join(baseDir, caseId, 'Evidence', fileName)
    fs.copyFileSync(originalPath, dest)
    return dest
}

module.exports = {
    ensureCaseFolders,
    addDocumentFile,
    addEvidenceFile
}
