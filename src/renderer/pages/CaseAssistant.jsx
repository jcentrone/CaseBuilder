// CaseAssistant.jsx
import React, {useEffect, useState} from 'react';
import {useParams} from 'react-router-dom';
import {Box, Button, Divider, Drawer, IconButton, TextField, Typography} from '@mui/material';
import InfoIcon from '@mui/icons-material/Info';
import {openDB} from 'idb';
import {v4 as uuidv4} from 'uuid';
import ChatSidebar from '../components/ChatSidebar';

// IndexedDB Setup & Helper Functions
const dbPromise = openDB('chat-db', 2, {
    upgrade(db) {
        if (!db.objectStoreNames.contains('chatThreads')) {
            const store = db.createObjectStore('chatThreads', {keyPath: 'threadId'});
            store.createIndex('case_id', 'case_id', {unique: false});
        }
    },
});

async function getChatThreadsForCase(caseId) {
    const db = await dbPromise;
    return await db.getAllFromIndex('chatThreads', 'case_id', caseId);
}

async function saveChatThread(thread) {
    const db = await dbPromise;
    await db.put('chatThreads', thread);
}

async function createNewChatThread(caseId) {
    const newThread = {
        threadId: uuidv4(),
        case_id: caseId,
        messages: [],
        createdAt: new Date().toISOString()
    };
    await saveChatThread(newThread);
    return newThread;
}

// Drawer Component for Supporting Docs / Related Chunks
function ChunksDrawer({open, onClose, relatedChunks = []}) {
    return (
        <Drawer
            anchor="right"
            open={open}
            onClose={onClose}
            PaperProps={{sx: {width: 400, top: 65, height: "calc(100% - 65px)", backgroundColor: 'background.paper'}}}
        >
            <Box sx={{p: 2, height: "100%", overflowY: "auto"}}>
                <Typography variant="h6" gutterBottom>Document & Relevant Law</Typography>
                <Divider sx={{mb: 2}}/>
                {relatedChunks.length === 0 ? (
                    <Typography variant="body2">No related chunks available.</Typography>
                ) : (
                    relatedChunks.map((item, index) => (
                        <Box
                            key={index}
                            sx={{mb: 2, p: 1, border: '1px solid', borderColor: 'divider', borderRadius: 1}}
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
                                            sx={{mb: 1, borderLeft: '2px solid', borderColor: 'divider', pl: 1}}
                                        >
                                            <Typography variant="caption">
                                                <strong>Law:</strong> {law.name}
                                            </Typography>
                                            <Typography variant="body2">{law.matched_text}</Typography>
                                        </Box>
                                    ))
                                ) : (
                                    <Typography variant="caption">No relevant law found.</Typography>
                                )}
                            </Box>
                        </Box>
                    ))
                )}
            </Box>
        </Drawer>
    );
}

