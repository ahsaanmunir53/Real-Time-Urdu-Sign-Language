import React, { useState, useEffect } from "react";
import { NavLink } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import './Navbar.css';

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 30) {
        setScrolled(true);
      } else {
        setScrolled(false);
      }
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const toggleMenu = () => setIsOpen(!isOpen);
  const closeMenu = () => setIsOpen(false);

  return (
    <motion.nav 
      className={`navbar-main ${scrolled ? 'scrolled' : ''}`}
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ type: "spring", stiffness: 120, damping: 20 }}
    >
      <div className="navbar-glass">
        <div className="nav-logo">
          <img src="/logo.png" alt="SignBridge Logo" className="logo-img" />
          <div className="logo-text">
            SIGN<span>BRIDGE</span>
          </div>
        </div>

        {/* Desktop Menu */}
        <ul className="nav-menu">
          <li><NavLink to="/" className={({ isActive }) => isActive ? "active-link" : "link"}>Home</NavLink></li>
          <li><NavLink to="/sign-to-text" className={({ isActive }) => isActive ? "active-link" : "link"}>Sign ➜ Text</NavLink></li>
          <li><NavLink to="/text-to-sign" className={({ isActive }) => isActive ? "active-link" : "link"}>Text ➜ Sign</NavLink></li>
          <li><NavLink to="/about" className={({ isActive }) => isActive ? "active-link" : "link"}>About</NavLink></li>
          <li><NavLink to="/contact" className={({ isActive }) => isActive ? "active-link" : "link"}>Contact</NavLink></li>
        </ul>

        {/* Hamburger Icon */}
        <div className="mobile-toggle" onClick={toggleMenu}>
          <div className={`hamburger ${isOpen ? 'open' : ''}`}>
            <span></span>
            <span></span>
            <span></span>
          </div>
        </div>
      </div>

      {/* Mobile Dropdown */}
      <AnimatePresence>
        {isOpen && (
          <motion.div 
            className="mobile-menu"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
          >
            <ul>
              <li><NavLink to="/" onClick={closeMenu} className={({ isActive }) => isActive ? "active-link" : "link"}>Home</NavLink></li>
              <li><NavLink to="/sign-to-text" onClick={closeMenu} className={({ isActive }) => isActive ? "active-link" : "link"}>Sign ➜ Text</NavLink></li>
              <li><NavLink to="/text-to-sign" onClick={closeMenu} className={({ isActive }) => isActive ? "active-link" : "link"}>Text ➜ Sign</NavLink></li>
              <li><NavLink to="/about" onClick={closeMenu} className={({ isActive }) => isActive ? "active-link" : "link"}>About</NavLink></li>
              <li><NavLink to="/contact" onClick={closeMenu} className={({ isActive }) => isActive ? "active-link" : "link"}>Contact</NavLink></li>
            </ul>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.nav>
  );
};

export default Navbar;