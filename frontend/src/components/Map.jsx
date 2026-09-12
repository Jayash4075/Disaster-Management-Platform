import { useEffect } from "react";

import {
    MapContainer,
    TileLayer,
    Marker,
    Popup,
    Circle,
    useMap
} from "react-leaflet";

import "leaflet/dist/leaflet.css";
import L from "leaflet";

// ======================================================
// FIX LEAFLET DEFAULT ICONS
// ======================================================

delete L.Icon.Default.prototype._getIconUrl;

L.Icon.Default.mergeOptions({
    iconRetinaUrl:
        "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
    iconUrl:
        "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
    shadowUrl:
        "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png"
});

// ======================================================
// CUSTOM MARKER ICONS
// ======================================================

const createIcon = (emoji, backgroundColor) => {
    return L.divIcon({
        className: "custom-map-icon",
        html: `
            <div
                style="
                    width: 34px;
                    height: 34px;
                    border-radius: 50%;
                    background: ${backgroundColor};
                    border: 3px solid white;
                    box-shadow: 0 2px 8px rgba(0,0,0,0.3);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 17px;
                "
            >
                ${emoji}
            </div>
        `,
        iconSize: [34, 34],
        iconAnchor: [17, 17],
        popupAnchor: [0, -17]
    });
};

const userIcon = createIcon("📍", "#2563eb");
const hospitalIcon = createIcon("🏥", "#dc2626");
const shelterIcon = createIcon("🏠", "#2563eb");
const alertIcon = createIcon("🚨", "#f97316");
const habitationIcon = createIcon("🏘️", "#f97316");
const relocationIcon = createIcon("🟢", "#16a34a");

function getCoordinates(item) {
    if (!item) return null;

    if (
        typeof item.latitude === "number" &&
        typeof item.longitude === "number"
    ) {
        return [item.latitude, item.longitude];
    }

    // Format 2: GeoJSON — location.coordinates = [longitude, latitude]
    if (
        item.location &&
        Array.isArray(item.location.coordinates) &&
        item.location.coordinates.length >= 2
    ) {
        const longitude = Number(item.location.coordinates[0]);
        const latitude = Number(item.location.coordinates[1]);
        if (Number.isFinite(latitude) && Number.isFinite(longitude)) {
            return [latitude, longitude];
        }
    }

    // Format 3: coordinates = [longitude, latitude]
    if (
        Array.isArray(item.coordinates) &&
        item.coordinates.length >= 2
    ) {
        const longitude = Number(item.coordinates[0]);
        const latitude = Number(item.coordinates[1]);
        if (Number.isFinite(latitude) && Number.isFinite(longitude)) {
            return [latitude, longitude];
        }
    }

    console.warn("Skipping item with invalid coordinates:", item);
    return null;
}

// ======================================================
// MAP LOCATION UPDATER
// ======================================================

function LocationUpdater({ location }) {
    const map = useMap();

    useEffect(() => {
        if (
            !location ||
            typeof location.latitude !== "number" ||
            typeof location.longitude !== "number"
        ) {
            return;
        }

        map.flyTo(
            [location.latitude, location.longitude],
            15,
            { duration: 1.5 }
        );
    }, [location, map]);

    return null;
}

// ======================================================
// MAP LEGEND
// ======================================================

function MapLegend() {
    const legendItems = [
        { color: "#ef4444", label: "Hazard / Red Zone" },
        { color: "#f97316", label: "Vulnerable Habitation" },
        { color: "#16a34a", label: "Relocation Site" },
        { color: "#2563eb", label: "Hospitals / Shelters" },
        { color: "#f97316", label: "Disaster Alert" },
    ];

    return (
        <div
            style={{
                position: "absolute",
                bottom: "20px",
                right: "20px",
                zIndex: 1000,
                background: "white",
                padding: "14px 16px",
                borderRadius: "10px",
                boxShadow: "0 3px 12px rgba(0,0,0,0.18)",
                minWidth: "190px",
                fontSize: "13px"
            }}
        >
            <div
                style={{
                    fontWeight: "700",
                    color: "#174775",
                    marginBottom: "10px",
                    fontSize: "14px"
                }}
            >
                Map Legend
            </div>

            {legendItems.map((item, i) => (
                <div
                    key={i}
                    style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                        marginBottom: i === legendItems.length - 1 ? 0 : "7px"
                    }}
                >
                    <span
                        style={{
                            width: "13px",
                            height: "13px",
                            borderRadius: "50%",
                            background: item.color,
                            display: "inline-block"
                        }}
                    ></span>
                    {item.label}
                </div>
            ))}
        </div>
    );
}

// ======================================================
// MAIN MAP COMPONENT
// ======================================================

