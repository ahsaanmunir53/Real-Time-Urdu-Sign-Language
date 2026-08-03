import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import './Home.css';

// Hero images represent signs/community
const heroImages = [
  "https://img.freepik.com/free-vector/sign-language-concept-illustration_114360-1940.jpg",
  "https://img.freepik.com/free-vector/hand-drawn-sign-language-illustration_23-2148785127.jpg",
  "https://img.freepik.com/free-vector/deaf-culture-concept-illustration_114360-1920.jpg"
];

// Tech images for Section 3
const techImages = [
  "https://media.istockphoto.com/id/2021996995/photo/young-muslim-woman-posing-in-white-background-studio-for-ramadan-or-eid-concept.jpg?s=612x612&w=0&k=20&c=hK2N5ogr5cMa82nM_BFI8P18NzX0abRM4ccoK7cO6W8=",
  "https://media.istockphoto.com/id/1173307527/photo/close-up-asian-man-shows-hand-gestures-it-means-help-isolated-on-white-background-american.jpg?s=612x612&w=0&k=20&c=ZuKFZebIjnEzIu036VWZFzCM5qWt7UqYrTc2ML3mWcE=",
  "https://media.istockphoto.com/id/160895265/photo/deaf-signs.webp?a=1&b=1&s=612x612&w=0&k=20&c=gdnBwSmDyCL8xVAb9OWtO-py4h3oqKWxdyNaXph08Xk="
];

