import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Toaster } from "react-hot-toast";

import { AuthProvider } from "./context/AuthContext";

import Home from "./pages/Home";
import Login from "./pages/Login";
import Signup from "./pages/Signup";

import CitizenDashboard from "./pages/CitizenDashboard";
import ProtectedRoute from "./components/ProtectedRoute";

import Emergency from "./pages/Emergency";
import SOSForm from "./pages/SOSForm";

import AuthorityLayout from "./components/AuthorityLayout";
import AuthorityDashboard from "./pages/AuthorityDashboard";
import CreateRescueTeam from "./pages/CreateRescueTeam";
import Resources from "./pages/Resources";
import RequestResourceForm from "./pages/RequestResourceForm";
import CreateResource from "./pages/CreateResource";
import CreateRiskZone from "./pages/CreateRiskZone";
import ResourceRequestsDashboard from "./pages/ResourceRequestsDashboard";
import VolunteerNGO from "./pages/VolunteerNGO";
import NotFoundPage from "./pages/NotFoundPage";

import RiskMap from "./pages/RiskMap";
import Habitations from "./pages/Habitations";
import AssessVillage from "./pages/AssessVillage";
import Emergencies from "./pages/Emergencies";
import GISMonitoring from "./pages/GISMonitoring";
import RiskIntelligence from "./pages/RiskIntelligence";
import Relocation from "./pages/Relocation";
import SafeSites from "./pages/SafeSites";


const CITIZEN_SIDE_ROLES = [
    "citizen",
    "rescuer",
    "ngo",
    "volunteer"
];


function App() {
    return (
        <AuthProvider>

            <BrowserRouter>

                <Toaster position="top-center" toastOptions={{ duration: 3000 }} />

                <Routes>

                    {/* =====================================================
                        PUBLIC
                    ===================================================== */}

                    <Route path="/" element={<Home />} />

                    <Route path="/login" element={<Login />} />

                    <Route path="/signup" element={<Signup />} />

                    <Route path="/sos-form" element={<SOSForm />} />


                    {/* =====================================================
                        CITIZEN SIDE
                    ===================================================== */}

                    <Route path="/dashboard" element={ <ProtectedRoute allowedRoles={CITIZEN_SIDE_ROLES} > <CitizenDashboard /> </ProtectedRoute> } />

                    <Route path="/emergency" element={ <ProtectedRoute> <Emergency /> </ProtectedRoute> } />

                    <Route path="/resources" element={ <ProtectedRoute> <Resources /> </ProtectedRoute> } />

                    <Route path="/request-resource" element={ <ProtectedRoute> <RequestResourceForm /> </ProtectedRoute> } />

                    <Route path="/create-resource" element={ <ProtectedRoute> <CreateResource /> </ProtectedRoute> } />

                    <Route path="/volunteers" element={ <ProtectedRoute> <VolunteerNGO /> </ProtectedRoute> } />

                    <Route path="/authority" element={ <ProtectedRoute allowedRoles={["authority"]} > <AuthorityLayout /> </ProtectedRoute> } >

                        <Route
                            index
                            element={<AuthorityDashboard />}
                        />


                        {/* ---------------------------------------------
                            /authority/assess-village
                        --------------------------------------------- */}

                        <Route
                            path="assess-village"
                            element={<AssessVillage />}
                        />


                        {/* ---------------------------------------------
                            /authority/risk-map
                        --------------------------------------------- */}

                        <Route
                            path="risk-map"
                            element={<RiskMap />}
                        />


                        {/* ---------------------------------------------
                            /authority/habitations
                        --------------------------------------------- */}

                        <Route
                            path="habitations"
                            element={<Habitations />}
                        />


                        {/* ---------------------------------------------
                            /authority/emergencies
                        --------------------------------------------- */}

                        <Route
                            path="emergencies"
                            element={<Emergencies />}
                        />


                        {/* ---------------------------------------------
                            /authority/gis
                        --------------------------------------------- */}

                        <Route
                            path="gis"
                            element={<GISMonitoring />}
                        />


                        {/* ---------------------------------------------
                            /authority/risk-intelligence
                        --------------------------------------------- */}

                        <Route
                            path="risk-intelligence"
                            element={<RiskIntelligence />}
                        />


                        {/* ---------------------------------------------
                            /authority/relocation
                        --------------------------------------------- */}

                        <Route
                            path="relocation"
                            element={<Relocation />}
                        />


                        {/* ---------------------------------------------
                            /authority/safe-sites
                        --------------------------------------------- */}

                        <Route
                            path="safe-sites"
                            element={<SafeSites />}
                        />


                        {/* ---------------------------------------------
                            /authority/teams
                        --------------------------------------------- */}

                        <Route
                            path="teams"
                            element={<CreateRescueTeam />}
                        />


                        {/* ---------------------------------------------
                            /authority/resources
                        --------------------------------------------- */}

                        <Route
                            path="resources"
                            element={<Resources />}
                        />

                    </Route>


                    {/* =====================================================
                        AUTHORITY / OTHER PROTECTED ROUTES
                    ===================================================== */}

                    <Route path="/resource-requests" element={ <ProtectedRoute allowedRoles={[ "authority", "ngo"]}> <ResourceRequestsDashboard /> </ProtectedRoute>} />


                    <Route path="/create-risk-zone" element={ <ProtectedRoute allowedRoles={["authority"]} > <CreateRiskZone /> </ProtectedRoute> } />


                    <Route path="*" element={<NotFoundPage />} />

                </Routes>

            </BrowserRouter>

        </AuthProvider>
    );
}

export default App;