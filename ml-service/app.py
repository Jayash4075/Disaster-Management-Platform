import os
import joblib

import pandas as pd
from pathlib import Path
from datetime import date

from flask import Flask, request, jsonify
from flask_cors import CORS


# =========================================================
# APP
# =========================================================

app = Flask(__name__)
CORS(app)


# =========================================================
# PATHS
# =========================================================

BASE_DIR = Path(__file__).resolve().parent

MODEL_DIR = BASE_DIR / "models"

VILLAGE_DATA_PATH = (
    BASE_DIR
    / "data"
    / "processed"
    / "ps191_final_village_dataset.csv"
)


print("=" * 60)
print("DISASTER MANAGEMENT ML SERVICE")
print("=" * 60)

print("BASE DIR :", BASE_DIR)
print("MODEL DIR:", MODEL_DIR)
print("DATA PATH:", VILLAGE_DATA_PATH)


# =========================================================
# RISK HELPERS
# =========================================================

def clamp_score(value):
    """
    Keep score between 0 and 100.
    """
    return max(0, min(100, float(value)))


def get_risk_level(risk_score):
    """
    Convert numerical score into dashboard zone.
    """

    risk_score = float(risk_score)

    if risk_score >= 75:
        return "RED"

    elif risk_score >= 50:
        return "ORANGE"

    elif risk_score >= 25:
        return "YELLOW"

    else:
        return "GREEN"


def get_relocation_priority(risk_score):
    """
    Fallback relocation priority.

    Used only when the trained relocation model
    returns labels different from our application labels.
    """

    risk_score = float(risk_score)

    if risk_score >= 85:
        return "IMMEDIATE"

    elif risk_score >= 65:
        return "SHORT_TERM"

    elif risk_score >= 40:
        return "MEDIUM_TERM"

    else:
        return "MONITOR"


# =========================================================
# LOAD VILLAGE DATASET
# =========================================================

try:

    if not VILLAGE_DATA_PATH.exists():

        raise FileNotFoundError(
            f"Village dataset not found: {VILLAGE_DATA_PATH}"
        )

    village_df = pd.read_csv(
        VILLAGE_DATA_PATH
    )

    print()
    print("Final village dataset loaded successfully")
    print("Total villages:", len(village_df))

except Exception as e:

    print()
    print("ERROR loading village dataset:")
    print(e)

    village_df = pd.DataFrame()


# =========================================================
# MODEL LOADER
# =========================================================

def load_model(filename, model_name):

    model_path = MODEL_DIR / filename

    print()
    print(f"Loading {model_name}...")
    print("Path:", model_path)

    if not model_path.exists():

        print(
            f"[NOT FOUND] {model_name}: {model_path}"
        )

        return None

    try:

        model = joblib.load(model_path)

        print(
            f"[LOADED] {model_name}"
        )

        # Useful information for debugging
        if hasattr(model, "n_features_in_"):

            print(
                f"Features expected: {model.n_features_in_}"
            )

        if hasattr(model, "classes_"):

            print(
                f"Classes: {list(model.classes_)}"
            )

        return model

    except Exception as e:

        print(
            f"[ERROR] Could not load {model_name}: {e}"
        )

        return None


# =========================================================
# LOAD EACH MODEL INDEPENDENTLY
# =========================================================

disaster_model = load_model(
    "disaster_model.pkl",
    "Disaster Risk Model"
)

shortage_model = load_model(
    "shortage_model.pkl",
    "Resource Shortage Model"
)

sos_model = load_model(
    "sos_model.pkl",
    "SOS Severity Model"
)

habitation_risk_model = load_model(
    "habitation_risk_model.pkl",
    "Habitation Risk Model"
)

capacity_model = load_model(
    "capacity_model.pkl",
    "Carrying Capacity Model"
)

relocation_model = load_model(
    "relocation_model.pkl",
    "Relocation Priority Model"
)


print()
print("=" * 60)
print("MODEL LOADING SUMMARY")
print("=" * 60)

print(
    "Disaster Model       :",
    disaster_model is not None
)

print(
    "Shortage Model       :",
    shortage_model is not None
)

print(
    "SOS Model            :",
    sos_model is not None
)

print(
    "Habitation Risk Model:",
    habitation_risk_model is not None
)

print(
    "Capacity Model       :",
    capacity_model is not None
)

print(
    "Relocation Model     :",
    relocation_model is not None
)

print("=" * 60)


# =========================================================
# HOME
# =========================================================

