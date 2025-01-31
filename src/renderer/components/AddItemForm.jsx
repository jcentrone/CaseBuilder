import React, {useState} from 'react';
import {Box, Button, FormControl, Grid, InputLabel, MenuItem, Select, Typography} from '@mui/material';
import UnifiedDocViewer from './UnifiedDocViewer';

export default function AddItemForm({onSubmit, collectFormDataRef}) {
    const [filePath, setFilePath] = useState(null);
    const [fileCategory, setFileCategory] = useState('Document'); // default

    const handleFileSelect = async () => {
        const result = await window.electronAPI.dialog.showOpenDialog({
            properties: ['openFile'],
            filters: [
                {name: 'All Files', extensions: ['*']},
                {name: 'Documents', extensions: ['doc', 'docx', 'pdf', 'txt']},
                {name: 'Presentations', extensions: ['pptx']},
                {name: 'Spreadsheets', extensions: ['xls', 'xlsx']},
                {name: 'Images', extensions: ['jpg', 'jpeg', 'png', 'gif']},
                {name: 'Videos', extensions: ['mp4', 'avi', 'mkv']},
                {name: 'Audio', extensions: ['mp3', 'wav', 'ogg']},
            ],
        });

        if (!result.canceled && result.filePaths.length > 0) {
            setFilePath(result.filePaths[0]);
        }
    };

    React.useImperativeHandle(collectFormDataRef, () => ({
        getData: () => ({
            documentId: crypto.randomUUID(),
            category: fileCategory,
            fileName: window.electronAPI.path.basename(filePath),
            filePath: filePath,
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
