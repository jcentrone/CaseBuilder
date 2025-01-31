// src/main/db.js
const Database = require('better-sqlite3')
const {app} = require('electron')
const path = require('path')

const userDataPath = app.getPath('userData')
const dbPath = path.join(userDataPath, 'clients.db')

const db = new Database(dbPath)

// Create table if not exist
db.exec(`
      CREATE TABLE IF NOT EXISTS clients (
      id TEXT PRIMARY KEY,
      firstName TEXT,
      lastName TEXT,
      phone TEXT,
      email TEXT,
      address1 TEXT,
      address2 TEXT,
      city TEXT,
      state TEXT,
      zip TEXT,
      notes TEXT
    );
`)
db.exec(`
    CREATE TABLE IF NOT EXISTS cases (
        id TEXT PRIMARY KEY,
        clientId TEXT,
        caseName TEXT,
        dateOpened TEXT,
        description TEXT,
        caseType TEXT,
        courtName TEXT,
        caseNumber TEXT UNIQUE,
        dateClosed TEXT,
        status TEXT DEFAULT 'Open',
        FOREIGN KEY (clientId) REFERENCES clients(id)
    );
`)
db.exec(`
    CREATE TABLE IF NOT EXISTS case_parties (
        id TEXT PRIMARY KEY,
        caseId TEXT,
        name TEXT,
        role TEXT, -- 'Defendant', 'Plaintiff', or 'Other'
        isClient BOOLEAN DEFAULT FALSE,
        FOREIGN KEY (caseId) REFERENCES cases(id)
    );
`)
db.exec(`
    CREATE TABLE IF NOT EXISTS documents (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      documentId TEXT,
      caseId TEXT,
      type TEXT,
      filePath TEXT,
      fileName TEXT,
      dateAdded TEXT,
      FOREIGN KEY (caseId) REFERENCES cases(id)
    );
`)
db.exec(`
    CREATE TABLE IF NOT EXISTS evidence (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      documentId TEXT,
      caseId TEXT,
      type TEXT,
      filePath TEXT,
      fileName TEXT,
      dateAdded TEXT,
      FOREIGN KEY (caseId) REFERENCES cases(id)
    );
`)

// -------------- CLIENTS CRUD --------------
function getAllClients() {
    const stmt = db.prepare('SELECT * FROM clients')
    return stmt.all()
}

function getClientById(clientId) {
    const stmt = db.prepare(`SELECT * FROM clients WHERE id = ?`)
    return stmt.get(clientId)
}

function addClient(client) {
    const stmt = db.prepare(`
    INSERT INTO clients (
      id, firstName, lastName, phone, email, address1, address2, city, state, zip, notes
    ) VALUES (
      @id, @firstName, @lastName, @phone, @email, @address1, @address2, @city, @state, @zip, @notes
    )
  `)
    stmt.run(client)
}

function updateClient(client) {
    const stmt = db.prepare(`
    UPDATE clients
    SET
      firstName = @firstName,
      lastName = @lastName,
      phone = @phone,
      email = @email,
      address1 = @address1,
      address2 = @address2,
      city = @city,
      state = @state,
      zip = @zip,
      notes = @notes
    WHERE id = @id
  `)
    stmt.run(client)
}


// -------------- CASES CRUD --------------
function addCase(newCase) {
    const stmt = db.prepare(`
    INSERT INTO cases (id, clientId, caseName, dateOpened, description)
    VALUES (@id, @clientId, @caseName, @dateOpened, @description)
  `)
    stmt.run(newCase)
}

function getAllCases() {
    const stmt = db.prepare('SELECT * FROM cases')
    return stmt.all()
}

function updateCase(caseId, updatedData) {
    const {caseName, description, dateOpened, caseType, courtName, caseNumber, parties} = updatedData;

    console.log('Updating case with ID:', caseId);
    console.log('Updated Data:', updatedData);

    // Wrap the updates in a transaction
    const transaction = db.transaction(() => {
        // Update the case details in the "cases" table
        console.log('Executing UPDATE for cases...');
        db.prepare(
            `UPDATE cases SET 
                caseName = ?, 
                description = ?, 
                dateOpened = ?, 
                caseType = ?, 
                courtName = ?, 
                caseNumber = ? 
            WHERE id = ?`
        ).run(caseName, description, dateOpened, caseType, courtName, caseNumber, caseId);

        console.log('Executing DELETE for case_parties...');
        db.prepare(`DELETE FROM case_parties WHERE caseId = ?`).run(caseId);

        console.log('Inserting updated parties...');
        const insertStmt = db.prepare(
            `INSERT INTO case_parties (id, caseId, name, role, isClient) VALUES (?, ?, ?, ?, ?)`
        );

        for (const party of parties) {
            console.log('Inserting party:', party);
            insertStmt.run(party.id, caseId, party.name, party.role, party.isClient ? 1 : 0);
        }
    });

    try {
        console.log('Starting transaction...');
        transaction();
        console.log('Transaction committed successfully.');
        return {success: true};
    } catch (error) {
        console.error('Error during transaction:', error);
        throw error; // Pass the error to the caller
    }
}


function getCasesByClient(clientId) {
    const stmt = db.prepare(`
    SELECT * FROM cases WHERE clientId = ?
  `)
    return stmt.all(clientId)
}

function getCaseById(caseId) {
    const caseStmt = db.prepare(`
        SELECT 
            cases.id, cases.caseName, cases.description, cases.dateOpened, 
            cases.caseType, cases.courtName, cases.caseNumber, 
            cases.dateClosed, cases.status,
            clients.id AS clientId, 
            clients.firstName || ' ' || clients.lastName AS clientName
        FROM cases
        LEFT JOIN clients ON cases.clientId = clients.id
        WHERE cases.id = ?
    `);

    const caseData = caseStmt.get(caseId);

    if (caseData) {
        const partiesStmt = db.prepare(`
            SELECT id, name, role, isClient
            FROM case_parties
            WHERE caseId = ?
        `);
        caseData.parties = partiesStmt.all(caseId); // Include parties in the response
    }

    return caseData;
}

// -------------- DOCUMENTS CRUD --------------
function addDocument(doc) {
    const stmt = db.prepare(`
    INSERT INTO documents (documentId, caseId, type, filePath, fileName, dateAdded)
    VALUES (@documentId, @caseId, @type, @filePath, @fileName, @dateAdded)
  `)
    stmt.run(doc)
    return doc.documentId;
}

function getDocumentsByCase(caseId) {
    const stmt = db.prepare(`SELECT * FROM documents WHERE caseId = ?`)
    return stmt.all(caseId)
}

// -------------- EVIDENCE CRUD --------------
function addEvidence(evi) {
    const stmt = db.prepare(`
    INSERT INTO evidence (documentId, caseId, type, filePath, fileName, dateAdded)
    VALUES (@documentId, @caseId, @type, @filePath, @fileName, @dateAdded)
  `)
    stmt.run(evi)
    return evi.documentId;
}

function getEvidenceByCase(caseId) {
    const stmt = db.prepare(`SELECT * FROM evidence WHERE caseId = ?`)
    return stmt.all(caseId)
}


module.exports = {
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
}
