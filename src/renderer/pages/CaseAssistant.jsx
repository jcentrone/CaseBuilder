// src/renderer/pages/CaseAssistant.jsx
import React, {useState} from 'react'
import {useParams} from 'react-router-dom'
import {Box, Button, TextField, Typography} from '@mui/material'

export default function CaseAssistant() {
    const {caseId} = useParams()
    const [query, setQuery] = useState('')
    const [answer, setAnswer] = useState('')

    const handleAsk = () => {
        // RAG or AI logic referencing only this case
        setAnswer(`Pretend AI Answer for case ${caseId}: for query "${query}"`)
    }

    return (
        <Box>
            <Typography variant="h6">Assistant for Case: {caseId}</Typography>
            <Box sx={{mt: 2}}>
                <TextField
                    label="Ask about this case..."
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    sx={{mr: 2}}
                />
                <Button variant="contained" onClick={handleAsk}>Ask</Button>
            </Box>
            {answer && (
                <Typography variant="body2" sx={{mt: 2}}>
                    {answer}
                </Typography>
            )}
        </Box>
    )
}
