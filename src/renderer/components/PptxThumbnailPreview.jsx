import React, {useEffect, useState} from 'react';
import JSZip from 'jszip';

function buildSafeFileUrl(originalPath) {
    let normalizedPath = originalPath.replace(/\\/g, '/');
    normalizedPath = encodeURI(normalizedPath);
    return `safe-file:///${normalizedPath}`;
}

async function extractPptxThumbnail(arrayBuffer) {
    const zip = await JSZip.loadAsync(arrayBuffer);

    // Try .jpeg first
    let thumbnailFile = zip.file('docProps/thumbnail.jpeg');
    if (!thumbnailFile) {
        // Some files use .png
        thumbnailFile = zip.file('docProps/thumbnail.png');
    }
    if (!thumbnailFile) {
        return null; // No thumbnail found
    }

    // Get the raw image data as a Uint8Array
    const imgData = await thumbnailFile.async('uint8array');
    // Build a Blob, then an object URL
    const blob = new Blob([imgData], {type: 'image/jpeg'});
    // or 'image/png' if you detect .png
    const url = URL.createObjectURL(blob);
    return url;
}

export default function PptxThumbnailPreview({filePath}) {
    const [thumbnailUrl, setThumbnailUrl] = useState(null);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (!filePath) return;

        const safeFileUrl = buildSafeFileUrl(filePath);

        fetch(safeFileUrl)
            .then((response) => {
                if (!response.ok) {
                    throw new Error(`Fetch error: ${response.status} ${response.statusText}`);
                }
                return response.arrayBuffer();
            })
            .then((arrayBuffer) => extractPptxThumbnail(arrayBuffer))
            .then((url) => {
                if (url) {
                    setThumbnailUrl(url);
                } else {
                    setError('No thumbnail image found in docProps folder.');
                }
            })
            .catch((err) => {
                console.error('Error extracting PPTX thumbnail:', err);
                setError(err.message);
            });
    }, [filePath]);

    if (error) {
        return <div style={{color: 'red'}}>Error or no thumbnail: {error}</div>;
    }

    if (!thumbnailUrl) {
        return <div>Loading PPTX thumbnail...</div>;
    }

    // Render the thumbnail image
    return (
        <div style={{
            maxWidth: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
        }}>
            <img
                src={thumbnailUrl}
                alt="PPTX Thumbnail"
                style={{
                    maxWidth: '100%',
                    border: '1px solid #ccc',
                    borderRadius: '8px',
                }}
            />
        </div>
    );
}
