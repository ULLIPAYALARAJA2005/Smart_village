import React, { useState, useEffect, useCallback, useRef } from "react";
import AnnouncementCard from "./AnnouncementCard";
import {
  fetchVillagerAnnouncementsAPI,
  fetchEmergencyAnnouncementsAPI,
} from "../services/announcementApi";

export default function VillagerAnnouncementsSection() {
  const [announcements, setAnnouncements] = useState([]);
  const [emergencyList, setEmergencyList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterCategory, setFilterCategory] = useState("all");
  const [filterPriority, setFilterPriority] = useState("all");
  const [globalLang, setGlobalLang] = useState("te"); // default Telugu for villagers
  const [searchQuery, setSearchQuery] = useState("");
  const [lastRefreshed, setLastRefreshed] = useState(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // "Listen to All" sequential playlist player state
  const [isListeningToAll, setIsListeningToAll] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const audioPlaylistRef = useRef(null);

  const loadData = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    else setIsRefreshing(true);
    try {
      const [annData, emergData] = await Promise.all([
        fetchVillagerAnnouncementsAPI({
          category: filterCategory !== "all" ? filterCategory : undefined,
          priority: filterPriority !== "all" ? filterPriority : undefined,
          search: searchQuery.trim() || undefined,
        }),
        fetchEmergencyAnnouncementsAPI().catch(() => []),
      ]);
      setAnnouncements(annData);
      setEmergencyList(emergData);
      setLastRefreshed(new Date());
    } catch (err) {
      console.warn("Failed to load announcements:", err);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, [filterCategory, filterPriority, searchQuery]);

  // Load on mount + whenever filters change
  useEffect(() => {
    loadData();
  }, [loadData]);

  // Auto-refresh every 60 seconds so newly published announcements appear automatically
  useEffect(() => {
    const timer = setInterval(() => loadData(true), 60000);
    return () => clearInterval(timer);
  }, [loadData]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    loadData();
  };

  // ── "Listen to All Announcements" Playlist Engine ──
  const startListenToAll = () => {
    if (announcements.length === 0) return;
    setIsListeningToAll(true);
    setCurrentIndex(0);
    playSequentialAnnouncement(0);
  };

  const stopListenToAll = () => {
    if (audioPlaylistRef.current) {
      audioPlaylistRef.current.pause();
      audioPlaylistRef.current = null;
    }
    if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    setIsListeningToAll(false);
    setCurrentIndex(0);
  };

  const playSequentialAnnouncement = (index) => {
    if (index >= announcements.length) {
      setIsListeningToAll(false);
      setCurrentIndex(0);
      return;
    }

    setCurrentIndex(index);
    const item = announcements[index];
    const isTe = globalLang.startsWith("te");
    const title = isTe ? (item.telugu_title || item.original_title) : (item.english_title || item.original_title);
    const content = isTe ? (item.telugu_content || item.original_content) : (item.english_content || item.original_content);
    const speechText = `ప్రకటన నంబర్ ${index + 1}. ${title}. ${content}`;

    const langCode = isTe ? "te" : "en";
    const ttsUrl = `/api/ai/tts/?lang=${langCode}&text=${encodeURIComponent(speechText)}`;

    if (audioPlaylistRef.current) {
      try {
        audioPlaylistRef.current.pause();
      } catch {}
    }

    try {
      const audio = new Audio(ttsUrl);
      audioPlaylistRef.current = audio;

      audio.onended = () => {
        // Automatically play next announcement after a brief 1.5s pause
        setTimeout(() => {
          playSequentialAnnouncement(index + 1);
        }, 1500);
      };

      audio.onerror = () => {
        playBrowserSequential(speechText, langCode, index);
      };

      audio.play().catch(() => {
        playBrowserSequential(speechText, langCode, index);
      });
    } catch {
      playBrowserSequential(speechText, langCode, index);
    }
  };

  const playBrowserSequential = (text, lang, index) => {
    if (typeof window === "undefined" || !window.speechSynthesis) {
      setIsListeningToAll(false);
      return;
    }
    const utter = new SpeechSynthesisUtterance(text);
    utter.lang = lang.startsWith("te") ? "te-IN" : "en-IN";
    utter.onend = () => {
      setTimeout(() => {
        playSequentialAnnouncement(index + 1);
      }, 1500);
    };
    utter.onerror = () => {
      setIsListeningToAll(false);
    };
    window.speechSynthesis.speak(utter);
  };

  return (
    <div style={{ maxWidth: "1000px", margin: "0 auto", padding: "0.5rem" }}>
      {/* ── TOP EMERGENCY ALERT BANNER ── */}
      {emergencyList.length > 0 && (
        <div
          style={{
            background: "linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%)",
            border: "2px solid #ef4444",
            borderRadius: "14px",
            padding: "1rem 1.25rem",
            marginBottom: "1.5rem",
            boxShadow: "0 4px 15px rgba(239, 68, 68, 0.15)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.5rem" }}>
            <span style={{ fontSize: "1.5rem", animation: "pulse 1s infinite" }}>🚨</span>
            <strong style={{ fontSize: "1.05rem", color: "#991b1b" }}>
              అత్యవసర గ్రామ హెచ్చరికలు (Active Emergency Alerts): {emergencyList.length}
            </strong>
          </div>
          {emergencyList.slice(0, 2).map((em) => (
            <div key={em.id} style={{ background: "#ffffff", padding: "0.6rem 0.85rem", borderRadius: "8px", border: "1px solid #fca5a5", marginTop: "0.4rem" }}>
              <div style={{ fontWeight: "700", color: "#b91c1c", fontSize: "0.92rem" }}>
                {em.telugu_title || em.english_title}
              </div>
              <div style={{ fontSize: "0.85rem", color: "#475569", marginTop: "0.2rem" }}>
                {em.telugu_content || em.english_content}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── BROADCAST CONTROL HEADER ── */}
      <div
        style={{
          background: "#ffffff",
          borderRadius: "16px",
          padding: "1.25rem",
          border: "1px solid #e2e8f0",
          boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
          marginBottom: "1.5rem",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "1rem",
        }}
      >
        <div>
          <h2 style={{ margin: 0, fontSize: "1.3rem", color: "#0f172a", display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <span>📢</span> గ్రామ ప్రకటనల సమాచార కేంద్రం
          </h2>
          <span style={{ fontSize: "0.88rem", color: "#64748b" }}>
            Village Announcements & AI Voice Broadcasting
          </span>
        </div>

        {/* Action Controls: Listen to All & Global Language */}
        <div style={{ display: "flex", gap: "0.6rem", alignItems: "center", flexWrap: "wrap" }}>
          {/* Language Switcher */}
          <div style={{ display: "flex", background: "#f1f5f9", padding: "3px", borderRadius: "10px", border: "1px solid #cbd5e1" }}>
            <button
              type="button"
              onClick={() => setGlobalLang("te")}
              style={{
                padding: "0.4rem 0.8rem",
                borderRadius: "8px",
                border: "none",
                fontWeight: "700",
                fontSize: "0.82rem",
                cursor: "pointer",
                background: globalLang === "te" ? "#0284c7" : "transparent",
                color: globalLang === "te" ? "#ffffff" : "#475569",
              }}
            >
              🇮🇳 తెలుగు
            </button>
            <button
              type="button"
              onClick={() => setGlobalLang("en")}
              style={{
                padding: "0.4rem 0.8rem",
                borderRadius: "8px",
                border: "none",
                fontWeight: "700",
                fontSize: "0.82rem",
                cursor: "pointer",
                background: globalLang === "en" ? "#0284c7" : "transparent",
                color: globalLang === "en" ? "#ffffff" : "#475569",
              }}
            >
              🇬🇧 English
            </button>
          </div>

          {/* "Listen to All" Big Button */}
          {!isListeningToAll ? (
            <button
              type="button"
              onClick={startListenToAll}
              disabled={announcements.length === 0}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "0.5rem",
                padding: "0.65rem 1.25rem",
                background: "linear-gradient(135deg, #16a34a, #15803d)",
                color: "#ffffff",
                border: "none",
                borderRadius: "10px",
                fontSize: "0.92rem",
                fontWeight: "700",
                cursor: announcements.length === 0 ? "not-allowed" : "pointer",
                boxShadow: "0 4px 10px rgba(22, 163, 74, 0.3)",
              }}
            >
              <span style={{ fontSize: "1.2rem" }}>📻</span>
              <span>అన్ని ప్రకటనలను వినండి (Listen All)</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={stopListenToAll}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "0.5rem",
                padding: "0.65rem 1.25rem",
                background: "#dc2626",
                color: "#ffffff",
                border: "none",
                borderRadius: "10px",
                fontSize: "0.92rem",
                fontWeight: "700",
                cursor: "pointer",
                boxShadow: "0 4px 10px rgba(220, 38, 38, 0.3)",
              }}
            >
              <span>⏹️</span>
              <span>ఆపండి ({currentIndex + 1}/{announcements.length} చదువుతోంది)</span>
            </button>
          )}

          {/* Refresh Button */}
          <button
            type="button"
            onClick={() => loadData(false)}
            disabled={loading || isRefreshing}
            title="Refresh Announcements"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "0.4rem",
              padding: "0.6rem 1rem",
              background: "#f1f5f9",
              color: "#334155",
              border: "1px solid #cbd5e1",
              borderRadius: "10px",
              fontSize: "0.88rem",
              fontWeight: "700",
              cursor: loading || isRefreshing ? "not-allowed" : "pointer",
              opacity: loading || isRefreshing ? 0.7 : 1,
            }}
          >
            <span style={{ fontSize: "1.1rem", display: "inline-block", animation: isRefreshing ? "spin 1s linear infinite" : "none" }}>🔄</span>
            <span>{isRefreshing ? "లోడ్ అవుతోంది..." : "రిఫ్రెష్"}</span>
          </button>
        </div>
        {lastRefreshed && (
          <div style={{ fontSize: "0.78rem", color: "#94a3b8", marginTop: "0.3rem" }}>
            🕒 చివరిగా నవీకరించబడింది: {lastRefreshed.toLocaleTimeString("te-IN")}
          </div>
        )}
      </div>

      {/* ── FILTER CHIPS ── */}
      <div style={{ display: "flex", gap: "0.5rem", overflowX: "auto", paddingBottom: "0.75rem", marginBottom: "1rem" }}>
        {[
          { id: "all", label: "అన్నీ (All Announcements)" },
          { id: "emergency", label: "🚨 అత్యవసరం (Emergency)", priority: "emergency" },
          { id: "important", label: "⚠️ ముఖ్యమైనవి (Important)", priority: "important" },
          { id: "schemes", label: "🏛️ ప్రభుత్వ పథకాలు (Schemes)", cat: "schemes" },
          { id: "health", label: "🏥 వైద్య శిబిరాలు (Health)", cat: "health" },
          { id: "water", label: "💧 తాగునీరు (Water)", cat: "water" },
          { id: "electricity", label: "⚡ విద్యుత్ (Electricity)", cat: "electricity" },
          { id: "meetings", label: "👥 గ్రామ సభలు (Meetings)", cat: "meetings" },
          { id: "agriculture", label: "🌾 వ్యవసాయం (Agriculture)", cat: "agriculture" },
        ].map((f) => {
          const isSelected =
            f.id === "all"
              ? filterCategory === "all" && filterPriority === "all"
              : f.priority
              ? filterPriority === f.priority
              : filterCategory === f.cat;

          return (
            <button
              key={f.id}
              type="button"
              onClick={() => {
                if (f.id === "all") {
                  setFilterCategory("all");
                  setFilterPriority("all");
                } else if (f.priority) {
                  setFilterCategory("all");
                  setFilterPriority(f.priority);
                } else {
                  setFilterPriority("all");
                  setFilterCategory(f.cat);
                }
              }}
              style={{
                whiteSpace: "nowrap",
                padding: "0.45rem 0.95rem",
                borderRadius: "9999px",
                border: isSelected ? "1.5px solid #2563eb" : "1px solid #cbd5e1",
                background: isSelected ? "#2563eb" : "#ffffff",
                color: isSelected ? "#ffffff" : "#334155",
                fontSize: "0.84rem",
                fontWeight: isSelected ? "700" : "500",
                cursor: "pointer",
                transition: "all 0.15s ease",
              }}
            >
              {f.label}
            </button>
          );
        })}
      </div>

      {/* Search Input Bar */}
      <form onSubmit={handleSearchSubmit} style={{ display: "flex", gap: "0.5rem", marginBottom: "1.25rem" }}>
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="🔍 Search announcements by title or content (ప్రకటనలలో వెతకండి)..."
          style={{
            flex: 1,
            padding: "0.6rem 1rem",
            borderRadius: "10px",
            border: "1px solid #cbd5e1",
            fontSize: "0.9rem",
            outline: "none",
          }}
        />
        <button
          type="submit"
          style={{
            padding: "0.6rem 1.25rem",
            background: "#0284c7",
            color: "#ffffff",
            border: "none",
            borderRadius: "10px",
            fontWeight: "700",
            fontSize: "0.88rem",
            cursor: "pointer",
          }}
        >
          Search
        </button>
      </form>

      {/* ── ANNOUNCEMENTS LIST / CARDS ── */}
      {loading ? (
        <div style={{ textAlign: "center", padding: "3rem 1rem", color: "#64748b" }}>
          <div style={{ fontSize: "2rem", animation: "spin 1s linear infinite", display: "inline-block" }}>⏳</div>
          <div style={{ marginTop: "0.75rem", fontSize: "0.95rem", fontWeight: "600" }}>
            గ్రామ ప్రకటనలను లోడ్ చేస్తున్నాము... (Loading announcements...)
          </div>
        </div>
      ) : announcements.length === 0 ? (
        <div
          style={{
            background: "#ffffff",
            borderRadius: "14px",
            padding: "3rem 1.5rem",
            textAlign: "center",
            border: "1px dashed #cbd5e1",
          }}
        >
          <span style={{ fontSize: "3rem" }}>📭</span>
          <h3 style={{ margin: "0.75rem 0 0.35rem", color: "#1e293b" }}>
            ప్రస్తుతానికి ఎటువంటి ప్రకటనలు లేవు
          </h3>
          <p style={{ margin: 0, color: "#64748b", fontSize: "0.9rem" }}>
            No announcements found matching your selected filters. Please check back later.
          </p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
          {announcements.map((ann, idx) => (
            <div
              key={ann.id}
              style={{
                outline: isListeningToAll && currentIndex === idx ? "3px solid #16a34a" : "none",
                borderRadius: "16px",
                transition: "outline 0.3s ease",
              }}
            >
              <AnnouncementCard
                announcement={ann}
                preferredLanguage={globalLang}
                onListenSuccess={() => {}}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

