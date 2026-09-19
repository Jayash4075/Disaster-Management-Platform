"""
Earthquake risk inference engine (V4).

Give it a latitude/longitude, get back a risk probability + risk class.
This is the ONLY function a backend service needs to call:

    from earthquake_risk_inference import predict_location
    result = predict_location(28.6139, 77.2090)
    # -> {"latitude": 28.6139, "longitude": 77.2090,
    #     "risk_probability": 0.07, "risk_class": 0}

--------------------------------------------------------------------------
WHAT THIS DOES AND DOES NOT DO
--------------------------------------------------------------------------
This model estimates spatial earthquake RISK from historical earthquake
activity and proximity to mapped active faults. It does NOT predict when
an earthquake will occur, and a "high risk" classification is not a
forecast of an imminent event.

--------------------------------------------------------------------------
FEATURE DEFINITIONS -- must exactly match notebooks/03_earthquake_features.ipynb
--------------------------------------------------------------------------
- "Feature earthquakes" = all events in the earthquake catalog before
  2018-01-01 (the same cutoff used for every V4 feature; using anything
  after this date to build features would leak information from the
  labeling period).
- eq_count_50km / eq_count_100km: count of feature earthquakes within
  50km / 100km great-circle distance (haversine) of the query point.
- max_magnitude_100km / avg_magnitude_100km / avg_depth_100km /
  shallow_eq_count_100km (depth <= 30km) / seismic_activity_100km
  (log10(1 + sum(10**(1.5*mag)))): all computed over feature earthquakes
  within 100km. All are 0 if there are none within 100km.
- nearest_eq_km: haversine distance to the single nearest feature
  earthquake, with NO radius cutoff (searches the entire catalog).
- eq_count_early/middle/recent_100km: counts within 100km during three
  fixed 6-year windows -- [2000,2006), [2006,2012), [2012,2018) --
  cut from the same feature-earthquake catalog.
- distance_to_fault_km: distance from the query point to the nearest
  GEM active-fault line. Computed using the EXACT same method as training
  (notebooks/03_earthquake_features.ipynb cells 57-61):
    1. Load gem_active_faults.geojson via geopandas (native CRS EPSG:4979,
       treated as EPSG:4326 for 2D operations).
    2. Project fault GeoDataFrame to EPSG:7755 (WGS 84 / India NSF LCC).
    3. Project query point(s) to EPSG:7755.
    4. Run geopandas.sjoin_nearest with distance_col="distance_to_fault_m".
    5. Take .min() per point (handles duplicate equidistant fault matches).
    6. Divide by 1000 to get kilometres.
  The projected faults GeoDataFrame is cached in the model instance and
  built only ONCE at initialisation, not per-request.

--------------------------------------------------------------------------
CRITICAL: feature order
--------------------------------------------------------------------------
Features must be assembled in the exact order stored in the model
package's "features" list (features_v4). This module always reads that
order from the loaded package rather than hardcoding it, so it can never
drift out of sync with the saved model.
"""

from pathlib import Path

import geopandas as gpd
import joblib
import numpy as np
import pandas as pd
from sklearn.neighbors import BallTree

# EPSG used for all fault-distance computation at training time
# (WGS 84 / India NSF LCC -- metric, India-specific projected CRS).
_FAULT_CRS = "EPSG:7755"

EARTH_RADIUS_KM = 6371.0

# Fixed cutoffs -- must match notebooks/03_earthquake_features.ipynb exactly.
FEATURE_CUTOFF = "2018-01-01"
PERIODS = {
    "early": ("2000-01-01", "2006-01-01"),
    "middle": ("2006-01-01", "2012-01-01"),
    "recent": ("2012-01-01", "2018-01-01"),
}


def _validate_coordinates(latitude, longitude):
    """Coerce to float and check basic sanity. Raises ValueError with a
    message that's safe to surface directly to an API caller."""
    try:
        latitude = float(latitude)
        longitude = float(longitude)
    except (TypeError, ValueError):
        raise ValueError("latitude and longitude must be numbers")
    if not (-90.0 <= latitude <= 90.0):
        raise ValueError(f"latitude must be between -90 and 90, got {latitude}")
    if not (-180.0 <= longitude <= 180.0):
        raise ValueError(f"longitude must be between -180 and 180, got {longitude}")
    return latitude, longitude


