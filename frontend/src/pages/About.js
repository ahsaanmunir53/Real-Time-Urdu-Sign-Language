import React from 'react';
import './About.css';
import { motion } from 'framer-motion';

const About = () => {
  return (
    <div className="about-container">
      <div className="about-hero">
        <motion.h1 
          initial={{ opacity: 0, y: -50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, type: "spring" }}
          className="about-title"
        >
          About <span>Sign Bridge</span>
        </motion.h1>
        <motion.p 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="about-subtitle"
        >
          Revolutionizing communication for the Deaf community in Pakistan through state-of-the-art Artificial Intelligence.
        </motion.p>
      </div>

      <div className="about-grid">
        <motion.div 
          className="about-glass-card"
          initial={{ opacity: 0, x: -50 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <div className="card-icon">🧠</div>
          <h3>Our Mission</h3>
          <p>
            Har us fard ko awaaz dena jo bol nahi sakta, aur unki baat dunya tak pohanchana. We aim to break down barriers using Computer Vision and deep learning to translate Pakistan Sign Language (PSL) into real-time Urdu text.
          </p>
        </motion.div>

        <motion.div 
          className="about-glass-card"
          initial={{ opacity: 0, y: 50 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          <div className="card-icon">👁️</div>
          <h3>The Vision</h3>
          <p>
            To create an inclusive society where hearing impairment is no longer a barrier to education, employment, and everyday social interactions.
          </p>
        </motion.div>

        <motion.div 
          className="about-glass-card"
          initial={{ opacity: 0, x: 50 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.4 }}
        >
          <div className="card-icon">⚙️</div>
          <h3>Technology</h3>
          <p>
            Built with React, Framer Motion, and powered by advanced Neural Networks fine-tuned specifically for regional PSL dialects to ensure maximum accuracy.
          </p>
        </motion.div>
      </div>
    </div>
  );
};

export default About;