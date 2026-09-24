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
    ClipboardCheck,
    X
} from "lucide-react";

import {
    useLocation,
    useNavigate
} from "react-router-dom";

import "./AuthoritySidebar.css";

function AuthoritySidebar({
    collapsed,
    onToggle,
    mobileOpen = false,
    onMobileClose
}) {
    const navigate = useNavigate();
    const location = useLocation();

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
                    label: "Assess Village",
                    icon: ClipboardCheck,
                    path: "/authority/assess-village",
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

    const isActive = (path) => {
        if (path === "/authority") {
            return location.pathname === "/authority";
        }

        return location.pathname.startsWith(path);
    };

    // Navigate and close mobile drawer
    const handleNavigation = (path) => {
        navigate(path);

        if (onMobileClose) {
            onMobileClose();
        }
    };

    return (
        <>

            {/* =====================================================
                MOBILE OVERLAY
            ===================================================== */}

            {mobileOpen && (
                <div
                    className="authority-sidebar-overlay"
                    onClick={onMobileClose}
                    aria-hidden="true"
                />
            )}


            {/* =====================================================
                SIDEBAR
            ===================================================== */}

            <aside
                className={`
                    authority-sidebar
                    ${collapsed ? "collapsed" : ""}
                    ${mobileOpen ? "mobile-open" : ""}
                `}
            >

                {/* =================================================
                    BRAND
                ================================================= */}

                <div className="authority-sidebar-brand">

                    <button
                        className="authority-brand"
                        onClick={() =>
                            handleNavigation("/authority")
                        }
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
                                <strong>
                                    TerraShield
                                </strong>

                                <small>
                                    AUTHORITY COMMAND
                                </small>
                            </div>
                        )}

                    </button>


                    {/* DESKTOP COLLAPSE BUTTON */}

                    <button
                        className="sidebar-toggle desktop-sidebar-toggle"
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


                    {/* MOBILE CLOSE BUTTON */}

                    <button
                        className="mobile-sidebar-close"
                        onClick={onMobileClose}
                        aria-label="Close sidebar"
                    >
                        <X size={20} />
                    </button>

                </div>


                {/* =================================================
                    NAVIGATION
                ================================================= */}

                <nav className="authority-nav">

                    {navigationSections.map((section) => (

                        <div
                            className="authority-nav-section"
                            key={section.title}
                        >

                            {!collapsed && (
                                <span className="authority-nav-label">
                                    {section.title}
                                </span>
                            )}


                            {section.items.map((item) => {

                                const Icon = item.icon;

                                return (
                                    <button
                                        key={item.path}
                                        className={`
                                            authority-nav-item
                                            ${
                                                isActive(item.path)
                                                    ? "active"
                                                    : ""
                                            }
                                        `}
                                        onClick={() =>
                                            handleNavigation(item.path)
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


                {/* =================================================
                    SETTINGS
                ================================================= */}

                <div className="authority-sidebar-bottom">

                    <button
                        className={`
                            authority-nav-item
                            ${
                                isActive("/authority/settings")
                                    ? "active"
                                    : ""
                            }
                        `}
                        onClick={() =>
                            handleNavigation(
                                "/authority/settings"
                            )
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
        </>
    );
}

export default AuthoritySidebar;