import React, { useState } from "react";
import TopNavbar from "./TopNavbar";
import Sidebar from "./Sidebar";

export default function MainLayout({
  pageTitle,
  role = "villager",
  userName = "User",
  navSections = [],
  activeNavKey,
  onSelectNavKey,
  onLogout,
  children,
}) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);

  return (
    <div className="gov-layout">
      {/* Sticky Top Navigation */}
      <TopNavbar
        pageTitle={pageTitle}
        role={role}
        userName={userName}
        onToggleSidebar={() => setMobileDrawerOpen(!mobileDrawerOpen)}
        onLogout={onLogout}
      />

      <div className="gov-main-container">
        {/* Desktop Sidebar */}
        <div className="desktop-sidebar-wrapper">
          <Sidebar
            role={role}
            activeKey={activeNavKey}
            onSelectKey={onSelectNavKey}
            navSections={navSections}
            isCollapsed={isCollapsed}
            onToggleCollapse={() => setIsCollapsed(!isCollapsed)}
          />
        </div>

        {/* Mobile Slide-in Drawer */}
        {mobileDrawerOpen && (
          <Sidebar
            role={role}
            activeKey={activeNavKey}
            onSelectKey={onSelectNavKey}
            navSections={navSections}
            isMobileDrawer={true}
            onCloseMobileDrawer={() => setMobileDrawerOpen(false)}
          />
        )}

        {/* Main Content Area */}
        <main className="gov-content-area">
          {children}
        </main>
      </div>
    </div>
  );
}
