import pandas as pd
from pathlib import Path

# --------------------------------------------------
# 1. File paths
# --------------------------------------------------

input_file = Path("data/raw/inundation_pct_combined.csv")
output_file = Path("data/processed/inundation_object_features.csv")

# --------------------------------------------------
# 2. Load raw inundation data
# --------------------------------------------------

df = pd.read_csv(input_file)

print("Raw rows:", len(df))
print("Unique objects:", df["object_id"].nunique())

# --------------------------------------------------
# 3. Aggregate repeated records for each object-month
# --------------------------------------------------

monthly = (
    df.groupby(
        ["object_id", "year", "month_num", "month"],
        as_index=False
    )
    .agg(
        monthly_max_inundation_pct=(
            "inundation_pct",
            "max"
        ),
        monthly_mean_inundation_pct=(
            "inundation_pct",
            "mean"
        ),
        total_inundated_pixels=(
            "count_inundated_pixels",
            "sum"
        ),
        total_bhuvan_pixels=(
            "count_bhuvan_pixels",
            "sum"
        )
    )
)

# --------------------------------------------------
# 4. Create one historical summary per object
# --------------------------------------------------

summary = (
    monthly.groupby("object_id", as_index=False)
    .agg(
        max_inundation_pct=(
            "monthly_max_inundation_pct",
            "max"
        ),
        mean_inundation_pct=(
            "monthly_mean_inundation_pct",
            "mean"
        ),
        inundated_months=(
            "monthly_max_inundation_pct",
            lambda x: (x > 0).sum()
        ),
        observations=(
            "monthly_max_inundation_pct",
            "count"
        )
    )
)

# --------------------------------------------------
# 5. Add percentage versions for readability
# --------------------------------------------------

summary["max_inundation_percent"] = (
    summary["max_inundation_pct"] * 100
)

summary["mean_inundation_percent"] = (
    summary["mean_inundation_pct"] * 100
)

summary["inundated_month_ratio"] = (
    summary["inundated_months"] /
    summary["observations"]
)

# --------------------------------------------------
# 6. Sort by maximum historical inundation
# --------------------------------------------------

summary = summary.sort_values(
    "max_inundation_pct",
    ascending=False
)

# --------------------------------------------------
# 7. Save output
# --------------------------------------------------

output_file.parent.mkdir(
    parents=True,
    exist_ok=True
)

monthly.to_csv(
    "data/processed/inundation_object_monthly.csv",
    index=False
)

summary.to_csv(
    output_file,
    index=False
)

# --------------------------------------------------
# 8. Print summary
# --------------------------------------------------

print("\nMonthly rows:", len(monthly))
print("Summary rows:", len(summary))

print("\nTop 20 objects:")
print(
    summary[
        [
            "object_id",
            "max_inundation_percent",
            "mean_inundation_percent",
            "inundated_months",
            "observations"
        ]
    ]
    .head(20)
    .to_string(index=False)
)

print("\nSaved:")
print("data/processed/inundation_object_monthly.csv")
print("data/processed/inundation_object_features.csv")