const express = require("express");
const router = express.Router();

const { protect, authorize } = require("../middleware/authmiddleware");

const { getAuthorityDashboard, getCitizenDashboard } = require("../controllers/dashboardController.js");

router.get("/", protect, getCitizenDashboard);
router.get("/authority", protect, authorize("authority"), getAuthorityDashboard);

module.exports = router;