const express = require('express');
const router = express.Router();

const {protect, authorize} = require('../middleware/authmiddleware');
const {getRecommendedSite} = require('../controllers/relocationController');

router.get('/:id/site', protect, authorize('authority'), getRecommendedSite);

module.exports = router;