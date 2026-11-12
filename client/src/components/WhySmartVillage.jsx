import React from "react";
import { useLanguage } from "../context/LanguageContext";

export default function WhySmartVillage() {
  const { lang, t } = useLanguage();

  const beforeItems = [
    {
      icon: "🚶‍♂️",
      title: lang === "te" ? "కార్యాలయానికి నడక" : "Physical Office Visits",
      desc: t("before1"),
    },
    {
      icon: "❓",
      title: lang === "te" ? "తెలియని పరిస్థితి" : "Unclear Status",
      desc: t("before2"),
    },
    {
      icon: "📢",
      title: lang === "te" ? "చేరని సమాచారం" : "Missed Announcements",
      desc: t("before3"),
    },
    {
      icon: "🗺️",
      title: lang === "te" ? "దారి వెతుక్కోవడం" : "Difficult Navigation",
      desc: t("before4"),
    },
    {
      icon: "📑",
      title: lang === "te" ? "కాగితపు రికార్డులు" : "Fragmented Records",
      desc: t("before5"),
    },
  ];

  const afterItems = [
    {
      icon: "📱",
      title: lang === "te" ? "తక్షణ డిజిటల్ నమోదు" : "Instant Digital Filing",
      desc: t("after1"),
    },
    {
      icon: "⏱️",
      title: lang === "te" ? "ప్రత్యక్ష ట్రాకింగ్" : "Live Progress & Deadlines",
      desc: t("after2"),
    },
    {
      icon: "🔊",
      title: lang === "te" ? "ద్విభాషా ఆడియో నోటీసులు" : "Bilingual Audio Broadcasts",
      desc: t("after3"),
    },
    {
      icon: "📍",
      title: lang === "te" ? "గూగుల్ మ్యాప్స్ GPS" : "Turn-by-Turn GPS Guidance",
      desc: t("after4"),
    },
    {
      icon: "📊",
      title: lang === "te" ? "కేంద్రీకృత డ్యాష్‌బోర్డ్" : "Centralized Admin Dashboard",
      desc: t("after5"),
    },
  ];

  return (
    <section id="why-smart-village" className="sv-section sv-why-section">
      <div className="sv-landing-container">
        {/* Section Header */}
        <div className="sv-section-header">
          <div className="sv-badge sv-badge-blue">
            <span>💡</span>
            <span>{lang === "te" ? "పరిష్కారాలు & ప్రాముఖ్యత" : "Civic Transformation"}</span>
          </div>
          <h2 className="sv-section-title">{t("whyTitle")}</h2>
          <p className="sv-section-subtitle">{t("whySubtitle")}</p>
        </div>

        {/* Side-by-side Before vs After Comparison Grid */}
        <div className="sv-comparison-grid">
          {/* Before Card */}
          <div className="sv-compare-card before">
            <div className="sv-compare-header">
              <div className="sv-compare-icon">
                ❌
              </div>
              <div>
                <h3 className="sv-compare-title">{t("whyBeforeTitle")}</h3>
                <span style={{ fontSize: "0.85rem", color: "#DC2626", fontWeight: "600" }}>
                  {lang === "te" ? "గతంలోని పాత పద్ధతులు" : "Traditional Manual Bottlenecks"}
                </span>
              </div>
            </div>

            <ul className="sv-compare-list">
              {beforeItems.map((item, idx) => (
                <li key={idx} className="sv-compare-item">
                  <span className="sv-bullet-icon">{item.icon}</span>
                  <div>
                    <strong style={{ display: "block", color: "#991B1B", marginBottom: "2px" }}>
                      {item.title}
                    </strong>
                    <span>{item.desc}</span>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          {/* After Card (Smart Village) */}
          <div className="sv-compare-card after">
            <div className="sv-compare-header">
              <div className="sv-compare-icon">
                ✨
              </div>
              <div>
                <h3 className="sv-compare-title">{t("whyAfterTitle")}</h3>
                <span style={{ fontSize: "0.85rem", color: "var(--sv-green-dark)", fontWeight: "600" }}>
                  {lang === "te" ? "స్మార్ట్ విలేజ్ అందించే సాధికారత" : "Intelligent Digital Civic Platform"}
                </span>
              </div>
            </div>

            <ul className="sv-compare-list">
              {afterItems.map((item, idx) => (
                <li key={idx} className="sv-compare-item">
                  <span className="sv-bullet-icon">{item.icon}</span>
                  <div>
                    <strong style={{ display: "block", color: "var(--sv-green-dark)", marginBottom: "2px" }}>
                      {item.title}
                    </strong>
                    <span>{item.desc}</span>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}

