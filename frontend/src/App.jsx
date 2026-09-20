import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Toaster } from "react-hot-toast";

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
import Emergencies from "./pages/Emergencies";
import GISMonitoring from "./pages/GISMonitoring";
import RiskIntelligence from "./pages/RiskIntelligence";
import Relocation from "./pages/Relocation";
import SafeSites from "./pages/SafeSites";

function App() {
    return (
        
        <BrowserRouter>
        <Toaster position="top-center" toastOptions={{ duration: 4000 }} />

            <Routes>
                

                {/* Home */}
                <Route
                    path="/"
                    element={<Home />}
                />

                {/* Authentication */}
                <Route
                    path="/login"
                    element={<Login />}
                />

                <Route
                    path="/signup"
                    element={<Signup />}
                />

                {/* Citizen Dashboard */}
                <Route
                    path="/dashboard"
                    element={<ProtectedRoute> <CitizenDashboard /> </ProtectedRoute>}
                />

                <Route 
    path="/authority" 
    element={<AuthorityDashboard />} 
/>

                <Route 
                    path="/emergency" 
                    element={<ProtectedRoute> <Emergency /> </ProtectedRoute>} 
                />

                <Route 
                    path="/sos-form"
                    element={<SOSForm />}
                />

                <Route 
                    path="/resources" 
                    element={<ProtectedRoute> <Resources /> </ProtectedRoute>} 
                />

                <Route 
                    path="/create-rescue-team" 
                    element={<ProtectedRoute allowedRoles={["authority"]}> <CreateRescueTeam /> </ProtectedRoute>} 
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
                    path="/resource-requests" 
                    element={<ProtectedRoute allowedRoles={["authority", "ngo"]}> <ResourceRequestsDashboard /> </ProtectedRoute>} 
                />

                <Route
                    path="/create-risk-zone"
                    element={<CreateRiskZone />}
                />

                <Route
                    path="/volunteers"
                    element={<ProtectedRoute> <VolunteerNGO /> </ProtectedRoute>}
                />

                {/* Catch-all route for 404 Not Found */}
                <Route 
                    path="*" 
                    element={<NotFoundPage />} 
                />

                <Route path="/authority/risk-map" element={<RiskMap />} />

                <Route
                    path="/authority/habitations"
                    element={<Habitations />}
                />

                <Route
                    path="/authority/emergencies"
                    element={<Emergencies />}
                />

                <Route
                    path="/authority/gis"
                    element={<GISMonitoring />}
                />

                <Route
                    path="/authority/risk-intelligence"
                    element={<RiskIntelligence />}
                />

                <Route
                    path="/authority/relocation"
                    element={<Relocation />}
                />

                <Route
                    path="/authority/safe-sites"
                    element={<SafeSites />}
                />
        </Routes>
        </BrowserRouter>
    );
}

export default App;