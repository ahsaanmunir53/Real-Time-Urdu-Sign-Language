import React, { useRef, useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import "./SignToText.css";

// ---------------------------------------------------------------------------
// Why this file changed
//
// The old version recorded 2 seconds of webm with MediaRecorder and POSTed the
// file. The server then decoded it with OpenCV and ran MediaPipe on the frames.
// That path returned "hands_detected": "0/30" on the deployed service: a webm
// produced by MediaRecorder carries no duration or seek index, so OpenCV cannot
// step through it reliably and MediaPipe sees blank frames.
//
// MediaPipe now runs here, in the browser, on live camera frames. The backend
// receives a 30 x 258 keypoint array as JSON instead of a video file. Its
// controller already accepts this - it is "path A" in translateController.js.
//
// Three things follow from the change:
//   - nothing has to be decoded on the server, so the failure above cannot recur
//   - no 2 second upload, so a prediction returns far sooner
//   - the server no longer needs mediapipe or opencv at all
//
// The 258 values per frame are laid out exactly as in training:
//   33 pose landmarks x (x, y, z, visibility)   = 132
//   21 left-hand landmarks x (x, y, z)          =  63
//   21 right-hand landmarks x (x, y, z)         =  63
// Missing landmarks are zeros, never interpolated, because absence is itself a
// signal the model was trained on.
// ---------------------------------------------------------------------------

const FRAMES = 30;
const FEATURES = 258;
const CAPTURE_MS = 2200;      // a little over the 2 s the old recorder used
const CDN = "https://cdn.jsdelivr.net/npm/@mediapipe/holistic@0.5.1675471629";

const r5 = (n) => Math.round(n * 1e5) / 1e5;   // 5 dp keeps the payload ~90 KB

function landmarksToVector(res) {
  const v = new Array(FEATURES).fill(0);
  if (res.poseLandmarks) {
    res.poseLandmarks.forEach((l, i) => {
      if (i >= 33) return;
      v[i * 4] = r5(l.x);
      v[i * 4 + 1] = r5(l.y);
      v[i * 4 + 2] = r5(l.z);
      v[i * 4 + 3] = l.visibility == null ? 0 : r5(l.visibility);
    });
  }
  if (res.leftHandLandmarks) {
    res.leftHandLandmarks.forEach((l, i) => {
      if (i >= 21) return;
      v[132 + i * 3] = r5(l.x);
      v[132 + i * 3 + 1] = r5(l.y);
      v[132 + i * 3 + 2] = r5(l.z);
    });
  }
  if (res.rightHandLandmarks) {
    res.rightHandLandmarks.forEach((l, i) => {
      if (i >= 21) return;
      v[195 + i * 3] = r5(l.x);
      v[195 + i * 3 + 1] = r5(l.y);
      v[195 + i * 3 + 2] = r5(l.z);
    });
  }
  return v;
}

/** Sample exactly FRAMES rows evenly across the captured buffer. */
function resample(buffer) {
  if (buffer.length === 0) return null;
  if (buffer.length === FRAMES) return buffer;
  const out = [];
  for (let i = 0; i < FRAMES; i++) {
    const idx = Math.round((i * (buffer.length - 1)) / (FRAMES - 1));
    out.push(buffer[idx]);
  }
  return out;
}

function loadScript(src) {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) return resolve();
    const s = document.createElement("script");
    s.src = src;
    s.crossOrigin = "anonymous";
    s.onload = () => resolve();
    s.onerror = () => reject(new Error(`could not load ${src}`));
    document.body.appendChild(s);
  });
}

