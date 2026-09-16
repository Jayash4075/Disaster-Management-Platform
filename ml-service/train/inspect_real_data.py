import pandas as pd
import os

# --------------------------------------------------
# File paths
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
# 1. Check whether files exist
# --------------------------------------------------

print("\n========== FILE CHECK ==========\n")

print("Census file exists:", os.path.exists(census_path))
print("Amenities file exists:", os.path.exists(amenities_path))


# --------------------------------------------------
# 2. Inspect Census Excel file
# --------------------------------------------------

print("\n========== CENSUS EXCEL ==========\n")

excel_file = pd.ExcelFile(census_path)

print("Excel sheets:")
print(excel_file.sheet_names)


# Read first sheet
census = pd.read_excel(
    census_path,
    sheet_name=excel_file.sheet_names[0]
)

print("\nCensus shape:")
print(census.shape)

print("\nCensus columns:")
for col in census.columns:
    print(col)


print("\nFirst 5 Census rows:")
print(census.head())


print("\nCensus data types:")
print(census.dtypes)


# --------------------------------------------------
# 3. Inspect Village Amenities CSV
# --------------------------------------------------

print("\n========== VILLAGE AMENITIES ==========\n")

amenities = pd.read_csv(
    amenities_path,
    low_memory=False
)

print("Amenities shape:")
print(amenities.shape)

print("\nAmenities columns:")
for col in amenities.columns:
    print(col)


print("\nFirst 5 Amenities rows:")
print(amenities.head())


print("\nAmenities data types:")
print(amenities.dtypes)


# --------------------------------------------------
# 4. Search for useful columns
# --------------------------------------------------

print("\n========== POSSIBLE IMPORTANT COLUMNS ==========\n")

keywords = [
    "code",
    "village",
    "location",
    "population",
    "household",
    "district",
    "sub district",
    "tehsil",
    "block",
    "medical",
    "health",
    "water",
    "road",
    "school"
]

print("\nCENSUS useful columns:")

for col in census.columns:
    col_lower = str(col).lower()

    if any(keyword in col_lower for keyword in keywords):
        print(col)


print("\nAMENITIES useful columns:")

for col in amenities.columns:
    col_lower = str(col).lower()

    if any(keyword in col_lower for keyword in keywords):
        print(col)


# --------------------------------------------------
# 5. Missing values
# --------------------------------------------------

print("\n========== MISSING VALUES ==========\n")

print("Census missing values:")
print(census.isnull().sum().sort_values(ascending=False).head(20))

print("\nAmenities missing values:")
print(amenities.isnull().sum().sort_values(ascending=False).head(20))