@app.route("/", methods=["GET"])
def home():

    return jsonify({

        "service":
            "Disaster Management ML Service",

        "status":
            "running",

        "port":
            5001,

        "dataset": {

            "loaded":
                not village_df.empty,

            "total_villages":
                len(village_df)

        },

        "models": {

            "disaster_risk":
                disaster_model is not None,

            "resource_shortage":
                shortage_model is not None,

            "sos_severity":
                sos_model is not None,

            "habitation_risk":
                habitation_risk_model is not None,

            "carrying_capacity":
                capacity_model is not None,

            "relocation_priority":
                relocation_model is not None

        },

        "endpoints": [

            "/health",

            "/predict/disaster",

            "/predict/shortage",

            "/predict/sos",

            "/predict/habitation",

            "/api/villages",

            "/api/villages/search",

            "/api/villages/risk"

        ]

    })


# =========================================================
# HEALTH CHECK
# =========================================================

@app.route("/health", methods=["GET"])
def health():

    core_models_loaded = (
        habitation_risk_model is not None
        and relocation_model is not None
    )

    return jsonify({

        "status":
            "healthy" if core_models_loaded
            else "degraded",

        "service":
            "Disaster Management ML Service",

        "dataset": {

            "loaded":
                not village_df.empty,

            "total_villages":
                len(village_df)

        },

        "models": {

            "capacity_model":
                capacity_model is not None,

            "disaster_model":
                disaster_model is not None,

            "habitation_risk_model":
                habitation_risk_model is not None,

            "relocation_model":
                relocation_model is not None,

            "shortage_model":
                shortage_model is not None,

            "sos_model":
                sos_model is not None

        }

    })


# =========================================================
# DISASTER RISK PREDICTION
# =========================================================

@app.route(
    "/predict/disaster",
    methods=["POST"]
)
def predict_disaster():

    try:

        data = request.get_json()

        if not data:

            return jsonify({

                "success": False,

                "error":
                    "Request body must contain JSON data"

            }), 400


        if disaster_model is None:

            return jsonify({

                "success": False,

                "error":
                    "Disaster model is not loaded"

            }), 503


        required_fields = [

            "rainfall",
            "river_level",
            "humidity",
            "temperature",
            "previous_floods"

        ]


        for field in required_fields:

            if field not in data:

                return jsonify({

                    "success": False,

                    "error":
                        f"Missing field: {field}"

                }), 400


        features = [[

            float(data["rainfall"]),

            float(data["river_level"]),

            float(data["humidity"]),

            float(data["temperature"]),

            float(data["previous_floods"])

        ]]


        prediction = (
            disaster_model
            .predict(features)[0]
        )


        probability_dict = {}


        if hasattr(
            disaster_model,
            "predict_proba"
        ):

            probabilities = (
                disaster_model
                .predict_proba(features)[0]
            )

            classes = (
                disaster_model.classes_
            )

            for class_name, probability in zip(
                classes,
                probabilities
            ):

                probability_dict[
                    str(class_name)
                ] = round(
                    float(probability),
                    4
                )


        predicted_probability = (
            probability_dict.get(
                str(prediction),
                0
            )
        )


        return jsonify({

            "success": True,

            "prediction": {

                "risk":
                    str(prediction),

                "probability":
                    predicted_probability

            },

            "probabilities":
                probability_dict

        })


    except ValueError:

        return jsonify({

            "success": False,

            "error":
                "All input fields must contain numeric values"

        }), 400


    except Exception as e:

        return jsonify({

            "success": False,

            "error":
                str(e)

        }), 500


# =========================================================
# RESOURCE SHORTAGE PREDICTION
# =========================================================

@app.route(
    "/predict/shortage",
    methods=["POST"]
)
def predict_shortage():

    try:

        data = request.get_json()

        if not data:

            return jsonify({

                "success": False,

                "error":
                    "Request body must contain JSON data"

            }), 400


        if shortage_model is None:

            return jsonify({

                "success": False,

                "error":
                    "Shortage model is not loaded",

                "message":
                    "Place shortage_model.pkl inside ml-service/models/"

            }), 503


        required_fields = [

            "population",
            "current_stock",
            "daily_consumption",
            "incoming_supply",
            "people_per_unit"

        ]


        for field in required_fields:

            if field not in data:

                return jsonify({

                    "success": False,

                    "error":
                        f"Missing field: {field}"

                }), 400


        features = [[

            float(data["population"]),

            float(data["current_stock"]),

            float(data["daily_consumption"]),

            float(data["incoming_supply"]),

            float(data["people_per_unit"])

        ]]


        hours = (
            shortage_model
            .predict(features)[0]
        )


        hours = max(
            float(hours),
            0
        )


        if hours <= 2:

            status = "CRITICAL"

        elif hours <= 6:

            status = "WARNING"

        elif hours <= 24:

            status = "MONITOR"

        else:

            status = "SAFE"


        return jsonify({

            "success": True,

            "prediction": {

                "hours_until_shortage":
                    round(hours, 2),

                "status":
                    status

            }

        })


    except ValueError:

        return jsonify({

            "success": False,

            "error":
                "All input values must be valid numbers"

        }), 400


    except Exception as e:

        return jsonify({

            "success": False,

            "error":
                str(e)

        }), 500


