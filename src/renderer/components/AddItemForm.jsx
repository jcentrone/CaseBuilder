import React, {useState} from 'react';
import {Box, Button, FormControl, Grid, InputLabel, MenuItem, Select, Typography} from '@mui/material';
import UnifiedDocViewer from './UnifiedDocViewer';

export default function AddItemForm({onSubmit, collectFormDataRef}) {
    const [filePath, setFilePath] = useState(null);
    const [fileCategory, setFileCategory] = useState('Document'); // default

    const handleFileSelect = async () => {
        const result = await window.electronAPI.dialog.showOpenDialog({
            properties: ['openFile'],
            // filters: [
            //     { name: 'Documents', extensions: ['pdf', 'docx', 'txt', 'png', 'jpg'] },
            // ],
        });

        if (!result.canceled && result.filePaths.length > 0) {
            setFilePath(result.filePaths[0]);
        }
    };

    const handleSubmit = (e) => {
        e.preventDefault();

        if (filePath) {
            const itemData = {
                id: Date.now().toString(),
                // Here we carry the category "Document" or "Evidence"
                category: fileCategory,
                fileName: window.electronAPI.path.basename(filePath),
                filePath: filePath,
                dateAdded: new Date().toISOString(),
            };

            onSubmit(itemData);
        }
    };

    React.useImperativeHandle(collectFormDataRef, () => ({
        getData: () => ({
            id: Date.now().toString(),
            category: fileCategory,
            fileName: window.electronAPI.path.basename(filePath),
            filePath,
            dateAdded: new Date().toISOString(),
        }),
    }));

    return (
        <Box component="form">
            <Grid container spacing={2}>
                <Grid item xs={12}>
                    <Typography variant="h6">Upload a File</Typography>

                    {/* Category dropdown */}
                    <FormControl fullWidth sx={{my: 2}}>
                        <InputLabel id="file-type-label">Type</InputLabel>
                        <Select
                            labelId="file-type-label"
                            id="file-type"
                            value={fileCategory}
                            label="Type"
                            onChange={(e) => setFileCategory(e.target.value)}
                        >
                            <MenuItem value="Document">Document</MenuItem>
                            <MenuItem value="Evidence">Evidence</MenuItem>
                        </Select>
                    </FormControl>

                    <Button onClick={handleFileSelect} variant="contained" color="primary">
                        Select File
                    </Button>
                </Grid>

                {filePath && (
                    <Grid item xs={12}>
                        <Typography variant="subtitle1">Preview:</Typography>
                        <UnifiedDocViewer filePath={filePath}/>
                    </Grid>
                )}
            </Grid>
        </Box>
    );
}
