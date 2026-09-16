import geopandas as gpd
import pandas as pd
from pathlib import Path

# --------------------------------------------------
# File paths
# --------------------------------------------------

BOUNDARY_FILE = Path("data/raw/vb_soi_up.GeoJSON")
FEATURE_FILE = Path("data/processed/ps191_village_features.csv")

OUTPUT_BOUNDARY_FILE = Path(
    "data/processed/prayagraj_village_boundaries.geojson"
)

OUTPUT_MERGED_FILE = Path(
    "data/processed/prayagraj_village_geodata.geojson"
)

# --------------------------------------------------
# 1. Load boundary dataset
# --------------------------------------------------

print("Loading village boundary dataset...")

gdf = gpd.read_file(BOUNDARY_FILE)

print("Total boundary rows:", len(gdf))

# --------------------------------------------------
# 2. Clean column names
# --------------------------------------------------

# Remove unwanted spaces and newline characters
gdf.columns = (
    gdf.columns
    .str.strip()
    .str.replace("\n", "", regex=False)
)

print("\nCleaned columns:")
print(gdf.columns.tolist())

# --------------------------------------------------
# 3. Filter Prayagraj district
# --------------------------------------------------

prayagraj_gdf = gdf[
    gdf["district"]
    .astype(str)
    .str.strip()
    .str.lower()
    .eq("prayagraj")
].copy()

print("\n========== PRAYAGRAJ BOUNDARIES ==========")
print("Prayagraj rows:", len(prayagraj_gdf))

print("\nDistrict names:")
print(prayagraj_gdf["district"].value_counts())

# --------------------------------------------------
# 4. Inspect village-code columns
# --------------------------------------------------

print("\nVillage code sample:")
print(prayagraj_gdf[["village", "vlcode"]].head(20))

print("\nVillage code data type:")
print(prayagraj_gdf["vlcode"].dtype)

# --------------------------------------------------
# 5. Save only Prayagraj boundaries
# --------------------------------------------------

prayagraj_gdf.to_file(
    OUTPUT_BOUNDARY_FILE,
    driver="GeoJSON"
)

print(
    "\nSaved filtered boundary file:",
    OUTPUT_BOUNDARY_FILE
)

# --------------------------------------------------
# 6. Load ML feature dataset
# --------------------------------------------------

features_df = pd.read_csv(FEATURE_FILE)

print("\n========== FEATURE DATASET ==========")
print("Feature rows:", len(features_df))
print("Feature columns:")
print(features_df.columns.tolist())

# --------------------------------------------------
# 7. Show possible village-code columns
# --------------------------------------------------

print("\nPossible village-code columns in feature file:")

for column in features_df.columns:
    if "code" in column.lower() or "village" in column.lower():
        print(column)

# --------------------------------------------------
# 8. Show first few feature rows
# --------------------------------------------------

print("\nFirst 5 feature rows:")
print(features_df.head())