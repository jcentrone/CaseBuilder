import React, {useState} from "react";
import {
    Box,
    Button,
    IconButton,
    List,
    ListItem,
    ListItemButton,
    ListItemText,
    TextField,
    Typography,
} from "@mui/material";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";

export default function ChatSidebar({
                                        chatThreads = [],
                                        currentThread,
                                        onSelectThread,
                                        onNewThread,
                                        onDeleteThread,
                                        onRenameThread,
                                    }) {
    // State for inline renaming
    const [editingThreadId, setEditingThreadId] = useState(null);
    const [renameValue, setRenameValue] = useState("");

    const handleEditThread = (thread) => {
        setEditingThreadId(thread.threadId);
        setRenameValue(thread.title || "");
    };

    const handleSaveRename = async (thread) => {
        if (onRenameThread && renameValue.trim() !== "") {
            await onRenameThread(thread, renameValue.trim());
        }
        setEditingThreadId(null);
        setRenameValue("");
    };


    return (
        <Box sx={{width: 300, overflowY: "auto", p: 3, height: "auto"}}>
            {/*<Typography variant="h4" gutterBottom>*/}
            {/*    Chats*/}
            {/*</Typography>*/}

            {chatThreads.length === 0 ? (
                <Typography variant="body2" color="text.secondary">
                    No chat history found.
                </Typography>
            ) : (
                <List sx={{p: 0}}>
                    {chatThreads.map((thread) => {
                        const isSelected = currentThread?.threadId === thread.threadId;
                        const displayTitle = thread.title || new Date(thread.createdAt).toLocaleString();

                        return (
                            <ListItem
                                key={thread.threadId}
                                disablePadding
                                selected={isSelected}
                                sx={{
                                    mb: 0.5,
                                    borderRadius: 1,
                                    backgroundColor: isSelected
                                        ? "rgba(0, 123, 255, 0.2)"
                                        : "transparent",
                                    "&:hover": {
                                        backgroundColor: "rgba(0, 123, 255, 0.3)",
                                    },
                                }}
                            >
                                <ListItemButton
                                    onClick={() => onSelectThread(thread)}
                                    selected={isSelected}
                                    sx={{
                                        pl: 2,
                                        borderRadius: 1,
                                        background: "transparent !important",
                                    }}
                                >
                                    {editingThreadId === thread.threadId ? (
                                        <Box
                                            sx={{
                                                display: "flex",
                                                gap: 1,
                                                alignItems: "center",
                                                width: "100%",
                                            }}
                                        >
                                            <TextField
                                                size="small"
                                                value={renameValue}
                                                onChange={(e) => setRenameValue(e.target.value)}
                                                onKeyDown={(e) => {
                                                    if (e.key === "Enter") {
                                                        e.preventDefault();
                                                        handleSaveRename(thread);
                                                    }
                                                }}
                                                sx={{flex: 1}}
                                            />
                                            <Button
                                                variant="text"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleSaveRename(thread);
                                                }}
                                                sx={{color: "inherit"}}
                                            >
                                                Save
                                            </Button>
                                        </Box>
                                    ) : (
                                        <ListItemText primary={displayTitle}/>
                                    )}
                                </ListItemButton>

                                {editingThreadId !== thread.threadId && (
                                    <Box
                                        sx={{
                                            ml: 1,
                                            display: "flex",
                                            gap: 0.5,
                                            alignItems: "center",
                                            pr: 1,
                                        }}
                                    >
                                        <IconButton
                                            size="small"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleEditThread(thread);
                                            }}
                                            sx={{borderRadius: "50%"}}
                                        >
                                            <EditIcon fontSize="small"/>
                                        </IconButton>
                                        <IconButton
                                            size="small"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                onDeleteThread(thread);
                                            }}
                                            sx={{borderRadius: "50%"}}
                                        >
                                            <DeleteIcon fontSize="small"/>
                                        </IconButton>
                                    </Box>
                                )}
                            </ListItem>
                        );
                    })}
                </List>
            )}

            <Button variant="outlined" fullWidth onClick={onNewThread} sx={{mt: 2}}>
                + New Chat
            </Button>
        </Box>
    );
}
