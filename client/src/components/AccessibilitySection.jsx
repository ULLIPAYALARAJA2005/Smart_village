import React, { useState } from "react";
import { useLanguage } from "../context/LanguageContext";
import { ttsService } from "../services/ttsService";

export default function AccessibilitySection() {
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

  const cards = [
    {
      icon: "🎙️",
      title: t("accessCard1Title"),
      desc: t("accessCard1Desc"),
      highlight: lang === "te" ? "జీరో టైపింగ్ అవసరం" : "Zero Typing Required",
    },
    {
      icon: "🎧",
      title: t("accessCard2Title"),
      desc: t("accessCard2Desc"),
      highlight: lang === "te" ? "ఒకే ట్యాప్ తో ఆడియో" : "1-Tap Native Audio",
    },
    {
      icon: "👁️",
      title: t("accessCard3Title"),
      desc: t("accessCard3Desc"),
      highlight: lang === "te" ? "స్పష్టమైన & పెద్ద అక్షరాలు" : "High Contrast & Large Tap Targets",
    },
  ];

  return (
    <section id="accessibility" className="sv-section sv-access-section">
      <div className="sv-landing-container">
        {/* Section Header */}
        <div className="sv-section-header">
          <div className="sv-badge sv-badge-green">
            <span>🤝</span>
            <span>{lang === "te" ? "సమగ్ర సౌలభ్యం" : "Universal Accessibility"}</span>
          </div>
          <h2 className="sv-section-title">{t("accessTitle")}</h2>
          <p className="sv-section-subtitle">{t("accessSubtitle")}</p>
        </div>

        {/* 3 Large Accessible Feature Cards */}
        <div className="sv-access-grid">
          {cards.map((card, idx) => (
            <div key={idx} className="sv-access-card">
              <div className="sv-access-card-icon">{card.icon}</div>
              <span
                style={{
                  fontSize: "0.8rem",
                  fontWeight: "700",
                  color: "var(--sv-green-dark)",
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                  marginBottom: "8px",
                }}
              >
                {card.highlight}
              </span>
              <h3 className="sv-access-card-title">{card.title}</h3>
              <p className="sv-access-card-desc">{card.desc}</p>
            </div>
          ))}
        </div>

        {/* Action Callout Box with Listen Button */}
        <div className="sv-access-action-box">
          <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
            <span style={{ fontSize: "2rem" }}>🔊</span>
            <div>
              <h4 style={{ fontSize: "1.15rem", fontWeight: "800", color: "var(--sv-navy)", marginBottom: "4px" }}>
                {lang === "te" ? "వాయిస్ సహాయాన్ని స్వయంగా ప్రయత్నించండి" : "Try The Voice Assistant Yourself"}
              </h4>
              <p style={{ fontSize: "0.92rem", color: "var(--sv-text-muted)", margin: 0 }}>
                {t("accessListenNotice")}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleListen}
            className={`sv-btn-primary ${isPlaying ? "sv-btn-listen speaking" : ""}`}
            style={{ padding: "12px 24px" }}
            aria-label="Listen to Introduction"
          >
            <span>{isPlaying ? "⏹️" : "🔊"}</span>
            <span>{isPlaying ? t("heroStopAudioBtn") : t("heroListenBtn")}</span>
          </button>
        </div>
      </div>
    </section>
  );
}

