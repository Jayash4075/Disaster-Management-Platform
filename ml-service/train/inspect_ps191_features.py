import pandas as pd

# ============================================================
# LOAD REAL VILLAGE DATA
# ============================================================

FILE = "data/processed/prayagraj_village_base.csv"

df = pd.read_csv(FILE, low_memory=False)

print("Rows:", len(df))


# ============================================================
# PS-191 CANDIDATE FEATURES
# ============================================================

features = [
    # ---------------- Population ----------------
    "Village_Code",
    "Village Name",
    "Name",
    "No_HH",
    "TOT_P",
    "P_06",
    "P_SC",
    "P_ST",

    # ---------------- Geography ----------------
    "Total Geographical Area (in Hectares)",

    # ---------------- Health ----------------
    "Community Health Centre (Numbers)",
    "Primary Health Centre (Numbers)",
    "Primary Health Sub Centre (Numbers)",
    "Hospital Allopathic (Numbers)",
    "Dispensary (Numbers)",

    # ---------------- Water ----------------
    "Tap Water-Treated (Status A(1)/NA(2))",
    "Hand Pump (Status A(1)/NA(2))",
    "Tube Wells/Borehole (Status A(1)/NA(2))",
    "River/Canal (Status A(1)/NA(2))",
    "Tank/Pond/Lake (Status A(1)/NA(2))",

    # ---------------- Drainage ----------------
    "Closed Drainage (Status A(1)/NA(2))",
    "Open Drainage (Status A(1)/NA(2))",
    "No Drainage (Status A(1)/NA(2))",

    # ---------------- Communication ----------------
    "Mobile Phone Coverage (Status A(1)/NA(2))",
    "Internet Cafes / Common Service Centre (CSC) (Status A(1)/NA(2))",

    # ---------------- Roads ----------------
    "National Highway (Status A(1)/NA(2))",
    "State Highway (Status A(1)/NA(2))",
    "Major District Road (Status A(1)/NA(2))",
    "Black Topped (pucca) Road (Status A(1)/NA(2))",
    "All Weather Road (Status A(1)/NA(2))",
    "Footpath (Status A(1)/NA(2))",

    # ---------------- Emergency / support ----------------
    "Public Distribution System (PDS) Shop (Status A(1)/NA(2))",
    "Nutritional Centres-Anganwadi Centre (Status A(1)/NA(2))",
    "ASHA (Status A(1)/NA(2))",

    # ---------------- Connectivity ----------------
    "Sub District Head Quarter (Distance in km)",
    "District Head Quarter (Distance in km)",
    "Nearest Statutory Town (Distance in km)",
]


# ============================================================
# CHECK WHICH FEATURES ACTUALLY EXIST
# ============================================================

print("\n========== FEATURE CHECK ==========")

available = []
missing = []

for feature in features:

    if feature in df.columns:
        available.append(feature)
        print("[OK]     ", feature)
    else:
        missing.append(feature)
        print("[MISSING]", feature)


# ============================================================
# CHECK MISSING VALUES
# ============================================================

print("\n========== AVAILABLE FEATURES ==========")

for feature in available:

    missing_count = df[feature].isna().sum()
    missing_percent = (
        missing_count / len(df)
    ) * 100

    unique_values = df[feature].nunique(dropna=True)

    print(
        f"\n{feature}"
        f"\n  Missing: {missing_count} "
        f"({missing_percent:.2f}%)"
        f"\n  Unique values: {unique_values}"
    )

    print(
        "  Sample values:",
        df[feature].dropna().unique()[:10]
    )


# ============================================================
# SAVE FEATURE AUDIT
# ============================================================

audit = []

for feature in available:

    audit.append({
        "feature": feature,
        "missing_count": df[feature].isna().sum(),
        "missing_percent":
            df[feature].isna().sum() / len(df) * 100,
        "unique_values":
            df[feature].nunique(dropna=True)
    })

audit_df = pd.DataFrame(audit)

audit_df.to_csv(
    "data/processed/ps191_feature_audit.csv",
    index=False
)

print("\n========================================")
print("Feature audit saved successfully!")
print("data/processed/ps191_feature_audit.csv")
print("========================================")