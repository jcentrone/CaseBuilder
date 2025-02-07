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
    Divider,
    FormControl,
    IconButton,
    InputLabel,
    MenuItem,
    Select,
    Typography
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import * as THREE from 'three';
import LawChunkModal from '../components/LawChunkModal';

// IndexedDB constants
const DB_NAME = "LawChunksDB";
const DB_VERSION = 1;
const STORAGE_KEY = "law_chunks";
const VERSION_KEY = "law_chunks_version";

// MenuProps for scrollable dropdowns
const MenuProps = {
    PaperProps: {
        style: {
            maxHeight: 300,
            width: 250,
        },
    },
};

// If the backend provides a cluster_color, we use it; otherwise, compute fallback using position.
function getOctantColor(position) {
    const [x, y, z] = position;
    let color;
    if (x >= 0 && y >= 0 && z >= 0) {
        color = 0xff0000;
    } else if (x < 0 && y >= 0 && z >= 0) {
        color = 0x00ff00;
    } else if (x >= 0 && y < 0 && z >= 0) {
        color = 0x0000ff;
    } else if (x < 0 && y < 0 && z >= 0) {
        color = 0xffff00;
    } else if (x >= 0 && y >= 0 && z < 0) {
        color = 0xff00ff;
    } else if (x < 0 && y >= 0 && z < 0) {
        color = 0x00ffff;
    } else if (x >= 0 && y < 0 && z < 0) {
        color = 0xffa500;
    } else if (x < 0 && y < 0 && z < 0) {
        color = 0x800080;
    } else {
        color = 0xffffff;
    }
    return color;
}

// Helper: Compute Euclidean distance between two 3D points.
function distance(pos1, pos2) {
    return Math.sqrt(
        (pos1[0] - pos2[0]) ** 2 +
        (pos1[1] - pos2[1]) ** 2 +
        (pos1[2] - pos2[2]) ** 2
    );
}

// Compute edges from a list of nodes.
// Here, for each node we connect to its nearest neighbor (if within a threshold).
function computeEdges(nodes) {
    const edges = [];
    const threshold = 1.0; // Adjust as needed
    for (let i = 0; i < nodes.length; i++) {
        let bestDistance = Infinity;
        let bestIndex = -1;
        for (let j = 0; j < nodes.length; j++) {
            if (i === j) continue;
            const d = distance(nodes[i].position, nodes[j].position);
            if (d < bestDistance) {
                bestDistance = d;
                bestIndex = j;
            }
        }
        if (bestIndex !== -1 && bestDistance < threshold) {
            edges.push({from: nodes[i].id, to: nodes[bestIndex].id});
        }
    }
    return edges;
}

// InstancedPoints renders nodes as spheres using a single instancedMesh.
// We use the backend color (cluster_color) if available.
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
            // Use provided cluster_color or fallback.
            const col = node.cluster_color ? node.cluster_color : getOctantColor(node.position);
            const color = new THREE.Color(col);
            color.toArray(colorArray, i * 3);
            console.log(`Node ${node.id} assigned color: ${col.toString(16)}`);
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
                console.log("InstancedMesh onClick event:", event);
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
            <meshStandardMaterial
                vertexColors={true}
                color={0xffffff}
                roughness={0.5}
                metalness={0.1}
                transparent={true}
                opacity={0.8}
            />
        </instancedMesh>
    );
}

// EdgeLines draws connecting lines between nodes.
// We override its raycast to prevent interference.
function EdgeLines({edges, nodesMap}) {
    const points = [];
    edges.forEach(edge => {
        const fromPos = nodesMap[edge.from];
        const toPos = nodesMap[edge.to];
        if (fromPos && toPos) {
            points.push(...fromPos);
            points.push(...toPos);
        }
    });
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(points, 3));
    geometry.raycast = () => {
    }; // Disable raycasting on edges
    return (
        <lineSegments geometry={geometry} renderOrder={3}>
            <lineBasicMaterial attach="material" color={0x888888} linewidth={1}/>
        </lineSegments>
    );
}

// ControlPanel with zoom in, zoom out, and reset buttons.
function ControlPanel({onZoomIn, onZoomOut, onReset}) {
    return (
        <Box sx={{
            position: 'absolute',
            bottom: 20,
            left: '50%',
            transform: 'translateX(-50%)',
            display: 'flex',
            gap: 1,
            zIndex: 20
        }}>
            <Button variant="contained" onClick={onZoomIn}>Zoom In</Button>
            <Button variant="contained" onClick={onZoomOut}>Zoom Out</Button>
            <Button variant="contained" onClick={onReset}>Reset</Button>
        </Box>
    );
}

