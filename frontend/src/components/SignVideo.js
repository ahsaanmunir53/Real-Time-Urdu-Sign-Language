import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Video } from 'lucide-react';
import "./SignVideo.css";

const SignVideo = () => {
  const [selectedWord, setSelectedWord] = useState("");
  const [videoSrc, setVideoSrc] = useState("");

  // Urdu word to Video filename mapping
  const videoMap = {
    "تم/آپ": "Tum.mp4", "اہم": "Ahm.mp4", "آو":"Ao.mp4", "اچھا":"Acha.mp4",
    "بند کرو":"Band kro.mp4", "بھاری":"Bhari.mp4", "بھوکے ہو":"Bhoka ho.mp4",
    "بولنا":"Bolna.mp4", "چاہتے ":"chahta ho.mp4", "دیر سے":"Dair-sa.mp4",
    "دکھنا":"Dakhna.mp4", "دروازہ":"Darwaza.mp4", "انگریزی":"English.mp4",
    "غیر ملکی":"gair-mulki.mp4", "ہاں":"han.mp4", "ہو":"ho.mp4",
    "ہوشیar":"hoshair.mp4", "انتہائی":"intahai.mp4", "جلدی":"jaldi.mp4",
    "خبردار":"khabardar.mp4",
  };

  const [isOpen, setIsOpen] = useState(false);

  const handleSelect = (word) => {
    setSelectedWord(word);
    setVideoSrc(videoMap[word] ? `/videos/${videoMap[word]}` : "");
    setIsOpen(false);
  };

  // Voice output - calls backend TTS API
  const speakWord = async (text) => {
    if (!text) return;
    try {
      const response = await fetch("http://127.0.0.1:8000/text-to-speech", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      if (!response.ok) throw new Error("TTS API error");
      const blob = await response.blob();
      const audioUrl = URL.createObjectURL(blob);
      const audio = new Audio(audioUrl);
      audio.play();
    } catch (err) {
      console.error("Voice error:", err);
    }
  };

  return (
    <div className="video-dark-card">
      <div className="selection-sidebar" onMouseLeave={() => setIsOpen(false)}>
        <h3 className="sidebar-title">اردو لغت</h3>
        <div className="custom-dropdown">
          <div 
            className={`dropdown-trigger ${isOpen ? 'active-trigger' : ''}`} 
            onClick={() => setIsOpen(!isOpen)}
          >
            <span className="arrow">▾</span>
            <span>{selectedWord || "لفظ منتخب کریں"}</span>
          </div>
          {isOpen && (
            <div className="dropdown-menu">
              <div className="dropdown-item placeholder" onClick={() => handleSelect("")}>
                لفظ منتخب کریں
              </div>
              {Object.keys(videoMap).map((word) => (
                <div 
                  key={word} 
                  className={`dropdown-item ${selectedWord === word ? 'active' : ''}`}
                  onClick={() => handleSelect(word)}
                >
                  {word}
                </div>
              ))}
            </div>
          )}
        </div>
        
        <AnimatePresence mode="wait">
          {selectedWord && (
            <motion.div 
              key={selectedWord}
              className="word-info"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
            >
              <span className="info-label">Selected Word:</span>
              <h2 className="info-val">{selectedWord}</h2>
              <button className="speak-btn-tts" onClick={() => speakWord(selectedWord)}>🔊 Play Voice</button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="video-viewport">
        <AnimatePresence mode="wait">
          {videoSrc ? (
            <motion.div 
              key={videoSrc}
              className="video-player-wrapper"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.5, type: "spring" }}
            >
              {/* Dynamic Laser Scanning Line */}
              <div className="laser-scanner-line"></div>
              
              <video 
                key={videoSrc} 
                autoPlay 
                loop 
                muted 
                className="sign-video-player"
              >
                <source src={videoSrc} type="video/mp4" />
                Your browser does not support the video tag.
              </video>

            </motion.div>
          ) : (
            <motion.div 
              key="placeholder"
              className="dark-placeholder"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.5 }}
            >
              <div className="hologram-container">
                <div className="hologram-scanner-circle"></div>
                <div className="hologram-projector-cone"></div>
                <motion.div 
                  className="hologram-core"
                  animate={{ y: [0, -10, 0] }}
                  transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
                >
                  <Video size={40} className="hologram-lucide-icon" />
                </motion.div>
              </div>
              <h3 className="hologram-title">Awaiting Holographic Input</h3>
              <p className="hologram-text">Select an Urdu sign language word from the dictionary list to activate live video feed</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default SignVideo;