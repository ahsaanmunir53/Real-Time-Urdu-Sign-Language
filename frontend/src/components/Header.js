// src/components/Header.js
import React from "react";
import '../App.css'; // Contains animation & 3D styles

const Header = () => {
  return (
    <header className="sticky top-0 w-full bg-white shadow-md z-50 overflow-hidden">
      <div className="moving-logo-container">
        <h1 className="logo-3d moving-logo">Sign Bridge</h1>
      </div>
    </header>
  );
};

export default Header;
