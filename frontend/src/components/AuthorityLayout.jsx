import { useState } from "react";

import AuthoritySidebar from "./AuthoritySidebar";
import AuthorityTopbar from "./AuthorityTopbar";

import "./AuthorityLayout.css";

function AuthorityLayout({ children }) {
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

    return (
        <div
            className={`authority-layout ${
                sidebarCollapsed ? "sidebar-collapsed" : ""
            }`}
        >
            <AuthoritySidebar
                collapsed={sidebarCollapsed}
                setCollapsed={setSidebarCollapsed}
            />

            <div className="authority-main">

                <AuthorityTopbar
                    sidebarCollapsed={sidebarCollapsed}
                    setSidebarCollapsed={setSidebarCollapsed}
                />

                <main className="authority-content">
                    {children}
                </main>

            </div>
        </div>
    );
}

export default AuthorityLayout;