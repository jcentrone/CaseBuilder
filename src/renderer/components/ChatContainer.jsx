import React, {useEffect, useRef, useState} from "react";
import {useParams} from "react-router-dom";
import {Box, Button, Divider, Drawer, IconButton, TextField, Tooltip, Typography} from "@mui/material";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import InfoIcon from '@mui/icons-material/Info';
import FullscreenIcon from "@mui/icons-material/Fullscreen";
import FullscreenExitIcon from "@mui/icons-material/FullscreenExit";

import ChatSidebar from "../components/ChatSidebar";
import {openDB} from "idb";
import {v4 as uuidv4} from "uuid";

// ─────────────────────────────────────────────────────────────
//  1) IDB SETUP
// ─────────────────────────────────────────────────────────────
const dbPromise = openDB("chat-db", 3, {
    upgrade(db) {
        if (!db.objectStoreNames.contains("chatThreads")) {
            const store = db.createObjectStore("chatThreads", {keyPath: "threadId"});
            store.createIndex("case_id", "case_id", {unique: false});
        }
    },
});

async function getChatThreadsForCase(caseId) {
    const db = await dbPromise;
    return db.getAllFromIndex("chatThreads", "case_id", caseId);
}

async function saveChatThread(thread) {
    const db = await dbPromise;
    return db.put("chatThreads", thread);
}

