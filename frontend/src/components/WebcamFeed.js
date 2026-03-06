import React, { useEffect, useRef } from "react";

const WebcamFeed = () => {
  const videoRef = useRef();

  useEffect(() => {
    const enableWebcam = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        videoRef.current.srcObject = stream;
      } catch (err) {
        console.error("Webcam access denied:", err);
      }
    };

    enableWebcam();
  }, []);

  return (
    <div className="w-full flex justify-center mt-4">
      <video
        ref={videoRef}
        autoPlay
        playsInline
        className="rounded-xl border-4 border-indigo-500 shadow-lg w-80 h-60 object-cover"
      />
    </div>
  );
};

export default WebcamFeed;
