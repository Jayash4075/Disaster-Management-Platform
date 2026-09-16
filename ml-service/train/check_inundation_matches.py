import pandas as pd
import geopandas as gpd

# -----------------------------
# 1. Read inundation features
# -----------------------------
inundation = pd.read_csv(
    "data/processed/inundation_object_features.csv"
)

# Extract suffix from object_id
inundation["objectid_1_key"] = (
    inundation["object_id"]
    .astype(str)
    .str.split("-")
    .str[-1]
    .astype(int)
)

# -----------------------------
# 2. Read all UP boundaries
# -----------------------------
boundaries = gpd.read_file(
    "data/raw/vb_soi_up.GeoJSON"
)

boundaries["objectid_1_key"] = pd.to_numeric(
    boundaries["objectid_1"],
    errors="coerce"
)

# -----------------------------
# 3. Match all boundaries
# -----------------------------
matched = boundaries.merge(
    inundation,
    on="objectid_1_key",
    how="inner"
)

print("Total inundation objects:", len(inundation))
print("Total matched boundaries:", len(matched))

print("\nDistrict-wise matched objects:")
print(
    matched.groupby("district")["object_id"]
    .nunique()
    .sort_values(ascending=False)
)

print("\nSample matched records:")
print(
    matched[
        [
            "object_id",
            "objectid_1_key",
            "village",
            "district",
            "block",
            "vlcode"
        ]
    ].head(20).to_string(index=False)
)

# -----------------------------
# 4. Check Prayagraj matches
# -----------------------------
prayagraj_matches = matched[
    matched["district"].astype(str).str.strip().str.lower()
    == "prayagraj"
]

print("\nPrayagraj matched objects:", len(prayagraj_matches))

print("\nPrayagraj matches:")
print(
    prayagraj_matches[
        [
            "object_id",
            "objectid_1_key",
            "village",
            "district",
            "block",
            "vlcode"
        ]
    ].to_string(index=False)
)

# -----------------------------
# 5. Save diagnostic output
# -----------------------------
matched.to_csv(
    "data/processed/all_inundation_boundary_matches.csv",
    index=False
)

print("\nDiagnostic file created successfully.")