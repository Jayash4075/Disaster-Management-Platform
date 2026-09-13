const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');

const {getLandingSummary, getAuthorityStats, getAllHabitations, getHabitationRisk} = require('../controllers/habitationController.js');
const { protect, authorize } = require('../middleware/authmiddleware');

const landingLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  message: { success: false, message: "Too many requests, please try again shortly." }
});

router.get('/landing-summary', landingLimiter,getLandingSummary);
router.get('/authority-stats', protect, authorize('authority'), getAuthorityStats);
router.get('/', protect, authorize('authority'), getAllHabitations);
router.get('/:id/risk', protect, authorize('authority'), getHabitationRisk);



module.exports = router;