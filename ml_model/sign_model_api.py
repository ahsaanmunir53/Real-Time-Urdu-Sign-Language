import io
import os
import pickle
import glob
import tempfile
import traceback

import cv2
import numpy as np
from flask import Flask, jsonify, request, send_file
from flask_cors import CORS
from werkzeug.utils import secure_filename

# ----------------------------------------------------------------- config
# Where your downloaded model lives. Override with the MODEL_DIR env var.
DEFAULT_MODEL_DIR = r"D:\Company _work\SIGN_LANGUAGE\models"
MODEL_DIR = os.environ.get("MODEL_DIR", DEFAULT_MODEL_DIR)

# Prefer your best single model (89.42%). The ensemble scored 88.86%, so one
# model is both faster AND slightly more accurate here.
PREFERRED_MODEL = "model_3.keras"
USE_ALL_MODELS = os.environ.get("USE_ALL_MODELS", "0") == "1"

FRAMES = 30
CONF_THRESHOLD = 0.50          # frontend also filters; this is a safety net

# feature-engineering constants - MUST match training
POSE_KEEP = list(range(25))    # drop leg/foot landmarks 25-32
COORDS = 2                     # drop the unreliable z axis
POSE_SWAP = [(1, 4), (2, 5), (3, 6), (7, 8), (9, 10), (11, 12), (13, 14), (15, 16),
             (17, 18), (19, 20), (21, 22), (23, 24), (25, 26), (27, 28), (29, 30), (31, 32)]

app = Flask(__name__)
CORS(app)

MODELS = []
LABELS = None
EXPECTED_FEAT = None           # 271 (new) or 258 (old) - detected from the model
LOAD_ERROR = None


# ------------------------------------------------- preprocessing (training-identical)
def normalize_sequence(seq):
    """Centre on the shoulders and scale by shoulder width -> position/size invariant."""
    out = seq.copy()
    for t in range(out.shape[0]):
        fr = out[t]
        if not np.any(fr):
            continue
        pose = fr[:132].reshape(33, 4)
        lh = fr[132:195].reshape(21, 3)
        rh = fr[195:258].reshape(21, 3)
        if np.any(pose[:, :3]):
            center = (pose[11, :3] + pose[12, :3]) / 2.0
            scale = np.linalg.norm(pose[11, :3] - pose[12, :3]) or 1.0
            pose[:, :3] = (pose[:, :3] - center) / scale
            if np.any(lh):
                lh[:] = (lh - center) / scale
            if np.any(rh):
                rh[:] = (rh - center) / scale
        out[t] = np.concatenate([pose.flatten(), lh.flatten(), rh.flatten()])
    return np.nan_to_num(out)


def engineer(seq):
    """258 raw -> 271 engineered: position + velocity + 3 distances."""
    T = seq.shape[0]
    pose = seq[:, :132].reshape(T, 33, 4)[:, POSE_KEEP, :COORDS]
    lh = seq[:, 132:195].reshape(T, 21, 3)[:, :, :COORDS]
    rh = seq[:, 195:258].reshape(T, 21, 3)[:, :, :COORDS]
    static = np.concatenate([pose.reshape(T, -1), lh.reshape(T, -1), rh.reshape(T, -1)], axis=1)
    vel = np.empty_like(static)
    vel[0] = 0
    vel[1:] = static[1:] - static[:-1]
    lw, rw, nose = lh[:, 0, :], rh[:, 0, :], seq[:, :COORDS]
    dist = np.stack([np.linalg.norm(lw - rw, axis=1),
                     np.linalg.norm(lw - nose, axis=1),
                     np.linalg.norm(rw - nose, axis=1)], axis=1)
    return np.concatenate([static, vel, dist], axis=1).astype(np.float32)


def mirror_sequence(seq):
    """True horizontal mirror - used for test-time augmentation."""
    T = seq.shape[0]
    p = seq[:, :132].reshape(T, 33, 4).copy()
    l = seq[:, 132:195].reshape(T, 21, 3).copy()
    r = seq[:, 195:258].reshape(T, 21, 3).copy()
    p[..., 0] *= -1
    l[..., 0] *= -1
    r[..., 0] *= -1
    for a, b in POSE_SWAP:
        p[:, [a, b]] = p[:, [b, a]]
    return np.concatenate([p.reshape(T, 132), r.reshape(T, 63), l.reshape(T, 63)],
                          axis=1).astype(np.float32)


def prepare(seq_258):
    """Raw (30,258) -> whatever the loaded model expects."""
    norm = normalize_sequence(np.asarray(seq_258, dtype=np.float32))
    if EXPECTED_FEAT == 258:
        return norm[None, ...]                       # old model: raw features
    return engineer(norm)[None, ...]                 # new model: engineered


