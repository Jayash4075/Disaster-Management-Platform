"""
generate_real_village_training_data.py

Replaces generate_habitation_data.py.

Instead of 10,000 fully synthetic rows, this script builds training data
from the 3,053 real PS-191 villages:

  - Static features  (population, infrastructure, lat/lon)
    → come from real census data in ps191_final_village_dataset.csv
      which must already have latitude + longitude columns
      (run add_village_coordinates.py first)

  - Dynamic features (rainfall, river_level, flood_history,
                      building_damage, water_level)
    → sampled 5 times per village to cover different disaster scenarios
      these are always runtime variables — they can never come from census

  - Target labels    (risk_level, capacity_status, relocation_priority)
    → computed using the same formula as before

Output: data/habitation_data.csv  (3053 × 5 = 15,265 rows)
"""

import os
import pandas as pd
import numpy as np

np.random.seed(42)

# --------------------------------------------------------
# Paths
# --------------------------------------------------------

BASE_DIR = os.path.join(os.path.dirname(__file__), "..")

VILLAGE_CSV = os.path.join(
    BASE_DIR, "data", "processed", "ps191_final_village_dataset.csv"
)

OUTPUT_PATH = os.path.join(
    BASE_DIR, "data", "habitation_data.csv"
)

# Number of disaster scenarios sampled per village
SCENARIOS_PER_VILLAGE = 5

# --------------------------------------------------------
# 1. Load real village data
# --------------------------------------------------------

print("Loading real village data...")

villages = pd.read_csv(VILLAGE_CSV)

# Confirm lat/lon columns exist
if "latitude" not in villages.columns or "longitude" not in villages.columns:
    raise ValueError(
        "ps191_final_village_dataset.csv is missing latitude/longitude columns.\n"
        "Run train/add_village_coordinates.py first."
    )

print(f"Villages loaded: {len(villages)}")
print(f"Lat/lon available: {villages['latitude'].notna().sum()} villages")

# --------------------------------------------------------
# 2. Derive static features from real census columns
# --------------------------------------------------------

print("\nDeriving static features from census data...")

# -- vulnerable_population --------------------------------
# Children under 6 + SC population + ST population
villages["vulnerable_population"] = (
    villages["children_0_6"].fillna(0)
    + villages["sc_population"].fillna(0)
    + villages["st_population"].fillna(0)
).astype(int)

# -- hospital_distance ------------------------------------
# Use subdistrict HQ distance as best available proxy for hospital distance.
# Fill the 70 nulls with the median (16 km).
median_dist = villages["subdistrict_hq_distance_km"].median()
villages["hospital_distance"] = (
    villages["subdistrict_hq_distance_km"].fillna(median_dist)
)

# -- road_access ------------------------------------------
# 0 = no roads (no road columns are available / all zero)
# 1 = basic only (footpath or minor road)
# 2 = good (blacktopped or all-weather road)

road_cols = [
    "national_highway", "state_highway", "major_district_road",
    "black_topped_road", "all_weather_road", "footpath"
]

for col in road_cols:
    villages[col] = villages[col].fillna(0)

good_road = (
    villages["black_topped_road"]
    + villages["all_weather_road"]
    + villages["national_highway"]
    + villages["state_highway"]
    + villages["major_district_road"]
)

villages["road_access"] = np.where(
    good_road >= 1, 2,
    np.where(villages["footpath"] >= 1, 1, 0)
).astype(int)

# -- shelter_capacity -------------------------------------
# Emergency shelter estimate: each household can shelter ~10 people.
# Minimum of 100 to avoid zero capacity.
villages["shelter_capacity"] = np.maximum(
    villages["households"].fillna(0) * 10,
    100
).astype(int)

# -- available_water --------------------------------------
# Treated tap water → 20,000 L/day equivalent
# Tube well        → 10,000 L/day equivalent
# Hand pump        → 5,000 L/day equivalent
# Baseline         → 5,000 (everyone has some access)
for col in ["treated_tap_water", "tube_well", "hand_pump"]:
    villages[col] = villages[col].fillna(0)