// Main LawChunkViewer component.
const LawChunkViewer = () => {
    const [allNodes, setAllNodes] = useState([]);
    const [filteredNodes, setFilteredNodes] = useState([]);
    const [filteredEdges, setFilteredEdges] = useState([]);
    const [edges, setEdges] = useState([]);
    const [selectedNode, setSelectedNode] = useState(null);
    const [loading, setLoading] = useState(true);
    // Multi-select filters for chapters and titles.
    const [selectedChapters, setSelectedChapters] = useState([]);
    const [selectedTitles, setSelectedTitles] = useState([]);
    const [modalOpen, setModalOpen] = useState(false);
    const orbitControlsRef = useRef();

    // Fetch data from IndexedDB/backend.
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
                    processLawChunks(cachedData);
                } else {
                    const res = await fetch('http://localhost:8000/api/law-chunks.json');
                    const data = await res.json();
                    console.log("Fetched data length:", data.nodes.length);
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

    // Process fetched data.
    const processLawChunks = (data) => {
        if (data && data.nodes && data.nodes.length > 0) {
            const nodes = data.nodes.map((d) => ({
                id: d.id,
                text: d.path, // Use path as summary.
                position: d.position,
                title_label: d.title_label,
                chapter_number: d.chapter_number,
                section_number: d.section_number,
                subsection_label: d.subsection_label,
                part_label: d.part_label,
                section_title: d.section_title,
                relative_link: d.relative_link,
                cluster_color: d.cluster_color ? d.cluster_color : getOctantColor(d.position)
            }));
            setAllNodes(nodes);
            setFilteredNodes(nodes);
            if (data.edges) {
                setEdges(data.edges);
            }
        }
    };

    // Update filtering based on selected chapters and titles.
    useEffect(() => {
        const filtered = allNodes.filter(n =>
            (selectedChapters.length === 0 || selectedChapters.includes(n.chapter_number)) &&
            (selectedTitles.length === 0 || selectedTitles.includes(n.title_label))
        );
        setFilteredNodes(filtered);
    }, [selectedChapters, selectedTitles, allNodes]);

    // Recompute edges for the currently filtered nodes.
    useEffect(() => {
        const newEdges = computeEdges(filteredNodes);
        setFilteredEdges(newEdges);
    }, [filteredNodes]);

    // Compute unique values for filtering.
    const uniqueChapters = Array.from(new Set(allNodes.map(n => n.chapter_number))).sort((a, b) => Number(a) - Number(b));
    const uniqueTitles = Array.from(new Set(allNodes.map(n => n.title_label))).sort();

    // Build mapping from node id to its position (using filteredNodes).
    const nodesMap = {};
    filteredNodes.forEach(n => {
        nodesMap[n.id] = n.position;
    });

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

    const handleClearFilters = () => {
        setSelectedChapters([]);
        setSelectedTitles([]);
    };

    return (
        <Box sx={{display: 'flex', height: '100%', overflow: 'hidden', position: 'relative'}}>
            {/* Sidebar for filtering */}
            <Box sx={{width: 250, borderRight: 1, borderColor: 'divider', p: 2, backgroundColor: 'background.paper'}}>
                <Typography variant="h6">Filters</Typography>
                <Button variant="outlined" onClick={handleClearFilters} fullWidth sx={{mt: 1, mb: 1}}>
                    Clear Filters
                </Button>
                <Divider/>
                <Typography variant="h6" sx={{mt: 2}}>Filter by Chapter</Typography>
                <FormControl fullWidth sx={{mt: 2}}>
                    <InputLabel id="chapter-select-label">Chapters</InputLabel>
                    <Select
                        labelId="chapter-select-label"
                        multiple
                        value={selectedChapters}
                        label="Chapters"
                        onChange={(e) => setSelectedChapters(e.target.value)}
                        renderValue={(selected) => selected.join(', ')}
                        MenuProps={MenuProps}
                    >
                        {uniqueChapters.map(ch => (
                            <MenuItem key={ch} value={ch}>
                                {ch}
                            </MenuItem>
                        ))}
                    </Select>
                </FormControl>
                <Typography variant="h6" sx={{mt: 4}}>Filter by Title</Typography>
                <FormControl fullWidth sx={{mt: 2}}>
                    <InputLabel id="title-select-label">Title</InputLabel>
                    <Select
                        labelId="title-select-label"
                        multiple
                        value={selectedTitles}
                        label="Title"
                        onChange={(e) => setSelectedTitles(e.target.value)}
                        renderValue={(selected) => selected.join(', ')}
                        MenuProps={MenuProps}
                    >
                        {uniqueTitles.map(title => (
                            <MenuItem key={title} value={title}>
                                {title}
                            </MenuItem>
                        ))}
                    </Select>
                </FormControl>
            </Box>

            {/* Main 3D viewer area */}
            <Box sx={{flex: 1, position: 'relative'}}>
                {loading && (
                    <Box sx={{
                        position: 'absolute',
                        display: 'flex',
                        justifyContent: 'center',
                        flexDirection: 'column',
                        gap: 2,
                        top: '50%',
                        left: '50%',
                        transform: 'translate(-50%, -50%)'
                    }}>
                        <CircularProgress/>
                        <Typography>Loading law chunks...</Typography>
                    </Box>
                )}

                {!loading && selectedNode && (
                    <Card sx={{
                        position: 'absolute',
                        top: 20,
                        right: 20,
                        maxWidth: 350,
                        backgroundColor: 'background.paper',
                        boxShadow: 3,
                        borderRadius: 2,
                        zIndex: 10
                    }}>
                        <CardContent sx={{color: 'text.primary'}}>
                            <Typography variant="h6" sx={{fontWeight: 'bold'}}>
                                {selectedNode.section_title}
                            </Typography>
                            <Typography variant="body2" sx={{mt: 1, color: 'text.secondary'}}>
                                {selectedNode.text}
                            </Typography>
                            <Button variant="contained" color="primary" sx={{mt: 2}} onClick={() => setModalOpen(true)}>
                                View Law
                            </Button>
                        </CardContent>
                        <IconButton sx={{position: 'absolute', top: 5, right: 5}} onClick={() => setSelectedNode(null)}>
                            <CloseIcon/>
                        </IconButton>
                    </Card>
                )}

                <Canvas style={{width: '100%', height: '100%'}} camera={{position: [0, 0, 5]}}>
                    <ambientLight intensity={0.6}/>
                    <directionalLight position={[10, 10, 10]} intensity={0.8}/>
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
                    {filteredEdges.length > 0 && <EdgeLines edges={filteredEdges} nodesMap={nodesMap}/>}
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
