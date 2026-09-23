const express = require("express");
const router = express.Router();

const { protect, authorize } = require("../middleware/authmiddleware");

const {
    getAuthorityDashboard,
    getCitizenDashboard
} = require("../controllers/dashboardController.js");

// ==========================================
// CITIZEN DASHBOARD
// GET /api/dashboard?lat=..&lng=..
// Any logged-in user can view — no role restriction,
// since every role is also a citizen using the app.
// ==========================================
router.get("/", protect, getCitizenDashboard);

// ==========================================
// AUTHORITY DASHBOARD
// GET /api/dashboard/authority
// ==========================================
router.get("/authority", protect, authorize("authority"), getAuthorityDashboard);

module.exports = router;