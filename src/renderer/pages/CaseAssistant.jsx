// src/renderer/pages/CaseAssistant.jsx
import React, {useEffect, useState} from 'react';
import {useParams} from 'react-router-dom';
import {Box, Button, FormControl, InputLabel, MenuItem, Select, TextField, Typography} from '@mui/material';

export default function CaseAssistant() {
    const {clientId} = useParams(); // Assuming clientId is available in your URL or context
    const [cases, setCases] = useState([]);
    const [selectedCase, setSelectedCase] = useState("");
    const [query, setQuery] = useState("");
    const [answerData, setAnswerData] = useState(null);

    // Fetch cases on mount
    useEffect(() => {
        async function fetchCases() {
            try {
                const data = await window.electronAPI.cases.getAll();
                // Ensure data is an array and set it
                setCases(data || []);

                // Only update selectedCase if a valid case_id is present
                if (data && data.length > 0 && data[0].id) {
                    setSelectedCase(data[0].id);
                } else {
                    setSelectedCase(""); // fallback
                }
            } catch (err) {
                console.error("Error fetching cases:", err);
            }
        }

        fetchCases();
    }, [clientId]);

    const handleAsk = async () => {
        const savedCustomer = localStorage.getItem("customer");
        const customerID = savedCustomer ? JSON.parse(savedCustomer).client_id : null;

        if (!customerID) {
            console.error("No customer_id found in local storage. Please ensure customer settings have been saved.");
            return;
        }

        if (!selectedCase || !selectedCase.case_id || !selectedCase.client_id) {
            console.error("No case selected or missing client_id.");
            return;
        }

        try {
            const payload = {
                client_id: selectedCase.client_id, // Now stored with the case selection
                customer_id: customerID,
                case_id: selectedCase.case_id,
                query: query,
                top_k: 3,
            };

            const response = await fetch("http://localhost:8000/query", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(payload),
            });

            const data = await response.json();
            setAnswerData(data);
        } catch (err) {
            console.error("Error querying:", err);
        }
    };


    return (
        <Box>
            <Typography variant="h6">Case Assistant</Typography>
            <Box sx={{mt: 2}}>
                <FormControl sx={{minWidth: 200, mr: 2}}>
                    <InputLabel id="case-select-label">Select Case</InputLabel>
                    <Select
                        labelId="case-select-label"
                        value={selectedCase?.case_id || ""} // Always provide a defined value
                        label="Select Case"
                        onChange={(e) => {
                            const selected = cases.find((c) => c.id === e.target.value);
                            if (selected) {
                                setSelectedCase({case_id: selected.id, client_id: selected.clientId});
                            }
                        }}
                    >
                        {cases.map((c) => (
                            <MenuItem key={c.id} value={c.id}>
                                {c.caseName}
                            </MenuItem>
                        ))}
                    </Select>
                </FormControl>

                <TextField
                    label="Ask about this case..."
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    sx={{mr: 2}}
                />
                <Button variant="contained" onClick={handleAsk}>
                    Ask
                </Button>
            </Box>
            {answerData && (
                <Box sx={{mt: 2}}>
                    <Typography variant="body1">
                        <strong>Answer:</strong> {answerData.final_answer}
                    </Typography>
                    <Box sx={{mt: 1}}>
                        <Typography variant="subtitle2">Supporting Chunks:</Typography>
                        {answerData.supporting_chunks.map((chunk) => (
                            <Box key={chunk.document_id} sx={{mb: 1, p: 1, border: "1px solid #ccc"}}>
                                <Typography variant="body2">
                                    <em>Document:</em> {chunk.document_id}
                                </Typography>
                                <Typography variant="body2">
                                    <em>Score:</em> {chunk.similarity_score.toFixed(3)}
                                </Typography>
                                <Typography variant="body2">{chunk.matched_text}</Typography>
                            </Box>
                        ))}
                    </Box>
                </Box>
            )}
        </Box>
    );
}
