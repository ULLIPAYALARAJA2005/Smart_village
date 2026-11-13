import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useLanguage } from "../context/LanguageContext";

export default function TopNavbar({
  pageTitle = "Dashboard",
  role = "villager",
  userName = "User",
  onToggleSidebar,
  onLogout
}) {
  const { lang, toggleLang, t } = useLanguage();
  const [profileOpen, setProfileOpen] = useState(false);
  const navigate = useNavigate();

  const handleProfileClick = () => {
    setProfileOpen(false);
    if (role === "admin") navigate("/admin");
    else if (role === "worker") navigate("/worker");
    else navigate("/villager");
  };

  return (
    <header className="gov-topbar">
      <div className="gov-topbar-left">
        {onToggleSidebar && (
          <button
            className="gov-btn-outline"
            style={{ padding: "0.4rem 0.6rem", fontSize: "1.1rem" }}
            onClick={onToggleSidebar}
            aria-label="Toggle navigation"
            title="Toggle Menu"
          >
            ☰
          </button>
        )}

        <Link to="/" className="gov-brand">
          <div className="gov-brand-emblem">🏛️</div>
          <div className="gov-brand-meta">
            <span className="gov-brand-name">Fix My Village</span>
            <span className="gov-brand-tagline">Smart Village Portal</span>
          </div>
        </Link>

        {pageTitle && (
          <div className="gov-breadcrumb">
            <span style={{ color: "var(--color-text-muted)" }}>/</span>
            <span style={{ fontWeight: 600, color: "var(--color-text-primary)" }}>{pageTitle}</span>
          </div>
        )}
      </div>

      <div className="gov-topbar-right">
        {/* Language selector toggle */}
        <button
          onClick={toggleLang}
          className="gov-btn-lang"
          title={lang === "en" ? "తెలుగులోకి మార్చు" : "Switch to English"}
        >
          🌐 <span>{lang === "en" ? "తెలుగు" : "English"}</span>
        </button>

        {/* User profile dropdown */}
        <div className="gov-user-menu">
          <button
            className="gov-user-trigger"
            onClick={() => setProfileOpen(!profileOpen)}
            aria-expanded={profileOpen}
          >
            <div className="gov-avatar">
              {userName ? userName.charAt(0).toUpperCase() : "U"}
            </div>
            <div className="gov-user-info" style={{ display: "none", "@media (min-width: 640px)": { display: "flex" } }}>
              <span className="gov-user-name">{userName}</span>
              <span className="gov-user-role">{role}</span>
            </div>
            <span style={{ fontSize: "0.75rem", color: "var(--color-text-secondary)" }}>▼</span>
          </button>

          {profileOpen && (
            <div className="gov-dropdown-menu">
              <div style={{ padding: "0.6rem 1rem", borderBottom: "1px solid var(--color-border)" }}>
                <div style={{ fontWeight: 600, fontSize: "0.85rem", color: "var(--color-text-primary)" }}>{userName}</div>
                <div style={{ fontSize: "0.72rem", color: "var(--color-text-secondary)", textTransform: "capitalize" }}>Role: {role}</div>
              </div>
              
              <button className="gov-dropdown-item" onClick={handleProfileClick}>
                <span>👤</span> <span>{t("navHome") || "Home Dashboard"}</span>
              </button>
              
              <Link to="/" className="gov-dropdown-item" onClick={() => setProfileOpen(false)}>
                <span>🏛️</span> <span>Village Portal Home</span>
              </Link>

              {role === "villager" && (
                <Link to="/villager/feedback" className="gov-dropdown-item" onClick={() => setProfileOpen(false)}>
                  <span>⭐</span> <span>Provide Feedback</span>
                </Link>
              )}
              {role === "admin" && (
                <Link to="/admin/feedback" className="gov-dropdown-item" onClick={() => setProfileOpen(false)}>
                  <span>⭐</span> <span>Villager Feedback</span>
                </Link>
              )}

              <div style={{ borderTop: "1px solid var(--color-border)", margin: "0.3rem 0" }}></div>

              <button
                className="gov-dropdown-item danger"
                onClick={() => {
                  setProfileOpen(false);
                  if (onLogout) onLogout();
                }}
              >
                <span>🚪</span> <span>Logout</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
