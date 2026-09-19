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
# Load data
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
    "shelter_capacity",
    "available_water",
    "food_stock",
    "medical_capacity",
    "road_access",
    "latitude",
    "longitude"
]

X = df[features]

y = df["capacity_status"]


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
# Model
# ---------------------------------------------------

model = RandomForestClassifier(
    n_estimators=400,
    max_depth=None,
    min_samples_split=4,
    min_samples_leaf=2,
    class_weight="balanced",
    random_state=42,
    n_jobs=-1
)


# ---------------------------------------------------
# Train
# ---------------------------------------------------

model.fit(X_train, y_train)


# ---------------------------------------------------
# Predict
# ---------------------------------------------------

y_pred = model.predict(X_test)


# ---------------------------------------------------
# Evaluation
# ---------------------------------------------------

accuracy = accuracy_score(y_test, y_pred)

print("\n======================================")
print("CARRYING CAPACITY MODEL")
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
    "capacity_model.pkl"
)

model_path = os.path.abspath(model_path)

joblib.dump(model, model_path)

print("\nModel saved successfully:")
print(model_path)