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

const CITIZEN_SIDE_ROLES = ["citizen", "rescuer", "ngo", "volunteer"];

function App() {
    return (
        <AuthProvider>
        <BrowserRouter>
            <Toaster position="top-center" toastOptions={{ duration: 4000 }} />

            <Routes>

                {/* Public */}
                <Route path="/" element={<Home />} />
                <Route path="/login" element={<Login />} />
                <Route path="/signup" element={<Signup />} />
                <Route path="/sos-form" element={<SOSForm />} />

                {/* Citizen-side */}
                <Route
                    path="/dashboard"
                    element={
                        <ProtectedRoute allowedRoles={CITIZEN_SIDE_ROLES}>
                            <CitizenDashboard />
                        </ProtectedRoute>
                    }
                />

                <Route
                    path="/emergency"
                    element={<ProtectedRoute><Emergency /></ProtectedRoute>}
                />

                <Route
                    path="/resources"
                    element={<ProtectedRoute><Resources /></ProtectedRoute>}
                />

                <Route
                    path="/request-resource"
                    element={<ProtectedRoute><RequestResourceForm /></ProtectedRoute>}
                />

                <Route
                    path="/create-resource"
                    element={<ProtectedRoute><CreateResource /></ProtectedRoute>}
                />

                <Route
                    path="/volunteers"
                    element={<ProtectedRoute><VolunteerNGO /></ProtectedRoute>}
                />

                {/* Authority-side */}
                <Route
                    path="/authority"
                    element={
                        <ProtectedRoute allowedRoles={["authority"]}>
                            <AuthorityDashboard />
                        </ProtectedRoute>
                    }
                />

                <Route
                    path="/authority/assess-village"
                    element={
                        <ProtectedRoute allowedRoles={["authority"]}>
                            <AssessVillage />
                        </ProtectedRoute>
                    }
                />

                <Route
                    path="/authority/risk-map"
                    element={
                        <ProtectedRoute allowedRoles={["authority"]}>
                            <RiskMap />
                        </ProtectedRoute>
                    }
                />

                <Route
                    path="/authority/habitations"
                    element={
                        <ProtectedRoute allowedRoles={["authority"]}>
                            <Habitations />
                        </ProtectedRoute>
                    }
                />

                <Route
                    path="/authority/emergencies"
                    element={
                        <ProtectedRoute allowedRoles={["authority"]}>
                            <Emergencies />
                        </ProtectedRoute>
                    }
                />

                <Route
                    path="/authority/gis"
                    element={
                        <ProtectedRoute allowedRoles={["authority"]}>
                            <GISMonitoring />
                        </ProtectedRoute>
                    }
                />

                <Route
                    path="/authority/risk-intelligence"
                    element={
                        <ProtectedRoute allowedRoles={["authority"]}>
                            <RiskIntelligence />
                        </ProtectedRoute>
                    }
                />

                <Route
                    path="/authority/relocation"
                    element={
                        <ProtectedRoute allowedRoles={["authority"]}>
                            <Relocation />
                        </ProtectedRoute>
                    }
                />

                <Route
                    path="/authority/safe-sites"
                    element={
                        <ProtectedRoute allowedRoles={["authority"]}>
                            <SafeSites />
                        </ProtectedRoute>
                    }
                />

                {/* Previously missing — sidebar linked here but no route existed,
                    so these fell through to the catch-all */}
                <Route
                    path="/authority/teams"
                    element={
                        <ProtectedRoute allowedRoles={["authority"]}>
                            <CreateRescueTeam />
                        </ProtectedRoute>
                    }
                />

                <Route
                    path="/authority/resources"
                    element={
                        <ProtectedRoute allowedRoles={["authority"]}>
                            <Resources />
                        </ProtectedRoute>
                    }
                />

                <Route
                    path="/resource-requests"
                    element={
                        <ProtectedRoute allowedRoles={["authority", "ngo"]}>
                            <ResourceRequestsDashboard />
                        </ProtectedRoute>
                    }
                />

                <Route
                    path="/create-risk-zone"
                    element={
                        <ProtectedRoute allowedRoles={["authority"]}>
                            <CreateRiskZone />
                        </ProtectedRoute>
                    }
                />

                {/* 404 */}
                <Route path="*" element={<NotFoundPage />} />

            </Routes>
        </BrowserRouter>
        </AuthProvider>
    );
}

export default App;