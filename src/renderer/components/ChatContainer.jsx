import React, {useEffect, useRef, useState} from "react";
import {useParams} from "react-router-dom";
import {Box, Button, Divider, Drawer, IconButton, TextField, Tooltip, Typography} from "@mui/material";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import ChatSidebar from "../components/ChatSidebar";
import {openDB} from "idb";
import {v4 as uuidv4} from "uuid";

// ✅ Open IndexedDB once
const dbPromise = openDB("chat-db", 3, {
    upgrade(db) {
        if (!db.objectStoreNames.contains("chatThreads")) {
            const store = db.createObjectStore("chatThreads", {keyPath: "threadId"});
            store.createIndex("case_id", "case_id", {unique: false});
        }
    },
});

// ✅ Helper functions
async function getChatThreadsForCase(caseId) {
    const db = await dbPromise;
    return db.getAllFromIndex("chatThreads", "case_id", caseId);
}

async function saveChatThread(thread) {
    const db = await dbPromise;
    return db.put("chatThreads", thread);
}

async function createNewChatThread(caseId) {
    const newThread = {
        threadId: uuidv4(),
        case_id: caseId,
        title: "New Chat",
        messages: [],
        createdAt: new Date().toISOString(),
    };
    await saveChatThread(newThread);
    return newThread;
}

// ✅ Supporting Chunks Drawer
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

export default function ChatContainer() {
    const {caseId, chatId} = useParams();
    const [chatThreads, setChatThreads] = useState([]);
    const [currentThread, setCurrentThread] = useState(null);
    const [query, setQuery] = useState("");
    const [sidebarOpen, setSidebarOpen] = useState(true);
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);
    const [drawerRelatedChunks, setDrawerRelatedChunks] = useState([]);
    const messagesContainerRef = useRef(null);

    useEffect(() => {
        if (!caseId) return;
        (async () => {
            const threads = await getChatThreadsForCase(caseId);
            if (threads.length > 0) {
                setChatThreads(threads);
                setCurrentThread((prev) => prev ?? threads[0]); // ✅ Prevent unnecessary overwrites
            } else {
                const newThread = await createNewChatThread(caseId);
                setChatThreads([newThread]);
                setCurrentThread(newThread);
            }
        })();
    }, [caseId]);

    useEffect(() => {
        if (!chatId) return;
        (async () => {
            const db = await dbPromise;
            const thread = await db.get("chatThreads", chatId);
            if (thread) {
                setCurrentThread(thread);
            }
        })();
    }, [chatId]);

    const handleToggleSidebar = () => setSidebarOpen((prev) => !prev);

    // ✅ Function to send a message
    const handleSend = async () => {
        if (!currentThread) return;
        const userMessage = {role: "user", content: query};

        const updatedMessages = [...currentThread.messages, userMessage];
        const updatedThread = {...currentThread, messages: updatedMessages};

        await saveChatThread(updatedThread);
        setCurrentThread(updatedThread);
        setQuery("");
    };

    return (
        <Box sx={{display: "flex", height: "-webkit-fill-available", position: "relative"}}>
            {sidebarOpen && (
                <Box sx={{width: 300, flexShrink: 0, position: "relative", display: "flex"}}>
                    <ChatSidebar
                        chatThreads={chatThreads}
                        currentThread={currentThread}
                        onSelectThread={setCurrentThread}
                        onDeleteThread={(thread) =>
                            setChatThreads((prev) => prev.filter((t) => t.threadId !== thread.threadId))
                        }
                        onNewThread={async () => {
                            const newThread = await createNewChatThread(caseId);
                            setChatThreads((prev) => [newThread, ...prev]);
                            setCurrentThread(newThread);
                        }}
                        onRenameThread={async (thread, newTitle) => {
                            const updatedThread = {...thread, title: newTitle};
                            await saveChatThread(updatedThread);
                            setChatThreads((prev) =>
                                prev.map((t) => (t.threadId === thread.threadId ? updatedThread : t))
                            );
                            if (currentThread?.threadId === thread.threadId) {
                                setCurrentThread(updatedThread);
                            }
                        }}
                    />
                </Box>
            )}

            <Tooltip title={sidebarOpen ? "Collapse Sidebar" : "Expand Sidebar"}>
                <IconButton
                    onClick={handleToggleSidebar}
                    sx={{
                        position: "absolute",
                        left: sidebarOpen ? 250 : 10,
                        top: 2,
                        zIndex: 10,
                        transition: "left 0.3s ease-in-out",
                        backgroundColor: "#121212",
                        border: "1px solid",
                        borderColor: "divider",
                        borderRadius: "8px",
                        padding: "2px 8px",
                        "&:hover": {backgroundColor: "#f1f1f1", color: "#000000"},
                    }}
                >
                    {sidebarOpen ? <ChevronLeftIcon/> : <ChevronRightIcon/>}
                </IconButton>
            </Tooltip>

            <Box sx={{flex: 1, display: "flex", flexDirection: "column", p: 2}}>
                <Box
                    ref={messagesContainerRef}
                    sx={{
                        flex: 1,
                        overflowY: "auto",
                        border: "1px solid",
                        borderColor: "divider",
                        borderRadius: "4px",
                        p: 2,
                    }}
                >
                    {currentThread?.messages?.map((msg, idx) => (
                        <Box key={idx}
                             sx={{display: "flex", flexDirection: msg.role === "user" ? "row-reverse" : "row", mb: 2}}>
                            <Box
                                sx={{
                                    backgroundColor: msg.role === "user" ? "rgba(0, 123, 255, 0.2)" : "#2F2F2F",
                                    color: "#fff",
                                    borderRadius: "12px",
                                    padding: "8px 12px",
                                    maxWidth: "60%",
                                }}
                            >
                                <Typography variant="body1">{msg.content}</Typography>
                            </Box>
                        </Box>
                    ))}
                </Box>

                <Box sx={{mt: 2, display: "flex"}}>
                    <TextField value={query} onChange={(e) => setQuery(e.target.value)} sx={{flex: 1, mr: 2}}/>
                    <Button variant="contained" onClick={handleSend}>Send</Button>
                </Box>
            </Box>
        </Box>
    );
}
