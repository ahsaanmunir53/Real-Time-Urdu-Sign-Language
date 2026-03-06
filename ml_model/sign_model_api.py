from flask import Flask, request, jsonify
from flask_cors import CORS
import numpy as np
import pickle
import tensorflow as tf
import os
import cv2
import pandas as pd
from werkzeug.utils import secure_filename
from mediapipe_utils import extract_keypoints_from_video
from tensorflow.keras.models import Model
from tensorflow.keras.layers import (Input, LSTM, Dense, Dropout, Bidirectional,
                                     Conv1D, BatchNormalization, LayerNormalization,
                                     Attention, GlobalAveragePooling1D, Add)
from moviepy.editor import VideoFileClip  # 🔁 for .webm to .mp4 conversion

# === Flask App Initialization ===
app = Flask(__name__)
CORS(app)

# === Model Config ===
FRAMES_PER_SAMPLE = 30
KEYPOINT_DIM = 258
NUM_CLASSES = 54

# === Define the Model Architecture ===
def build_model(input_shape=(FRAMES_PER_SAMPLE, KEYPOINT_DIM), num_classes=NUM_CLASSES):
    input_layer = Input(shape=input_shape)

    x = Conv1D(128, kernel_size=3, activation='relu', padding='same')(input_layer)
    x = BatchNormalization()(x)
    x = Dropout(0.3)(x)

    x = Conv1D(64, kernel_size=3, activation='relu', padding='same')(x)
    x = BatchNormalization()(x)
    x = Dropout(0.3)(x)

    x = Bidirectional(LSTM(256, return_sequences=True))(x)
    x = LayerNormalization()(x)
    x = Dropout(0.4)(x)

    x = Bidirectional(LSTM(128, return_sequences=True))(x)
    x = BatchNormalization()(x)
    x = Dropout(0.4)(x)

    attention_out = Attention()([x, x])
    x = Add()([x, attention_out])
    x = LayerNormalization()(x)

    x = GlobalAveragePooling1D()(x)
    x = Dense(512, activation='relu')(x)
    x = Dropout(0.5)(x)

    x = Dense(256, activation='relu')(x)
    x = Dropout(0.4)(x)

    x = Dense(128, activation='relu')(x)
    x = Dropout(0.3)(x)

    output_layer = Dense(num_classes, activation='softmax')(x)

    return Model(inputs=input_layer, outputs=output_layer)

# === Load Model and Label Encoder ===
try:
    model = build_model()
    model.load_weights("C:/Users/Acer/OneDrive/Desktop/FYP/Real_Time_Urdu_Sign_Language/ml_model/best_hybrid_model.h5")
    print("✅ Model loaded successfully!")

    with open("C:/Users/Acer/OneDrive/Desktop/FYP/Real_Time_Urdu_Sign_Language/ml_model/label_encoder.pkl", "rb") as f:
        label_encoder = pickle.load(f)
    print("✅ Label encoder loaded successfully!")
except Exception as e:
    print("❌ Error loading model or label encoder:", e)
    model = None
    label_encoder = None

# === Health Check Route ===
@app.route("/predict_video", methods=["POST"])
def predict_video():
    if model is None or label_encoder is None:
        return jsonify({
            "prediction": "Prediction failed",
            "confidence": 0.0,
            "error": "Model or label encoder not loaded"
        }), 500

    try:
        video = request.files['video']
        filename = secure_filename(video.filename)
        os.makedirs("temp_videos", exist_ok=True)
        webm_path = os.path.join("temp_videos", filename)
        video.save(webm_path)

        print("📁 Saved video:", webm_path)

        # 🔄 Convert .webm to .mp4 manually using cv2
        if webm_path.endswith(".webm"):
            mp4_path = webm_path.replace(".webm", ".mp4")
            print("🔄 Converting .webm to .mp4 using OpenCV...")

            cap = cv2.VideoCapture(webm_path)
            fourcc = cv2.VideoWriter_fourcc(*'mp4v')
            fps = cap.get(cv2.CAP_PROP_FPS) or 30  # fallback if FPS not detected
            width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
            height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))

            out = cv2.VideoWriter(mp4_path, fourcc, fps, (width, height))

            while cap.isOpened():
                ret, frame = cap.read()
                if not ret:
                    break
                out.write(frame)

            cap.release()
            out.release()

            print("✅ Converted to:", mp4_path)
            video_path = mp4_path
        else:
            video_path = webm_path

        keypoints = extract_keypoints_from_video(video_path)
        print("📊 Keypoints:", "None" if keypoints is None else keypoints.shape)

        if keypoints is None or keypoints.shape != (30, 258):
            return jsonify({
                "prediction": "Prediction failed",
                "confidence": 0.0,
                "error": "Failed to extract valid keypoints"
            }), 400

        input_array = np.expand_dims(keypoints, axis=0)
        prediction = model.predict(input_array)[0]
        predicted_label = label_encoder.inverse_transform([np.argmax(prediction)])[0]
        confidence = float(np.max(prediction))

        return jsonify({
            "prediction": predicted_label,
            "confidence": confidence
        })

    except Exception as e:
        return jsonify({
            "prediction": "Prediction failed",
            "confidence": 0.0,
            "error": str(e)
        }), 500

# === Run the App ===
if __name__ == "__main__":
    app.run(host="127.0.0.1", port=8000)
