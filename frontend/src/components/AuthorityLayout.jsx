import { useState } from "react";
import { Outlet } from "react-router-dom";

import AuthoritySidebar from "./AuthoritySidebar";
import AuthorityTopbar from "./AuthorityTopbar";

import "./AuthorityLayout.css";

function AuthorityLayout() {
  /* ============================================================
     DESKTOP SIDEBAR STATE
     ============================================================ */
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  /* ============================================================
     MOBILE SIDEBAR STATE
     ============================================================ */
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  /* ============================================================
     TOPBAR SEARCH STATE
     ============================================================ */
  const [search, setSearch] = useState("");

  return (
    <div
      className={`authority-layout ${
        sidebarCollapsed ? "sidebar-collapsed" : ""
      }`}
    >
      {/* =====================================================
          ONE SIDEBAR
      ===================================================== */}
      <AuthoritySidebar
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed((previous) => !previous)}
        mobileOpen={mobileSidebarOpen}
        onMobileClose={() => setMobileSidebarOpen(false)}
      />

      {/* =====================================================
          MAIN AUTHORITY AREA
      ===================================================== */}
      <div className="authority-main">
        {/* =================================================
            ONE TOPBAR
        ================================================= */}
        <AuthorityTopbar
          search={search}
          setSearch={setSearch}
          sidebarCollapsed={sidebarCollapsed}
          setSidebarCollapsed={setSidebarCollapsed}
          onMenuClick={() => setMobileSidebarOpen(true)}
        />

        {/* =================================================
            CURRENT AUTHORITY PAGE
        ================================================= */}
        <main className="authority-content">
          <Outlet
            context={{
              search,
              setSearch,
            }}
          />
        </main>
      </div>
    </div>
  );
}

export default AuthorityLayout;