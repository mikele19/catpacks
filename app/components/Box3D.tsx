"use client";

import { useRef, useMemo } from "react";
import { Canvas, useFrame, useLoader } from "@react-three/fiber";
import { Center, Environment } from "@react-three/drei"; // Aggiunto Environment per luci migliori
import * as THREE from "three";
import { PLYLoader } from "three-stdlib";

function Model({ url, color }: { url: string; color: string }) {
  const meshRef = useRef<THREE.Mesh>(null);
  
  const geometry = useLoader(PLYLoader, url);

  // Ricalcola le normali per evitare l'effetto "nero/rotto"
  useMemo(() => {
    geometry.computeVertexNormals();
  }, [geometry]);

  useFrame((_, delta) => {
    if (meshRef.current) {
      meshRef.current.rotation.y += delta * 1.5;
    }
  });

  return (
    // MODIFICA 1: Scala aumentata drasticamente (da 1.8 a 35)
    // Se sono ancora piccoli, prova 50 o 100. Se enormi, scendi a 10.
    <mesh ref={meshRef} geometry={geometry} scale={35}> 
      
      {/* MODIFICA 2: side={THREE.DoubleSide} risolve la trasparenza */}
      <meshStandardMaterial 
        color={color} 
        roughness={0.4} 
        metalness={0.6}
        side={THREE.DoubleSide} 
      />
    </mesh>
  );
}

export default function Box3D({ path, colorHex }: { path: string; colorHex: string }) {
  return (
    <div className="w-full h-full relative">
      <Canvas camera={{ position: [0, 2, 6], fov: 45 }} gl={{ alpha: true, antialias: true }}>
        {/* Luci potenziate per vedere bene i colori */}
        <ambientLight intensity={1.5} />
        <spotLight position={[10, 10, 10]} angle={0.3} penumbra={1} intensity={3} />
        <pointLight position={[-10, -5, -10]} intensity={2} color="white" />
        
        {/* Riflessi ambientali per far brillare il materiale */}
        <Environment preset="city" />

        <Center>
          <Model url={path} color={colorHex} />
        </Center>
      </Canvas>
    </div>
  );
}