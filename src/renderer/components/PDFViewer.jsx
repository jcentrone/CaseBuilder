import React from 'react'
import { Viewer, Worker } from '@react-pdf-viewer/core'
import '@react-pdf-viewer/core/lib/styles/index.css'
import { defaultLayoutPlugin } from '@react-pdf-viewer/default-layout'
import '@react-pdf-viewer/default-layout/lib/styles/index.css'

const PDFViewer = ({ fileUrl }) => {
    const defaultLayout = defaultLayoutPlugin() // Add the default layout (optional)

    if (!fileUrl) {
        return <div>No PDF file provided</div>
    }

    return (
        <div style={{ height: '500px', border: '1px solid #ccc' }}>
            <Worker workerUrl="https://unpkg.com/pdfjs-dist@3.11.174/build/pdf.worker.min.js">
                <Viewer fileUrl={fileUrl} plugins={[defaultLayout]} />
            </Worker>
        </div>
    )
}

export default PDFViewer