# =========================================================
# SOS SEVERITY PREDICTION
# =========================================================

@app.route(
    "/predict/sos",
    methods=["POST"]
)
def predict_sos():

    try:

        data = request.get_json()

        if not data:

            return jsonify({

                "success": False,

                "error":
                    "Request body must contain JSON data"

            }), 400


        if sos_model is None:

            return jsonify({

                "success": False,

                "error":
                    "SOS model is not loaded",

                "message":
                    "Place sos_model.pkl inside ml-service/models/"

            }), 503


        required_fields = [

            "people_trapped",

            "injured_people",

            "critical_injuries",

            "children_elderly",

            "water_level",

            "building_damage",

            "hours_trapped",

            "communication_available"

        ]


        for field in required_fields:

            if field not in data:

                return jsonify({

                    "success": False,

                    "error":
                        f"Missing field: {field}"

                }), 400


        features = [[

            float(data["people_trapped"]),

            float(data["injured_people"]),

            float(data["critical_injuries"]),

            float(data["children_elderly"]),

            float(data["water_level"]),

            float(data["building_damage"]),

            float(data["hours_trapped"]),

            float(data["communication_available"])

        ]]


        prediction = (
            sos_model
            .predict(features)[0]
        )


        probability_dict = {}


        if hasattr(
            sos_model,
            "predict_proba"
        ):

            probabilities = (
                sos_model
                .predict_proba(features)[0]
            )

            classes = (
                sos_model.classes_
            )

            for class_name, probability in zip(
                classes,
                probabilities
            ):

                probability_dict[
                    str(class_name)
                ] = round(
                    float(probability),
                    4
                )


        predicted_probability = (
            probability_dict.get(
                str(prediction),
                0
            )
        )


        severity_scores = {

            "LOW": 25,

            "MEDIUM": 50,

            "HIGH": 75,

            "CRITICAL": 95

        }


        severity_score = (
            severity_scores.get(
                str(prediction).upper(),
                0
            )
        )


        return jsonify({

            "success": True,

            "prediction": {

                "severity":
                    str(prediction),

                "severity_score":
                    severity_score,

                "probability":
                    predicted_probability

            },

            "probabilities":
                probability_dict

        })


    except ValueError:

        return jsonify({

            "success": False,

            "error":
                "All input values must be numeric"

        }), 400


    except Exception as e:

        return jsonify({

            "success": False,

            "error":
                str(e)

        }), 500


# =========================================================
# ALL VILLAGES
# =========================================================

@app.route(
    "/api/villages",
    methods=["GET"]
)
def get_villages():

    try:

        if village_df.empty:

            return jsonify({

                "success": False,

                "error":
                    "Village dataset is not loaded"

            }), 503


        columns = [

            "village_code",

            "village_name",

            "population",

            "vulnerability_score_100",

            "vulnerability_category"

        ]


        missing_columns = [

            column

            for column in columns

            if column not in village_df.columns

        ]


        if missing_columns:

            return jsonify({

                "success": False,

                "error":
                    "Required village columns are missing",

                "missing_columns":
                    missing_columns

            }), 500


        data = village_df[
            columns
        ].copy()


        data = data.astype(object).where(

            pd.notnull(data),

            None

        )


        return jsonify({

            "success": True,

            "total_villages":
                len(data),

            "villages":
                data.to_dict(
                    orient="records"
                )

        })


    except Exception as e:

        return jsonify({

            "success": False,

            "error":
                str(e)

        }), 500


# =========================================================
# SEARCH VILLAGES
# =========================================================

