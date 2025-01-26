import React, { useState } from 'react';
import { Box, Grid, FormControl, InputLabel, MenuItem, Select, TextField, Typography } from '@mui/material';

const US_STATES = [
    'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA',
    'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD',
    'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
    'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC',
    'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY',
];

export default function ClientForm({
    firstName, onFirstNameChange,
    lastName, onLastNameChange,
    phone, onPhoneChange,
    email, onEmailChange,
    address1, onAddress1Change,
    address2, onAddress2Change,
    city, onCityChange,
    stateValue, onStateChange,
    zip, onZipChange,
    notes, onNotesChange
}) {
    // State for email error
    const [emailError, setEmailError] = useState('');

    // Helper functions
    const capitalizeFirstLetter = (value) => {
        return value.replace(/\b\w/g, (char) => char.toUpperCase());
    };

    const validateEmail = (value) => {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(value)) {
            setEmailError('Invalid email address');
            return false;
        }
        setEmailError('');
        return true;
    };

    const formatPhoneNumber = (value) => {
        const phoneRegex = /^(\d{3})(\d{3})(\d{4})$/;
        const cleaned = value.replace(/\D/g, ''); // Remove non-numeric characters
        const match = cleaned.match(phoneRegex);
        return match ? `(${match[1]}) ${match[2]}-${match[3]}` : value;
    };

    return (
        <Box sx={{ p: 3 }}>
            {/* Contact Info Header */}
            <Typography variant="h6" gutterBottom>
                Contact Information
            </Typography>
            <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                    <TextField
                        label="First Name"
                        value={firstName}
                        onChange={(e) => onFirstNameChange(capitalizeFirstLetter(e.target.value))}
                        fullWidth
                    />
                </Grid>
                <Grid item xs={12} sm={6}>
                    <TextField
                        label="Last Name"
                        value={lastName}
                        onChange={(e) => onLastNameChange(capitalizeFirstLetter(e.target.value))}
                        fullWidth
                    />
                </Grid>

                <Grid item xs={12} sm={6}>
                    <TextField
                        label="Phone"
                        value={phone}
                        onChange={(e) => onPhoneChange(formatPhoneNumber(e.target.value))}
                        fullWidth
                    />
                </Grid>
                <Grid item xs={12} sm={6}>
                    <TextField
                        label="Email"
                        value={email}
                        onChange={(e) => {
                            onEmailChange(e.target.value);
                            validateEmail(e.target.value);
                        }}
                        error={!!emailError}
                        helperText={emailError}
                        fullWidth
                    />
                </Grid>
            </Grid>

            {/* Address Header */}
            <Typography variant="h6" gutterBottom sx={{ mt: 3 }}>
                Address
            </Typography>
            <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                    <TextField
                        label="Address 1"
                        value={address1}
                        onChange={(e) => onAddress1Change(capitalizeFirstLetter(e.target.value))}
                        fullWidth
                    />
                </Grid>
                <Grid item xs={12} sm={6}>
                    <TextField
                        label="Address 2"
                        value={address2}
                        onChange={(e) => onAddress2Change(capitalizeFirstLetter(e.target.value))}
                        fullWidth
                    />
                </Grid>

                <Grid item xs={12} sm={4}>
                    <TextField
                        label="City"
                        value={city}
                        onChange={(e) => onCityChange(capitalizeFirstLetter(e.target.value))}
                        fullWidth
                    />
                </Grid>
                <Grid item xs={12} sm={4}>
                    <FormControl fullWidth>
                        <InputLabel>State</InputLabel>
                        <Select
                            value={stateValue}
                            label="State"
                            onChange={(e) => onStateChange(e.target.value)}
                        >
                            {US_STATES.map((st) => (
                                <MenuItem key={st} value={st}>
                                    {st}
                                </MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                </Grid>
                <Grid item xs={12} sm={4}>
                    <TextField
                        label="Zip"
                        value={zip}
                        onChange={(e) => onZipChange(e.target.value)}
                        fullWidth
                    />
                </Grid>
            </Grid>

            {/* Notes Header */}
            <Typography variant="h6" gutterBottom sx={{ mt: 3 }}>
                Notes
            </Typography>
            <TextField
                label="Notes"
                value={notes}
                onChange={(e) => onNotesChange(capitalizeFirstLetter(e.target.value))}
                multiline
                rows={3}
                fullWidth
                margin="normal"
            />
        </Box>
    );
}
