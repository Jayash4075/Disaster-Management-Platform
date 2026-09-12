const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');

const {getLandingSummary} = require('../controllers/habitationController.js');

const landingLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  message: { success: false, message: "Too many requests, please try again shortly." }
});

router.get('/landing-summary', landingLimiter,getLandingSummary);



module.exports = router;