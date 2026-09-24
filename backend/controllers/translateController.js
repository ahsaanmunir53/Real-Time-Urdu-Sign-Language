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

const FRAMES = 30;
const KEYPOINT_DIM = 258;

// ---------------------------------------------------------------------------
// Resolving the ML service address.
//
// The previous version was:
//     RAW_ML.startsWith('http') ? RAW_ML : `https://${RAW_ML}`
// With render.yaml injecting "sign-ml-api:10000" (an internal host:port with
// no scheme) that produced "https://sign-ml-api:10000". TLS to an internal
// hostname on a non-standard port cannot succeed, so every request failed with
// ECONNREFUSED / ECONNRESET and the user saw "Server error". Locally the
// variable is unset, the fallback is used, and nothing looks wrong - which is
// why this only broke on deployment.
//
// Rule now: anything that looks like an internal address (bare hostname, or
// host:port, or *.internal) gets http://. A public domain gets https://.
// ---------------------------------------------------------------------------
function resolveMlUrl(raw) {
  const v = (raw || '').trim().replace(/\/+$/, '');
  if (!v) return 'http://127.0.0.1:8000';
  if (/^https?:\/\//i.test(v)) return v;
  const host = v.split(':')[0];
  const internal = !host.includes('.') || host.endsWith('.internal') ||
                   host === 'localhost' || /^\d+\.\d+\.\d+\.\d+$/.test(host);
  return (internal ? 'http://' : 'https://') + v;
}

const ML_API = resolveMlUrl(process.env.ML_API_URL);
console.log(`   [ml] ML_API_URL=${process.env.ML_API_URL || '(unset)'} -> using ${ML_API}`);

// A free instance sleeps after 15 minutes of idling and takes 30-90 s to wake.
// These timeouts are generous on purpose; a request that fails at 5 s looks
// identical to a service that is down.
const T_HEALTH = 90000;
const T_PREDICT = 120000;
const T_VIDEO = 180000;

function mlDownResponse(res, err) {
  const offline = ['ECONNREFUSED', 'ECONNRESET', 'ETIMEDOUT', 'ENOTFOUND',
                   'EAI_AGAIN', 'ECONNABORTED'].includes(err.code);
  console.error('ML API error:', err.code || err.message, '| target:', ML_API);
  return res.status(503).json({
    error: offline
      ? `Could not reach the ML service at ${ML_API}.`
      : 'ML service returned an error.',
    hint: offline
      ? 'If this is a free instance it may be waking up - try once more in a minute. ' +
        'Otherwise check that ML_API_URL points at the ML service and includes http:// or https://.'
      : undefined,
    detail: err.response?.data || err.message,
  });
}

// Wake the ML instance at boot so the first user is not the one who pays the
// cold start. Failure here is not fatal and is only logged.
(function warmUp() {
  axios.get(`${ML_API}/health`, { timeout: T_HEALTH })
    .then(({ data }) => console.log(`   [ml] ${data.ok ? 'model loaded' : 'REACHED BUT MODEL NOT LOADED: ' + data.error}`
      + (data.num_classes ? `, ${data.num_classes} classes` : '')))
    .catch((e) => console.log(`   [ml] warm-up failed (${e.code || e.message}) - will retry on first request`));
})();

// GET /api/translate/health  -> is the ML model actually loaded?
const health = async (req, res) => {
  try {
    const { data } = await axios.get(`${ML_API}/health`, { timeout: T_HEALTH });
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
      const { data } = await axios.post(`${ML_API}/predict`, { keypoints: kp }, { timeout: T_PREDICT });
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
        timeout: T_VIDEO,
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
      { responseType: 'arraybuffer', timeout: T_PREDICT });
    res.set('Content-Type', 'audio/mpeg');
    return res.send(Buffer.from(r.data));
  } catch (err) {
    return mlDownResponse(res, err);
  }
};

module.exports = { health, signToText, textToSign, textToVoice, dictionary, SIGN_TO_GLB };
