const SOSReport = require('../models/report.js');
const uploadBufferToCloudinary = require('../utils/cloudinaryUpload.js');
const calculateSeverity = require('../utils/severity.js');
const predictSOSSeverity = require('../utils/mlService.js');

//createSOS, 

module.exports.createSOS = async (req, res) => {
    try {
        const {
            description,
            peopleCount,
            injured_people,
            critical_injuries,
            children_elderly,
            water_level,
            building_damage,
            hours_trapped,
            communication_available,
            longitude,
            latitude
        } = req.body;

        if (
            !description ||
            latitude === undefined ||
            latitude === null ||
            longitude === undefined ||
            longitude === null
        ) {
            return res.status(400).json({
                message: 'description, longitude and latitude are required'
            });
        }

        const peopleTrapped = Number(peopleCount) || 1;
        const injuredPeople = Number(injured_people) || 0;
        const criticalInjuries = Number(critical_injuries) || 0;
        const childrenElderly = Number(children_elderly) || 0;
        const waterLevel = Number(water_level) || 0;
        const buildingDamage = Number(building_damage) || 0;
        const hoursTrapped = Number(hours_trapped) || 0;

        const communicationAvailable =
            communication_available === undefined ||
            communication_available === null
                ? 1
                : Number(communication_available);

        let photoUrl = null;

        if (req.file) {
            const result = await uploadBufferToCloudinary(
                req.file.buffer
            );
            photoUrl = result.secure_url;
        }

        const { category } = calculateSeverity({
            description,
            peopleCount: peopleTrapped,
            hasPhoto: !!photoUrl
        });

        const mlResult = await predictSOSSeverity({
            peopleCount: peopleTrapped,
            injured_people: injuredPeople,
            critical_injuries: criticalInjuries,
            children_elderly: childrenElderly,
            water_level: waterLevel,
            building_damage: buildingDamage,
            hours_trapped: hoursTrapped,
            communication_available: communicationAvailable
        });

        const sosReport = await SOSReport.create({
            reporterId: req.user.id,
            description,
            peopleCount: peopleTrapped,
            photoUrl,
            severityScore: mlResult.severityScore,
            severityLabel: mlResult.severityLabel,
            mlProbability: mlResult.mlProbability,
            isMlPredicted: mlResult.isMlPredicted,

            category,
            location: {
                type: 'Point',
                coordinates: [
                    Number(longitude),
                    Number(latitude)
                ]
            }
        });

        const io = req.app.get('io');
        if (io) {
            io.emit('new-sos', sosReport);
        }

        return res.status(201).json({
            success: true,
            message: 'SOS submitted successfully',
            sosReport,
            mlPrediction: {
                severity: mlResult.severityLabel,
                severityScore: mlResult.severityScore,
                probability: mlResult.mlProbability,
                status: mlResult.mlStatus,
                isMlPredicted: mlResult.isMlPredicted
            }
        });
    }
    catch (err) {
        return res.status(500).json({success: false,message: 'Submission failed',error: err.message});
    }
};

module.exports.getAllSOS = async (req, res) => {
    try {
        const reports = await SOSReport.find()
        .populate(
                'reporterId',
                'name phone email'
            )
            .sort({
                createdAt: -1
            });
        return res.status(200).json({
            success: true,
            count: reports.length,
            reports
        });
    }
    catch (err) {
        return res.status(500).json({success: false,message: 'Failed to fetch reports',error: err.message});
    }
};

module.exports.getSOSById = async (req, res) => {
    try {
        const report = await SOSReport.findById(
            req.params.id
        ).populate(
            'reporterId',
            'name phone email'
        );
        if (!report) {

            return res.status(404).json({
                success: false,
                message: 'SOS report not found'
            });
        }
        return res.status(200).json({success: true,report});
    }
    catch (err) {
        return res.status(500).json({success: false,message: 'Failed to fetch report',error: err.message});
    }
};

