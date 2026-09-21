const router = require('express').Router();
const { protect, authorize } = require('../middleware/authmiddleware');
const habitationController = require('../controllers/habitationController');

// Specific routes BEFORE /:id — Express matches top-down
router.get('/authority-stats', protect, authorize('authority'), habitationController.getAuthorityStats);
router.get('/hazard-overview', protect, authorize('authority'), habitationController.getHazardOverview);
router.get('/ml-service-status', protect, authorize('authority'), habitationController.getMLServiceStatus);
router.get('/assessment-status', protect, authorize('authority'), habitationController.getAssessmentStatus);
router.get('/ml-villages', protect, authorize('authority'), habitationController.getMLVillages);
router.get('/ml-villages/search', protect, authorize('authority'), habitationController.searchMLVillages);

router.post('/assess-village', protect, authorize('authority'), habitationController.assessVillage);
router.post('/', protect, authorize('authority'), habitationController.createHabitation);
router.post('/sync-ml', protect, authorize('authority'), habitationController.syncAllFromML);

router.get('/', protect, authorize('authority'), habitationController.getHabitations);
router.get('/:id', protect, authorize('authority'), habitationController.getHabitation);
router.post('/:id/recalculate', protect, authorize('authority'), habitationController.recalculateRisk);
router.put('/:id/inputs', protect, authorize('authority'), habitationController.updateInputs);

module.exports = router;