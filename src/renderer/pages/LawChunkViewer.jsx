import React, {useEffect, useRef, useState} from 'react';
import {Canvas} from '@react-three/fiber';
import {OrbitControls} from '@react-three/drei';
import {openDB} from 'idb';
import {
    Box,
    Button,
    Card,
    CardContent,
    CircularProgress,
    FormControl,
    IconButton,
    InputLabel,
    MenuItem,
    Select,
    Typography
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import * as THREE from 'three';
import LawChunkModal from '../components/LawChunkModal'; // Import the modal component

const DB_NAME = "LawChunksDB";
const DB_VERSION = 1;
const STORAGE_KEY = "law_chunks";
const VERSION_KEY = "law_chunks_version";

// (Include getOctantColor and InstancedPoints as in your previous code)

function getOctantColor(position) {
    const [x, y, z] = position;
    let color;
    if (x >= 0 && y >= 0 && z >= 0) {
        color = 0xff0000; // red
        // console.log(`getOctantColor: [${x}, ${y}, ${z}] => red`);
    } else if (x < 0 && y >= 0 && z >= 0) {
        color = 0x00ff00; // green
        // console.log(`getOctantColor: [${x}, ${y}, ${z}] => green`);
    } else if (x >= 0 && y < 0 && z >= 0) {
        color = 0x0000ff; // blue
        // console.log(`getOctantColor: [${x}, ${y}, ${z}] => blue`);
    } else if (x < 0 && y < 0 && z >= 0) {
        color = 0xffff00; // yellow
        // console.log(`getOctantColor: [${x}, ${y}, ${z}] => yellow`);
    } else if (x >= 0 && y >= 0 && z < 0) {
        color = 0xff00ff; // magenta
        // console.log(`getOctantColor: [${x}, ${y}, ${z}] => magenta`);
    } else if (x < 0 && y >= 0 && z < 0) {
        color = 0x00ffff; // cyan
        // console.log(`getOctantColor: [${x}, ${y}, ${z}] => cyan`);
    } else if (x >= 0 && y < 0 && z < 0) {
        color = 0xffa500; // orange
        // console.log(`getOctantColor: [${x}, ${y}, ${z}] => orange`);
    } else if (x < 0 && y < 0 && z < 0) {
        color = 0x800080; // purple
        // console.log(`getOctantColor: [${x}, ${y}, ${z}] => purple`);
    } else {
        color = 0xffffff;
        // console.log(`getOctantColor: [${x}, ${y}, ${z}] => default white`);
    }
    return color;
}

function InstancedPoints({nodes, onClickInstance}) {
    const meshRef = useRef();
    const dummy = new THREE.Object3D();

    useEffect(() => {
        if (!meshRef.current) return;
        const colorArray = new Float32Array(nodes.length * 3);
        nodes.forEach((node, i) => {
            dummy.position.set(...node.position);
            dummy.updateMatrix();
            meshRef.current.setMatrixAt(i, dummy.matrix);
            const color = new THREE.Color(node.color);
            color.toArray(colorArray, i * 3);
            console.log(`Node ${node.id} assigned color: ${node.color.toString(16)}`);
        });
        meshRef.current.instanceMatrix.needsUpdate = true;
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

const LawChunkViewer = () => {
    const [allNodes, setAllNodes] = useState([]);
    const [filteredNodes, setFilteredNodes] = useState([]);
    const [selectedNode, setSelectedNode] = useState(null);
    const [loading, setLoading] = useState(true);
    const [selectedChapter, setSelectedChapter] = useState('');
    const [selectedChapters, setSelectedChapters] = useState([]);
    const [modalOpen, setModalOpen] = useState(false);
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

    // When selectedChapters changes, update the filtered nodes.
    useEffect(() => {
        if (!selectedChapters || selectedChapters.length === 0) {
            setFilteredNodes(allNodes);
        } else {
            setFilteredNodes(allNodes.filter(n => selectedChapters.includes(n.chapter_number)));
        }
    }, [selectedChapters, allNodes]);

    // Compute unique chapter numbers and sort them.
    const uniqueDropDownChapters = Array.from(new Set(allNodes.map(n => n.chapter_number))).sort();

    const processLawChunks = (data) => {
        if (data && data.length > 0) {
            const nodes = data.map((d) => ({
                id: d.id,
                text: d.path,
                position: d.position,
                title_label: d.title_label,
                chapter_number: d.chapter_number,
                section_number: d.section_number,
                subsection_label: d.subsection_label,
                part_label: d.part_label,
                section_title: d.section_title,
                relative_link: d.relative_link,
                color: getOctantColor(d.position)
            }));
            setAllNodes(nodes);
            setFilteredNodes(nodes);
        }
    };

    useEffect(() => {
        if (!selectedChapter) {
            setFilteredNodes(allNodes);
        } else {
            setFilteredNodes(allNodes.filter(n => n.chapter_number === selectedChapter));
        }
    }, [selectedChapter, allNodes]);

    const handleZoomIn = () => {
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

    const uniqueChapters = Array.from(new Set(allNodes.map(n => n.chapter_number))).sort();

    return (
        <Box
            sx={{
                display: 'flex',
                height: '100%',
                overflow: 'hidden',
                position: 'relative'
            }}
        >
            {/* Sidebar for filtering */}
            <Box
                sx={{
                    width: 250,
                    borderRight: 1,
                    borderColor: 'divider',
                    p: 2,
                    backgroundColor: 'background.paper'
                }}
            >
                <Typography variant="h6">Filter by Chapter</Typography>
                <FormControl fullWidth sx={{mt: 2}}>
                    <InputLabel id="chapter-select-label">Chapter</InputLabel>
                    <Select
                        labelId="chapter-select-label"
                        value={selectedChapter}
                        label="Chapter"
                        onChange={(e) => setSelectedChapter(e.target.value)}
                    >
                        <MenuItem value="">
                            <em>All</em>
                        </MenuItem>
                        {uniqueChapters.map(ch => (
                            <MenuItem key={ch} value={ch}>{ch}</MenuItem>
                        ))}
                    </Select>
                </FormControl>
            </Box>

            {/* Main 3D viewer area */}
            <Box sx={{flex: 1, position: 'relative'}}>
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
                                {selectedNode.section_title}
                            </Typography>
                            <Typography variant="body2" sx={{mt: 1, color: 'text.secondary'}}>
                                {selectedNode.text}
                            </Typography>
                            <Button
                                variant="contained"
                                color="primary"
                                sx={{mt: 2}}
                                onClick={() => setModalOpen(true)}
                            >
                                View Law
                            </Button>
                        </CardContent>
                        <IconButton
                            sx={{position: 'absolute', top: 5, right: 5}}
                            onClick={() => setSelectedNode(null)}
                        >
                            <CloseIcon/>
                        </IconButton>
                    </Card>
                )}

                <Canvas style={{width: '100%', height: '100%'}} camera={{position: [0, 0, 5]}}>
                    <ambientLight/>
                    <pointLight position={[10, 10, 10]}/>
                    <OrbitControls ref={orbitControlsRef}/>
                    <axesHelper args={[5]}/>
                    {filteredNodes.length > 0 && (
                        <InstancedPoints
                            nodes={filteredNodes}
                            onClickInstance={(instanceId) => {
                                const node = filteredNodes[instanceId];
                                console.log("Clicked node:", node);
                                setSelectedNode(node);
                            }}
                        />
                    )}
                </Canvas>
                <ControlPanel onZoomIn={handleZoomIn} onZoomOut={handleZoomOut} onReset={handleReset}/>
            </Box>

            {/* Modal for full law text */}
            <LawChunkModal
                open={modalOpen}
                onClose={() => setModalOpen(false)}
                chunkId={selectedNode ? selectedNode.id : ''}
                sectionTitle={selectedNode ? selectedNode.section_title : ''}
            />
        </Box>
    );
};

export default LawChunkViewer;