@app.route(
    "/api/villages/search",
    methods=["GET"]
)
def search_villages():

    try:

        if village_df.empty:

            return jsonify({

                "success": False,

                "error":
                    "Village dataset is not loaded"

            }), 503


        query = request.args.get(
            "q",
            ""
        ).strip()


        if not query:

            return jsonify({

                "success": False,

                "error":
                    "Please provide a search query using ?q="

            }), 400


        name_match = (
            village_df[
                "village_name"
            ]
            .astype(str)
            .str.contains(
                query,
                case=False,
                na=False
            )
        )


        code_match = (
            village_df[
                "village_code"
            ]
            .astype(str)
            .str.contains(
                query,
                case=False,
                na=False
            )
        )


        result = village_df[
            name_match | code_match
        ]


        columns = [

            "village_code",

            "village_name",

            "population",

            "vulnerability_score_100",

            "vulnerability_category"

        ]


        result = result[
            columns
        ].copy()


        result = result.astype(object).where(

            pd.notnull(result),

            None

        )


        return jsonify({

            "success": True,

            "total_results":
                len(result),

            "villages":
                result.to_dict(
                    orient="records"
                )

        })


    except Exception as e:

        return jsonify({

            "success": False,

            "error":
                str(e)

        }), 500


# =========================================================
# VILLAGE RISK DATA
# =========================================================

@app.route(
    "/api/villages/risk",
    methods=["GET"]
)
def get_village_risk():

    try:

        if village_df.empty:

            return jsonify({

                "success": False,

                "error":
                    "Village dataset is not loaded"

            }), 503


        result = village_df.copy()


        response = []


        for _, row in result.iterrows():

            vulnerability_score = (
                row.get(
                    "vulnerability_score_100"
                )
            )


            vulnerability_category = (
                row.get(
                    "vulnerability_category"
                )
            )


            population = row.get(
                "population",
                0
            )


            if pd.isna(population):

                population = 0


            if pd.isna(
                vulnerability_score
            ):

                vulnerability_score = None


            response.append({

                "villageCode":
                    str(row.get(
                        "village_code",
                        ""
                    )),

                "villageName":
                    str(row.get(
                        "village_name",
                        ""
                    )),

                "population":
                    int(population),

                "vulnerabilityScore":
                    (
                        round(
                            float(
                                vulnerability_score
                            ),
                            2
                        )
                        if vulnerability_score
                        is not None
                        else None
                    ),

                "vulnerabilityCategory":
                    (
                        str(
                            vulnerability_category
                        )
                        if not pd.isna(
                            vulnerability_category
                        )
                        else None
                    ),

                "riskScore":
                    None,

                "riskLevel":
                    None,

                "assessmentStatus":
                    "NOT_ASSESSED"

            })


        return jsonify({

            "success": True,

            "totalVillages":
                len(response),

            "message":
                "Village master data loaded. Environmental risk has not been assessed because the PS-191 dataset does not contain the required environmental ML inputs.",

            "villages":
                response

        })


    except Exception as e:

        return jsonify({

            "success": False,

            "error":
                str(e)

        }), 500


# =========================================================
# PS-191 HABITATION ANALYSIS
# =====================================================

