import React, {useEffect, useState} from 'react';
import {useParams} from 'react-router-dom';
import {Box, Button, Divider, Drawer, IconButton, TextField, Typography} from '@mui/material';
import InfoIcon from '@mui/icons-material/Info';
import {openDB} from 'idb';
import {v4 as uuidv4} from 'uuid';
import ChatSidebar from '../components/ChatSidebar';

// 1) IDB Setup
const dbPromise = openDB('chat-db', 3, {
    upgrade(db) {
        if (!db.objectStoreNames.contains('chatThreads')) {
            const store = db.createObjectStore('chatThreads', {keyPath: 'threadId'});
            store.createIndex('case_id', 'case_id', {unique: false});
            // If needed, you can do migrations here for new fields
        }
    }
});

async function getChatThreadsForCase(caseId) {
    const db = await dbPromise;
    return db.getAllFromIndex('chatThreads', 'case_id', caseId);
}

async function saveChatThread(thread) {
    const db = await dbPromise;
    return db.put('chatThreads', thread);
}

// New: Delete thread from IDB
async function deleteChatThread(threadId) {
    const db = await dbPromise;
    return db.delete('chatThreads', threadId);
}

async function createNewChatThread(caseId) {
    const newThread = {
        threadId: uuidv4(),
        case_id: caseId,
        title: "", // or some default like "Thread <timestamp>"
        messages: [],
        createdAt: new Date().toISOString()
    };
    await saveChatThread(newThread);
    return newThread;
}

