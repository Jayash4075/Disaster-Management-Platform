import pandas as pd
from pathlib import Path

processed = Path("data/processed")

files_to_check = [
    "prayagraj_village_base.csv",
    "ps191_village_features.csv",
    "ps191_vulnerability_scores.csv",
    "inundation_object_features.csv",
    "prayagraj_village_inundation_features.csv",
]

print("\n========== DATASET AUDIT ==========\n")

for filename in files_to_check:
    filepath = processed / filename

    if filepath.exists():
        df = pd.read_csv(filepath)

        print(f"File: {filename}")
        print(f"Rows: {len(df)}")
        print(f"Columns: {df.columns.tolist()}")
        print("-" * 60)
    else:
        print(f"Missing: {filename}")
        print("-" * 60)

print("\nAudit completed.")