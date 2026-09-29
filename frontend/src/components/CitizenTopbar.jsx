import {
    Menu,
    Search,
    RefreshCw,
    MapPin
} from "lucide-react";

function CitizenTopbar({
    search,
    setSearch,
    sidebarCollapsed,
    setSidebarCollapsed,
    onMenuClick
}) {

    return (

        <header className="citizen-topbar">

            <div className="citizen-topbar-left">

                <button
                    className="citizen-mobile-menu"
                    onClick={onMenuClick}
                >
                    <Menu size={20} />
                </button>

                <div className="citizen-page-title">

                    <strong>
                        Citizen Safety Center
                    </strong>

                    <span>
                        Real-time disaster intelligence
                    </span>

                </div>

            </div>

            <div className="citizen-topbar-right">

                <div className="citizen-search">

                    <Search size={16} />

                    <input
                        value={search}
                        onChange={(e) =>
                            setSearch(e.target.value)
                        }
                        placeholder="Search safety information..."
                    />

                </div>

                <div className="citizen-location-status">

                    <span className="status-dot"></span>

                    <MapPin size={15} />

                    <span>
                        Location enabled
                    </span>

                </div>

            </div>

        </header>
    );
}

export default CitizenTopbar;