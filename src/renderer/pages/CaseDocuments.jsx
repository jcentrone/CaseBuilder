import React, {useMemo, useState} from 'react';
import {
    Box,
    Button,
    Paper,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    TextField
} from '@mui/material';
import {useOutletContext} from 'react-router-dom';

export default function CaseDocuments() {
    // Pull documents from parent (CaseDetail) via Outlet context
    const {documents} = useOutletContext();

    // Local state for filter text
    const [filter, setFilter] = useState('');

    // Filter logic (case-insensitive match against fileName)
    const filteredDocuments = useMemo(() => {
        if (!documents || documents.length === 0) {
            return [];
        }
        return documents.filter((doc) =>
            doc.fileName.toLowerCase().includes(filter.toLowerCase())
        );
    }, [documents, filter]);

    // Example method to open a document file
    // (adjust to however you actually open files in your app)
    const openDocument = async (filePath) => {
        const result = await window.electronAPI.shell.openPath(filePath);
        if (result) {
            // If result is non-empty, it's an error string
            console.error('Failed to open file:', result);
            alert(`Could not open file:\n${result}`);
        } else {
            console.log('File opened successfully!');
        }
    };

    return (
        <Box>

            {/* Filter text field */}
            <Box display="flex" justifyContent="flex-start" mb={2}>
                <TextField
                    label="Filter by name"
                    value={filter}
                    onChange={(e) => setFilter(e.target.value)}
                    variant="outlined"
                    size="small"
                />
            </Box>

            {/* Table of documents */}
            <TableContainer component={Paper}>
                <Table size="small" aria-label="documents table">
                    <TableHead>
                        <TableRow>
                            <TableCell>Name</TableCell>
                            <TableCell>Date Added</TableCell>
                            <TableCell>Type</TableCell>
                            <TableCell>Action</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {filteredDocuments.map((doc) => (
                            <TableRow key={doc.id}>
                                <TableCell>
                                    {doc.fileName || doc.filePath.split(/[\\/]/).pop()}
                                </TableCell>
                                <TableCell>
                                    {doc.dateAdded
                                        ? new Date(doc.dateAdded).toLocaleDateString('en-US')
                                        : 'N/A'}
                                </TableCell>
                                <TableCell>{doc.type}</TableCell>
                                <TableCell>
                                    <Button size="small" onClick={() => openDocument(doc.filePath)}>
                                        Open
                                    </Button>
                                </TableCell>
                            </TableRow>
                        ))}

                        {/* If the filtered list is empty, display a placeholder row */}
                        {filteredDocuments.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={4} align="center">
                                    No documents found.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </TableContainer>
        </Box>
    );
}
