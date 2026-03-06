import React, { useState, Suspense, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, useGLTF, useAnimations } from '@react-three/drei';

// Component to load and animate the GLB model
function AvatarModel({ file }) {
  const { scene, animations } = useGLTF(`/models/${file}`);
  const { actions } = useAnimations(animations, scene);

  useEffect(() => {
    if (actions && Object.keys(actions).length > 0) {
      const firstAction = actions[Object.keys(actions)[0]];
      firstAction.reset().fadeIn(0.5);
      firstAction.timeScale = 0.5; // Slow down animation to 50% speed
      firstAction.play();

      return () => {
        firstAction.fadeOut(0.5);
        firstAction.stop();
      };
    }
  }, [actions]);

  return <primitive object={scene} scale={4.5} />;
}

// Main component
const Avatar3D = () => {
  const [selectedWord, setSelectedWord] = useState("");
  const [selectedFile, setSelectedFile] = useState("");

  // Urdu word to GLB filename mapping
  const avatarMap = {
    "تم": "Tum.glb",
    "اہم": "Ahm.glb",
     "آو":"Ao.glb",
      "آپ":"Ap.glb",
      "بند کرو":"Band kro.glb",
      "بھاری":"Bhari.glb",
      "بھوکے ہو":"Bhoka ho.glb",
      "بولنا":"Bolna.glb",
      "چاہتے ":"chahta ho.glb",
      "دیر سے":"Dair-sa.glb",
      "دکھنا":"Dakhna.glb", 
      "دروازہ":"Darwaza.glb",
      "انگریزی":"English.glb",
      "غیر ملکی":"gair-mulki.glb",
      "ہاں":"han.glb",
      "ہو":"ho.glb",
      "ہوشیار":"hoshair.glb",
      "انتہائی":"intahai.glb",
      "جلدی":"jaldi.glb",
      "خبردار":"khabardar.glb",// Change or add more mappings here
  };

  const handleChange = (e) => {
    const word = e.target.value;
    setSelectedWord(word);
    const file = avatarMap[word];
    setSelectedFile(file || "");
  };

  return (
    <div className="text-to-sign-container" style={{ padding: "20px", textAlign: "center" }}>
      <div className="text-to-sign-box">
        <h2 className="text-to-sign-heading">اردو لفظ منتخب کریں</h2>

        <select
          value={selectedWord}
          onChange={handleChange}
          className="text-to-sign-input"
          style={{
            padding: "10px",
            borderRadius: "10px",
            fontSize: "16px",
            marginBottom: "20px",
          }}
        >
          <option value="">-- اردو لفظ منتخب کریں --</option>
          {Object.keys(avatarMap).map((word) => (
            <option key={word} value={word}>
              {word}
            </option>
          ))}
        </select>

        {selectedFile && (
          <div className="avatar-wrapper" style={{ width: "100%", height: "500px" }}>
            <Canvas camera={{ position: [0, 0, 5] }}>
              <ambientLight intensity={1} />
              <directionalLight position={[2, 2, 5]} />
              <OrbitControls />
              <Suspense fallback={null}>
                <AvatarModel file={selectedFile} />
              </Suspense>
            </Canvas>
          </div>
        )}
      </div>
    </div>
  );
};

export default Avatar3D;
