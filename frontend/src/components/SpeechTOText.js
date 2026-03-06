
// client/components/SpeechToText.js
import React, { useEffect, useState } from "react";

const SpeechToText = () => {
  const [text, setText] = useState("");

  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Your browser does not support Speech Recognition");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.lang = "en-US";

    recognition.onresult = (event) => {
      const transcript = Array.from(event.results)
        .map((result) => result[0].transcript)
        .join("");
      setText(transcript);
    };

    recognition.start();

    return () => recognition.stop();
  }, []);

  return (
    <div className="p-4 bg-white rounded shadow">
      <h2 className="text-lg font-semibold">Google Voice Input</h2>
      <p className="mt-2 text-gray-700">{text}</p>
    </div>
  );
};

export default SpeechToText;
