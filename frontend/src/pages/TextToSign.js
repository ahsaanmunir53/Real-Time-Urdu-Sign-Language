// client/pages/TextToSign.js
import React from "react";
import Avatar3D from "../components/Avatar3D";
import "../App.css";

function TextToSign() {
  return (
    <div className="text-to-sign-container">
      <div className="text-to-sign-box">
        <h2 className="text-to-sign-heading">🧠 Text to Sign Avatar</h2>
        {/* Avatar3D already includes its own input and logic */}
        <Avatar3D />
      </div>
    </div>
  );
}

export default TextToSign;
