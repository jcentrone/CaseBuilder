import React, {useEffect, useState} from 'react';
import {Box, Button, Dialog, DialogContent, DialogTitle, IconButton, Typography} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';

function LawChunkModal({open, onClose, chunkId, sectionTitle}) {
    const [chunkData, setChunkData] = useState(null);
    const [error, setError] = useState('');

    useEffect(() => {
        if (open && chunkId) {
            fetch(`http://localhost:8000/api/law-chunks/${chunkId}`)
                .then((res) => {
                    if (!res.ok) {
                        throw new Error("Failed to load chunk data");
                    }
                    return res.json();
                })
                .then((data) => {
                    setChunkData(data);
                    setError('');
                })
                .catch((err) => {
                    console.error("Error fetching law chunk:", err);
                    setError("Error loading chunk data");
                });
        }
    }, [open, chunkId]);

    return (
        <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
            <DialogTitle>
                {chunkData ? chunkData.section_title : sectionTitle || "Law Detail"}
                <IconButton
                    aria-label="close"
                    onClick={onClose}
                    sx={{position: 'absolute', right: 8, top: 8}}
                >
                    <CloseIcon/>
                </IconButton>
            </DialogTitle>
            <DialogContent dividers>
                {error && <Typography color="error">{error}</Typography>}
                {chunkData ? (
                    <>
                        <Box mb={2}>
                            <Typography variant="subtitle1">
                                {chunkData.title_label} &mdash; Chapter {chunkData.chapter_number} &mdash; Section {chunkData.section_number}
                            </Typography>
                            <Typography variant="subtitle2" color="text.secondary">
                                {chunkData.section_title}
                            </Typography>
                        </Box>
                        <Typography variant="body1" sx={{whiteSpace: 'pre-wrap', mb: 2}}>
                            {chunkData.text}
                        </Typography>
                        {chunkData.relative_link && (
                            <Button
                                variant="outlined"
                                color="primary"
                                href={chunkData.relative_link}
                                target="_blank"
                                rel="noopener noreferrer"
                            >
                                View Full Law
                            </Button>
                        )}
                    </>
                ) : (
                    <Typography>Loading...</Typography>
                )}
            </DialogContent>
        </Dialog>
    );
}

export default LawChunkModal;
