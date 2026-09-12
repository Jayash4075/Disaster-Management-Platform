const mongoose = require('mongoose');
const Habitation = require('./models/Habitation');
const RelocationSite = require('./models/RelocationSite');
require('dotenv').config();

async function seed() {
  await mongoose.connect(process.env.ATLASDB_URL);
  await Habitation.deleteMany({});
  await RelocationSite.deleteMany({});

  await Habitation.insertMany([
    {
      habitationId: "H001", name: "Rampur Khera",
      location: { coordinates: [80.33, 26.45] },
      population: 2341, households: 412,
      vulnerability: { elderly: 18, children: 22, disabled: 6, density: 74, score: 87 },
      hazardRisk: { flood: 92, landslide: 12, erosion: 30, cloudburst: 66, overall: 91 },
      historicalRisk: 88, riskScore: 91, riskLevel: "RED", relocationPriority: "IMMEDIATE"
    },
    {
      habitationId: "H002", name: "Sultanpur Basti",
      location: { coordinates: [80.28, 26.40] },
      population: 1832, households: 305,
      vulnerability: { elderly: 15, children: 19, disabled: 4, density: 61, score: 79 },
      hazardRisk: { flood: 78, landslide: 8, erosion: 22, cloudburst: 55, overall: 82 },
      historicalRisk: 74, riskScore: 82, riskLevel: "RED", relocationPriority: "IMMEDIATE"
    },
    {
      habitationId: "H003", name: "Chandpur Village",
      location: { coordinates: [80.35, 26.50] },
      population: 921, households: 168,
      vulnerability: { elderly: 12, children: 15, disabled: 3, density: 45, score: 61 },
      hazardRisk: { flood: 55, landslide: 5, erosion: 18, cloudburst: 40, overall: 58 },
      historicalRisk: 50, riskScore: 65, riskLevel: "ORANGE", relocationPriority: "SHORT_TERM"
    },
    {
      habitationId: "H004", name: "Nawabganj",
      location: { coordinates: [80.42, 26.38] },
      population: 3120, households: 540,
      vulnerability: { elderly: 20, children: 25, disabled: 7, density: 80, score: 83 },
      hazardRisk: { flood: 70, landslide: 10, erosion: 25, cloudburst: 48, overall: 74 },
      historicalRisk: 69, riskScore: 76, riskLevel: "ORANGE", relocationPriority: "SHORT_TERM"
    },
    {
      habitationId: "H005", name: "Barethi Village",
      location: { coordinates: [80.20, 26.55] },
      population: 540, households: 95,
      vulnerability: { elderly: 8, children: 10, disabled: 2, density: 30, score: 38 },
      hazardRisk: { flood: 25, landslide: 4, erosion: 10, cloudburst: 18, overall: 28 },
      historicalRisk: 20, riskScore: 30, riskLevel: "GREEN", relocationPriority: "MONITOR"
    },
    {
      habitationId: "H006", name: "Kotwa Purwa",
      location: { coordinates: [80.48, 26.47] },
      population: 1290, households: 210,
      vulnerability: { elderly: 14, children: 16, disabled: 3, density: 52, score: 55 },
      hazardRisk: { flood: 40, landslide: 6, erosion: 15, cloudburst: 32, overall: 42 },
      historicalRisk: 35, riskScore: 45, riskLevel: "YELLOW", relocationPriority: "MEDIUM_TERM"
    },
    {
      habitationId: "H007", name: "Deoria Kalan",
      location: { coordinates: [80.15, 26.42] },
      population: 2010, households: 330,
      vulnerability: { elderly: 16, children: 20, disabled: 5, density: 65, score: 71 },
      hazardRisk: { flood: 60, landslide: 9, erosion: 20, cloudburst: 45, overall: 63 },
      historicalRisk: 58, riskScore: 68, riskLevel: "ORANGE", relocationPriority: "SHORT_TERM"
    },
    {
      habitationId: "H008", name: "Ram Nagar",
      location: { coordinates: [80.38, 26.60] },
      population: 780, households: 140,
      vulnerability: { elderly: 10, children: 12, disabled: 2, density: 35, score: 42 },
      hazardRisk: { flood: 30, landslide: 5, erosion: 12, cloudburst: 22, overall: 33 },
      historicalRisk: 28, riskScore: 35, riskLevel: "GREEN", relocationPriority: "MONITOR"
    },
    {
      habitationId: "H009", name: "Bhagwatpur",
      location: { coordinates: [80.25, 26.35] },
      population: 1560, households: 260,
      vulnerability: { elderly: 17, children: 21, disabled: 5, density: 58, score: 68 },
      hazardRisk: { flood: 68, landslide: 7, erosion: 24, cloudburst: 50, overall: 70 },
      historicalRisk: 62, riskScore: 71, riskLevel: "ORANGE", relocationPriority: "SHORT_TERM"
    },
    {
      habitationId: "H010", name: "Sarai Meer",
      location: { coordinates: [80.45, 26.30] },
      population: 2870, households: 480,
      vulnerability: { elderly: 22, children: 27, disabled: 8, density: 88, score: 90 },
      hazardRisk: { flood: 95, landslide: 15, erosion: 35, cloudburst: 72, overall: 94 },
      historicalRisk: 91, riskScore: 94, riskLevel: "RED", relocationPriority: "IMMEDIATE"
    },
    {
      habitationId: "H011", name: "Purnabas Colony",
      location: { coordinates: [80.30, 26.62] },
      population: 410, households: 78,
      vulnerability: { elderly: 6, children: 8, disabled: 1, density: 25, score: 25 },
      hazardRisk: { flood: 15, landslide: 3, erosion: 8, cloudburst: 12, overall: 18 },
      historicalRisk: 10, riskScore: 20, riskLevel: "GREEN", relocationPriority: "MONITOR"
    },
    {
      habitationId: "H012", name: "Itwa Purwa",
      location: { coordinates: [80.50, 26.52] },
      population: 1105, households: 190,
      vulnerability: { elderly: 13, children: 17, disabled: 4, density: 48, score: 52 },
      hazardRisk: { flood: 38, landslide: 6, erosion: 16, cloudburst: 28, overall: 40 },
      historicalRisk: 32, riskScore: 43, riskLevel: "YELLOW", relocationPriority: "MEDIUM_TERM"
    }
  ]);

  await RelocationSite.insertMany([
    {
      siteId: "S001", name: "Community Ground A",
      location: { coordinates: [80.40, 26.48] },
      capacity: { total: 3000, occupied: 800, available: 2200 },
      infrastructure: { water: true, food: true, sanitation: true, healthcare: true, electricity: true },
      accessibilityScore: 88, hazardRisk: 12, suitabilityScore: 91
    },
    {
      siteId: "S002", name: "Community Ground B",
      location: { coordinates: [80.20, 26.42] },
      capacity: { total: 4000, occupied: 1300, available: 2700 },
      infrastructure: { water: true, food: true, sanitation: true, healthcare: true, electricity: true },
      accessibilityScore: 91, hazardRisk: 8, suitabilityScore: 84
    },
    {
      siteId: "S003", name: "Govt. School Grounds, Karchana",
      location: { coordinates: [80.55, 26.40] },
      capacity: { total: 1800, occupied: 200, available: 1600 },
      infrastructure: { water: true, food: false, sanitation: true, healthcare: false, electricity: true },
      accessibilityScore: 65, hazardRisk: 20, suitabilityScore: 68
    },
    {
      siteId: "S004", name: "District Stadium Relief Camp",
      location: { coordinates: [80.10, 26.50] },
      capacity: { total: 5000, occupied: 500, available: 4500 },
      infrastructure: { water: true, food: true, sanitation: true, healthcare: true, electricity: true },
      accessibilityScore: 95, hazardRisk: 5, suitabilityScore: 95
    }
  ]);

  console.log("Seeded! 12 habitations, 4 relocation sites");
  process.exit();
}
seed();