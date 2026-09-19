"""
add_village_coordinates.py

Reads prayagraj_village_boundaries.geojson (EPSG:7755 Lambert Conformal Conic),
computes the polygon centroid for each village, converts to WGS84 lat/lon
using pyproj, then adds latitude + longitude columns to
ps191_final_village_dataset.csv.

Run once before generating training data.
"""

import json
import os
import pandas as pd
from pyproj import Transformer

# --------------------------------------------------------
# Paths
# --------------------------------------------------------

BASE_DIR = os.path.join(os.path.dirname(__file__), "..")

GEOJSON_PATH = os.path.join(
    BASE_DIR, "data", "processed", "prayagraj_village_boundaries.geojson"
)

VILLAGE_CSV_PATH = os.path.join(
    BASE_DIR, "data", "processed", "ps191_final_village_dataset.csv"
)

# --------------------------------------------------------
# 1. Load GeoJSON
# --------------------------------------------------------

print("Loading GeoJSON boundaries...")

with open(GEOJSON_PATH, "r", encoding="utf-8") as f:
    geojson = json.load(f)

print(f"Total boundary features: {len(geojson['features'])}")

# --------------------------------------------------------
# 2. Set up coordinate transformer
#    EPSG:7755 = WGS 84 / India NSF LCC (projected, metres)
#    EPSG:4326 = WGS84 geographic (lat/lon degrees)
# --------------------------------------------------------

transformer = Transformer.from_crs(
    "EPSG:7755",
    "EPSG:4326",
    always_xy=True   # always returns (longitude, latitude)
)

# --------------------------------------------------------
# 3. Compute centroid for each village polygon
# --------------------------------------------------------

print("Computing village centroids...")

vlcode_to_latlon = {}

for feature in geojson["features"]:

    props = feature["properties"]
    geom  = feature["geometry"]

    # Parse vlcode to int
    try:
        vlcode = int(str(props["vlcode"]).strip())
    except (ValueError, KeyError):
        continue

    # Pick the exterior ring
    # For MultiPolygon: use the ring with the most vertices
    if geom["type"] == "Polygon":
        ring = geom["coordinates"][0]

    elif geom["type"] == "MultiPolygon":
        ring = max(
            geom["coordinates"],
            key=lambda poly: len(poly[0])
        )[0]

    else:
        continue

    # Centroid = mean of (x, y) of exterior ring vertices
    xs = [pt[0] for pt in ring]
    ys = [pt[1] for pt in ring]

    cx = sum(xs) / len(xs)
    cy = sum(ys) / len(ys)

    # Convert projected metres -> WGS84 degrees
    lon, lat = transformer.transform(cx, cy)

    vlcode_to_latlon[vlcode] = {
        "latitude":  round(lat, 6),
        "longitude": round(lon, 6)
    }

print(f"Centroids computed: {len(vlcode_to_latlon)}")

# --------------------------------------------------------
# 4. Load village CSV and merge coordinates
# --------------------------------------------------------

print("Loading village CSV...")

df = pd.read_csv(VILLAGE_CSV_PATH)

print(f"Village CSV rows: {len(df)}")

# Map village_code -> lat/lon
df["latitude"] = df["village_code"].map(
    lambda vc: vlcode_to_latlon.get(int(vc), {}).get("latitude",  None)
)

df["longitude"] = df["village_code"].map(
    lambda vc: vlcode_to_latlon.get(int(vc), {}).get("longitude", None)
)

# --------------------------------------------------------
# 5. Report
# --------------------------------------------------------

matched   = df["latitude"].notna().sum()
unmatched = df["latitude"].isna().sum()

print(f"\nMatched villages (have real lat/lon): {matched}")
print(f"Unmatched villages:                  {unmatched}")

if unmatched > 0:
    print("Unmatched village codes:")
    print(df[df["latitude"].isna()]["village_code"].tolist())

print(f"\nLatitude  range: {df['latitude'].min():.4f} to {df['latitude'].max():.4f}")
print(f"Longitude range: {df['longitude'].min():.4f} to {df['longitude'].max():.4f}")

# --------------------------------------------------------
# 6. Save updated CSV
# --------------------------------------------------------

df.to_csv(VILLAGE_CSV_PATH, index=False)

print(f"\nSaved with lat/lon columns to:")
print(VILLAGE_CSV_PATH)
