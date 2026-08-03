# ml_api_lite - Urdu Sign Language API (512MB build)

Drop-in replacement for `ml_model/sign_model_api.py` that fits free hosting
(Render free tier: 512MB). Verified peak RAM: ~367MB. Output parity with the
TF original verified to 6 decimal places.

- TFLite runtime (`ai-edge-litert`) instead of TensorFlow
- `models/model_3.tflite` (1.6MB) converted from model_3.keras (GRU unrolled)
- `models/labels.json` replaces label_encoder.pkl (no scikit-learn)
- Streaming frame extraction (video never fully loaded into RAM)
- Same routes/contracts: /health, /predict, /predict_video, /text-to-speech

## Run locally
    pip install -r requirements.txt      # needs Python 3.10-3.12, NOT 3.13
    python sign_api_lite.py              # http://127.0.0.1:8000/health

## Render settings (Web Service)
    Root Directory : ml_api_lite
    Runtime        : Python
    Build Command  : pip install -r requirements.txt
    Start Command  : gunicorn -w 1 --threads 2 --timeout 300 -b 0.0.0.0:$PORT app:app
    Env var        : PYTHON_VERSION = 3.12.6   (mediapipe has no 3.13 wheels)

Free-tier reality: instance sleeps after 15 min idle (first request wakes it,
~1 min), and 0.1 CPU means a video prediction takes tens of seconds. Fine for
demos; warm it up before presenting.

The original full-TF API in ml_model/ stays for local development.
