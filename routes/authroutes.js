const express = require("express");

const router = express.Router();

const {
    signup,
    login,
    getMe,
    verifyOTP,
    resendOTP,
} = require("../controllers/authController.js");

const {
    protect,
} = require("../middleware/authmiddleware.js");

// ==========================================
// SIGNUP
// Creates account + sends OTP
// ==========================================
router.post(
    "/signup",
    signup
);

// ==========================================
// LOGIN
// ==========================================
router.post(
    "/login",
    login
);

// ==========================================
// CURRENT USER
// ==========================================
router.get(
    "/me",
    protect,
    getMe
);

// ==========================================
// VERIFY OTP
// ==========================================
router.post(
    "/verify-otp",
    verifyOTP
);

// ==========================================
// RESEND OTP
// ==========================================
router.post(
    "/resend-otp",
    resendOTP
);

module.exports = router;