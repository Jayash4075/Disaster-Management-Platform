import pandas as pd
import os

# ============================================================
# 1. FILE PATHS
# ============================================================

CENSUS_FILE = "data/raw/census_allahabad.xlsx"
AMENITIES_FILE = "data/raw/DCHB_Village_Amenities-UTTAR_PRADESH-Allahabad-175.csv"

OUTPUT_FILE = "data/processed/prayagraj_village_base.csv"


# ============================================================
# 2. CREATE OUTPUT DIRECTORY
# ============================================================

os.makedirs("data/processed", exist_ok=True)


# ============================================================
# 3. LOAD CENSUS DATA
# ============================================================

print("Loading Census data...")

census = pd.read_excel(
    CENSUS_FILE,
    sheet_name="EB-0944"
)

print("Census shape:", census.shape)


# ============================================================
# 4. KEEP ONLY VILLAGE RECORDS
# ============================================================

census_villages = census[
    census["Level"].str.upper() == "VILLAGE"
].copy()

print("Census village rows:", len(census_villages))


# ============================================================
# 5. LOAD AMENITIES DATA
# ============================================================

print("\nLoading Amenities data...")

amenities = pd.read_csv(
    AMENITIES_FILE,
    low_memory=False
)

print("Amenities shape:", amenities.shape)


# ============================================================
# 6. CLEAN VILLAGE CODES
# ============================================================

# Census village code is integer
census_villages["Village_Code"] = (
    census_villages["Town/Village"]
    .astype(str)
    .str.strip()
)

# Amenities village code contains a leading apostrophe
amenities["Village_Code"] = (
    amenities["Village Code"]
    .astype(str)
    .str.strip()
    .str.replace("'", "", regex=False)
)


# ============================================================
# 7. CHECK DUPLICATES
# ============================================================

print("\nCensus duplicate village codes:",
      census_villages["Village_Code"].duplicated().sum())

print("Amenities duplicate village codes:",
      amenities["Village_Code"].duplicated().sum())


# ============================================================
# 8. MERGE BOTH OFFICIAL DATASETS
# ============================================================

print("\nMerging datasets...")

merged = pd.merge(
    census_villages,
    amenities,
    on="Village_Code",
    how="inner",
    suffixes=("_census", "_amenities")
)


# ============================================================
# 9. CHECK MERGE RESULT
# ============================================================

print("\n========== MERGE RESULT ==========")

print("Census villages:", len(census_villages))
print("Amenities villages:", len(amenities))
print("Merged villages:", len(merged))


# ============================================================
# 10. CHECK VILLAGES THAT DID NOT MATCH
# ============================================================

census_codes = set(census_villages["Village_Code"])
amenity_codes = set(amenities["Village_Code"])

missing_in_amenities = census_codes - amenity_codes
missing_in_census = amenity_codes - census_codes

print("\nVillage codes missing in Amenities:",
      len(missing_in_amenities))

print("Village codes missing in Census:",
      len(missing_in_census))


# ============================================================
# 11. SAVE MERGED DATASET
# ============================================================

merged.to_csv(
    OUTPUT_FILE,
    index=False
)

print("\nSaved dataset:")
print(OUTPUT_FILE)


# ============================================================
# 12. DISPLAY IMPORTANT INFORMATION
# ============================================================

print("\n========== SAMPLE ==========")

print(
    merged[
        [
            "Village_Code",
            "Name",
            "No_HH",
            "TOT_P",
            "TOT_M",
            "TOT_F",
            "P_06",
            "P_SC",
            "P_ST"
        ]
    ].head(10)
)


print("\n========== FINAL SHAPE ==========")
print(merged.shape)