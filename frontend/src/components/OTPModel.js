import React, { useState } from "react";

const OTPModal = ({ visible, onVerify }) => {
  const [otp, setOtp] = useState("");

  if (!visible) return null;

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-40 z-50">
      <div className="bg-white rounded-xl p-6 w-80 shadow-xl">
        <h2 className="text-xl font-semibold mb-4">Enter OTP</h2>
        <input
          type="text"
          maxLength={6}
          value={otp}
          onChange={(e) => setOtp(e.target.value)}
          className="w-full border border-gray-300 rounded-md px-3 py-2 mb-4 focus:outline-none focus:ring"
        />
        <button
          onClick={() => onVerify(otp)}
          className="bg-blue-600 hover:bg-blue-700 text-white w-full py-2 rounded-md"
        >
          Verify OTP
        </button>
      </div>
    </div>
  );
};

export default OTPModal;
