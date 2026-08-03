import React from "react";
// FIXED: this page used to render <SignVideo />, which requested .mp4 files from
// /videos/ - a folder that does not exist, so every clip 404'd. Meanwhile Avatar3D
// (the component that actually loads your 41 .glb models) was imported nowhere and
// never rendered. Swapping to Avatar3D is what makes the 3D signs appear.
import Avatar3D from "../components/Avatar3D";
import "./TextToSign.css";
import { motion } from "framer-motion";

function TextToSign() {
  return (
    <div className="tts-dark-page">
      <motion.div
        className="tts-header"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <h6 className="overline-cyan">DICTIONARY</h6>
        <h1>Text to <span>3D Sign</span></h1>
        <p>Pick an Urdu word and watch the 3D avatar perform the sign</p>
      </motion.div>

      <motion.div
        className="tts-content-container"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.8, delay: 0.2 }}
      >
        <Avatar3D />
      </motion.div>
    </div>
  );
}

export default TextToSign;
