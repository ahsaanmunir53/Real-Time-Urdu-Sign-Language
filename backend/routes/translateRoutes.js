const express = require('express');
const router = express.Router();
const { signToText, textToSign } = require('../controllers/translateController');

// Route for converting sign language to text
router.post('/sign-to-text', signToText);

// Route for converting text to sign (e.g., rendering animations or 3D models)
router.post('/text-to-sign', textToSign);

module.exports = router;
