import React, { useState } from "react";
import { useLanguage } from "../context/LanguageContext";

export default function ContactSection() {
  const { lang, t } = useLanguage();
  const [formData, setFormData] = useState({ name: "", phone: "", message: "" });
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.name || !formData.phone) return;
    setSubmitted(true);
    setTimeout(() => {
      setSubmitted(false);
      setFormData({ name: "", phone: "", message: "" });
    }, 4000);
  };

  return (
    <section id="contact" className="sv-section sv-contact-section">
      <div className="sv-landing-container">
        {/* Section Header */}
        <div className="sv-section-header">
          <div className="sv-badge sv-badge-blue">
            <span>📞</span>
            <span>{lang === "te" ? "సహాయ కేంద్రం" : "Citizen Assistance"}</span>
          </div>
          <h2 className="sv-section-title">{t("contactTitle")}</h2>
          <p className="sv-section-subtitle">{t("contactSubtitle")}</p>
        </div>

        <div className="sv-contact-grid">
          {/* Left Column: Office & Helplines */}
          <div className="sv-contact-card">
            <h3 className="sv-contact-card-title">🏛️ {t("contactOffice")}</h3>
            <p style={{ fontSize: "0.95rem", color: "var(--sv-text-body)", lineHeight: "1.6", marginBottom: "24px" }}>
              {t("contactOfficeDesc")}
            </p>

            <h4 style={{ fontSize: "1.05rem", fontWeight: "700", color: "var(--sv-navy)", marginBottom: "16px" }}>
              🚨 {t("contactHelplines")}
            </h4>

            <div className="sv-helpline-item">
              <span>💧</span>
              <span>{t("contactWater")}</span>
            </div>

            <div className="sv-helpline-item">
              <span>⚡</span>
              <span>{t("contactElectricity")}</span>
            </div>

            <div className="sv-helpline-item">
              <span>🧹</span>
              <span>{t("contactSanitation")}</span>
            </div>
          </div>

          {/* Right Column: Citizen Inquiry Form */}
          <div className="sv-contact-card">
            <h3 className="sv-contact-card-title">
              💬 {lang === "te" ? "పంచాయతీకి సందేశం పంపండి" : "Send an Inquiry to Panchayat"}
            </h3>
            <p style={{ fontSize: "0.92rem", color: "var(--sv-text-muted)", marginBottom: "20px" }}>
              {lang === "te"
                ? "మీ సలహాలు, సందేహాలు లేదా సాధారణ విచారణల కోసం ఇక్కడ సందేశం పంపవచ్చు."
                : "Have general questions or suggestions regarding village administration? Send us a message."}
            </p>

            {submitted ? (
              <div
                style={{
                  background: "var(--sv-green-subtle)",
                  border: "1px solid var(--sv-green-border)",
                  borderRadius: "var(--sv-radius-md)",
                  padding: "20px",
                  textAlign: "center",
                  color: "var(--sv-green-dark)",
                  fontWeight: "700",
                }}
              >
                ✓ {lang === "te"
                  ? "మీ సందేశం విజయవంతంగా పంచాయతీకి చేరింది! ధన్యవాదాలు."
                  : "Thank you! Your inquiry has been submitted to the Panchayat desk."}
              </div>
            ) : (
              <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                <div>
                  <label style={{ display: "block", fontSize: "0.85rem", fontWeight: "700", color: "var(--sv-navy)", marginBottom: "6px" }}>
                    {lang === "te" ? "మీ పేరు" : "Full Name"} *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder={lang === "te" ? "ఉదాహరణ: రాము" : "e.g. Ramesh Kumar"}
                    style={{
                      width: "100%",
                      padding: "10px 14px",
                      borderRadius: "var(--sv-radius-sm)",
                      border: "1px solid var(--sv-border)",
                      fontSize: "0.95rem",
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "0.85rem", fontWeight: "700", color: "var(--sv-navy)", marginBottom: "6px" }}>
                    {lang === "te" ? "ఫోన్ నంబర్" : "Phone Number"} *
                  </label>
                  <input
                    type="tel"
                    required
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="9876543210"
                    style={{
                      width: "100%",
                      padding: "10px 14px",
                      borderRadius: "var(--sv-radius-sm)",
                      border: "1px solid var(--sv-border)",
                      fontSize: "0.95rem",
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "0.85rem", fontWeight: "700", color: "var(--sv-navy)", marginBottom: "6px" }}>
                    {lang === "te" ? "వివరణ లేదా సందేశం" : "Inquiry / Message"}
                  </label>
                  <textarea
                    rows={3}
                    value={formData.message}
                    onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                    placeholder={lang === "te" ? "మీ సందేశాన్ని ఇక్కడ రాయండి..." : "Write your inquiry here..."}
                    style={{
                      width: "100%",
                      padding: "10px 14px",
                      borderRadius: "var(--sv-radius-sm)",
                      border: "1px solid var(--sv-border)",
                      fontSize: "0.95rem",
                      resize: "vertical",
                    }}
                  />
                </div>

                <button
                  type="submit"
                  className="sv-btn-primary"
                  style={{ alignSelf: "flex-start", padding: "12px 28px" }}
                >
                  <span>✉️ {lang === "te" ? "సందేశం పంపండి" : "Submit Inquiry"}</span>
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

