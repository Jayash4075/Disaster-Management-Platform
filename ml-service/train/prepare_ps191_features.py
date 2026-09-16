import pandas as pd
import numpy as np
import os

# ============================================================
# 1. LOAD REAL VILLAGE DATA
# ============================================================

INPUT_FILE = "data/processed/prayagraj_village_base.csv"

OUTPUT_FILE = "data/processed/ps191_village_features.csv"

df = pd.read_csv(INPUT_FILE, low_memory=False)

print("Original rows:", len(df))


# ============================================================
# 2. HELPER FUNCTION
# ============================================================

def status_to_binary(series):
    """
    Convert availability status into a simple indicator.

    Census status convention:
        1 = Available
        2 = Not Available

    0 is kept as missing/unknown rather than assuming
    its meaning.
    """

    result = series.copy()

    result = result.replace({
        1: 1,
        2: 0,
        0: np.nan
    })

    return result


# ============================================================
# 3. CREATE CLEAN DATAFRAME
# ============================================================

features = pd.DataFrame()

# ------------------------------------------------------------
# IDENTIFICATION
# ------------------------------------------------------------

features["village_code"] = df["Village_Code"]

features["village_name"] = df["Village Name"]


# ============================================================
# 4. POPULATION / VULNERABILITY
# ============================================================

features["population"] = df["TOT_P"]

features["households"] = df["No_HH"]

features["children_0_6"] = df["P_06"]

features["sc_population"] = df["P_SC"]

features["st_population"] = df["P_ST"]

features["area_hectares"] = df[
    "Total Geographical Area (in Hectares)"
]


# ============================================================
# 5. DERIVED VULNERABILITY FEATURES
# ============================================================

# Population density
features["population_density"] = (
    features["population"]
    /
    features["area_hectares"].replace(0, np.nan)
)

# Percentage of children
features["children_ratio"] = (
    features["children_0_6"]
    /
    features["population"].replace(0, np.nan)
)

# SC population ratio
features["sc_ratio"] = (
    features["sc_population"]
    /
    features["population"].replace(0, np.nan)
)

# ST population ratio
features["st_ratio"] = (
    features["st_population"]
    /
    features["population"].replace(0, np.nan)
)


# ============================================================
# 6. HEALTHCARE
# ============================================================

features["chc"] = df[
    "Community Health Centre (Numbers)"
]

features["phc"] = df[
    "Primary Health Centre (Numbers)"
]

features["sub_health_centre"] = df[
    "Primary Health Sub Centre (Numbers)"
]

features["allopathic_hospital"] = df[
    "Hospital Allopathic (Numbers)"
]

features["dispensary"] = df[
    "Dispensary (Numbers)"
]


# ============================================================
# 7. WATER
# ============================================================

features["treated_tap_water"] = status_to_binary(
    df["Tap Water-Treated (Status A(1)/NA(2))"]
)

features["hand_pump"] = status_to_binary(
    df["Hand Pump (Status A(1)/NA(2))"]
)

features["tube_well"] = status_to_binary(
    df["Tube Wells/Borehole (Status A(1)/NA(2))"]
)

features["river_canal"] = status_to_binary(
    df["River/Canal (Status A(1)/NA(2))"]
)

features["pond_lake"] = status_to_binary(
    df["Tank/Pond/Lake (Status A(1)/NA(2))"]
)


# ============================================================
# 8. DRAINAGE
# ============================================================

features["closed_drainage"] = status_to_binary(
    df["Closed Drainage (Status A(1)/NA(2))"]
)

features["no_drainage"] = status_to_binary(
    df["No Drainage (Status A(1)/NA(2))"]
)


# ============================================================
# 9. ROAD ACCESS
# ============================================================

features["national_highway"] = status_to_binary(
    df["National Highway (Status A(1)/NA(2))"]
)

features["state_highway"] = status_to_binary(
    df["State Highway (Status A(1)/NA(2))"]
)

features["major_district_road"] = status_to_binary(
    df["Major District Road (Status A(1)/NA(2))"]
)

features["black_topped_road"] = status_to_binary(
    df["Black Topped (pucca) Road (Status A(1)/NA(2))"]
)

features["all_weather_road"] = status_to_binary(
    df["All Weather Road (Status A(1)/NA(2))"]
)

features["footpath"] = status_to_binary(
    df["Footpath (Status A(1)/NA(2))"]
)


# ============================================================
# 10. COMMUNICATION
# ============================================================

features["mobile_coverage"] = status_to_binary(
    df["Mobile Phone Coverage (Status A(1)/NA(2))"]
)

features["internet_csc"] = status_to_binary(
    df[
        "Internet Cafes / Common Service Centre (CSC) "
        "(Status A(1)/NA(2))"
    ]
)


# ============================================================
# 11. ESSENTIAL SERVICES
# ============================================================

features["pds_shop"] = status_to_binary(
    df[
        "Public Distribution System (PDS) Shop "
        "(Status A(1)/NA(2))"
    ]
)

features["anganwadi"] = status_to_binary(
    df[
        "Nutritional Centres-Anganwadi Centre "
        "(Status A(1)/NA(2))"
    ]
)

features["asha"] = status_to_binary(
    df["ASHA (Status A(1)/NA(2))"]
)


# ============================================================
# 12. DISTANCE / ACCESSIBILITY
# ============================================================

features["subdistrict_hq_distance_km"] = df[
    "Sub District Head Quarter (Distance in km)"
]

features["district_hq_distance_km"] = df[
    "District Head Quarter (Distance in km)"
]

features["nearest_town_distance_km"] = df[
    "Nearest Statutory Town (Distance in km)"
]


# ============================================================
# 13. BASIC CLEANING
# ============================================================

# Replace infinite values generated by division
features = features.replace(
    [np.inf, -np.inf],
    np.nan
)


# ============================================================
# 14. SAVE
# ============================================================

os.makedirs(
    "data/processed",
    exist_ok=True
)

features.to_csv(
    OUTPUT_FILE,
    index=False
)


# ============================================================
# 15. REPORT
# ============================================================

print("\n========== PS-191 FEATURE DATASET ==========")

print("Rows:", len(features))
print("Columns:", len(features.columns))

print("\nMissing values:")

print(
    features.isna()
    .sum()
    .sort_values(ascending=False)
    .head(20)
)

print("\nSaved to:")

print(OUTPUT_FILE)