import React from "react";

export default function Sidebar({
  role = "villager",
  activeKey = "dashboard",
  onSelectKey,
  navSections = [],
  isCollapsed = false,
  onToggleCollapse,
  isMobileDrawer = false,
  onCloseMobileDrawer,
}) {
  const content = (
    <aside className={`gov-sidebar ${isCollapsed ? "collapsed" : ""}`} style={isMobileDrawer ? { width: "100%", height: "100%", position: "static" } : {}}>
      <div className="gov-sidebar-nav">
        {navSections.map((section, idx) => (
          <div key={idx} style={{ marginBottom: "0.5rem" }}>
            {section.title && !isCollapsed && (
              <div className="gov-sidebar-heading">{section.title}</div>
            )}
            {section.items.map((item) => {
              const isActive = activeKey === item.key;
              return (
                <button
                  key={item.key}
                  className={`gov-nav-item ${isActive ? "active" : ""}`}
                  onClick={() => {
                    if (onSelectKey) onSelectKey(item.key);
                    if (isMobileDrawer && onCloseMobileDrawer) onCloseMobileDrawer();
                  }}
                  title={isCollapsed ? item.label : undefined}
                >
                  <span className="gov-nav-icon">{item.icon}</span>
                  {!isCollapsed && <span>{item.label}</span>}
                  {!isCollapsed && item.badge !== undefined && (
                    <span className="gov-nav-badge">{item.badge}</span>
                  )}
                </button>
              );
            })}
          </div>
        ))}
      </div>

      {!isMobileDrawer && (
        <div className="gov-sidebar-footer">
          <button
            className="gov-collapse-btn"
            onClick={onToggleCollapse}
            title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            <span>{isCollapsed ? "»" : "«"}</span>
            {!isCollapsed && <span>Collapse Sidebar</span>}
          </button>
        </div>
      )}
    </aside>
  );

  if (isMobileDrawer) {
    return (
      <div className="gov-drawer-overlay" onClick={onCloseMobileDrawer}>
        <div className="gov-mobile-drawer" onClick={(e) => e.stopPropagation()}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "1rem", borderBottom: "1px solid var(--color-border)" }}>
            <div style={{ fontWeight: 700, color: "var(--color-primary)", display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <span>🏛️</span> Menu
            </div>
            <button
              onClick={onCloseMobileDrawer}
              style={{ background: "none", border: "none", fontSize: "1.2rem", cursor: "pointer", color: "var(--color-text-secondary)" }}
            >
              ✕
            </button>
          </div>
          {content}
        </div>
      </div>
    );
  }

  return content;
}
