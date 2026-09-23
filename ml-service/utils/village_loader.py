
import json
import os

from pyproj import Transformer
from shapely.geometry import shape


# ------------------------------------------------------------
# CRS
# ------------------------------------------------------------

SOURCE_CRS = "EPSG:7755"
TARGET_CRS = "EPSG:4326"

transformer = Transformer.from_crs(
    SOURCE_CRS,
    TARGET_CRS,
    always_xy=True
)


# ------------------------------------------------------------
# FILE
# ------------------------------------------------------------

BASE_DIR = os.path.dirname(
    os.path.dirname(os.path.abspath(__file__))
)

VILLAGE_DATA_PATH = os.path.join(
    BASE_DIR,
    "data",
    "processed",
    "ps191_final_village_dataset.geojson"
)


# ------------------------------------------------------------
# COORDINATE CONVERSION
# ------------------------------------------------------------

def convert_geometry_to_wgs84(geometry):

    if not geometry:
        return None

    try:

        geom = shape(geometry)

        # Transform every coordinate from EPSG:7755
        # to EPSG:4326.
        def transform_coords(coords):

            return [
                list(
                    transformer.transform(
                        x,
                        y
                    )
                )
                for x, y in coords
            ]

        geom_type = geom.geom_type

        if geom_type == "Polygon":

            coordinates = [
                transform_coords(ring.coords)
                for ring in geom.geoms
            ]

            return {
                "type": "Polygon",
                "coordinates": coordinates
            }

        elif geom_type == "MultiPolygon":

            polygons = []

            for polygon in geom.geoms:

                rings = [
                    transform_coords(ring.coords)
                    for ring in polygon.geoms
                ]

                polygons.append(rings)

            return {
                "type": "MultiPolygon",
                "coordinates": polygons
            }

        return None

    except Exception as error:

        print(
            "Geometry conversion error:",
            error
        )

        return None


# ------------------------------------------------------------
# CENTROID
# ------------------------------------------------------------

def get_centroid_lat_lng(geometry):

    if not geometry:
        return None

    try:

        geom = shape(geometry)

        centroid = geom.centroid

        longitude, latitude = transformer.transform(
            centroid.x,
            centroid.y
        )

        return {
            "latitude": float(latitude),
            "longitude": float(longitude)
        }

    except Exception as error:

        print(
            "Centroid conversion error:",
            error
        )

        return None


# ------------------------------------------------------------
# LOAD DATASET
# ------------------------------------------------------------

def load_village_dataset():

    if not os.path.exists(VILLAGE_DATA_PATH):

        raise FileNotFoundError(
            f"Village dataset not found: "
            f"{VILLAGE_DATA_PATH}"
        )

    with open(
        VILLAGE_DATA_PATH,
        "r",
        encoding="utf-8"
    ) as file:

        data = json.load(file)

    features = data.get(
        "features",
        []
    )

    villages = []

    for feature in features:

        properties = (
            feature.get(
                "properties",
                {}
            )
        )

        geometry = feature.get(
            "geometry"
        )

        village_code = (
            properties.get("village_code")
            or properties.get("vlcode")
        )

        village_name = (
            properties.get("village_name")
            or properties.get("village")
        )

        if not village_code:
            continue

        centroid = get_centroid_lat_lng(
            geometry
        )

        villages.append({

            "village_code":
                str(village_code),

            "village_name":
                village_name
                or "Unknown Village",

            "population":
                float(
                    properties.get(
                        "population",
                        0
                    ) or 0
                ),

            "households":
                float(
                    properties.get(
                        "households",
                        0
                    ) or 0
                ),

            "children_0_6":
                float(
                    properties.get(
                        "children_0_6",
                        0
                    ) or 0
                ),

            "sc_population":
                float(
                    properties.get(
                        "sc_population",
                        0
                    ) or 0
                ),

            "st_population":
                float(
                    properties.get(
                        "st_population",
                        0
                    ) or 0
                ),

            "vulnerability_score_100":
                properties.get(
                    "vulnerability_score_100"
                ),

            "vulnerability_category":
                properties.get(
                    "vulnerability_category"
                ),

            "road_access":
                calculate_road_access(
                    properties
                ),

            "hospital_distance":
                calculate_hospital_distance(
                    properties
                ),

            "water_availability":
                calculate_water_availability(
                    properties
                ),

            "location":
                (
                    {
                        "type": "Point",
                        "coordinates": [
                            centroid["longitude"],
                            centroid["latitude"]
                        ]
                    }
                    if centroid
                    else None
                ),

            "source_properties":
                properties
        })

    return villages


# ------------------------------------------------------------
# ROAD ACCESS
# ------------------------------------------------------------

def calculate_road_access(properties):

    values = [
        properties.get("national_highway"),
        properties.get("state_highway"),
        properties.get("major_district_road"),
        properties.get("black_topped_road"),
        properties.get("all_weather_road"),
        properties.get("footpath")
    ]

    values = [
        float(v)
        for v in values
        if v is not None
    ]

    if not values:
        return None

    return min(
        100,
        sum(values) / len(values) * 100
    )


# ------------------------------------------------------------
# HOSPITAL DISTANCE
# ------------------------------------------------------------

def calculate_hospital_distance(properties):

    distances = [
        properties.get(
            "subdistrict_hq_distance_km"
        ),
        properties.get(
            "district_hq_distance_km"
        ),
        properties.get(
            "nearest_town_distance_km"
        )
    ]

    distances = [
        float(v)
        for v in distances
        if v is not None and float(v) > 0
    ]

    if not distances:
        return None

    return min(distances)


# ------------------------------------------------------------
# WATER AVAILABILITY
# ------------------------------------------------------------

def calculate_water_availability(properties):

    water_fields = [
        "treated_tap_water",
        "hand_pump",
        "tube_well",
        "river_canal",
        "pond_lake"
    ]

    available = 0

    for field in water_fields:

        value = properties.get(
            field
        )

        if value is not None:
            try:
                available += float(value)
            except:
                pass

    return available
