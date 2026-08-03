const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const mongoose = require('mongoose');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json({ limit: '50mb' }));

// ---------------------------------------------------------------------------
// MongoDB is OPTIONAL here.
//
//   needs Mongo    : /api/auth (login, signup) and /api/otp
//   works WITHOUT  : /api/translate (sign->text, text->sign, dictionary, TTS)
//                    and the entire 3D avatar section
//
// A missing database does NOT stop sign recognition or the 3D dictionary.
// The old code dumped a 40-line Mongoose stack that made this look fatal.
// ---------------------------------------------------------------------------
const mongoUri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/sign_language_db';
let dbReady = false;

mongoose.connect(mongoUri, { serverSelectionTimeoutMS: 5000 })
  .then(() => { dbReady = true; console.log('   [db] connected to MongoDB'); })
  .catch((err) => {
    console.log('   [db] MongoDB NOT connected - ' + String(err.message).split('\n')[0]);
    console.log('        Login/signup are disabled until a database is running.');
    console.log('        Sign recognition + the 3D dictionary work fine without it.');
    console.log('        To enable auth: install MongoDB, or put an Atlas URL in .env');
  });

app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/otp', require('./routes/otpRoutes'));
app.use('/api/translate', require('./routes/translateRoutes'));

const modelsDir = path.join(__dirname, '..', 'frontend', 'public', 'models');
app.use('/models', express.static(modelsDir));

app.get('/', (req, res) => {
  res.json({
    backend: 'ok',
    database: dbReady ? 'connected' : 'not connected (auth disabled, rest works)',
    mlService: process.env.ML_API_URL || 'http://127.0.0.1:8000',
    check: { mlHealth: '/api/translate/health', dictionary: '/api/translate/dictionary' },
  });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  let glb = 0;
  try { glb = fs.readdirSync(modelsDir).filter(f => f.toLowerCase().endsWith('.glb')).length; }
  catch (_) {}
  console.log('');
  console.log('   backend running   : http://localhost:' + PORT);
  console.log('   3D models found   : ' + glb +
    (glb === 0 ? '   <-- paste your .glb files into frontend/public/models/' : ''));
  console.log('   ML service        : ' + (process.env.ML_API_URL || 'http://127.0.0.1:8000'));
  console.log('   verify everything : http://localhost:' + PORT + '/api/translate/health');
  console.log('');
});
