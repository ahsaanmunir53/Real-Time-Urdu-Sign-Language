import React from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import './Footer.css';

const Footer = () => {
  return (
    <motion.footer 
      className="footer-main"
      initial={{ opacity: 0, y: 50 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.8 }}
    >
      <div className="footer-content">
        <div className="footer-section about">
          <h2 className="footer-logo">SIGN<span>BRIDGE</span></h2>
          <p>
            Bridging the gap between silence and sound using advanced AI 
            for Pakistan Sign Language translation.
          </p>
        </div>

        <div className="footer-section links">
          <h3>Quick Links</h3>
          <ul>
            <li><Link to="/">Home</Link></li>
            <li><Link to="/sign-to-text">Sign ➜ Text</Link></li>
            <li><Link to="/text-to-sign">Text ➜ Sign</Link></li>
            <li><Link to="/about">About Us</Link></li>
          </ul>
        </div>

        <div className="footer-section contact">
          <h3>Contact Us</h3>
          <p>📍 Lahore, Pakistan</p>
          <p>📧 support@signbridge.com</p>
          <div className="social-icons">
            <motion.span whileHover={{ scale: 1.2, color: "#00d4ff" }}>🌐</motion.span> 
            <motion.span whileHover={{ scale: 1.2, color: "#00d4ff" }}>📸</motion.span> 
            <motion.span whileHover={{ scale: 1.2, color: "#00d4ff" }}>🐦</motion.span>
          </div>
        </div>
      </div>
      
      <div className="footer-bottom">
        <p>&copy; 2026 Sign Bridge | All Rights Reserved</p>
      </div>
    </motion.footer>
  );
};

export default Footer;