import React, { useState, useEffect, useRef, useMemo } from "react";
import { recordAnnouncementListenAPI } from "../services/announcementApi";

export default function AnnouncementBroadcaster({
  announcementId,
  title,
  content,
  language = "te",
  onListenRecorded,
  autoPlay = false,
}) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1.0); // 0.8 | 1.0 | 1.25
  const [activeSentenceIndex, setActiveSentenceIndex] = useState(-1);

  const audioRef = useRef(null);
  const hasRecordedListenRef = useRef(false);

  const isTelugu = language.startsWith("te");
  const fullText = `${title}. ${content}`.trim();

  // Split text into readable sentences for karaoke-style visual highlighting
  const sentences = useMemo(() => {
    if (!fullText) return [];
    const raw = fullText.split(/(?<=[.?!।\n])\s+/).filter(Boolean);
    return raw.length > 0 ? raw : [fullText];
  }, [fullText]);

  const stopAudio = () => {
    if (audioRef.current) {
      try {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
      } catch (err) {
        console.debug("audio pause:", err);
      }
      audioRef.current = null;
    }
    if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    setIsPlaying(false);
    setIsPaused(false);
    setActiveSentenceIndex(-1);
  };

  // Clean up audio on unmount or language/text change
  useEffect(() => {
    return () => {
      stopAudio();
    };
  }, [fullText, language]);

  const startPlayback = () => {
    stopAudio();

    if (!fullText) return;

    // Track listen activity on server
    if (announcementId && !hasRecordedListenRef.current) {
      hasRecordedListenRef.current = true;
      recordAnnouncementListenAPI(announcementId).catch(() => {});
      if (onListenRecorded) onListenRecorded(announcementId);
    }

    const langCode = isTelugu ? "te" : "en";
    const ttsUrl = `/api/ai/tts/?lang=${langCode}&text=${encodeURIComponent(fullText)}`;

    try {
      const audio = new Audio(ttsUrl);
      audio.playbackRate = playbackRate;
      audioRef.current = audio;

      audio.onplay = () => {
        setIsPlaying(true);
        setIsPaused(false);
        setActiveSentenceIndex(0);
      };

      audio.onpause = () => {
        if (audioRef.current && !audioRef.current.ended) {
          setIsPaused(true);
        }
      };

      audio.ontimeupdate = () => {
        if (!audio.duration || sentences.length === 0) return;
        const progress = audio.currentTime / audio.duration;
        const index = Math.min(
          Math.floor(progress * sentences.length),
          sentences.length - 1
        );
        setActiveSentenceIndex(index);
      };

      audio.onended = () => {
        setIsPlaying(false);
        setIsPaused(false);
        setActiveSentenceIndex(-1);
      };

      audio.onerror = () => {
        // Fallback to browser SpeechSynthesis if backend audio network stream fails
        fallbackBrowserTTS();
      };

      audio.play().catch(() => {
        fallbackBrowserTTS();
      });
    } catch (err) {
      console.debug("audio play:", err);
      fallbackBrowserTTS();
    }
  };

  // Handle autoPlay if requested
  useEffect(() => {
    if (autoPlay && fullText) {
      startPlayback();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoPlay, fullText]);

  const fallbackBrowserTTS = () => {
    if (typeof window === "undefined" || !window.speechSynthesis) {
      setIsPlaying(false);
      return;
    }

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(fullText);
    utterance.lang = isTelugu ? "te-IN" : "en-IN";
    utterance.rate = playbackRate;

    utterance.onstart = () => {
      setIsPlaying(true);
      setIsPaused(false);
      setActiveSentenceIndex(0);
    };

    utterance.onend = () => {
      setIsPlaying(false);
      setIsPaused(false);
      setActiveSentenceIndex(-1);
    };

    utterance.onerror = () => {
      setIsPlaying(false);
      setIsPaused(false);
      setActiveSentenceIndex(-1);
    };

    window.speechSynthesis.speak(utterance);
  };

  const handleTogglePlayPause = () => {
    if (!isPlaying) {
      startPlayback();
    } else if (isPaused) {
      // Resume
      if (audioRef.current) {
        audioRef.current.play();
        setIsPaused(false);
      } else if (window.speechSynthesis) {
        window.speechSynthesis.resume();
        setIsPaused(false);
      }
    } else {
      // Pause
      if (audioRef.current) {
        audioRef.current.pause();
        setIsPaused(true);
      } else if (window.speechSynthesis) {
        window.speechSynthesis.pause();
        setIsPaused(true);
      }
    }
  };

  const changeSpeed = (rate) => {
    setPlaybackRate(rate);
    if (audioRef.current) {
      audioRef.current.playbackRate = rate;
    }
  };

  return (
    <div
      style={{
        background: isPlaying ? "#f0fdf4" : "#f8fafc",
        border: isPlaying ? "1.5px solid #86efac" : "1px solid #e2e8f0",
        borderRadius: "12px",
        padding: "0.85rem 1rem",
        marginTop: "0.75rem",
        transition: "all 0.2s ease",
      }}
    >
      {/* Voice Control Buttons Bar */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "0.6rem",
        }}
      >
        {/* Main Big Listen Button */}
        <button
          type="button"
          onClick={handleTogglePlayPause}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "0.5rem",
            padding: "0.65rem 1.25rem",
            background: isPlaying && !isPaused ? "#16a34a" : "#2563eb",
            color: "#ffffff",
            border: "none",
            borderRadius: "10px",
            fontSize: "0.95rem",
            fontWeight: "700",
            cursor: "pointer",
            boxShadow: isPlaying && !isPaused ? "0 3px 8px rgba(22, 163, 74, 0.35)" : "0 3px 8px rgba(37, 99, 235, 0.25)",
            transition: "all 0.2s",
          }}
        >
          <span style={{ fontSize: "1.2rem" }}>
            {isPlaying && !isPaused ? "⏸️" : "📢"}
          </span>
          <span>
            {isPlaying && !isPaused
              ? (isTelugu ? "పాజ్ చేయండి (Pause)" : "Pause Voice")
              : isPaused
              ? (isTelugu ? "కొనసాగించండి (Resume)" : "Resume Voice")
              : (isTelugu ? "వాయిస్ వినండి (Listen)" : "Listen to Announcement")}
          </span>
        </button>

        {/* Secondary Controls (Stop & Speed) */}
        {isPlaying && (
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
            <button
              type="button"
              onClick={stopAudio}
              style={{
                padding: "0.5rem 0.85rem",
                background: "#fee2e2",
                color: "#991b1b",
                border: "1px solid #fca5a5",
                borderRadius: "8px",
                fontSize: "0.82rem",
                fontWeight: "700",
                cursor: "pointer",
              }}
            >
              ⏹️ Stop
            </button>

            {/* Speed Selector */}
            <div style={{ display: "flex", background: "#e2e8f0", borderRadius: "8px", padding: "2px" }}>
              {[
                { label: "0.8x Slow", val: 0.8 },
                { label: "1.0x", val: 1.0 },
                { label: "1.25x Fast", val: 1.25 },
              ].map((s) => (
                <button
                  key={s.val}
                  type="button"
                  onClick={() => changeSpeed(s.val)}
                  style={{
                    padding: "0.3rem 0.6rem",
                    border: "none",
                    borderRadius: "6px",
                    fontSize: "0.75rem",
                    fontWeight: "600",
                    cursor: "pointer",
                    background: playbackRate === s.val ? "#ffffff" : "transparent",
                    color: playbackRate === s.val ? "#0f172a" : "#64748b",
                    boxShadow: playbackRate === s.val ? "0 1px 3px rgba(0,0,0,0.1)" : "none",
                  }}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Synchronized Text Highlighting Box during Speech */}
      {isPlaying && sentences.length > 0 && (
        <div
          style={{
            marginTop: "0.75rem",
            padding: "0.75rem",
            background: "#ffffff",
            borderRadius: "8px",
            border: "1px solid #bbf7d0",
            fontSize: "0.9rem",
            lineHeight: "1.6",
            maxHeight: "130px",
            overflowY: "auto",
          }}
        >
          <div style={{ fontSize: "0.75rem", color: "#16a34a", fontWeight: "700", marginBottom: "0.3rem", display: "flex", alignItems: "center", gap: "0.3rem" }}>
            <span style={{ animation: "pulse 1s infinite", display: "inline-block" }}>🟢</span>
            {isTelugu ? "ప్రస్తుతం చదువుతున్న వాక్యం:" : "Currently Reading Aloud:"}
          </div>
          <p style={{ margin: 0, color: "#334155" }}>
            {sentences.map((sentence, idx) => (
              <span
                key={idx}
                style={{
                  background: idx === activeSentenceIndex ? "#fef08a" : "transparent",
                  color: idx === activeSentenceIndex ? "#854d0e" : "inherit",
                  fontWeight: idx === activeSentenceIndex ? "700" : "normal",
                  padding: idx === activeSentenceIndex ? "2px 4px" : "0",
                  borderRadius: "4px",
                  transition: "background 0.2s ease",
                  marginRight: "4px",
                }}
              >
                {sentence}{" "}
              </span>
            ))}
          </p>
        </div>
      )}
    </div>
  );
}

