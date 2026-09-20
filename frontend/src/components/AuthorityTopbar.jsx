import {
    Bell,
    Menu,
    Search,
    ShieldCheck,
} from "lucide-react";

import "./AuthorityTopbar.css";

function AuthorityTopbar({
    search,
    setSearch,
    onMenuClick,
}) {
    return (
        <header className="authority-topbar">

            <div className="authority-topbar-left">

                <button
                    className="mobile-menu-button"
                    onClick={onMenuClick}
                >
                    <Menu size={20} />
                </button>

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

            <div className="authority-topbar-right">

                <div className="authority-live-status">
                    <span></span>
                    Live monitoring
                </div>

                <button
                    className="authority-notification"
                    title="Notifications"
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
                            Authority
                        </strong>

                        <span>
                            Command access
                        </span>
                    </div>

                </div>

            </div>

        </header>
    );
}

export default AuthorityTopbar;

