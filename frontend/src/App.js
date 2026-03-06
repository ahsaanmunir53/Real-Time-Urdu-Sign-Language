// App.js
import React from "react";
import { Routes, Route } from "react-router-dom";
import Home from "./pages/Home";
import Register from "./pages/Register";
import Login from "./pages/Login";
import SignToText from "./pages/SignToText";
import TextToSign from "./pages/TextToSign";
import Header from "./components/Header";
import Navbar from './components/Navbar';
// At top of App.js or _app.js
import { useGLTF } from "@react-three/drei";
useGLTF.preload("/models/کیا.glb");

function App() {
  return (
    <div className="min-h-screen bg-gradient-to-r from-blue-100 to-purple-100">
      <Header />
      <Navbar />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/register" element={<Register />} />
        <Route path="/login" element={<Login />} />
        <Route path="/sign-to-text" element={<SignToText />} />
        <Route path="/text-to-sign" element={<TextToSign />} />
      </Routes>
    </div>
  );
}

export default App;
