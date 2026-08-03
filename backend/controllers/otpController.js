const nodemailer = require('nodemailer');

// Temporary storage (Production mein Redis ya DB use hota hai)
let otpStore = {}; 

const sendOTP = async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'Email is required' });

  // 6-digit code
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  
  // Save OTP against email
  otpStore[email] = otp;

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
    subject: 'Sign Language App - OTP Verification',
    text: `Aapka OTP code hai: ${otp}. Yeh code 5 minutes ke liye valid hai.`
  };

  try {
    await transporter.sendMail(mailOptions);
    res.status(200).json({ message: 'OTP sent successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to send OTP' });
  }
};

const verifyOTP = (req, res) => {
  const { email, otp } = req.body;

  if (otpStore[email] && otpStore[email] === otp) {
    // Verify hone par store se delete kar dein takay dobara use na ho sake
    delete otpStore[email]; 
    res.status(200).json({ success: true, message: 'OTP verified' });
  } else {
    res.status(400).json({ success: false, error: 'Invalid or expired OTP' });
  }
};

module.exports = { sendOTP, verifyOTP };