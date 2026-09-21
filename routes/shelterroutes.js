const express = require("express");
const router = express.Router();

const {createShelter, getAllShelters, getNearbyShelters, getShelterById, updateShelter} = require('../controllers/shelterController');
const { protect, authorize } = require('../middleware/authmiddleware');

router.post('/', protect, authorize('authority'), createShelter);
router.get('/nearby', protect, getNearbyShelters);
router.get('/', protect, getAllShelters);
router.get('/:id', protect, getShelterById);
router.patch('/:id', protect, authorize('authority'), updateShelter);

module.exports = router;