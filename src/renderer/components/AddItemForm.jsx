import React, { useState } from 'react';
import { Box, Button, Grid, Typography } from '@mui/material';
import UnifiedDocViewer from './UnifiedDocViewer';


export default function AddItemForm({ onSubmit }) {
    const [filePath, setFilePath] = useState(null);

    const handleFileSelect = async () => {
        const result = await window.electronAPI.dialog.showOpenDialog({
            properties: ['openFile'],
            // filters: [
            //     { name: 'Documents', extensions: ['pdf', 'docx', 'txt', 'png', 'jpg'] },
            // ],
        });

        if (!result.canceled && result.filePaths.length > 0) {
            setFilePath(result.filePaths[0]); // Set the file path
        }
    };

    const handleSubmit = (e) => {
        e.preventDefault();

        if (filePath) {
            const itemData = {
                id: Date.now().toString(),
                type: 'Custom',
                fileName: window.electronAPI.path.basename(filePath), // Use exposed path API
                filePath: filePath,
                dateAdded: new Date().toISOString(),
            };

            onSubmit(itemData);
        }
    };

    return (
        <Box component="form" onSubmit={handleSubmit}>
            <Grid container spacing={2}>
                <Grid item xs={12}>
                    <Typography variant="h6">Upload a File</Typography>
                    <Button onClick={handleFileSelect} variant="contained" color="primary">
                        Select File
                    </Button>
                </Grid>

                {filePath && (
                    <Grid item xs={12}>
                        <Typography variant="subtitle1">Preview:</Typography>
                        <UnifiedDocViewer filePath={filePath} />
                    </Grid>
                )}

            </Grid>
        </Box>
    );
}
