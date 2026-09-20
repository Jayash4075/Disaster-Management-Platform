import {
    AlertTriangle,
    BarChart3,
    Building2,
    ChevronLeft,
    ChevronRight,
    Home,
    Map,
    MapPinned,
    Package,
    Route,
    Settings,
    Shield,
    Users,
} from "lucide-react";

import { useLocation, useNavigate } from "react-router-dom";

import "./AuthoritySidebar.css";

function AuthoritySidebar({ collapsed, onToggle }) {
    const navigate = useNavigate();
    const location = useLocation();

    /*
     * Authority navigation
     *
     * Structure is aligned around the main PS-191 workflow:
     *
     * COMMAND
     * → Dashboard
     * → Emergencies
     *
     * ANALYSIS
     * → Vulnerable Habitations
     * → GIS Monitoring
     * → Risk Intelligence
     *
     * PLANNING
     * → Relocation Planning
     * → Safe Sites
     *
     * OPERATIONS
     * → Response Teams
     * → Resources
     */

    const navigationSections = [
        {
            title: "COMMAND",
            items: [
                {
                    label: "Dashboard",
                    icon: Home,
                    path: "/authority",
                },
                {
                    label: "Emergencies",
                    icon: AlertTriangle,
                    path: "/authority/emergencies",
                },
            ],
        },

        {
            title: "ANALYSIS",
            items: [
                {
                    label: "Vulnerable Habitations",
                    icon: Building2,
                    path: "/authority/habitations",
                },
                {
                    label: "GIS Monitoring",
                    icon: Map,
                    path: "/authority/gis",
                },
                {
                    label: "Risk Intelligence",
                    icon: BarChart3,
                    path: "/authority/risk-intelligence",
                },
            ],
        },

        {
            title: "PLANNING",
            items: [
                {
                    label: "Relocation Planning",
                    icon: Route,
                    path: "/authority/relocation",
                },
                {
                    label: "Safe Sites",
                    icon: MapPinned,
                    path: "/authority/safe-sites",
                },
            ],
        },

        {
            title: "OPERATIONS",
            items: [
                {
                    label: "Response Teams",
                    icon: Users,
                    path: "/authority/teams",
                },
                {
                    label: "Resources",
                    icon: Package,
                    path: "/authority/resources",
                },
            ],
        },
    ];

    /*
     * Active route handling
     *
     * Dashboard needs an exact match because every other
     * authority page begins with /authority.
     */
    const isActive = (path) => {
        if (path === "/authority") {
            return location.pathname === "/authority";
        }

        return location.pathname.startsWith(path);
    };

    return (
        <aside
            className={`authority-sidebar ${
                collapsed ? "collapsed" : ""
            }`}
        >

            {/* =====================================================
                BRAND
            ===================================================== */}

            <div className="authority-sidebar-brand">

                <button
                    className="authority-brand"
                    onClick={() => navigate("/authority")}
                    title={
                        collapsed
                            ? "TerraShield Authority Dashboard"
                            : undefined
                    }
                >
                    <div className="authority-brand-mark">
                        <Shield size={19} />
                    </div>

                    {!collapsed && (
                        <div className="authority-brand-text">
                            <strong>TerraShield</strong>
                            <small>AUTHORITY COMMAND</small>
                        </div>
                    )}
                </button>

                {/* COLLAPSE / EXPAND BUTTON */}

                <button
                    className="sidebar-toggle"
                    onClick={onToggle}
                    aria-label={
                        collapsed
                            ? "Expand sidebar"
                            : "Collapse sidebar"
                    }
                    title={
                        collapsed
                            ? "Expand sidebar"
                            : "Collapse sidebar"
                    }
                >
                    {collapsed ? (
                        <ChevronRight size={17} />
                    ) : (
                        <ChevronLeft size={17} />
                    )}
                </button>

            </div>


            {/* =====================================================
                NAVIGATION
            ===================================================== */}

            <nav className="authority-nav">

                {navigationSections.map((section) => (

                    <div
                        className="authority-nav-section"
                        key={section.title}
                    >

                        {/* Section heading disappears when collapsed */}

                        {!collapsed && (
                            <span className="authority-nav-label">
                                {section.title}
                            </span>
                        )}


                        {/* Navigation items */}

                        {section.items.map((item) => {

                            const Icon = item.icon;

                            return (
                                <button
                                    key={item.path}
                                    className={`authority-nav-item ${
                                        isActive(item.path)
                                            ? "active"
                                            : ""
                                    }`}
                                    onClick={() =>
                                        navigate(item.path)
                                    }
                                    title={
                                        collapsed
                                            ? item.label
                                            : undefined
                                    }
                                >

                                    <Icon size={18} />

                                    {!collapsed && (
                                        <span>
                                            {item.label}
                                        </span>
                                    )}

                                </button>
                            );
                        })}

                    </div>

                ))}

            </nav>


            {/* =====================================================
                SETTINGS
            ===================================================== */}

            <div className="authority-sidebar-bottom">

                <button
                    className={`authority-nav-item ${
                        isActive("/authority/settings")
                            ? "active"
                            : ""
                    }`}
                    onClick={() =>
                        navigate("/authority/settings")
                    }
                    title={
                        collapsed
                            ? "Settings"
                            : undefined
                    }
                >
                    <Settings size={18} />

                    {!collapsed && (
                        <span>
                            Settings
                        </span>
                    )}
                </button>

            </div>

        </aside>
    );
}

export default AuthoritySidebar;