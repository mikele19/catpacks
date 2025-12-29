"use client";

import { useRef, useState, useMemo } from "react";
import { Canvas, useFrame, useLoader } from "@react-three/fiber";
import { Center, OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import { PLYLoader } from "three-stdlib";

function Model({ url, color }: { url: string; color: string }) {
  const meshRef = useRef<THREE.Mesh>(null);
  
  // Carica la geometria PLY
  const geometry = useLoader(PLYLoader, url);

  // Calcola le normali per la luce (se il PLY non le ha)
  useMemo(() => geometry.computeVertexNormals(), [geometry]);

  // Rotazione continua
  useFrame((_, delta) => {
    if (meshRef.current) {
      meshRef.current.rotation.y += delta * 1.5; // Velocità rotazione
    }
  });

  return (
    <mesh ref={meshRef} geometry={geometry} scale={1.8}> {/* Scala 1.8x, aggiustala se serve */}
      {/* Materiale "Toon" lucido che prende il colore della cassa */}
      <meshStandardMaterial 
        color={color} 
        roughness={0.3} 
        metalness={0.5} 
      />
    </mesh>
  );
}

export default function Box3D({ path, colorHex }: { path: string; colorHex: string }) {
  return (
    <div className="w-full h-full relative">
      <Canvas camera={{ position: [0, 2, 5], fov: 50 }} gl={{ alpha: true }}>
        {/* Luci per far sembrare l'oggetto 3D e non piatto */}
        <ambientLight intensity={0.7} />
        <spotLight position={[10, 10, 10]} angle={0.15} penumbra={1} intensity={2} />
        <pointLight position={[-10, -10, -10]} intensity={1} />
        
        <Center>
          {/* Se il file non è ancora caricato, React gestisce l'attesa */}
          <Model url={path} color={colorHex} />
        </Center>
      </Canvas>
    </div>
  );
}