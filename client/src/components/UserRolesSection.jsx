import React from "react";
import { useNavigate } from "react-router-dom";
import { useLanguage } from "../context/LanguageContext";

export default function UserRolesSection() {
  const { lang, t } = useLanguage();
  const navigate = useNavigate();

  const handleRolePortalClick = (targetRole, targetRoute) => {
    const currentRole = localStorage.getItem("role");
    if (currentRole === targetRole) {
      navigate(targetRoute);
    } else {
      navigate(`/login`);
    }
  };

  const roles = [
    {
      role: "villager",
      route: "/villager",
      icon: "🏡",
      title: t("role1Name"),
      desc: t("role1Desc"),
      btnText: t("role1Btn"),
      btnClass: "sv-btn-primary",
      features: lang === "te" 
        ? ["వాయిస్ ద్వారా ఫిర్యాదు నమోదు", "తాజా నోటీసులను వినండి", "లైవ్ పరిష్కార ట్రాకింగ్"]
        : ["Voice & Text Issue Reporting", "Audio Announcements", "Live Timeline Tracking"],
    },
    {
      role: "worker",
      route: "/worker",
      icon: "🛠️",
      title: t("role2Name"),
      desc: t("role2Desc"),
      btnText: t("role2Btn"),
      btnClass: "sv-btn-green sv-btn-primary",
      features: lang === "te"
        ? ["వర్క్ ఆర్డర్స్ డ్యాష్‌బోర్డ్", "గూగుల్ మ్యాప్స్ GPS నావిగేషన్", "పని పూర్తి చేసిన ఫోటో ప్రూఫ్"]
        : ["Task Assignment Orders", "1-Click GPS Navigation", "Photo Completion Uploads"],
    },
    {
      role: "admin",
      route: "/admin",
      icon: "🏛️",
      title: t("role3Name"),
      desc: t("role3Desc"),
      btnText: t("role3Btn"),
      btnClass: "sv-btn-secondary",
      features: lang === "te"
        ? ["ఫిర్యాదుల కేటాయింపు & గడువులు", "ద్విభాషా ప్రకటనల ప్రచురణ", "గ్రామ అభివృద్ధి విశ్లేషణలు"]
        : ["Complaint Review & Assignment", "Bilingual Notice Publishing", "Department Performance Analytics"],
    },
  ];

  return (
    <section id="roles" className="sv-section sv-roles-section">
      <div className="sv-landing-container">
        {/* Section Header */}
        <div className="sv-section-header">
          <div className="sv-badge sv-badge-green">
            <span>👥</span>
            <span>{lang === "te" ? "వినియోగదారు పోర్టల్స్" : "Role Workspaces"}</span>
          </div>
          <h2 className="sv-section-title">{t("rolesTitle")}</h2>
          <p className="sv-section-subtitle">{t("rolesSubtitle")}</p>
        </div>

        {/* 3 Role Cards Grid */}
        <div className="sv-roles-grid">
          {roles.map((r, idx) => (
            <div key={idx} className="sv-role-card">
              <div className="sv-role-icon">{r.icon}</div>
              <h3 className="sv-role-title">{r.title}</h3>
              <p className="sv-role-desc">{r.desc}</p>

              <ul style={{ listStyle: "none", padding: 0, margin: "0 0 24px 0", display: "flex", flexDirection: "column", gap: "8px" }}>
                {r.features.map((feat, fIdx) => (
                  <li key={fIdx} style={{ fontSize: "0.88rem", color: "var(--sv-text-muted)", display: "flex", alignItems: "center", gap: "8px" }}>
                    <span style={{ color: "var(--sv-green-dark)", fontWeight: "bold" }}>✓</span>
                    <span>{feat}</span>
                  </li>
                ))}
              </ul>

              <button
                type="button"
                className={r.btnClass}
                onClick={() => handleRolePortalClick(r.role, r.route)}
                style={{ width: "100%", justifyContent: "center", padding: "12px 20px" }}
              >
                <span>{r.btnText} →</span>
              </button>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

