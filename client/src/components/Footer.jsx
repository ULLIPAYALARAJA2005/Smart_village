import React from "react";
import { Link } from "react-router-dom";
import { useLanguage } from "../context/LanguageContext";

export default function Footer() {
  const { lang, setLang, t } = useLanguage();
  const currentYear = new Date().getFullYear();

  const scrollTo = (id) => {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <footer className="sv-footer">
      <div className="sv-landing-container">
        <div className="sv-footer-grid">
          {/* Brand Info */}
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "14px" }}>
              <span style={{ fontSize: "1.8rem" }}>🏛️</span>
              <span className="sv-footer-brand-title">SMART VILLAGE</span>
            </div>
            <p className="sv-footer-desc">
              {t("footerDesc")}
            </p>
          </div>

          {/* Quick Navigation */}
          <div>
            <h4 className="sv-footer-col-title">{t("footerQuickLinks")}</h4>
            <ul className="sv-footer-links">
              <li>
                <a href="#hero" onClick={(e) => { e.preventDefault(); scrollTo("hero"); }}>
                  {t("navHome")}
                </a>
              </li>
              <li>
                <a href="#why-smart-village" onClick={(e) => { e.preventDefault(); scrollTo("why-smart-village"); }}>
                  {t("navAbout")}
                </a>
              </li>
              <li>
                <a href="#features" onClick={(e) => { e.preventDefault(); scrollTo("features"); }}>
                  {t("navFeatures")}
                </a>
              </li>
              <li>
                <a href="#how-it-works" onClick={(e) => { e.preventDefault(); scrollTo("how-it-works"); }}>
                  {t("navHowItWorks")}
                </a>
              </li>
              <li>
                <a href="#announcements" onClick={(e) => { e.preventDefault(); scrollTo("announcements"); }}>
                  {t("navAnnouncements")}
                </a>
              </li>
            </ul>
          </div>

          {/* Portal Access Links */}
          <div>
            <h4 className="sv-footer-col-title">{t("footerPortals")}</h4>
            <ul className="sv-footer-links">
              <li>
                <Link to="/villager">{t("role1Name")}</Link>
              </li>
              <li>
                <Link to="/worker">{t("role2Name")}</Link>
              </li>
              <li>
                <Link to="/admin">{t("role3Name")}</Link>
              </li>
              <li>
                <Link to="/login">{t("navLogin")}</Link>
              </li>
              <li>
                <Link to="/signup">{t("navGetStarted")}</Link>
              </li>
            </ul>
          </div>

          {/* Language & Accessibility */}
          <div>
            <h4 className="sv-footer-col-title">{lang === "te" ? "భాష & సౌలభ్యం" : "Language & Access"}</h4>
            <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginBottom: "16px" }}>
              <button
                className="sv-btn-lang"
                onClick={() => setLang("en")}
                style={{
                  background: lang === "en" ? "var(--sv-green-subtle)" : "transparent",
                  color: lang === "en" ? "var(--sv-green-dark)" : "#CBD5E1",
                  borderColor: lang === "en" ? "var(--sv-green)" : "rgba(255,255,255,0.2)",
                  justifyContent: "flex-start",
                }}
              >
                🇺🇸 English {lang === "en" ? "✓" : ""}
              </button>
              <button
                className="sv-btn-lang"
                onClick={() => setLang("te")}
                style={{
                  background: lang === "te" ? "var(--sv-green-subtle)" : "transparent",
                  color: lang === "te" ? "var(--sv-green-dark)" : "#CBD5E1",
                  borderColor: lang === "te" ? "var(--sv-green)" : "rgba(255,255,255,0.2)",
                  justifyContent: "flex-start",
                }}
              >
                🇮🇳 తెలుగు (Telugu) {lang === "te" ? "✓" : ""}
              </button>
            </div>
          </div>
        </div>

        {/* Bottom copyright & tagline */}
        <div className="sv-footer-bottom">
          <span>
            © {currentYear} <strong>SMART VILLAGE</strong>. {t("footerRights")}
          </span>
          <span style={{ color: "var(--sv-green-light)", fontWeight: "600" }}>
            {lang === "te" ? "ఆదర్శ గ్రామాల నిర్మాణంలో భాగస్వామ్యం" : "A Smarter Village. A Better Tomorrow."}
          </span>
        </div>
      </div>
    </footer>
  );
}
