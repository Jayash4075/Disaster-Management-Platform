const express = require("express");

const router = express.Router();

const {signup, login, getMe, verifyOTP, resendOTP} = require("../controllers/authController.js");

const {protect} = require("../middleware/authmiddleware.js");

router.post("/signup", signup );
router.post("/login", login );
router.get("/me", protect, getMe );

router.post("/verify-otp", verifyOTP );

router.post( "/resend-otp", resendOTP );

module.exports = router;