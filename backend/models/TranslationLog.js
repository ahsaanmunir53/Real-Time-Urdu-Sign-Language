const mongoose = require('mongoose');

const translationSchema = new mongoose.Schema({
  type: { type: String, enum: ['sign-to-text', 'text-to-sign'], required: true },
  input: String,
  output: String,
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Translation', translationSchema);
