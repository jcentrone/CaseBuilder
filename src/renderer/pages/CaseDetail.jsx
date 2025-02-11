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
        if (caseData) {
            setCurrentModule(`Case Details: ${caseData.caseName}`);
        }
    }, [caseData, setCurrentModule]);

    React.useEffect(() => {
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
        if (location.pathname === `/cases/${caseId}`) {
            navigate('documents');
        }
    }, [location, caseId, navigate]);

    function buildSafeFileUrl(originalPath) {
        let normalizedPath = originalPath.replace(/\\/g, '/');
        normalizedPath = encodeURI(normalizedPath);
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

    // ================================
    // Unified Content Extraction Function
    // ================================
    async function extractContentFromFile(filePath) {
        const fileType = filePath.split('.').pop().toLowerCase();
        if (fileType === 'docx') {
            const safeFileUrl = buildSafeFileUrl(filePath);
            const response = await fetch(safeFileUrl);
            if (!response.ok) {
                throw new Error(`Failed to fetch DOCX file: ${response.statusText}`);
            }
            const buffer = await response.arrayBuffer();
            const result = await Mammoth.extractRawText({arrayBuffer: buffer});
            return {modality: 'text', content: result.value};
        } else if (fileType === 'pdf') {
            const safeFileUrl = buildSafeFileUrl(filePath);
            const pdfjsLib = await import('pdfjs-dist/legacy/build/pdf');
            pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://unpkg.com/pdfjs-dist@3.11.174/build/pdf.worker.min.js';
            const loadingTask = pdfjsLib.getDocument(safeFileUrl);
            const pdf = await loadingTask.promise;
            let extractedText = '';
            for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
                const page = await pdf.getPage(pageNum);
                const textContent = await page.getTextContent();
                const pageText = textContent.items.map((item) => item.str).join(' ');
                extractedText += pageText + '\n';
            }
            return {modality: 'text', content: extractedText};
        } else if (['png', 'jpg', 'jpeg', 'gif'].includes(fileType)) {
            const message = await extractImageEmbedding(filePath);
            return {modality: 'image', content: message};
        } else if (fileType === 'doc') {
            // Placeholder for legacy Word (.doc) processing.
            throw new Error("DOC file extraction not implemented yet.");
        } else if (['mp4', 'avi', 'mov'].includes(fileType)) {
            // Placeholder for video embedding extraction.
            throw new Error("Video embedding extraction not implemented yet.");
        } else if (['mp3', 'wav'].includes(fileType)) {
            // Placeholder for audio embedding extraction.
            throw new Error("Audio embedding extraction not implemented yet.");
        } else {
            throw new Error(`File type ${fileType} not supported for extraction.`);
        }
    }

    // ================================
    // Image Embedding Extraction Function
    // ================================
    async function extractImageEmbedding(filePath) {
        const safeFileUrl = buildSafeFileUrl(filePath);
        const response = await fetch(safeFileUrl);
        if (!response.ok) {
            throw new Error(`Failed to fetch image: ${response.statusText}`);
        }
        const blob = await response.blob();
        const formData = new FormData();
        formData.append("file", blob, filePath.split('/').pop());
        const res = await fetch('http://localhost:8000/image_embedding', {
            method: 'POST',
            body: formData,
        });
        if (!res.ok) {
            throw new Error(`Error from image embedding endpoint: ${res.statusText}`);
        }
        const data = await res.json();
        // Now return just the message (or use it to update UI state)
        return data.message;
    }


    // ================================
    // Placeholders for Video and Audio Embeddings
    // ================================
    async function extractVideoEmbedding(filePath) {
        throw new Error("Video embedding extraction not implemented yet.");
    }

    async function extractAudioEmbedding(filePath) {
        throw new Error("Audio embedding extraction not implemented yet.");
    }

    // ================================
    // Process Document and Store Function
    // ================================
    const processDocumentAndStore = async (itemData) => {
        try {
            const safeFileUrl = buildSafeFileUrl(itemData.filePath);
            console.log('Fetching document from:', safeFileUrl);

            // Use the unified extraction function
            const extracted = await extractContentFromFile(itemData.filePath);
            console.log('Extracted content:', extracted);

            const savedCustomer = localStorage.getItem('customer');
            const customerID = savedCustomer ? JSON.parse(savedCustomer).client_id : null;
            if (!customerID) {
                console.error('No customer_id found in local storage. Please ensure customer settings have been saved.');
                return;
            }

            // Build payload and include different keys based on modality.
            let payload = {
                document_id: itemData.documentId,
                doc_id: itemData.fileName, // or another descriptive name
                similarity_threshold: 0.8,
                min_chunk_size: 1,
                max_chunk_size: 5,
                customer_id: customerID,
                case_id: caseId,
                client_id: caseData?.clientId || null,
                document_name: itemData.fileName,
            };

            if (extracted.modality === 'text') {
                payload.text = extracted.content;
                await chunkAndStore(payload);
            } else if (extracted.modality === 'image') {
                console.log('Image embedding already stored. Skipping chunking.');
            } else if (extracted.modality === 'video') {
                payload.video_embedding = extracted.content;
            } else if (extracted.modality === 'audio') {
                payload.audio_embedding = extracted.content;
            }

            async function chunkAndStore(payload) {
                // POST the payload to your backend chunk_and_store endpoint
                const storeResponse = await fetch('http://localhost:8000/chunk_and_store', {
                    method: 'POST',
                    headers: {'Content-Type': 'application/json'},
                    body: JSON.stringify(payload),
                });
                if (!storeResponse.ok) {
                    throw new Error(`Error from /chunk_and_store: ${storeResponse.statusText}`);
                }
                const storeData = await storeResponse.json();
                console.log('Store Response:', storeData);
            }
        } catch (error) {
            console.error('Error processing document and storing:', error);
        }
    };

    async function handleSaveCase() {
        const updatedCase = {
            ...caseData,
            caseName,
            description,
            dateOpened,
            caseType,
            courtName,
            caseNumber,
            parties,
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
        const itemData = addItemRef.current.getData();

        const documentId = await handleAddItemSubmit(itemData);
        console.log('Document ID:', documentId);

        if (documentId) {
            itemData.documentId = documentId; // attach for the backend call
            await processDocumentAndStore(itemData);
            await fetchCaseData(); // Refresh case data to see the new doc in the list
        }
    };

    /**
     * Stores metadata about the new doc/evidence in the local DB and returns the documentId on success.
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
                    dateAdded: itemData.dateAdded,
                });
            } else {
                result = await window.electronAPI.evidence.add({
                    documentId: itemData.documentId,
                    caseId: caseId,
                    type: 'Evidence',
                    filePath: itemData.filePath,
                    fileName: itemData.fileName,
                    dateAdded: itemData.dateAdded,
                });
            }

            if (result && typeof result === 'object' && result.documentId) {
                return result.documentId;
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
    if (location.pathname.includes('/chat')) tabValue = 3;
    if (location.pathname.endsWith('/details')) tabValue = 4;

    return (
        <Box
            sx={{
                height: 'calc(100vh - 65px)',
                p: 3
            }}>
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
                                    textDecoration: 'underline',
                                },
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
                <Box sx={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                    <Button variant="contained" color="primary" sx={{mt: 2}} onClick={handleAddCaseItem}>
                        Add Case Item
                    </Button>
                    <Button variant="outlined" color="primary" sx={{mt: 2}} onClick={() => setEditDialogOpen(true)}>
                        Edit Case Details
                    </Button>
                </Box>
            </Paper>

            {/* Sub-navigation with Tabs */}
            <Tabs value={tabValue} sx={{mb: 2}}>
                <Tab label="Documents" component={Link} to="documents"/>
                <Tab label="Evidence" component={Link} to="evidence"/>
                <Tab label="Graph" component={Link} to="graph"/>
                <Tab label="Chat" component={Link} to="chat/:chatId"/>
                <Tab label="Details" component={Link} to="details"/>
            </Tabs>

            {/* Child route content */}
            <Box sx={{height: 'calc(100vh - 415px)', overflow: 'hidden'}}>
                <Outlet context={{documents, evidence}}/>
            </Box>

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
