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
# RISK RESPONSE HELPERS
# =========================================================

def clamp_score(value):
    """
    Keeps a score between 0 and 100.
    """
    return max(0, min(100, float(value)))


def get_risk_level(risk_score):
    """
    Converts numerical risk score into backend risk level.
    """

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
    Converts risk score into relocation priority.
    """

    if risk_score >= 85:
        return "IMMEDIATE"

    elif risk_score >= 65:
        return "SHORT_TERM"

    elif risk_score >= 40:
        return "MEDIUM_TERM"

    else:
        return "MONITOR"


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


# =========================================================
# LOAD VILLAGE DATASET
# =========================================================

try:

    village_df = pd.read_csv(VILLAGE_DATA_PATH)

    print("Final village dataset loaded successfully")
    print("Total villages:", len(village_df))

except Exception as e:

    print("Error loading village dataset:")
    print(e)

    village_df = pd.DataFrame()


# =========================================================
# MODEL PATHS
# =========================================================

MODEL_PATHS = {

    "disaster":
        MODEL_DIR / "disaster_model.pkl",

    "sos":
        MODEL_DIR / "sos_model.pkl",

    "habitation":
        MODEL_DIR / "habitation_risk_model.pkl",

    "capacity":
        MODEL_DIR / "capacity_model.pkl",

    "relocation":
        MODEL_DIR / "relocation_model.pkl"

}


# =========================================================
# LAZY MODEL CACHE
# =========================================================
#
# Models are NOT loaded when the server starts.
#
# They are loaded only when an endpoint actually needs them.
#
# Example:
#
# /predict/sos
#       ↓
# get_model("sos")
#       ↓
# Load sos_model.pkl
#       ↓
# Store it in _models
#
# Future SOS requests reuse the already loaded model.
# =========================================================

_models = {}


# =========================================================
# LAZY MODEL LOADER
# =========================================================

def get_model(model_name):

    # -----------------------------------------------------
    # If model is already loaded, return cached model
    # -----------------------------------------------------

    if model_name in _models:

        return _models[model_name]


    # -----------------------------------------------------
    # Check whether model name is valid
    # -----------------------------------------------------

    if model_name not in MODEL_PATHS:

        raise ValueError(
            f"Unknown model: {model_name}"
        )


    model_path = MODEL_PATHS[model_name]


    # -----------------------------------------------------
    # Check whether model file exists
    # -----------------------------------------------------

    if not model_path.exists():

        raise FileNotFoundError(
            f"{model_name} not found: {model_path}"
        )


    # -----------------------------------------------------
    # Load model only when required
    # -----------------------------------------------------

    print(
        f"Loading {model_name} model..."
    )

    model = joblib.load(model_path)


    # -----------------------------------------------------
    # Store model in memory for future requests
    # -----------------------------------------------------

    _models[model_name] = model


    print(
        f"{model_name} model loaded successfully"
    )


    return model


# =========================================================
# MODEL STATUS HELPERS
# =========================================================

def get_model_status(model_name):

    model_path = MODEL_PATHS[model_name]

    return {

        "available":
            model_path.exists(),

        "loaded":
            model_name in _models

    }


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

        "models": {

            "disaster_risk":
                get_model_status("disaster"),

            "sos_severity":
                get_model_status("sos"),

            "habitation_risk":
                get_model_status("habitation"),

            "carrying_capacity":
                get_model_status("capacity"),

            "relocation_priority":
                get_model_status("relocation")

        },

        "endpoints": [

            "/health",

            "/predict/disaster",

            "/predict/sos",

            "/api/villages",

            "/api/villages/search",

            "/predict/habitation"

        ]

    })


# =========================================================
# HEALTH CHECK
# =========================================================

@app.route("/health", methods=["GET"])
def health():

    return jsonify({

        "status": "healthy",

        "models": {

            "disaster_model":
                get_model_status("disaster"),

            "sos_model":
                get_model_status("sos"),

            "habitation_risk_model":
                get_model_status("habitation"),

            "capacity_model":
                get_model_status("capacity"),

            "relocation_model":
                get_model_status("relocation")

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


        required_fields = [

            "rainfall",

            "river_level",

            "humidity",

            "temperature",

            "previous_floods"

        ]


        # -------------------------------------------------
        # Check required fields
        # -------------------------------------------------

        for field in required_fields:

            if field not in data:

                return jsonify({

                    "success": False,

                    "error":
                        f"Missing field: {field}"

                }), 400


        # -------------------------------------------------
        # LAZY LOAD DISASTER MODEL
        # -------------------------------------------------

        disaster_model = get_model("disaster")


        # -------------------------------------------------
        # Create feature vector
        # -------------------------------------------------

        features = [[

            float(data["rainfall"]),

            float(data["river_level"]),

            float(data["humidity"]),

            float(data["temperature"]),

            float(data["previous_floods"])

        ]]


        # -------------------------------------------------
        # Prediction
        # -------------------------------------------------

        prediction = (

            disaster_model
            .predict(features)[0]

        )


        # -------------------------------------------------
        # Probability of every class
        # -------------------------------------------------

        probabilities = (

            disaster_model
            .predict_proba(features)[0]

        )


        classes = disaster_model.classes_


        probability_dict = {}


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


        # -------------------------------------------------
        # Probability of predicted class
        # -------------------------------------------------

        predicted_probability = (

            probability_dict[
                str(prediction)
            ]

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

            "error": str(e)

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


        # -------------------------------------------------
        # Check fields
        # -------------------------------------------------

        for field in required_fields:

            if field not in data:

                return jsonify({

                    "success": False,

                    "error":
                        f"Missing field: {field}"

                }), 400


        # -------------------------------------------------
        # LAZY LOAD SOS MODEL
        # -------------------------------------------------

        sos_model = get_model("sos")


        # -------------------------------------------------
        # Create feature vector
        # -------------------------------------------------

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


        # -------------------------------------------------
        # Prediction
        # -------------------------------------------------

        prediction = (

            sos_model
            .predict(features)[0]

        )


        # -------------------------------------------------
        # Probability
        # -------------------------------------------------

        probabilities = (

            sos_model
            .predict_proba(features)[0]

        )


        classes = sos_model.classes_


        probability_dict = {}


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

            probability_dict[
                str(prediction)
            ]

        )


        # -------------------------------------------------
        # Severity score for UI
        # -------------------------------------------------

        severity_scores = {

            "LOW": 25,

            "MEDIUM": 50,

            "HIGH": 75,

            "CRITICAL": 95

        }


        severity_score = severity_scores.get(

            str(prediction).upper(),

            50

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


    except Exception as e:

        return jsonify({

            "success": False,

            "error": str(e)

        }), 500


# =========================================================
# GET ALL VILLAGES
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

            }), 500


        data = village_df[

            [

                "village_code",

                "village_name",

                "population",

                "vulnerability_score_100",

                "vulnerability_category"

            ]

        ].copy()


        # -------------------------------------------------
        # Convert NaN values to None
        # -------------------------------------------------

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

            "error": str(e)

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

            }), 500


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


        result = village_df[

            village_df["village_name"]

            .astype(str)

            .str.contains(

                query,

                case=False,

                na=False

            )

        ]


        result = result[

            [

                "village_code",

                "village_name",

                "population",

                "vulnerability_score_100",

                "vulnerability_category"

            ]

        ]


        result = result.where(

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

            "error": str(e)

        }), 500


# =========================================================
# PS-191 HABITATION ANALYSIS
# =========================================================

@app.route(
    "/predict/habitation",
    methods=["POST"]
)
def predict_habitation():

    try:

        data = request.get_json()


        if not data:

            return jsonify({

                "success": False,

                "error":
                    "Request body must contain JSON data"

            }), 400


        # =================================================
        # REQUIRED FIELDS
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


        # =================================================
        # CHECK REQUIRED FIELDS
        # =================================================

        for field in required_fields:

            if field not in data:

                return jsonify({

                    "success": False,

                    "error":
                        f"Missing field: {field}"

                }), 400


        # =================================================
        # LAZY LOAD PS-191 MODELS
        # =================================================

        habitation_risk_model = get_model(
            "habitation"
        )

        capacity_model = get_model(
            "capacity"
        )

        relocation_model = get_model(
            "relocation"
        )


        # =================================================
        # 1. HABITATION HAZARD RISK
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


        risk_prediction = (

            habitation_risk_model

            .predict(risk_features)[0]

        )


        risk_probabilities = (

            habitation_risk_model

            .predict_proba(risk_features)[0]

        )


        risk_classes = (

            habitation_risk_model.classes_

        )


        risk_probability_dict = {}


        for class_name, probability in zip(

            risk_classes,

            risk_probabilities

        ):

            risk_probability_dict[

                str(class_name)

            ] = round(

                float(probability),

                4

            )


        predicted_risk_probability = (

            risk_probability_dict[

                str(risk_prediction)

            ]

        )


        # =================================================
        # 2. CONVERT RISK TO SCORE
        # =================================================

        risk_score_map = {

            "LOW": 15,

            "MEDIUM": 40,

            "HIGH": 70,

            "CRITICAL": 95

        }


        risk_prediction_text = (

            str(risk_prediction)

            .upper()

        )


        risk_score = risk_score_map.get(

            risk_prediction_text,

            0

        )


        risk_score = clamp_score(

            risk_score

        )


        # =================================================
        # 3. RISK ZONE
        # =================================================

        zone = get_risk_level(

            risk_score

        )


        vulnerability_score = risk_score


        # =================================================
        # 4. HAZARD SCORES
        # =================================================

        # Currently using overall risk score for each
        # hazard.
        #
        # Replace these later if separate hazard models
        # become available.

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
        # 5. CARRYING CAPACITY
        # =================================================

        capacity_features = [[

            float(data["population"]),

            float(data["shelter_capacity"]),

            float(data["available_water"]),

            float(data["food_stock"]),

            float(data["medical_capacity"]),

            float(data["road_access"])

        ]]


        capacity_prediction = (

            capacity_model

            .predict(capacity_features)[0]

        )


        capacity_probabilities = (

            capacity_model

            .predict_proba(

                capacity_features

            )[0]

        )


        capacity_probability = max(

            capacity_probabilities

        )


        # =================================================
        # 6. CAPACITY RATIO
        # =================================================

        population = float(

            data["population"]

        )


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


        # Calculate capacity supported by each resource

        water_capacity = (

            available_water / 5

        )


        food_capacity = (

            food_stock / 2

        )


        medical_population_capacity = (

            medical_capacity * 10

        )


        # Calculate overall safe capacity

        safe_capacity = (

            0.40 * shelter_capacity

            + 0.25 * water_capacity

            + 0.20 * food_capacity

            + 0.15 * medical_population_capacity

        )


        # Minimum safe capacity

        safe_capacity = max(

            safe_capacity,

            100

        )


        # Population compared with safe capacity

        capacity_ratio = (

            population / safe_capacity

        )


        # =================================================
        # 7. HABITATION INFORMATION
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


        # =================================================
        # 8. RELOCATION PRIORITY
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

            capacity_ratio

        ]]


        relocation_prediction = (

            relocation_model

            .predict(

                relocation_features

            )[0]

        )


        relocation_probabilities = (

            relocation_model

            .predict_proba(

                relocation_features

            )[0]

        )


        relocation_probability = max(

            relocation_probabilities

        )


        # =================================================
        # 9. FINAL RELOCATION PRIORITY
        # =================================================

        relocation_priority = (

            str(

                relocation_prediction

            ).upper()

        )


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
        # 10. FINAL BACKEND-COMPATIBLE RESPONSE
        # =================================================

        return jsonify({

            "success": True,


            # -------------------------------------------------
            # Habitation information
            # -------------------------------------------------

            "habitationId":
                str(habitation_id),

            "name":
                habitation_name,

            "population":
                int(population),


            # -------------------------------------------------
            # Main risk information
            # -------------------------------------------------

            "riskScore":
                round(

                    risk_score,

                    2

                ),

            "riskLevel":
                zone,

            "vulnerabilityScore":
                round(

                    vulnerability_score,

                    2

                ),


            # -------------------------------------------------
            # Individual hazard scores
            # -------------------------------------------------

            "hazards":
                hazards,


            # -------------------------------------------------
            # Historical data
            # -------------------------------------------------

            "historicalRisk": [],


            # -------------------------------------------------
            # Relocation information
            # -------------------------------------------------

            "relocationPriority":
                relocation_priority,


            # -------------------------------------------------
            # Assessment date
            # -------------------------------------------------

            "lastAssessment":
                date.today().isoformat(),


            # -------------------------------------------------
            # Additional details
            # -------------------------------------------------

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
                        str(

                            capacity_prediction

                        ),

                    "capacityRatio":
                        round(

                            capacity_ratio,

                            2

                        ),

                    "probability":
                        round(

                            float(

                                capacity_probability

                            ),

                            4

                        )

                },


                "relocation": {

                    "priority":
                        relocation_priority,

                    "probability":
                        round(

                            float(

                                relocation_probability

                            ),

                            4

                        )

                }

            }

        })


    except ValueError as e:

        print(
            "VALUE ERROR IN /predict/habitation:"
        )

        print(repr(e))


        return jsonify({

            "success": False,

            "error": str(e)

        }), 400


    except Exception as e:

        return jsonify({

            "success": False,

            "error": str(e)

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