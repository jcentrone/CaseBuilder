// src/renderer/pages/CaseGraph.jsx
import React from 'react'
import { useParams } from 'react-router-dom'
import { Typography, Box } from '@mui/material'

export default function CaseGraph() {
  const { caseId } = useParams()

  return (
    <Box>
      <Typography variant="h6">Knowledge Graph for Case: {caseId}</Typography>
      <Typography variant="body1">
        Visualize relationships between parties, documents, etc.,
        specific to case {caseId}.
      </Typography>
    </Box>
  )
}

