import React, {useState} from 'react';
import {
    Accordion,
    AccordionDetails,
    AccordionSummary,
    Box,
    Button,
    List,
    ListItem,
    ListItemButton,
    ListItemText,
    Typography
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';

export default function ChatSidebar({
                                        cases = [],
                                        chatThreads = [],
                                        currentThread,
                                        onSelectCase,
                                        onSelectThread,
                                        onNewThread
                                    }) {
    // Group threads by case id
    const groupedThreads = cases.map(c => ({
        case: c,
        threads: chatThreads.filter(t => t.case_id === c.id)
    }));

    // State to control which case accordion is expanded.
    const [expandedCase, setExpandedCase] = useState(false);

    const handleAccordionChange = (caseId) => (event, isExpanded) => {
        setExpandedCase(isExpanded ? caseId : false);
    };

    return (
        <Box sx={{width: 300, marginTop: 5, overflowY: 'auto', p: 2}}>
            <Typography variant="h6" gutterBottom>Cases & Threads</Typography>
            {groupedThreads.map(group => (
                <Accordion
                    key={group.case.id}
                    expanded={expandedCase === group.case.id}
                    onChange={handleAccordionChange(group.case.id)}
                    sx={{
                        boxShadow: 'none',
                        paddingLeft: 2,
                        background: 'transparent',
                        border: 'none',
                        '&:before': {display: 'none'}
                    }}
                >
                    <AccordionSummary
                        expandIcon={<ExpandMoreIcon/>}
                        onClick={() => onSelectCase({case_id: group.case.id, client_id: group.case.clientId})}
                        sx={{cursor: 'pointer', p: 0, mb: 1}}
                    >
                        <Typography variant="subtitle1" color="textPrimary">
                            {group.case.caseName}
                        </Typography>
                    </AccordionSummary>
                    <AccordionDetails sx={{p: 0, pl: 2}}>
                        {group.threads.length === 0 ? (
                            <Typography variant="body2" color="text.secondary">No threads</Typography>
                        ) : (
                            <List sx={{p: 0}}>
                                {group.threads.map(thread => (
                                    <ListItem key={thread.threadId} disablePadding>
                                        <ListItemButton
                                            onClick={() => onSelectThread(thread)}
                                            selected={currentThread && currentThread.threadId === thread.threadId}
                                            sx={{pl: 2}}
                                        >
                                            <ListItemText
                                                primary={thread.title || new Date(thread.createdAt).toLocaleString()}/>
                                        </ListItemButton>
                                    </ListItem>
                                ))}
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
