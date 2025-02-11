import React from 'react'
import {useNavigate} from 'react-router-dom'
import {
    Box,
    IconButton,
    Paper,
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableRow,
    TextField,
    Typography
} from '@mui/material'
import DeleteIcon from '@mui/icons-material/Delete'
import Swal from 'sweetalert2'

export default function CasesList() {
    const navigate = useNavigate()
    const [filterText, setFilterText] = React.useState('')
    const [casesData, setCasesData] = React.useState([])

    React.useEffect(() => {
        fetchCases()
    }, [])

    async function fetchCases() {
        const allCases = await window.electronAPI.cases.getAll()
        setCasesData(allCases)
    }

    async function handleDelete(caseId) {
        const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;

        const result = await Swal.fire({
            title: "Are you sure?",
            text: "This will permanently delete the case.",
            icon: "warning",
            showCancelButton: true,
            confirmButtonColor: "#d33",
            cancelButtonColor: "#3085d6",
            confirmButtonText: "Yes, delete it!",
            background: prefersDark ? "#1e1e1e" : "#fff", // Dark mode background
            color: prefersDark ? "#fff" : "#000", // Dark mode text
        });

        if (result.isConfirmed) {
            await window.electronAPI.cases.delete(caseId);
            setCasesData((prevCases) => prevCases.filter(c => c.id !== caseId));
            Swal.fire({
                title: "Deleted!",
                text: "The case has been removed.",
                icon: "success",
                background: prefersDark ? "#1e1e1e" : "#fff",
                color: prefersDark ? "#fff" : "#000",
            });
        }
    }


    const filteredCases = React.useMemo(() => {
        return casesData.filter((c) =>
            c.caseName.toLowerCase().includes(filterText.toLowerCase())
        )
    }, [filterText, casesData])

    return (
        <Box sx={{p: 3}}>
            <Typography variant="h4" gutterBottom>
                Cases
            </Typography>

            <TextField
                label="Search cases"
                value={filterText}
                onChange={(e) => setFilterText(e.target.value)}
                size="small"
                sx={{mb: 2}}
            />

            <Paper>
                <Table>
                    <TableHead>
                        <TableRow>
                            <TableCell>Case Name</TableCell>
                            <TableCell>Date Opened</TableCell>
                            <TableCell>Description</TableCell>
                            <TableCell>Actions</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {filteredCases.map((c) => (
                            <TableRow key={c.id} hover>
                                <TableCell
                                    style={{cursor: 'pointer'}}
                                    onClick={() => navigate(`/cases/${c.id}`)}
                                >
                                    {c.caseName}
                                </TableCell>
                                <TableCell>{c.dateOpened}</TableCell>
                                <TableCell>{c.description}</TableCell>
                                <TableCell>
                                    <IconButton
                                        color="error"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleDelete(c.id);
                                        }}
                                    >
                                        <DeleteIcon/>
                                    </IconButton>
                                </TableCell>
                            </TableRow>
                        ))}

                        {filteredCases.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={4} align="center">
                                    No cases found.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </Paper>
        </Box>
    )
}
