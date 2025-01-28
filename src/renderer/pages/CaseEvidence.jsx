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

export default function CaseEvidence() {
    // Pull evidence from parent (CaseDetail) via Outlet context
    const {evidence} = useOutletContext();

    // Local state for filter text
    const [filter, setFilter] = useState('');

    // Filter logic (case-insensitive match against fileName)
    const filteredEvidence = useMemo(() => {
        if (!evidence || evidence.length === 0) {
            return [];
        }
        return evidence.filter((ev) =>
            ev.fileName.toLowerCase().includes(filter.toLowerCase())
        );
    }, [evidence, filter]);

    // Example method to open an evidence file
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

            {/* Table of evidence */}
            <TableContainer component={Paper}>
                <Table size="small" aria-label="evidence table">
                    <TableHead>
                        <TableRow>
                            <TableCell>Name</TableCell>
                            <TableCell>Date Added</TableCell>
                            <TableCell>Type</TableCell>
                            <TableCell>Action</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {filteredEvidence.map((ev) => (
                            <TableRow key={ev.id}>
                                <TableCell>
                                    {ev.fileName || ev.filePath.split(/[\\/]/).pop()}
                                </TableCell>
                                <TableCell>
                                    {ev.dateAdded
                                        ? new Date(ev.dateAdded).toLocaleDateString('en-US')
                                        : 'N/A'}
                                </TableCell>
                                <TableCell>{ev.type}</TableCell>
                                <TableCell>
                                    <Button size="small" onClick={() => openDocument(ev.filePath)}>
                                        Open
                                    </Button>
                                </TableCell>
                            </TableRow>
                        ))}

                        {/* If the filtered list is empty, display a placeholder row */}
                        {filteredEvidence.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={4} align="center">
                                    No evidence found.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </TableContainer>
        </Box>
    );
}
