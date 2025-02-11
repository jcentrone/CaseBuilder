import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Box } from '@mui/material';
import ChatContainer from '../components/ChatContainer';

export default function CaseAssistant() {
    const { caseId, chatId } = useParams();
    const [cases, setCases] = useState([]);
    const [selectedCase, setSelectedCase] = useState(null);

    useEffect(() => {
        // Fetch all cases when navigating to Case Assistant directly
        (async () => {
            try {
                const data = await window.electronAPI.cases.getAll();
                setCases(data || []);

                // Select the first case by default if caseId is missing
                if (!caseId && data.length > 0) {
                    setSelectedCase(data[0]);  // ✅ Select first case
                } else if (caseId) {
                    setSelectedCase(data.find(c => c.id === caseId) || null);
                }
            } catch (err) {
                console.error("Error fetching cases:", err);
            }
        })();
    }, [caseId]);

    return (
        <Box sx={{ display: 'flex', height: '100vh' }}>
            {/* Chat Container */}
            <Box sx={{ marginLeft: 300, flex: 1, p: 2 }}>
                <ChatContainer caseId={selectedCase?.id} chatId={chatId} />
            </Box>
        </Box>
    );
}
