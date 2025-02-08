// src/renderer/components/TopBar.jsx
import React from 'react';
import {AppBar, Box, IconButton, InputBase, Toolbar, Typography} from '@mui/material';
import {ArrowBack, ArrowForward, Search} from '@mui/icons-material';

export default function TopBar({currentModule, onNavigate}) {
    return (
        <AppBar position="fixed" sx={{zIndex: (theme) => theme.zIndex.drawer + 1}}>
            <Toolbar>
                {/* Backward Navigation */}
                <IconButton color="inherit" onClick={() => onNavigate('back')}>
                    <ArrowBack/>
                </IconButton>

                {/* Forward Navigation */}
                <IconButton color="inherit" onClick={() => onNavigate('forward')}>
                    <ArrowForward/>
                </IconButton>

                {/* Current Module */}
                <Typography variant="h6" noWrap sx={{flexGrow: 1, ml: 2}}>
                    {currentModule}
                </Typography>

                {/* Search Bar */}
                <Box sx={{
                    display: 'flex',
                    alignItems: 'center',
                    backgroundColor: 'rgba(255, 255, 255, 0.15)',
                    borderRadius: 1,
                    pl: 1,
                    pr: 1
                }}>
                    <Search/>
                    <InputBase
                        placeholder="Search…"
                        sx={{ml: 1, color: 'inherit', width: '100%'}}
                        inputProps={{'aria-label': 'search'}}
                    />
                </Box>
            </Toolbar>
        </AppBar>
    );
}
