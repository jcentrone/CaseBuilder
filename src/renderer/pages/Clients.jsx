// src/renderer/pages/Clients.jsx
import React from 'react'
import {
    Box,
    Button,
    IconButton,
    Paper,
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableRow,
    TextField,
    Typography
} from '@mui/material'
import {v4 as uuidv4} from 'uuid'
import {Edit as EditIcon} from '@mui/icons-material'
import {useNavigate} from 'react-router-dom' // <== import
import DialogShell from '../components/DialogShell'
import ClientForm from '../components/ClientForm'

export default function Clients() {
    const [clientList, setClientList] = React.useState([])
    const [filterText, setFilterText] = React.useState('')
    const [dialogOpen, setDialogOpen] = React.useState(false)

    // Distinguish between new or edit
    const [isEditing, setIsEditing] = React.useState(false)
    // Store the ID of the client being edited (if any)
    const [editingClientId, setEditingClientId] = React.useState(null)

    // Form fields
    const [firstName, setFirstName] = React.useState('')
    const [lastName, setLastName] = React.useState('')
    const [phone, setPhone] = React.useState('')
    const [email, setEmail] = React.useState('')
    const [address1, setAddress1] = React.useState('')
    const [address2, setAddress2] = React.useState('')
    const [city, setCity] = React.useState('')
    const [stateValue, setStateValue] = React.useState('')
    const [zip, setZip] = React.useState('')
    const [notes, setNotes] = React.useState('')

    const navigate = useNavigate()

    React.useEffect(() => {
        fetchClients()
    }, [])

    async function fetchClients() {
        const clients = await window.electronAPI.clients.getAll()
        setClientList(clients)
    }

    function handleOpenNew() {
        // Clear the form
        setFirstName('')
        setLastName('')
        setPhone('')
        setEmail('')
        setAddress1('')
        setAddress2('')
        setCity('')
        setStateValue('')
        setZip('')
        setNotes('')

        setIsEditing(false)
        setEditingClientId(null)
        setDialogOpen(true)
    }

    function handleOpenEdit(client, e) {
        if (e && typeof e.stopPropagation === 'function') {
            e.stopPropagation(); // Prevent row click from triggering
        }

        setIsEditing(true);
        setEditingClientId(client.id);

        // Populate form with existing data
        setFirstName(client.firstName || '');
        setLastName(client.lastName || '');
        setPhone(client.phone || '');
        setEmail(client.email || '');
        setAddress1(client.address1 || '');
        setAddress2(client.address2 || '');
        setCity(client.city || '');
        setStateValue(client.state || ''); // note 'client.state' might be your db column
        setZip(client.zip || '');
        setNotes(client.notes || '');

        setDialogOpen(true);
    }


    async function handleSave() {
        if (isEditing) {
            // Updating existing record
            const updatedClient = {
                id: editingClientId,
                firstName,
                lastName,
                phone,
                email,
                address1,
                address2,
                city,
                state: stateValue,
                zip,
                notes
            }
            await window.electronAPI.clients.update(updatedClient)
        } else {
            // New client
            const newClient = {
                id: uuidv4(),
                firstName,
                lastName,
                phone,
                email,
                address1,
                address2,
                city,
                state: stateValue,
                zip,
                notes
            }
            await window.electronAPI.clients.add(newClient)
        }

        fetchClients()
        setDialogOpen(false)
    }

    const filteredClients = React.useMemo(() => {
        return clientList.filter((cl) => {
            // Combine firstName + lastName for simpler filtering
            const nameCombined = `${cl.firstName || ''} ${cl.lastName || ''}`.toLowerCase()
            return nameCombined.includes(filterText.toLowerCase())
        })
    }, [filterText, clientList])

    return (
        <Box sx={{ p: 3,}}>
            <Typography variant="h4" gutterBottom>
                Clients
            </Typography>

            <Box sx={{display: 'flex', justifyContent: 'space-between'}}>


                <TextField
                    label="Search by client name"
                    value={filterText}
                    onChange={(e) => setFilterText(e.target.value)}
                    size="small"
                    sx={{mb: 2}}
                />
                <Box sx={{mb: 2}}>
                    <Button variant="contained" onClick={handleOpenNew}>
                        Add New Client
                    </Button>
                </Box>
            </Box>
            <Paper>
                <Table>
                    <TableHead>
                        <TableRow>
                            <TableCell>Name</TableCell>
                            <TableCell>Phone</TableCell>
                            <TableCell>Email</TableCell>
                            <TableCell>City</TableCell>
                            <TableCell>State</TableCell>
                            <TableCell>Edit</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {filteredClients.map((client) => {
                            const fullName = `${client.firstName || ''} ${client.lastName || ''}`.trim()
                            return (
                                <TableRow
                                    key={client.id}
                                    hover
                                    style={{cursor: 'pointer'}}
                                    onClick={() => navigate(`/clients/${client.id}`)}
                                >
                                    <TableCell>{fullName}</TableCell>
                                    <TableCell>{client.phone}</TableCell>
                                    <TableCell>{client.email}</TableCell>
                                    <TableCell>{client.city}</TableCell>
                                    <TableCell>{client.state}</TableCell>
                                    <TableCell>
                                        <IconButton onClick={(e) => handleOpenEdit(client, e)}>
                                            <EditIcon/>
                                        </IconButton>
                                    </TableCell>
                                </TableRow>
                            )
                        })}
                        {filteredClients.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={6} align="center">
                                    No clients found.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </Paper>
            {/* Our Generic DialogShell */}
            <DialogShell
                title={isEditing ? 'Edit Client' : 'Add New Client'}
                open={dialogOpen}
                onClose={() => setDialogOpen(false)}
                onConfirm={handleSave}
            >
                <ClientForm
                    firstName={firstName} onFirstNameChange={setFirstName}
                    lastName={lastName} onLastNameChange={setLastName}
                    phone={phone} onPhoneChange={setPhone}
                    email={email} onEmailChange={setEmail}
                    address1={address1} onAddress1Change={setAddress1}
                    address2={address2} onAddress2Change={setAddress2}
                    city={city} onCityChange={setCity}
                    stateValue={stateValue} onStateChange={setStateValue}
                    zip={zip} onZipChange={setZip}
                    notes={notes} onNotesChange={setNotes}
                />
            </DialogShell>
        </Box>
    )
}
