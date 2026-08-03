import React, { useState, useMemo, Suspense, useEffect, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import {
  OrbitControls, useGLTF, useAnimations, ContactShadows,
  Environment, Html, useProgress, Float,
} from '@react-three/drei';
import { Cpu, Search, RotateCcw, Play, Pause, Camera, BookOpen } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import './Avatar3D.css';

/* ------------------------------------------------------------------ data
   All 41 .glb files, verified against the actual filenames in public/models.
   `live: true` means the camera model can also RECOGNISE this sign (33 of them);
   the rest are dictionary-only - you can learn them, but recognition doesn't
   cover them yet. That distinction is real information, so the UI shows it. */
const SIGNS = [
  { word: 'انتہائی',    file: 'intahai.glb',    live: true },
  { word: 'اچھا',       file: 'Acha2.glb',      live: true },
  { word: 'اہم',        file: 'Ahm.glb',        live: true },
  { word: 'بھاری',      file: 'Bhari.glb',      live: true },
  { word: 'تیار',       file: 'Tiar.glb',       live: true },
  { word: 'جلدی',       file: 'jaldi.glb',      live: true },
  { word: 'خبردار',     file: 'khabardar.glb',  live: true },
  { word: 'خطرناک',     file: 'khatarnak.glb',  live: true },
  { word: 'خوفناک',     file: 'Khofnak.glb',    live: true },
  { word: 'دور',        file: 'Dure.glb',       live: true },
  { word: 'دیر سے',     file: 'Dair-sa.glb',    live: true },
  { word: 'ذہین',       file: 'Zahine.glb',     live: true },
  { word: 'سستا',       file: 'sasta.glb',      live: true },
  { word: 'شور',        file: 'Shorr.glb',      live: true },
  { word: 'صحت مند',    file: 'sahatmand.glb',  live: true },
  { word: 'غیر ملکی',   file: 'gair-mulki.glb', live: true },
  { word: 'مضحکہ خیز',  file: 'mazhaka.glb',    live: true },
  { word: 'نہیں',       file: 'nahi.glb',       live: true },
  { word: 'نیا',        file: 'naya.glb',       live: true },
  { word: 'پاگل',       file: 'pagal.glb',      live: true },
  { word: 'پرامن',      file: 'puraman.glb',    live: true },
  { word: 'پرجوش',      file: 'purjosh.glb',    live: true },
  { word: 'کم',         file: 'kum.glb',        live: true },
  { word: 'ہاں',        file: 'han.glb',        live: true },
  { word: 'ہوشیار',     file: 'hoshair.glb',    live: true },
  // dictionary-only: a 3D sign exists, recognition doesn't cover it yet
  { word: 'آؤ',         file: 'Ao.glb',         live: false },
  { word: 'آپ',         file: 'Ap.glb',         live: false },
  { word: 'بند کرو',    file: 'Band kro.glb',   live: false },
  { word: 'بھوکے ہو',   file: 'Bhoka ho.glb',   live: false },
  { word: 'بولنا',      file: 'Bolna.glb',      live: false },
  { word: 'دکھنا',      file: 'Dakhna.glb',     live: false },
  { word: 'دروازہ',     file: 'Darwaza.glb',    live: false },
  { word: 'انگریزی',    file: 'English.glb',    live: false },
  { word: 'سمجھ گیا',   file: 'Samjha.glb',     live: false },
  { word: 'ٹی وی',      file: 'TV.glb',         live: false },
  { word: 'تم',         file: 'Tum.glb',        live: false },
  { word: 'چاہتا ہوں',  file: 'chahta ho.glb',  live: false },
  { word: 'ہو',         file: 'ho.glb',         live: false },
  { word: 'کھاؤ',       file: 'khao.glb',       live: false },
  { word: 'پانی پینا',  file: 'pani-pena.glb',  live: false },
  { word: 'اسکول',      file: 'school.glb',     live: false },
];

/* ------------------------------------------------------------ 3D helpers */
function Loader() {
  const { progress } = useProgress();
  return (
    <Html center>
      <div className="glb-loader">
        <div className="glb-loader-ring" />
        <span>{Math.round(progress)}%</span>
      </div>
    </Html>
  );
}

function AvatarModel({ file, speed, playing, replayKey }) {
  const { scene, animations } = useGLTF(`/models/${encodeURIComponent(file)}`);
  const { actions, names } = useAnimations(animations, scene);
  const actionRef = useRef(null);

  useEffect(() => {
    if (!names.length) return;
    const action = actions[names[0]];
    actionRef.current = action;
    action.reset().fadeIn(0.4).play();
    return () => action.fadeOut(0.3);
  }, [actions, names, file, replayKey]);

  useEffect(() => {
    const a = actionRef.current;
    if (!a) return;
    a.timeScale = speed;
    a.paused = !playing;
  }, [speed, playing]);

  return (
    <Float speed={1.2} rotationIntensity={0.12} floatIntensity={0.25}>
      <primitive object={scene} scale={3.8} position={[0, -2.5, 0]} />
    </Float>
  );
}

/* A slow drifting light so the scene never feels static. */
function DriftingKeyLight() {
  const ref = useRef();
  useFrame(({ clock }) => {
    const t = clock.getElapsedTime() * 0.35;
    if (ref.current) {
      ref.current.position.x = Math.sin(t) * 7;
      ref.current.position.z = Math.cos(t) * 7 + 3;
    }
  });
  return <spotLight ref={ref} position={[6, 8, 6]} angle={0.35} penumbra={1}
                    intensity={2.4} color="#00d4ff" castShadow />;
}

/* -------------------------------------------------------------- component */
const Avatar3D = () => {
  const [selected, setSelected] = useState(null);
  const [query, setQuery] = useState('');
  const [speed, setSpeed] = useState(0.6);
  const [playing, setPlaying] = useState(true);
  const [replayKey, setReplayKey] = useState(0);
  const [onlyLive, setOnlyLive] = useState(false);

  const filtered = useMemo(() => {
    const q = query.trim();
    return SIGNS.filter((s) => (!onlyLive || s.live) && (!q || s.word.includes(q)));
  }, [query, onlyLive]);

  const liveCount = SIGNS.filter((s) => s.live).length;

  return (
    <div className="avatar-dark-card">
      {/* ------------------------------------------------ word list */}
      <aside className="selection-sidebar">
        <div className="sidebar-head">
          <h3 className="sidebar-title">اردو لغت</h3>
          <p className="sidebar-sub">{SIGNS.length} signs · {liveCount} recognised live</p>
        </div>

        <div className="search-wrap">
          <Search size={15} className="search-icon" />
          <input
            className="search-input"
            placeholder="لفظ تلاش کریں…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>

        <button
          className={`filter-chip ${onlyLive ? 'on' : ''}`}
          onClick={() => setOnlyLive((v) => !v)}
        >
          <Camera size={13} />
          Camera-recognised only
        </button>

        <div className="word-list">
          {filtered.length === 0 && (
            <p className="no-match">No sign matches “{query}”. Try a shorter word.</p>
          )}
          {filtered.map((s, i) => (
            <motion.button
              key={s.file}
              className={`word-row ${selected?.file === s.file ? 'active' : ''}`}
              onClick={() => { setSelected(s); setPlaying(true); setReplayKey((k) => k + 1); }}
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: Math.min(i, 14) * 0.018, duration: 0.25 }}
              whileHover={{ x: 4 }}
            >
              <span className="word-text">{s.word}</span>
              <span
                className={`word-tag ${s.live ? 'live' : 'dict'}`}
                title={s.live ? 'The camera can recognise this sign'
                              : 'Learn only - recognition not trained for this word yet'}
              >
                {s.live ? <Camera size={11} /> : <BookOpen size={11} />}
              </span>
            </motion.button>
          ))}
        </div>
      </aside>

      {/* ------------------------------------------------ 3D viewport */}
      <div className="avatar-viewport">
        <AnimatePresence mode="wait">
          {selected ? (
            <motion.div
              key={selected.file}
              className="viewport-inner"
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.97 }}
              transition={{ duration: 0.35 }}
            >
              <div className="viewport-header">
                <div>
                  <p className="viewport-eyebrow">
                    {selected.live ? 'Recognised live' : 'Dictionary only'}
                  </p>
                  <h2 className="viewport-word">{selected.word}</h2>
                </div>
                <div className="playback">
                  <button onClick={() => setPlaying((p) => !p)}
                          title={playing ? 'Pause' : 'Play'}>
                    {playing ? <Pause size={15} /> : <Play size={15} />}
                  </button>
                  <button onClick={() => setReplayKey((k) => k + 1)} title="Replay">
                    <RotateCcw size={15} />
                  </button>
                  <div className="speed-group">
                    {[0.35, 0.6, 1].map((s) => (
                      <button
                        key={s}
                        className={speed === s ? 'sp on' : 'sp'}
                        onClick={() => setSpeed(s)}
                      >
                        {s === 0.35 ? 'Slow' : s === 0.6 ? 'Normal' : 'Full'}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <Canvas shadows camera={{ position: [0, 0, 5], fov: 45 }} dpr={[1, 2]}>
                <ambientLight intensity={0.45} />
                <DriftingKeyLight />
                <pointLight position={[-8, -6, -8]} intensity={0.8} color="#7000ff" />
                <Environment preset="night" />
                <Suspense fallback={<Loader />}>
                  <AvatarModel
                    file={selected.file}
                    speed={speed}
                    playing={playing}
                    replayKey={replayKey}
                  />
                  <ContactShadows opacity={0.55} scale={11} blur={2.4} far={4.6} color="#000" />
                </Suspense>
                <OrbitControls
                  enableZoom
                  minDistance={3}
                  maxDistance={8}
                  minPolarAngle={Math.PI / 3}
                  maxPolarAngle={Math.PI / 2}
                />
              </Canvas>

              <p className="viewport-hint">Drag to rotate · scroll to zoom</p>
            </motion.div>
          ) : (
            <motion.div
              key="placeholder"
              className="dark-placeholder"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.4 }}
            >
              <div className="hologram-container">
                <div className="hologram-scanner-circle" />
                <div className="hologram-projector-cone" />
                <motion.div
                  className="hologram-core"
                  animate={{ y: [0, -10, 0] }}
                  transition={{ repeat: Infinity, duration: 4, ease: 'easeInOut' }}
                >
                  <Cpu size={40} className="hologram-lucide-icon" />
                </motion.div>
              </div>
              <h3 className="hologram-title">Pick a word to see the sign</h3>
              <p className="hologram-text">
                Choose any of the {SIGNS.length} Urdu words on the left. The 3D avatar
                performs the sign, and you can slow it down or replay it while you learn.
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

// warm the cache for the first few models so the initial pick feels instant
SIGNS.slice(0, 4).forEach((s) => useGLTF.preload(`/models/${encodeURIComponent(s.file)}`));

export default Avatar3D;
