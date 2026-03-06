const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// ✅ Serve static models (GLB files)
app.use('/models', express.static(path.join(__dirname, 'frontend', 'public', 'models')));

// ✅ Basic Test Route
app.get('/', (req, res) => {
  res.send('Backend is working ✅');
});

// Your other API routes (auth, otp, etc)
// app.use('/api/auth', ...)

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`✅ Server running on http://localhost:${PORT}`);
});
