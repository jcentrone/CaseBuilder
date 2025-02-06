import React, {useEffect, useRef, useState} from 'react';
import {Canvas} from '@react-three/fiber';
import {OrbitControls} from '@react-three/drei';
import {openDB} from 'idb';
import {Box, Button, Card, CardContent, CircularProgress, IconButton, Typography} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import * as THREE from 'three';

const DB_NAME = "LawChunksDB";
const DB_VERSION = 1;
const STORAGE_KEY = "law_chunks";
const VERSION_KEY = "law_chunks_version";

// Returns one of 8 colors based on the sign of x, y, z (i.e. the octant)
function getOctantColor(position) {
    const [x, y, z] = position;
    let color;
    if (x >= 0 && y >= 0 && z >= 0) {
        color = 0xff0000; // red
        console.log(`getOctantColor: [${x}, ${y}, ${z}] => red`);
    } else if (x < 0 && y >= 0 && z >= 0) {
        color = 0x00ff00; // green
        console.log(`getOctantColor: [${x}, ${y}, ${z}] => green`);
    } else if (x >= 0 && y < 0 && z >= 0) {
        color = 0x0000ff; // blue
        console.log(`getOctantColor: [${x}, ${y}, ${z}] => blue`);
    } else if (x < 0 && y < 0 && z >= 0) {
        color = 0xffff00; // yellow
        console.log(`getOctantColor: [${x}, ${y}, ${z}] => yellow`);
    } else if (x >= 0 && y >= 0 && z < 0) {
        color = 0xff00ff; // magenta
        console.log(`getOctantColor: [${x}, ${y}, ${z}] => magenta`);
    } else if (x < 0 && y >= 0 && z < 0) {
        color = 0x00ffff; // cyan
        console.log(`getOctantColor: [${x}, ${y}, ${z}] => cyan`);
    } else if (x >= 0 && y < 0 && z < 0) {
        color = 0xffa500; // orange
        console.log(`getOctantColor: [${x}, ${y}, ${z}] => orange`);
    } else if (x < 0 && y < 0 && z < 0) {
        color = 0x800080; // purple
        console.log(`getOctantColor: [${x}, ${y}, ${z}] => purple`);
    } else {
        color = 0xffffff;
        console.log(`getOctantColor: [${x}, ${y}, ${z}] => default white`);
    }
    return color;
}

// InstancedPoints renders all nodes using a single instancedMesh with per-instance colors.
function InstancedPoints({nodes, onClickInstance}) {
    const meshRef = useRef();
    const dummy = new THREE.Object3D();

    useEffect(() => {
        if (!meshRef.current) return;
        // Create an array to store colors (3 components per instance)
        const colorArray = new Float32Array(nodes.length * 3);
        nodes.forEach((node, i) => {
            // Set transformation for instance i
            dummy.position.set(...node.position);
            dummy.updateMatrix();
            meshRef.current.setMatrixAt(i, dummy.matrix);

            // Compute the color from node.color (a hex number)
            const color = new THREE.Color(node.color);
            color.toArray(colorArray, i * 3);
            console.log(`Node ${node.id} assigned color: ${node.color.toString(16)}`);
        });
        meshRef.current.instanceMatrix.needsUpdate = true;
        // Attach the color attribute under the name "color"
        meshRef.current.geometry.setAttribute(
            'color',
            new THREE.InstancedBufferAttribute(colorArray, 3)
        );
        console.log("Color attribute:", meshRef.current.geometry.getAttribute('color'));
    }, [nodes]);

    return (
        <instancedMesh
            ref={meshRef}
            args={[null, null, nodes.length]}
            onClick={(event) => {
                event.stopPropagation();
                if (onClickInstance) {
                    onClickInstance(event.instanceId);
                }
            }}
            onPointerOver={() => {
                document.body.style.cursor = 'pointer';
            }}
            onPointerOut={() => {
                document.body.style.cursor = 'auto';
            }}
        >
            <sphereGeometry args={[0.1, 16, 16]}/>
            <meshStandardMaterial vertexColors={true} color={0xffffff}/>
        </instancedMesh>
    );
}

// A simple control panel component with zoom and reset buttons
function ControlPanel({onZoomIn, onZoomOut, onReset}) {
    return (
        <Box
            sx={{
                position: 'absolute',
                bottom: 20,
                left: '50%',
                transform: 'translateX(-50%)',
                display: 'flex',
                gap: 1,
                zIndex: 20,
            }}
        >
            <Button variant="contained" onClick={onZoomIn}>Zoom In</Button>
            <Button variant="contained" onClick={onZoomOut}>Zoom Out</Button>
            <Button variant="contained" onClick={onReset}>Reset</Button>
        </Box>
    );
}

