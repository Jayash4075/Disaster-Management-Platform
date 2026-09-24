require("dotenv").config();

const connectDB = require("../config/db.js");
const Habitation = require("../models/Habitation.js");
const { syncRelocationSiteForHabitation } = require("../services/relocationSiteSync.js");

async function run() {

    await connectDB();
    console.log("Connected to MongoDB");

    const habitations = await Habitation.find({
        assessmentStatus: "ASSESSED"
    });

    console.log(`Re-checking ${habitations.length} assessed habitations for relocation-site eligibility...`);

    let created = 0;
    let removed = 0;

    for (const habitation of habitations) {

        const before = habitation.riskLevel;
        const site = await syncRelocationSiteForHabitation(habitation);

        if (site) {
            created++;
        }
    }

    console.log(`Done. Eligible relocation sites now present: ${created}`);

    process.exit(0);
}

run().catch((err) => {
    console.error("Rebuild script crashed:", err);
    process.exit(1);
});