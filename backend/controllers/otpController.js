// controllers/otpController.js
const nodemailer = require('nodemailer');

let generatedOTP = null;

const sendOTP = async (req, res) => {
  const { email } = req.body;

  // Generate a 6-digit OTP
  generatedOTP = Math.floor(100000 + Math.random() * 900000).toString();

  // Email configuration
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS
    }
  });

  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: email,
    subject: 'Your OTP Code',
    text: `Your OTP is: ${generatedOTP}`
  };

  try {
    await transporter.sendMail(mailOptions);
    res.status(200).json({ message: 'OTP sent successfully' });
  } catch (error) {
    console.error('Error sending OTP:', error);
    res.status(500).json({ error: 'Failed to send OTP' });
  }
};

const verifyOTP = (req, res) => {
  const { otp } = req.body;
  if (otp === generatedOTP) {
    res.status(200).json({ message: 'OTP verified successfully' });
  } else {
    res.status(400).json({ error: 'Invalid OTP' });
  }
};

module.exports = {
  sendOTP,
  verifyOTP
};
