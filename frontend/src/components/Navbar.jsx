import React from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import "./Navbar.css";

const Navbar = () => {
    const navigate = useNavigate();
    const { user, logout } = useAuth();

    const handleLogout = () => {
        logout();
        navigate("/login");
    };

    const initial = (user?.name || "C").charAt(0).toUpperCase();

    return (
        <nav className="dashboard-navbar">

            <div className="navbar-brand">
                <div className="navbar-logo">R</div>
                <div>
                    <h2>ResQ</h2>
                    <span>Disaster Management Platform</span>
                </div>
            </div>

            <div className="navbar-actions">

                <button className="navbar-icon-btn">
                    🔔
                    <span className="notification-dot"></span>
                </button>

                <div className="navbar-profile">
                    <div className="profile-avatar">{initial}</div>
                    <div className="profile-text">
                        <strong>{user?.name || "Citizen"}</strong>
                        <span>{user?.role ? `${user.role[0].toUpperCase()}${user.role.slice(1)} Account` : "Citizen Account"}</span>
                    </div>
                </div>

                <button className="navbar-logout" onClick={handleLogout}>
                    Logout
                </button>

            </div>

        </nav>
    );
};

export default Navbar;