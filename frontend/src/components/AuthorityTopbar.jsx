import {
    Bell,
    Menu,
    Search,
    ShieldCheck,
    LogOut,
} from "lucide-react";

import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

import "./AuthorityTopbar.css";

function AuthorityTopbar({
    search,
    setSearch,
    onMenuClick
}) {

    const navigate = useNavigate();
    const { user, logout } = useAuth();

    const handleLogout = () => {
        logout();
        navigate("/login");
    };

    return (
        <header className="authority-topbar">

            <div className="authority-topbar-left">

                {/* MOBILE HAMBURGER */}

                <button
                    className="mobile-menu-button"
                    onClick={onMenuClick}
                    aria-label="Open navigation menu"
                    type="button"
                >
                    <Menu size={20} />
                </button>


                {/* SEARCH */}

                <div className="authority-search">

                    <Search size={16} />

                    <input
                        value={search}
                        onChange={(event) =>
                            setSearch(event.target.value)
                        }
                        placeholder="Search incidents, locations..."
                    />

                </div>

            </div>


            {/* RIGHT SIDE */}

            <div className="authority-topbar-right">

                <div className="authority-live-status">
                    <span></span>
                    Live monitoring
                </div>


                <button
                    className="authority-notification"
                    title="Notifications"
                    type="button"
                >
                    <Bell size={18} />
                    <span></span>
                </button>


                <div className="authority-profile">

                    <div className="authority-profile-icon">
                        <ShieldCheck size={18} />
                    </div>

                    <div className="authority-profile-text">

                        <strong>
                            {user?.name || "Authority"}
                        </strong>

                        <span>
                            Command access
                        </span>

                    </div>

                </div>


                <button
                    className="authority-notification"
                    title="Logout"
                    onClick={handleLogout}
                    type="button"
                >
                    <LogOut size={18} />
                </button>

            </div>

        </header>
    );
}

export default AuthorityTopbar;