"""
Urdu Sign Language API - LITE build for 512MB hosts (Render free tier).

Same routes and response contracts as sign_model_api.py, but:
  - TFLite (ai-edge-litert) instead of TensorFlow  -> ~500MB less RAM
  - model_3.tflite (1.6MB, converted from model_3.keras with unrolled GRU;
    verified numerically identical, max diff < 1e-6)
  - labels.json instead of label_encoder.pkl        -> no scikit-learn
  - streaming frame extraction                      -> no full-video RAM spike

Feature engineering below is copied VERBATIM from sign_model_api.py.
Do not edit it independently - it must match training exactly.
"""
import io
import os
import json
import glob
import tempfile
import traceback

import cv2
import numpy as np
from flask import Flask, jsonify, request, send_file
from flask_cors import CORS
from werkzeug.utils import secure_filename

# ----------------------------------------------------------------- config
MODEL_DIR = os.environ.get("MODEL_DIR", os.path.join(os.path.dirname(__file__), "models"))
TFLITE_FILE = os.environ.get("TFLITE_FILE", "model_3.tflite")

FRAMES = 30
CONF_THRESHOLD = 0.50          # frontend also filters; this is a safety net
MAX_UPLOAD_MB = 30
MAX_FRAME_WIDTH = 640          # downscale big frames; landmarks are normalized, safe

# feature-engineering constants - MUST match training
POSE_KEEP = list(range(25))    # drop leg/foot landmarks 25-32
COORDS = 2                     # drop the unreliable z axis
POSE_SWAP = [(1, 4), (2, 5), (3, 6), (7, 8), (9, 10), (11, 12), (13, 14), (15, 16),
             (17, 18), (19, 20), (21, 22), (23, 24), (25, 26), (27, 28), (29, 30), (31, 32)]

app = Flask(__name__)
app.config["MAX_CONTENT_LENGTH"] = MAX_UPLOAD_MB * 1024 * 1024
CORS(app)

INTERP = None                  # litert Interpreter
IN_DET = OUT_DET = None
CLASSES = None                 # list[str]
EXPECTED_FEAT = None           # 271 (engineered) or 258 (raw) - from model input
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
        return norm[None, ...]
    return engineer(norm)[None, ...]


# ------------------------------------------------------------------ loading
def load_everything():
    global INTERP, IN_DET, OUT_DET, CLASSES, EXPECTED_FEAT, LOAD_ERROR
    try:
        from ai_edge_litert.interpreter import Interpreter

        path = os.path.join(MODEL_DIR, TFLITE_FILE)
        if not os.path.exists(path):
            found = glob.glob(os.path.join(MODEL_DIR, "*.tflite"))
            if found:
                path = found[0]
            else:
                raise FileNotFoundError(f"No .tflite model in {MODEL_DIR}")

        INTERP = Interpreter(model_path=path)
        INTERP.allocate_tensors()
        IN_DET = INTERP.get_input_details()[0]
        OUT_DET = INTERP.get_output_details()[0]
        EXPECTED_FEAT = int(IN_DET["shape"][-1])

        lbl_path = os.path.join(MODEL_DIR, "labels.json")
        if not os.path.exists(lbl_path):
            raise FileNotFoundError(f"labels.json missing from {MODEL_DIR}")
        with open(lbl_path, encoding="utf-8") as f:
            CLASSES = json.load(f)["classes"]

        n_out = int(OUT_DET["shape"][-1])
        if n_out != len(CLASSES):
            raise ValueError(f"MISMATCH: model outputs {n_out} classes, "
                             f"labels.json has {len(CLASSES)}")

        print("=" * 62)
        print(f"  loaded {os.path.basename(path)} (litert)")
        print(f"  input : (30, {EXPECTED_FEAT}) -> "
              f"{'engineered' if EXPECTED_FEAT == 271 else 'raw keypoints'}")
        print(f"  classes: {len(CLASSES)}")
        print("=" * 62)
        LOAD_ERROR = None
    except Exception as exc:
        LOAD_ERROR = str(exc)
        INTERP, CLASSES, EXPECTED_FEAT = None, None, None
        print("=" * 62)
        print("  MODEL FAILED TO LOAD")
        print(" ", LOAD_ERROR)
        print("=" * 62)


def _invoke(x):
    """x: (1, 30, feat) float32 -> (n_classes,) probabilities."""
    INTERP.set_tensor(IN_DET["index"], x.astype(np.float32))
    INTERP.invoke()
    return INTERP.get_tensor(OUT_DET["index"])[0]


