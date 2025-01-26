import React, { useState } from 'react';
import { Box, Grid, TextField, Typography, FormControl, InputLabel, Select, MenuItem, Button } from '@mui/material';

export default function CaseForm({
    caseName, onCaseNameChange,
    description, onDescriptionChange,
    dateOpened, onDateOpenedChange,
    caseType, onCaseTypeChange,
    courtName, onCourtNameChange,
    caseNumber, onCaseNumberChange,
    parties = [], onPartiesChange
}) {
    const [partyName, setPartyName] = useState('');
    const [partyRole, setPartyRole] = useState('');
    const [isClientParty, setIsClientParty] = useState(false);

    const handleAddParty = () => {
        if (partyName && partyRole) {
            const newParty = {
                id: Date.now().toString(), // Temporary unique ID
                name: partyName,
                role: partyRole,
                isClient: isClientParty,
            };
            onPartiesChange([...parties, newParty]);
            setPartyName('');
            setPartyRole('');
            setIsClientParty(false);
        }
    };

    const handleRemoveParty = (id) => {
        onPartiesChange(parties.filter((party) => party.id !== id));
    };

    return (
        <Box>
            {/* Case Details */}
            <Typography variant="h6" gutterBottom>
                Case Details
            </Typography>
            <Grid container spacing={2}>
                <Grid item xs={12}>
                    <TextField
                        label="Case Name"
                        value={caseName}
                        onChange={(e) => onCaseNameChange(e.target.value)}
                        fullWidth
                        margin="normal"
                    />
                </Grid>
                <Grid item xs={12}>
                    <TextField
                        label="Description"
                        value={description}
                        onChange={(e) => onDescriptionChange(e.target.value)}
                        multiline
                        rows={3}
                        fullWidth
                        margin="normal"
                    />
                </Grid>
                <Grid item xs={12}>
                    <TextField
                        label="Date Opened"
                        type="date"
                        value={dateOpened}
                        onChange={(e) => onDateOpenedChange(e.target.value)}
                        fullWidth
                        margin="normal"
                        InputLabelProps={{
                            shrink: true,
                        }}
                    />
                </Grid>
                <Grid item xs={12} sm={6}>
                    <FormControl fullWidth margin="normal">
                        <InputLabel>Case Type</InputLabel>
                        <Select
                            value={caseType}
                            onChange={(e) => onCaseTypeChange(e.target.value)}
                        >
                            <MenuItem value="Civil">Civil</MenuItem>
                            <MenuItem value="Criminal">Criminal</MenuItem>
                            <MenuItem value="Family">Family</MenuItem>
                            <MenuItem value="Other">Other</MenuItem>
                        </Select>
                    </FormControl>
                </Grid>
                <Grid item xs={12} sm={6}>
                    <TextField
                        label="Court Name"
                        value={courtName}
                        onChange={(e) => onCourtNameChange(e.target.value)}
                        fullWidth
                        margin="normal"
                    />
                </Grid>
                <Grid item xs={12}>
                    <TextField
                        label="Case Number"
                        value={caseNumber}
                        onChange={(e) => onCaseNumberChange(e.target.value)}
                        fullWidth
                        margin="normal"
                    />
                </Grid>
            </Grid>

            {/* Parties Involved */}
            <Typography variant="h6" gutterBottom sx={{ mt: 3 }}>
                Parties Involved
            </Typography>
            <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                    <TextField
                        label="Party Name"
                        value={partyName}
                        onChange={(e) => setPartyName(e.target.value)}
                        fullWidth
                        margin="normal"
                    />
                </Grid>
                <Grid item xs={12} sm={4}>
                    <FormControl fullWidth margin="normal">
                        <InputLabel>Role</InputLabel>
                        <Select
                            value={partyRole}
                            onChange={(e) => setPartyRole(e.target.value)}
                        >
                            <MenuItem value="Plaintiff">Plaintiff</MenuItem>
                            <MenuItem value="Defendant">Defendant</MenuItem>
                            <MenuItem value="Other">Other</MenuItem>
                        </Select>
                    </FormControl>
                </Grid>
                <Grid item xs={12} sm={2}>
                    <Button
                        variant="contained"
                        fullWidth
                        onClick={() => setIsClientParty(!isClientParty)}
                        color={isClientParty ? 'primary' : 'default'}
                    >
                        {isClientParty ? 'Is Client' : 'Not Client'}
                    </Button>
                </Grid>
                <Grid item xs={12}>
                    <Button variant="contained" color="primary" onClick={handleAddParty}>
                        Add Party
                    </Button>
                </Grid>
            </Grid>

            {/* Display Parties */}
             <Box sx={{ mt: 2 }}>
                {parties.map((party) => (
                    <Box key={party.id} sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                        <Typography sx={{ flexGrow: 1 }}>
                            {party.name} - {party.role} {party.isClient ? '(Client)' : ''}
                        </Typography>
                        <Button
                            variant="outlined"
                            color="secondary"
                            onClick={() => handleRemoveParty(party.id)}
                        >
                            Remove
                        </Button>
                    </Box>
                ))}
            </Box>
        </Box>
    );
}
