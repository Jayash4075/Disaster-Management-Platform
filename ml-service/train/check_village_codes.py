import pandas as pd
import os

# --------------------------------------------------
# Paths
# --------------------------------------------------

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

census_path = os.path.join(
    BASE_DIR,
    "data",
    "raw",
    "census_allahabad.xlsx"
)

amenities_path = os.path.join(
    BASE_DIR,
    "data",
    "raw",
    "DCHB_Village_Amenities-UTTAR_PRADESH-Allahabad-175.csv"
)


# --------------------------------------------------
# Load datasets
# --------------------------------------------------

census = pd.read_excel(census_path)

amenities = pd.read_csv(
    amenities_path,
    low_memory=False
)


# --------------------------------------------------
# Basic information
# --------------------------------------------------

print("\n========== CENSUS ==========\n")

print("Rows:", len(census))

print("\nTown/Village values:")
print(census["Town/Village"].head(20).to_list())

print("\nTown/Village unique values:")
print(census["Town/Village"].nunique())


print("\n========== AMENITIES ==========\n")

print("Rows:", len(amenities))

print("\nVillage Code values:")
print(amenities["Village Code"].head(20).to_list())

print("\nVillage Code unique values:")
print(amenities["Village Code"].nunique())


# --------------------------------------------------
# Check Census levels
# --------------------------------------------------

print("\n========== CENSUS LEVEL ==========\n")

print(census["Level"].value_counts(dropna=False))


# --------------------------------------------------
# Check Census names
# --------------------------------------------------

print("\n========== CENSUS VILLAGE NAMES ==========\n")

print(
    census[
        ["Town/Village", "Name", "Level"]
    ].head(30).to_string(index=False)
)


# --------------------------------------------------
# Check Amenities village information
# --------------------------------------------------

print("\n========== AMENITIES VILLAGES ==========\n")

print(
    amenities[
        [
            "Village Code",
            "Village Name",
            "Sub District Code",
            "Sub District Name"
        ]
    ].head(30).to_string(index=False)
)


# --------------------------------------------------
# Data types
# --------------------------------------------------

print("\n========== DATA TYPES ==========\n")

print("Census Town/Village:")
print(census["Town/Village"].dtype)

print("\nAmenities Village Code:")
print(amenities["Village Code"].dtype)