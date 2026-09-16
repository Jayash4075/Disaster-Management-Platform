import geopandas as gpd
from pathlib import Path

# Automatically search for GeoJSON files inside data/raw
raw_folder = Path("data/raw")

geojson_files = list(raw_folder.glob("*.geojson")) + list(raw_folder.glob("*.GeoJSON"))

if len(geojson_files) == 0:
    print("❌ No GeoJSON file found inside data/raw")
    print("Files present:")
    for file in raw_folder.iterdir():
        print(file.name)
    exit()

print("GeoJSON files found:")
for file in geojson_files:
    print(file)

# Use the first GeoJSON file
BOUNDARY_FILE = geojson_files[0]

print("\nReading boundary file...")
print("Selected file:", BOUNDARY_FILE)

gdf = gpd.read_file(BOUNDARY_FILE)

print("\n========== BOUNDARY DATASET ==========")
print("Rows:", len(gdf))

print("\nColumns:")
print(gdf.columns.tolist())

print("\nCoordinate Reference System:")
print(gdf.crs)

print("\nFirst 5 rows:")
print(gdf.head())

print("\nGeometry types:")
print(gdf.geometry.geom_type.value_counts())

print("\nMissing values:")
print(gdf.isna().sum().sort_values(ascending=False).head(20))

print("\n========== PRAYAGRAJ / ALLAHABAD SEARCH ==========")

text_columns = gdf.select_dtypes(include=["object"]).columns

found = False

for column in text_columns:
    mask = (
        gdf[column]
        .astype(str)
        .str.contains(
            "Prayagraj|Allahabad",
            case=False,
            na=False
        )
    )

    if mask.any():
        found = True
        print(f"\nColumn: {column}")
        print(gdf.loc[mask, [column]].head(20))
        print("Matching rows:", mask.sum())

if not found:
    print("No Prayagraj/Allahabad text found in text columns.")