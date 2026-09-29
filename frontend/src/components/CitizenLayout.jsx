import { cloneElement, isValidElement, useState } from "react";

import CitizenSidebar from "./CitizenSidebar";
import CitizenTopbar from "./CitizenTopbar";

import "./CitizenLayout.css";

function CitizenLayout({ children }) {

    const [sidebarCollapsed, setSidebarCollapsed] =
        useState(false);

    const [mobileSidebarOpen, setMobileSidebarOpen] =
        useState(false);

    const [search, setSearch] = useState("");

    const page =
        isValidElement(children)
            ? cloneElement(children, { search })
            : children;

    return (

        <div
            className={`citizen-layout ${
                sidebarCollapsed
                    ? "sidebar-collapsed"
                    : ""
            }`}
        >

            <CitizenSidebar
                collapsed={sidebarCollapsed}
                onToggle={() =>
                    setSidebarCollapsed(
                        previous => !previous
                    )
                }
                mobileOpen={mobileSidebarOpen}
                onMobileClose={() =>
                    setMobileSidebarOpen(false)
                }
            />

            <div className="citizen-main">

                <CitizenTopbar
                    search={search}
                    setSearch={setSearch}
                    sidebarCollapsed={sidebarCollapsed}
                    setSidebarCollapsed={setSidebarCollapsed}
                    onMenuClick={() =>
                        setMobileSidebarOpen(true)
                    }
                />

                <main className="citizen-content">
                    {page}
                </main>

            </div>

        </div>
    );
}

export default CitizenLayout;