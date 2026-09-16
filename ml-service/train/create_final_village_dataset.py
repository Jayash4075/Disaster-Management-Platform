import pandas as pd
import geopandas as gpd
from pathlib import Path

processed = Path("data/processed")

# ---------------------------------
# 1. Read vulnerability features
# ---------------------------------
features = pd.read_csv(
    processed / "ps191_village_features.csv"
)

scores = pd.read_csv(
    processed / "ps191_vulnerability_scores.csv"
)

print("Features columns:", features.columns.tolist())
print("Scores columns:", scores.columns.tolist())
# ---------------------------------
# 2. Normalize village code
# ---------------------------------
features["village_code"] = pd.to_numeric(
    features["village_code"], errors="coerce"
)

scores["village_code"] = pd.to_numeric(
    scores["village_code"], errors="coerce"
)

# ---------------------------------
# 3. Merge features + scores
# ---------------------------------
final_df = features.merge(
    scores[
        [
            "village_code",
            "vulnerability_score_100",
            "vulnerability_category"
        ]
    ],
    on="village_code",
    how="left"
)

print("Features rows:", len(features))
print("Scores rows:", len(scores))
print("Final rows:", len(final_df))

print("\nMissing vulnerability scores:")
print(final_df["vulnerability_score_100"].isna().sum())

# ---------------------------------
# 4. Save CSV
# ---------------------------------
final_df.to_csv(
    processed / "ps191_final_village_dataset.csv",
    index=False
)

# ---------------------------------
# 5. Merge with boundaries
# ---------------------------------
# ---------------------------------
# 5. Merge with boundaries
# ---------------------------------
boundaries = gpd.read_file(
    processed / "prayagraj_village_boundaries.geojson"
)

print("Boundary columns:", boundaries.columns.tolist())

boundaries["village_code"] = (
    pd.to_numeric(boundaries["vlcode"], errors="coerce")
    .astype("Int64")
)

final_geo = boundaries.merge(
    final_df,
    on="village_code",
    how="inner"
)

print("Boundary rows:", len(boundaries))
print("Final GeoDataFrame rows:", len(final_geo))

# ---------------------------------
# 6. Save GeoJSON
# ---------------------------------
final_geo.to_file(
    processed / "ps191_final_village_dataset.geojson",
    driver="GeoJSON"
)

print("\nFiles created successfully:")
print(processed / "ps191_final_village_dataset.csv")
print(processed / "ps191_final_village_dataset.geojson")