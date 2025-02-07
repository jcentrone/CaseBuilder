import React, {useEffect, useState} from 'react';
import {useParams} from 'react-router-dom';
import {
  Box,
  Button,
  Divider,
  Drawer,
  FormControl,
  IconButton,
  InputLabel,
  MenuItem,
  Select,
  TextField,
  Typography
} from '@mui/material';
import InfoIcon from '@mui/icons-material/Info';

/**
 * Drawer component to display each supporting chunk with its related law chunks.
 */
function ChunksDrawer({open, onClose, relatedChunks = []}) {
    return (
        <Drawer
            anchor="right"
            open={open}
            onClose={onClose}
            PaperProps={{sx: {width: 400, top: 65, height: "calc(100% - 65px)"}}}
        >
            <Box sx={{p: 2, height: "100%", overflowY: "auto"}}>
                <Typography variant="h6" gutterBottom>
                    Document & Relevant Law
                </Typography>
                <Divider sx={{mb: 2}}/>
                {relatedChunks.length === 0 ? (
                    <Typography variant="body2">No related chunks available.</Typography>
                ) : (
                    relatedChunks.map((item, index) => (
                        <Box
                            key={index}
                            sx={{mb: 2, p: 1, border: "1px solid #ccc", borderRadius: 1}}
                        >
                            <Typography variant="subtitle1">
                                <strong>Document:</strong> {item.supporting_chunk.name}
                            </Typography>
                            <Typography variant="body2">
                                {item.supporting_chunk.matched_text}
                            </Typography>
                            <Box sx={{pl: 2, mt: 1}}>
                                {item.law_chunks && item.law_chunks.length > 0 ? (
                                    item.law_chunks.map((law, idx) => (
                                        <Box
                                            key={idx}
                                            sx={{mb: 1, borderLeft: "2px solid #ccc", pl: 1}}
                                        >
                                            <Typography variant="caption">
                                                <strong>Law:</strong> {law.name}
                                            </Typography>
                                            <Typography variant="body2">
                                                {law.matched_text}
                                            </Typography>
                                        </Box>
                                    ))
                                ) : (
                                    <Typography variant="caption">
                                        No relevant law found.
                                    </Typography>
                                )}
                            </Box>
                        </Box>
                    ))
                )}
            </Box>
        </Drawer>
    );
}

/**
 * Main Case Assistant component.
 */
