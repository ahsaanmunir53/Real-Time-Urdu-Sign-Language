// controllers/translateController.js

const axios = require('axios');

// SIGN → TEXT using Flask model
const signToText = async (req, res) => {
  try {
    const { keypoints } = req.body;

    if (!keypoints || !Array.isArray(keypoints) || keypoints.length !== 30) {
      return res.status(400).json({ error: 'Invalid or missing keypoints. Expected [30, 258].' });
    }

    const response = await axios.post('http://127.0.0.1:8000/predict', {
      keypoints: keypoints
    });

    const { class_index, confidence } = response.data;

    res.status(200).json({
      translatedText: `Predicted class index: ${class_index}`,
      confidence: confidence
    });

  } catch (error) {
    console.error('❌ Flask model API error:', error.message);
    res.status(500).json({ error: 'Failed to translate sign to text.' });
  }
};

// TEXT → SIGN (placeholder)
const textToSign = (req, res) => {
  const { text } = req.body;

  // You can replace this with actual sign video/avatar logic later
  res.status(200).json({
    message: `Text "${text}" converted to sign successfully (stub).`
  });
};

module.exports = {
  signToText,
  textToSign
};
