const Resource = require('../models/Resource.js');
const ResourceRequest = require('../models/ResourceRequest.js');
const { scoreResourceMatch, getDistanceKm } = require('../utils/resourceMatching.js');
const predictShortage = require("../utils/shortagePrediction.js");

//createResource, getNearByResources, getAllResources, createResourceRequest, getAllResourceRequests, matchResources, allocateResources
//getShortageAlerts

module.exports.createResource = async (req, res) => {
    try {
        const { type, quantity, longitude, latitude, transportAvailable } = req.body;
		if (!type || quantity === undefined || longitude === undefined || latitude === undefined) {
            return res.status(400).json({
                message: 'type, quantity, longitude and latitude are required',
            });
        }
		const resource = await Resource.create({
            providerId: req.user.id,
            type,
            quantity,
            transportAvailable: !!transportAvailable,
            location: {
                type: 'Point',
                coordinates: [Number(longitude), Number(latitude)],
            },
        });
		res.status(201).json({ resource });
    }
	catch (err) {
        res.status(500).json({ message: 'Failed to create resource', error: err.message });
    }
};

module.exports.getNearByResources = async (req, res) => {
    try {
        const { longitude, latitude, type, maxDistance } = req.query;
	    if (!longitude || !latitude) {
            return res.status(400).json({ message: 'longitude and latitude query params are required' });
        }
	    const query = {
            status: 'available',
            location: {
                $near: {
                    $geometry: { type: 'Point', coordinates: [Number(longitude), Number(latitude)] },
                    $maxDistance: Number(maxDistance) || 20000,
                },
            },
        };
        if (type) query.type = type;
		const resources = await Resource.find(query);
        res.status(200).json({ count: resources.length, resources });
    }
	catch (err) {
        res.status(500).json({ message: 'Failed to fetch nearby resources', error: err.message });
    }
};

module.exports.getAllResources = async (req, res) => {
    try {
        const resources = await Resource.find().sort({ createdAt: -1 });
        res.status(200).json({ count: resources.length, resources });
    } 
	catch (err) {
        res.status(500).json({ message: 'Failed to fetch resources', error: err.message });
    }
};

module.exports.createResourceRequest = async (req, res) => {
    try {
        const {campName, type, quantityNeeded, longitude, latitude, consumptionRatePerHour, population, incomingSupply, peoplePerUnit, currentStock, dailyConsumption, urgency } = req.body;

        if (!campName || !type || quantityNeeded === undefined || longitude === undefined || latitude === undefined || population === undefined || peoplePerUnit === undefined) {
            return res.status(400).json({
                message: 'campName, type, quantityNeeded, longitude, latitude, population and peoplePerUnit are required',
            });
        }
        const shortagePrediction = await predictShortage({
            population: population || 0,
            currentStock: currentStock || 0,
            dailyConsumption: dailyConsumption || 0,
            incomingSupply: incomingSupply || 0,
            peoplePerUnit: peoplePerUnit || 1
        });
        const request = await ResourceRequest.create({
            requesterId: req.user.id,
            campName,
            type,
            quantityNeeded,
            quantityFulfilled: 0,
            population: population || 0,
            incomingSupply: incomingSupply || 0,
            peoplePerUnit: peoplePerUnit || 1,
            currentStock: currentStock || 0,
            dailyConsumption: dailyConsumption || 0,
            consumptionRatePerHour: consumptionRatePerHour || 0,
            shortageHours: shortagePrediction.hoursUntilShortage,
            shortageStatus: shortagePrediction.status,
            isShortageMlPredicted: shortagePrediction.success,
            shortageMlStatus: shortagePrediction.mlStatus,
            urgency: urgency || 'medium',
            location: {
                type: 'Point',
                coordinates: [
                    Number(longitude),
                    Number(latitude)
                ]
            }
        });
        res.status(201).json({
            message: 'Resource request created successfully',
            request,
            shortagePrediction: {
                hoursUntilShortage: shortagePrediction.hoursUntilShortage,
                status: shortagePrediction.status,
                mlStatus: shortagePrediction.mlStatus,
                isMlPredicted: shortagePrediction.success
            }
        });
    } 
	catch (err) {
        console.error(err);
        res.status(500).json({
            message:
                'Failed to create resource request',
            error:
                err.message
        });
    }
};

module.exports.getAllResourceRequests = async (req, res) => {
    try{
        const urgencyRank = { critical: 4, high: 3, medium: 2, low: 1 };
        const requests = await ResourceRequest.find().populate('requesterId', 'name phone email');
        requests.sort((a, b) => urgencyRank[b.urgency] - urgencyRank[a.urgency] || b.createdAt - a.createdAt);
        res.status(200).json({ count: requests.length, requests });
    } 
	catch (err) {
        res.status(500).json({ message: 'Failed to fetch resource requests', error: err.message });
    }
};

