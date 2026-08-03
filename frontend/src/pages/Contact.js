import React from 'react';
import './Contact.css';
import { motion } from 'framer-motion';
import { MapPin, Mail, Phone, Globe, Instagram, Twitter } from 'lucide-react';

const Contact = () => {
  return (
    <div className="contact-container">
      <motion.div 
        className="contact-header"
        initial={{ opacity: 0, y: -50 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, type: "spring" }}
      >
        <h1>Get In <span>Touch</span></h1>
        <p>Have questions, feedback, or want to collaborate? We would love to hear from you.</p>
      </motion.div>

      <div className="contact-grid">
        <motion.div 
          className="contact-info-card"
          initial={{ opacity: 0, x: -50 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
        >
          <div className="info-item">
            <div className="icon">
              <MapPin size={28} color="#00d4ff" />
            </div>
            <div>
              <h3>Location</h3>
              <p>Lahore, Pakistan</p>
            </div>
          </div>
          <div className="info-item">
            <div className="icon">
              <Mail size={28} color="#00d4ff" />
            </div>
            <div>
              <h3>Email</h3>
              <p>contact@signbridge.pk</p>
            </div>
          </div>
          <div className="info-item">
            <div className="icon">
              <Phone size={28} color="#00d4ff" />
            </div>
            <div>
              <h3>Phone</h3>
              <p>+92 300 1234567</p>
            </div>
          </div>
          
          <div className="contact-socials">
            <motion.span whileHover={{ y: -5, color: '#00d4ff' }}>
              <Globe size={24} />
            </motion.span>
            <motion.span whileHover={{ y: -5, color: '#ff007f' }}>
              <Instagram size={24} />
            </motion.span>
            <motion.span whileHover={{ y: -5, color: '#1da1f2' }}>
              <Twitter size={24} />
            </motion.span>
          </div>
        </motion.div>

        <motion.div 
          className="contact-form-card"
          initial={{ opacity: 0, x: 50 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8, delay: 0.4 }}
        >
          <form className="modern-form" onSubmit={(e) => e.preventDefault()}>
            <div className="input-group">
              <input type="text" placeholder="Your Name" required />
            </div>
            <div className="input-group">
              <input type="email" placeholder="Your Email" required />
            </div>
            <div className="input-group">
              <textarea placeholder="Your Message" rows="5" required></textarea>
            </div>
            <motion.button 
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="submit-neon"
            >
              Send Message
            </motion.button>
          </form>
        </motion.div>
      </div>
    </div>
  );
};

export default Contact;