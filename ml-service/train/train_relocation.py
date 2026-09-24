import pandas as pd
import os
import joblib

from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import (
    accuracy_score,
    classification_report,
    confusion_matrix
)


# ---------------------------------------------------
# Load dataset
# ---------------------------------------------------

data_path = os.path.join(
    os.path.dirname(__file__),
    "..",
    "data",
    "habitation_data.csv"
)

df = pd.read_csv(data_path)


# ---------------------------------------------------
# Features
# ---------------------------------------------------

features = [
    "population",
    "rainfall",
    "river_level",
    "flood_history",
    "building_damage",
    "vulnerable_population",
    "water_level",
    "road_access",
    "hospital_distance",
    "shelter_capacity",
    "capacity_ratio"
]

X = df[features]

y = df["relocation_priority"]


# ---------------------------------------------------
# Split
# ---------------------------------------------------

X_train, X_test, y_train, y_test = train_test_split(
    X,
    y,
    test_size=0.20,
    random_state=42,
    stratify=y
)


# ---------------------------------------------------
# Random Forest
# ---------------------------------------------------

model = RandomForestClassifier(
    n_estimators=500,
    max_depth=None,
    min_samples_split=4,
    min_samples_leaf=2,
    max_features="sqrt",
    class_weight="balanced",
    random_state=42,
    n_jobs=-1
)


# ---------------------------------------------------
# Train
# ---------------------------------------------------

model.fit(X_train, y_train)


# ---------------------------------------------------
# Prediction
# ---------------------------------------------------

y_pred = model.predict(X_test)


# ---------------------------------------------------
# Evaluation
# ---------------------------------------------------

accuracy = accuracy_score(y_test, y_pred)

print("\n======================================")
print("RELOCATION PRIORITY MODEL")
print("======================================")

print("\nTest Accuracy:")
print(round(accuracy, 4))

print("\nClassification Report:")
print(classification_report(y_test, y_pred))

print("\nConfusion Matrix:")
print(confusion_matrix(y_test, y_pred))


# ---------------------------------------------------
# Feature importance
# ---------------------------------------------------

importance = pd.Series(
    model.feature_importances_,
    index=features
).sort_values(ascending=False)

print("\nFeature Importance:")
print(importance)


# ---------------------------------------------------
# Save model
# ---------------------------------------------------

model_path = os.path.join(
    os.path.dirname(__file__),
    "..",
    "models",
    "relocation_model.pkl"
)

model_path = os.path.abspath(model_path)

joblib.dump(model, model_path)

print("\nModel saved successfully:")
print(model_path)