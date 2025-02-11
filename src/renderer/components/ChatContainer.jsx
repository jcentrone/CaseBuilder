import React, {useEffect, useRef, useState} from 'react';
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

async function deleteChatThread(threadId) {
    const db = await dbPromise;
    return db.delete('chatThreads', threadId);
}


async function createNewChatThread(caseId) {
    const newThread = {
        threadId: uuidv4(),
        case_id: caseId,
        title: "",
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
                    Document & Relevant Law
                </Typography>
                <Divider sx={{mb: 2}}/>
                {relatedChunks.length === 0 ? (
                    <Typography variant="body2">No related chunks available.</Typography>
                ) : (
                    relatedChunks.map((item, index) => (
                        <Box key={index} sx={{mb: 2, p: 1, border: "1px solid #ccc", borderRadius: 1}}>
                            <Typography variant="subtitle1">
                                <strong>Document:</strong> {item.supporting_chunk.name}
                            </Typography>
                            <Typography variant="body2">{item.supporting_chunk.matched_text}</Typography>
                            <Box sx={{pl: 2, mt: 1}}>
                                {item.law_chunks?.length > 0 ? (
                                    item.law_chunks.map((law, idx2) => (
                                        <Box key={idx2} sx={{mb: 1, borderLeft: "2px solid #ccc", pl: 1}}>
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
    const {clientId, caseId, chatId} = useParams();
    const [cases, setCases] = useState([]);
    const [selectedCase, setSelectedCase] = useState(null);
    const [chatThreads, setChatThreads] = useState([]);
    const [currentThread, setCurrentThread] = useState(null);
    const [query, setQuery] = useState("");
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);
    const [drawerRelatedChunks, setDrawerRelatedChunks] = useState([]);
    const [eventSource, setEventSource] = useState(null);
    const [intermediateMessage, setIntermediateMessage] = useState("");
    const messagesContainerRef = useRef(null);


    useEffect(() => {
        if (chatId) {
            (async () => {
                const db = await dbPromise;
                const thread = await db.get("chatThreads", chatId);
                if (thread) {
                    setCurrentThread(thread);
                }
            })();
        }
    }, [chatId]);


    // Load Cases
    useEffect(() => {
        (async () => {
            try {
                const data = await window.electronAPI.cases.getAll();
                setCases(data || []);
                if (data?.length > 0) {
                    setSelectedCase({case_id: data[0].id, client_id: data[0].clientId});
                }
            } catch (err) {
                console.error("Error fetching cases:", err);
            }
        })();
    }, [clientId]);

    // Load threads for the selected case
    useEffect(() => {
        (async () => {
            if (selectedCase?.case_id) {
                const threads = await getChatThreadsForCase(selectedCase.case_id);
                setChatThreads(threads);
                setCurrentThread(threads.length > 0 ? threads[0] : await createNewChatThread(selectedCase.case_id));
            }
        })();
    }, [selectedCase]);

    // For Messsage scrolling
    useEffect(() => {
        // whenever messages change OR the intermediate message changes, scroll down
        scrollToBottom();
    }, [currentThread?.messages, intermediateMessage]);

    const scrollToBottom = () => {
        if (messagesContainerRef.current) {
            messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
        }
    };

    const handleDeleteThread = async (thread) => {
        await deleteChatThread(thread.threadId);

        setChatThreads((prevThreads) => prevThreads.filter((t) => t.threadId !== thread.threadId));

        // If the deleted thread was the current one, switch to another or clear
        if (currentThread?.threadId === thread.threadId) {
            setCurrentThread(chatThreads.length > 1 ? chatThreads.find((t) => t.threadId !== thread.threadId) : null);
        }
    };


    const handleNewThread = async () => {
        if (!selectedCase) return;

        const newThread = await createNewChatThread(selectedCase.case_id);

        setChatThreads((prevThreads) => [newThread, ...prevThreads]); // Add new thread to state
        setCurrentThread(newThread); // Set the new thread as active

        await saveChatThread(newThread); // Save to IndexedDB
    };


    const handleRenameThread = async (thread, newTitle) => {
        const updatedThread = {...thread, title: newTitle};

        // ✅ Save updated chat thread to IndexedDB
        await saveChatThread(updatedThread);

        // ✅ Refresh the chatThreads state
        setChatThreads((prevThreads) =>
            prevThreads.map((t) =>
                t.threadId === thread.threadId ? updatedThread : t
            )
        );

        // ✅ Also update the current thread if it's the one being renamed
        if (currentThread?.threadId === thread.threadId) {
            setCurrentThread(updatedThread);
        }
    };


    // SSE: Stream updates from the backend
    const handleSend = async () => {
        if (!selectedCase) return;

        const savedCustomer = localStorage.getItem("customer");
        const customerID = savedCustomer ? JSON.parse(savedCustomer).client_id : "unknown";

        let activeThread = currentThread || (await createNewChatThread(selectedCase.case_id));
        const userMessage = {role: "user", content: query};

        const updatedMessages = [...activeThread.messages, userMessage];
        const updatedThread = {...activeThread, messages: updatedMessages};

        await saveChatThread(updatedThread);
        setCurrentThread(updatedThread);
        setQuery("");
        setIntermediateMessage(""); // Reset intermediate message

        const historyJson = JSON.stringify(updatedMessages.map((m) => ({
            role: m.role,
            content: m.content
        })));

        const historyParam = encodeURIComponent(historyJson);

        // SSE URL
        const url = new URL("http://localhost:8000/query_stream");
        url.searchParams.set("client_id", selectedCase.client_id);
        url.searchParams.set("customer_id", customerID);
        url.searchParams.set("case_id", selectedCase.case_id);
        url.searchParams.set("query", query);
        url.searchParams.set("top_k", "5");
        url.searchParams.set("history", historyParam);
        const sse = new EventSource(url.toString());

        sse.onmessage = (event) => {
            setIntermediateMessage(event.data); // <-- Replace previous message
        };

        sse.addEventListener("final", (event) => {
            console.log("Received final event:", event.data);

            try {
                const responseData = JSON.parse(event.data);  // ✅ Parse JSON response
                const fullAnswer = responseData.final_answer.trim();
                const relatedChunks = responseData.related_chunks || [];  // ✅ Capture related chunks

                setCurrentThread((prevThread) => {
                    if (!prevThread) return prevThread;

                    const finalMessage = {
                        role: "assistant",
                        content: fullAnswer,
                        related_chunks: relatedChunks,
                    };

                    const newThread = {
                        ...prevThread,
                        messages: [...prevThread.messages, finalMessage],
                    };

                    saveChatThread(newThread);
                    return newThread;
                });

                setDrawerRelatedChunks(relatedChunks);  // ✅ Store related chunks in state
                setIntermediateMessage("");
                sse.close();
            } catch (error) {
                console.error("Error parsing final response JSON:", error);
            }
        });


        sse.addEventListener("error", (event) => {
            console.error("SSE error:", event);
            sse.close();
        });

        setEventSource(sse);
    };

    // Render chat messages
    const renderChatMessages = () => {
        if (!currentThread) return null;
        return currentThread.messages?.map((msg, idx) => {
            const isUser = msg.role === "user";
            return (
                <Box key={idx} sx={{display: "flex", flexDirection: isUser ? "row-reverse" : "row", mb: 2}}>
                    <Box sx={{
                        backgroundColor: isUser ? "#007bff" : "#2F2F2F",
                        color: "#fff",
                        borderRadius: "12px",
                        padding: "8px 12px",
                        maxWidth: "60%",
                        mb: 1,
                        position: "relative"
                    }}>
                        <Typography variant="body1">{msg.content}</Typography>

                        {/* Show Info Icon if message has related chunks */}
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
                        <ChunksDrawer open={isDrawerOpen} onClose={() => setIsDrawerOpen(false)}
                                      relatedChunks={drawerRelatedChunks}/>

                    </Box>
                </Box>
            );
        });
    };


    return (
        <Box sx={{display: "flex", height: '-webkit-fill-available'}}>
            <Box sx={{width: 300, flexShrink: 0, position: "fixed", paddingTop: 0}}>
                <ChatSidebar
                    cases={cases}
                    chatThreads={chatThreads}
                    currentThread={currentThread}
                    onSelectCase={setSelectedCase}
                    onSelectThread={setCurrentThread}
                    onDeleteThread={handleDeleteThread}
                    onNewThread={handleNewThread}
                    onRenameThread={handleRenameThread}
                    setChatThreads={setChatThreads}
                />
            </Box>

            <Box sx={{
                marginLeft: 40,
                flex: 1,
                display: "flex",
                flexDirection: "column",
                overflow: "hidden",
                p: 2
            }}>
                <Box
                    ref={messagesContainerRef}
                    sx={{
                        flex: 1,
                        overflowY: "auto",
                        border: "1px solid",
                        borderColor: "divider",
                        borderRadius: "4px",
                        p: 2,
                    }}>
                    {renderChatMessages()}

                    {/* Intermediate Response Box */}
                    {intermediateMessage && (
                        <Box sx={{
                            borderLeft: "3px solid #007bff",
                            paddingLeft: "10px",
                            marginTop: "10px",
                            color: "#777"
                        }}>
                            <Typography variant="body2">{intermediateMessage}</Typography>
                        </Box>
                    )}
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
                    <Button variant="contained" onClick={handleSend}>Send</Button>
                </Box>
            </Box>
        </Box>
    );
}
