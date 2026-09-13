const Habitation = require("../models/Habitation");
const RelocationSite = require("../models/RelocationSite");

module.exports.getRecommendedSite = async(req, res) => {
    try{
        const habitation = await Habitation.findOne({ habitationId: req.params.id});
        if (!habitation){
            return res.status(404).json({success: false, message: "habitation not found"});

        }
        const sites = await RelocationSite.find({
            "capacity.available": { $gte: habitation.population}
        });

        if (sites.length === 0){
            return res.status(200).json({
                success: true,
                recommendations: null, 
                message: "No sites with sufficent capacity found"
            });
        }

        const ranked = sites.sort((a, b) => b.suitabilityScore - a.suitabilityScore);
        const best = ranked[0];

        const reasons = [];
        if (best.capacity.available >= habitation.population){
            reasons.push("Adequate capacity");
        }
        if (best.hazardRisk < 20){
            reasons.push("Low hazard risk");
        }
        if (best.accessibilityScore > 80){
            reasons.push("Good Road Accessibility");
        }
        if (best.infrastructure?.healthcare){
            reasons.push("Healthcare available");
        }

        res.status(200).json({
            success: true,
            habitationId: habitation.habitationId,
            recommendedSite: best.name,
            suitabilityScore: best.suitabilityScore,
            availableCapacity: best.capacity.available,
            reasons
        });
    }
    catch(err){
        console.error("Recommende site error:", err);
        res.status(500).json({success: false, message: "Failed to recommend site"});

    }
};