"use client";

import * as React from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Float } from "@react-three/drei";
import * as THREE from "three";

/* A single stylised book: a flat box with a contrasting "pages" edge. */
function Book({
  position,
  rotation,
  color,
  scale = 1,
}: {
  position: [number, number, number];
  rotation: [number, number, number];
  color: string;
  scale?: number;
}) {
  return (
    <Float speed={1.4} rotationIntensity={0.5} floatIntensity={1.1}>
      <group position={position} rotation={rotation} scale={scale}>
        {/* Cover */}
        <mesh castShadow receiveShadow>
          <boxGeometry args={[1.4, 2, 0.28]} />
          <meshStandardMaterial
            color={color}
            roughness={0.35}
            metalness={0.45}
            emissive={color}
            emissiveIntensity={0.18}
          />
        </mesh>
        {/* Pages */}
        <mesh position={[0.04, 0, 0]}>
          <boxGeometry args={[1.32, 1.9, 0.3]} />
          <meshStandardMaterial color="#f4ecd8" roughness={0.9} />
        </mesh>
      </group>
    </Float>
  );
}

function Particles({ count = 240 }: { count?: number }) {
  const ref = React.useRef<THREE.Points>(null);
  const positions = React.useMemo(() => {
    const arr = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      arr[i * 3] = (Math.random() - 0.5) * 20;
      arr[i * 3 + 1] = (Math.random() - 0.5) * 14;
      arr[i * 3 + 2] = (Math.random() - 0.5) * 12;
    }
    return arr;
  }, [count]);

  useFrame((_, delta) => {
    if (ref.current) ref.current.rotation.y += delta * 0.02;
  });

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          args={[positions, 3]}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.045}
        color="#caa24a"
        transparent
        opacity={0.6}
        sizeAttenuation
      />
    </points>
  );
}

const BOOKS: {
  position: [number, number, number];
  rotation: [number, number, number];
  color: string;
  scale: number;
}[] = [
  { position: [-3.2, 0.6, 0], rotation: [0.2, 0.5, -0.1], color: "#caa24a", scale: 1.1 },
  { position: [3, 1, -1], rotation: [-0.1, -0.4, 0.2], color: "#4aa3c9", scale: 0.95 },
  { position: [0.4, -1.4, 0.5], rotation: [0.3, 0.2, 0.15], color: "#7a4ac9", scale: 1.05 },
  { position: [-1.8, -1, -2], rotation: [-0.2, 0.8, -0.2], color: "#c97a4a", scale: 0.8 },
  { position: [2.2, -1.6, 1], rotation: [0.1, -0.7, 0.1], color: "#4ac98c", scale: 0.7 },
  { position: [-3.6, 2.2, -1.5], rotation: [0.25, 0.3, 0.2], color: "#c94a86", scale: 0.65 },
];

function Rig() {
  const { camera, pointer } = useThree();
  useFrame(() => {
    // Subtle parallax: ease the camera toward the cursor.
    camera.position.x += (pointer.x * 1.6 - camera.position.x) * 0.04;
    camera.position.y += (pointer.y * 1.0 - camera.position.y) * 0.04;
    camera.lookAt(0, 0, 0);
  });
  return null;
}

function Scene() {
  return (
    <>
      <ambientLight intensity={0.4} />
      <pointLight position={[6, 6, 6]} intensity={120} color="#ffd27a" />
      <pointLight position={[-8, -4, 2]} intensity={80} color="#4aa3c9" />
      <spotLight
        position={[0, 8, 4]}
        angle={0.5}
        penumbra={1}
        intensity={60}
        color="#caa24a"
      />
      {BOOKS.map((b, i) => (
        <Book key={i} {...b} />
      ))}
      <Particles />
      <Rig />
    </>
  );
}

export default function LibraryScene() {
  return (
    <Canvas
      camera={{ position: [0, 0, 9], fov: 45 }}
      dpr={[1, 2]}
      gl={{ antialias: true, alpha: true }}
      className="!absolute inset-0"
    >
      <Scene />
    </Canvas>
  );
}