module.exports.matchResources = async (req, res) => {
    try {
        const { requestId } = req.body;
        if (!requestId) {
            return res.status(400).json({ message: 'requestId is required' });
        }
		const request = await ResourceRequest.findById(requestId);
        if (!request) {
            return res.status(404).json({ message: 'Resource request not found' });
        }
		const candidates = await Resource.find({ type: request.type, status: 'available' });
		if (candidates.length === 0) {
            return res.status(200).json({ message: 'No available resources of this type', matches: [] });
        }
		const scored = candidates.map((resource) => ({resource,...scoreResourceMatch(resource, request),})).sort((a, b) => b.score - a.score);
		res.status(200).json({
            request,
            matches: scored.map((s) => ({
                resourceId: s.resource._id,
                providerId: s.resource.providerId,
				quantity: s.resource.quantity,
				distanceKm: s.distanceKm,
				transportAvailable: s.resource.transportAvailable,
				score: s.score,
        	})),
    	});
  	} 
	catch (err) {
    	res.status(500).json({ message: 'Failed to match resources', error: err.message });
  	}
};

module.exports.allocateResource = async (req, res) => {
    try {
        const { requestId, resourceId, quantityAllocated } = req.body;
		if (!requestId || !resourceId || !quantityAllocated) {
      		return res.status(400).json({
        		message: 'requestId, resourceId and quantityAllocated are required',
      		});
    	}
		const request = await ResourceRequest.findById(requestId);
    	const resource = await Resource.findById(resourceId);
		if (!request || !resource) {
      		return res.status(404).json({ message: 'Request or resource not found' });
    	}
		if (resource.quantity < quantityAllocated) {
      		return res.status(400).json({ message: 'Resource does not have enough quantity' });
    	}
		resource.quantity -= quantityAllocated;
    	if (resource.quantity === 0) resource.status = 'depleted';
    	await resource.save();
		
		request.quantityFulfilled += Number(quantityAllocated);
    	request.matchedResourceId = resource._id;
    	request.status = request.quantityFulfilled >= request.quantityNeeded ? 'fulfilled' : 'partially-fulfilled';
    	await request.save();

    	const io = req.app.get('io');
        if (io) {
            io.emit('resource-allocated', { requestId: request._id, resourceId: resource._id });
        }

    	res.status(200).json({ message: 'Resource allocated', request, resource });
  	} 
	catch (err) {
    	res.status(500).json({ message: 'Failed to allocate resource', error: err.message });
  	}
};

module.exports.getShortageAlerts = async (req, res) => {
	try {
    	const requests = await ResourceRequest.find({
      		status: { $in: ['open', 'partially-fulfilled'] },
      		consumptionRatePerHour: { $gt: 0 },
    	});
		const alerts = [];
        for (const r of requests) {
            const currentStock =
                Number(r.quantityFulfilled) || 0;
                const prediction = await predictShortage({
                    population: Number(r.population) || 0,
                    currentStock: currentStock,
                    dailyConsumption: Number(r.consumptionRatePerHour) * 24,
                    incomingSupply: Number(r.incomingSupply) || 0,
                    peoplePerUnit: Number(r.peoplePerUnit) || 1
                });
                if (!prediction.success) {
                    console.warn(`Shortage ML failed for request ${r._id}`);
                }
                const hoursUntilShortage = Number(prediction.hoursUntilShortage);
                let status = 'SAFE';
                if (hoursUntilShortage <= 2) {
                    status = 'CRITICAL';
                }
                else if (hoursUntilShortage <= 6) {
                    status = 'WARNING';
                }
                else if (hoursUntilShortage <= 24) {
                    status = 'MONITOR';
                }
                if (hoursUntilShortage < 24) {
                    alerts.push({
                        requestId: r._id,
                        campName: r.campName,
                        type: r.type,
                        population: r.population,
                        currentStock: currentStock,
                        incomingSupply: r.incomingSupply,
                        consumptionRatePerHour: r.consumptionRatePerHour,
                        peoplePerUnit: r.peoplePerUnit,
                        hoursUntilShortage: Math.round( hoursUntilShortage * 10 ) / 10,
                        status,
                        mlPredicted: prediction.isMlPredicted,
                        mlStatus: prediction.mlStatus
                    });
                }
        }
        alerts.sort((a, b) => a.hoursUntilShortage - b.hoursUntilShortage);
        res.status(200).json({count: alerts.length,alerts});
  	} 
	catch (err) {
    	res.status(500).json({ message: 'Failed to compute shortage alerts', error: err.message });
  	}
};