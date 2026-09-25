const RelocationSite = require("../models/RelocationSite");

const MIN_AVAILABLE_CAPACITY = 1;

async function syncRelocationSiteForHabitation(habitation) {

    const siteId = `HAB-${habitation.habitationId}`;

    const isEligible =
        habitation.assessmentStatus === "ASSESSED" &&
        (habitation.riskLevel === "GREEN" || habitation.riskLevel === "YELLOW") &&
        habitation.location?.coordinates?.length === 2 &&
        Number(habitation.shelterCapacity) > 0;

    if (!isEligible) {
        await RelocationSite.deleteOne({ siteId });
        return null;
    }

    const availableCapacity = Math.max(
        0,
        Number(habitation.shelterCapacity) -
            (Number(habitation.vulnerablePopulation) || 0)
    );

    if (availableCapacity < MIN_AVAILABLE_CAPACITY) {
        await RelocationSite.deleteOne({ siteId });
        return null;
    }

    const suitabilityScore =
        (100 - (Number(habitation.riskScore) || 0)) * 0.4 +
        (Number(habitation.roadAccess) || 0) * 5 +
        (Number(habitation.availableWater) > 0 ? 10 : 0) +
        (Number(habitation.medicalCapacity) > 0 ? 10 : 0) +
        (Number(habitation.foodStock) > 0 ? 10 : 0);

    const update = {
        siteId,
        name: `${habitation.name} (Safe Zone)`,
        location: habitation.location,
        capacity: {
            total: Number(habitation.shelterCapacity),
            occupied: Number(habitation.vulnerablePopulation) || 0,
            available: availableCapacity
        },
        suitabilityScore: Math.round(suitabilityScore)
    };

    const site = await RelocationSite.findOneAndUpdate(
        { siteId },
        update,
        { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    return site;
}

module.exports = { syncRelocationSiteForHabitation };