import React, { useRef, useState, useEffect } from "react";
import "../App.css";

function SignToText() {
  const videoRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const streamRef = useRef(null);
  const [recording, setRecording] = useState(false);
  const [prediction, setPrediction] = useState(null);
  const [confidence, setConfidence] = useState(null);
  const [loading, setLoading] = useState(false);

  const gestureClasses = [
    'اسکول', 'انتہائی', 'انگریزی', 'آؤ', 'آپ', 'اچھا', 'اہم', 'بند کرو', 'بولنا', 'بھاری',
    'بھوکے ہو', 'تم', 'تیار', 'جاتا ہو', 'جلدی', 'خبردار', 'خطرناک', 'خوفناک', 'دروازہ', 'دلچسپ',
    'دور', 'دکھنا', 'دیر سے', 'ذہین', 'سستا', 'سمجھ گیا', 'شور', 'صحت مند', 'عُلیٰ سَمَت استعمال',
    'غیر ملکی', 'لاجواب', 'لیا ہے', 'مجھ سے', 'محتاط', 'محفوظ', 'مضحکہ خیز', 'ملنا', 'مہذب',
    'میں', 'نہیں', 'نیا', 'ٹی وی', 'پانی پینا', 'پاگل', 'پرامن', 'پرجوش', 'چاہتاہو', 'کم',
    'کھنا کھاؤ', 'کیا', 'گونگا', 'ہاں', 'ہو', 'ہوشیار'
  ];

  useEffect(() => {
    const initCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (err) {
        console.error("Error accessing webcam:", err);
      }
    };

    initCamera();

    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  const handleStartRecording = () => {
    setRecording(true);
    setPrediction(null);
    setConfidence(null);

    const chunks = [];
    const stream = streamRef.current;

    if (!stream) {
      alert("Webcam not initialized");
      return;
    }

    const mediaRecorder = new MediaRecorder(stream);
    mediaRecorderRef.current = mediaRecorder;

    mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) {
        chunks.push(e.data);
      }
    };

    mediaRecorder.onstop = async () => {
      const blob = new Blob(chunks, { type: "video/webm" });
      const formData = new FormData();
      formData.append("video", blob, "gesture.webm");

      setLoading(true); // Start loading while waiting for response

      try {
        const response = await fetch("http://127.0.0.1:8000/predict_video", {
          method: "POST",
          body: formData,
        });

        const result = await response.json();

        if (response.ok) {
          setPrediction(result.prediction);
          setConfidence((result.confidence * 100).toFixed(2));
        } else {
          console.error("Prediction error:", result.error);
          setPrediction("Error");
          setConfidence("0");
        }
      } catch (error) {
        console.error("API call failed:", error);
        setPrediction("Error");
        setConfidence("0");
      }

      setLoading(false); // Done loading
      setRecording(false);
    };

    mediaRecorder.start();

    setTimeout(() => {
      mediaRecorder.stop();
    }, 2000); // ⏱️ Record for 3 seconds
  };

  return (
    <div className="container">
      <div className="card">
        <h2 className="title">✋ Sign to Text Translator</h2>

        <div className="video-wrapper">
          <video ref={videoRef} autoPlay muted className="video" />
        </div>

        <button
          className="record-button"
          onClick={handleStartRecording}
          disabled={recording || loading}
        >
          {recording ? "🎥 Recording..." : loading ? "⏳ Processing..." : "▶️ Start Recording"}
        </button>

        {/* Show status below button */}
        {recording && <p className="status">🎥 Recording in progress...</p>}
        {!recording && loading && <p className="status">⏳ Please wait, analyzing gesture...</p>}

        {prediction && (
          <div className="output-card">
            <p><strong>Predicted Gesture:</strong> {prediction}</p>
            <p><strong>Confidence:</strong> {confidence}%</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default SignToText;
