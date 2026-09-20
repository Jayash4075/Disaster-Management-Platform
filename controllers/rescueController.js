const RescueTeam = require("../models/RescueTeam.js");

//createRescueTeam, getAllRescueTeams, getRescueTeamById, updateRescueTeam, deleteRescueTeam, updateTeamLocation, getNearbyTeams,
//getMyAssignments, linkUserToTeam

module.exports.createRescueTeam = async (req, res) => {
	try {
		const {name, organization, teamType, members, capabilities, equipment, latitude, longitude, availability, currentStatus, maxCapacity, responseRadius, rating} = req.body;
		const team = await RescueTeam.create({
      		name,
      		organization,
      		teamType,
      		members,
      		capabilities,
      		equipment,
      		latitude,
      		longitude,
			currentLocation: {
        		type: "Point",
        		coordinates: [longitude, latitude],
      		},
			availability,
      		currentStatus,
      		maxCapacity,
      		responseRadius,
      		rating,
      		lastLocationUpdate: new Date(),
    	});
		res.status(201).json({ success: true,message: "Rescue team created successfully",team });
	} 
	catch (error) {
		res.status(500).json({success: false,message: error.message});
    }
};

module.exports.getAllRescueTeams = async (req, res) => {
	try {
    	const teams = await RescueTeam.find();
		res.status(200).json({ success: true,count: teams.length,teams });
  	} 
	catch (error) {
    	res.status(500).json({ success: false,message: error.message });
  	}
};

module.exports.getRescueTeamById = async (req, res) => {
	try {
    	const team = await RescueTeam.findById(req.params.id);
		if (!team) {
      		return res.status(404).json({success: false,message: "Rescue team not found"});
        }
		res.status(200).json({success: true,team});
  	} 
	catch (error) {
    	res.status(500).json({success: false,message: error.message,});
  	}
};

module.exports.updateRescueTeam = async (req, res) => {
	try {
    	const team = await RescueTeam.findById(req.params.id);
		if (!team) {
      		return res.status(404).json({success: false,message: "Rescue team not found"});
        }
		Object.assign(team, req.body);
		if (req.body.latitude !== undefined || req.body.longitude !== undefined) {
			const latitude = req.body.latitude !== undefined ? req.body.latitude: team.latitude;
			const longitude = req.body.longitude !== undefined? req.body.longitude: team.longitude;

			team.latitude = latitude;
			team.longitude = longitude;

			team.currentLocation = {
				type: "Point",
				coordinates: [longitude, latitude],
			};
		    team.lastLocationUpdate = new Date();
        }
	    await team.save();

    	res.status(200).json({success: true,message: "Rescue team updated successfully",team});
  	} 
	catch (error) {
    	res.status(500).json({success: false,message: error.message});
  	}
};

module.exports.deleteRescueTeam = async (req, res) => {
	try {
    	const team = await RescueTeam.findByIdAndDelete(req.params.id);
		if (!team) {
      		return res.status(404).json({success: false,message: "Rescue team not found"});
    	}
		res.status(200).json({success: true,message: "Rescue team deleted successfully"});
  	} 
	catch (error) {
    	res.status(500).json({success: false,message: error.message});
  	}
};

module.exports.updateTeamLocation = async (req, res) => {
	try {
		const { latitude, longitude } = req.body;
		if (latitude === undefined || longitude === undefined) {
      		return res.status(400).json({success: false,message: "Latitude and longitude are required"});
    	}
		const team = await RescueTeam.findById(req.params.id);
		if (!team) {
      		return res.status(404).json({success: false,message: "Rescue team not found"});
    	}
		team.latitude = latitude;
		team.longitude = longitude;
		team.currentLocation = {
      		type: "Point",
      		coordinates: [longitude, latitude],
    	};

    	team.lastLocationUpdate = new Date();
		await team.save();
		res.status(200).json({success: true,message: "Team location updated successfully",team});
    } 
	catch (error) {
    	res.status(500).json({success: false,message: error.message});
  	}
};

module.exports.getNearbyTeams = async (req, res) => {
	try {
    	const { latitude, longitude, radius = 20 } = req.query;
		if (latitude === undefined || longitude === undefined) {
      		return res.status(400).json({success: false,message: "Latitude and longitude are required"});
    	}
		const teams = await RescueTeam.find({
      		availability: true,
      		currentStatus: "AVAILABLE",
			currentLocation: {
        		$near: {
          			$geometry: {
            			type: "Point",
            			coordinates: [
              				Number(longitude),
              				Number(latitude),
            			],
          			},
					$maxDistance: Number(radius) * 1000,
        		},
      		},
    	});
		res.status(200).json({success: true,count: teams.length,teams});
  	} 
	catch (error) {
    	res.status(500).json({success: false,message: error.message});
  	}
};

module.exports.getMyAssignments = async (req, res) => {
    try {
        const SOSReport = require('../models/report.js');
        const RescueTeam = require('../models/RescueTeam.js');

        const team = await RescueTeam.findOne({ userId: req.user.id });
        if (!team) {
            return res.status(404).json({ message: 'No rescue team profile found for this user' });
        }

        const assignments = await SOSReport.find({ assignedTeamId: team._id })
            .populate('reporterId', 'name phone')
            .sort({ createdAt: -1 });

        res.status(200).json({ count: assignments.length, assignments });
    } catch (err) {
        res.status(500).json({ message: 'Failed to fetch assignments', error: err.message });
    }
};

module.exports.linkUserToTeam = async (req, res) => {
    try {
        const { userId } = req.body;
        if (!userId) {
            return res.status(400).json({ message: 'userId is required' });
        }

        const team = await RescueTeam.findById(req.params.id);
        if (!team) {
            return res.status(404).json({ message: 'Rescue team not found' });
        }

        team.userId = userId;
        await team.save();

        res.status(200).json({ message: 'User linked to rescue team', team });
    } catch (err) {
        res.status(500).json({ message: 'Failed to link user', error: err.message });
    }
};