// The main viewer component.
const LawChunkViewer = () => {
    const [allNodes, setAllNodes] = useState([]);
    const [selectedNode, setSelectedNode] = useState(null);
    const [loading, setLoading] = useState(true);
    // Use a ref for OrbitControls so we can programmatically control the camera.
    const orbitControlsRef = useRef();

    useEffect(() => {
        async function fetchData() {
            const db = await openDB(DB_NAME, DB_VERSION, {
                upgrade(db) {
                    if (!db.objectStoreNames.contains(STORAGE_KEY)) {
                        db.createObjectStore(STORAGE_KEY);
                    }
                }
            });
            try {
                const versionRes = await fetch('http://localhost:8000/api/law-chunk-metadata');
                const {version: latestVersion} = await versionRes.json();
                console.log("Latest version from metadata:", latestVersion);

                const cachedVersion = await db.get(STORAGE_KEY, VERSION_KEY);
                const cachedData = await db.get(STORAGE_KEY, STORAGE_KEY);
                console.log("Cached version:", cachedVersion);
                console.log("Cached data:", cachedData);

                if (cachedVersion === latestVersion && cachedData) {
                    console.log("Using cached law_chunks data.");
                    processLawChunks(cachedData);
                } else {
                    console.log("Fetching updated law_chunks data...");
                    const res = await fetch('http://localhost:8000/api/law-chunks.json');
                    const data = await res.json();
                    console.log("Fetched data length:", data.length);
                    await db.put(STORAGE_KEY, data, STORAGE_KEY);
                    await db.put(STORAGE_KEY, latestVersion, VERSION_KEY);
                    processLawChunks(data);
                }
            } catch (error) {
                console.error("Failed to fetch law_chunks:", error);
            } finally {
                setLoading(false);
            }
        }

        fetchData();
    }, []);

    // Process the reduced data by assigning each node an octant-based color.
    const processLawChunks = (data) => {
        if (data && data.length > 0) {
            const nodes = data.map((d) => ({
                id: d.id,
                text: d.path,
                position: d.position, // Precomputed 3D coordinates
                color: getOctantColor(d.position)
            }));
            setAllNodes(nodes);
        }
    };

    // Control functions using the OrbitControls ref.
    const handleZoomIn = () => {
        // Use orbitControlsRef.current.object to access the camera.
        if (orbitControlsRef.current) {
            const cam = orbitControlsRef.current.object;
            cam.position.z = Math.max(cam.position.z - 1, 1);
            orbitControlsRef.current.update();
        }
    };

    const handleZoomOut = () => {
        if (orbitControlsRef.current) {
            const cam = orbitControlsRef.current.object;
            cam.position.z += 1;
            orbitControlsRef.current.update();
        }
    };

    const handleReset = () => {
        if (orbitControlsRef.current) {
            const cam = orbitControlsRef.current.object;
            cam.position.set(0, 0, 5);
            orbitControlsRef.current.target.set(0, 0, 0);
            orbitControlsRef.current.update();
        }
    };

    return (
        <Box
            sx={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                width: '100%', // Fill parent's width
                height: '100%', // Fill parent's height
                overflow: 'hidden',
                position: 'relative'
            }}
        >
            {loading && (
                <Box sx={{position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)'}}>
                    <CircularProgress/>
                    <Typography>Loading law chunks...</Typography>
                </Box>
            )}

            {!loading && selectedNode && (
                <Card
                    sx={{
                        position: 'absolute',
                        top: 20,
                        right: 20,
                        maxWidth: 350,
                        backgroundColor: 'background.paper',
                        boxShadow: 3,
                        borderRadius: 2,
                        zIndex: 10
                    }}
                >
                    <CardContent sx={{color: 'text.primary'}}>
                        <Typography variant="h6" sx={{fontWeight: 'bold'}}>
                            Law Chunk #{selectedNode.id}
                        </Typography>
                        <Typography variant="body2" sx={{mt: 1, color: 'text.secondary'}}>
                            {selectedNode.text}
                        </Typography>
                    </CardContent>
                    <IconButton
                        sx={{position: 'absolute', top: 5, right: 5}}
                        onClick={() => setSelectedNode(null)}
                    >
                        <CloseIcon/>
                    </IconButton>
                </Card>
            )}

            {!loading && (
                <>
                    <Canvas style={{width: '100%', height: '100%'}} camera={{position: [0, 0, 5]}}>
                        <ambientLight/>
                        <pointLight position={[10, 10, 10]}/>
                        <OrbitControls ref={orbitControlsRef}/>
                        <axesHelper args={[5]}/>
                        {allNodes.length > 0 && (
                            <InstancedPoints
                                nodes={allNodes}
                                onClickInstance={(instanceId) => {
                                    const node = allNodes[instanceId];
                                    console.log("Clicked node:", node);
                                    setSelectedNode(node);
                                }}
                            />
                        )}
                    </Canvas>
                    <ControlPanel onZoomIn={handleZoomIn} onZoomOut={handleZoomOut} onReset={handleReset}/>
                </>
            )}
        </Box>
    );
};

export default LawChunkViewer;