# ------------------------------------------------------------------ loading
def load_everything():
    global MODELS, LABELS, EXPECTED_FEAT, LOAD_ERROR
    try:
        import tensorflow as tf
        tf.get_logger().setLevel("ERROR")

        if not os.path.isdir(MODEL_DIR):
            raise FileNotFoundError(
                f"MODEL_DIR does not exist: {MODEL_DIR}\n"
                f"Set it with an env var, e.g.  set MODEL_DIR=D:\\path\\to\\models"
            )

        preferred = os.path.join(MODEL_DIR, PREFERRED_MODEL)
        if USE_ALL_MODELS:
            paths = sorted(glob.glob(os.path.join(MODEL_DIR, "model_*.keras")))
        elif os.path.exists(preferred):
            paths = [preferred]
        else:
            paths = sorted(glob.glob(os.path.join(MODEL_DIR, "model_*.keras")))[:1]

        if not paths:
            raise FileNotFoundError(
                f"No model_*.keras found in {MODEL_DIR}. "
                f"Unzip sign_model_v5.zip there (model_0..model_4 + label_encoder.pkl)."
            )

        MODELS = [tf.keras.models.load_model(p) for p in paths]
        EXPECTED_FEAT = int(MODELS[0].input_shape[-1])

        enc_path = os.path.join(MODEL_DIR, "label_encoder.pkl")
        if not os.path.exists(enc_path):
            raise FileNotFoundError(f"label_encoder.pkl missing from {MODEL_DIR}")
        with open(enc_path, "rb") as f:
            LABELS = pickle.load(f)

        n_out = int(MODELS[0].output_shape[-1])
        if n_out != len(LABELS.classes_):
            raise ValueError(
                f"MISMATCH: model outputs {n_out} classes but the encoder has "
                f"{len(LABELS.classes_)}. You are mixing an old encoder with a new "
                f"model - copy label_encoder.pkl from the same folder as the model."
            )

        print("=" * 62)
        print(f"  loaded {len(MODELS)} model(s): {[os.path.basename(p) for p in paths]}")
        print(f"  input  : (30, {EXPECTED_FEAT})  -> "
              f"{'engineered' if EXPECTED_FEAT == 271 else 'raw keypoints'}")
        print(f"  classes: {len(LABELS.classes_)}")
        print("=" * 62)
        LOAD_ERROR = None
    except Exception as exc:
        LOAD_ERROR = str(exc)
        MODELS, LABELS, EXPECTED_FEAT = [], None, None
        print("=" * 62)
        print("  MODEL FAILED TO LOAD")
        print(" ", LOAD_ERROR)
        print("=" * 62)


# --------------------------------------------------------------- extraction
def extract_keypoints_from_video(video_path, num_frames=FRAMES):
    """Video -> (num_frames, 258). Samples evenly across THIS video only."""
    import mediapipe as mp

    cap = cv2.VideoCapture(video_path)
    if not cap.isOpened():
        return None, 0
    frames = []
    while True:
        ok, fr = cap.read()
        if not ok:
            break
        frames.append(fr)
    cap.release()
    if not frames:
        return None, 0

    idx = np.linspace(0, len(frames) - 1, num_frames).round().astype(int)
    out = np.zeros((num_frames, 258), dtype=np.float32)
    hands = 0
    with mp.solutions.holistic.Holistic(static_image_mode=False,
                                        model_complexity=1,
                                        min_detection_confidence=0.5,
                                        min_tracking_confidence=0.5) as hol:
        for i, fi in enumerate(idx):
            res = hol.process(cv2.cvtColor(frames[fi], cv2.COLOR_BGR2RGB))
            pose = (np.array([[l.x, l.y, l.z, l.visibility]
                              for l in res.pose_landmarks.landmark]).flatten()
                    if res.pose_landmarks else np.zeros(132))
            lh = (np.array([[l.x, l.y, l.z]
                            for l in res.left_hand_landmarks.landmark]).flatten()
                  if res.left_hand_landmarks else np.zeros(63))
            rh = (np.array([[l.x, l.y, l.z]
                            for l in res.right_hand_landmarks.landmark]).flatten()
                  if res.right_hand_landmarks else np.zeros(63))
            out[i] = np.concatenate([pose, lh, rh]).astype(np.float32)
            if res.left_hand_landmarks or res.right_hand_landmarks:
                hands += 1
    return out, hands


def run_prediction(seq_258, use_tta=True):
    """Raw (30,258) -> (label, confidence, topk list)."""
    views = [prepare(seq_258)]
    if use_tta:
        views.append(prepare(mirror_sequence(np.asarray(seq_258, dtype=np.float32))))
    probs = np.mean([np.mean([m.predict(v, verbose=0) for v in views], axis=0)
                     for m in MODELS], axis=0)[0]
    order = np.argsort(probs)[::-1][:3]
    topk = [{"label": str(LABELS.classes_[i]), "confidence": round(float(probs[i]), 4)}
            for i in order]
    best = order[0]
    return str(LABELS.classes_[best]), float(probs[best]), topk


