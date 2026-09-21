const Shelter = require("../models/shelter.js");
const getShelterStatus = require("../utils/shelterStatus.js");

module.exports.createShelter = async (req, res) => {
	try {
    	const { name, type, longitude, latitude, address, contact, capacity, facilities} = req.body;
		if (!name || !type || longitude === undefined || latitude === undefined || !contact) {
      		return res.status(400).json({message: 'name, type, longitude, latitude and contact are required'});
    	}
		const shelter = await Shelter.create({
      		name,
      		type,
      		address,
      		contact,
      		capacity,
			facilities: facilities || [],
      		location: {
        		type: 'Point',
        		coordinates: [Number(longitude), Number(latitude)],
      		},
    	});
		res.status(201).json({ shelter });
  	} 
	catch (err) {
    	res.status(500).json({ message: 'Failed to create shelter', error: err.message });
  	}
};

module.exports.getAllShelters = async (req, res) => {
	try {
    	const shelters = await Shelter.find().sort({ createdAt: -1 });
    	res.status(200).json({ count: shelters.length, shelters });
  	} 
	catch (err) {
    	res.status(500).json({ message: 'Failed to fetch shelters', error: err.message });
  	}
};

module.exports.getNearbyShelters = async (req, res) => {
	try {
    	const { longitude, latitude, maxDistance } = req.query;
		if (!longitude || !latitude) {
      		return res.status(400).json({ message: 'longitude and latitude query params are required' });
    	}
		const shelters = await Shelter.find({
      		location: {
        		$near: {
          			$geometry: {
            			type: 'Point',
            			coordinates: [Number(longitude), Number(latitude)],
          			},
          			$maxDistance: Number(maxDistance) || 10000, 
        		},
      		},
    	});
		res.status(200).json({ count: shelters.length, shelters });
  	} 
	catch (err) {
    	res.status(500).json({ message: 'Failed to fetch nearby shelters', error: err.message });
  	}
};

module.exports.getShelterById = async (req, res) => {
    try {
        const shelter = await Shelter.findById(req.params.id);
        if (!shelter) {
            return res.status(404).json({ message: 'Shelter not found' });
        }

        const availableCapacity = shelter.capacity !== null ? shelter.capacity - shelter.currentOccupancy : null;
        const status = getShelterStatus(shelter.capacity, shelter.currentOccupancy);

        res.status(200).json({ shelter: { ...shelter.toObject(), availableCapacity, status } });
    } catch (err) {
        res.status(500).json({ message: 'Failed to fetch shelter', error: err.message });
    }
};

module.exports.updateShelter = async (req, res) => {
    try {
        const { currentOccupancy, capacity, facilities, contact, address } = req.body;

        const shelter = await Shelter.findById(req.params.id);
        if (!shelter) {
            return res.status(404).json({ message: 'Shelter not found' });
        }

        if (currentOccupancy !== undefined) shelter.currentOccupancy = currentOccupancy;
        if (capacity !== undefined) shelter.capacity = capacity;
        if (facilities !== undefined) shelter.facilities = facilities;
        if (contact !== undefined) shelter.contact = contact;
        if (address !== undefined) shelter.address = address;

        await shelter.save();

        const io = req.app.get('io');
        io.emit('shelter-updated', {
            shelterId: shelter._id,
            currentOccupancy: shelter.currentOccupancy,
            status: getShelterStatus(shelter.capacity, shelter.currentOccupancy),
        });

        const availableCapacity = shelter.capacity !== null ? shelter.capacity - shelter.currentOccupancy : null;
        res.status(200).json({
            message: 'Shelter updated',
            shelter: { ...shelter.toObject(), availableCapacity, status: getShelterStatus(shelter.capacity, shelter.currentOccupancy) },
        });
    } catch (err) {
        res.status(500).json({ message: 'Failed to update shelter', error: err.message });
    }
};
