// controllers/translateController.js
//
// FIXED. The old version had three bugs:
//   1. signToText spawned '../ml_model/sign_to_text_model.py' - that file does not
//      exist (the real one is sign_model_api.py, and it runs as a Flask server).
//   2. A second copy of signToText in signToTextController.js POSTed to
//      http://127.0.0.1:8000/predict , which the Flask app did not expose.
//   3. Nothing checked whether the Flask ML service was actually running, so
//      failures surfaced as generic 500s with no clue what was wrong.
//
// Now: this controller proxies to the Flask ML API (which DOES expose /predict
// and /predict_video), and reports clearly when the ML service is down.

const axios = require('axios');
const FormData = require('form-data');

const RAW_ML = process.env.ML_API_URL || 'http://127.0.0.1:8000';
const ML_API = RAW_ML.startsWith('http') ? RAW_ML : `https://${RAW_ML}`;
const FRAMES = 30;
const KEYPOINT_DIM = 258;

function mlDownResponse(res, err) {
  const offline = ['ECONNREFUSED', 'ECONNRESET', 'ETIMEDOUT'].includes(err.code);
  console.error('ML API error:', err.code || err.message);
  return res.status(503).json({
    error: offline
      ? `ML service is not running at ${ML_API}. Start it with: python sign_model_api.py`
      : 'ML service returned an error.',
    detail: err.response?.data || err.message,
  });
}

// GET /api/translate/health  -> is the ML model actually loaded?
const health = async (req, res) => {
  try {
    const { data } = await axios.get(`${ML_API}/health`, { timeout: 5000 });
    return res.status(data.ok ? 200 : 503).json({ backend: 'ok', ml: data });
  } catch (err) {
    return mlDownResponse(res, err);
  }
};

// POST /api/translate/sign-to-text
// Accepts EITHER  { keypoints: [30][258] }  OR a multipart 'video' file.
const signToText = async (req, res) => {
  try {
    // --- path A: raw keypoints from the browser ---
    if (req.body && Array.isArray(req.body.keypoints)) {
      const kp = req.body.keypoints;
      if (kp.length !== FRAMES || !Array.isArray(kp[0]) || kp[0].length !== KEYPOINT_DIM) {
        return res.status(400).json({
          error: `keypoints must be [${FRAMES}][${KEYPOINT_DIM}]`,
          got: [kp.length, Array.isArray(kp[0]) ? kp[0].length : null],
        });
      }
      const { data } = await axios.post(`${ML_API}/predict`, { keypoints: kp }, { timeout: 60000 });
      return res.status(200).json({
        translatedText: data.prediction,
        confidence: data.confidence,
        topk: data.topk || [],
      });
    }

    // --- path B: an uploaded video file ---
    if (req.file) {
      const form = new FormData();
      form.append('video', req.file.buffer, req.file.originalname || 'clip.webm');
      const { data } = await axios.post(`${ML_API}/predict_video`, form, {
        headers: form.getHeaders(),
        timeout: 120000,
        maxBodyLength: Infinity,
      });
      return res.status(200).json({
        translatedText: data.prediction,
        confidence: data.confidence,
        topk: data.topk || [],
        handsDetected: data.hands_detected,
      });
    }

    return res.status(400).json({
      error: "Send either { keypoints: [30][258] } as JSON, or a 'video' file as multipart.",
    });
  } catch (err) {
    return mlDownResponse(res, err);
  }
};

// POST /api/translate/text-to-sign  -> which 3D model the frontend should play
const SIGN_TO_GLB = {
  'انتہائی': 'intahai.glb', 'اچھا': 'Acha2.glb', 'اہم': 'Ahm.glb', 'بھاری': 'Bhari.glb',
  'تیار': 'Tiar.glb', 'جلدی': 'jaldi.glb', 'خبردار': 'khabardar.glb',
  'خطرناک': 'khatarnak.glb', 'خوفناک': 'Khofnak.glb', 'دور': 'Dure.glb',
  'دیر سے': 'Dair-sa.glb', 'ذہین': 'Zahine.glb', 'سستا': 'sasta.glb', 'شور': 'Shorr.glb',
  'صحت مند': 'sahatmand.glb', 'غیر ملکی': 'gair-mulki.glb', 'مضحکہ خیز': 'mazhaka.glb',
  'نہیں': 'nahi.glb', 'نیا': 'naya.glb', 'پاگل': 'pagal.glb', 'پرامن': 'puraman.glb',
  'پرجوش': 'purjosh.glb', 'کم': 'kum.glb', 'ہاں': 'han.glb', 'ہوشیار': 'hoshair.glb',
  // dictionary-only words (3D model exists, not in the recogniser's 33 classes)
  'آؤ': 'Ao.glb', 'آپ': 'Ap.glb', 'بند کرو': 'Band kro.glb', 'بھوکے ہو': 'Bhoka ho.glb',
  'بولنا': 'Bolna.glb', 'دکھنا': 'Dakhna.glb', 'دروازہ': 'Darwaza.glb',
  'انگریزی': 'English.glb', 'سمجھ گیا': 'Samjha.glb', 'ٹی وی': 'TV.glb', 'تم': 'Tum.glb',
  'چاہتا ہوں': 'chahta ho.glb', 'ہو': 'ho.glb', 'کھاؤ': 'khao.glb',
  'پانی پینا': 'pani-pena.glb', 'اسکول': 'school.glb',
};

const textToSign = (req, res) => {
  const text = (req.body?.text || '').trim();
  if (!text) return res.status(400).json({ error: 'text is required' });

  const file = SIGN_TO_GLB[text];
  if (!file) {
    return res.status(404).json({
      error: `No 3D sign available for "${text}".`,
      available: Object.keys(SIGN_TO_GLB),
    });
  }
  return res.status(200).json({ text, model: file, url: `/models/${file}` });
};

// GET /api/translate/dictionary -> full word list for the frontend dropdown
const dictionary = (req, res) =>
  res.status(200).json({
    count: Object.keys(SIGN_TO_GLB).length,
    words: Object.entries(SIGN_TO_GLB).map(([word, file]) => ({
      word, model: file, url: `/models/${file}`,
    })),
  });

// POST /api/translate/text-to-voice -> proxy Urdu TTS from the Flask service
const textToVoice = async (req, res) => {
  try {
    const text = (req.body?.text || '').trim();
    if (!text) return res.status(400).json({ error: 'text is required' });
    const r = await axios.post(`${ML_API}/text-to-speech`, { text },
      { responseType: 'arraybuffer', timeout: 30000 });
    res.set('Content-Type', 'audio/mpeg');
    return res.send(Buffer.from(r.data));
  } catch (err) {
    return mlDownResponse(res, err);
  }
};

module.exports = { health, signToText, textToSign, textToVoice, dictionary, SIGN_TO_GLB };