# ------------------------------------------------------------------ routes
@app.route("/health", methods=["GET"])
def health():
    return jsonify({
        "ok": bool(MODELS),
        "error": LOAD_ERROR,
        "model_dir": MODEL_DIR,
        "models_loaded": len(MODELS),
        "expected_input": None if EXPECTED_FEAT is None else [FRAMES, EXPECTED_FEAT],
        "feature_mode": None if EXPECTED_FEAT is None else
                        ("engineered-271" if EXPECTED_FEAT == 271 else "raw-258"),
        "num_classes": None if LABELS is None else len(LABELS.classes_),
        "classes": [] if LABELS is None else [str(c) for c in LABELS.classes_],
    })


@app.route("/predict_video", methods=["POST"])
def predict_video():
    if not MODELS or LABELS is None:
        return jsonify({"prediction": "Prediction failed", "confidence": 0.0,
                        "error": LOAD_ERROR or "Model not loaded"}), 500
    try:
        if "video" not in request.files:
            return jsonify({"prediction": "Prediction failed", "confidence": 0.0,
                            "error": "No 'video' file in the request"}), 400

        video = request.files["video"]
        tmpdir = tempfile.mkdtemp(prefix="sign_")
        path = os.path.join(tmpdir, secure_filename(video.filename or "clip.webm"))
        video.save(path)

        # OpenCV reads .webm directly when built with ffmpeg; if not, transcode.
        probe = cv2.VideoCapture(path)
        readable = probe.isOpened() and probe.read()[0]
        probe.release()
        if not readable:
            mp4 = os.path.splitext(path)[0] + ".mp4"
            cap = cv2.VideoCapture(path)
            fps = cap.get(cv2.CAP_PROP_FPS) or 30
            w = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH)) or 640
            h = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT)) or 480
            out = cv2.VideoWriter(mp4, cv2.VideoWriter_fourcc(*"mp4v"), fps, (w, h))
            while True:
                ok, fr = cap.read()
                if not ok:
                    break
                out.write(fr)
            cap.release()
            out.release()
            path = mp4

        seq, hands = extract_keypoints_from_video(path)
        if seq is None:
            return jsonify({"prediction": "Prediction failed", "confidence": 0.0,
                            "error": "Could not read frames from the video"}), 400
        if hands < FRAMES * 0.3:
            return jsonify({"prediction": "Hands not clearly visible",
                            "confidence": 0.0,
                            "hands_detected": f"{hands}/{FRAMES}",
                            "error": "Hands were detected in too few frames"}), 200

        label, conf, topk = run_prediction(seq)
        return jsonify({"prediction": label, "confidence": conf,
                        "topk": topk, "hands_detected": f"{hands}/{FRAMES}"})
    except Exception as exc:
        traceback.print_exc()
        return jsonify({"prediction": "Prediction failed", "confidence": 0.0,
                        "error": str(exc)}), 500


@app.route("/predict", methods=["POST"])
def predict_keypoints():
    """JSON path used by the Node backend: {keypoints: [30][258]}."""
    if not MODELS or LABELS is None:
        return jsonify({"error": LOAD_ERROR or "Model not loaded"}), 500
    try:
        kp = (request.get_json(silent=True) or {}).get("keypoints")
        arr = np.asarray(kp, dtype=np.float32) if kp is not None else None
        if arr is None or arr.shape != (FRAMES, 258):
            return jsonify({"error": f"keypoints must be [{FRAMES}][258], got "
                                     f"{None if arr is None else list(arr.shape)}"}), 400
        label, conf, topk = run_prediction(arr)
        return jsonify({"prediction": label, "confidence": conf, "topk": topk})
    except Exception as exc:
        traceback.print_exc()
        return jsonify({"error": str(exc)}), 500


@app.route("/text-to-speech", methods=["POST"])
def text_to_speech():
    try:
        text = (request.get_json(silent=True) or {}).get("text", "").strip()
        if not text:
            return jsonify({"error": "Text is required"}), 400
        from gtts import gTTS
        buf = io.BytesIO()
        gTTS(text=text, lang="ur").write_to_fp(buf)
        buf.seek(0)
        return send_file(buf, mimetype="audio/mpeg",
                         as_attachment=False, download_name="speech.mp3")
    except Exception as exc:
        return jsonify({"error": str(exc)}), 500


if __name__ == "__main__":
    load_everything()
    print("\nlistening on http://127.0.0.1:8000   (check /health first)\n")
    app.run(host="127.0.0.1", port=8000, debug=False)