def _haversine(lat1, lon1, lat2, lon2):
    lat1, lon1, lat2, lon2 = map(np.radians, [lat1, lon1, lat2, lon2])
    dlat = lat2 - lat1
    dlon = lon2 - lon1
    a = np.sin(dlat / 2) ** 2 + np.cos(lat1) * np.cos(lat2) * np.sin(dlon / 2) ** 2
    return 2 * EARTH_RADIUS_KM * np.arcsin(np.sqrt(a))


def _load_faults_projected(geojson_path):
    """Load the GEM active-fault GeoJSON and project to EPSG:7755.

    Replicates notebook 03 cells 57-58 exactly:
        faults = gpd.read_file("../data/raw/gem_active_faults.geojson")
        faults_m = faults.to_crs("EPSG:7755")

    The gem_active_faults.geojson native CRS is EPSG:4979 (WGS 84 3D),
    which geopandas treats as equivalent to EPSG:4326 for 2-D projection.

    Returns the projected GeoDataFrame (faults_m). Only the geometry
    column is used downstream but the full GDF is kept so sjoin_nearest
    can operate directly on it.
    """
    faults = gpd.read_file(geojson_path)
    faults_m = faults.to_crs(_FAULT_CRS)
    return faults_m


def _distance_to_fault_km(lat, lon, faults_m):
    """Compute distance_to_fault_km for a single (lat, lon) query using
    the EXACT same geopandas + EPSG:7755 + sjoin_nearest pipeline that
    was used during training (notebook 03 cells 59-61).

    Parameters
    ----------
    lat, lon : float
        WGS-84 coordinates of the query point.
    faults_m : GeoDataFrame
        Already-projected fault GeoDataFrame (EPSG:7755); built once
        at model initialisation and passed in here for reuse.

    Returns
    -------
    float
        Distance in kilometres to the nearest active fault.
    """
    # Build a single-row GeoDataFrame for the query point (EPSG:4326).
    gdf = gpd.GeoDataFrame(
        {"latitude": [lat], "longitude": [lon]},
        geometry=gpd.points_from_xy([lon], [lat]),
        crs="EPSG:4326",
    )
    # Project to the training-time CRS (EPSG:7755) -- mirrors cell 59.
    gdf_m = gdf.to_crs(_FAULT_CRS).reset_index()

    # Nearest-fault join with distance in metres -- mirrors cell 61.
    nearest = gpd.sjoin_nearest(
        gdf_m,
        faults_m[["geometry"]],
        how="left",
        distance_col="distance_to_fault_m",
    )

    # .groupby().min() per original index handles equidistant duplicates,
    # exactly as the training notebook does.
    dist_m = nearest.groupby("index")["distance_to_fault_m"].min().iloc[0]
    return float(dist_m / 1000.0)


