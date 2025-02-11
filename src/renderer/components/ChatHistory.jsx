import React, {useEffect, useState} from "react";
import {useNavigate, useParams} from "react-router-dom";
import {Box, IconButton, Paper, Table, TableBody, TableCell, TableHead, TableRow, Typography} from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";
import Swal from "sweetalert2";
import {openDB} from "idb";

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

async function deleteChatThread(threadId) {
    const db = await dbPromise;
    await db.delete("chatThreads", threadId);
}

export default function ChatHistory() {
    const {caseId} = useParams();  // ✅ Extract caseId here
    const navigate = useNavigate();
    const [chatHistory, setChatHistory] = useState([]);

    useEffect(() => {
        if (caseId) fetchChatHistory();
    }, [caseId]);

    async function fetchChatHistory() {
        try {
            const history = await getChatThreadsForCase(caseId);
            setChatHistory(history);
        } catch (error) {
            console.error("Error fetching chat history:", error);
        }
    }

    async function handleDeleteChat(chatId) {
        const prefersDark = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;

        const result = await Swal.fire({
            title: "Delete this chat?",
            text: "This action cannot be undone.",
            icon: "warning",
            showCancelButton: true,
            confirmButtonColor: "#d33",
            cancelButtonColor: "#3085d6",
            confirmButtonText: "Yes, delete it!",
            background: prefersDark ? "#1e1e1e" : "#fff",
            color: prefersDark ? "#fff" : "#000",
        });

        if (result.isConfirmed) {
            await deleteChatThread(chatId);
            setChatHistory((prevChats) => prevChats.filter((chat) => chat.threadId !== chatId));

            Swal.fire({
                title: "Deleted!",
                text: "Chat has been removed.",
                icon: "success",
                background: prefersDark ? "#1e1e1e" : "#fff",
                color: prefersDark ? "#fff" : "#000",
            });
        }
    }

    return (
        <Box sx={{p: 3}}>
            <Typography variant="h5" gutterBottom>Chat History</Typography>

            {chatHistory.length === 0 ? (
                <Typography>No chat history found.</Typography>
            ) : (
                <Paper>
                    <Table>
                        <TableHead>
                            <TableRow>
                                <TableCell>Title</TableCell>
                                <TableCell>Date Added</TableCell>
                                <TableCell>Last Modified</TableCell>
                                <TableCell>Actions</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {chatHistory.map((chat) => (
                                <TableRow
                                    key={chat.threadId}
                                    hover
                                    style={{cursor: "pointer"}}
                                    onClick={() => navigate(`/cases/${caseId}/chat/${chat.threadId}`)}  // ✅ Navigate correctly
                                >
                                    <TableCell>{chat.title || "Untitled Chat"}</TableCell>
                                    <TableCell>{new Date(chat.createdAt).toLocaleString()}</TableCell>
                                    <TableCell>{chat.lastModified ? new Date(chat.lastModified).toLocaleString() : "N/A"}</TableCell>
                                    <TableCell>
                                        <IconButton
                                            color="error"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleDeleteChat(chat.threadId);
                                            }}
                                        >
                                            <DeleteIcon/>
                                        </IconButton>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </Paper>
            )}
        </Box>
    );
}
