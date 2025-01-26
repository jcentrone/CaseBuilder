import React from 'react'
import {Button, Dialog, DialogActions, DialogContent, DialogTitle} from '@mui/material'

export default function DialogShell({
                                        title,
                                        open,
                                        onClose,
                                        onConfirm,
                                        children
                                    }) {
    return (
        <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
            <DialogTitle>{title}</DialogTitle>

            <DialogContent dividers>
                {children}
                {/* children = any content or form fields passed from parent */}
            </DialogContent>

            <DialogActions>
                <Button onClick={onClose}>Cancel</Button>
                <Button variant="contained" onClick={onConfirm}>Save</Button>
            </DialogActions>
        </Dialog>
    )
}