function SignToText() {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const holisticRef = useRef(null);
  const bufferRef = useRef([]);
  const capturingRef = useRef(false);
  const rafRef = useRef(null);

  const [status, setStatus] = useState("Loading the recogniser...");
  const [ready, setReady] = useState(false);
  const [recording, setRecording] = useState(false);
  const [loading, setLoading] = useState(false);
  const [prediction, setPrediction] = useState(null);
  const [confidence, setConfidence] = useState(null);
  const [handsLive, setHandsLive] = useState(false);

  const speakNow = async (text) => {
    if (!text || text.includes("not clear") || text.includes("error")) return;
    try {
      const r = await fetch("/api/translate/text-to-voice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      if (!r.ok) return;
      const audio = new Audio(URL.createObjectURL(await r.blob()));
      audio.play();
    } catch (err) {
      console.error("Voice error:", err);
    }
  };

  const onResults = useCallback((res) => {
    const hands = !!(res.leftHandLandmarks || res.rightHandLandmarks);
    setHandsLive(hands);
    if (capturingRef.current) bufferRef.current.push(landmarksToVector(res));
  }, []);

  // --- set up camera and MediaPipe once -----------------------------------
  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: 640, height: 480 },
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play().catch(() => {});
        }
      } catch (err) {
        setStatus("Camera blocked. Allow camera access and reload.");
        return;
      }

      try {
        await loadScript(`${CDN}/holistic.js`);
        if (cancelled) return;
        // eslint-disable-next-line no-undef
        const holistic = new window.Holistic({
          locateFile: (file) => `${CDN}/${file}`,
        });
        holistic.setOptions({
          modelComplexity: 1,
          smoothLandmarks: true,
          refineFaceLandmarks: false,
          minDetectionConfidence: 0.5,
          minTrackingConfidence: 0.5,
        });
        holistic.onResults(onResults);
        holisticRef.current = holistic;

        const pump = async () => {
          const v = videoRef.current;
          if (!cancelled && v && v.readyState >= 2 && holisticRef.current) {
            try {
              await holisticRef.current.send({ image: v });
            } catch (e) {
              /* a dropped frame is not worth reporting */
            }
          }
          if (!cancelled) rafRef.current = requestAnimationFrame(pump);
        };
        pump();

        setReady(true);
        setStatus("Ready");
      } catch (err) {
        setStatus("Could not load the recogniser. Check your connection and reload.");
      }
    })();

    return () => {
      cancelled = true;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      if (holisticRef.current && holisticRef.current.close) holisticRef.current.close();
      if (streamRef.current) streamRef.current.getTracks().forEach((t) => t.stop());
    };
  }, [onResults]);

  // --- capture and predict -------------------------------------------------
  const handleStartRecording = () => {
    if (!ready || recording || loading) return;

    setPrediction(null);
    setConfidence(null);
    bufferRef.current = [];
    capturingRef.current = true;
    setRecording(true);

    setTimeout(async () => {
      capturingRef.current = false;
      setRecording(false);

      const raw = bufferRef.current;
      const withHands = raw.filter((f) => f.slice(132).some((x) => x !== 0)).length;

      if (raw.length < 5) {
        setPrediction("Camera did not produce enough frames, try again");
        return;
      }
      if (withHands < raw.length * 0.3) {
        setPrediction("Hands not clearly visible, try again");
        setConfidence("0.00");
        return;
      }

      const keypoints = resample(raw);
      setLoading(true);
      try {
        const r = await fetch("/api/translate/sign-to-text", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ keypoints }),
        });
        const result = await r.json();

        if (!r.ok) {
          setPrediction(result.error || "Server error");
        } else if (result.confidence >= 0.5) {
          setPrediction(result.translatedText);
          setConfidence((result.confidence * 100).toFixed(2));
          speakNow(result.translatedText);
        } else {
          setPrediction("Sign not clear, try again");
          setConfidence(((result.confidence || 0) * 100).toFixed(2));
        }
      } catch (err) {
        setPrediction("Server error");
      }
      setLoading(false);
    }, CAPTURE_MS);
  };

  const buttonLabel = !ready
    ? "Loading..."
    : recording
    ? "Recording..."
    : loading
    ? "Analyzing..."
    : "Start Recognition";

  return (
    <div className="stt-dark-page">
      <motion.div
        className="stt-header"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <h1>
          Sign to <span>Text</span>
        </h1>
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
            <video ref={videoRef} autoPlay muted playsInline />
            <div className="scanner-line"></div>
            {recording && <div className="rec-dot">REC ●</div>}

            {/* Live feedback. The old version gave none, so a signer had no way
                to tell their hands were out of frame until the result came back. */}
            <div
              style={{
                position: "absolute",
                bottom: 12,
                left: 12,
                padding: "6px 12px",
                borderRadius: 8,
                fontSize: "0.78rem",
                fontWeight: 700,
                letterSpacing: 0.5,
                backdropFilter: "blur(6px)",
                border: `1px solid ${handsLive ? "rgba(0,209,209,.55)" : "rgba(255,75,43,.55)"}`,
                background: handsLive ? "rgba(0,209,209,.12)" : "rgba(255,75,43,.12)",
                color: handsLive ? "#00d1d1" : "#ff4b2b",
              }}
            >
              {ready ? (handsLive ? "HANDS DETECTED" : "SHOW BOTH HANDS") : status}
            </div>
          </div>

          <button
            className="stt-btn"
            onClick={handleStartRecording}
            disabled={!ready || recording || loading}
          >
            {buttonLabel}
          </button>
        </motion.div>

        <motion.div
          className="stt-result-card"
          initial={{ opacity: 0, x: 50 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8, delay: 0.4 }}
        >
          <h3>AI Prediction</h3>
          {loading ? (
            <div className="loader-cyan"></div>
          ) : prediction ? (
            <motion.div
              className="result-data"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ type: "spring", stiffness: 200 }}
            >
              <div className="pred-val">{prediction}</div>
              {confidence !== null && (
                <>
                  <div className="conf-bar">
                    <div
                      className="conf-fill"
                      style={{
                        width: `${confidence}%`,
                        background: confidence >= 90 ? "#00d1d1" : "#ff4b2b",
                      }}
                    ></div>
                  </div>
                  <span className="conf-text">{confidence}% Confidence</span>
                </>
              )}
              {!prediction.includes("try again") && !prediction.includes("error") && (
                <button className="speak-btn" onClick={() => speakNow(prediction)}>
                  🔊 Play Voice
                </button>
              )}
            </motion.div>
          ) : (
            <p>Perform a sign and click start.</p>
          )}
        </motion.div>
      </div>
    </div>
  );
}

export default SignToText;
