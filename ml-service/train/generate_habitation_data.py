import pandas as pd
import numpy as np
import os

# Make results reproducible
np.random.seed(42)

# Number of habitation records
N = 10000


# ============================================================
# 1. GENERATE BASIC HABITATION FEATURES
# ============================================================

population = np.random.randint(500, 20001, N)

rainfall = np.random.uniform(0, 400, N)

river_level = np.random.uniform(1, 10, N)

flood_history = np.random.randint(0, 6, N)

building_damage = np.random.randint(0, 6, N)

# Percentage of vulnerable population
vulnerable_ratio = np.random.uniform(0.05, 0.30, N)

vulnerable_population = (
    population * vulnerable_ratio
).astype(int)

water_level = np.random.uniform(0, 10, N)

# 0 = Poor
# 1 = Moderate
# 2 = Good
road_access = np.random.randint(0, 3, N)

hospital_distance = np.random.uniform(1, 50, N)

shelter_capacity = np.random.randint(
    500,
    15001,
    N
)

available_water = np.random.uniform(
    5000,
    50000,
    N
)

food_stock = np.random.uniform(
    2000,
    50000,
    N
)

medical_capacity = np.random.randint(
    50,
    1001,
    N
)


# ============================================================
# 2. CALCULATE HAZARD SCORE
# ============================================================

# Normalize rainfall
rainfall_factor = rainfall / 400 * 30

# Normalize river level
river_factor = river_level / 10 * 20

# Previous disaster contribution
history_factor = flood_history * 4

# Building damage contribution
damage_factor = building_damage * 5

# Water level contribution
water_factor = water_level / 10 * 10

# Vulnerable population contribution
vulnerable_factor = vulnerable_ratio * 20

# Poor road access increases risk
road_factor = (2 - road_access) * 3

# Greater hospital distance increases risk
hospital_factor = hospital_distance / 50 * 5


hazard_score = (
    rainfall_factor
    + river_factor
    + history_factor
    + damage_factor
    + water_factor
    + vulnerable_factor
    + road_factor
    + hospital_factor
    + np.random.normal(0, 4, N)
)


# Keep between 0 and 100
hazard_score = np.clip(
    hazard_score,
    0,
    100
)


# ============================================================
# 3. CREATE BALANCED RISK CLASSES
# ============================================================

# Instead of using fixed thresholds that may create
# extremely unbalanced classes, use percentiles.

low_threshold = np.percentile(
    hazard_score,
    25
)

medium_threshold = np.percentile(
    hazard_score,
    50
)

high_threshold = np.percentile(
    hazard_score,
    75
)


risk_level = np.where(
    hazard_score <= low_threshold,
    "LOW",
    np.where(
        hazard_score <= medium_threshold,
        "MEDIUM",
        np.where(
            hazard_score <= high_threshold,
            "HIGH",
            "CRITICAL"
        )
    )
)


# ============================================================
# 4. CARRYING CAPACITY
# ============================================================

water_capacity = available_water / 5

food_capacity = food_stock / 2

medical_population_capacity = medical_capacity * 10


safe_capacity = (
    0.40 * shelter_capacity
    + 0.25 * water_capacity
    + 0.20 * food_capacity
    + 0.15 * medical_population_capacity
)

safe_capacity = np.maximum(
    safe_capacity,
    100
)


# Population / capacity
capacity_ratio = (
    population / safe_capacity
)


# ============================================================
# 5. CAPACITY STATUS
# ============================================================

capacity_status = np.where(
    capacity_ratio <= 0.8,
    "SAFE",
    np.where(
        capacity_ratio <= 1.0,
        "STRESSED",
        "OVER_CAPACITY"
    )
)


# ============================================================
# 6. RELOCATION SCORE
# ============================================================

relocation_score = (
    hazard_score * 0.40
    + vulnerable_ratio * 100 * 0.15
    + np.minimum(
        capacity_ratio * 50,
        100
    ) * 0.20
    + building_damage * 10 * 0.10
    + water_level * 5 * 0.05
    + (2 - road_access) * 10 * 0.05
    + np.minimum(
        hospital_distance * 2,
        100
    ) * 0.05
    + np.random.normal(0, 3, N)
)

relocation_score = np.clip(
    relocation_score,
    0,
    100
)


# ============================================================
# 7. RELOCATION PRIORITY
# ============================================================

relocation_priority = np.where(
    relocation_score < 30,
    "LOW",
    np.where(
        relocation_score < 60,
        "MEDIUM",
        np.where(
            relocation_score < 80,
            "HIGH",
            "IMMEDIATE"
        )
    )
)


# ============================================================
# 8. CREATE DATAFRAME
# ============================================================

df = pd.DataFrame({

    "population": population,

    "rainfall": rainfall,

    "river_level": river_level,

    "flood_history": flood_history,

    "building_damage": building_damage,

    "vulnerable_population":
        vulnerable_population,

    "water_level": water_level,

    "road_access": road_access,

    "hospital_distance":
        hospital_distance,

    "shelter_capacity":
        shelter_capacity,

    "available_water":
        available_water,

    "food_stock":
        food_stock,

    "medical_capacity":
        medical_capacity,

    "hazard_score":
        hazard_score,

    "risk_level":
        risk_level,

    "safe_capacity":
        safe_capacity,

    "capacity_ratio":
        capacity_ratio,

    "capacity_status":
        capacity_status,

    "relocation_score":
        relocation_score,

    "relocation_priority":
        relocation_priority
})


# ============================================================
# 9. SAVE DATASET
# ============================================================

output_path = os.path.join(
    os.path.dirname(__file__),
    "..",
    "data",
    "habitation_data.csv"
)

output_path = os.path.abspath(
    output_path
)

df.to_csv(
    output_path,
    index=False
)


# ============================================================
# 10. DISPLAY RESULTS
# ============================================================

print("\n========================================")
print("HABITATION DATASET GENERATED")
print("========================================")

print("\nDataset shape:")
print(df.shape)


print("\nRisk distribution:")
print(
    df["risk_level"].value_counts()
)


print("\nCapacity distribution:")
print(
    df["capacity_status"].value_counts()
)


print("\nRelocation distribution:")
print(
    df["relocation_priority"].value_counts()
)


print("\nHazard score statistics:")
print(
    df["hazard_score"].describe()
)


print("\nSaved to:")
print(output_path)