export default function CaseAssistant() {
    const {clientId} = useParams();
    const [cases, setCases] = useState([]);
    const [selectedCase, setSelectedCase] = useState("");

    // The user's current input for new messages
    const [query, setQuery] = useState("");

    // Conversation history: Each message has role, content, and for assistant messages, related_chunks.
    const [messages, setMessages] = useState([]);

    // State for the drawer that displays related chunks.
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);
    const [drawerRelatedChunks, setDrawerRelatedChunks] = useState([]);

    useEffect(() => {
        async function fetchCases() {
            try {
                const data = await window.electronAPI.cases.getAll();
                setCases(data || []);

                // If there's at least one case, set it as the default selected.
                if (data && data.length > 0 && data[0].id) {
                    setSelectedCase({
                        case_id: data[0].id,
                        client_id: data[0].clientId,
                    });
                }
            } catch (err) {
                console.error("Error fetching cases:", err);
            }
        }

        fetchCases();
    }, [clientId]);

    /**
     * Handler to send a query.
     */
    const handleSend = async () => {
        // Ensure customer information is available.
        const savedCustomer = localStorage.getItem("customer");
        const customerID = savedCustomer ? JSON.parse(savedCustomer).client_id : null;

        if (!customerID) {
            console.error("No customer_id found in local storage. Please ensure customer settings have been saved.");
            return;
        }

        if (!selectedCase || !selectedCase.case_id || !selectedCase.client_id) {
            console.error("No valid case selected. Please select a case.");
            return;
        }

        // Add the user message to conversation history.
        const userMessage = {
            role: "user",
            content: query,
        };
        setMessages((prev) => [...prev, userMessage]);

        // Prepare payload for the backend RAG endpoint.
        const payload = {
            client_id: selectedCase.client_id,
            customer_id: customerID,
            case_id: selectedCase.case_id,
            query: query,
            top_k: 3,
        };

        // Clear the input field.
        setQuery("");

        try {
            // Call the backend query endpoint.
            const response = await fetch("http://localhost:8000/query", {
                method: "POST",
                headers: {"Content-Type": "application/json"},
                body: JSON.stringify(payload),
            });
            const data = await response.json();

            // Add assistant message to conversation history,
            // including the related_chunks from the response.
            const assistantMessage = {
                role: "assistant",
                content: data.final_answer,
                related_chunks: data.related_chunks || []
            };
            setMessages((prev) => [...prev, assistantMessage]);
        } catch (err) {
            console.error("Error querying:", err);
            setMessages((prev) => [
                ...prev,
                {role: "assistant", content: "Sorry, something went wrong."}
            ]);
        }
    };

    /**
     * Opens the drawer with the related chunks from an assistant message.
     */
    const handleShowRelatedChunks = (relatedChunks) => {
        setDrawerRelatedChunks(relatedChunks);
        setIsDrawerOpen(true);
    };

    /**
     * Renders chat messages as styled chat bubbles.
     */
    const renderChatMessages = () => {
        return messages.map((msg, idx) => {
            const isUser = msg.role === "user";
            return (
                <Box
                    key={idx}
                    sx={{
                        display: "flex",
                        flexDirection: isUser ? "row-reverse" : "row",
                        mb: 2,
                    }}
                >
                    <Box
                        sx={{
                            backgroundColor: isUser ? "#1976d2" : "#e0e0e0",
                            color: isUser ? "#fff" : "#000",
                            borderRadius: "12px",
                            padding: "8px 12px",
                            maxWidth: "70%",
                            position: "relative"
                        }}
                    >
                        <Typography variant="body1">{msg.content}</Typography>
                        {/* For assistant messages with related chunks, show an info icon */}
                        {msg.role === "assistant" && msg.related_chunks && msg.related_chunks.length > 0 && (
                            <IconButton
                                size="small"
                                sx={{position: "absolute", top: 4, right: -40}}
                                onClick={() => handleShowRelatedChunks(msg.related_chunks)}
                            >
                                <InfoIcon fontSize="small"/>
                            </IconButton>
                        )}
                    </Box>
                </Box>
            );
        });
    };

    return (
        <Box sx={{display: "flex", width: "100%", height: "100%", p: 3}}>
            {/* Main content area */}
            <Box sx={{flex: 1, display: "flex", flexDirection: "column", p: 2}}>
                <Typography variant="h6">Case Assistant</Typography>

                {/* Case selection */}
                <Box sx={{mt: 2, display: "flex", alignItems: "center"}}>
                    <FormControl sx={{minWidth: 200, mr: 2}}>
                        <InputLabel id="case-select-label">Select Case</InputLabel>
                        <Select
                            labelId="case-select-label"
                            value={selectedCase?.case_id || ""}
                            label="Select Case"
                            onChange={(e) => {
                                const selected = cases.find((c) => c.id === e.target.value);
                                if (selected) {
                                    setSelectedCase({
                                        case_id: selected.id,
                                        client_id: selected.clientId,
                                    });
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
                </Box>

                {/* Chat area */}
                <Box
                    sx={{
                        flex: 1,
                        overflowY: "auto",
                        display: "flex",
                        flexDirection: "column",
                        mt: 2,
                        border: "1px solid #ccc",
                        borderRadius: "4px",
                        p: 2,
                    }}
                >
                    {renderChatMessages()}
                </Box>

                {/* Input area */}
                <Box sx={{mt: 2, display: "flex"}}>
                    <TextField
                        label="Ask about this case..."
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        sx={{flex: 1, mr: 2}}
                        onKeyDown={(e) => {
                            if (e.key === "Enter" && !e.shiftKey) {
                                e.preventDefault();
                                handleSend();
                            }
                        }}
                    />
                    <Button variant="contained" onClick={handleSend}>
                        Send
                    </Button>
                </Box>
            </Box>

            {/* Drawer for displaying related supporting chunks and law chunks */}
            <ChunksDrawer
                open={isDrawerOpen}
                onClose={() => setIsDrawerOpen(false)}
                relatedChunks={drawerRelatedChunks}
            />
        </Box>
    );
}
