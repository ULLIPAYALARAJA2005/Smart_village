import React from "react";
import { useLanguage } from "../context/LanguageContext";

export default function ImpactBenefits() {
  const { lang, t } = useLanguage();

  const benefits = [
    {
      icon: "⚡",
      title: t("benefit1Title"),
      desc: t("benefit1Desc"),
    },
    {
      icon: "🔍",
      title: t("benefit2Title"),
      desc: t("benefit2Desc"),
    },
    {
      icon: "🤝",
      title: t("benefit3Title"),
      desc: t("benefit3Desc"),
    },
    {
      icon: "📍",
      title: t("benefit4Title"),
      desc: t("benefit4Desc"),
    },
    {
      icon: "🚨",
      title: t("benefit5Title"),
      desc: t("benefit5Desc"),
    },
    {
      icon: "📊",
      title: t("benefit6Title"),
      desc: t("benefit6Desc"),
    },
  ];

  return (
    <section id="impact" className="sv-section sv-impact-section">
      <div className="sv-landing-container">
        {/* Section Header */}
        <div className="sv-section-header">
          <div className="sv-badge sv-badge-green" style={{ background: "rgba(16, 185, 129, 0.2)", borderColor: "rgba(16, 185, 129, 0.4)", color: "#34D399" }}>
            <span>🌱</span>
            <span>{lang === "te" ? "ప్రభావం & ఫలితాలు" : "Civic Impact"}</span>
          </div>
          <h2 className="sv-section-title">{t("impactTitle")}</h2>
          <p className="sv-section-subtitle">{t("impactSubtitle")}</p>
        </div>

        {/* 6 Benefit Cards Grid */}
        <div className="sv-impact-grid">
          {benefits.map((b, idx) => (
            <div key={idx} className="sv-impact-card">
              <span className="sv-impact-icon">{b.icon}</span>
              <h3 className="sv-impact-title">{b.title}</h3>
              <p className="sv-impact-desc">{b.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

