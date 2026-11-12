import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useLanguage } from "../context/LanguageContext";
import { ttsService } from "../services/ttsService";

export default function Navbar() {
  const { lang, toggleLang, t } = useLanguage();
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const handleListenIntro = () => {
    if (isSpeaking) {
      ttsService.stop();
      setIsSpeaking(false);
      return;
    }

    const speechText = t("heroIntroSpeech");
    setIsSpeaking(true);

    ttsService.speak({
      text: speechText,
      language: lang === "te" ? "te-IN" : "en-IN",
      onEnd: () => setIsSpeaking(false),
      onError: () => setIsSpeaking(false),
    });
  };

  const scrollToSection = (id) => {
    setMobileMenuOpen(false);
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <header className={`sv-navbar-wrapper ${isScrolled ? "sv-navbar-scrolled" : ""}`}>
      <div className="sv-landing-container">
        <nav className="sv-navbar">
          {/* Brand Logo & Name */}
          <div
            className="sv-nav-brand"
            onClick={() => {
              window.scrollTo({ top: 0, behavior: "smooth" });
            }}
          >
            <div className="sv-nav-logo-icon">
              🏛️
            </div>
            <div className="sv-nav-brand-text">
              <span className="sv-nav-brand-title">SMART VILLAGE</span>
              <span className="sv-nav-brand-tagline">{t("brandTagline")}</span>
            </div>
          </div>

          {/* Navigation Links (Desktop & Collapsible Mobile) */}
          <ul className={`sv-nav-links ${mobileMenuOpen ? "active" : ""}`}>
            <li>
              <a
                href="#hero"
                className="sv-nav-link"
                onClick={(e) => {
                  e.preventDefault();
                  scrollToSection("hero");
                }}
              >
                {t("navHome")}
              </a>
            </li>
            <li>
              <a
                href="#why-smart-village"
                className="sv-nav-link"
                onClick={(e) => {
                  e.preventDefault();
                  scrollToSection("why-smart-village");
                }}
              >
                {t("navAbout")}
              </a>
            </li>
            <li>
              <a
                href="#features"
                className="sv-nav-link"
                onClick={(e) => {
                  e.preventDefault();
                  scrollToSection("features");
                }}
              >
                {t("navFeatures")}
              </a>
            </li>
            <li>
              <a
                href="#how-it-works"
                className="sv-nav-link"
                onClick={(e) => {
                  e.preventDefault();
                  scrollToSection("how-it-works");
                }}
              >
                {t("navHowItWorks")}
              </a>
            </li>
            <li>
              <a
                href="#announcements"
                className="sv-nav-link"
                onClick={(e) => {
                  e.preventDefault();
                  scrollToSection("announcements");
                }}
              >
                {t("navAnnouncements")}
              </a>
            </li>
            <li>
              <a
                href="#roles"
                className="sv-nav-link"
                onClick={(e) => {
                  e.preventDefault();
                  scrollToSection("roles");
                }}
              >
                {t("navRoles")}
              </a>
            </li>
            <li>
              <a
                href="#contact"
                className="sv-nav-link"
                onClick={(e) => {
                  e.preventDefault();
                  scrollToSection("contact");
                }}
              >
                {t("navContact")}
              </a>
            </li>

            {/* Mobile-Only Actions Inside Drawer */}
            {mobileMenuOpen && (
              <li style={{ display: "flex", flexDirection: "column", gap: "10px", marginTop: "12px" }}>
                <button
                  className="sv-btn-lang"
                  onClick={() => {
                    toggleLang();
                    setMobileMenuOpen(false);
                  }}
                >
                  🌐 {t("langToggleName")}
                </button>
                <button
                  className={`sv-btn-listen ${isSpeaking ? "speaking" : ""}`}
                  onClick={handleListenIntro}
                >
                  {isSpeaking ? "⏹️ " + t("heroStopAudioBtn") : "🔊 " + t("navListen")}
                </button>
                <Link to="/login" className="sv-btn-secondary" style={{ textAlign: "center" }}>
                  {t("navLogin")}
                </Link>
                <Link to="/signup" className="sv-btn-primary" style={{ textAlign: "center" }}>
                  {t("navGetStarted")}
                </Link>
              </li>
            )}
          </ul>

          {/* Right Action Buttons */}
          <div className="sv-nav-actions">
            {/* Language Switcher */}
            <button
              className="sv-btn-lang"
              onClick={toggleLang}
              title={lang === "en" ? "తెలుగులోకి మార్చండి" : "Switch to English"}
              aria-label="Language selector"
            >
              🌐 <strong>{t("langToggleName")}</strong>
            </button>

            {/* Accessibility Listen Button */}
            <button
              className={`sv-btn-listen ${isSpeaking ? "speaking" : ""}`}
              onClick={handleListenIntro}
              title={isSpeaking ? t("heroStopAudioBtn") : t("heroListenBtn")}
              aria-label="Listen to page introduction"
            >
              {isSpeaking ? "⏹️" : "🔊"} {isSpeaking ? t("heroStopAudioBtn") : t("navListen")}
            </button>

            {/* Login & Get Started */}
            <Link to="/login" className="sv-btn-login">
              {t("navLogin")}
            </Link>
            <Link to="/signup" className="sv-btn-primary">
              {t("navGetStarted")}
            </Link>

            {/* Mobile Hamburger Menu Toggle */}
            <button
              className="sv-mobile-toggle"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label="Toggle navigation menu"
            >
              {mobileMenuOpen ? "✕" : "☰"}
            </button>
          </div>
        </nav>
      </div>
    </header>
  );
}
