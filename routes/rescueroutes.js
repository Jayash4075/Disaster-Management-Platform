const express = require("express");
const router = express.Router();

const {createRescueTeam, getAllRescueTeams, getRescueTeamById, updateRescueTeam, deleteRescueTeam, updateTeamLocation, 
getNearbyTeams, getMyAssignments, linkUserToTeam} = require("../controllers/rescueController.js");
const {protect, authorize} = require('../middleware/authmiddleware.js');

router.post("/", protect, authorize('authority'), createRescueTeam);
router.get("/", protect, authorize('authority'), getAllRescueTeams);
router.get('/nearby', protect, authorize('authority'), getNearbyTeams);
router.get('/my-assignments', protect, authorize('rescuer'), getMyAssignments);
router.get("/:id", protect, authorize('authority'), getRescueTeamById);
router.patch("/:id", protect, authorize('authority'), updateRescueTeam);
router.patch("/:id/location", protect, authorize('rescuer'), updateTeamLocation);
router.patch('/:id/link-user', protect, authorize('authority'), linkUserToTeam);
router.delete("/:id", protect, authorize('authority'), deleteRescueTeam);

module.exports = router;
