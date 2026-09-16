import pandas as pd

# ============================================================
# LOAD PROCESSED VILLAGE DATASET
# ============================================================

FILE = "data/processed/prayagraj_village_base.csv"

df = pd.read_csv(FILE, low_memory=False)

print("========== DATASET INFORMATION ==========")

print("Rows:", len(df))
print("Columns:", len(df.columns))

print("\n========== FIRST 5 ROWS ==========")
print(df.head())

print("\n========== COLUMN NAMES ==========")

for i, column in enumerate(df.columns):
    print(i, ":", column)

print("\n========== IMPORTANT CENSUS COLUMNS ==========")

census_columns = [
    "Village_Code",
    "Name",
    "No_HH",
    "TOT_P",
    "TOT_M",
    "TOT_F",
    "P_06",
    "P_SC",
    "P_ST",
    "P_LIT"
]

for column in census_columns:
    if column in df.columns:
        print(
            f"{column}: "
            f"dtype={df[column].dtype}, "
            f"missing={df[column].isna().sum()}"
        )

print("\n========== MISSING VALUES ==========")

missing = df.isna().sum()

print(
    missing[missing > 0]
    .sort_values(ascending=False)
    .head(30)
)

print("\n========== BASIC STATISTICS ==========")

important = [
    "No_HH",
    "TOT_P",
    "TOT_M",
    "TOT_F",
    "P_06",
    "P_SC",
    "P_ST",
    "P_LIT"
]

available = [
    column for column in important
    if column in df.columns
]

print(df[available].describe().T)