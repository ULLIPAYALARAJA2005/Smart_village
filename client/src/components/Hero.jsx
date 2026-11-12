import React, { useState } from "react";
import { Link } from "react-router-dom";
import { useLanguage } from "../context/LanguageContext";
import { ttsService } from "../services/ttsService";

export default function Hero() {
  const { lang, t } = useLanguage();
  const [isPlaying, setIsPlaying] = useState(false);

  const handleListen = () => {
    if (isPlaying) {
      ttsService.stop();
      setIsPlaying(false);
      return;
    }

    const speechText = t("heroIntroSpeech");
    setIsPlaying(true);

    ttsService.speak({
      text: speechText,
      language: lang === "te" ? "te-IN" : "en-IN",
      onEnd: () => setIsPlaying(false),
      onError: () => setIsPlaying(false),
    });
  };

  const scrollToFeatures = (e) => {
    e.preventDefault();
    const el = document.getElementById("features");
    if (el) el.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <section id="hero" className="sv-hero-section">
      <div className="sv-landing-container">
        <div className="sv-hero-grid">
          {/* Left Column: Heading, Subtitle, CTAs */}
          <div className="sv-hero-content">
            <div className="sv-badge sv-badge-green">
              <span>🏛️</span>
              <span>{lang === "te" ? "గ్రామ పంచాయతీ డిజిటల్ పాలన" : "Gram Panchayat Digital Governance"}</span>
            </div>

            <h1 className="sv-hero-title">
              <span className="sv-hero-title-gradient">{t("heroTitle")}</span>
            </h1>

            <h2 className="sv-hero-subtitle">
              {t("heroSubtitle")}
            </h2>

            <p className="sv-hero-desc">
              {t("heroDescription")}
            </p>

            {/* Action Buttons */}
            <div className="sv-hero-ctas">
              <a
                href="#features"
                onClick={scrollToFeatures}
                className="sv-btn-primary"
                style={{ padding: "14px 28px", fontSize: "1rem" }}
              >
                <span>🔍 {t("heroExploreBtn")}</span>
              </a>

              <Link
                to="/signup"
                className="sv-btn-green sv-btn-primary"
                style={{ padding: "14px 28px", fontSize: "1rem" }}
              >
                <span>🚀 {t("heroGetStartedBtn")}</span>
              </Link>

              <button
                type="button"
                onClick={handleListen}
                className={`sv-btn-secondary ${isPlaying ? "sv-btn-listen speaking" : ""}`}
                style={{ padding: "13px 22px", fontSize: "0.95rem" }}
                aria-label="Listen to Introduction"
              >
                <span>{isPlaying ? "⏹️" : "🔊"}</span>
                <span>{isPlaying ? t("heroStopAudioBtn") : t("heroListenBtn")}</span>
              </button>
            </div>

            {/* Trust Indicators / Stats */}
            <div className="sv-hero-stats-row">
              <div className="sv-hero-stat">
                <span className="sv-hero-stat-val">3-Way</span>
                <span className="sv-hero-stat-lbl">
                  {lang === "te" ? "పౌరులు • వర్కర్లు • అడ్మిన్" : "Villagers • Workers • Admin"}
                </span>
              </div>
              <div className="sv-hero-stat">
                <span className="sv-hero-stat-val">Bilingual</span>
                <span className="sv-hero-stat-lbl">
                  {lang === "te" ? "తెలుగు మరియు ఇంగ్లీష్" : "English & తెలుగు Support"}
                </span>
              </div>
              <div className="sv-hero-stat">
                <span className="sv-hero-stat-val">AI Voice & GPS</span>
                <span className="sv-hero-stat-lbl">
                  {lang === "te" ? "వాయిస్ & ఖచ్చితమైన మ్యాపింగ్" : "Voice Input & Pinpoint Map"}
                </span>
              </div>
            </div>
          </div>

          {/* Right Column: Custom Village Vector Art Card */}
          <div className="sv-hero-visual">
            <div className="sv-hero-art-card">
              {/* Floating Status Badges */}
              <div className="sv-floating-pill sv-pill-1">
                <span style={{ fontSize: "1.2rem" }}>🎙️</span>
                <span>{lang === "te" ? "వాయిస్ ద్వారా సులభ ఫిర్యాదు" : "Voice AI Complaint System"}</span>
              </div>

              <div className="sv-floating-pill sv-pill-2">
                <span style={{ fontSize: "1.2rem" }}>📍</span>
                <span>{lang === "te" ? "ఖచ్చితమైన GPS వర్కర్ నావిగేషన్" : "Live GPS Worker Navigation"}</span>
              </div>

              {/* Bespoke SVG Illustration: Indian Smart Village Concept */}
              <svg
                className="sv-hero-illustration-svg"
                viewBox="0 0 600 480"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <defs>
                  <linearGradient id="skyGrad" x1="0" y1="0" x2="0" y2="480" gradientUnits="userSpaceOnUse">
                    <stop offset="0%" stopColor="#E0F2FE" />
                    <stop offset="60%" stopColor="#F0FDF4" />
                    <stop offset="100%" stopColor="#DCFCE7" />
                  </linearGradient>

                  <linearGradient id="sunGrad" x1="0" y1="0" x2="80" y2="80" gradientUnits="userSpaceOnUse">
                    <stop offset="0%" stopColor="#FDE047" />
                    <stop offset="100%" stopColor="#F59E0B" />
                  </linearGradient>

                  <linearGradient id="panchayatGrad" x1="0" y1="0" x2="0" y2="180" gradientUnits="userSpaceOnUse">
                    <stop offset="0%" stopColor="#0A2540" />
                    <stop offset="100%" stopColor="#1E3A8A" />
                  </linearGradient>

                  <linearGradient id="roadGrad" x1="0" y1="0" x2="0" y2="150" gradientUnits="userSpaceOnUse">
                    <stop offset="0%" stopColor="#94A3B8" />
                    <stop offset="100%" stopColor="#64748B" />
                  </linearGradient>

                  <linearGradient id="fieldGrad" x1="0" y1="0" x2="0" y2="180" gradientUnits="userSpaceOnUse">
                    <stop offset="0%" stopColor="#86EFAC" />
                    <stop offset="100%" stopColor="#22C55E" />
                  </linearGradient>
                </defs>

                {/* Sky & Soft Background */}
                <rect width="600" height="480" rx="20" fill="url(#skyGrad)" />

                {/* Sun & Solar Rays */}
                <circle cx="500" cy="90" r="45" fill="url(#sunGrad)" opacity="0.9" />
                <circle cx="500" cy="90" r="58" stroke="#FDE047" strokeWidth="2" strokeDasharray="6 6" opacity="0.6" />

                {/* Soft Rolling Hills */}
                <path d="M-20 340 Q 140 260, 310 320 T 620 290 L620 480 L-20 480 Z" fill="#BBF7D0" opacity="0.7" />
                <path d="M-20 370 Q 180 320, 380 360 T 620 350 L620 480 L-20 480 Z" fill="#86EFAC" opacity="0.8" />

                {/* Village Trees & Greenery */}
                {/* Left Tree */}
                <rect x="55" y="270" width="16" height="50" rx="3" fill="#854D0E" />
                <circle cx="63" cy="250" r="38" fill="#15803D" />
                <circle cx="80" cy="235" r="28" fill="#16A34A" />

                {/* Right Tree */}
                <rect x="525" y="280" width="16" height="50" rx="3" fill="#854D0E" />
                <circle cx="533" cy="260" r="40" fill="#15803D" />
                <circle cx="515" cy="245" r="30" fill="#22C55E" />

                {/* Village Wind Turbine / Clean Green Energy */}
                <line x1="120" y1="210" x2="120" y2="340" stroke="#047857" strokeWidth="4" />
                <circle cx="120" cy="210" r="6" fill="#047857" />
                <line x1="120" y1="210" x2="90" y2="185" stroke="#047857" strokeWidth="3" strokeLinecap="round" />
                <line x1="120" y1="210" x2="150" y2="190" stroke="#047857" strokeWidth="3" strokeLinecap="round" />
                <line x1="120" y1="210" x2="120" y2="245" stroke="#047857" strokeWidth="3" strokeLinecap="round" />

                {/* Digital Connectivity Waves (WiFi / Satellite) */}
                <circle cx="300" cy="140" r="25" stroke="#0284C7" strokeWidth="2.5" strokeDasharray="4 4" fill="none" opacity="0.7" />
                <circle cx="300" cy="140" r="45" stroke="#0284C7" strokeWidth="2" strokeDasharray="6 6" fill="none" opacity="0.5" />
                <circle cx="300" cy="140" r="70" stroke="#0284C7" strokeWidth="1.5" strokeDasharray="8 8" fill="none" opacity="0.3" />

                {/* Central Gram Panchayat Administrative Building */}
                {/* Steps & Base */}
                <rect x="200" y="320" width="200" height="15" rx="3" fill="#CBD5E1" />
                <rect x="210" y="305" width="180" height="15" rx="3" fill="#E2E8F0" />

                {/* Main Building Body */}
                <rect x="220" y="195" width="160" height="110" rx="6" fill="url(#panchayatGrad)" />

                {/* Roof Dome / Triangular Pediment */}
                <polygon points="210,195 300,140 390,195" fill="#07182C" />

                {/* Building Columns */}
                <rect x="240" y="210" width="12" height="95" rx="2" fill="#E2E8F0" />
                <rect x="270" y="210" width="12" height="95" rx="2" fill="#E2E8F0" />
                <rect x="318" y="210" width="12" height="95" rx="2" fill="#E2E8F0" />
                <rect x="348" y="210" width="12" height="95" rx="2" fill="#E2E8F0" />

                {/* Building Door */}
                <rect x="286" y="240" width="28" height="65" rx="4" fill="#0284C7" />
                <circle cx="306" cy="275" r="3" fill="#FDE047" />

                {/* Panchayat Flag */}
                <line x1="300" y1="140" x2="300" y2="105" stroke="#CBD5E1" strokeWidth="3" />
                <polygon points="300,105 330,118 300,130" fill="#F97316" />

                {/* Signboard on Panchayat Building */}
                <rect x="245" y="180" width="110" height="16" rx="4" fill="#FFFFFF" />
                <text x="300" y="192" textAnchor="middle" fontSize="8" fontWeight="800" fill="#0A2540" letterSpacing="1">
                  GRAM PANCHAYAT
                </text>

                {/* Village Houses on Left */}
                {/* House 1 */}
                <rect x="80" y="300" width="80" height="65" rx="4" fill="#FFFFFF" stroke="#CBD5E1" strokeWidth="2" />
                <polygon points="70,300 120,260 170,300" fill="#EA580C" />
                <rect x="105" y="325" width="22" height="40" rx="2" fill="#0284C7" />
                <rect x="135" y="315" width="16" height="18" rx="2" fill="#BAE6FD" />

                {/* Village Houses on Right */}
                {/* House 2 */}
                <rect x="420" y="305" width="85" height="65" rx="4" fill="#FFFFFF" stroke="#CBD5E1" strokeWidth="2" />
                <polygon points="410,305 462,265 515,305" fill="#DC2626" />
                <rect x="435" y="330" width="22" height="40" rx="2" fill="#1E3A8A" />
                <rect x="470" y="320" width="16" height="18" rx="2" fill="#BAE6FD" />

                {/* Paved Road with GPS Location Markers */}
                <path d="M220 480 L285 335 L315 335 L380 480 Z" fill="url(#roadGrad)" />
                <line x1="300" y1="350" x2="300" y2="470" stroke="#FFFFFF" strokeWidth="4" strokeDasharray="14 12" />

                {/* Interactive GPS Pin Marker 1 (Water Leakage) */}
                <g transform="translate(190, 360)">
                  <circle cx="15" cy="15" r="14" fill="#0284C7" />
                  <path d="M15 5 C9 5 5 9 5 15 C5 22 15 32 15 32 C15 32 25 22 25 15 C25 9 21 5 15 5 Z" fill="#0284C7" />
                  <circle cx="15" cy="14" r="5" fill="#FFFFFF" />
                  <text x="15" y="16" textAnchor="middle" fontSize="7" fill="#0284C7">💧</text>
                </g>

                {/* GPS Pin Marker 2 (Street Light) */}
                <g transform="translate(370, 370)">
                  <path d="M15 5 C9 5 5 9 5 15 C5 22 15 32 15 32 C15 32 25 22 25 15 C25 9 21 5 15 5 Z" fill="#F59E0B" />
                  <circle cx="15" cy="14" r="5" fill="#FFFFFF" />
                  <text x="15" y="16" textAnchor="middle" fontSize="7" fill="#F59E0B">💡</text>
                </g>

                {/* Citizen Character with Smartphone (Civic Reporting) */}
                <g transform="translate(150, 370)">
                  <circle cx="20" cy="15" r="10" fill="#FDBA74" />
                  {/* Body */}
                  <rect x="12" y="26" width="16" height="30" rx="6" fill="#1D4ED8" />
                  {/* Smartphone with Signal */}
                  <rect x="25" y="24" width="8" height="15" rx="2" fill="#0F172A" />
                  <rect x="26" y="25" width="6" height="11" rx="1" fill="#38BDF8" />
                  <circle cx="29" cy="21" r="3" fill="#10B981" />
                </g>

                {/* Field Worker Character with Toolkit / Helmet */}
                <g transform="translate(415, 380)">
                  {/* Helmet */}
                  <circle cx="20" cy="14" r="11" fill="#F59E0B" />
                  <rect x="12" y="18" width="16" height="4" rx="2" fill="#D97706" />
                  <circle cx="20" cy="17" r="9" fill="#FDBA74" />
                  {/* Vest */}
                  <rect x="11" y="27" width="18" height="32" rx="5" fill="#10B981" />
                  <rect x="14" y="32" width="12" height="6" fill="#FEF08A" />
                </g>
              </svg>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
