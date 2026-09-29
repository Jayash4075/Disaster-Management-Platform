import React from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import "./CitizenSidebar.css";

function CitizenSidebar() {

    const navigate = useNavigate();
    const { user, logout } = useAuth();

    const menuItems = [
        {
            label: "Dashboard",
            path: "/dashboard",
            icon: "⌂",
        },
        {
            label: "Emergency SOS",
            path: "/sos-form",
            icon: "🚨",
        },
        {
            label: "SOS Status",
            path: "/emergency",
            icon: "🛟",
        },
        {
            label: "Emergency Resources",
            path: "/resources",
            icon: "📦",
        },
    ];

    const handleLogout = () => {
        logout();
        navigate("/login");
    };

    return (
        <aside className="resq-citizen-sidebar">

            {/* =========================================
                BRAND
            ========================================= */}

            <div className="citizen-sidebar-brand">

                <div className="citizen-sidebar-logo">
                    T
                </div>

                <div>
                    <h2>TerraShield</h2>
                    <span>Citizen Safety</span>
                </div>

            </div>


            {/* =========================================
                NAVIGATION
            ========================================= */}

            <div className="citizen-sidebar-section">

                <p className="citizen-sidebar-label">
                    MAIN MENU
                </p>

                <nav className="citizen-sidebar-nav">

                    {menuItems.map((item) => (

                        <NavLink
                            key={item.path}
                            to={item.path}
                            end={item.path === "/dashboard"}
                            className={({ isActive }) =>
                                `citizen-sidebar-link ${
                                    isActive
                                        ? "active"
                                        : ""
                                }`
                            }
                        >

                            <span className="citizen-sidebar-icon">
                                {item.icon}
                            </span>

                            <span>
                                {item.label}
                            </span>

                        </NavLink>

                    ))}

                </nav>

            </div>


            {/* =========================================
                SAFETY INFORMATION
            ========================================= */}

            <div className="citizen-sidebar-help">

                <div className="citizen-sidebar-help-icon">
                    🛡️
                </div>

                <div>
                    <strong>
                        Stay Safe
                    </strong>

                    <p>
                        Follow official alerts and evacuation instructions.
                    </p>
                </div>

            </div>


            {/* =========================================
                USER
            ========================================= */}

            <div className="citizen-sidebar-bottom">

                <div className="citizen-user">

                    <div className="citizen-user-avatar">
                        {(user?.name || "C")
                            .charAt(0)
                            .toUpperCase()}
                    </div>

                    <div className="citizen-user-info">

                        <strong>
                            {user?.name || "Citizen"}
                        </strong>

                        <span>
                            Citizen Account
                        </span>

                    </div>

                </div>


                <button
                    className="citizen-logout-btn"
                    onClick={handleLogout}
                >
                    ↪
                    <span>Sign out</span>
                </button>

            </div>

        </aside>
    );
}

export default CitizenSidebar;