module.exports.getMySOS = async (req, res) => {
    try {
        const reports = await SOSReport.find({reporterId: req.user.id}).sort({createdAt: -1});
        return res.status(200).json({
            success: true,
            count: reports.length,
            reports
        });
    }
    catch (err) {
        return res.status(500).json({success: false,message: 'Failed to fetch SOS reports',error: err.message});
    }
};

module.exports.updateSOSStatus = async (req, res) => {
    try {
        const { status } = req.body;
        const validStatuses = ['pending','assigned','in-progress','resolved'];
        if (!status ||!validStatuses.includes(status)) {
            return res.status(400).json({success: false,message: `status must be one of: ${validStatuses.join(', ')}`});
        }
        const report = await SOSReport.findById(
            req.params.id
        );
        if (!report) {
            return res.status(404).json({success: false,message: 'SOS report not found'});
        }
        
        report.status = status;
        await report.save();

        if (status === 'resolved' && report.assignedTeamId) {
            const RescueTeam = require('../models/RescueTeam');
            const team = await RescueTeam.findById(report.assignedTeamId);
            if (team) {
                team.currentStatus = 'AVAILABLE';
                team.currentSOS = null;
                await team.save();
            }
        }

        const io = req.app.get('io');
        if (io) {
            io.emit('status-update', { sosId: report._id, status: report.status });
        }
        
        return res.status(200).json({success: true, message: 'Status updated successfully', sosReport: report});
    }
    catch (err) {
        return res.status(500).json({success: false, message: 'Failed to update status', error: err.message});
    }
};

module.exports.cancelSOS = async (req, res) => {
    try {
        const report = await SOSReport.findById(req.params.id);
        if (!report) {
            return res.status(404).json({
                success: false,
                message: 'SOS report not found'
            });
        }
        const isOwner = report.reporterId.toString() === req.user.id.toString();
        const isAuthority = req.user.role === 'authority';
        if (!isOwner && !isAuthority) {
            return res.status(403).json({
                success: false,
                message: 'Not authorized to cancel this SOS report'
            });
        }
        report.status = 'resolved';
        report.cancelledAt = new Date();
        await report.save();

        if (report.assignedTeamId) {
            const RescueTeam = require('../models/RescueTeam');
            const team = await RescueTeam.findById(report.assignedTeamId);
            if (team) {
                team.currentStatus = 'AVAILABLE';
                team.currentSOS = null;
                await team.save();
            }
        }

        const io = req.app.get('io');
        if (io) {
            io.emit('status-update', { sosId: report._id, status: report.status });
        }

        return res.status(200).json({success: true,message: 'SOS report cancelled',sosReport: report});
    }
    catch (err) {
        return res.status(500).json({success: false, message: 'Failed to cancel SOS report', error: err.message});
    }
};

module.exports.assignRescueTeam = async (req, res) => {
    try {
        console.log("ASSIGN USER:", req.user);
        console.log("ASSIGN ROLE:", req.user?.role);
        console.log("ASSIGN BODY:", req.body);

        const { teamId } = req.body;
        if (!teamId) {
            return res.status(400).json({ message: 'teamId is required' });
        }

        const report = await SOSReport.findById(req.params.id);
        if (!report) {
            return res.status(404).json({ message: 'SOS report not found' });
        }

        const RescueTeam = require('../models/RescueTeam');
        const team = await RescueTeam.findById(teamId);
        if (!team) {
            return res.status(404).json({ message: 'Rescue team not found' });
        }

        if (team.currentStatus !== 'AVAILABLE') {
            return res.status(400).json({ message: 'This team is not currently available' });
        }

        report.assignedTeamId = team._id;
        report.status = 'assigned';
        await report.save();

        team.currentStatus = 'BUSY';
        team.currentSOS = report._id;
        await team.save();

        const io = req.app.get('io');
        io.emit('status-update', { sosId: report._id, status: 'assigned' });
        io.emit('team-assigned', { sosId: report._id, teamId: team._id });

        res.status(200).json({ message: 'Rescue team assigned', sosReport: report, rescueTeam: team });
    } catch (err) {
        res.status(500).json({ message: 'Failed to assign rescue team', error: err.message });
    }
};