import React from "react";
import { Link } from "react-router-dom";
import { useLanguage } from "../context/LanguageContext";

export default function CallToAction() {
  const { t } = useLanguage();

  const scrollToFeatures = (e) => {
    e.preventDefault();
    const el = document.getElementById("features");
    if (el) el.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <section className="sv-section sv-cta-section">
      <div className="sv-landing-container">
        <h2 className="sv-cta-title">{t("ctaTitle")}</h2>
        <p className="sv-cta-desc">{t("ctaDesc")}</p>

        <div className="sv-cta-buttons">
          <Link
            to="/signup"
            className="sv-btn-green sv-btn-primary"
            style={{ padding: "16px 36px", fontSize: "1.05rem" }}
          >
            <span>🚀 {t("ctaGetStarted")}</span>
          </Link>

          <a
            href="#features"
            onClick={scrollToFeatures}
            className="sv-btn-secondary"
            style={{ padding: "16px 32px", fontSize: "1.05rem", background: "rgba(255,255,255,0.15)", color: "#ffffff", borderColor: "rgba(255,255,255,0.3)" }}
          >
            <span>✨ {t("ctaExplore")}</span>
          </a>
        </div>
      </div>
    </section>
  );
}