export default function CaseAssistant() {
    const {clientId} = useParams();
    const [cases, setCases] = useState([]);
    const [selectedCase, setSelectedCase] = useState(null);
    const [chatThreads, setChatThreads] = useState([]);
    const [currentThread, setCurrentThread] = useState(null);
    const [query, setQuery] = useState("");
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);
    const [drawerRelatedChunks, setDrawerRelatedChunks] = useState([]);

    // Load cases on mount.
    useEffect(() => {
        async function fetchCases() {
            try {
                const data = await window.electronAPI.cases.getAll();
                setCases(data || []);
                if (data && data.length > 0 && data[0].id) {
                    const defaultCase = {case_id: data[0].id, client_id: data[0].clientId};
                    setSelectedCase(defaultCase);
                }
            } catch (err) {
                console.error("Error fetching cases:", err);
            }
        }

        fetchCases();
    }, [clientId]);

    // When the selected case changes, load its chat threads.
    useEffect(() => {
        if (selectedCase && selectedCase.case_id) {
            getChatThreadsForCase(selectedCase.case_id).then((threads) => {
                setChatThreads(threads);
                if (threads.length > 0) {
                    setCurrentThread(threads[0]);
                } else {
                    createNewChatThread(selectedCase.case_id).then((newThread) => {
                        setChatThreads([newThread]);
                        setCurrentThread(newThread);
                    });
                }
            });
        }
    }, [selectedCase]);

    // Update current thread in state and IndexedDB.
    const updateCurrentThread = async (updatedThread) => {
        setCurrentThread(updatedThread);
        setChatThreads((prev) =>
            prev.map(thread => (thread.threadId === updatedThread.threadId ? updatedThread : thread))
        );
        await saveChatThread(updatedThread);
    };

    const handleNewThread = async () => {
        if (!selectedCase || !selectedCase.case_id) return null;
        const newThread = await createNewChatThread(selectedCase.case_id);
        setChatThreads(prev => [...prev, newThread]);
        setCurrentThread(newThread);
        return newThread;
    };

    const handleSend = async () => {
        const savedCustomer = localStorage.getItem("customer");
        const customerID = savedCustomer ? JSON.parse(savedCustomer).client_id : null;
        if (!customerID) {
            console.error("No customer_id found in local storage.");
            return;
        }
        if (!selectedCase || !selectedCase.case_id || !selectedCase.client_id) {
            console.error("No valid case selected.");
            return;
        }
        let activeThread = currentThread;
        if (!activeThread) {
            activeThread = await handleNewThread();
            if (!activeThread) return;
        }

        const userMessage = {role: "user", content: query};
        const updatedMessages = [...activeThread.messages, userMessage];
        const updatedThread = {...activeThread, messages: updatedMessages};
        await updateCurrentThread(updatedThread);

        // Prepare payload with the full conversation history.
        const payload = {
            client_id: selectedCase.client_id,
            customer_id: customerID,
            case_id: selectedCase.case_id,
            query: query,
            top_k: 3,
            history: updatedMessages,
        };

        setQuery("");

        try {
            const response = await fetch("http://localhost:8000/query", {
                method: "POST",
                headers: {"Content-Type": "application/json"},
                body: JSON.stringify(payload),
            });
            const data = await response.json();
            const assistantMessage = {
                role: "assistant",
                content: data.final_answer,
                related_chunks: data.related_chunks || [],
            };
            const newMessages = [...updatedMessages, assistantMessage];
            const newThread = {...activeThread, messages: newMessages};
            await updateCurrentThread(newThread);
        } catch (err) {
            console.error("Error querying:", err);
            const errorMsg = {role: "assistant", content: "Sorry, something went wrong."};
            const newMessages = [...updatedMessages, errorMsg];
            const newThread = {...activeThread, messages: newMessages};
            await updateCurrentThread(newThread);
        }
    };

    const renderChatMessages = () => {
        if (!currentThread) return null;
        return currentThread.messages.map((msg, idx) => {
            const isUser = msg.role === "user";
            return (
                <Box key={idx} sx={{display: "flex", flexDirection: isUser ? "row-reverse" : "row", mb: 2}}>
                    <Box
                        sx={{
                            backgroundColor: isUser ? 'rgba(0, 123, 255, 0.3)' : "#2F2F2F",
                            color: isUser ? "#fff" : "#B4B4B4",
                            borderRadius: "12px",
                            padding: "8px 12px",
                            maxWidth: "60%",
                            position: "relative",
                            border: '0px solid',
                            borderColor: 'divider',
                            height: 'fit-content'
                        }}
                    >
                        <Typography variant="body1">{msg.content}</Typography>
                        {msg.role === "assistant" && msg.related_chunks && msg.related_chunks.length > 0 && (
                            <IconButton
                                size="small"
                                sx={{position: "absolute", top: 4, right: -40}}
                                onClick={() => {
                                    setDrawerRelatedChunks(msg.related_chunks);
                                    setIsDrawerOpen(true);
                                }}
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
        <Box sx={{display: "flex"}}>
            <Box sx={{width: 300, flexShrink: 0, position: 'fixed', paddingTop: 3, height: '100%'}}>
                <ChatSidebar
                    cases={cases}
                    chatThreads={chatThreads}
                    currentThread={currentThread}
                    onSelectCase={setSelectedCase}
                    onSelectThread={setCurrentThread}
                    onNewThread={handleNewThread}

                />
            </Box>
            <Box sx={{marginLeft: 40, flex: 1, display: "flex", height: '100vh', paddingTop: '70px !important', flexDirection: "column", p: 2, backgroundColor: 'background.default'}}>
                {/*<Typography variant="h6">Case Assistant</Typography>*/}
                <Box
                    sx={{
                        flex: 1,
                        overflowY: "auto",
                        border: '1px solid',
                        borderColor: 'divider',
                        borderRadius: "4px",
                        p: 2,
                        mt: 2,
                    }}
                >
                    {renderChatMessages()}
                </Box>
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
            <ChunksDrawer
                open={isDrawerOpen}
                onClose={() => setIsDrawerOpen(false)}
                relatedChunks={drawerRelatedChunks}
            />
        </Box>
    );
}