function Map({
    location,
    alerts = [],
    hospitals = [],
    shelters = [],

    // SIH 191 DATA
    hazardZones = [],
    vulnerableHabitations = [],
    relocationSites = []
}) {
    // Default location — Prayagraj / Allahabad
    const defaultLocation = [25.4358, 81.8463];

    const center =
        location &&
        typeof location.latitude === "number" &&
        typeof location.longitude === "number"
            ? [location.latitude, location.longitude]
            : defaultLocation;

    return (
        <div
            className="map-wrapper"
            style={{ position: "relative", width: "100%", height: "100%" }}
        >
            <MapContainer
                center={center}
                zoom={15}
                className="leaflet-map"
                style={{ width: "100%", height: "100%" }}
            >
                {/* ============================================
                    OPEN STREET MAP
                ============================================ */}
                <TileLayer
                    attribution="&copy; OpenStreetMap contributors"
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />

                {/* ============================================
                    UPDATE MAP WHEN USER LOCATION CHANGES
                ============================================ */}
                <LocationUpdater location={location} />

                {/* ============================================
                    USER LOCATION
                ============================================ */}
                {location && (
                    <Marker
                        position={[location.latitude, location.longitude]}
                        icon={userIcon}
                    >
                        <Popup>
                            <strong>📍 You are here</strong>
                            <br />
                            Latitude: {location.latitude.toFixed(6)}
                            <br />
                            Longitude: {location.longitude.toFixed(6)}
                        </Popup>
                    </Marker>
                )}

                {/* ============================================
                    SIH 191 — HAZARD / RED ZONES
                ============================================ */}
                {hazardZones.map((zone, index) => {
                    let centerCoordinates = null;

                    if (
                        zone.center &&
                        typeof zone.center.latitude === "number" &&
                        typeof zone.center.longitude === "number"
                    ) {
                        centerCoordinates = [
                            zone.center.latitude,
                            zone.center.longitude
                        ];
                    } else {
                        centerCoordinates = getCoordinates(zone);
                    }

                    if (!centerCoordinates) return null;

                    const riskLevel = String(
                        zone.riskLevel || zone.risk || "high"
                    ).toLowerCase();

                    let zoneColor = "#dc2626";
                    if (riskLevel === "critical") zoneColor = "#991b1b";
                    else if (riskLevel === "high") zoneColor = "#dc2626";
                    else if (riskLevel === "moderate") zoneColor = "#f59e0b";

                    return (
                        <Circle
                            key={zone.id || zone._id || index}
                            center={centerCoordinates}
                            radius={Number(zone.radius) || 1000}
                            pathOptions={{
                                color: zoneColor,
                                fillColor: zoneColor,
                                fillOpacity: 0.25,
                                weight: 2
                            }}
                        >
                            <Popup>
                                <strong>🔴 Hazard / Red Zone</strong>
                                <br />
                                <strong>{zone.name || "High-Risk Zone"}</strong>

                                {zone.hazardType && (
                                    <>
                                        <br />
                                        Hazard Type: {zone.hazardType}
                                    </>
                                )}

                                {zone.hazards && Array.isArray(zone.hazards) && (
                                    <>
                                        <br />
                                        Hazards: {zone.hazards.join(", ")}
                                    </>
                                )}

                                <br />
                                Risk Level: <strong>{zone.riskLevel || zone.risk || "High"}</strong>

                                {zone.riskScore !== undefined && (
                                    <>
                                        <br />
                                        Risk Score: {zone.riskScore}/100
                                    </>
                                )}

                                {zone.population !== undefined && (
                                    <>
                                        <br />
                                        Population: {zone.population}
                                    </>
                                )}

                                {zone.reason && (
                                    <>
                                        <br />
                                        Reason: {zone.reason}
                                    </>
                                )}

                                <br />
                                <strong>⚠️ Permanent habitation not recommended</strong>
                            </Popup>
                        </Circle>
                    );
                })}

                {/* ============================================
                    SIH 191 — VULNERABLE HABITATIONS
                ============================================ */}
                {vulnerableHabitations.map((habitation, index) => {
                    const coords = getCoordinates(habitation);
                    if (!coords) return null;

                    return (
                        <Marker
                            key={habitation.id || habitation._id || index}
                            position={coords}
                            icon={habitationIcon}
                        >
                            <Popup>
                                <strong>
                                    🏘️ {habitation.name || habitation.village || "Vulnerable Habitation"}
                                </strong>

                                {habitation.district && (
                                    <>
                                        <br />
                                        District: {habitation.district}
                                    </>
                                )}

                                {habitation.population !== undefined && (
                                    <>
                                        <br />
                                        Population: {habitation.population}
                                    </>
                                )}

                                {habitation.vulnerablePopulation !== undefined && (
                                    <>
                                        <br />
                                        Vulnerable Population: {habitation.vulnerablePopulation}
                                    </>
                                )}

                                {habitation.riskLevel && (
                                    <>
                                        <br />
                                        Risk Level: <strong>{habitation.riskLevel}</strong>
                                    </>
                                )}

                                {habitation.riskScore !== undefined && (
                                    <>
                                        <br />
                                        Risk Score: {habitation.riskScore}/100
                                    </>
                                )}

                                {habitation.relocationPriority && (
                                    <>
                                        <br />
                                        Relocation Priority: <strong>{habitation.relocationPriority}</strong>
                                    </>
                                )}

                                {habitation.hazardType && (
                                    <>
                                        <br />
                                        Main Hazard: {habitation.hazardType}
                                    </>
                                )}
                            </Popup>
                        </Marker>
                    );
                })}

                {/* ============================================
                    SIH 191 — POTENTIAL RELOCATION SITES
                ============================================ */}
                {relocationSites.map((site, index) => {
                    const coords = getCoordinates(site);
                    if (!coords) return null;

                    return (
                        <Marker
                            key={site.id || site._id || index}
                            position={coords}
                            icon={relocationIcon}
                        >
                            <Popup>
                                <strong>🟢 {site.name || "Potential Relocation Site"}</strong>

                                {site.locationName && (
                                    <>
                                        <br />
                                        Location: {site.locationName}
                                    </>
                                )}

                                {site.safetyScore !== undefined && (
                                    <>
                                        <br />
                                        Safety Score: {site.safetyScore}/100
                                    </>
                                )}

                                {site.capacity !== undefined && (
                                    <>
                                        <br />
                                        Total Capacity: {site.capacity}
                                    </>
                                )}

                                {site.availableCapacity !== undefined && (
                                    <>
                                        <br />
                                        Available Capacity: {site.availableCapacity}
                                    </>
                                )}

                                {site.occupancy !== undefined && (
                                    <>
                                        <br />
                                        Current Occupancy: {site.occupancy}
                                    </>
                                )}

                                {site.status && (
                                    <>
                                        <br />
                                        Status: {site.status}
                                    </>
                                )}

                                {site.distance !== undefined && (
                                    <>
                                        <br />
                                        Distance: {site.distance} km
                                    </>
                                )}

                                {site.facilities && Array.isArray(site.facilities) && (
                                    <>
                                        <br />
                                        Facilities: {site.facilities.join(", ")}
                                    </>
                                )}
                            </Popup>
                        </Marker>
                    );
                })}

                {/* ============================================
                    HOSPITALS
                ============================================ */}
                {hospitals.map((hospital, index) => {
                    const coords = getCoordinates(hospital);
                    if (!coords) return null;

                    return (
                        <Marker
                            key={hospital.id || hospital._id || index}
                            position={coords}
                            icon={hospitalIcon}
                        >
                            <Popup>
                                <strong>
                                    🏥 {hospital.name || hospital.title || "Hospital"}
                                </strong>

                                {hospital.address && (
                                    <>
                                        <br />
                                        {hospital.address}
                                    </>
                                )}

                                {hospital.availableCapacity !== undefined && (
                                    <>
                                        <br />
                                        🛏️ Available Capacity: {hospital.availableCapacity}
                                    </>
                                )}

                                {hospital.status && (
                                    <>
                                        <br />
                                        Status: {hospital.status}
                                    </>
                                )}
                            </Popup>
                        </Marker>
                    );
                })}

                {/* ============================================
                    SHELTERS
                ============================================ */}
                {shelters.map((shelter, index) => {
                    const coords = getCoordinates(shelter);
                    if (!coords) return null;

                    return (
                        <Marker
                            key={shelter.id || shelter._id || index}
                            position={coords}
                            icon={shelterIcon}
                        >
                            <Popup>
                                <strong>
                                    🏠 {shelter.name || shelter.title || "Shelter"}
                                </strong>

                                {shelter.address && (
                                    <>
                                        <br />
                                        {shelter.address}
                                    </>
                                )}

                                {shelter.availableCapacity !== undefined && (
                                    <>
                                        <br />
                                        👥 Available Capacity: {shelter.availableCapacity}
                                    </>
                                )}

                                {shelter.status && (
                                    <>
                                        <br />
                                        Status: {shelter.status}
                                    </>
                                )}
                            </Popup>
                        </Marker>
                    );
                })}

                {/* ============================================
                    DISASTER ALERTS
                ============================================ */}
                {alerts.map((alert, index) => {
                    const coords = getCoordinates(alert);
                    if (!coords) return null;

                    return (
                        <Marker
                            key={alert.id || alert._id || index}
                            position={coords}
                            icon={alertIcon}
                        >
                            <Popup>
                                <strong>
                                    🚨 {alert.title || alert.type || "Disaster Alert"}
                                </strong>

                                {alert.description && (
                                    <>
                                        <br />
                                        {alert.description}
                                    </>
                                )}

                                {alert.severity && (
                                    <>
                                        <br />
                                        Severity: <strong>{alert.severity}</strong>
                                    </>
                                )}

                                {alert.hazardType && (
                                    <>
                                        <br />
                                        Hazard: {alert.hazardType}
                                    </>
                                )}
                            </Popup>
                        </Marker>
                    );
                })}
            </MapContainer>

            {/* ============================================
                MAP LEGEND
            ============================================ */}
            <MapLegend />
        </div>
    );
}

export default Map;