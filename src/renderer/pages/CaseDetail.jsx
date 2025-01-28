import React from 'react';
import {Link, Outlet, useLocation, useParams, useNavigate} from 'react-router-dom';
import {Box, Button, Grid, Paper, Tab, Tabs, Typography} from '@mui/material';

import CaseForm from '../components/CaseForm';
import DialogShell from '../components/DialogShell';
import AddItemForm from '../components/AddItemForm';


export default function CaseDetail({setCurrentModule}) {
    const navigate = useNavigate();
    const {caseId} = useParams();
    const location = useLocation();
    const [caseData, setCaseData] = React.useState(null);
    const [loading, setLoading] = React.useState(true);
    const [editDialogOpen, setEditDialogOpen] = React.useState(false);
    const [addItemDialogOpen, setAddItemDialogOpen] = React.useState(false)
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
        fetchCaseData().then(r => '');
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
        // Check if there's no sub-route (like "/documents" or "/evidence")
        // A simple check is: if it ends with just the caseId, redirect to "/documents".
        if (
            location.pathname === `/cases/${caseId}`
        ) {
            navigate('documents');
        }
    }, [location, caseId, navigate]);

    async function fetchCaseData() {
        setLoading(true);
        try {
            const data = await window.electronAPI.cases.getOne(caseId);
            // console.log('Fetched case data:', data);
            setCaseData(data);
            const docs = await window.electronAPI.documents.getByCase(caseId);
            setDocuments(docs);
            const evi = await window.electronAPI.evidence.getByCase(caseId);
            setEvidence(evi);

        } catch (error) {
            // console.error('Error fetching case data:', error);
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
            parties,
        };

        try {
            // console.log('Saving updated case:', updatedCase);
            await window.electronAPI.cases.update(caseId, updatedCase);
            console.log('Case updated in database.');

            await fetchCaseData(); // Refresh case data
            console.log('Case data refreshed.');

            setEditDialogOpen(false); // Close dialog after refresh
        } catch (error) {
            console.error('Error updating case:', error);
        }
    }

    const handleAddCaseItem = () => {
        setAddItemDialogOpen(true)
    }

    const handleConfirmAddItem = async () => {
        // 1) get the data from child
        const itemData = addItemRef.current.getData();

        // 2) pass the itemData to your existing logic
        await handleAddItemSubmit(itemData);
    };

    const handleAddItemSubmit = async (itemData) => {
        console.log('[CaseDetail] Submitting itemData:', itemData);

        try {
            let result

            if (itemData.category === 'Document') {
                result = await window.electronAPI.documents.add({
                    id: itemData.id,
                    caseId: caseId,            // you need to pass the current caseId
                    type: 'Document',          // or however you're categorizing
                    filePath: itemData.filePath,
                    fileName: itemData.fileName,
                    dateAdded: itemData.dateAdded,
                });
            } else {
                // Evidence
                result = await window.electronAPI.evidence.add({
                    id: itemData.id,
                    caseId: caseId,
                    type: 'Evidence',
                    filePath: itemData.filePath,
                    fileName: itemData.fileName,
                    dateAdded: itemData.dateAdded,
                });
            }

            if (result === 'OK') {
                // Reload case data or items (e.g., documents)
                await fetchCaseData()
            }
        } catch (error) {
            console.error('Error adding case item:', error)
        } finally {
            setAddItemDialogOpen(false)
        }
    }

    if (loading) {
        return <Typography>Loading case data...</Typography>;
    }

    if (!caseData || !caseData.id) {
        return <Typography variant="h6">Case not found.</Typography>;
    }

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
                                color: 'inherit', // Inherit color from parent Typography
                                cursor: 'pointer',
                                '&:hover': {
                                    textDecoration: 'underline', // Optional: Add underline on hover
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
                <Box
                    sx={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                    }}
                >
                    <Button
                        variant="contained"
                        color="primary"
                        sx={{mt: 2}}
                        onClick={handleAddCaseItem}>
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
