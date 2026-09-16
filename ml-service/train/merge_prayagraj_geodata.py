import geopandas as gpd
import pandas as pd
from pathlib import Path

# --------------------------------------------------
# File paths
# --------------------------------------------------

BOUNDARY_FILE = Path(
    "data/processed/prayagraj_village_boundaries.geojson"
)

FEATURE_FILE = Path(
    "data/processed/ps191_village_features.csv"
)

OUTPUT_FILE = Path(
    "data/processed/prayagraj_village_geodata.geojson"
)

OUTPUT_CSV = Path(
    "data/processed/prayagraj_village_merged.csv"
)

# --------------------------------------------------
# 1. Load boundary data
# --------------------------------------------------

print("Loading Prayagraj boundary data...")

gdf = gpd.read_file(BOUNDARY_FILE)

print("Boundary rows:", len(gdf))

# --------------------------------------------------
# 2. Load feature data
# --------------------------------------------------

print("\nLoading feature data...")

features_df = pd.read_csv(FEATURE_FILE)

print("Feature rows:", len(features_df))

# --------------------------------------------------
# 3. Normalize village codes
# --------------------------------------------------

# Convert both codes to strings.
# This avoids problems such as 160730.0 versus "160730".

gdf["vlcode"] = (
    gdf["vlcode"]
    .astype(str)
    .str.strip()
)

features_df["village_code"] = (
    features_df["village_code"]
    .astype(str)
    .str.strip()
)

# --------------------------------------------------
# 4. Check duplicate village codes
# --------------------------------------------------

print("\n========== DUPLICATE CHECK ==========")

print(
    "Duplicate boundary codes:",
    gdf["vlcode"].duplicated().sum()
)

print(
    "Duplicate feature codes:",
    features_df["village_code"].duplicated().sum()
)

# --------------------------------------------------
# 5. Check matching village codes
# --------------------------------------------------

boundary_codes = set(gdf["vlcode"])
feature_codes = set(features_df["village_code"])

matched_codes = boundary_codes.intersection(feature_codes)

boundary_only_codes = boundary_codes - feature_codes
feature_only_codes = feature_codes - boundary_codes

print("\n========== CODE MATCHING ==========")

print("Matched village codes:", len(matched_codes))
print("Boundary-only codes:", len(boundary_only_codes))
print("Feature-only codes:", len(feature_only_codes))

# --------------------------------------------------
# 6. Display unmatched boundary villages
# --------------------------------------------------

if len(boundary_only_codes) > 0:
    print("\n========== BOUNDARY-ONLY VILLAGES ==========")

    boundary_only = gdf[
        gdf["vlcode"].isin(boundary_only_codes)
    ][["vlcode", "village", "district", "subdistric"]]

    print(boundary_only.head(50).to_string(index=False))

# --------------------------------------------------
# 7. Display unmatched feature villages
# --------------------------------------------------

if len(feature_only_codes) > 0:
    print("\n========== FEATURE-ONLY VILLAGES ==========")

    feature_only = features_df[
        features_df["village_code"].isin(feature_only_codes)
    ][["village_code", "village_name"]]

    print(feature_only.head(50).to_string(index=False))

# --------------------------------------------------
# 8. Merge feature data with boundaries
# --------------------------------------------------

print("\n========== MERGING DATA ==========")

merged_gdf = gdf.merge(
    features_df,
    how="inner",
    left_on="vlcode",
    right_on="village_code",
    suffixes=("_boundary", "_feature")
)

print("Merged rows:", len(merged_gdf))

# --------------------------------------------------
# 9. Save merged GeoJSON
# --------------------------------------------------

merged_gdf.to_file(
    OUTPUT_FILE,
    driver="GeoJSON"
)

print("\nSaved merged GeoJSON:")
print(OUTPUT_FILE)

# --------------------------------------------------
# 10. Save merged CSV without geometry
# --------------------------------------------------

merged_csv = pd.DataFrame(merged_gdf.drop(columns="geometry"))

merged_csv.to_csv(
    OUTPUT_CSV,
    index=False
)

print("\nSaved merged CSV:")
print(OUTPUT_CSV)

# --------------------------------------------------
# 11. Final summary
# --------------------------------------------------

print("\n========== FINAL SUMMARY ==========")
print("Boundary rows:", len(gdf))
print("Feature rows:", len(features_df))
print("Merged rows:", len(merged_gdf))
print("Merged columns:", len(merged_gdf.columns))

print("\nMerged feature columns:")
for column in features_df.columns:
    print(column)