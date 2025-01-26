import React, {useEffect, useState} from 'react';
import Mammoth from 'mammoth'; // For Word documents
import {Viewer, Worker} from '@react-pdf-viewer/core';
import '@react-pdf-viewer/core/lib/styles/index.css';
import {Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow} from '@mui/material';

import * as XLSX from 'xlsx';


function buildFileUrl(originalPath) {
    let normalizedPath = originalPath.replace(/\\/g, '/');
    normalizedPath = encodeURI(normalizedPath);
    return `file:///${normalizedPath}`;
}

function buildSafeFileUrl(originalPath) {
    // Replace backslashes with forward slashes
    let normalizedPath = originalPath.replace(/\\/g, '/');
    // Encode spaces and other special chars, but not slashes or colon
    normalizedPath = encodeURI(normalizedPath);
    // Then prepend 'safe-file:///'
    return `safe-file:///${normalizedPath}`;
}

//pptx functions
export function PptxPreview({filePath}) {
    const [pdfPath, setPdfPath] = useState(null);

    useEffect(() => {
        if (!filePath) return;

        // 1) Ask main to convert PPTX => PDF
        window.electronAPI.pptxConvertToPdf(filePath)
            .then((convertedPdfPath) => {
                setPdfPath(convertedPdfPath);
            })
            .catch((error) => {
                console.error('Failed to convert PPTX to PDF:', error);
            });
    }, [filePath]);

    if (!pdfPath) {
        return <div>Converting PPTX to PDF... Please wait.</div>;
    }

    // 2) Build the file:// URL for the PDF
    const pdfUrl = buildFileUrl(pdfPath);

    return (
        <Worker workerUrl="https://unpkg.com/pdfjs-dist@3.11.174/build/pdf.worker.min.js">
            <Viewer fileUrl={pdfUrl}/>
        </Worker>
    );
}


// Excel Functions

function parseExcel(arrayBuffer) {
    const workbook = XLSX.read(new Uint8Array(arrayBuffer), {type: 'array'});
    // Pick the first sheet, for example
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    // Convert to JSON
    return XLSX.utils.sheet_to_json(sheet, {header: 1}); // an array of rows; each row is an array of cell values
}

export function ExcelPreview({filePath}) {
    const [rows, setRows] = useState([]);

    useEffect(() => {
        if (!filePath) return;

        // 1) Construct your custom protocol URL
        const safeFileUrl = buildSafeFileUrl(filePath);

        // 2) Fetch the .xlsx data from the main process
        fetch(safeFileUrl)
            .then((response) => {
                if (!response.ok) {
                    throw new Error(`Fetch error: ${response.status} ${response.statusText}`);
                }
                return response.arrayBuffer();
            })
            .then((arrayBuffer) => {
                // 3) Parse the buffer with XLSX
                const data = parseExcel(arrayBuffer);
                setRows(data);
            })
            .catch((error) => {
                console.error('Error loading .xlsx:', error);
            });
    }, [filePath]);

    return (
        <div>
            <h3>Excel Preview (MUI Table):</h3>
            <TableContainer component={Paper} style={{maxHeight: 400}}>
                <Table stickyHeader size="small">
                    <TableHead>
                        {/* If you want to label columns, you can do something dynamic or just skip */}
                    </TableHead>
                    <TableBody>
                        {rows.map((row, rowIndex) => (
                            <TableRow key={rowIndex}>
                                {row.map((cell, cellIndex) => (
                                    <TableCell key={cellIndex}>
                                        {cell !== undefined ? cell.toString() : ''}
                                    </TableCell>
                                ))}
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </TableContainer>
        </div>
    );
}


const UnifiedDocViewer = ({filePath}) => {
    const [content, setContent] = useState(''); // For .docx content

    if (!filePath) {
        return <div>No document to display</div>;
    }

    // Determine file type (extension)
    const fileType = filePath.split('.').pop().toLowerCase();

    // ----- 1) DOCX via safe-file:// + Mammoth fetch -----
    useEffect(() => {
        if (fileType === 'docx') {
            const safeFileUrl = buildSafeFileUrl(filePath);
            console.log('DOCX about to fetch:', {filePath, safeFileUrl});

            fetch(safeFileUrl)
                .then((response) => response.arrayBuffer())
                .then((buffer) => Mammoth.extractRawText({arrayBuffer: buffer}))
                .then((result) => setContent(result.value))
                .catch((err) => console.error('Error loading .docx:', err));
        }
    }, [fileType, filePath]);


    // ----- 2) Images => file:// -----
    if (['png', 'jpg', 'jpeg', 'gif', 'bmp', 'webp'].includes(fileType)) {
        const fileUrl = buildFileUrl(filePath);
        return (
            <img
                src={fileUrl}
                alt="Preview"
                style={{width: '100%', height: 'auto', border: 'none'}}
            />
        );
    }

    // ----- 3) Video => file:// -----
    if (['mp4', 'webm', 'ogg'].includes(fileType)) {
        const fileUrl = buildFileUrl(filePath);
        return (
            <video
                controls
                style={{width: '100%', height: 'auto', border: 'none'}}
            >
                <source src={fileUrl} type={`video/${fileType}`}/>
                Your browser does not support video playback.
            </video>
        );
    }

    // ----- 4) Audio => file:// -----
    if (['mp3', 'wav', 'ogg'].includes(fileType)) {
        const fileUrl = buildFileUrl(filePath);
        return (
            <audio controls style={{width: '100%'}}>
                <source src={fileUrl} type={`audio/${fileType}`}/>
                Your browser does not support audio playback.
            </audio>
        );
    }

    // ----- 5) PDF => still safe-file:// (optional) -----
    if (fileType === 'pdf') {
        const pdfUrl = buildFileUrl(filePath);

        return (
            <Worker workerUrl="https://unpkg.com/pdfjs-dist@3.11.174/build/pdf.worker.min.js">
                <Viewer fileUrl={pdfUrl}/>
            </Worker>
        );
    }


    // ----- 6) DOCX => show extracted text from Mammoth -----
    if (fileType === 'docx') {
        return <div>{content}</div>;
    }

    // Excel, PowerPoint, fallback...
    if (fileType === 'xlsx') {
        return <ExcelPreview filePath={filePath}/>;

    }
    if (fileType === 'pptx') {
        return <PptxPreview filePath={filePath}/>;
    }

    return <div>Unsupported file type</div>;
};

export default UnifiedDocViewer;
