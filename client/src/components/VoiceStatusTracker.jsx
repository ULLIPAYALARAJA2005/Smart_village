import { useState, useEffect, useRef } from "react";
import VoiceRecorder from "./VoiceRecorder";
import { fetchIssueStatusAPI, fetchMyAIComplaintsAPI } from "../services/aiApi";
import { ttsService } from "../services/ttsService";
import "../styles/voice.css";

export default function VoiceStatusTracker({ isOpen, onClose, userId }) {
  const [lang, setLang] = useState("te-IN");
  const isTelugu = lang.startsWith("te");

  const [spokenText, setSpokenText] = useState("");
  const [statusResult, setStatusResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [manualIdInput, setManualIdInput] = useState("");
  const [recentIssues, setRecentIssues] = useState([]);
  // Debounce timer — avoids firing API calls on every interim speech result
  const queryDebounceRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      setSpokenText("");
      setStatusResult(null);
      setErrorMsg("");
      loadRecentComplaints();
      const prompt = isTelugu
        ? "మీ ఫిర్యాదు స్థితిని తెలుసుకోవడానికి 'నా కంప్లైంట్ స్టేటస్ ఏమిటి?' అని చెప్పండి."
        : "Ask 'What is my complaint status?' or provide your complaint ID.";
      ttsService.speak({ text: prompt, language: isTelugu ? "te-IN" : "en-IN" });
    } else {
      ttsService.stop();
      // Clear any pending debounce when modal closes
      if (queryDebounceRef.current) clearTimeout(queryDebounceRef.current);
    }
  }, [isOpen, isTelugu]);

  const loadRecentComplaints = async () => {
    try {
      const data = await fetchMyAIComplaintsAPI();
      setRecentIssues(Array.isArray(data) ? data : []);
    } catch (err) {
      // Silently ignore — user may not be a villager role or no complaints yet
      console.warn("Could not load recent complaints:", err.message);
      setRecentIssues([]);
    }
  };

  if (!isOpen) return null;

  // Helper to extract Complaint ID or Category from spoken Telugu or English
  const extractQueryTarget = (rawText) => {
    if (!rawText) return null;
    const text = rawText.toLowerCase().trim();

    // 1. Direct standard digits (e.g. "complaint 3", "3")
    const digitsMatch = text.match(/\d+/);
    if (digitsMatch) {
      return { type: "id", value: parseInt(digitsMatch[0], 10) };
    }

    // 2. Telugu numeral characters (౧, ౨, ౩...)
    const teluguNumerals = { "౧": 1, "౨": 2, "౩": 3, "౪": 4, "౫": 5, "౬": 6, "౭": 7, "౮": 8, "౯": 9, "౦": 0 };
    for (const [char, num] of Object.entries(teluguNumerals)) {
      if (text.includes(char)) {
        return { type: "id", value: num };
      }
    }

    // 3. Spoken Telugu number words
    const teluguWordNumbers = [
      { words: ["ఒకటి", "ఒకటో", "one", "first"], num: 1 },
      { words: ["రెండు", "రెండో", "two", "second"], num: 2 },
      { words: ["మూడు", "మూడో", "three", "third"], num: 3 },
      { words: ["నాలుగు", "నాలుగో", "four", "fourth"], num: 4 },
      { words: ["ఐదు", "ఐదో", "five", "fifth"], num: 5 },
      { words: ["ఆరు", "ఆరో", "six", "sixth"], num: 6 },
      { words: ["ఏడు", "ఏడో", "seven", "seventh"], num: 7 },
      { words: ["ఎనిమిది", "ఎనిమిదో", "eight", "eighth"], num: 8 },
      { words: ["తొమ్మిది", "తొమ్మిదో", "nine", "ninth"], num: 9 },
      { words: ["పది", "పదో", "ten", "tenth"], num: 10 },
      { words: ["పదకొండు", "eleven"], num: 11 },
      { words: ["పన్నెండు", "twelve"], num: 12 },
      { words: ["పదమూడు", "thirteen"], num: 13 },
      { words: ["పద్నాలుగు", "fourteen"], num: 14 },
    ];

    for (const entry of teluguWordNumbers) {
      if (entry.words.some((w) => text.includes(w))) {
        return { type: "id", value: entry.num };
      }
    }

    // 4. Spoken Civic Categories
    if (text.includes("నీరు") || text.includes("నీటి") || text.includes("మంచినీరు") || text.includes("పైప్") || text.includes("water")) {
      return { type: "category", value: "water" };
    }
    if (text.includes("కరెంటు") || text.includes("విద్యుత్") || text.includes("ట్రాన్స్‌ఫార్మర్") || text.includes("దీపాలు") || text.includes("electricity") || text.includes("power")) {
      return { type: "category", value: "electricity" };
    }
    if (text.includes("చెత్త") || text.includes("పారిశుధ్యం") || text.includes("దుర్వాసన") || text.includes("garbage") || text.includes("waste")) {
      return { type: "category", value: "garbage" };
    }
    if (text.includes("మురుగు") || text.includes("కాలువ") || text.includes("డ్రైనేజీ") || text.includes("drainage") || text.includes("sewage")) {
      return { type: "category", value: "drainage" };
    }

    // 5. General status inquiry keywords
    const statusInquiryWords = ["స్టేటస్", "స్థితి", "కంప్లైంట్", "ఫిర్యాదు", "సమస్య", "status", "complaint", "issue", "track"];
    if (statusInquiryWords.some((w) => text.includes(w))) {
      return { type: "general" };
    }

    return null;
  };

  // Process voice transcript to query status — debounced so speech pauses trigger search
  const handleVoiceQuery = (text) => {
    setSpokenText(text);
    if (!text || !text.trim()) return;

    if (queryDebounceRef.current) clearTimeout(queryDebounceRef.current);
    queryDebounceRef.current = setTimeout(() => {
      const parsed = extractQueryTarget(text);
      let targetId = null;

      if (parsed && parsed.type === "id") {
        targetId = parsed.value;
      } else if (parsed && parsed.type === "category") {
        const match = recentIssues.find((i) => (i.category || "").toLowerCase() === parsed.value);
        if (match) targetId = match.id;
      } else if (parsed && parsed.type === "general" && recentIssues.length > 0) {
        targetId = recentIssues[0].id;
      } else if (recentIssues.length > 0) {
        targetId = recentIssues[0].id;
      }

      if (!targetId) {
        setErrorMsg(
          isTelugu
            ? "ఫిర్యాదు సంఖ్య లేదా కేటగిరీని గుర్తించలేకపోయాము. దయచేసి కింద ఉన్న ఫిర్యాదును ఎంచుకోండి లేదా ఐడీ నమోదు చేయండి."
            : "Could not identify complaint ID or category. Please pick a complaint below or enter an ID."
        );
        return;
      }

      queryStatus(targetId);
    }, 1000);
  };

  const queryStatus = async (issueId) => {
    setLoading(true);
    setErrorMsg("");
    setStatusResult(null);

    try {
      const issue = await fetchIssueStatusAPI(issueId);
      setStatusResult(issue);
      ttsService.speakIssueStatus(issue, isTelugu);
    } catch (err) {
      setErrorMsg(
        isTelugu
          ? `ఫిర్యాదు #${issueId} కనుగొనబడలేదు లేదా మీకు యాక్సెస్ లేదు.`
          : `Complaint #${issueId} not found or unauthorized.`
      );
    }
    setLoading(false);
  };

  const getStatusColor = (st) => {
    switch (st) {
      case "Resolved": return "#16a34a";
      case "In Progress": return "#2563eb";
      case "Assigned": return "#d97706";
      case "Rejected": return "#dc2626";
      default: return "#64748b";
    }
  };

  return (
    <div className="voice-modal-overlay">
      <div className="voice-modal-content">
        <div className="voice-header">
          <div className="voice-header-title">
            <span>🔍</span>
            <span>{isTelugu ? "స్వరంతో ఫిర్యాదు స్థితి (Status)" : "Voice Complaint Tracking"}</span>
          </div>
          <button className="voice-close-btn" onClick={onClose} aria-label="Close">✕</button>
        </div>

        <div className="voice-body">
          {/* Language selector */}
          <div className="voice-lang-bar">
            <button
              type="button"
              className={`voice-lang-pill ${isTelugu ? "active" : ""}`}
              onClick={() => setLang("te-IN")}
            >
              🇮🇳 తెలుగు
            </button>
            <button
              type="button"
              className={`voice-lang-pill ${!isTelugu ? "active" : ""}`}
              onClick={() => setLang("en-IN")}
            >
              🇬🇧 English
            </button>
          </div>

          {/* Voice query recorder */}
          <VoiceRecorder
            language={lang}
            onTranscriptChange={handleVoiceQuery}
            initialText={spokenText}
            promptTelugu="నొక్కండి: 'నా కంప్లైంట్ స్టేటస్ ఏమిటి?'"
            promptEnglish="Tap and say: 'What is my complaint status?'"
            placeholder={isTelugu ? "మీరు అడిగిన ప్రశ్న ఇక్కడ కనిపిస్తుంది..." : "Spoken question will appear here..."}
          />

          {/* Manual trigger button for voice query — in case user typed/spoke their ID */}
          {spokenText && (
            <button
              type="button"
              className="voice-btn-primary"
              style={{ width: "100%", marginTop: 4, marginBottom: 4 }}
              onClick={() => handleVoiceQuery(spokenText)}
            >
              <span>🔍</span>
              <span>{isTelugu ? "స్థితి చూడండి (Search Status)" : "Search Complaint Status"}</span>
            </button>
          )}

          {/* Quick select from recent complaints */}
          {recentIssues.length > 0 && (
            <div style={{ marginTop: 8 }}>
              <span style={{ fontSize: "0.85rem", fontWeight: 600, color: "#64748b" }}>
                {isTelugu ? "లేదా మీ ఇటీవలి ఫిర్యాదును ఎంచుకోండి:" : "Or select from your recent complaints:"}
              </span>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 6 }}>
                {recentIssues.slice(0, 4).map((i) => (
                  <button
                    key={i.id}
                    type="button"
                    onClick={() => queryStatus(i.id)}
                    style={{
                      background: statusResult?.id === i.id ? "#dbeafe" : "#f1f5f9",
                      border: statusResult?.id === i.id ? "1.5px solid #2563eb" : "1px solid #cbd5e1",
                      borderRadius: 8,
                      padding: "6px 12px",
                      fontSize: "0.85rem",
                      cursor: "pointer",
                      fontWeight: 600,
                      color: "#1e293b",
                    }}
                  >
                    #{i.id} ({i.category})
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Manual ID fallback */}
          <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
            <input
              type="number"
              placeholder={isTelugu ? "ఫిర్యాదు ఐడీ నంబర్ (e.g. 1)" : "Enter Complaint ID #"}
              value={manualIdInput}
              onChange={(e) => setManualIdInput(e.target.value)}
              className="voice-input"
              style={{ flex: 1, padding: "8px 12px" }}
            />
            <button
              type="button"
              className="voice-btn-primary"
              style={{ padding: "8px 16px", fontSize: "0.9rem" }}
              onClick={() => manualIdInput && queryStatus(parseInt(manualIdInput, 10))}
            >
              {isTelugu ? "చూడండి" : "Check"}
            </button>
          </div>

          {loading && (
            <div style={{ textAlign: "center", padding: "16px 0", color: "#64748b" }}>
              ⏳ {isTelugu ? "వివరాలు సేకరిస్తున్నాము..." : "Retrieving status..."}
            </div>
          )}

          {errorMsg && (
            <div style={{ color: "#dc2626", background: "#fef2f2", padding: "10px 14px", borderRadius: 10, fontSize: "0.9rem" }}>
              ⚠️ {errorMsg}
            </div>
          )}

          {/* Real-time Status Card */}
          {statusResult && (
            <div style={{
              background: "#ffffff",
              border: `2px solid ${getStatusColor(statusResult.status)}`,
              borderRadius: 16,
              padding: 18,
              boxShadow: "0 4px 12px rgba(0,0,0,0.06)",
              display: "flex",
              flexDirection: "column",
              gap: 10,
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: "1.1rem", fontWeight: 700, color: "#0f172a" }}>
                  Complaint #{statusResult.id} ({statusResult.category})
                </span>
                <span style={{
                  background: getStatusColor(statusResult.status),
                  color: "#ffffff",
                  padding: "4px 12px",
                  borderRadius: 9999,
                  fontSize: "0.85rem",
                  fontWeight: 700,
                }}>
                  {statusResult.status}
                </span>
              </div>

              <div style={{ fontSize: "0.95rem", color: "#334155" }}>
                <p style={{ margin: "4px 0" }}>📍 <b>Location:</b> Street {statusResult.street} {statusResult.houseNo ? `, House ${statusResult.houseNo}` : ""}</p>
                <p style={{ margin: "4px 0" }}>📝 <b>Problem:</b> {statusResult.description}</p>
                {statusResult.deadline && (
                  <p style={{ margin: "4px 0", color: "#2563eb", fontWeight: 600 }}>
                    📅 <b>Expected Completion:</b> {statusResult.deadline}
                  </p>
                )}
                {statusResult.reason && (
                  <p style={{ margin: "4px 0", color: "#dc2626", fontWeight: 600 }}>
                    ❌ <b>Status Note:</b> {statusResult.reason}
                  </p>
                )}
              </div>

              {/* Spoken voice read-out: problem first, then its position/status */}
              <div style={{ marginTop: 6, display: "flex", flexDirection: "column", gap: 6 }}>
                <span style={{ fontSize: "0.82rem", fontWeight: 700, color: "#475569" }}>
                  🔊 {isTelugu ? "వాయిస్ రీప్లే (Voice Read-out):" : "Voice Read-out (Problem & Position):"}
                </span>
                <div style={{ display: "flex", gap: 8 }}>
                  <button
                    type="button"
                    onClick={() => ttsService.speakIssueStatus(statusResult, true)}
                    style={{
                      flex: 1,
                      background: isTelugu ? "#dbeafe" : "#f1f5f9",
                      border: isTelugu ? "1.5px solid #2563eb" : "1px solid #cbd5e1",
                      borderRadius: 8,
                      padding: "9px 12px",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 6,
                      fontSize: "0.85rem",
                      color: isTelugu ? "#1e40af" : "#1e293b",
                      fontWeight: 700,
                    }}
                  >
                    <span>🔊</span>
                    <span>తెలుగులో వినండి (Telugu)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => ttsService.speakIssueStatus(statusResult, false)}
                    style={{
                      flex: 1,
                      background: !isTelugu ? "#dbeafe" : "#f1f5f9",
                      border: !isTelugu ? "1.5px solid #2563eb" : "1px solid #cbd5e1",
                      borderRadius: 8,
                      padding: "9px 12px",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 6,
                      fontSize: "0.85rem",
                      color: !isTelugu ? "#1e40af" : "#1e293b",
                      fontWeight: 700,
                    }}
                  >
                    <span>🔊</span>
                    <span>Listen in English</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

