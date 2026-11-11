import React, { useState, useEffect } from "react";
import AnnouncementBroadcaster from "./AnnouncementBroadcaster";
import { recordAnnouncementViewAPI } from "../services/announcementApi";

const CATEGORY_MAP = {
  general: { icon: "📢", en: "General Information", te: "సాధారణ సమాచారం", bg: "#f1f5f9", color: "#475569" },
  schemes: { icon: "🏛️", en: "Government Schemes", te: "ప్రభుత్వ పథకాలు", bg: "#eff6ff", color: "#1d4ed8" },
  health: { icon: "🏥", en: "Health & Medical Camps", te: "ఆరోగ్య & వైద్య శిబిరాలు", bg: "#f0fdf4", color: "#15803d" },
  electricity: { icon: "⚡", en: "Electricity Updates", te: "విద్యుత్ సమాచారం", bg: "#fef3c7", color: "#b45309" },
  water: { icon: "💧", en: "Water Supply Updates", te: "తాగునీటి సరఫరా", bg: "#e0f2fe", color: "#0369a1" },
  meetings: { icon: "👥", en: "Village Meetings", te: "గ్రామ సభలు", bg: "#f3e8ff", color: "#6b21a8" },
  emergency: { icon: "🚨", en: "Emergency Alerts", te: "అత్యవసర హెచ్చరికలు", bg: "#fee2e2", color: "#b91c1c" },
  agriculture: { icon: "🌾", en: "Agriculture Information", te: "వ్యవసాయ సమాచారం", bg: "#ecfdf5", color: "#047857" },
  other: { icon: "📋", en: "Other Notices", te: "ఇతర సమాచారం", bg: "#f8fafc", color: "#334155" },
};

