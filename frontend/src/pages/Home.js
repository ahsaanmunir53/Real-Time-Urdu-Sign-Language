import '../App.css'; // ✅ Correct path

import React, { useRef } from "react";

import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Stars, Text } from "@react-three/drei";
import { useNavigate } from "react-router-dom";
import * as THREE from "three";

function SpinningCube({ onClick }) {
  const ref = useRef();
  useFrame(() => {
    if (ref.current) {
      ref.current.rotation.x += 0.01;
      ref.current.rotation.y += 0.01;
    }
  });
  return (
    <mesh
      ref={ref}
      onClick={onClick}
      onPointerOver={() => (document.body.style.cursor = "pointer")}
      onPointerOut={() => (document.body.style.cursor = "default")}
    >
      <boxGeometry args={[2, 2, 2]} />
      <meshStandardMaterial
        color="#0ff"
        emissive="#00ffff"
        emissiveIntensity={1}
        metalness={0.8}
        roughness={0.2}
      />
    </mesh>
  );
}

function FloatingText() {
  const ref = useRef();
  useFrame(({ clock }) => {
    if (ref.current) {
      ref.current.position.y = Math.sin(clock.getElapsedTime() * 2) * 0.5 + 3;
    }
  });
  return (
    <Text
    ref={ref}
    position={[0, 3, 0]}
    fontSize={0.7}
    color="#00ffff"
    outlineColor="#0ff"
    outlineWidth={0.02}
    anchorX="center"
    anchorY="middle"
  >
    PSL Translator
  </Text>
  );
}

function Home() {
  const navigate = useNavigate();
  const handleCubeClick = () => {
    navigate("/sign-to-text");
  };

  return (
    
    <div style={{ height: "70vh",
     backgroundColor: "black" ,
     width: "100vw",
     overflow: "hidden",
    position: "relative",
     }}>
      <Canvas camera={{ position: [0, 0, 10], fov: 50 }}>
        <ambientLight intensity={0.5} />
        <directionalLight position={[5, 5, 5]} intensity={1} />
        <Stars radius={100} depth={50} count={5000} factor={4} fade />
        <SpinningCube onClick={handleCubeClick} />
        <FloatingText />
        <OrbitControls enableZoom={false} />
      </Canvas>
    </div>
  );
}

export default Home;
