require("dotenv").config();

const mongoose = require("mongoose");
const connectDB = require("../config/db.js");
const Habitation = require("../models/Habitation");
const { getVillages } = require("../utils/mlService");
const { assessHabitation } = require("../services/habitationAssessmentService");

// ============================================================
// REGIONAL WEATHER SNAPSHOT
// No village-level weather/flood data exists in the dataset,
// so this is applied uniformly. Edit these before each run to
// reflect current conditions for the demo, or override via
// environment variables.
// ============================================================

const RAINFALL = Number(process.env.BULK_RAINFALL) || 40;
const RIVER_LEVEL = Number(process.env.BULK_RIVER_LEVEL) || 2;
const WATER_LEVEL = Number(process.env.BULK_WATER_LEVEL) || 1;

// ============================================================
// PER-VILLAGE DERIVATION FROM REAL DATASET COLUMNS
// ============================================================

function deriveHabitationInputs(v) {

    const population = Number(v.population) || 0;

    const vulnerablePopulation = Math.min(
        population,
        Math.round(
            (Number(v.sc_population) || 0) +
            (Number(v.st_population) || 0) +
            (Number(v.children_0_6) || 0)
        )
    );

    const roadAccess = Math.min(10,
        (Number(v.national_highway) > 0 ? 3 : 0) +
        (Number(v.state_highway) > 0 ? 2.5 : 0) +
        (Number(v.major_district_road) > 0 ? 2 : 0) +
        (Number(v.black_topped_road) > 0 ? 1.5 : 0) +
        (Number(v.all_weather_road) > 0 ? 1 : 0)
    );

    const hasLocalMedical = [
        v.chc, v.phc, v.sub_health_centre, v.allopathic_hospital, v.dispensary
    ].some((x) => Number(x) > 0);

    const hospitalDistance = hasLocalMedical
        ? 1
        : (Number(v.nearest_town_distance_km) ||
           Number(v.subdistrict_hq_distance_km) ||
           Number(v.district_hq_distance_km) ||
           20);

    const medicalCapacity =
        (Number(v.chc) || 0) +
        (Number(v.phc) || 0) +
        (Number(v.sub_health_centre) || 0) +
        (Number(v.allopathic_hospital) || 0) +
        (Number(v.dispensary) || 0);

    const shelterCapacity = Math.max(
        20,
        ((Number(v.pds_shop) || 0) + (Number(v.anganwadi) || 0)) * 50
    );

    const availableWater =
        ((Number(v.treated_tap_water) || 0) +
         (Number(v.hand_pump) || 0) +
         (Number(v.tube_well) || 0)) * 1000;

    const foodStock = (Number(v.pds_shop) || 0) * 500;

    // Conservative flood-history proxy — proximity to a river/
    // canal/pond, not a confirmed historical event.
    const floodHistory =
        (Number(v.river_canal) > 0 || Number(v.pond_lake) > 0) ? 1 : 0;

    const buildingDamage = 0; // no historical damage data exists

    return {
        population,
        vulnerablePopulation,
        roadAccess,
        hospitalDistance,
        medicalCapacity,
        shelterCapacity,
        availableWater,
        foodStock,
        floodHistory,
        buildingDamage
    };
}

// ============================================================
// MAIN
// ============================================================

async function run() {

    await connectDB();
    console.log("Connected to MongoDB");

    console.log("Fetching villages from ML service...");
    const villagesResponse = await getVillages();

    const villages =
        villagesResponse?.villages ||
        villagesResponse?.data?.villages ||
        [];

    if (!villages.length) {
        console.error("No villages returned by ML service — aborting.");
        process.exit(1);
    }

    console.log(`Total villages to process: ${villages.length}`);
    console.log(`Regional snapshot — rainfall: ${RAINFALL}mm, river level: ${RIVER_LEVEL}m, water level: ${WATER_LEVEL}m`);

    let created = 0, updated = 0, assessed = 0, failed = 0;
    const failures = [];

    for (let i = 0; i < villages.length; i++) {

        const v = villages[i];

        try {

            const habitationId = String(v.village_code ?? v.villageCode ?? "");
            const name = String(v.village_name ?? v.villageName ?? "Unknown");

            if (!habitationId) {
                failed++;
                continue;
            }

            const derived = deriveHabitationInputs(v);

            const lat = Number(v.latitude);
            const lng = Number(v.longitude);
            const hasLocation = Number.isFinite(lat) && Number.isFinite(lng);

            let habitation = await Habitation.findOne({ habitationId });
            const isNew = !habitation;

            if (!habitation) {
                habitation = new Habitation({ habitationId, name });
            }

            habitation.name = name;
            habitation.population = derived.population;
            habitation.rainfall = RAINFALL;
            habitation.riverLevel = RIVER_LEVEL;
            habitation.waterLevel = WATER_LEVEL;
            habitation.floodHistory = derived.floodHistory;
            habitation.buildingDamage = derived.buildingDamage;
            habitation.vulnerablePopulation = derived.vulnerablePopulation;
            habitation.roadAccess = derived.roadAccess;
            habitation.hospitalDistance = derived.hospitalDistance;
            habitation.shelterCapacity = derived.shelterCapacity;
            habitation.availableWater = derived.availableWater;
            habitation.foodStock = derived.foodStock;
            habitation.medicalCapacity = derived.medicalCapacity;

            if (hasLocation) {
                habitation.location = { type: "Point", coordinates: [lng, lat] };
            }

            await habitation.save();
            isNew ? created++ : updated++;

            const result = await assessHabitation(habitation);

            if (result.success) {
                assessed++;
            } else {
                failed++;
                failures.push({ habitationId, name, reason: result.error });
            }

        } catch (err) {
            failed++;
            failures.push({ village: v.village_name, error: err.message });
        }

        if ((i + 1) % 100 === 0 || i === villages.length - 1) {
            console.log(`Progress: ${i + 1}/${villages.length} — assessed: ${assessed}, failed: ${failed}`);
        }
    }

    console.log("\n========== DONE ==========");
    console.log({ total: villages.length, created, updated, assessed, failed });

    if (failures.length) {
        console.log("\nFirst 20 failures:");
        console.log(failures.slice(0, 20));
    }

    await mongoose.disconnect();
    process.exit(0);
}

run().catch((err) => {
    console.error("Bulk assessment script crashed:", err);
    process.exit(1);
});