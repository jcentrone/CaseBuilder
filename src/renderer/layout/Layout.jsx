import React, {useState} from 'react';
import {Box, Drawer} from '@mui/material';
import Sidebar from './Sidebar';
import TopBar from './TopBar'; // Import the TopBar component

const drawerWidth = 240;

export default function Layout({children, currentModule, setCurrentModule}) {
    // State for the current module
    // const [currentModule, setCurrentModule] = useState('Clients'); // Default module

    // Navigation function for forward/backward (to be implemented)
    const handleNavigate = (direction) => {
        console.log(`Navigating ${direction}`); // Placeholder for now
    };

    return (
        <Box sx={{display: 'flex', flexDirection: 'column', height: '100vh'}}>
            {/* TopBar */}
            <TopBar currentModule={currentModule} onNavigate={handleNavigate}/>

            {/* Content Area */}
            <Box sx={{display: 'flex', flexGrow: 1}}>
                {/* Sidebar */}
                <Drawer
                    variant="permanent"
                    sx={{
                        width: drawerWidth,
                        flexShrink: 0,
                        [`& .MuiDrawer-paper`]: {
                            width: drawerWidth,
                            boxSizing: 'border-box',
                            top: '64px', // Adjust this value to match the height of the TopBar
                        },
                    }}
                >
                    <Sidebar setCurrentModule={setCurrentModule}/>
                </Drawer>

                {/* Main Content */}
                <Box
                    component="main"
                    sx={{
                        flexGrow: 1,
                        bgcolor: 'background.default',
                        p: 0, // Padding for content
                    }}
                >
                    {children}
                </Box>
            </Box>
        </Box>
    );
}
