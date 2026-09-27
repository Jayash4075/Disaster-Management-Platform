const RelocationSite = require("../models/RelocationSite");

/*
    IMPORTANT ARCHITECTURE:

    A habitation being GREEN/YELLOW does NOT automatically mean
    that it is a relocation/relief facility.

    Habitations:
        -> risk assessment
        -> vulnerability
        -> carrying capacity

    Relocation Sites:
        -> actual schools
        -> relief camps
        -> stadiums
        -> community shelters
        -> government buildings
        -> emergency centres

    Therefore this service no longer creates a relocation site
    from every habitation.

    It only removes old automatically-generated HAB-* sites
    that may still exist in the database.
*/

async function syncRelocationSiteForHabitation(habitation) {

    const siteId = `HAB-${habitation.habitationId}`;

    // Remove any old automatically generated Safe Zone
    // associated with this habitation.
    await RelocationSite.deleteOne({ siteId });

    return null;
}

module.exports = {
    syncRelocationSiteForHabitation
};