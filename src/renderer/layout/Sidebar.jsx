import React from 'react';
import { Box, List, ListItem, ListItemButton, ListItemText } from '@mui/material';
import { useNavigate, useLocation } from 'react-router-dom';

export default function Sidebar({ setCurrentModule }) {
    const navigate = useNavigate(); // Hook for programmatic navigation
    const location = useLocation(); // Hook to get the current path

    const handleNavigation = (module, path) => (event) => {
        event.preventDefault(); // Prevent default navigation
        setCurrentModule(module); // Update the module state
        navigate(path); // Navigate to the desired route
    };

    const isActive = (path) => location.pathname === path;

    return (
        <Box>
            <List>
                <ListItem disablePadding>
                    <ListItemButton
                        onClick={handleNavigation('Cases', '/cases')}
                        sx={{
                            backgroundColor: isActive('/cases') ? 'rgba(0, 123, 255, 0.1)' : 'transparent',
                            '&:hover': {
                                backgroundColor: 'rgba(0, 123, 255, 0.2)',
                            },
                        }}
                    >
                        <ListItemText primary="Cases" />
                    </ListItemButton>
                </ListItem>
                <ListItem disablePadding>
                    <ListItemButton
                        onClick={handleNavigation('Clients', '/clients')}
                        sx={{
                            backgroundColor: isActive('/clients') ? 'rgba(0, 123, 255, 0.1)' : 'transparent',
                            '&:hover': {
                                backgroundColor: 'rgba(0, 123, 255, 0.2)',
                            },
                        }}
                    >
                        <ListItemText primary="Clients" />
                    </ListItemButton>
                </ListItem>
                <ListItem disablePadding>
                    <ListItemButton
                        onClick={handleNavigation('Calendar', '/calendar')}
                        sx={{
                            backgroundColor: isActive('/calendar') ? 'rgba(0, 123, 255, 0.1)' : 'transparent',
                            '&:hover': {
                                backgroundColor: 'rgba(0, 123, 255, 0.2)',
                            },
                        }}
                    >
                        <ListItemText primary="Calendar" />
                    </ListItemButton>
                </ListItem>
            </List>
        </Box>
    );
}
