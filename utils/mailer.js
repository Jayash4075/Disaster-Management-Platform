const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_APP_PASSWORD 
  }
});

exports.sendOTP = async (toEmail, otp) => {
  await transporter.sendMail({
    from: `"ResQTech" <${process.env.EMAIL_USER}>`,
    to: toEmail,
    subject: "Your ResQTech verification code",
    html: `<p>Your OTP is <b>${otp}</b>. It expires in 5 minutes.</p>`
  });
};