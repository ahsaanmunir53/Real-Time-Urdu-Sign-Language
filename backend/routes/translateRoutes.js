const express = require('express');
const multer = require('multer');
const router = express.Router();

const {
  health, signToText, textToSign, textToVoice, dictionary,
} = require('../controllers/translateController');

// keep uploads in memory - we forward them straight to the Flask service
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 50 * 1024 * 1024 } });

router.get('/health', health);              // is the ML model loaded?
router.get('/dictionary', dictionary);      // all words + their 3D model URLs
router.post('/sign-to-text', upload.single('video'), signToText);
router.post('/text-to-sign', textToSign);
router.post('/text-to-voice', textToVoice);

module.exports = router;
