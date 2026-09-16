import pandas as pd
import geopandas as gpd
from pathlib import Path


# --------------------------------------------------
# 1. File paths
# --------------------------------------------------

inundation_file = "data/processed/inundation_object_features.csv"
boundary_file = "data/raw/vb_soi_up.GeoJSON"

output_csv = "data/processed/prayagraj_village_inundation_features.csv"
output_geojson = "data/processed/prayagraj_village_inundation.geojson"


# --------------------------------------------------
# 2. Load inundation features
# --------------------------------------------------

inundation = pd.read_csv(inundation_file)

print("Inundation rows:", len(inundation))
print("Inundation columns:", inundation.columns.tolist())


# --------------------------------------------------
# 3. Extract objectid_1 from object_id
# --------------------------------------------------

# Example:
# 09-159-00831 → 831

inundation["objectid_1"] = (
    inundation["object_id"]
    .str.split("-")
    .str[-1]
    .astype(int)
)

print("\nSample extracted IDs:")
print(inundation[["object_id", "objectid_1"]].head())


# --------------------------------------------------
# 4. Load village boundaries
# --------------------------------------------------

boundaries = gpd.read_file(boundary_file)

# Keep only Prayagraj
boundaries = boundaries[
    boundaries["district"]
    .astype(str)
    .str.contains("Prayagraj", case=False, na=False)
].copy()

print("\nPrayagraj boundary rows:", len(boundaries))


# --------------------------------------------------
# 5. Prepare boundary ID for joining
# --------------------------------------------------

boundaries["objectid_1"] = pd.to_numeric(
    boundaries["objectid_1"],
    errors="coerce"
)

# Remove duplicate boundary IDs, if any
boundaries = boundaries.drop_duplicates(
    subset=["objectid_1"]
)


# --------------------------------------------------
# 6. Merge inundation data with village boundaries
# --------------------------------------------------

merged = boundaries.merge(
    inundation,
    on="objectid_1",
    how="left",
    suffixes=("", "_inundation")
)

print("\nMerged rows:", len(merged))

print(
    "Villages with inundation data:",
    merged["object_id"].notna().sum()
)

print(
    "Villages without inundation data:",
    merged["object_id"].isna().sum()
)


# --------------------------------------------------
# 7. Save CSV without geometry
# --------------------------------------------------

merged.drop(columns="geometry").to_csv(
    output_csv,
    index=False
)


# --------------------------------------------------
# 8. Save GeoJSON
# --------------------------------------------------

merged.to_file(
    output_geojson,
    driver="GeoJSON"
)

print("\nFiles created successfully:")
print(output_csv)
print(output_geojson)