@app.route("/predict/habitation", methods=["POST"])
def predict_habitation():

    try:

        data = request.get_json()

        if not data:
            return jsonify({
                "success": False,
                "error": "Request body must contain JSON data"
            }), 400

        # =====================================================
        # REQUIRED INPUTS
        # =====================================================

        required_fields = [
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
            "available_water",
            "food_stock",
            "medical_capacity"
        ]

        for field in required_fields:

            if field not in data:
                return jsonify({
                    "success": False,
                    "error": f"Missing field: {field}"
                }), 400

        # =====================================================
        # CHECK MODELS
        # =====================================================

        if habitation_risk_model is None:
            return jsonify({
                "success": False,
                "error": "Habitation risk model is not loaded"
            }), 500

        if relocation_model is None:
            return jsonify({
                "success": False,
                "error": "Relocation model is not loaded"
            }), 500

        # =====================================================
        # BASIC INFORMATION
        # =====================================================

        population = float(data["population"])

        habitation_id = data.get(
            "habitationId",
            data.get("village_code", "UNKNOWN")
        )

        habitation_name = data.get(
            "name",
            data.get("village_name", "Unknown Habitation")
        )

        # =====================================================
        # 1. HABITATION RISK ML
        # =====================================================

        risk_features = [[

            float(data["population"]),
            float(data["rainfall"]),
            float(data["river_level"]),
            float(data["flood_history"]),
            float(data["building_damage"]),
            float(data["vulnerable_population"]),
            float(data["water_level"]),
            float(data["road_access"]),
            float(data["hospital_distance"]),

            # Keep these ONLY if the current model
            # was actually trained with latitude/longitude.
            float(data.get("latitude", 0)),
            float(data.get("longitude", 0))

        ]]

        risk_prediction = habitation_risk_model.predict(
            risk_features
        )[0]

        risk_prediction = str(
            risk_prediction
        ).upper()

        # =====================================================
        # RISK PROBABILITIES
        # =====================================================

        risk_probabilities = (
            habitation_risk_model
            .predict_proba(risk_features)[0]
        )

        risk_classes = habitation_risk_model.classes_

        risk_probability_dict = {}

        for class_name, probability in zip(
            risk_classes,
            risk_probabilities
        ):

            risk_probability_dict[
                str(class_name).upper()
            ] = round(
                float(probability),
                4
            )

        predicted_risk_probability = (
            risk_probability_dict.get(
                risk_prediction,
                0
            )
        )

        # =====================================================
        # RISK SCORE
        # =====================================================

        risk_score_map = {
            "LOW": 25,
            "MEDIUM": 50,
            "HIGH": 75,
            "CRITICAL": 95
        }

        risk_score = clamp_score(
            risk_score_map.get(
                risk_prediction,
                0
            )
        )

        risk_level = get_risk_level(
            risk_score
        )

        # =====================================================
        # 2. VULNERABILITY
        # =====================================================
        #
        # Vulnerability is NOT the same as current risk.
        #
        # Get it from PS-191 village dataset.

        vulnerability_score = None
        vulnerability_category = None

        village_match = village_df[
            village_df["village_code"].astype(str)
            == str(habitation_id)
        ]

        if not village_match.empty:

            row = village_match.iloc[0]

            vulnerability_score = float(
                row["vulnerability_score_100"]
            )

            vulnerability_category = str(
                row["vulnerability_category"]
            )

        # =====================================================
        # 3. HAZARDS
        # =====================================================
        #
        # Current habitation model predicts OVERALL RISK.
        # It does NOT independently predict these four hazards.

        hazards = {
            "flood": None,
            "landslide": None,
            "erosion": None,
            "cloudburst": None
        }

        # =====================================================
        # 4. CARRYING CAPACITY
        # =====================================================

        shelter_capacity = float(
            data["shelter_capacity"]
        )

        available_water = float(
            data["available_water"]
        )

        food_stock = float(
            data["food_stock"]
        )

        medical_capacity = float(
            data["medical_capacity"]
        )

        water_capacity = (
            available_water / 5
        )

        food_capacity = (
            food_stock / 2
        )

        medical_population_capacity = (
            medical_capacity * 10
        )

        safe_capacity = (

            0.40 * shelter_capacity

            + 0.25 * water_capacity

            + 0.20 * food_capacity

            + 0.15 * medical_population_capacity

        )

        safe_capacity = max(
            safe_capacity,
            100
        )

        capacity_ratio = (
            population / safe_capacity
        )

        if capacity_ratio <= 0.8:

            capacity_status = "SAFE"

        elif capacity_ratio <= 1.0:

            capacity_status = "STRESSED"

        else:

            capacity_status = "OVER_CAPACITY"

        # =====================================================
        # 5. RELOCATION ML
        # =====================================================

        relocation_features = [[

            float(data["population"]),
            float(data["rainfall"]),
            float(data["river_level"]),
            float(data["flood_history"]),
            float(data["building_damage"]),
            float(data["vulnerable_population"]),
            float(data["water_level"]),
            float(data["road_access"]),
            float(data["hospital_distance"]),
            float(data["shelter_capacity"]),
            capacity_ratio,

            float(data.get("latitude", 0)),
            float(data.get("longitude", 0))

        ]]

        relocation_prediction = (
            relocation_model
            .predict(relocation_features)[0]
        )

        relocation_prediction = str(
            relocation_prediction
        ).upper()

        relocation_probabilities = (
            relocation_model
            .predict_proba(
                relocation_features
            )[0]
        )

        relocation_classes = (
            relocation_model.classes_
        )

        relocation_probability_dict = {}

        for class_name, probability in zip(
            relocation_classes,
            relocation_probabilities
        ):

            relocation_probability_dict[
                str(class_name).upper()
            ] = round(
                float(probability),
                4
            )

        predicted_relocation_probability = (
            relocation_probability_dict.get(
                relocation_prediction,
                0
            )
        )

        # =====================================================
        # IMPORTANT:
        # MODEL CLASSES ARE HIGH / MEDIUM / LOW
        #
        # Do not silently replace MEDIUM with IMMEDIATE
        # merely because risk is CRITICAL.
        #
        # Temporary documented mapping:
        # =====================================================

        relocation_mapping = {

            "HIGH": "IMMEDIATE",

            "MEDIUM": "SHORT_TERM",

            "LOW": "MONITOR"

        }

        relocation_priority = relocation_mapping.get(
            relocation_prediction,
            "MONITOR"
        )

        # =====================================================
        # FINAL RESPONSE
        # =====================================================

        return jsonify({

            "success": True,

            "habitationId": str(
                habitation_id
            ),

            "name": habitation_name,

            "population": int(
                population
            ),

            # Current hazard risk
            "riskScore": round(
                risk_score,
                2
            ),

            "riskLevel": risk_level,

            # PS-191 vulnerability
            "vulnerabilityScore":
                vulnerability_score,

            "vulnerabilityCategory":
                vulnerability_category,

            # No fake hazard predictions
            "hazards": hazards,

            "historicalRisk": None,

            # Relocation
            "relocationPriority":
                relocation_priority,

            "lastAssessment":
                date.today().isoformat(),

            "details": {

                "riskPrediction":
                    risk_prediction,

                "riskProbability":
                    predicted_risk_probability,

                "riskProbabilities":
                    risk_probability_dict,

                "carryingCapacity": {

                    "status":
                        capacity_status,

                    "capacityRatio":
                        round(
                            capacity_ratio,
                            2
                        ),

                    "safeCapacity":
                        round(
                            safe_capacity,
                            2
                        ),

                    "modelUsed":
                        False

                },

                "relocation": {

                    "prediction":
                        relocation_prediction,

                    "priority":
                        relocation_priority,

                    "probability":
                        predicted_relocation_probability,

                    "probabilities":
                        relocation_probability_dict

                },

                "models": {

                    "habitationRisk":
                        habitation_risk_model
                        is not None,

                    "capacity":
                        capacity_model
                        is not None,

                    "relocation":
                        relocation_model
                        is not None

                }

            }

        })

    except ValueError:

        return jsonify({

            "success": False,

            "error":
                "All input values must be numeric"

        }), 400

    except Exception as e:

        print(
            "Habitation prediction error:",
            str(e)
        )

        return jsonify({

            "success": False,

            "error": str(e)

        }), 500

    try:

        data = request.get_json()


        if not data:

            return jsonify({

                "success": False,

                "error":
                    "Request body must contain JSON data"

            }), 400


        # =================================================
        # CHECK CORE MODELS
        # =================================================

        if habitation_risk_model is None:

            return jsonify({

                "success": False,

                "error":
                    "Habitation risk model is not loaded"

            }), 503


        if relocation_model is None:

            return jsonify({

                "success": False,

                "error":
                    "Relocation model is not loaded"

            }), 503


        # =================================================
        # REQUIRED ML INPUTS
        # =================================================

        required_fields = [

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

            "available_water",

            "food_stock",

            "medical_capacity"

        ]


        missing_fields = [

            field

            for field in required_fields

            if field not in data
            or data[field] is None
            or data[field] == ""

        ]


        if missing_fields:

            return jsonify({

                "success": False,

                "error":
                    "Required habitation ML inputs are missing",

                "missingFields":
                    missing_fields

            }), 400


        # =================================================
        # HABITATION INFORMATION
        # =================================================

        habitation_id = data.get(

            "habitationId",

            data.get(
                "village_code",
                "UNKNOWN"
            )

        )


        habitation_name = data.get(

            "name",

            data.get(
                "village_name",
                "Unknown Habitation"
            )

        )


        population = float(
            data["population"]
        )


        # =================================================
        # 1. HABITATION RISK
        # =================================================

        risk_features = [[

            float(data["population"]),

            float(data["rainfall"]),

            float(data["river_level"]),

            float(data["flood_history"]),

            float(data["building_damage"]),

            float(data["vulnerable_population"]),

            float(data["water_level"]),

            float(data["road_access"]),

            float(data["hospital_distance"])

        ]]


        # -------------------------------------------------
        # IMPORTANT
        # -------------------------------------------------
        # Your currently loaded habitation model has been
        # shown to expect 11 features.
        #
        # If it actually expects 11, latitude/longitude
        # are required by THAT trained model.
        #
        # We therefore check the trained model's expected
        # feature count instead of blindly sending data.
        # -------------------------------------------------

        expected_risk_features = getattr(

            habitation_risk_model,

            "n_features_in_",

            9

        )


        if expected_risk_features == 9:

            pass


        elif expected_risk_features == 11:

            if (
                "latitude" not in data
                or "longitude" not in data
            ):

                return jsonify({

                    "success": False,

                    "error":
                        "This loaded habitation risk model expects 11 features. latitude and longitude are required by the trained model.",

                    "expectedFeatures":
                        11,

                    "providedBaseFeatures":
                        9

                }), 400


            risk_features = [[

                float(data["population"]),

                float(data["rainfall"]),

                float(data["river_level"]),

                float(data["flood_history"]),

                float(data["building_damage"]),

                float(data["vulnerable_population"]),

                float(data["water_level"]),

                float(data["road_access"]),

                float(data["hospital_distance"]),

                float(data["latitude"]),

                float(data["longitude"])

            ]]


        else:

            return jsonify({

                "success": False,

                "error":
                    "Unsupported habitation risk model feature count",

                "modelExpectedFeatures":
                    expected_risk_features

            }), 500


        # =================================================
        # RISK PREDICTION
        # =================================================

        risk_prediction = (
            habitation_risk_model
            .predict(risk_features)[0]
        )


        risk_probability_dict = {}


        if hasattr(
            habitation_risk_model,
            "predict_proba"
        ):

            probabilities = (
                habitation_risk_model
                .predict_proba(
                    risk_features
                )[0]
            )


            classes = (
                habitation_risk_model
                .classes_
            )


            for class_name, probability in zip(

                classes,

                probabilities

            ):

                risk_probability_dict[
                    str(class_name)
                ] = round(

                    float(probability),

                    4

                )


        predicted_risk_probability = (
            risk_probability_dict.get(

                str(risk_prediction),

                0

            )
        )


        # =================================================
        # RISK SCORE
        # =================================================

        risk_score_map = {

            "LOW": 25,

            "MEDIUM": 50,

            "HIGH": 75,

            "CRITICAL": 95

        }


        risk_prediction_text = (
            str(
                risk_prediction
            ).upper()
        )


        risk_score = risk_score_map.get(

            risk_prediction_text,

            0

        )


        risk_score = clamp_score(
            risk_score
        )


        risk_level = get_risk_level(
            risk_score
        )


        # =================================================
        # VULNERABILITY
        # =================================================
        #
        # IMPORTANT:
        # Vulnerability is NOT the same as current hazard
        # risk.
        #
        # If the request contains vulnerabilityScore,
        # use it.
        #
        # Otherwise return None.
        # =================================================

        vulnerability_score = data.get(
            "vulnerabilityScore"
        )


        if vulnerability_score is not None:

            vulnerability_score = clamp_score(
                vulnerability_score
            )


        # =================================================
        # HAZARDS
        # =================================================
        #
        # We currently have one overall habitation-risk
        # model, not four independent hazard models.
        #
        # Therefore DO NOT claim these are independent
        # predictions.
        # =================================================

        hazards = {

            "flood":
                round(risk_score, 2),

            "landslide":
                round(risk_score, 2),

            "erosion":
                round(risk_score, 2),

            "cloudburst":
                round(risk_score, 2)

        }


        # =================================================
        # 2. CARRYING CAPACITY
        # =================================================
        #
        # Deterministic resource-capacity calculation.
        # This is based on the current PS-191 application
        # logic.
        # =================================================

        shelter_capacity = float(
            data["shelter_capacity"]
        )


        available_water = float(
            data["available_water"]
        )


        food_stock = float(
            data["food_stock"]
        )


        medical_capacity = float(
            data["medical_capacity"]
        )


        water_capacity = (
            available_water / 5
        )


        food_capacity = (
            food_stock / 2
        )


        medical_population_capacity = (
            medical_capacity * 10
        )


        safe_capacity = (

            0.40 *
            shelter_capacity

            +

            0.25 *
            water_capacity

            +

            0.20 *
            food_capacity

            +

            0.15 *
            medical_population_capacity

        )


        safe_capacity = max(
            safe_capacity,
            100
        )


        capacity_ratio = (

            population /
            safe_capacity

        )


        if capacity_ratio <= 0.8:

            capacity_status = "SAFE"

        elif capacity_ratio <= 1.0:

            capacity_status = "STRESSED"

        else:

            capacity_status = "OVER_CAPACITY"


        # =================================================
        # 3. RELOCATION
        # =================================================

        relocation_features = [[

            float(data["population"]),

            float(data["rainfall"]),

            float(data["river_level"]),

            float(data["flood_history"]),

            float(data["building_damage"]),

            float(data["vulnerable_population"]),

            float(data["water_level"]),

            float(data["road_access"]),

            float(data["hospital_distance"]),

            float(data["shelter_capacity"]),

            float(capacity_ratio)

        ]]


        expected_relocation_features = getattr(

            relocation_model,

            "n_features_in_",

            11

        )


        if expected_relocation_features == 11:

            pass


        elif expected_relocation_features == 13:

            if (
                "latitude" not in data
                or "longitude" not in data
            ):

                return jsonify({

                    "success": False,

                    "error":
                        "This loaded relocation model expects 13 features. latitude and longitude are required by the trained model.",

                    "expectedFeatures":
                        13

                }), 400


            relocation_features = [[

                float(data["population"]),

                float(data["rainfall"]),

                float(data["river_level"]),

                float(data["flood_history"]),

                float(data["building_damage"]),

                float(data["vulnerable_population"]),

                float(data["water_level"]),

                float(data["road_access"]),

                float(data["hospital_distance"]),

                float(data["shelter_capacity"]),

                float(capacity_ratio),

                float(data["latitude"]),

                float(data["longitude"])

            ]]


        else:

            return jsonify({

                "success": False,

                "error":
                    "Unsupported relocation model feature count",

                "modelExpectedFeatures":
                    expected_relocation_features

            }), 500


        relocation_prediction = (
            relocation_model
            .predict(
                relocation_features
            )[0]
        )


        relocation_probability_dict = {}


        if hasattr(
            relocation_model,
            "predict_proba"
        ):

            probabilities = (
                relocation_model
                .predict_proba(
                    relocation_features
                )[0]
            )


            classes = (
                relocation_model
                .classes_
            )


            for class_name, probability in zip(

                classes,

                probabilities

            ):

                relocation_probability_dict[
                    str(class_name)
                ] = round(

                    float(probability),

                    4

                )


        relocation_probability = (

            max(
                relocation_probability_dict.values()
            )

            if relocation_probability_dict

            else 0

        )


        relocation_priority = str(

            relocation_prediction

        ).upper()


        valid_priorities = [

            "IMMEDIATE",

            "SHORT_TERM",

            "MEDIUM_TERM",

            "MONITOR"

        ]


        if relocation_priority not in valid_priorities:

            relocation_priority = (
                get_relocation_priority(
                    risk_score
                )
            )


        # =================================================
        # FINAL RESPONSE
        # =================================================

        return jsonify({

            "success": True,

            "habitationId":
                str(habitation_id),

            "name":
                habitation_name,

            "population":
                int(population),


            # -----------------------------
            # RISK
            # -----------------------------

            "riskScore":
                round(risk_score, 2),

            "riskLevel":
                risk_level,

            "vulnerabilityScore":
                (
                    round(
                        vulnerability_score,
                        2
                    )

                    if vulnerability_score
                    is not None

                    else None
                ),


            # -----------------------------
            # HAZARDS
            # -----------------------------

            "hazards":
                hazards,


            # -----------------------------
            # HISTORICAL DATA
            # -----------------------------

            "historicalRisk":
                None,


            # -----------------------------
            # RELOCATION
            # -----------------------------

            "relocationPriority":
                relocation_priority,


            # -----------------------------
            # DATE
            # -----------------------------

            "lastAssessment":
                date.today().isoformat(),


            # -----------------------------
            # DETAILS
            # -----------------------------

            "details": {

                "riskPrediction":
                    str(risk_prediction),

                "riskProbability":
                    round(
                        float(
                            predicted_risk_probability
                        ),
                        4
                    ),

                "riskProbabilities":
                    risk_probability_dict,


                "carryingCapacity": {

                    "status":
                        capacity_status,

                    "capacityRatio":
                        round(
                            capacity_ratio,
                            2
                        ),

                    "safeCapacity":
                        round(
                            safe_capacity,
                            2
                        ),

                    "modelUsed":
                        False

                },


                "relocation": {

                    "prediction":
                        str(
                            relocation_prediction
                        ),

                    "priority":
                        relocation_priority,

                    "probability":
                        round(
                            float(
                                relocation_probability
                            ),
                            4
                        ),

                    "probabilities":
                        relocation_probability_dict

                },


                "models": {

                    "habitationRisk":
                        True,

                    "capacity":
                        (
                            capacity_model
                            is not None
                        ),

                    "relocation":
                        True

                }

            }

        })


    except ValueError:

        return jsonify({

            "success": False,

            "error":
                "All habitation input values must be numeric"

        }), 400


    except Exception as e:

        print(
            "Habitation prediction error:",
            e
        )

        return jsonify({

            "success": False,

            "error":
                str(e)

        }), 500


# =========================================================
# RUN SERVER
# =========================================================

if __name__ == "__main__":

    app.run(

        host="0.0.0.0",

        port=5001,

        debug=True

    )