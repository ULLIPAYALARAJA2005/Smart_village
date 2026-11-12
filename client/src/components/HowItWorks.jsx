import React from "react";
import { useLanguage } from "../context/LanguageContext";

export default function HowItWorks() {
  const { lang, t } = useLanguage();

  const steps = [
    {
      num: 1,
      icon: "📢",
      title: t("step1Title"),
      desc: t("step1Desc"),
      badge: lang === "te" ? "దశ 1: నివేదిక" : "Step 1: Citizen",
    },
    {
      num: 2,
      icon: "🏛️",
      title: t("step2Title"),
      desc: t("step2Desc"),
      badge: lang === "te" ? "దశ 2: ధృవీకరణ" : "Step 2: Admin",
    },
    {
      num: 3,
      icon: "👷‍♂️",
      title: t("step3Title"),
      desc: t("step3Desc"),
      badge: lang === "te" ? "దశ 3: కేటాయింపు" : "Step 3: Worker",
    },
    {
      num: 4,
      icon: "✅",
      title: t("step4Title"),
      desc: t("step4Desc"),
      badge: lang === "te" ? "దశ 4: పరిష్కారం" : "Step 4: Resolved",
    },
  ];

  return (
    <section id="how-it-works" className="sv-section sv-how-section">
      <div className="sv-landing-container">
        {/* Section Header */}
        <div className="sv-section-header">
          <div className="sv-badge sv-badge-blue">
            <span>🔄</span>
            <span>{lang === "te" ? "సులభమైన ప్రక్రియ" : "Workflow"}</span>
          </div>
          <h2 className="sv-section-title">{t("howTitle")}</h2>
          <p className="sv-section-subtitle">{t("howSubtitle")}</p>
        </div>

        {/* 4-Step Process Timeline Cards */}
        <div className="sv-steps-grid">
          {steps.map((step) => (
            <div key={step.num} className="sv-step-card">
              <div className="sv-step-badge">{step.num}</div>
              <div className="sv-step-icon">{step.icon}</div>
              <span
                style={{
                  fontSize: "0.78rem",
                  fontWeight: "700",
                  color: "var(--sv-green-dark)",
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                  marginBottom: "6px",
                }}
              >
                {step.badge}
              </span>
              <h3 className="sv-step-title">{step.title}</h3>
              <p className="sv-step-desc">{step.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
