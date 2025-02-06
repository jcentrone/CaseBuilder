import React, {useEffect, useRef} from 'react';
import * as THREE from 'three';
import {useFrame} from '@react-three/fiber';

function InstancedPoints({nodes}) {
    // Create a ref for the instanced mesh
    const meshRef = useRef();
    // Dummy object to help set the matrix for each instance
    const dummy = new THREE.Object3D();

    useEffect(() => {
        if (nodes.length === 0) return;
        // For each node, update the dummy object and then the instance matrix
        nodes.forEach((node, i) => {
            const {position} = node; // Assume position is an array like [x, y, z]
            dummy.position.set(...position);
            // Optionally, set rotation or scale here if needed
            dummy.updateMatrix();
            meshRef.current.setMatrixAt(i, dummy.matrix);
        });
        // Notify Three.js that the instance matrix needs an update
        meshRef.current.instanceMatrix.needsUpdate = true;
    }, [nodes]);

    // Optionally, you can animate or update instances in the useFrame hook
    useFrame(() => {
        // For dynamic scenes you might update instance matrices here
    });

    return (
        <instancedMesh ref={meshRef} args={[null, null, nodes.length]}>
            <sphereGeometry args={[0.1, 16, 16]}/>
            <meshStandardMaterial color="blue"/>
        </instancedMesh>
    );
}

export default InstancedPoints;
