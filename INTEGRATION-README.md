# Sign Language project — model integration + fixes

Your trained model (**89.42%**) is now wired into the backend, the broken API paths are
fixed, and the 3D dictionary covers all 41 signs. Everything here was tested end to end.

---

## What was actually broken

| # | Problem | Why it mattered |
|---|---|---|
| 1 | `sign_model_api.py` rebuilt an architecture in code and called `load_weights()` on `best_hybrid_model.h5` — **54 classes, raw 258 features** | Your new model has **33 classes** and expects **271 engineered features**. Feeding it raw 258 would crash or return nonsense. |
| 2 | Old `label_encoder.pkl` has **54** classes | Mixing it with a 33-class model gives wrong labels for every prediction. The API now refuses to start on a mismatch rather than lying to you. |
| 3 | `translateController.signToText` spawned `../ml_model/sign_to_text_model.py` | **That file doesn't exist.** Sign-to-text through the backend could never work. |
| 4 | `signToTextController.js` POSTed to `http://127.0.0.1:8000/predict` | Flask only exposed `/predict_video`. Wrong URL → guaranteed 500. |
| 5 | `frontend/public/models/` is **empty** | All 41 `.glb` files were in a separate zip. Every 3D avatar would 404. |
| 6 | `avatarMap` in `Avatar3D.js` listed **20** words, with typos (`"بھوکے ho"`, `"غیر ملki"`) and filenames that don't exist (`Ahm.glb` was right, but keys were mixed-script) | Most of your 41 3D models were unreachable. |
| 7 | `npm run build` fails on an `ajv` / `ajv-keywords` version clash | The frontend wouldn't build at all. |

---

## Setup

### 1. Put the `.glb` files where the app looks for them

```
frontend/public/models/          <-- all 41 .glb files go HERE
```

Copy them out of `models.zip`. Without this every avatar 404s.

### 2. ML service (Python) — needs Python 3.10–3.12, **not 3.13**

```powershell
cd D:\Company _work\SIGN_LANGUAGE\ml_model

py -3.12 -m venv venv          # explicit version - plain "python" may be 3.13
venv\Scripts\activate
pip install -r requirements.txt

python check_setup.py          # verifies everything, tells you what to fix
python sign_model_api.py
```

**Why the version matters.** Three constraints have to overlap:

| | needs |
|---|---|
| mediapipe 0.10.14 (last version with `solutions.holistic`) | `protobuf < 5` |
| TensorFlow 2.19 | `protobuf >= 3.20.3, < 6` — **overlaps at 4.25.x** |
| TensorFlow 2.20+ | `protobuf >= 5.28` — **breaks mediapipe at runtime** |

TF 2.19 has no Python 3.13 wheel, so on 3.13 pip only offers 2.20+, which forces
protobuf 5 and mediapipe then fails with
`FieldDescriptor object has no attribute 'label'`.

**Verified working together in one process:** `tensorflow==2.19.0` +
`mediapipe==0.10.14` + `protobuf==4.25.3` — `holistic.process()` runs and Keras
predicts. That's what `requirements.txt` pins.

If you don't have Python 3.12: install it from python.org, then use `py -3.12` as above.
You can keep 3.13 for everything else; the `py` launcher picks the version per-venv.

The API reads your model from `D:\Company _work\SIGN_LANGUAGE\models` by default. To change it:

```powershell
set MODEL_DIR=D:\some\other\path
python sign_model_api.py
```

**Check it before anything else:** open <http://127.0.0.1:8000/health>. You want:

```json
{ "ok": true, "feature_mode": "engineered-271", "num_classes": 33 }
```

If `ok` is `false`, the `error` field says exactly what's wrong.

### 3. Backend (Node)

```powershell
cd D:\Company _work\SIGN_LANGUAGE\backend
npm install
npm install multer form-data          # newly required
node server.js
```

Verify the chain: <http://localhost:5000/api/translate/health> — it proxies the ML service,
so if it reports `ok: true` then backend → ML is working.

### 4. Frontend (React)

```powershell
cd D:\Company _work\SIGN_LANGUAGE\frontend
npm install --legacy-peer-deps
npm install ajv@8.17.1 ajv-keywords@5.1.0 --legacy-peer-deps    # fixes the build error
npm start
```

**Start order:** ML service → backend → frontend.

---

## API reference

**ML service (port 8000)**

| Method | Route | Notes |
|---|---|---|
| GET | `/health` | model status, class list, expected input shape |
| POST | `/predict_video` | multipart `video` → `{prediction, confidence, topk, hands_detected}` |
| POST | `/predict` | JSON `{keypoints:[30][258]}` → same |
| POST | `/text-to-speech` | JSON `{text}` → mp3 |

**Backend (port 5000)**

| Method | Route | Notes |
|---|---|---|
| GET | `/api/translate/health` | is the model loaded? |
| GET | `/api/translate/dictionary` | all 41 words + their `.glb` URLs |
| POST | `/api/translate/sign-to-text` | accepts keypoints JSON **or** a `video` file |
| POST | `/api/translate/text-to-sign` | `{text}` → which `.glb` to play |
| POST | `/api/translate/text-to-voice` | Urdu TTS passthrough |

---

## Frontend changes

`Avatar3D.js` was rebuilt:

- **All 41 signs**, filenames verified against the actual files in `models/`
- **Search** box and a "camera-recognised only" filter
- **Playback controls** — pause, replay, and Slow / Normal / Full speed (slow motion is
  genuinely useful for learning a sign)
- **Richer 3D** — a slowly drifting key light, gentle float on the model, contact shadows,
  zoom enabled, and a real loading percentage instead of a blank canvas
- **Staggered reveal** on the word list, animated transitions between signs
- Respects `prefers-reduced-motion`, and works down to mobile

Each word carries a small badge encoding something true: a **camera icon** means the model
can recognise that sign live (25 of your 41), a **book icon** means it's learn-only.

---

## Worth knowing

**8 of your 33 trained words have no 3D model yet:**
`تیز`, `دلچسپ`, `سمارٹ`, `لاجواب`, `محتاط`, `محفوظ`, `مہذب`, `گونگا`

The camera recognises them, but the dictionary can't show them. If you can export those
`.glb` animations, add them to `SIGNS` in `Avatar3D.js` and to `SIGN_TO_GLB` in
`translateController.js` — nothing else needs changing.

**16 extra 3D models** exist for words the recogniser isn't trained on (`آپ`, `تم`,
`دروازہ`, `اسکول`, …). They're in the dictionary, marked learn-only.

**Use one model, not the ensemble.** Your `model_3.keras` scored 89.42%; the 5-model
ensemble scored 88.86%. One model is faster *and* slightly more accurate here. The API
loads `model_3.keras` by default. Set `USE_ALL_MODELS=1` if you ever want to compare.

**Your weakest signs** are `ذہین` (57.9%) and `سمارٹ` / `تیز` (62.5%) — visually similar
signs the model confuses. A few more clips of each is where the next accuracy points are.