async function deleteChatThread(threadId) {
    const db = await dbPromise;
    return db.delete("chatThreads", threadId);
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

// ─────────────────────────────────────────────────────────────
//  2) CHUNKS DRAWER COMPONENT
// ─────────────────────────────────────────────────────────────
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
                        <Box key={index} sx={{mb: 2, p: 1, border: "1px solid #ccc", borderRadius: 1}}>
                            <Typography variant="subtitle1">
                                <strong>Document:</strong> {item.supporting_chunk.name}
                            </Typography>
                            <Typography variant="body2">{item.supporting_chunk.matched_text}</Typography>

                            <Box sx={{pl: 2, mt: 1}}>
                                {item.law_chunks?.length > 0 ? (
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

// ─────────────────────────────────────────────────────────────
//  3) MAIN CHAT CONTAINER
// ─────────────────────────────────────────────────────────────
export default function ChatContainer() {
    const {clientId, caseId, chatId} = useParams();
    const [chatThreads, setChatThreads] = useState([]);
    const [currentThread, setCurrentThread] = useState(null);
    const [query, setQuery] = useState("");
    const [sidebarOpen, setSidebarOpen] = useState(true);

    // ──────────────────────────────────────────────────────────
    //  For chunk drawer state
    // ──────────────────────────────────────────────────────────
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);
    const [drawerRelatedChunks, setDrawerRelatedChunks] = useState([]);

    // ──────────────────────────────────────────────────────────
    // For chat area state
    // ──────────────────────────────────────────────────────────
    const [isFullScreen, setIsFullScreen] = useState(false);

    // ──────────────────────────────────────────────────────────
    // SSE + intermediate message
    // ──────────────────────────────────────────────────────────
    const [intermediateMessage, setIntermediateMessage] = useState("");
    const [eventSource, setEventSource] = useState(null);

    const messagesContainerRef = useRef(null);

    // ──────────────────────────────────────────────────────────
    //  Load or create thread for a given case
    // ──────────────────────────────────────────────────────────
    useEffect(() => {
        if (!caseId) return;
        (async () => {
            const threads = await getChatThreadsForCase(caseId);
            if (threads.length > 0) {
                setChatThreads(threads);
                setCurrentThread(threads[0]);
            } else {
                const newThread = await createNewChatThread(caseId);
                setChatThreads([newThread]);
                setCurrentThread(newThread);
            }
        })();
    }, [caseId]);

    // ──────────────────────────────────────────────────────────
    //  If we have a chatId, load that thread
    // ──────────────────────────────────────────────────────────
    useEffect(() => {
        if (!chatId) return;
        (async () => {
            const db = await dbPromise;
            const thread = await db.get("chatThreads", chatId);
            if (thread) setCurrentThread(thread);
        })();
    }, [chatId]);

    // ──────────────────────────────────────────────────────────
    //  Auto-scroll on new messages / intermediate
    // ──────────────────────────────────────────────────────────
    useEffect(() => {
        if (messagesContainerRef.current) {
            messagesContainerRef.current.scrollTop =
                messagesContainerRef.current.scrollHeight;
        }
    }, [currentThread?.messages, intermediateMessage]);

    // ──────────────────────────────────────────────────────────
    //  Toggle Sidebar
    // ──────────────────────────────────────────────────────────
    const handleToggleSidebar = () => {
        setSidebarOpen((prev) => !prev);
    };

    // ──────────────────────────────────────────────────────────
    //  Send message
    // ──────────────────────────────────────────────────────────
    const handleSend = async () => {
        if (!currentThread || !query.trim()) return;

        const savedCustomer = localStorage.getItem("customer");
        const customerID = savedCustomer ? JSON.parse(savedCustomer).client_id : "unknown";

        // 1) Load from DB
        const db = await dbPromise;
        let storedThread = await db.get("chatThreads", currentThread.threadId);

        if (!storedThread) {
            console.error("Error: Current thread not found in IndexedDB");
            return;
        }

        // 2) Append user message to IndexedDB
        const userMessage = {role: "user", content: query.trim()};
        storedThread.messages.push(userMessage);
        await saveChatThread(storedThread);

        // 3) Update React state
        setCurrentThread({...storedThread});
        setQuery("");
        setIntermediateMessage("Thinking...");

        // 4) Ensure SSE is closed
        if (eventSource) {
            eventSource.close();
            setEventSource(null);
        }

        // 5) Build SSE URL
        const historyJson = JSON.stringify(
            storedThread.messages.map((m) => ({
                role: m.role,
                content: m.content,
            }))
        );
        const historyParam = encodeURIComponent(historyJson);

        const url = new URL("http://localhost:8000/query_stream");
        url.searchParams.set("client_id", clientId);
        url.searchParams.set("customer_id", customerID);
        url.searchParams.set("case_id", caseId);
        url.searchParams.set("query", query.trim());
        url.searchParams.set("top_k", "5");
        url.searchParams.set("history", historyParam);

        // 6) Listen for SSE
        const sse = new EventSource(url.toString());
        setEventSource(sse);

        let latestStreamingContent = "";

        sse.onmessage = (event) => {
            console.log("Intermediate response:", event.data);
            latestStreamingContent = event.data;
            setIntermediateMessage(latestStreamingContent);
        };

        sse.addEventListener("final", async (event) => {
            console.log("Received final event:", event.data);
            try {
                const responseData = JSON.parse(event.data);
                const finalMessage = {
                    role: "assistant",
                    content: responseData.final_answer.trim(),
                    related_chunks: responseData.related_chunks || [],
                };

                let updatedThread = await db.get("chatThreads", currentThread.threadId);
                if (!updatedThread) return;

                // Remove the last "assistant" message (the streaming one)
                if (
                    updatedThread.messages.length > 0 &&
                    updatedThread.messages[updatedThread.messages.length - 1].role === "assistant"
                ) {
                    updatedThread.messages.pop();
                }

                updatedThread.messages.push(finalMessage);
                await saveChatThread(updatedThread);

                setCurrentThread({...updatedThread});
                setIntermediateMessage("");
                setDrawerRelatedChunks(finalMessage.related_chunks);

                sse.close();
                setEventSource(null);
            } catch (error) {
                console.error("Error parsing final response JSON:", error);
            }
        });

        sse.addEventListener("error", (event) => {
            console.error("SSE error:", event);
            sse.close();
            setEventSource(null);
        });
    };

    // ──────────────────────────────────────────────────────────
    //  Render all messages from currentThread
    // ──────────────────────────────────────────────────────────
    const renderChatMessages = () => {
        if (!currentThread) return null;

        return (
            <>
                {currentThread.messages.map((msg, idx) => {
                    const isUser = msg.role === "user";

                    return (
                        <Box
                            key={idx}
                            sx={{
                                display: "flex",
                                flexDirection: isUser ? "row-reverse" : "row",
                                mb: 2,
                                position: "relative",
                            }}
                        >
                            <Box
                                sx={{
                                    backgroundColor: isUser ? "rgba(0, 123, 255, 0.2)" : "#2F2F2F",
                                    color: "#fff",
                                    borderRadius: "12px",
                                    padding: "8px 12px",
                                    maxWidth: "60%",
                                    mb: 1,
                                    position: "relative",
                                }}
                            >
                                <Typography variant="body1">{msg.content}</Typography>

                                {/* Show Info Icon if message has related chunks */}
                                {msg.role === "assistant" && msg.related_chunks?.length > 0 && (
                                    <IconButton
                                        size="small"
                                        sx={{position: "absolute", top: 4, right: -40}}
                                        onClick={() => {
                                            console.log("Opening chunk drawer with: ", msg.related_chunks);
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
                })}

                {/* Show any streaming text in progress */}
                {intermediateMessage && (
                    <Box
                        sx={{
                            borderLeft: "3px solid #007bff",
                            paddingLeft: "10px",
                            marginTop: "10px",
                            color: "#777",
                        }}
                    >
                        <Typography variant="body2">{intermediateMessage}</Typography>
                    </Box>
                )}
            </>
        );
    };

    // ──────────────────────────────────────────────────────────
    //  Return
    // ──────────────────────────────────────────────────────────
    return (
        <Box sx={{display: "flex", height: "-webkit-fill-available", position: "relative"}}>
            {/* SIDEBAR */}
            {sidebarOpen && (
                <Box sx={{width: 305, flexShrink: 0, position: "relative", display: "flex"}}>
                    <ChatSidebar
                        chatThreads={chatThreads}
                        currentThread={currentThread}
                        onSelectThread={setCurrentThread}
                        onDeleteThread={async (thread) => {
                            await deleteChatThread(thread.threadId);
                            setChatThreads((prev) => prev.filter((t) => t.threadId !== thread.threadId));
                            setCurrentThread((prev) =>
                                prev?.threadId === thread.threadId ? chatThreads[0] || null : prev
                            );
                        }}
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

            {/* SIDEBAR COLLAPSE BUTTON */}
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

            {/* MAIN CHAT AREA */}
            {/* The main chat area goes here */}
            <Box
                // This box is what toggles between normal and “fullscreen within the parent”
                sx={{
                    // If not fullscreen, use normal relative/auto style
                    position: isFullScreen ? "fixed" : "relative",

                    // If we want to overlay the entire screen except for the left 300px:
                    bottom: 0,
                    left: isFullScreen ? "241px" : "auto",
                    width: isFullScreen ? "calc(100vw - 241px)" : "100%",
                    height: isFullScreen ? "calc(100vh - 64px)" : "auto",

                    backgroundColor: isFullScreen ? "background.paper" : "transparent",
                    zIndex: isFullScreen ? 9999 : "auto",
                    transition: "all 0.3s ease-in-out",

                    // Some normal layout
                    display: "flex",
                    flexDirection: "column",
                    // border: "1px solid #ccc",
                    p: 2,
                    pt: isFullScreen ? 2 : 0,
                }}
            >
                {/* 1) The heading row with a "Chat" label + icon */}
                <Box sx={{display: "flex", alignItems: "center", justifyContent: "space-between", mb: 2}}>
                    <Typography variant="h5" color={"textSecondary"}>Chat</Typography>

                    <IconButton
                        sx={{
                            backgroundColor: "#121212",
                            border: "1px solid",
                            borderColor: "divider",
                            borderRadius: "8px",
                            padding: "2px 8px",
                            "&:hover": {backgroundColor: "#f1f1f1", color: "#000000"},
                        }}
                        onClick={() => setIsFullScreen((prev) => !prev)}>
                        {isFullScreen ? <FullscreenExitIcon/> : <FullscreenIcon/>}
                    </IconButton>
                </Box>

                {/* 2) The main chat area */}
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
                    {renderChatMessages()}
                </Box>

                {/* 3) The input row */}
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

            {/* Add the ChunksDrawer so it can open when isDrawerOpen = true */}
            <ChunksDrawer
                open={isDrawerOpen}
                onClose={() => setIsDrawerOpen(false)}
                relatedChunks={drawerRelatedChunks}
            />
        </Box>
    );
}
