import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useLanguage } from "../context/LanguageContext";
import { fetchVillagerAnnouncementsAPI } from "../services/announcementApi";
import { ttsService } from "../services/ttsService";

export default function AnnouncementsSection() {
  const { lang, t } = useLanguage();
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [playingId, setPlayingId] = useState(null);

  useEffect(() => {
    let isMounted = true;
    const loadAnnouncements = async () => {
      try {
        setLoading(true);
        const data = await fetchVillagerAnnouncementsAPI({ limit: 6 });
        if (isMounted) {
          // Take up to 3 latest for preview
          const list = Array.isArray(data) ? data : (data.results || []);
          setAnnouncements(list.slice(0, 3));
        }
      } catch (err) {
        console.warn("Could not load public announcements preview:", err);
        if (isMounted) setAnnouncements([]);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    loadAnnouncements();
    return () => {
      isMounted = false;
      ttsService.stop();
    };
  }, []);

  const handleListen = (ann, speechLang) => {
    const speechKey = `${ann.id}-${speechLang}`;
    if (playingId === speechKey) {
      ttsService.stop();
      setPlayingId(null);
      return;
    }

    const titleText = speechLang === "te" 
      ? (ann.telugu_title || ann.original_title) 
      : (ann.english_title || ann.original_title);
    const contentText = speechLang === "te" 
      ? (ann.telugu_content || ann.original_content) 
      : (ann.english_content || ann.original_content);
    const fullText = `${titleText}. ${contentText}`;

    setPlayingId(speechKey);
    ttsService.speak({
      text: fullText,
      language: speechLang === "te" ? "te-IN" : "en-IN",
      onEnd: () => setPlayingId(null),
      onError: () => setPlayingId(null),
    });
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return "";
    try {
      return new Date(dateStr).toLocaleDateString(lang === "te" ? "te-IN" : "en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <section id="announcements" className="sv-section sv-announcements-section">
      <div className="sv-landing-container">
        {/* Section Header */}
        <div className="sv-section-header">
          <div className="sv-badge sv-badge-blue">
            <span>📢</span>
            <span>{lang === "te" ? "పంచాయతీ సమాచారం" : "Public Notices"}</span>
          </div>
          <h2 className="sv-section-title">{t("annTitle")}</h2>
          <p className="sv-section-subtitle">{t("annSubtitle")}</p>
        </div>

        {/* Content Body */}
        {loading ? (
          <div className="sv-empty-state">
            <span style={{ fontSize: "1.5rem", display: "block", marginBottom: "8px" }}>⏳</span>
            <span>{lang === "te" ? "ప్రకటనలు లోడ్ అవుతున్నాయి..." : "Loading latest announcements..."}</span>
          </div>
        ) : announcements.length === 0 ? (
          <div className="sv-empty-state">
            <span style={{ fontSize: "2rem", display: "block", marginBottom: "12px" }}>📭</span>
            <p style={{ margin: 0 }}>{t("annEmpty")}</p>
          </div>
        ) : (
          <div className="sv-announcements-grid">
            {announcements.map((ann) => {
              const priorityClass = ann.priority === "urgent" ? "urgent" : ann.priority === "important" ? "important" : "normal";
              const displayTitle = lang === "te" 
                ? (ann.telugu_title || ann.english_title || ann.original_title)
                : (ann.english_title || ann.original_title);
              const displayContent = lang === "te"
                ? (ann.telugu_content || ann.english_content || ann.original_content)
                : (ann.english_content || ann.original_content);

              const isTePlaying = playingId === `${ann.id}-te`;
              const isEnPlaying = playingId === `${ann.id}-en`;

              return (
                <div key={ann.id} className="sv-ann-card">
                  <div className="sv-ann-meta-row">
                    <span className={`sv-ann-priority ${priorityClass}`}>
                      {ann.priority || "normal"}
                    </span>
                    <span className="sv-ann-date">
                      📅 {formatDate(ann.published_at || ann.created_at)}
                    </span>
                  </div>

                  <h3 className="sv-ann-title">{displayTitle}</h3>
                  <p className="sv-ann-content">{displayContent}</p>

                  {/* Audio Read-out Controls */}
                  <div className="sv-ann-audio-btns">
                    <button
                      type="button"
                      className={`sv-ann-listen-btn ${isTePlaying ? "speaking" : ""}`}
                      onClick={() => handleListen(ann, "te")}
                      title="తెలుగులో వినండి"
                    >
                      <span>{isTePlaying ? "⏹️" : "🔊"}</span>
                      <span>{isTePlaying ? t("heroStopAudioBtn") : t("annListenTe")}</span>
                    </button>

                    <button
                      type="button"
                      className={`sv-ann-listen-btn ${isEnPlaying ? "speaking" : ""}`}
                      onClick={() => handleListen(ann, "en")}
                      title="Listen in English"
                    >
                      <span>{isEnPlaying ? "⏹️" : "🔊"}</span>
                      <span>{isEnPlaying ? t("heroStopAudioBtn") : t("annListenEn")}</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* View All Announcements Button */}
        <div style={{ textAlign: "center", marginTop: "36px" }}>
          <Link to="/villager" className="sv-btn-secondary" style={{ padding: "12px 28px" }}>
            <span>📋 {t("annViewAll")}</span>
          </Link>
        </div>
      </div>
    </section>
  );
}

