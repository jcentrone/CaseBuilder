import React, {useEffect, useState} from 'react'
import {Box, Button, List, ListItem, ListItemText, TextField} from '@mui/material'


export default function CaseDocuments({caseId}) {
    const [documents, setDocuments] = useState([])
    const [filter, setFilter] = useState('')

    useEffect(() => {
        // Fetch documents for the given caseId from the database
        fetchDocuments(caseId)
    }, [caseId])

    const fetchDocuments = async (caseId) => {
        try {
            const documents = await window.electronAPI.documents.getByCase(caseId)

            // const documents = await window.api.invoke('documents:getByCase', caseId)
            setDocuments(documents || [])
        } catch (error) {
            console.error('Error fetching documents:', error)
        }
    }


    const handleFilterChange = (e) => setFilter(e.target.value)

    const filteredDocuments = documents.filter((doc) =>
        doc.filePath.toLowerCase().includes(filter.toLowerCase())
    )

    return (
        <Box>
            <Box display="flex" justifyContent="space-between" mb={2}>
                <TextField
                    label="Filter by name"
                    value={filter}
                    onChange={handleFilterChange}
                    variant="outlined"
                    size="small"
                />

            </Box>

            <List>
                {filteredDocuments.map((doc) => (
                    <ListItem
                        button
                        key={doc.id}
                        onClick={() => window.electron.shell.openPath(doc.filePath)} // Open document for preview
                    >
                        <ListItemText primary={doc.filePath.split('/').pop()} secondary={doc.dateAdded}/>
                    </ListItem>
                ))}
            </List>
        </Box>
    )
}