villages["available_water"] = (
    villages["treated_tap_water"] * 20000
    + villages["tube_well"]        * 10000
    + villages["hand_pump"]        *  5000
    + 5000
).astype(int)

# -- food_stock -------------------------------------------
# PDS shop present → 20,000 units; absent → 5,000 units
villages["pds_shop"] = villages["pds_shop"].fillna(0)
villages["food_stock"] = (
    villages["pds_shop"] * 15000 + 5000
).astype(int)

# -- medical_capacity -------------------------------------
# Sum of all healthcare facility counts (nulls → 0)
health_cols = [
    "chc", "phc", "sub_health_centre",
    "allopathic_hospital", "dispensary"
]
for col in health_cols:
    villages[col] = villages[col].fillna(0)

villages["medical_capacity"] = (
    villages[health_cols].sum(axis=1)
).astype(int)

# --------------------------------------------------------
# 3. Keep only villages with valid lat/lon and population
# --------------------------------------------------------

villages = villages.dropna(subset=["latitude", "longitude"])
villages = villages[villages["population"] > 0].reset_index(drop=True)

print(f"Villages after filtering (pop>0, has lat/lon): {len(villages)}")

# --------------------------------------------------------
# 4. Generate training rows
#    Static features → real values (repeated per scenario)
#    Dynamic features → randomly sampled per scenario
# --------------------------------------------------------

print(f"\nGenerating {SCENARIOS_PER_VILLAGE} scenarios per village...")

N = len(villages) * SCENARIOS_PER_VILLAGE

rows = []

for _, village in villages.iterrows():

    for _ in range(SCENARIOS_PER_VILLAGE):

        # -- Dynamic features (sampled, same ranges as before) ----
        rainfall       = np.random.uniform(0, 400)
        river_level    = np.random.uniform(1, 10)
        flood_history  = np.random.randint(0, 6)
        building_damage = np.random.randint(0, 6)
        vulnerable_ratio = (
            village["vulnerable_population"] / village["population"]
            if village["population"] > 0 else 0.15
        )
        water_level    = np.random.uniform(0, 10)

        # -- Hazard score (same formula as generate_habitation_data.py) --
        rainfall_factor  = rainfall / 400 * 30
        river_factor     = river_level / 10 * 20
        history_factor   = flood_history * 4
        damage_factor    = building_damage * 5
        water_factor     = water_level / 10 * 10
        vulnerable_factor = vulnerable_ratio * 20
        road_factor      = (2 - village["road_access"]) * 3
        hospital_factor  = village["hospital_distance"] / 50 * 5

        hazard_score = (
            rainfall_factor
            + river_factor
            + history_factor
            + damage_factor
            + water_factor
            + vulnerable_factor
            + road_factor
            + hospital_factor
            + np.random.normal(0, 4)
        )
        hazard_score = float(np.clip(hazard_score, 0, 100))

        # -- Carrying capacity (same formula) ----------------------
        water_capacity           = village["available_water"] / 5
        food_capacity            = village["food_stock"] / 2
        medical_population_capacity = village["medical_capacity"] * 10

        safe_capacity = (
            0.40 * village["shelter_capacity"]
            + 0.25 * water_capacity
            + 0.20 * food_capacity
            + 0.15 * medical_population_capacity
        )
        safe_capacity = max(float(safe_capacity), 100)

        capacity_ratio = village["population"] / safe_capacity

        # -- Relocation score (same formula) -----------------------
        relocation_score = (
            hazard_score * 0.40
            + vulnerable_ratio * 100 * 0.15
            + min(capacity_ratio * 50, 100) * 0.20
            + building_damage * 10 * 0.10
            + water_level * 5 * 0.05
            + (2 - village["road_access"]) * 10 * 0.05
            + min(village["hospital_distance"] * 2, 100) * 0.05
            + np.random.normal(0, 3)
        )
        relocation_score = float(np.clip(relocation_score, 0, 100))

        rows.append({
            # Identifiers (not used as model features, kept for reference)
            "village_code":          village["village_code"],
            "village_name":          village["village_name"],

            # Real coordinates
            "latitude":              village["latitude"],
            "longitude":             village["longitude"],

            # Static features (real census values)
            "population":            int(village["population"]),
            "vulnerable_population": int(village["vulnerable_population"]),
            "road_access":           int(village["road_access"]),
            "hospital_distance":     float(village["hospital_distance"]),
            "shelter_capacity":      int(village["shelter_capacity"]),
            "available_water":       int(village["available_water"]),
            "food_stock":            int(village["food_stock"]),
            "medical_capacity":      int(village["medical_capacity"]),

            # Dynamic features (sampled per scenario)
            "rainfall":              round(rainfall, 4),
            "river_level":           round(river_level, 4),
            "flood_history":         int(flood_history),
            "building_damage":       int(building_damage),
            "water_level":           round(water_level, 4),

            # Computed intermediates
            "hazard_score":          round(hazard_score, 4),
            "safe_capacity":         round(safe_capacity, 4),
            "capacity_ratio":        round(capacity_ratio, 4),
            "relocation_score":      round(relocation_score, 4),
        })

