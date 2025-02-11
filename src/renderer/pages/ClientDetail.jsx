import React from 'react'
import {useNavigate, useParams} from 'react-router-dom'
import {Box, Button, Grid, Paper, Table, TableBody, IconButton, TableCell, TableHead, TableRow, Typography} from '@mui/material'
import {v4 as uuidv4} from 'uuid'
import DeleteIcon from '@mui/icons-material/Delete'

import DialogShell from '../components/DialogShell'
import CaseForm from '../components/CaseForm'

import Swal from 'sweetalert2'


export default function ClientDetail({setCurrentModule}) {
    const {clientId} = useParams()
    const navigate = useNavigate()
    const [clientData, setClientData] = React.useState(null)
    const [cases, setCases] = React.useState([])
    const [loading, setLoading] = React.useState(true);

    // For "Add Case" dialog
    const [dialogOpen, setDialogOpen] = React.useState(false)
    const [caseName, setCaseName] = React.useState('')
    const [description, setDescription] = React.useState('')
    const [dateOpened, setDateOpened] = React.useState('')
    const [caseType, setCaseType] = React.useState('');
    const [courtName, setCourtName] = React.useState('');
    const [caseNumber, setCaseNumber] = React.useState('');
    const [parties, setParties] = React.useState([]);

    React.useEffect(() => {
        // Load the client info from DB
        fetchClientData().then(r => '');
    }, [clientId])

    React.useEffect(() => {
        // Set the module title dynamically
        if (clientData) {
            setCurrentModule(`Client Details: ${clientData.firstName} ${clientData.lastName}`);
        }
    }, [clientData, setCurrentModule]);

    async function fetchClientData() {
        setLoading(true);
        try {
            // Fetch client details from the database
            const clientDetails = await window.electronAPI.clients.getOne(clientId);
            setClientData(clientDetails);

            // Fetch associated cases
            const associatedCases = await window.electronAPI.cases.getByClient(clientId);
            setCases(associatedCases);
        } catch (error) {
            console.error('Error fetching client data or cases:', error);
            setClientData(null);
            setCases([]); // Clear cases if there's an error
        } finally {
            setLoading(false);
        }
    }

    function handleOpenAddCase() {
        setCaseName('');
        setDescription('');
        setDateOpened('');
        setCaseType(''); // Reset caseType
        setCourtName(''); // Reset courtName
        setCaseNumber(''); // Reset caseNumber
        setParties([]); // Reset parties
        setDialogOpen(true);
    }

    async function handleSaveCase() {
        const newCase = {
            id: uuidv4(),
            clientId,
            caseName,
            description,
            dateOpened: dateOpened || new Date().toISOString(),
            caseType,
            courtName,
            caseNumber,
            parties, // Include parties in the new case
        };
        // Add case via IPC
        await window.electronAPI.cases.add(newCase);
        setDialogOpen(false);

        // Refresh the cases list
        fetchClientDetail();
    }

    async function handleDelete(caseId) {
        const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;

        const result = await Swal.fire({
            title: "Are you sure?",
            text: "This will permanently delete the case.",
            icon: "warning",
            showCancelButton: true,
            confirmButtonColor: "#d33",
            cancelButtonColor: "#3085d6",
            confirmButtonText: "Yes, delete it!",
            background: prefersDark ? "#1e1e1e" : "#fff",
            color: prefersDark ? "#fff" : "#000",
        });

        if (result.isConfirmed) {
            await window.electronAPI.cases.delete(caseId);
            setCases((prevCases) => prevCases.filter((c) => c.id !== caseId));

            Swal.fire({
                title: "Deleted!",
                text: "The case has been removed.",
                icon: "success",
                background: prefersDark ? "#1e1e1e" : "#fff",
                color: prefersDark ? "#fff" : "#000",
            });
        }
    }


    if (!clientData) {
        return <Typography>Loading client data...</Typography>
    }

    // If the DB returned nothing for that ID:
    if (!clientData.id) {
        return <Typography variant="h6">Client not found.</Typography>
    }

    return (
        <Box sx={{p: 3,}}>

            <Paper elevation={3} sx={{p: 3, mb: 3}}>
                <Grid container spacing={2}>
                    {/* Client Name */}
                    <Grid item xs={12}>
                        <Typography variant="h4" gutterBottom>
                            {clientData.firstName} {clientData.lastName}
                        </Typography>
                    </Grid>

                    {/* Address Information */}
                    <Grid item xs={12} md={8}>
                        <Typography variant="subtitle2" gutterBottom>
                            <strong>Address:</strong> {clientData.address1 || 'Not provided'}
                            {clientData.address2 ? `, ${clientData.address2}` : ''}
                        </Typography>
                        <Typography variant="subtitle2" gutterBottom>
                            {clientData.city}, {clientData.state} {clientData.zip}
                        </Typography>
                    </Grid>

                    {/* Contact Information */}
                    <Grid item xs={12} md={4}>
                        <Typography variant="subtitle2" gutterBottom>
                            <strong>Phone:</strong> {clientData.phone || 'Not provided'}
                        </Typography>
                        <Typography variant="subtitle2" gutterBottom>
                            <strong>Email:</strong> {clientData.email || 'Not provided'}
                        </Typography>
                    </Grid>

                    {/* Notes */}
                    <Grid item xs={12}>
                        <Typography variant="subtitle2" gutterBottom>
                            <strong>Notes:</strong> {clientData.notes || 'No additional notes.'}
                        </Typography>
                    </Grid>
                </Grid>
            </Paper>


            {/* Show Cases for this client */}
            <Box sx={{mt: 3}}>
                <Box sx={{display: 'flex', justifyContent: 'space-between'}}>
                    <Typography variant="h5" gutterBottom>Cases</Typography>
                    <Button variant="contained" onClick={() => setDialogOpen(true)} sx={{mb: 2}}>
                        Add Case
                    </Button>
                </Box>

                {cases.length === 0 ? (
                    <Typography>No cases found for this client.</Typography>
                ) : (
                    <Paper>
                        <Table>
                            <TableHead>
                                <TableRow>
                                    <TableCell>Case Name</TableCell>
                                    <TableCell>Date Opened</TableCell>
                                    <TableCell>Description</TableCell>
                                    <TableCell>Actions</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {cases.map((c) => (
                                    <TableRow key={c.id} hover>
                                        <TableCell
                                            style={{cursor: 'pointer'}}
                                            onClick={() => navigate(`/cases/${c.id}`)}
                                        >
                                            {c.caseName}
                                        </TableCell>
                                        <TableCell>{c.dateOpened}</TableCell>
                                        <TableCell>{c.description}</TableCell>
                                        <TableCell>
                                            <IconButton
                                                color="error"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleDelete(c.id);
                                                }}
                                            >
                                                <DeleteIcon/>
                                            </IconButton>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </Paper>
                )}
            </Box>

            {/* Dialog to add new case */}
            <DialogShell
                title="Add New Case"
                open={dialogOpen}
                onClose={() => setDialogOpen(false)}
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
                    parties={parties || []} // Pass an empty array if parties is undefined
                    onPartiesChange={setParties}
                />
            </DialogShell>
        </Box>
    )
}
