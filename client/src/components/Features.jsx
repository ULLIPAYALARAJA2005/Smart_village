import React from "react";
import { useLanguage } from "../context/LanguageContext";

export default function Features() {
  const { lang, t } = useLanguage();

  const featureCards = [
    {
      id: 1,
      icon: "📝",
      title: t("feat1Title"),
      desc: t("feat1Desc"),
      tags: lang === "te" 
        ? ["వాయిస్ ద్వారా నమోదు", "రాత & ఫోటోలు", "తెలుగు & ఇంగ్లీష్", "స్వయం చాలిత కేటగిరీ"]
        : ["Voice Input", "Text & Photos", "Telugu & English", "Category Auto-Detect"],
    },
    {
      id: 2,
      icon: "🎙️",
      title: t("feat2Title"),
      desc: t("feat2Desc"),
      tags: lang === "te"
        ? ["మైక్రోఫోన్ సౌలభ్యం", "తెలుగు వాయిస్", "స్పీచ్ టు టెక్స్ట్", "టైపింగ్ అవసరం లేదు"]
        : ["Microphone Input", "Telugu Voice", "Speech-to-Text", "Zero-Typing Needed"],
    },
    {
      id: 3,
      icon: "🗺️",
      title: t("feat3Title"),
      desc: t("feat3Desc"),
      tags: lang === "te"
        ? ["ఇంటరాక్టివ్ మ్యాప్", "ఖచ్చితమైన లొకేషన్", "సమస్యల హాట్‌స్పాట్స్", "డూప్లికేట్ నివారణ"]
        : ["Interactive Map", "Pinpoint Accuracy", "Village Hotspots", "Duplicate Prevention"],
    },
    {
      id: 4,
      icon: "👷‍♂️",
      title: t("feat4Title"),
      desc: t("feat4Desc"),
      tags: lang === "te"
        ? ["వర్కర్ పోర్టల్", "ప్రాధాన్యతా స్థాయిలు", "గడువు నిర్వహణ", "జవాబుదారీతనం"]
        : ["Worker Portals", "Priority Levels", "Deadline Management", "Accountability"],
    },
    {
      id: 5,
      icon: "🧭",
      title: t("feat5Title"),
      desc: t("feat5Desc"),
      tags: lang === "te"
        ? ["గూగుల్ మ్యాప్స్ నావిగేషన్", "రూట్ గైడెన్స్", "ఖచ్చితమైన కోఆర్డినేట్లు", "సత్వర పరిష్కారం"]
        : ["Google Maps Integration", "Turn-by-Turn Route", "Exact Coordinates", "Faster Fixes"],
    },
    {
      id: 6,
      icon: "📢",
      title: t("feat6Title"),
      desc: t("feat6Desc"),
      tags: lang === "te"
        ? ["ద్విభాషా సమాచారం", "అత్యవసర హెచ్చరికలు", "ఆరోగ్య & నీటి నోటీసులు", "అధికారిక ప్రకటనలు"]
        : ["Bilingual Broadcasts", "Emergency Alerts", "Health & Water Updates", "Official Notices"],
    },
    {
      id: 7,
      icon: "🔊",
      title: t("feat7Title"),
      desc: t("feat7Desc"),
      tags: lang === "te"
        ? ["సింగిల్ ట్యాప్ లిజనింగ్", "స్పష్టమైన తెలుగు ఆడియో", "ఉచ్ఛారణ సౌలభ్యం", "అందరికీ అందుబాటు"]
        : ["One-Tap Listening", "Native Telugu Audio", "Clear Pronunciation", "Inclusive Design"],
    },
    {
      id: 8,
      icon: "📈",
      title: t("feat8Title"),
      desc: t("feat8Desc"),
      tags: lang === "te"
        ? ["లైవ్ టైమ్‌లైన్", "కేటాయించిన వర్కర్ వివరాలు", "పరిష్కార రుజువు", "స్టేటస్ అప్‌డేట్స్"]
        : ["Live Timeline", "Assigned Worker Info", "Resolution Proof", "SMS/App Updates"],
    },
    {
      id: 9,
      icon: "📊",
      title: t("feat9Title"),
      desc: t("feat9Desc"),
      tags: lang === "te"
        ? ["సివిక్ నివేదికలు", "శాఖల వారీ లెక్కలు", "పరిష్కార వేగం", "భౌగోళిక వివరాలు"]
        : ["Civic Reports", "Department Metrics", "Resolution Rates", "Geographical Insights"],
    },
  ];

  return (
    <section id="features" className="sv-section sv-features-section">
      <div className="sv-landing-container">
        {/* Section Header */}
        <div className="sv-section-header">
          <div className="sv-badge sv-badge-green">
            <span>⚡</span>
            <span>{lang === "te" ? "సమగ్ర కార్యాచరణ" : "Platform Capabilities"}</span>
          </div>
          <h2 className="sv-section-title">{t("featuresTitle")}</h2>
          <p className="sv-section-subtitle">{t("featuresSubtitle")}</p>
        </div>

        {/* 9 Feature Cards Grid */}
        <div className="sv-features-grid">
          {featureCards.map((feat) => (
            <div key={feat.id} className="sv-feature-card">
              <div className="sv-feature-icon-wrapper">
                <span>{feat.icon}</span>
              </div>
              <h3 className="sv-feature-title">{feat.title}</h3>
              <p className="sv-feature-desc">{feat.desc}</p>
              <div className="sv-feature-tags">
                {feat.tags.map((tag, tIdx) => (
                  <span key={tIdx} className="sv-feature-tag">
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
