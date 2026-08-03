import React, { useState } from "react";
import { motion } from "framer-motion";

const OTPModal = ({ visible, onVerify }) => {
  const [otp, setOtp] = useState("");

  if (!visible) return null;

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-70 z-50 backdrop-blur-md">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        className="relative bg-opacity-10 bg-white backdrop-filter backdrop-blur-2xl border border-white border-opacity-10 p-8 rounded-3xl w-96 shadow-2xl text-center"
        style={{
          background: "rgba(10, 15, 30, 0.7)",
          boxShadow: "0 25px 50px rgba(0, 0, 0, 0.6), inset 0 0 0 1px rgba(255, 255, 255, 0.05)",
        }}
      >
        {/* Glowing conic decoration inside modal */}
        <div 
          className="absolute -top-12 -left-12 w-24 h-24 rounded-full filter blur-xl opacity-30"
          style={{ background: "radial-gradient(circle, #00d4ff, transparent)" }}
        ></div>
        <div 
          className="absolute -bottom-12 -right-12 w-24 h-24 rounded-full filter blur-xl opacity-30"
          style={{ background: "radial-gradient(circle, #7000ff, transparent)" }}
        ></div>

        <h2 
          className="text-2xl font-bold mb-6 text-white tracking-wide"
          style={{ fontFamily: "'Outfit', sans-serif" }}
        >
          Enter <span style={{ background: "linear-gradient(135deg, #00d4ff 0%, #7000ff 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>OTP Code</span>
        </h2>
        
        <p className="text-gray-400 text-sm mb-6 leading-relaxed">
          Please enter the 6-digit verification code sent to your device to proceed.
        </p>


        <motion.input
          whileHover={{ scale: 1.02, borderColor: "rgba(0, 212, 255, 0.4)" }}
          whileFocus={{ scale: 1.03, borderColor: "#00d4ff" }}
          type="text"
          maxLength={6}
          value={otp}
          onChange={(e) => setOtp(e.target.value)}
          className="w-full bg-black bg-opacity-50 border border-white border-opacity-10 rounded-2xl px-5 py-4 mb-6 text-center text-white text-2xl font-bold tracking-widest focus:outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400 focus:ring-opacity-20 transition-all duration-300"
          style={{
            fontFamily: "'Outfit', sans-serif",
            color: "#fff",
            border: "1px solid rgba(255, 255, 255, 0.1)",
          }}
          placeholder="••••••"
        />

        <motion.button
          whileHover={{ scale: 1.04, boxShadow: "0 15px 30px rgba(0, 212, 255, 0.4)" }}
          whileTap={{ scale: 0.98 }}
          onClick={() => onVerify(otp)}
          className="w-full py-4 rounded-2xl font-bold text-white uppercase tracking-wider transition-all duration-300 hover:shadow-lg"
          style={{
            background: "linear-gradient(135deg, #00d4ff 0%, #7000ff 100%)",
            boxShadow: "0 10px 20px rgba(112, 0, 255, 0.3)",
            fontFamily: "'Outfit', sans-serif",
          }}
        >
          Verify OTP
        </motion.button>
      </motion.div>
    </div>
  );
};

export default OTPModal;

