const express = require('express');
const router = express.Router();

const rateLimit = require('express-rate-limit');

const { protect, authorize } = require('../middleware/authmiddleware');
const {getHabitations, getAuthorityStats, syncAllFromML, recalculateRisk, getHazardOverview, getMLServiceStatus} = require("..controllers/habitationController.js");

const landingLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  message: { success: false, message: "Too many requests, please try again shortly." }
});

router.get("/", protect, authorize("authority"), landingLimiter, getHabitations);
router.get("/authority-stats", protect, authorize("authority"), getAuthorityStats);
router.get("/hazard-overview", protect, authorize("authority"), getHazardOverview);
router.get("/ml-health", protect, authorize("authority"), getMLServiceStatus);
router.post("sync-ml", protect, authorize("authority"), syncAllFromML);

router.get("/:id", protect, authorize("authority"), getHabitations);
router.post('/:id/recalculate', protect, authorize('authority'), recalculateRisk);

module.exports = router;