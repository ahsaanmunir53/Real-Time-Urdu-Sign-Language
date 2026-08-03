import React, { useState, useEffect, useRef } from "react";
import { Routes, Route } from "react-router-dom";
import Home from "./pages/Home";
import About from "./pages/About";
import Contact from "./pages/Contact";
import SignToText from "./pages/SignToText";
import TextToSign from "./pages/TextToSign";
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import { motion, useMotionValue, useSpring } from "framer-motion";
import NeuralHandBackground from "./components/NeuralHandBackground";

function App() {
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  // Spring physics for the ambient glow backdrop
  const springConfig = { damping: 30, stiffness: 120, mass: 1 };
  const cursorX = useSpring(mouseX, springConfig);
  const cursorY = useSpring(mouseY, springConfig);

  // Particles state & tracking
  const [particles, setParticles] = useState([]);
  const particleIdRef = useRef(0);
  const lastMousePos = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const handleMouseMove = (e) => {
      // Move global background spotlight glow
      mouseX.set(e.clientX);
      mouseY.set(e.clientY);

      // Check distance moved to avoid spawning too many overlapping particles when static
      const dx = e.clientX - lastMousePos.current.x;
      const dy = e.clientY - lastMousePos.current.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance > 8) { // Only spawn when mouse actually moves a minimum distance
        const newParticle = {
          id: particleIdRef.current++,
          x: e.clientX,
          y: e.clientY,
          size: Math.random() * 6 + 4, // Random size between 4px and 10px
          color: Math.random() > 0.5 ? "#00d4ff" : "#7000ff", // Neon Cyan or Purple
          vx: (Math.random() - 0.5) * 1.6, // Drift slightly horizontally
          vy: (Math.random() - 0.5) * 1.6 - 0.8, // Drift slightly upwards (sparkle drift)
          life: 1.0 // Scale/Opacity decays to 0
        };

        // Keep maximum 30 active particles to guarantee buttery-smooth 120 FPS performance
        setParticles((prev) => [...prev.slice(-30), newParticle]);
        lastMousePos.current = { x: e.clientX, y: e.clientY };
      }
    };

    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, [mouseX, mouseY]);

  // Buttery-smooth physics updates using requestAnimationFrame (GPU hardware optimized)
  useEffect(() => {
    let animId;
    const updateParticles = () => {
      setParticles((prev) => 
        prev
          .map((p) => ({
            ...p,
            x: p.x + p.vx,
            y: p.y + p.vy,
            life: p.life - 0.04 // Fades away in about 25 frames (~0.4s)
          }))
          .filter((p) => p.life > 0)
      );
      animId = requestAnimationFrame(updateParticles);
    };
    animId = requestAnimationFrame(updateParticles);
    return () => cancelAnimationFrame(animId);
  }, []);

  return (
    <div className="min-h-screen bg-[#050505] relative overflow-hidden">
      <NeuralHandBackground />
      <div className="bg-grid"></div>
      
      {/* Dynamic Ambient Spotlight Follower */}
      <motion.div 
        className="mouse-glow"
        style={{
          x: cursorX,
          y: cursorY,
          translateX: '-50%',
          translateY: '-50%'
        }}
      />

      {/* Cyber Neon Particle Sparkle Trail */}
      {particles.map((p) => (
        <div
          key={p.id}
          className="cursor-particle"
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: p.size,
            height: p.size,
            borderRadius: '50%',
            backgroundColor: p.color,
            boxShadow: `0 0 10px ${p.color}, 0 0 20px ${p.color}`,
            pointerEvents: 'none',
            zIndex: 9999,
            transform: `translate(${p.x - p.size / 2}px, ${p.y - p.size / 2}px) scale(${p.life})`,
            opacity: p.life,
            willChange: 'transform, opacity',
            transition: 'none'
          }}
        />
      ))}

      <Navbar />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/about" element={<About />} />
        <Route path="/contact" element={<Contact />} />
        <Route path="/sign-to-text" element={<SignToText />} />
        <Route path="/text-to-sign" element={<TextToSign />} />
      </Routes>
      <Footer />
    </div>
  );
}

export default App;