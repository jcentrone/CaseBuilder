import React, {useEffect, useState} from 'react';
import Mammoth from 'mammoth'; // For Word documents
import {Viewer, Worker} from '@react-pdf-viewer/core';
import '@react-pdf-viewer/core/lib/styles/index.css';

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
        return <div>Excel file rendering is under development</div>;
    }
    if (fileType === 'pptx') {
        return <div>PowerPoint file rendering is under development</div>;
    }

    return <div>Unsupported file type</div>;
};

export default UnifiedDocViewer;