// Drawer for chunk data
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
                    Document &amp; Relevant Law
                </Typography>
                <Divider sx={{mb: 2}}/>
                {relatedChunks.length === 0 ? (
                    <Typography variant="body2">No related chunks available.</Typography>
                ) : (
                    relatedChunks.map((item, index) => (
                        <Box
                            key={index}
                            sx={{
                                mb: 2,
                                p: 1,
                                border: "1px solid #ccc",
                                borderRadius: 1
                            }}
                        >
                            <Typography variant="subtitle1">
                                <strong>Document:</strong> {item.supporting_chunk.name}
                            </Typography>
                            <Typography variant="body2">
                                {item.supporting_chunk.matched_text}
                            </Typography>
                            <Box sx={{pl: 2, mt: 1}}>
                                {item.law_chunks && item.law_chunks.length > 0 ? (
                                    item.law_chunks.map((law, idx2) => (
                                        <Box
                                            key={idx2}
                                            sx={{mb: 1, borderLeft: "2px solid #ccc", pl: 1}}
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

    // Load Cases
    useEffect(() => {
        (async () => {
            try {
                const data = await window.electronAPI.cases.getAll();
                setCases(data || []);
                if (data?.length > 0) {
                    const defaultCase = {
                        case_id: data[0].id,
                        client_id: data[0].clientId
                    };
                    setSelectedCase(defaultCase);
                }
            } catch (err) {
                console.error("Error fetching cases:", err);
            }
        })();
    }, [clientId]);

    // Load threads for the selectedCase
    useEffect(() => {
        (async () => {
            if (selectedCase?.case_id) {
                const threads = await getChatThreadsForCase(selectedCase.case_id);
                setChatThreads(threads);
                if (threads.length > 0) {
                    // pick the newest or first
                    setCurrentThread(threads[0]);
                } else {
                    // create a new one
                    const newThread = await createNewChatThread(selectedCase.case_id);
                    setChatThreads([newThread]);
                    setCurrentThread(newThread);
                }
            }
        })();
    }, [selectedCase]);

    // Update thread in IDB and local state
    const updateCurrentThread = async (thread) => {
        await saveChatThread(thread);
        setChatThreads((prev) =>
            prev.map((t) => (t.threadId === thread.threadId ? thread : t))
        );
        setCurrentThread(thread);
    };

    // Create new thread
    const handleNewThread = async () => {
        if (!selectedCase) return;
        const newThread = await createNewChatThread(selectedCase.case_id);
        setChatThreads((prev) => [newThread, ...prev]); // put new at top
        setCurrentThread(newThread);
        return newThread;
    };

    // Delete a thread
    const handleDeleteThread = async (thread) => {
        await deleteChatThread(thread.threadId);
        setChatThreads((prev) => prev.filter((t) => t.threadId !== thread.threadId));
        // If we delete the current, pick another or null
        if (currentThread?.threadId === thread.threadId) {
            if (chatThreads.length > 1) {
                // pick the next
                setCurrentThread(chatThreads.find((t) => t.threadId !== thread.threadId) || null);
            } else {
                setCurrentThread(null);
            }
        }
    };

    // Rename a thread
    const handleRenameThread = async (thread, newTitle) => {
        const updated = {...thread, title: newTitle};
        await updateCurrentThread(updated);
    };

    // Send message
    const handleSend = async () => {
        if (!selectedCase?.case_id || !selectedCase?.client_id) {
            console.error("No valid case selected.");
            return;
        }

        const savedCustomer = localStorage.getItem("customer");
        const customerID = savedCustomer ? JSON.parse(savedCustomer).client_id : "unknown";

        let activeThread = currentThread;
        if (!activeThread) {
            activeThread = await handleNewThread();
            if (!activeThread) return;
        }

        const userMessage = {role: "user", content: query};
        const updatedMessages = [...(activeThread.messages || []), userMessage];
        const updatedThread = {...activeThread, messages: updatedMessages};

        await updateCurrentThread(updatedThread);
        setQuery("");

        // sanitize
        const sanitizedHistory = updatedMessages.map((m) => ({
            role: m.role,
            content: m.content
        }));

        const payload = {
            client_id: selectedCase.client_id,
            customer_id: customerID,
            case_id: selectedCase.case_id,
            query,
            top_k: 3,
            history: sanitizedHistory
        };

        try {
            const resp = await fetch("http://localhost:8000/query", {
                method: "POST",
                headers: {"Content-Type": "application/json"},
                body: JSON.stringify(payload)
            });
            const data = await resp.json();

            const assistantMessage = {
                role: "assistant",
                content: data.final_answer,
                related_chunks: data.related_chunks || []
            };
            const newMessages = [...updatedMessages, assistantMessage];
            const newThread2 = {...updatedThread, messages: newMessages};
            await updateCurrentThread(newThread2);
        } catch (err) {
            console.error("Error querying:", err);
            // Optionally add an error message
        }
    };

    // Render chat
    const renderChatMessages = () => {
        if (!currentThread) return null;
        return currentThread.messages?.map((msg, idx) => {
            const isUser = msg.role === "user";
            return (
                <Box
                    key={idx}
                    sx={{display: "flex", flexDirection: isUser ? "row-reverse" : "row", mb: 2}}
                >
                    <Box
                        sx={{
                            backgroundColor: isUser ? "rgba(0, 123, 255, 0.3)" : "#2F2F2F",
                            color: isUser ? "#fff" : "#B4B4B4",
                            borderRadius: "12px",
                            padding: "8px 12px",
                            maxWidth: "60%",
                            position: "relative",
                            mb: 1
                        }}
                    >
                        <Typography variant="body1">{msg.content}</Typography>

                        {/* If assistant + has chunk data, show icon */}
                        {msg.role === "assistant" && msg.related_chunks?.length > 0 && (
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
            {/* Left sidebar */}
            <Box sx={{width: 300, flexShrink: 0, position: "fixed", paddingTop: 3, height: "100%"}}>
                <ChatSidebar
                    cases={cases}
                    chatThreads={chatThreads}
                    currentThread={currentThread}
                    onSelectCase={setSelectedCase}
                    onSelectThread={setCurrentThread}
                    onNewThread={handleNewThread}
                    onDeleteThread={handleDeleteThread}
                    onRenameThread={handleRenameThread}
                />
            </Box>

            {/* Main Chat area */}
            <Box
                sx={{
                    marginLeft: 40,
                    flex: 1,
                    display: "flex",
                    height: "100vh",
                    paddingTop: "70px !important",
                    flexDirection: "column",
                    p: 2,
                    backgroundColor: "background.default"
                }}
            >
                <Box
                    sx={{
                        flex: 1,
                        overflowY: "auto",
                        border: "1px solid",
                        borderColor: "divider",
                        borderRadius: "4px",
                        p: 2,
                        mt: 2
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

            {/* Drawer for chunk data */}
            <ChunksDrawer
                open={isDrawerOpen}
                onClose={() => setIsDrawerOpen(false)}
                relatedChunks={drawerRelatedChunks}
            />
        </Box>
    );
}