class EarthquakeRiskModel:
    """
    Loads the saved V4 model package plus the earthquake catalog and
    fault map once, and reuses them across many predict_location() calls
    (BallTrees and fault segments are built once, not per-request).
    """

    def __init__(self, model_path, earthquakes_csv_path, faults_geojson_path):
        package = joblib.load(model_path)
        self.model = package["model"]
        self.features = package["features"]
        self.threshold = package["threshold"]
        self.version = package.get("version", "v4")

        # earthquakes.csv contains a small number of UTF-8 multi-byte characters
        # (curly quotes/diacritics in a few "place" values, e.g. "Yang'
        # Qal'ah, Afghanistan"). The training notebooks call pd.read_csv()
        # with no encoding argument, which only works when the machine's
        # locale default happens to be UTF-8 -- on a Windows machine
        # defaulting to cp1252 ("charmap"), those bytes aren't valid and
        # pandas raises UnicodeDecodeError. Pinning encoding="utf-8"
        # explicitly makes this deterministic across platforms; it does not
        # change which rows/columns are read or any feature/label values.
        earthquakes = pd.read_csv(earthquakes_csv_path, encoding="utf-8")
        earthquakes["time"] = pd.to_datetime(earthquakes["time"])
        self.feature_eq = earthquakes[earthquakes["time"] < FEATURE_CUTOFF].copy().reset_index(drop=True)

        eq_coords = np.radians(self.feature_eq[["latitude", "longitude"]].values)
        self.eq_tree = BallTree(eq_coords, metric="haversine")

        self.period_trees = {}
        for name, (start, end) in PERIODS.items():
            p_eq = self.feature_eq[(self.feature_eq["time"] >= start) & (self.feature_eq["time"] < end)]
            coords = np.radians(p_eq[["latitude", "longitude"]].values)
            self.period_trees[name] = BallTree(coords, metric="haversine")

        # Load and project fault geometry ONCE -- reused for every prediction.
        # Mirrors notebook 03 cells 57-58: read_file -> to_crs("EPSG:7755").
        self.faults_m = _load_faults_projected(faults_geojson_path)

    def compute_features(self, lat, lon):
        dists = _haversine(lat, lon, self.feature_eq["latitude"].values, self.feature_eq["longitude"].values)
        within_50 = dists <= 50
        within_100 = dists <= 100

        eq_count_50km = int(within_50.sum())
        eq_count_100km = int(within_100.sum())

        if eq_count_100km == 0:
            max_magnitude_100km = 0.0
            avg_magnitude_100km = 0.0
            avg_depth_100km = 0.0
            shallow_eq_count_100km = 0
            seismic_activity_100km = 0.0
        else:
            nearby = self.feature_eq[within_100]
            max_magnitude_100km = float(nearby["mag"].max())
            avg_magnitude_100km = float(nearby["mag"].mean())
            avg_depth_100km = float(nearby["depth"].mean())
            shallow_eq_count_100km = int((nearby["depth"].values <= 30).sum())
            seismic_activity_100km = float(np.log10(1 + np.sum(10 ** (1.5 * nearby["mag"].values))))

        nearest_eq_km = float(dists.min())

        qc = np.radians([[lat, lon]])
        period_counts = {
            name: int(len(tree.query_radius(qc, r=100 / EARTH_RADIUS_KM)[0]))
            for name, tree in self.period_trees.items()
        }

        # Exact training-time calculation: geopandas + EPSG:7755 + sjoin_nearest.
        distance_to_fault_km = _distance_to_fault_km(lat, lon, self.faults_m)

        return {
            "eq_count_50km": eq_count_50km,
            "eq_count_100km": eq_count_100km,
            "max_magnitude_100km": max_magnitude_100km,
            "avg_magnitude_100km": avg_magnitude_100km,
            "nearest_eq_km": nearest_eq_km,
            "avg_depth_100km": avg_depth_100km,
            "shallow_eq_count_100km": shallow_eq_count_100km,
            "seismic_activity_100km": seismic_activity_100km,
            "eq_count_early_100km": period_counts["early"],
            "eq_count_middle_100km": period_counts["middle"],
            "eq_count_recent_100km": period_counts["recent"],
            "distance_to_fault_km": distance_to_fault_km,
        }

    def predict_location(self, latitude, longitude):
        latitude, longitude = _validate_coordinates(latitude, longitude)
        feats = self.compute_features(latitude, longitude)
        # Exact training order, as a named DataFrame (avoids sklearn's
        # "no feature names" warning and matches how the model was fit).
        vector = pd.DataFrame([[feats[name] for name in self.features]], columns=self.features)
        probability = float(self.model.predict_proba(vector)[0, 1])
        risk_class = int(probability >= self.threshold)
        return {
            "latitude": latitude,
            "longitude": longitude,
            "risk_probability": round(probability, 6),
            "risk_class": risk_class,
        }


_default_instance = None


def load_default_model(base_dir="."):
    """Convenience loader using the project's standard relative file layout:
    models/earthquake_risk_v4.joblib, data/raw/earthquakes.csv,
    data/raw/gem_active_faults.geojson."""
    global _default_instance
    base = Path(base_dir)
    _default_instance = EarthquakeRiskModel(
        model_path=base / "models" / "earthquake_risk_v4.joblib",
        earthquakes_csv_path=base / "data" / "raw" / "earthquakes.csv",
        faults_geojson_path=base / "data" / "raw" / "gem_active_faults.geojson",
    )
    return _default_instance


def predict_location(latitude, longitude):
    """Module-level convenience wrapper. Call load_default_model() once at
    service startup, then this can be called per-request."""
    if _default_instance is None:
        raise RuntimeError("Call load_default_model(base_dir) once before predict_location().")
    return _default_instance.predict_location(latitude, longitude)
