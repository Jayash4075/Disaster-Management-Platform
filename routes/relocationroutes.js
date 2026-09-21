const router = require('express').Router();
const { protect, authorize } = require('../middleware/authmiddleware');
const relocationController = require('../controllers/relocationController');

router.get('/sites', protect, authorize('authority'), relocationController.getAllSites);
router.get('/priority-villages', protect, authorize('authority'), relocationController.getPriorityVillages);
router.get('/:id/site', protect, authorize('authority'), relocationController.getRecommendedSite);

module.exports = router;