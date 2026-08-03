"""
Run this BEFORE anything else:   python check_setup.py

It verifies your Python version, the installed packages, and that your trained
model actually loads - so you find problems here instead of halfway through.
"""
import os
import sys

OK, BAD, WARN = "[ OK ]", "[FAIL]", "[WARN]"
problems = []


def line(tag, msg):
    print(f"  {tag}  {msg}")


print("=" * 66)
print("  ENVIRONMENT CHECK")
print("=" * 66)

# ---- python version ----
v = sys.version_info
pyver = f"{v.major}.{v.minor}.{v.micro}"
if v.major == 3 and 10 <= v.minor <= 12:
    line(OK, f"Python {pyver}")
else:
    line(BAD, f"Python {pyver} - needs 3.10, 3.11 or 3.12")
    problems.append(
        f"Python {v.major}.{v.minor} will not work.\n"
        "        TensorFlow 2.19 has no wheel for it, and TF 2.20+ requires\n"
        "        protobuf 5, which breaks mediapipe at runtime.\n"
        "        Install Python 3.12, then:  py -3.12 -m venv venv"
    )

# ---- packages ----
CHECKS = [
    ("numpy", None), ("cv2", None), ("flask", None), ("flask_cors", None),
    ("sklearn", None), ("google.protobuf", "4.25"), ("tensorflow", "2.19"),
    ("mediapipe", "0.10.14"),
]
import importlib

for mod, want in CHECKS:
    try:
        m = importlib.import_module(mod)
        got = getattr(m, "__version__", "installed")
        if want and isinstance(got, str) and not got.startswith(want):
            line(WARN, f"{mod} {got}  (expected {want}.x)")
        else:
            line(OK, f"{mod} {got}")
    except Exception as e:
        line(BAD, f"{mod} missing")
        problems.append(f"{mod} not installed -> pip install -r requirements.txt")

# ---- mediapipe actually functions ----
try:
    import numpy as np
    import mediapipe as mp
    if not hasattr(mp, "solutions"):
        raise RuntimeError("this mediapipe has no solutions API (too new)")
    img = (np.random.rand(240, 320, 3) * 255).astype(np.uint8)
    with mp.solutions.holistic.Holistic(min_detection_confidence=0.5,
                                        min_tracking_confidence=0.5) as h:
        h.process(img)
    line(OK, "mediapipe holistic.process() runs")
except Exception as e:
    line(BAD, f"mediapipe cannot run: {type(e).__name__}: {str(e)[:70]}")
    problems.append("mediapipe fails at runtime - almost always a protobuf clash.\n"
                    "        pip install protobuf==4.25.3")

# ---- the trained model ----
MODEL_DIR = os.environ.get("MODEL_DIR", r"D:\Company _work\SIGN_LANGUAGE\models")
print()
print(f"  model folder: {MODEL_DIR}")
try:
    import glob
    import pickle
    ks = sorted(glob.glob(os.path.join(MODEL_DIR, "model_*.keras")))
    if not ks:
        raise FileNotFoundError("no model_*.keras found")
    line(OK, f"found {len(ks)} model file(s): {[os.path.basename(k) for k in ks]}")

    enc = os.path.join(MODEL_DIR, "label_encoder.pkl")
    if not os.path.exists(enc):
        raise FileNotFoundError("label_encoder.pkl missing")
    with open(enc, "rb") as f:
        le = pickle.load(f)
    line(OK, f"label_encoder.pkl -> {len(le.classes_)} classes")

    import tensorflow as tf
    tf.get_logger().setLevel("ERROR")
    best = os.path.join(MODEL_DIR, "model_3.keras")
    m = tf.keras.models.load_model(best if os.path.exists(best) else ks[0])
    feat = int(m.input_shape[-1])
    out = int(m.output_shape[-1])
    line(OK, f"model loads -> input (30, {feat}), outputs {out} classes")
    if feat == 271:
        line(OK, "271 features = your new engineered model (correct)")
    elif feat == 258:
        line(WARN, "258 features = the OLD raw model")
    if out != len(le.classes_):
        line(BAD, f"MISMATCH: model has {out} classes, encoder has {len(le.classes_)}")
        problems.append("Model and label_encoder.pkl disagree. Copy the encoder from\n"
                        "        the SAME folder the model came from (models_v5).")
except Exception as e:
    line(BAD, f"{type(e).__name__}: {str(e)[:80]}")
    problems.append(f"Could not load the model from {MODEL_DIR}\n"
                    "        Set it explicitly:  set MODEL_DIR=D:\\path\\to\\models")

print()
print("=" * 66)
if problems:
    print(f"  {len(problems)} PROBLEM(S) TO FIX:\n")
    for i, p in enumerate(problems, 1):
        print(f"  {i}. {p}\n")
else:
    print("  ALL CHECKS PASSED - run:  python sign_model_api.py")
print("=" * 66)
