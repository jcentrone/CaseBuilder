import React, {useEffect, useState} from 'react';
import {useParams} from 'react-router-dom';
import {
    Box,
    Button,
    FormControl,
    InputLabel,
    MenuItem,
    Select,
    TextField,
    Typography,
    IconButton,
    Drawer,
    Divider
} from '@mui/material';
import InfoIcon from '@mui/icons-material/Info';

export default function CaseAssistant() {
    const {clientId} = useParams();
    const [cases, setCases] = useState([]);
    const [selectedCase, setSelectedCase] = useState("");

    // The user's current input for new messages
    const [query, setQuery] = useState("");

    // A running history of all messages in the conversation
    // Each message has: { role: "user"|"assistant", content: string, supportingChunks?: array }
    const [messages, setMessages] = useState([]);

    // For the sidebar/drawer that displays supporting chunks
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);
    const [selectedChunks, setSelectedChunks] = useState([]);

    useEffect(() => {
        async function fetchCases() {
            try {
                const data = await window.electronAPI.cases.getAll();
                setCases(data || []);

                // If there's at least one case, set it as the default selected
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
     * Handler when the user clicks "Send" or "Ask"
     */
    const handleSend = async () => {
        // Make sure we have a customer_id
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

        // 1) Add the user message to the chat history
        const userMessage = {
            role: "user",
            content: query,
        };
        setMessages((prev) => [...prev, userMessage]);

        // 2) Prepare the payload for the backend RAG endpoint
        const payload = {
            client_id: selectedCase.client_id,
            customer_id: customerID,
            case_id: selectedCase.case_id,
            query: query,
            top_k: 3,
        };

        // Clear the input field immediately (optional)
        setQuery("");

        try {
            // 3) Call the backend for an answer
            const response = await fetch("http://localhost:8000/query", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(payload),
            });

            const data = await response.json();

            // 4) Add the assistant message to the chat history
            const assistantMessage = {
                role: "assistant",
                content: data.final_answer,
                supportingChunks: data.supporting_chunks || []
            };
            setMessages((prev) => [...prev, assistantMessage]);
        } catch (err) {
            console.error("Error querying:", err);
            // Optionally add an error assistant message
            setMessages((prev) => [
                ...prev,
                {role: "assistant", content: "Sorry, something went wrong."}
            ]);
        }
    };

    /**
     * Opens the drawer and sets the supporting chunks to display.
     */
    const handleShowSupportingChunks = (chunks) => {
        setSelectedChunks(chunks);
        setIsDrawerOpen(true);
    };

    /**
     * Renders the chat bubbles for each message in the `messages` array.
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
                        {/* If it's an assistant message with supporting chunks, show an icon */}
                        {msg.role === "assistant" && msg.supportingChunks && msg.supportingChunks.length > 0 && (
                            <IconButton
                                size="small"
                                sx={{position: "absolute", top: 4, right: -40}}
                                onClick={() => handleShowSupportingChunks(msg.supportingChunks)}
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
        <Box sx={{display: "flex", width: "100%", height: "100%"}}>
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
                                        client_id: selected.clientId
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

                {/* Input area to send new messages */}
                <Box sx={{mt: 2, display: "flex"}}>
                    <TextField
                        label="Ask about this case..."
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        sx={{flex: 1, mr: 2}}
                        onKeyDown={(e) => {
                            // Optional: Send message on Enter
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

            {/* Drawer for supporting chunks on the right side */}
            <Drawer
                anchor="right"
                open={isDrawerOpen}
                onClose={() => setIsDrawerOpen(false)}
                PaperProps={{sx: {width: 400}}}
            >
                <Box sx={{p: 2, height: "100%"}}>
                    <Typography variant="h6" gutterBottom>
                        Supporting Documents
                    </Typography>
                    <Divider sx={{mb: 2}}/>
                    {selectedChunks.length > 0 ? (
                        selectedChunks.map((chunk, index) => (
                            <Box
                                key={index}
                                sx={{mb: 2, p: 1, border: "1px solid #ccc", borderRadius: 1}}
                            >
                                <Typography variant="body2">
                                    <strong>Document:</strong> {chunk.document_id}
                                </Typography>
                                <Typography variant="body2">
                                    <strong>Score:</strong>{" "}
                                    {chunk.similarity_score?.toFixed
                                        ? chunk.similarity_score.toFixed(3)
                                        : chunk.similarity_score}
                                </Typography>
                                <Typography variant="body2" sx={{mt: 1}}>
                                    {chunk.matched_text}
                                </Typography>
                            </Box>
                        ))
                    ) : (
                        <Typography variant="body2">No supporting chunks.</Typography>
                    )}
                </Box>
            </Drawer>
        </Box>
    );
}
