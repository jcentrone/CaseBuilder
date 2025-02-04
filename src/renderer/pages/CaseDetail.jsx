import React from 'react';
import {Link, Outlet, useLocation, useNavigate, useParams} from 'react-router-dom';
import {Box, Button, Grid, Paper, Tab, Tabs, Typography} from '@mui/material';

import CaseForm from '../components/CaseForm';
import DialogShell from '../components/DialogShell';
import AddItemForm from '../components/AddItemForm';
import Mammoth from 'mammoth';

export default function CaseDetail({setCurrentModule}) {
    const navigate = useNavigate();
    const {caseId} = useParams();
    const location = useLocation();
    const [caseData, setCaseData] = React.useState(null);
    const [loading, setLoading] = React.useState(true);
    const [editDialogOpen, setEditDialogOpen] = React.useState(false);
    const [addItemDialogOpen, setAddItemDialogOpen] = React.useState(false);
    const addItemRef = React.useRef(null);

    // Form fields
    const [caseName, setCaseName] = React.useState('');
    const [description, setDescription] = React.useState('');
    const [dateOpened, setDateOpened] = React.useState('');
    const [caseType, setCaseType] = React.useState('');
    const [courtName, setCourtName] = React.useState('');
    const [caseNumber, setCaseNumber] = React.useState('');
    const [parties, setParties] = React.useState([]);
    const [documents, setDocuments] = React.useState([]);
    const [evidence, setEvidence] = React.useState([]);

    React.useEffect(() => {
        fetchCaseData().then(() => {
        });
    }, [caseId]);

    React.useEffect(() => {
        // Set the module title dynamically
        if (caseData) {
            setCurrentModule(`Case Details: ${caseData.caseName} `);
        }
    }, [caseData, setCurrentModule]);

    React.useEffect(() => {
        // Sync form fields with case data
        if (caseData) {
            setCaseName(caseData.caseName || '');
            setDescription(caseData.description || '');
            setDateOpened(caseData.dateOpened || '');
            setCaseType(caseData.caseType || '');
            setCourtName(caseData.courtName || '');
            setCaseNumber(caseData.caseNumber || '');
            setParties(caseData.parties || []);
        }
    }, [caseData]);

    React.useEffect(() => {
        // If the path is exactly "/cases/:caseId", redirect to "/documents"
        if (location.pathname === `/cases/${caseId}`) {
            navigate('documents');
        }
    }, [location, caseId, navigate]);

    function buildSafeFileUrl(originalPath) {
        // Replace backslashes with forward slashes
        let normalizedPath = originalPath.replace(/\\/g, '/');
        // Encode spaces and other special chars, but not slashes or colons
        normalizedPath = encodeURI(normalizedPath);
        // Then prepend 'safe-file:///'
        return `safe-file:///${normalizedPath}`;
    }

    async function fetchCaseData() {
        setLoading(true);
        try {
            const data = await window.electronAPI.cases.getOne(caseId);
            setCaseData(data);

            const docs = await window.electronAPI.documents.getByCase(caseId);
            setDocuments(docs);

            const evi = await window.electronAPI.evidence.getByCase(caseId);
            setEvidence(evi);
        } catch (error) {
            console.error('Error fetching case data:', error);
            setCaseData(null);
        } finally {
            setLoading(false);
        }
    }

    async function handleSaveCase() {
        const updatedCase = {
            ...caseData,
            caseName,
            description,
            dateOpened,
            caseType,
            courtName,
            caseNumber,
            parties
        };

        try {
            await window.electronAPI.cases.update(caseId, updatedCase);
            console.log('Case updated in database.');
            await fetchCaseData(); // Refresh case data
            console.log('Case data refreshed.');
            setEditDialogOpen(false);
        } catch (error) {
            console.error('Error updating case:', error);
        }
    }

    const handleAddCaseItem = () => {
        setAddItemDialogOpen(true);
    };

    /**
     * Called when the user confirms adding a new document/evidence item.
     */
    const handleConfirmAddItem = async () => {
        // 1) Get the data from child
        const itemData = addItemRef.current.getData();

        // 2) Store in local DB first
        const documentId = await handleAddItemSubmit(itemData);
        console.log('Document ID:', documentId);

        // 3) If successful, extract doc text and call our new chunk_and_store endpoint
        if (documentId) {
            itemData.documentId = documentId; // attach for the backend call
            await processDocumentAndStore(itemData);
            await fetchCaseData(); // Refresh the case data to see the new doc in the list
        }
    };

    /**
     * Stores metadata about the new doc/evidence in the local DB,
     * returns the assigned documentId on success.
     */
    const handleAddItemSubmit = async (itemData) => {
        console.log('[CaseDetail] Submitting itemData:', itemData);

        try {
            let result;
            if (itemData.category === 'Document') {
                result = await window.electronAPI.documents.add({
                    documentId: itemData.documentId,
                    caseId: caseId,
                    type: 'Document',
                    filePath: itemData.filePath,
                    fileName: itemData.fileName,
                    dateAdded: itemData.dateAdded
                });
            } else {
                result = await window.electronAPI.evidence.add({
                    documentId: itemData.documentId,
                    caseId: caseId,
                    type: 'Evidence',
                    filePath: itemData.filePath,
                    fileName: itemData.fileName,
                    dateAdded: itemData.dateAdded
                });
            }

            if (result && typeof result === 'object' && result.documentId) {
                return result.documentId; // Return the new documentId
            } else {
                console.error('Failed to retrieve document ID.');
                return null;
            }
        } catch (error) {
            console.error('Error adding case item:', error);
            return null;
        } finally {
            setAddItemDialogOpen(false);
        }
    };

    /**
     *  - Fetches the doc from the local file system (safe-file protocol).
     *  - Extracts text using Mammoth.
     *  - Sends the entire text + relevant IDs to /chunk_and_store for backend chunking + storage.
     */
    const processDocumentAndStore = async (itemData) => {
        try {
            const safeFileUrl = buildSafeFileUrl(itemData.filePath);
            console.log('Fetching document from:', safeFileUrl);

            const response = await fetch(safeFileUrl);
            if (!response.ok) {
                throw new Error(`Failed to fetch document: ${response.statusText}`);
            }

            const buffer = await response.arrayBuffer();
            const result = await Mammoth.extractRawText({arrayBuffer: buffer});
            const extractedText = result.value;
            console.log('Extracted Text:', extractedText);

            // Retrieve the stored customer from localStorage
            const savedCustomer = localStorage.getItem('customer');
            const customerID = savedCustomer
                ? JSON.parse(savedCustomer).client_id
                : null;
            if (!customerID) {
                console.error(
                    'No customer_id found in local storage. Please ensure customer settings have been saved.'
                );
                return;
            }

            // Build the payload for /chunk_and_store
            const payload = {
                text: extractedText,
                document_id: itemData.documentId,
                doc_id: itemData.fileName, // or some other descriptive name
                // Tweak these chunking parameters as needed:
                similarity_threshold: 0.8,
                min_chunk_size: 1,
                max_chunk_size: 5,
                customer_id: customerID,
                case_id: caseId,
                client_id: caseData?.clientId || null,
                document_name: itemData.fileName
            };

            // POST to /chunk_and_store
            const storeResponse = await fetch('http://localhost:8000/chunk_and_store', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify(payload)
            });

            if (!storeResponse.ok) {
                throw new Error(`Error from /chunk_and_store: ${storeResponse.statusText}`);
            }

            const storeData = await storeResponse.json();
            console.log('Store Response:', storeData);
        } catch (error) {
            console.error('Error processing document and storing:', error);
        }
    };

    if (loading) {
        return <Typography>Loading case data...</Typography>;
    }

    if (!caseData || !caseData.id) {
        return <Typography variant="h6">Case not found.</Typography>;
    }

    // Determine which tab to highlight
    let tabValue = 0;
    if (location.pathname.endsWith('/documents')) tabValue = 0;
    if (location.pathname.endsWith('/evidence')) tabValue = 1;
    if (location.pathname.endsWith('/graph')) tabValue = 2;
    if (location.pathname.endsWith('/assistant')) tabValue = 3;
    if (location.pathname.endsWith('/details')) tabValue = 4;

    return (
        <Box sx={{p: 3}}>
            {/* Primary Case Information */}
            <Paper elevation={3} sx={{p: 3, mb: 3}}>
                <Grid container spacing={2}>
                    <Grid item xs={12} md={8}>
                        <Typography variant="h4" gutterBottom>
                            {caseData.caseName}
                        </Typography>
                        <Typography variant="subtitle1" gutterBottom>
                            {caseData.description || 'No description available.'}
                        </Typography>
                    </Grid>
                    <Grid item xs={12} md={4}>
                        <Typography
                            variant="subtitle2"
                            gutterBottom
                            component={Link}
                            to={`/clients/${caseData.clientId}`}
                            sx={{
                                textDecoration: 'none',
                                color: 'inherit',
                                cursor: 'pointer',
                                '&:hover': {
                                    textDecoration: 'underline'
                                }
                            }}
                        >
                            Client: {caseData.clientName || 'Unknown Client'}
                        </Typography>
                        <Typography variant="subtitle2" gutterBottom>
                            Case Type: {caseData.caseType || 'Unknown'}
                        </Typography>
                        <Typography variant="subtitle2" gutterBottom>
                            Court: {caseData.courtName || 'Not specified'}
                        </Typography>
                        <Typography variant="subtitle2" gutterBottom>
                            Case Number: {caseData.caseNumber || 'Not assigned'}
                        </Typography>
                        <Typography variant="subtitle2" gutterBottom>
                            Status: {caseData.status || 'Open'}
                        </Typography>
                    </Grid>
                </Grid>
                <Box
                    sx={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                    }}
                >
                    <Button
                        variant="contained"
                        color="primary"
                        sx={{mt: 2}}
                        onClick={handleAddCaseItem}
                    >
                        Add Case Item
                    </Button>
                    <Button
                        variant="outlined"
                        color="primary"
                        sx={{mt: 2}}
                        onClick={() => setEditDialogOpen(true)}
                    >
                        Edit Case Details
                    </Button>
                </Box>
            </Paper>

            {/* Sub-navigation with Tabs */}
            <Tabs value={tabValue} sx={{mb: 2}}>
                <Tab label="Documents" component={Link} to="documents"/>
                <Tab label="Evidence" component={Link} to="evidence"/>
                <Tab label="Graph" component={Link} to="graph"/>
                <Tab label="Assistant" component={Link} to="assistant"/>
                <Tab label="Details" component={Link} to="details"/>
            </Tabs>

            {/* Child route content */}
            <Outlet context={{documents, evidence}}/>

            {/* Add Item Dialog */}
            <DialogShell
                title="Add Case Item"
                open={addItemDialogOpen}
                onClose={() => setAddItemDialogOpen(false)}
                onConfirm={handleConfirmAddItem}
            >
                <AddItemForm collectFormDataRef={addItemRef}/>
            </DialogShell>

            {/* Edit Case Dialog */}
            <DialogShell
                title="Edit Case Details"
                open={editDialogOpen}
                onClose={() => setEditDialogOpen(false)}
                onConfirm={handleSaveCase}
            >
                <CaseForm
                    caseName={caseName}
                    onCaseNameChange={setCaseName}
                    description={description}
                    onDescriptionChange={setDescription}
                    dateOpened={dateOpened}
                    onDateOpenedChange={setDateOpened}
                    caseType={caseType}
                    onCaseTypeChange={setCaseType}
                    courtName={courtName}
                    onCourtNameChange={setCourtName}
                    caseNumber={caseNumber}
                    onCaseNumberChange={setCaseNumber}
                    parties={parties}
                    onPartiesChange={setParties}
                />
            </DialogShell>
        </Box>
    );
}
