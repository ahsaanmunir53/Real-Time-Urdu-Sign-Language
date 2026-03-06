// controllers/translateController.js
const { spawn } = require('child_process');
const path = require('path');

// SIGN → TEXT using Python model
const signToText = (req, res) => {
  const pythonProcess = spawn('python', [
    path.join(__dirname, '../ml_model/sign_to_text_model.py')
  ]);

  pythonProcess.stdout.on('data', (data) => {
    const result = data.toString().trim();
    res.status(200).json({ translatedText: result });
  });

  pythonProcess.stderr.on('data', (data) => {
    console.error(`Error: ${data}`);
    res.status(500).json({ error: 'Error during sign-to-text conversion' });
  });
};

// TEXT → SIGN (placeholder)
const textToSign = (req, res) => {
  const { text } = req.body;

  // TODO: Integrate avatar animation logic here
  res.status(200).json({ message: `Text "${text}" converted to sign successfully (stub).` });
};

module.exports = {
  signToText,
  textToSign
};