df = pd.DataFrame(rows)

print(f"Total training rows generated: {len(df)}")

# --------------------------------------------------------
# 5. Compute target labels
# --------------------------------------------------------

print("Computing target labels...")

# -- risk_level -------------------------------------------
# Percentile-based thresholds (same as original) for balanced classes
low_threshold    = np.percentile(df["hazard_score"], 25)
medium_threshold = np.percentile(df["hazard_score"], 50)
high_threshold   = np.percentile(df["hazard_score"], 75)

df["risk_level"] = np.where(
    df["hazard_score"] <= low_threshold, "LOW",
    np.where(
        df["hazard_score"] <= medium_threshold, "MEDIUM",
        np.where(
            df["hazard_score"] <= high_threshold, "HIGH",
            "CRITICAL"
        )
    )
)

# -- capacity_status --------------------------------------
df["capacity_status"] = np.where(
    df["capacity_ratio"] <= 0.8, "SAFE",
    np.where(
        df["capacity_ratio"] <= 1.0, "STRESSED",
        "OVER_CAPACITY"
    )
)

# -- relocation_priority ----------------------------------
df["relocation_priority"] = np.where(
    df["relocation_score"] < 30, "LOW",
    np.where(
        df["relocation_score"] < 60, "MEDIUM",
        np.where(
            df["relocation_score"] < 80, "HIGH",
            "IMMEDIATE"
        )
    )
)

# --------------------------------------------------------
# 6. Save
# --------------------------------------------------------

df.to_csv(OUTPUT_PATH, index=False)

# --------------------------------------------------------
# 7. Summary
# --------------------------------------------------------

print("\n========================================")
print("REAL VILLAGE TRAINING DATA GENERATED")
print("========================================")
print(f"Total rows:    {len(df)}")
print(f"Unique villages: {df['village_code'].nunique()}")
print(f"Scenarios/village: {SCENARIOS_PER_VILLAGE}")
print()
print("Risk level distribution:")
print(df["risk_level"].value_counts())
print()
print("Capacity status distribution:")
print(df["capacity_status"].value_counts())
print()
print("Relocation priority distribution:")
print(df["relocation_priority"].value_counts())
print()
print("Latitude  range:", round(df["latitude"].min(), 4),
      "to", round(df["latitude"].max(), 4))
print("Longitude range:", round(df["longitude"].min(), 4),
      "to", round(df["longitude"].max(), 4))
print()
print("Saved to:", OUTPUT_PATH)
