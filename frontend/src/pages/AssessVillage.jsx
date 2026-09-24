import { useEffect, useState } from "react";
import {
    Search,
    Brain,
    MapPin,
    CloudRain,
    Waves,
    Building2,
    Users,
    Droplets,
    Route,
    Hospital,
    Home,
    Utensils,
    Stethoscope,
    ShieldCheck,
    AlertTriangle,
    RotateCcw,
    Loader2,
    CheckCircle2,
    ArrowRight
} from "lucide-react";

import AuthoritySidebar from "../components/AuthoritySidebar";
import api from "../api/axios";
import toast from "react-hot-toast";

import "./AssessVillage.css";


function AssessVillage() {

    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

    const [search, setSearch] = useState("");
    const [villages, setVillages] = useState([]);
    const [selectedVillage, setSelectedVillage] = useState(null);

    const [searchLoading, setSearchLoading] = useState(false);
    const [assessing, setAssessing] = useState(false);

    const [showSuggestions, setShowSuggestions] = useState(false);

    const [result, setResult] = useState(null);

    const [form, setForm] = useState({
        rainfall: "",
        river_level: "",
        flood_history: "",
        building_damage: "",
        vulnerable_population: "",
        water_level: "",
        road_access: "",
        hospital_distance: "",
        shelter_capacity: "",
        available_water: "",
        food_stock: "",
        medical_capacity: ""
    });


    // ============================================================
    // SEARCH VILLAGES
    // ============================================================

    useEffect(() => {

        const timer = setTimeout(() => {

            if (search.trim().length < 2) {
                setVillages([]);
                setShowSuggestions(false);
                return;
            }

            searchVillages(search.trim());

        }, 400);

        return () => clearTimeout(timer);

    }, [search]);


    const searchVillages = async (query) => {

        try {

            setSearchLoading(true);

            const response = await api.get(
                `/api/habitations/ml-villages/search?q=${encodeURIComponent(query)}`
            );

            const data = response.data;

            const list =
                data?.villages ||
                data?.data?.villages ||
                data?.data ||
                [];

            setVillages(Array.isArray(list) ? list : []);
            setShowSuggestions(true);

        } catch (error) {

            console.error("Village search error:", error);

            setVillages([]);
            setShowSuggestions(false);

        } finally {

            setSearchLoading(false);

        }
    };


    // ============================================================
    // SELECT VILLAGE
    // ============================================================

    const handleSelectVillage = (village) => {

        setSelectedVillage(village);

        setSearch(
            village.village_name ||
            village.name ||
            village.villageName ||
            ""
        );

        setShowSuggestions(false);

        setResult(null);

        /*
         * Automatically populate values that are already
         * available from the ML village dataset.
         */

        setForm(prev => ({
            ...prev,

            vulnerable_population:
                village.vulnerable_population ??
                village.vulnerablePopulation ??
                "",

            shelter_capacity:
                village.shelter_capacity ??
                village.shelterCapacity ??
                ""
        }));
    };


    // ============================================================
    // INPUT CHANGE
    // ============================================================

    const handleChange = (e) => {

        const { name, value } = e.target;

        setForm(prev => ({
            ...prev,
            [name]: value
        }));

    };


    // ============================================================
    // RESET
    // ============================================================

    const resetAssessment = () => {

        setSearch("");
        setVillages([]);
        setSelectedVillage(null);
        setResult(null);

        setForm({
            rainfall: "",
            river_level: "",
            flood_history: "",
            building_damage: "",
            vulnerable_population: "",
            water_level: "",
            road_access: "",
            hospital_distance: "",
            shelter_capacity: "",
            available_water: "",
            food_stock: "",
            medical_capacity: ""
        });

    };


    // ============================================================
    // ASSESS VILLAGE
    // ============================================================

    const handleAssess = async (e) => {

        e.preventDefault();

        if (!selectedVillage) {

            toast.error("Please select a village first.");
            return;

        }


        const requiredFields = Object.entries(form);

        const missing = requiredFields.filter(
            ([, value]) =>
                value === "" ||
                value === null ||
                value === undefined
        );


        if (missing.length > 0) {

            toast.error("Please fill all assessment fields.");
            return;

        }


        try {

            setAssessing(true);
            setResult(null);


            const villageCode =
                selectedVillage.village_code ||
                selectedVillage.villageCode ||
                selectedVillage.code;


            const payload = {

                villageCode,

                villageName:
                    selectedVillage.village_name ||
                    selectedVillage.name ||
                    selectedVillage.villageName,

                rainfall: Number(form.rainfall),

                population:
        selectedVillage.population ??
        selectedVillage.total_population ??
        selectedVillage.populationCount ??
        0,

                riverLevel:
                    Number(form.river_level),

                floodHistory:
                    Number(form.flood_history),

                buildingDamage:
                    Number(form.building_damage),

                vulnerablePopulation:
                    Number(form.vulnerable_population),

                waterLevel:
                    Number(form.water_level),

                roadAccess:
                    Number(form.road_access),

                hospitalDistance:
                    Number(form.hospital_distance),

                shelterCapacity:
                    Number(form.shelter_capacity),

                availableWater:
                    Number(form.available_water),

                foodStock:
                    Number(form.food_stock),

                medicalCapacity:
                    Number(form.medical_capacity)
            };


            /*
             * Existing backend assessment endpoint.
             */

            

            const response = await api.post(
                "/api/habitations/assess-village",
                payload
            );


            const assessment =
                response.data?.data ||
                response.data?.result ||
                response.data;


            setResult(assessment);

            toast.success("Village risk assessment completed.");

        } catch (error) {

            console.error(
                "Village assessment error:",
                error
            );

            toast.error(
                error.response?.data?.message ||
                error.response?.data?.error ||
                "Failed to assess village."
            );

        } finally {

            setAssessing(false);

        }
    };


    // ============================================================
    // HELPERS
    // ============================================================

    const getRiskClass = (level) => {

        const value = String(level || "")
            .toUpperCase();

        if (value === "RED") return "risk-red";
        if (value === "ORANGE") return "risk-orange";
        if (value === "YELLOW") return "risk-yellow";

        return "risk-green";
    };


    const getRiskScore = () => {

        return Number(
            result?.riskScore ??
            result?.risk_score ??
            result?.prediction?.riskScore ??
            result?.assessment?.riskScore ??
            0
        );

    };


    const getRiskLevel = () => {

        return (
            result?.riskLevel ||
            result?.risk_level ||
            result?.prediction?.riskLevel ||
            result?.assessment?.riskLevel ||
            "GREEN"
        );

    };


    const getRelocationPriority = () => {

        return (
            result?.relocationPriority ||
            result?.relocation_priority ||
            result?.prediction?.relocationPriority ||
            result?.assessment?.relocationPriority ||
            "MONITOR"
        );

    };


    const getCapacityStatus = () => {

        return (
            result?.capacityStatus ||
            result?.capacity_status ||
            result?.prediction?.capacityStatus ||
            result?.assessment?.capacityStatus ||
            "UNKNOWN"
        );

    };


    const score = getRiskScore();
    const riskLevel = getRiskLevel();
    const relocationPriority = getRelocationPriority();
    const capacityStatus = getCapacityStatus();


    return (

        <div
            className={`authority-layout ${
                sidebarCollapsed
                    ? "sidebar-collapsed"
                    : ""
            }`}
        >

            <AuthoritySidebar
                collapsed={sidebarCollapsed}
                onToggle={() =>
                    setSidebarCollapsed(prev => !prev)
                }
            />


            <div className="authority-main">


                <main className="assess-village-page">

                    {/* ================================================= */}
                    {/* HEADER */}
                    {/* ================================================= */}

                    <section className="assess-header">

                        <div>

                            <div className="assess-eyebrow">
                                <Brain size={15} />
                                ML-POWERED RISK ASSESSMENT
                            </div>

                            <h1>
                                Village Risk Assessment
                            </h1>

                            <p>
                                Assess disaster risk for a village using
                                current environmental, infrastructure and
                                population conditions.
                            </p>

                        </div>


                        <button
                            className="secondary-action"
                            onClick={resetAssessment}
                        >
                            <RotateCcw size={17} />
                            Reset
                        </button>

                    </section>


                    {/* ================================================= */}
                    {/* VILLAGE SELECTION */}
                    {/* ================================================= */}

                    <section className="assessment-card">

                        <div className="card-heading">

                            <div className="card-heading-icon">
                                <MapPin size={20} />
                            </div>

                            <div>

                                <h2>
                                    Select Village
                                </h2>

                                <p>
                                    Search the ML village dataset and select
                                    the habitation you want to assess.
                                </p>

                            </div>

                        </div>


                        <div className="village-search-wrapper">

                            <Search
                                size={19}
                                className="search-icon"
                            />


                            <input
                                type="text"
                                placeholder="Search village name..."
                                value={search}
                                onChange={(e) =>
                                    setSearch(e.target.value)
                                }
                                onFocus={() => {

                                    if (villages.length > 0)
                                        setShowSuggestions(true);

                                }}
                            />


                            {searchLoading && (

                                <Loader2
                                    size={18}
                                    className="search-loader"
                                />

                            )}


                            {showSuggestions &&
                                villages.length > 0 && (

                                    <div className="village-suggestions">

                                        {villages
                                            .slice(0, 8)
                                            .map((village, index) => {

                                                const name =
                                                    village.village_name ||
                                                    village.name ||
                                                    village.villageName ||
                                                    "Unknown Village";

                                                const code =
                                                    village.village_code ||
                                                    village.villageCode ||
                                                    village.code ||
                                                    `V-${index}`;

                                                return (

                                                    <button
                                                        type="button"
                                                        key={code}
                                                        className="village-option"
                                                        onClick={() =>
                                                            handleSelectVillage(
                                                                village
                                                            )
                                                        }
                                                    >

                                                        <div className="option-icon">
                                                            <MapPin size={17} />
                                                        </div>

                                                        <div>

                                                            <strong>
                                                                {name}
                                                            </strong>

                                                            <span>
                                                                Village Code: {code}
                                                            </span>

                                                        </div>

                                                    </button>

                                                );

                                            })}

                                    </div>

                                )}

                        </div>


                        {selectedVillage && (

                            <div className="selected-village">

                                <div className="selected-village-icon">
                                    <CheckCircle2 size={21} />
                                </div>

                                <div className="selected-village-info">

                                    <span>
                                        SELECTED VILLAGE
                                    </span>

                                    <strong>
                                        {selectedVillage.village_name ||
                                            selectedVillage.name ||
                                            selectedVillage.villageName}
                                    </strong>

                                    <small>
                                        Code:{" "}
                                        {selectedVillage.village_code ||
                                            selectedVillage.villageCode ||
                                            selectedVillage.code ||
                                            "—"}
                                    </small>

                                </div>

                            </div>

                        )}

                    </section>


                    {/* ================================================= */}
                    {/* CURRENT CONDITIONS */}
                    {/* ================================================= */}

                    <form onSubmit={handleAssess}>

                        <section className="assessment-card">

                            <div className="card-heading">

                                <div className="card-heading-icon">
                                    <CloudRain size={20} />
                                </div>

                                <div>

                                    <h2>
                                        Current Conditions
                                    </h2>

                                    <p>
                                        Enter the latest environmental and
                                        infrastructure conditions for this village.
                                    </p>

                                </div>

                            </div>


                            <div className="field-section">

                                <div className="field-section-title">
                                    <CloudRain size={17} />
                                    Environmental Conditions
                                </div>


                                <div className="form-grid">

                                    <FormField
                                        icon={<CloudRain />}
                                        label="Rainfall"
                                        unit="mm"
                                        name="rainfall"
                                        value={form.rainfall}
                                        onChange={handleChange}
                                        placeholder="e.g. 120"
                                    />


                                    <FormField
                                        icon={<Waves />}
                                        label="River Level"
                                        unit="m"
                                        name="river_level"
                                        value={form.river_level}
                                        onChange={handleChange}
                                        placeholder="e.g. 4.2"
                                    />


                                    <FormField
                                        icon={<AlertTriangle />}
                                        label="Flood History"
                                        unit="events"
                                        name="flood_history"
                                        value={form.flood_history}
                                        onChange={handleChange}
                                        placeholder="e.g. 3"
                                    />


                                    <FormField
                                        icon={<Droplets />}
                                        label="Water Level"
                                        unit="m"
                                        name="water_level"
                                        value={form.water_level}
                                        onChange={handleChange}
                                        placeholder="e.g. 2.1"
                                    />

                                </div>

                            </div>


                            <div className="field-section">

                                <div className="field-section-title">
                                    <Building2 size={17} />
                                    Infrastructure & Access
                                </div>


                                <div className="form-grid">

                                    <FormField
                                        icon={<Building2 />}
                                        label="Building Damage"
                                        unit="0–10"
                                        name="building_damage"
                                        value={form.building_damage}
                                        onChange={handleChange}
                                        placeholder="e.g. 4"
                                    />


                                    <FormField
                                        icon={<Route />}
                                        label="Road Access"
                                        unit="0–10"
                                        name="road_access"
                                        value={form.road_access}
                                        onChange={handleChange}
                                        placeholder="e.g. 7"
                                    />


                                    <FormField
                                        icon={<Hospital />}
                                        label="Hospital Distance"
                                        unit="km"
                                        name="hospital_distance"
                                        value={form.hospital_distance}
                                        onChange={handleChange}
                                        placeholder="e.g. 8"
                                    />


                                    <FormField
                                        icon={<Home />}
                                        label="Shelter Capacity"
                                        unit="people"
                                        name="shelter_capacity"
                                        value={form.shelter_capacity}
                                        onChange={handleChange}
                                        placeholder="e.g. 500"
                                    />

                                </div>

                            </div>


                            <div className="field-section">

                                <div className="field-section-title">
                                    <Users size={17} />
                                    Population & Resources
                                </div>


                                <div className="form-grid">

                                    <FormField
                                        icon={<Users />}
                                        label="Vulnerable Population"
                                        unit="people"
                                        name="vulnerable_population"
                                        value={form.vulnerable_population}
                                        onChange={handleChange}
                                        placeholder="e.g. 250"
                                    />


                                    <FormField
                                        icon={<Droplets />}
                                        label="Available Water"
                                        unit="litres"
                                        name="available_water"
                                        value={form.available_water}
                                        onChange={handleChange}
                                        placeholder="e.g. 5000"
                                    />


                                    <FormField
                                        icon={<Utensils />}
                                        label="Food Stock"
                                        unit="units"
                                        name="food_stock"
                                        value={form.food_stock}
                                        onChange={handleChange}
                                        placeholder="e.g. 1000"
                                    />


                                    <FormField
                                        icon={<Stethoscope />}
                                        label="Medical Capacity"
                                        unit="people"
                                        name="medical_capacity"
                                        value={form.medical_capacity}
                                        onChange={handleChange}
                                        placeholder="e.g. 100"
                                    />

                                </div>

                            </div>


                            {/* ================================================= */}
                            {/* SUBMIT */}
                            {/* ================================================= */}

                            <div className="assessment-actions">

                                <button
                                    type="button"
                                    className="secondary-action"
                                    onClick={resetAssessment}
                                >
                                    Clear
                                </button>


                                <button
                                    type="submit"
                                    className="primary-action"
                                    disabled={
                                        assessing ||
                                        !selectedVillage
                                    }
                                >

                                    {assessing ? (

                                        <>
                                            <Loader2
                                                size={18}
                                                className="spin"
                                            />
                                            Running ML Assessment...
                                        </>

                                    ) : (

                                        <>
                                            <Brain size={18} />
                                            Assess Risk
                                            <ArrowRight size={17} />
                                        </>

                                    )}

                                </button>

                            </div>

                        </section>

                    </form>


                    {/* ================================================= */}
                    {/* RESULT */}
                    {/* ================================================= */}

                    {result && (

                        <section className="result-card">

                            <div className="result-header">

                                <div>

                                    <div className="result-eyebrow">
                                        <ShieldCheck size={16} />
                                        ASSESSMENT COMPLETE
                                    </div>

                                    <h2>
                                        Risk Assessment Result
                                    </h2>

                                    <p>
                                        ML assessment generated for{" "}
                                        <strong>
                                            {selectedVillage?.village_name ||
                                                selectedVillage?.name ||
                                                selectedVillage?.villageName}
                                        </strong>
                                    </p>

                                </div>

                                <div
                                    className={`result-risk-badge ${getRiskClass(
                                        riskLevel
                                    )}`}
                                >
                                    {riskLevel}
                                </div>

                            </div>


                            <div className="result-grid">

                                {/* SCORE */}

                                <div className="score-panel">

                                    <span className="result-label">
                                        OVERALL RISK SCORE
                                    </span>

                                    <div className="score-number">
                                        {score.toFixed(1)}
                                    </div>

                                    <div className="score-bar">

                                        <div
                                            className="score-fill"
                                            style={{
                                                width: `${Math.min(
                                                    Math.max(score, 0),
                                                    100
                                                )}%`
                                            }}
                                        />

                                    </div>

                                    <div className="score-scale">
                                        <span>0</span>
                                        <span>25</span>
                                        <span>50</span>
                                        <span>75</span>
                                        <span>100</span>
                                    </div>

                                </div>


                                {/* RELOCATION */}

                                <div className="result-info-card">

                                    <div className="result-info-icon">
                                        <MapPin size={20} />
                                    </div>

                                    <div>

                                        <span>
                                            RELOCATION PRIORITY
                                        </span>

                                        <strong>
                                            {relocationPriority.replace(
                                                /_/g,
                                                " "
                                            )}
                                        </strong>

                                    </div>

                                </div>


                                {/* CAPACITY */}

                                <div className="result-info-card">

                                    <div className="result-info-icon green">
                                        <Home size={20} />
                                    </div>

                                    <div>

                                        <span>
                                            CAPACITY STATUS
                                        </span>

                                        <strong>
                                            {capacityStatus.replace(
                                                /_/g,
                                                " "
                                            )}
                                        </strong>

                                    </div>

                                </div>

                            </div>


                            <div className="result-footer">

                                <CheckCircle2 size={17} />

                                Assessment has been processed and stored
                                by the backend.

                            </div>

                        </section>

                    )}

                </main>

            </div>

        </div>
    );
}


// ============================================================
// FORM FIELD COMPONENT
// ============================================================

function FormField({
    icon,
    label,
    unit,
    name,
    value,
    onChange,
    placeholder
}) {

    return (

        <div className="form-field">

            <label htmlFor={name}>

                <span className="field-label">

                    <span className="field-icon">
                        {icon}
                    </span>

                    {label}

                </span>

                <span className="field-unit">
                    {unit}
                </span>

            </label>


            <input
                id={name}
                name={name}
                type="number"
                step="any"
                value={value}
                onChange={onChange}
                placeholder={placeholder}
                required
            />

        </div>

    );
}


export default AssessVillage;