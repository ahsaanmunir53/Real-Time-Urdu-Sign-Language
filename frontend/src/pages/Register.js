import React, { useState } from "react";
import { Mail, Lock, Phone, User, ShieldCheck, KeyRound } from "lucide-react";
import "../index.css"; // Tailwind CSS file

function Register() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
    otp: "",
  });

  const [otpSent, setOtpSent] = useState(false);
  const [error, setError] = useState("");

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setError("");
  };

  const handleSendOtp = () => {
    if (!formData.email || !formData.name || !formData.phone || !formData.password || !formData.confirmPassword) {
      setError("Please fill in all fields before sending OTP");
      return;
    }
    setOtpSent(true);
  };

  const handleRegister = () => {
    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    if (!formData.otp) {
      setError("Please enter the OTP sent to your email");
      return;
    }
    console.log("Registering with:", formData);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-black px-4">
      <div className="flex w-full max-w-6xl card-glow rounded-lg overflow-hidden">
        {/* Left Side Illustration */}
        <div className="w-1/2 bg-gradient-to-br from-purple-800 via-pink-600 to-orange-500 p-10 text-white flex flex-col justify-center items-center relative">
          <div className="absolute top-0 left-0 w-full h-full bg-purple-900 opacity-30 rounded-lg animate-pulse" />
          <img src="/assets/illustration.png" alt="Register Illustration" className="mb-6 w-full max-w-xs z-10" />
          <h2 className="text-3xl font-bold z-10">Welcome Aboard!</h2>
          <p className="text-sm text-white/80 mt-2 z-10">Let's get you started with an account.</p>
        </div>

        {/* Right Side Form */}
        <div className="w-1/2 p-10 bg-gray-900 text-white">
          <h2 className="text-2xl font-semibold mb-10">Create Your Account</h2>

          {error && <p className="text-red-500 mb-4 font-medium">{error}</p>}

          <div className="flex flex-col gap-6">
            <div className="flex flex-col">
              <label className="font-bold text-sm mb-10">Full Name</label>
              <div className="relative">
                <User className="absolute left-3 top-3 text-gray-400" size={18} />
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="Full Name"
                  className="w-full p-3 pl-10 rounded bg-gray-800 border border-gray-600 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
            </div>

            <div className="flex flex-col">
              <label className="font-bold text-sm mb-2">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 text-gray-400" size={18} />
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="Email"
                  className="w-full p-3 pl-10 rounded bg-gray-800 border border-gray-600 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
            </div>

            <div className="flex flex-col">
              <label className="font-bold text-sm mb-2">Phone</label>
              <div className="relative">
                <Phone className="absolute left-3 top-3 text-gray-400" size={18} />
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  placeholder="Phone"
                  className="w-full p-3 pl-10 rounded bg-gray-800 border border-gray-600 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
            </div>

            <div className="flex flex-col">
              <label className="font-bold text-sm mb-2">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 text-gray-400" size={18} />
                <input
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="Password"
                  className="w-full p-3 pl-10 rounded bg-gray-800 border border-gray-600 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
            </div>

            <div className="flex flex-col">
              <label className="font-bold text-sm mb-2">Confirm Password</label>
              <div className="relative">
                <ShieldCheck className="absolute left-3 top-3 text-gray-400" size={18} />
                <input
                  type="password"
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  placeholder="Confirm Password"
                  className="w-full p-3 pl-10 rounded bg-gray-800 border border-gray-600 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
            </div>

            {otpSent && (
              <div className="flex flex-col">
                <label className="font-bold text-sm mb-2">OTP</label>
                <div className="relative">
                  <KeyRound className="absolute left-3 top-3 text-gray-400" size={18} />
                  <input
                    type="text"
                    name="otp"
                    value={formData.otp}
                    onChange={handleChange}
                    placeholder="Enter OTP"
                    className="w-full p-3 pl-10 rounded bg-gray-800 border border-gray-600 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
              </div>
            )}
          </div>

          <div className="mt-8">
            <button
              onClick={otpSent ? handleRegister : handleSendOtp}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-lg transition duration-200"
            >
              {otpSent ? "Register" : "Send OTP"}
            </button>
          </div>

          <p className="text-sm text-gray-400 mt-6 text-center">
            Already have an account? <a href="/login" className="text-purple-400 hover:underline">Sign in</a>
          </p>
        </div>
      </div>
    </div>
  );
}















export default Register;