export default function AnnouncementCard({
  announcement,
  preferredLanguage = "te",
  onListenSuccess,
  autoPlayVoice = false,
}) {
  const [activeLang, setActiveLang] = useState(preferredLanguage); // "te" | "en" | "both"
  const [isExpanded, setIsExpanded] = useState(false);

  const cat = CATEGORY_MAP[announcement.category] || CATEGORY_MAP.general;
  const isEmergency = announcement.priority === "emergency";
  const isImportant = announcement.priority === "important";

  // Mark viewed in backend when rendered
  useEffect(() => {
    if (announcement.id && !announcement.user_viewed) {
      recordAnnouncementViewAPI(announcement.id).catch(() => {});
    }
  }, [announcement.id, announcement.user_viewed]);

  // Keep synced if user toggles global language
  useEffect(() => {
    setActiveLang(preferredLanguage);
  }, [preferredLanguage]);

  const englishTitle = announcement.english_title || announcement.original_title;
  const englishContent = announcement.english_content || announcement.original_content;
  const teluguTitle = announcement.telugu_title || announcement.original_title;
  const teluguContent = announcement.telugu_content || announcement.original_content;

  // Selected language content for voice playback
  const voiceTitle = activeLang === "en" ? englishTitle : teluguTitle;
  const voiceContent = activeLang === "en" ? englishContent : teluguContent;
  const voiceLangCode = activeLang === "en" ? "en" : "te";

  const isAttachmentImage =
    announcement.attachment &&
    (announcement.attachment.endsWith(".jpg") ||
      announcement.attachment.endsWith(".jpeg") ||
      announcement.attachment.endsWith(".png") ||
      announcement.attachment.endsWith(".webp") ||
      announcement.attachment.endsWith(".gif"));

  return (
    <div
      style={{
        background: "#ffffff",
        borderRadius: "16px",
        padding: "1.35rem",
        border: isEmergency ? "2px solid #ef4444" : isImportant ? "1.5px solid #f59e0b" : "1px solid #e2e8f0",
        boxShadow: isEmergency
          ? "0 4px 20px rgba(239, 68, 68, 0.18)"
          : "0 4px 15px rgba(0, 0, 0, 0.05)",
        position: "relative",
        transition: "all 0.2s ease",
      }}
    >
      {/* Top Header Row: Category Badge + Priority Badge + Date */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "0.5rem", marginBottom: "0.85rem" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <span
            style={{
              background: cat.bg,
              color: cat.color,
              padding: "0.3rem 0.65rem",
              borderRadius: "8px",
              fontSize: "0.82rem",
              fontWeight: "700",
              display: "inline-flex",
              alignItems: "center",
              gap: "0.35rem",
            }}
          >
            <span>{cat.icon}</span>
            <span>{cat.te} ({cat.en})</span>
          </span>

          {/* Priority Pill */}
          {isEmergency && (
            <span
              style={{
                background: "#fee2e2",
                color: "#b91c1c",
                border: "1px solid #fca5a5",
                padding: "0.25rem 0.6rem",
                borderRadius: "9999px",
                fontSize: "0.78rem",
                fontWeight: "800",
                display: "inline-flex",
                alignItems: "center",
                gap: "0.25rem",
                animation: "pulse 1.5s infinite",
              }}
            >
              <span>🚨</span> అత్యవసరం (EMERGENCY)
            </span>
          )}

          {isImportant && (
            <span
              style={{
                background: "#fef3c7",
                color: "#92400e",
                border: "1px solid #fcd34d",
                padding: "0.25rem 0.6rem",
                borderRadius: "9999px",
                fontSize: "0.78rem",
                fontWeight: "700",
              }}
            >
              ⚠️ ముఖ్యమైనది (Important)
            </span>
          )}
        </div>

        {/* Date & Views / Listens Counts */}
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", fontSize: "0.78rem", color: "#64748b" }}>
          <span>📅 {new Date(announcement.published_at).toLocaleDateString()}</span>
          {announcement.total_views > 0 && <span>👁️ {announcement.total_views} views</span>}
          {announcement.total_listens > 0 && <span>🎧 {announcement.total_listens} listens</span>}
        </div>
      </div>

      {/* Language Switching Tabs */}
      <div style={{ display: "flex", gap: "0.4rem", marginBottom: "0.85rem", borderBottom: "1px solid #f1f5f9", paddingBottom: "0.5rem" }}>
        <button
          type="button"
          onClick={() => setActiveLang("te")}
          style={{
            padding: "0.3rem 0.75rem",
            borderRadius: "6px",
            border: "none",
            fontSize: "0.82rem",
            fontWeight: "700",
            cursor: "pointer",
            background: activeLang === "te" ? "#0284c7" : "#f1f5f9",
            color: activeLang === "te" ? "#ffffff" : "#475569",
          }}
        >
          🇮🇳 తెలుగు (Telugu)
        </button>
        <button
          type="button"
          onClick={() => setActiveLang("en")}
          style={{
            padding: "0.3rem 0.75rem",
            borderRadius: "6px",
            border: "none",
            fontSize: "0.82rem",
            fontWeight: "700",
            cursor: "pointer",
            background: activeLang === "en" ? "#0284c7" : "#f1f5f9",
            color: activeLang === "en" ? "#ffffff" : "#475569",
          }}
        >
          🇬🇧 English
        </button>
        <button
          type="button"
          onClick={() => setActiveLang("both")}
          style={{
            padding: "0.3rem 0.75rem",
            borderRadius: "6px",
            border: "none",
            fontSize: "0.82rem",
            fontWeight: "700",
            cursor: "pointer",
            background: activeLang === "both" ? "#0284c7" : "#f1f5f9",
            color: activeLang === "both" ? "#ffffff" : "#475569",
          }}
        >
          🌐 Both Languages (రెండు)
        </button>
      </div>

      {/* Main Content Area */}
      <div style={{ marginBottom: "0.75rem" }}>
        {/* TELUGU VERSION */}
        {(activeLang === "te" || activeLang === "both") && (
          <div style={{ marginBottom: activeLang === "both" ? "1rem" : 0 }}>
            {activeLang === "both" && (
              <span style={{ fontSize: "0.75rem", fontWeight: "700", color: "#0284c7", textTransform: "uppercase" }}>
                తెలుగు సంస్కరణ:
              </span>
            )}
            <h3 style={{ margin: "0.2rem 0 0.5rem", fontSize: "1.15rem", color: "#0f172a", fontWeight: "700", lineHeight: "1.4" }}>
              {teluguTitle}
            </h3>
            <p
              style={{
                margin: 0,
                color: "#334155",
                fontSize: "0.95rem",
                lineHeight: "1.6",
                display: isExpanded ? "block" : "-webkit-box",
                WebkitLineClamp: isExpanded ? "unset" : "3",
                WebkitBoxOrient: "vertical",
                overflow: isExpanded ? "visible" : "hidden",
              }}
            >
              {teluguContent}
            </p>
          </div>
        )}

        {/* ENGLISH VERSION */}
        {(activeLang === "en" || activeLang === "both") && (
          <div>
            {activeLang === "both" && (
              <span style={{ fontSize: "0.75rem", fontWeight: "700", color: "#0284c7", textTransform: "uppercase" }}>
                English Version:
              </span>
            )}
            <h3 style={{ margin: "0.2rem 0 0.5rem", fontSize: "1.15rem", color: "#0f172a", fontWeight: "700", lineHeight: "1.4" }}>
              {englishTitle}
            </h3>
            <p
              style={{
                margin: 0,
                color: "#334155",
                fontSize: "0.95rem",
                lineHeight: "1.6",
                display: isExpanded ? "block" : "-webkit-box",
                WebkitLineClamp: isExpanded ? "unset" : "3",
                WebkitBoxOrient: "vertical",
                overflow: isExpanded ? "visible" : "hidden",
              }}
            >
              {englishContent}
            </p>
          </div>
        )}

        {/* Read More / Read Less Toggle if text is long */}
        {(teluguContent.length > 180 || englishContent.length > 180) && (
          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            style={{
              background: "none",
              border: "none",
              padding: "0.3rem 0",
              color: "#2563eb",
              fontWeight: "700",
              fontSize: "0.82rem",
              cursor: "pointer",
            }}
          >
            {isExpanded ? "▲ Read Less (తక్కువగా చూపించు)" : "▼ Read More (మరింత చదవండి)"}
          </button>
        )}
      </div>

      {/* Attachment Section (Image or Document PDF) */}
      {announcement.attachment_url && (
        <div style={{ margin: "0.75rem 0", padding: "0.6rem 0.8rem", background: "#f8fafc", borderRadius: "10px", border: "1px solid #e2e8f0" }}>
          {isAttachmentImage ? (
            <div>
              <span style={{ fontSize: "0.75rem", color: "#64748b", fontWeight: "600", display: "block", marginBottom: "0.3rem" }}>
                📷 Attached Photo / పత్రం:
              </span>
              <img
                src={announcement.attachment_url}
                alt="Announcement attachment"
                style={{ maxHeight: "160px", maxWidth: "100%", borderRadius: "8px", objectFit: "cover", border: "1px solid #cbd5e1" }}
              />
            </div>
          ) : (
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: "0.85rem", color: "#1e293b", fontWeight: "600", display: "flex", alignItems: "center", gap: "0.4rem" }}>
                <span>📄</span> Attached Document (PDF / File)
              </span>
              <a
                href={announcement.attachment_url}
                target="_blank"
                rel="noopener noreferrer"
                download
                style={{
                  padding: "0.35rem 0.75rem",
                  background: "#0284c7",
                  color: "#ffffff",
                  borderRadius: "6px",
                  fontSize: "0.78rem",
                  fontWeight: "700",
                  textDecoration: "none",
                }}
              >
                📥 Download
              </a>
            </div>
          )}
        </div>
      )}

      {/* AI Voice Announcer Section */}
      <AnnouncementBroadcaster
        announcementId={announcement.id}
        title={voiceTitle}
        content={voiceContent}
        language={voiceLangCode}
        onListenRecorded={onListenSuccess}
        autoPlay={autoPlayVoice}
      />
    </div>
  );
}

