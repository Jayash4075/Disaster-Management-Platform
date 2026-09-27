const router = require("express").Router();

const {
    protect,
    authorize
} = require("../middleware/authmiddleware");

const relocationController =
    require("../controllers/relocationController");


// ============================================================
// SAFE / RELOCATION SITES
// ============================================================

router.get(
    "/sites",
    protect,
    authorize("authority"),
    relocationController.getSafeSites
);


// ============================================================
// PRIORITY VILLAGES
// ============================================================

router.get(
    "/priority-villages",
    protect,
    authorize("authority"),
    relocationController.getPriorityVillages
);


// ============================================================
// FIND NEARBY RELOCATION SITES
// ============================================================

router.get(
    "/find-nearby",
    protect,
    relocationController.findNearbyRelocationSites
);


// ============================================================
// CREATE RELOCATION SITE
// ============================================================

router.post(
    "/sites",
    protect,
    authorize("authority"),
    relocationController.createSite
);


// ============================================================
// RECOMMENDED SITE
// ============================================================

router.get(
    "/:id/site",
    protect,
    authorize("authority"),
    relocationController.getRecommendedSite
);


module.exports = router;