const Home = () => {
  const navigate = useNavigate();
  const [heroIdx, setHeroIdx] = useState(0);
  const [techIdx, setTechIdx] = useState(0);


  const [activeStep, setActiveStep] = useState(0);

const steps = [
  { num: "01", title: "Capture Sign", desc: "Our AI recognizes PSL hand gestures through your camera in real-time." },
  { num: "02", title: "AI Processing", desc: "Advanced neural networks translate the motion into meaningful Urdu words." },
  { num: "03", title: "Voice & Text", desc: "The system outputs clear Urdu text, bridging the communication gap." }
];

const nextStep = () => setActiveStep((prev) => (prev + 1) % steps.length);
const prevStep = () => setActiveStep((prev) => (prev - 1 + steps.length) % steps.length);


  // Auto-sliders for both sections
  useEffect(() => {
    const heroTimer = setInterval(() => {
      setHeroIdx((prev) => (prev + 1) % heroImages.length);
    }, 3000);
    const techTimer = setInterval(() => {
      setTechIdx((prev) => (prev + 1) % techImages.length);
    }, 3000);

    return () => {
      clearInterval(heroTimer);
      clearInterval(techTimer);
    };
  }, []);

  return (
    <div className="home-container">
      {/* SECTION 1: HERO */}
      <section className="hero-v2">
        <div className="hero-content">
          <motion.h1 
            initial={{ y: 50, opacity: 0 }} 
            animate={{ y: 0, opacity: 1 }} 
            transition={{ duration: 0.8, type: "spring", stiffness: 100 }}
          >
            Bridging Silence <br /> <span>With Technology</span>
          </motion.h1>
          <motion.p
            initial={{ y: 30, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.3, duration: 0.8 }}
          >
            Sign Bridge converts Pakistan Sign Language (PSL) into text and vice versa using advanced AI. 
            Empowering communication for everyone across Pakistan.
          </motion.p>
          <motion.div 
            className="hero-btns"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.5 }}
          >
            <button onClick={() => navigate('/sign-to-text')} className="primary-btn">Start Translating</button>
            <button onClick={() => navigate('/about')} className="secondary-btn">Learn More</button>
          </motion.div>
        </div>

        <div className="hero-visual-v3">
          <motion.div 
            className="ai-scanner-card"
            initial={{ opacity: 0, scale: 0.8, rotateY: 30 }}
            animate={{ opacity: 1, scale: 1, rotateY: 0 }}
            transition={{ duration: 1.2, type: "spring" }}
          >
            <div className="ai-scanner-card-inner">
              <div className="scanner-line"></div>
              
              {/* Glowing Hand Recognition Skeleton Visualizer */}
              <div className="hand-scan-visualizer">
                <svg viewBox="0 0 200 200" className="hand-svg">
                  {/* Radar scanning grids */}
                  <circle cx="100" cy="100" r="85" className="radar-circle radar-slow" />
                  <circle cx="100" cy="100" r="55" className="radar-circle radar-fast" />

                  {/* Connective Hand bones skeleton */}
                  <path d="M 100 170 Q 75 140 60 120 T 45 105 T 35 95" className="bone-line" />
                  <path d="M 100 170 Q 80 115 70 85 T 60 55 T 52 35" className="bone-line" />
                  <path d="M 100 170 Q 100 110 100 75 T 100 45 T 100 20" className="bone-line" />
                  <path d="M 100 170 Q 120 115 130 85 T 140 55 T 148 35" className="bone-line" />
                  <path d="M 100 170 Q 135 125 150 100 T 160 80 T 168 65" className="bone-line" />
                  
                  {/* Palm structural mesh joints */}
                  <path d="M 60 120 Q 80 115 100 110 Q 120 115 135 125" className="palm-mesh-line" />
                  <path d="M 100 170 Q 75 140 60 120" className="palm-mesh-line" />
                  <path d="M 100 170 Q 135 125 135 125" className="palm-mesh-line" />

                  {/* Glowing joint keypoints */}
                  <circle cx="100" cy="170" r="5" className="joint-node wrist" />
                  
                  <circle cx="75" cy="140" r="4" className="joint-node thumb-1" />
                  <circle cx="60" cy="120" r="4" className="joint-node thumb-2" />
                  <circle cx="45" cy="105" r="4" className="joint-node thumb-3" />
                  <circle cx="35" cy="95" r="4.5" className="joint-node thumb-tip" />
                  
                  <circle cx="80" cy="115" r="4" className="joint-node index-1" />
                  <circle cx="70" cy="85" r="4" className="joint-node index-2" />
                  <circle cx="60" cy="55" r="4" className="joint-node index-3" />
                  <circle cx="52" cy="35" r="4.5" className="joint-node index-tip" />
                  
                  <circle cx="100" cy="110" r="4" className="joint-node middle-1" />
                  <circle cx="100" cy="75" r="4" className="joint-node middle-2" />
                  <circle cx="100" cy="45" r="4" className="joint-node middle-3" />
                  <circle cx="100" cy="20" r="4.5" className="joint-node middle-tip" />
                  
                  <circle cx="120" cy="115" r="4" className="joint-node ring-1" />
                  <circle cx="130" cy="85" r="4" className="joint-node ring-2" />
                  <circle cx="140" cy="55" r="4" className="joint-node ring-3" />
                  <circle cx="148" cy="35" r="4.5" className="joint-node ring-tip" />
                  
                  <circle cx="135" cy="125" r="4" className="joint-node pinky-1" />
                  <circle cx="150" cy="100" r="4" className="joint-node pinky-2" />
                  <circle cx="160" cy="80" r="4" className="joint-node pinky-3" />
                  <circle cx="168" cy="65" r="4.5" className="joint-node pinky-tip" />
                </svg>
              </div>

              <div className="ai-interface">
                <div className="ai-node">Sign Detected: <span>"Assalam-o-Alaikum"</span></div>
                <div className="ai-node">Confidence: <span>98.4%</span></div>
                <div className="ai-node">Language: <span>PSL (Urdu)</span></div>
              </div>
              
              <div className="orbit-container">
                <div className="orbit-circle one"></div>
                <div className="orbit-circle two"></div>
              </div>

              <div className="status-badge">AI LIVE</div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* SECTION 2: HOW IT WORKS SLIDER */}
      <motion.section 
        className="how-it-works"
        initial={{ opacity: 0, y: 100 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-100px" }}
        transition={{ duration: 0.8 }}
      >
        <div className="section-header">
          <p className="overline">PROCESS</p>
          <h2>How It Works</h2>
          <div className="neon-divider"></div>
        </div>

        <div className="slider-container">
          <button className="nav-btn left" onClick={prevStep}>
            <motion.span whileHover={{ scale: 1.2 }}>&larr;</motion.span>
          </button>

          <div className="steps-display">
            <AnimatePresence mode="wait">
              <motion.div 
                key={activeStep}
                initial={{ opacity: 0, x: 100, scale: 0.9 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                exit={{ opacity: 0, x: -100, scale: 0.9 }}
                transition={{ duration: 0.6, type: "spring" }}
                className="step-card active"
              >
                <div className="step-num">{steps[activeStep].num}</div>
                <h3>{steps[activeStep].title}</h3>
                <p>{steps[activeStep].desc}</p>
              </motion.div>
            </AnimatePresence>
          </div>

          <button className="nav-btn right" onClick={nextStep}>
            <motion.span whileHover={{ scale: 1.2 }}>&rarr;</motion.span>
          </button>
        </div>

        <div className="dots-container">
          {steps.map((_, i) => (
            <div 
              key={i} 
              className={`dot ${i === activeStep ? 'active' : ''}`}
              onClick={() => setActiveStep(i)}
            ></div>
          ))}
        </div>
      </motion.section>

      {/* SECTION 3: TECH SPECS */}
      <motion.section 
        className="tech-section"
        initial={{ opacity: 0, y: 100 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-100px" }}
        transition={{ duration: 0.8 }}
      >
        <div className="tech-text">
          <h6 className="overline">OUR TECHNOLOGY</h6>
          <h2>Smart Interpretation <br /> <span>With Real-time AI</span></h2>
          <p>
            Sign Bridge uses advanced Computer Vision and Neural Networks specifically fine-tuned for the nuances of <b>Pakistan Sign Language (PSL)</b>.
          </p>
          
          <ul className="tech-list-v2">
            <motion.li whileHover={{ scale: 1.05 }}>
              <span className="icon">⚡</span>
              <div>
                <strong>High Accuracy</strong>
                <p>Over 90% recognition rate in varying lighting conditions.</p>
              </div>
            </motion.li>
            <motion.li whileHover={{ scale: 1.05 }}>
              <span className="icon">🌍</span>
              <div>
                <strong>Localized Vocabulary</strong>
                <p>Support for regional PSL dialects used across Pakistan.</p>
              </div>
            </motion.li>
          </ul>
        </div>

        <div className="tech-visual-slider">
          <div className="slider-frame">
            <AnimatePresence mode="wait">
              <motion.img
                key={techIdx}
                src={techImages[techIdx]}
                alt="Technology Visual"
                initial={{ opacity: 0, scale: 1.1, filter: "blur(10px)" }}
                animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
                exit={{ opacity: 0, filter: "blur(10px)" }}
                transition={{ duration: 0.8 }}
                className="slider-img"
              />
            </AnimatePresence>
            <div className="corner-border top-right"></div>
            <div className="corner-border bottom-left"></div>
          </div>
        </div>
      </motion.section>
    </div>
  );
};

export default Home;