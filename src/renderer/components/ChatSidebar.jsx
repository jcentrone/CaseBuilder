// ChatSidebar.jsx
import React, {useState} from "react";
import {
    Accordion,
    AccordionDetails,
    AccordionSummary,
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
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";

export default function ChatSidebar({
                                        cases = [],
                                        chatThreads = [],
                                        currentThread,
                                        onSelectCase,
                                        onSelectThread,
                                        onNewThread,
                                        onDeleteThread,
                                        onRenameThread,
                                    }) {
    // Group threads by case and sort threads newest first
    const groupedThreads = cases.map((c) => {
        const threadsForCase = chatThreads
            .filter((t) => t.case_id === c.id)
            .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        return {case: c, threads: threadsForCase};
    });

    // State for inline renaming
    const [editingThreadId, setEditingThreadId] = useState(null);
    const [renameValue, setRenameValue] = useState("");

    const handleEditThread = (thread) => {
        setEditingThreadId(thread.threadId);
        setRenameValue(thread.title || "");
    };

    const handleSaveRename = (thread) => {
        if (onRenameThread && renameValue.trim() !== "") {
            onRenameThread(thread, renameValue.trim());
        }
        setEditingThreadId(null);
        setRenameValue("");
    };

    return (
        <Box sx={{width: 300, overflowY: "auto", p: 2}}>
            <Typography variant="h6" gutterBottom>
                Cases & Threads
            </Typography>

            {groupedThreads.map((group) => (
                <Accordion
                    key={group.case.id}
                    defaultExpanded={false}
                    sx={{
                        boxShadow: "none",
                        background: "transparent",
                        border: "none",
                        "&:before": {display: "none"},
                    }}
                >
                    <AccordionSummary
                        expandIcon={<ExpandMoreIcon/>}
                        onClick={() =>
                            onSelectCase({case_id: group.case.id, client_id: group.case.clientId})
                        }
                        sx={{cursor: "pointer", p: 0, mb: 1}}
                    >
                        <Typography variant="subtitle1" color="text.primary">
                            {group.case.caseName}
                        </Typography>
                    </AccordionSummary>
                    <AccordionDetails sx={{p: 0, pl: 2}}>
                        {group.threads.length === 0 ? (
                            <Typography variant="body2" color="text.secondary">
                                No threads
                            </Typography>
                        ) : (
                            <List sx={{p: 0}}>
                                {group.threads.map((thread) => {
                                    const isSelected = currentThread?.threadId === thread.threadId;
                                    // Use thread.title if available; otherwise, use the creation date as a fallback.
                                    const displayTitle =
                                        thread.title || new Date(thread.createdAt).toLocaleString();

                                    return (
                                        <ListItem
                                            key={thread.threadId}
                                            disablePadding
                                            selected={isSelected}
                                            sx={{
                                                mb: 0.5,
                                                borderRadius: 1,
                                                backgroundColor: isSelected ? 'rgba(0, 123, 255, 0.2)' : 'transparent',
                                                '&:hover': {
                                                    backgroundColor: 'rgba(0, 123, 255, 0.3)',
                                                },
                                            }}

                                        >
                                            {/* Main clickable area */}
                                            <ListItemButton
                                                onClick={() => onSelectThread(thread)}
                                                selected={isSelected}
                                                sx={{pl: 2, borderRadius: 1, background: 'transparent !important'}}
                                            >
                                                {editingThreadId === thread.threadId ? (
                                                    <Box sx={{
                                                        display: "flex",
                                                        gap: 1,
                                                        alignItems: "center",
                                                        width: "100%"
                                                    }}>
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

                                            {/* Icons container */}
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
                    </AccordionDetails>
                </Accordion>
            ))}

            <Button variant="outlined" fullWidth onClick={onNewThread} sx={{mt: 2}}>
                New Thread
            </Button>
        </Box>
    );
}