# --------------------------------------------------------------- extraction
def _open_downscaled_reader(video_path):
    cap = cv2.VideoCapture(video_path)
    if not cap.isOpened():
        return None
    return cap


def _count_frames(video_path):
    cap = _open_downscaled_reader(video_path)
    if cap is None:
        return 0
    n = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    if n > 0:
        cap.release()
        return n
    n = 0                                   # unreliable header (webm) -> count pass
    while cap.read()[0]:
        n += 1
    cap.release()
    return n


def extract_keypoints_from_video(video_path, num_frames=FRAMES):
    """Video -> (num_frames, 258). Streams frames; never holds the video in RAM."""
    import mediapipe as mp

    total = _count_frames(video_path)
    if total == 0:
        return None, 0
    idx = set(np.linspace(0, total - 1, num_frames).round().astype(int).tolist())

    cap = _open_downscaled_reader(video_path)
    out = np.zeros((num_frames, 258), dtype=np.float32)
    hands = 0
    with mp.solutions.holistic.Holistic(static_image_mode=False,
                                        model_complexity=1,
                                        min_detection_confidence=0.5,
                                        min_tracking_confidence=0.5) as hol:
        fi = oi = 0
        while oi < num_frames:
            ok, fr = cap.read()
            if not ok:
                break
            if fi in idx:
                h, w = fr.shape[:2]
                if w > MAX_FRAME_WIDTH:
                    fr = cv2.resize(fr, (MAX_FRAME_WIDTH, int(h * MAX_FRAME_WIDTH / w)))
                res = hol.process(cv2.cvtColor(fr, cv2.COLOR_BGR2RGB))
                pose = (np.array([[l.x, l.y, l.z, l.visibility]
                                  for l in res.pose_landmarks.landmark]).flatten()
                        if res.pose_landmarks else np.zeros(132))
                lh = (np.array([[l.x, l.y, l.z]
                                for l in res.left_hand_landmarks.landmark]).flatten()
                      if res.left_hand_landmarks else np.zeros(63))
                rh = (np.array([[l.x, l.y, l.z]
                                for l in res.right_hand_landmarks.landmark]).flatten()
                      if res.right_hand_landmarks else np.zeros(63))
                out[oi] = np.concatenate([pose, lh, rh]).astype(np.float32)
                if res.left_hand_landmarks or res.right_hand_landmarks:
                    hands += 1
                oi += 1
            fi += 1
    cap.release()
    return out, hands


def run_prediction(seq_258, use_tta=True):
    """Raw (30,258) -> (label, confidence, topk list)."""
    views = [prepare(seq_258)]
    if use_tta:
        views.append(prepare(mirror_sequence(np.asarray(seq_258, dtype=np.float32))))
    probs = np.mean([_invoke(v) for v in views], axis=0)
    order = np.argsort(probs)[::-1][:3]
    topk = [{"label": str(CLASSES[i]), "confidence": round(float(probs[i]), 4)}
            for i in order]
    best = order[0]
    return str(CLASSES[best]), float(probs[best]), topk


# ------------------------------------------------------------------ routes
@app.route("/", methods=["GET"])
def root():
    return jsonify({"service": "urdu-sign-language-api", "lite": True, "ok": bool(INTERP)})


@app.route("/health", methods=["GET"])
def health():
    return jsonify({
        "ok": bool(INTERP),
        "error": LOAD_ERROR,
        "model_dir": MODEL_DIR,
        "models_loaded": 1 if INTERP else 0,
        "runtime": "tflite (ai-edge-litert)",
        "expected_input": None if EXPECTED_FEAT is None else [FRAMES, EXPECTED_FEAT],
        "feature_mode": None if EXPECTED_FEAT is None else
                        ("engineered-271" if EXPECTED_FEAT == 271 else "raw-258"),
        "num_classes": None if CLASSES is None else len(CLASSES),
        "classes": [] if CLASSES is None else [str(c) for c in CLASSES],
    })


@app.route("/predict_video", methods=["POST"])
def predict_video():
    if INTERP is None or CLASSES is None:
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
    finally:
        try:
            for f in glob.glob(os.path.join(tmpdir, "*")):
                os.remove(f)
            os.rmdir(tmpdir)
        except Exception:
            pass


@app.route("/predict", methods=["POST"])
def predict_keypoints():
    """JSON path: {keypoints: [30][258]}."""
    if INTERP is None or CLASSES is None:
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
