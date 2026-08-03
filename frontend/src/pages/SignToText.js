import React, { useRef, useState, useEffect } from "react";
import { motion } from "framer-motion";
import "./SignToText.css";

function SignToText() {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const [recording, setRecording] = useState(false);
  const [prediction, setPrediction] = useState(null);
  const [confidence, setConfidence] = useState(null);
  const [loading, setLoading] = useState(false);

  // Voice output function - calls backend TTS API for Urdu speech
  const speakNow = async (text) => {
    if (!text || text.includes("not clear") || text.includes("Server error")) return;
    
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

  useEffect(() => {
    const initCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        streamRef.current = stream;
        if (videoRef.current) videoRef.current.srcObject = stream;
      } catch (err) { console.error("Camera error:", err); }
    };
    initCamera();
    return () => { if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop()); };
  }, []);

  const handleStartRecording = () => {
    setRecording(true);
    setPrediction(null);
    setConfidence(null);
    const chunks = [];
    const mediaRecorder = new MediaRecorder(streamRef.current);
    
    mediaRecorder.ondataavailable = (e) => chunks.push(e.data);
    mediaRecorder.onstop = async () => {
      const blob = new Blob(chunks, { type: "video/webm" });
      const formData = new FormData();
      formData.append("video", blob, "gesture.webm");
      
      setLoading(true);
      try {
        const response = await fetch("http://127.0.0.1:8000/predict_video", { method: "POST", body: formData });
        const result = await response.json();

        // 90% Threshold Filter[cite: 16]
        if (result.confidence >= 0.90) {
          setPrediction(result.prediction);
          setConfidence((result.confidence * 100).toFixed(2));
          speakNow(result.prediction); // Auto-play voice on success
        } else {
          setPrediction("Sign not clear, try again");
          setConfidence((result.confidence * 100).toFixed(2));
        }
      } catch (error) { setPrediction("Server error"); }
      setLoading(false);
      setRecording(false);
    };

    mediaRecorder.start();
    setTimeout(() => { if (mediaRecorder.state === "recording") mediaRecorder.stop(); }, 2000);
  };

  return (
    <div className="stt-dark-page">
      <motion.div 
        className="stt-header"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <h1>Sign to <span>Text</span></h1>
        <p>Professional Urdu Sign Recognition System</p>
      </motion.div>

      <div className="stt-main-grid">
        <motion.div 
          className="stt-video-card"
          initial={{ opacity: 0, x: -50 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
        >
          <div className={`video-frame ${recording ? "rec-active" : ""}`}>
            <video ref={videoRef} autoPlay muted />
            <div className="scanner-line"></div>
            {recording && <div className="rec-dot">REC ●</div>}
          </div>
          <button className="stt-btn" onClick={handleStartRecording} disabled={recording || loading}>
            {recording ? "Recording..." : loading ? "Analyzing..." : "Start Recognition"}
          </button>
        </motion.div>

        <motion.div 
          className="stt-result-card"
          initial={{ opacity: 0, x: 50 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8, delay: 0.4 }}
        >
          <h3>AI Prediction</h3>
          {loading ? <div className="loader-cyan"></div> : prediction ? (
            <motion.div 
              className="result-data"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ type: "spring", stiffness: 200 }}
            >
              <div className="pred-val">{prediction}</div>
              <div className="conf-bar">
                <div className="conf-fill" style={{width: `${confidence}%`, background: confidence >= 90 ? '#00d1d1' : '#ff4b2b'}}></div>
              </div>
              <span className="conf-text">{confidence}% Confidence</span>
              {prediction !== "Sign not clear, try again" && (
                <button className="speak-btn" onClick={() => speakNow(prediction)}>🔊 Play Voice</button>
              )}
            </motion.div>
          ) : <p>Perform a sign and click start.</p>}
        </motion.div>
      </div>
    </div>
  );
}

export default SignToText;