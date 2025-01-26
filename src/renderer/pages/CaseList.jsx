import React from 'react'
import {useNavigate} from 'react-router-dom'
import {
    Box,
    Button,
    Paper,
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableRow,
    TextField,
    Typography
} from '@mui/material'
import {Visibility} from '@mui/icons-material'

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

    // Filter by caseName
    const filteredCases = React.useMemo(() => {
        return casesData.filter((c) =>
            c.caseName.toLowerCase().includes(filterText.toLowerCase())
        )
    }, [filterText, casesData])

    return (
        <Box>
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
                            <TableRow
                                key={c.id}
                                hover
                                style={{cursor: 'pointer'}}
                                onClick={() => navigate(`/cases/${c.id}`)}>
                                <TableCell>{c.caseName}</TableCell>
                                <TableCell>{c.dateOpened}</TableCell>
                                <TableCell>{c.description}</TableCell>
                                <TableCell>
                                    {/*<Button*/}
                                    {/*    variant="contained"*/}
                                    {/*    startIcon={<Visibility/>}*/}
                                    {/*    onClick={() => navigate(`/cases/${c.id}`)}*/}
                                    {/*>*/}
                                    {/*    View*/}
                                    {/*</Button>*/}
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
