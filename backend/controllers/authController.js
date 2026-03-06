// controllers/authController.js
const User = require('../models/User');
const bcrypt = require('bcryptjs');

const registerUser = async (req, res) => {
  const { name, email, password } = req.body;
  try {
    const hashed = await bcrypt.hash(password, 10);
    const newUser = await User.create({ name, email, password: hashed });
    res.status(201).json(newUser);
  } catch (err) {
    res.status(400).json({ error: 'Registration failed' });
  }
};

const loginUser = async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await User.findOne({ email });
    if (!user) throw Error();
    
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) throw Error();

    res.status(200).json(user);
  } catch {
    res.status(401).json({ error: 'Invalid credentials' });
  }
};

module.exports = {
  registerUser,
  loginUser,
};
