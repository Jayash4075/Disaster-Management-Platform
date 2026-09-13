const axios = require('axios');

exports.sendOTP = async (toEmail, otp) => {
  try {
    await axios.post(
      'https://api.brevo.com/v3/smtp/email',
      {
        sender: { name: "TerraSheild", email: "jayashmishra987@gmail.com" },
        to: [{ email: toEmail }],
        subject: "Your TerraSheild verification code",
        htmlContent: `<p>Your OTP is <b>${otp}</b>. It expires in 5 minutes.</p>`
      },
      {
        headers: {
          'api-key': process.env.BREVO_API_KEY,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      }
    );
  } catch (err) {
    console.error('Brevo send error:', err.response?.data || err.message);
    throw err; // re-throw so your existing rollback logic in authController still works
  }
};