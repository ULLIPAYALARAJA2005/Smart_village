import { useState, useEffect, useRef } from "react";
import { SpeechRecognitionService } from "../services/speechRecognitionService";
import { transcribeAudioAPI } from "../services/aiApi";
import "../styles/voice.css";

const QUICK_COMPLAINTS_TE = [
  { icon: "💧", text: "మా వీధిలో మూడు రోజులుగా నీళ్లు రావడం లేదు.", label: "నీరు రావడం లేదు" },
  { icon: "💧", text: "మంచినీటి పైప్‌లైన్ పగిలి నీరు వృధాగా రోడ్డుపై పోతోంది.", label: "పైప్‌లైన్ లీకేజ్" },
  { icon: "⚡", text: "మా వీధిలో కరెంటు లేదు, స్తంభం విరిగిపోయింది.", label: "కరెంటు పోయింది" },
  { icon: "⚡", text: "వీధి దీపాలు వెలగడం లేదు, ట్రాన్స్‌ఫార్మర్ సమస్య ఉంది.", label: "వీధి దీపాలు వెలగట్లేదు" },
  { icon: "🗑", text: "రోడ్డు పక్కన చెత్త కుప్పలు పేరుకుపోయాయి, దుర్వాసన వస్తోంది.", label: "చెత్త కుప్పలు" },
  { icon: "🚰", text: "మురుగు నీరు రోడ్డుపైకి వస్తోంది, కాలువలు నిండిపోయాయి.", label: "మురుగు నీరు కాలువలు" },
];

const QUICK_COMPLAINTS_EN = [
  { icon: "💧", text: "Water has not been coming to our street for three days.", label: "No Water Supply" },
  { icon: "💧", text: "Drinking water pipeline is broken and leaking on the road.", label: "Pipeline Leakage" },
  { icon: "⚡", text: "Power cut in our street and damaged electricity pole.", label: "Power Cut / Pole" },
  { icon: "⚡", text: "Streetlights are not working and transformer is damaged.", label: "Streetlights Broken" },
  { icon: "🗑", text: "Garbage has not been collected and trash is piling up.", label: "Garbage Dumped" },
  { icon: "🚰", text: "Blocked drainage canal causing sewage overflow on street.", label: "Drainage Overflow" },
];

export default function VoiceRecorder({
  language = "te-IN",
  onLanguageChange,
  onTranscriptChange,
  initialText = "",
  placeholder = "Recognized speech will appear here...",
  promptTelugu = "మైక్రోఫోన్ నొక్కి మీ సమస్యను చెప్పండి",
  promptEnglish = "Tap the microphone and speak your problem",
}) {
  const [isListening, setIsListening] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [transcript, setTranscript] = useState(initialText);
  const [translationText, setTranslationText] = useState("");
  const [statusMessage, setStatusMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [audioUrl, setAudioUrl] = useState(null);
  const [recordingSeconds, setRecordingSeconds] = useState(0);

  const serviceRef = useRef(null);
  const timerRef = useRef(null);
  // Keep latest callback in a ref so the speech service closure never goes stale
  const onTranscriptChangeRef = useRef(onTranscriptChange);
  useEffect(() => { onTranscriptChangeRef.current = onTranscriptChange; }, [onTranscriptChange]);

  const isTelugu = language.startsWith("te");

  // Accumulator for final transcript parts across speech recognition events
  const finalAccRef = useRef("");

  useEffect(() => {
    // Reset accumulator when language changes (new service instance)
    finalAccRef.current = "";

    serviceRef.current = new SpeechRecognitionService({
      language,
      onResult: ({ finalTranscript, interimTranscript }) => {
        // Accumulate confirmed (final) text; show interim appended live
        if (finalTranscript) {
          finalAccRef.current = (finalAccRef.current + " " + finalTranscript).trim();
        }
        const displayText = interimTranscript
          ? (finalAccRef.current + " " + interimTranscript).trim()
          : finalAccRef.current;

        if (displayText) {
          setTranscript(displayText);
          // Always call latest callback via ref — avoids stale-closure bug
          if (onTranscriptChangeRef.current) onTranscriptChangeRef.current(displayText);
          if (!interimTranscript) {
            setStatusMessage(isTelugu ? "వాయిస్ విజయవంతంగా గుర్తించబడింది!" : "Voice successfully recognized!");
          }
        }
      },
      onError: ({ code, message }) => {
        // If network error occurred, the service automatically falls back to audio recording
        if (code === "network") {
          setStatusMessage(
            isTelugu
              ? "ఆడియో రికార్డర్ ఆన్‌లో ఉంది... మాట్లాడండి లేదా కింద ఉన్న సమస్యను ఎంచుకోండి"
              : "Audio recorder active... speak or choose a quick problem below"
          );
          setErrorMessage("");
        } else {
          setErrorMessage(message);
          setIsListening(false);
        }
      },
      onStatusChange: (status, meta = {}) => {
        if (status === "listening") {
          setIsListening(true);
          setErrorMessage("");
          setRecordingSeconds(0);
          clearInterval(timerRef.current);
          timerRef.current = setInterval(() => {
            setRecordingSeconds((s) => s + 1);
          }, 1000);

          setStatusMessage(
            isTelugu
              ? "🔴 రికార్డ్ అవుతోంది... మాట్లాడండి (ఆపడానికి మళ్లీ నొక్కండి)"
              : "🔴 Recording audio... speak clearly (Tap again to stop)"
          );
        } else if (status === "stopped") {
          setIsListening(false);
          clearInterval(timerRef.current);
        } else if (status === "recorded") {
          setIsListening(false);
          clearInterval(timerRef.current);
          const blob = meta.blob || (serviceRef.current && serviceRef.current.getRecordedAudio());
          if (blob) {
            setAudioUrl(URL.createObjectURL(blob));
            setIsTranscribing(true);
            setStatusMessage(
              isTelugu
                ? "⏳ మీ వాయిస్‌ను అక్షరాల్లోకి మారుస్తున్నాము (Transcribing)..."
                : "⏳ Converting your speech into text..."
            );

            transcribeAudioAPI({
              audioBlob: blob,
              language: isTelugu ? "te" : "en",
            })
              .then((res) => {
                setIsTranscribing(false);
                if (res && res.transcription) {
                  finalAccRef.current = res.transcription;
                  setTranscript(res.transcription);
                  if (res.translation) {
                    setTranslationText(res.translation);
                  }
                  if (onTranscriptChangeRef.current) {
                    onTranscriptChangeRef.current(res.transcription);
                  }
                  setStatusMessage(
                    isTelugu
                      ? "✅ వాయిస్ విజయవంతంగా గుర్తించబడింది!"
                      : "✅ Speech converted to text successfully!"
                  );
                } else if (!finalAccRef.current) {
                  setStatusMessage(
                    isTelugu
                      ? "⚠️ స్పష్టంగా వినబడలేదు. దయచేసి మళ్లీ మాట్లాడండి."
                      : "⚠️ Could not hear clearly. Please tap microphone and speak again."
                  );
                }
              })
              .catch((transErr) => {
                setIsTranscribing(false);
                console.warn("Backend transcription fallback note:", transErr);
                if (!finalAccRef.current) {
                  setStatusMessage(
                    isTelugu
                      ? "✅ ఆడియో రికార్డ్ చేయబడింది!"
                      : "✅ Audio recorded successfully!"
                  );
                }
              });
          }
        }
      },
    });

    return () => {
      clearInterval(timerRef.current);
      if (serviceRef.current) serviceRef.current.stop();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [language, isTelugu]);

  const toggleRecording = async () => {
    setErrorMessage("");

    // Stop browser TTS speech immediately so audio output doesn't feed back into mic
    if (typeof window !== "undefined" && window.speechSynthesis) {
      try {
        window.speechSynthesis.cancel();
      } catch {}
    }

    if (isListening) {
      if (serviceRef.current) serviceRef.current.stop();
      setIsListening(false);
      clearInterval(timerRef.current);
    } else {
      try {
        await serviceRef.current.start();
      } catch (err) {
        console.warn("Recording start note:", err);
      }
    }
  };

  const handleSelectQuickChip = (text) => {
    finalAccRef.current = text;
    setTranscript(text);
    if (onTranscriptChangeRef.current) onTranscriptChangeRef.current(text);
    setStatusMessage(isTelugu ? "సమస్య ఎంపికైంది!" : "Problem selected!");
    setErrorMessage("");
  };

  const handleTextChange = (e) => {
    const val = e.target.value;
    finalAccRef.current = val;
    setTranscript(val);
    if (onTranscriptChangeRef.current) onTranscriptChangeRef.current(val);
  };

  const handleReset = () => {
    if (serviceRef.current) serviceRef.current.stop();
    finalAccRef.current = "";
    setIsListening(false);
    setIsTranscribing(false);
    clearInterval(timerRef.current);
    setTranscript("");
    setTranslationText("");
    setErrorMessage("");
    setStatusMessage("");
    setAudioUrl(null);
    setRecordingSeconds(0);
    if (onTranscriptChangeRef.current) onTranscriptChangeRef.current("");
  };

  const quickList = isTelugu ? QUICK_COMPLAINTS_TE : QUICK_COMPLAINTS_EN;

  return (
    <div className="voice-recorder-container">
      {/* Language Toggle */}
      {onLanguageChange && (
        <div className="voice-lang-bar">
          <button
            type="button"
            className={`voice-lang-pill ${isTelugu ? "active" : ""}`}
            onClick={() => onLanguageChange("te-IN")}
          >
            🇮🇳 తెలుగు (Telugu)
          </button>
          <button
            type="button"
            className={`voice-lang-pill ${!isTelugu ? "active" : ""}`}
            onClick={() => onLanguageChange("en-IN")}
          >
            🇬🇧 English
          </button>
        </div>
      )}

      {/* Main Microphone Button */}
      <div className="voice-mic-container">
        <button
          type="button"
          className={`voice-mic-button ${isListening ? "listening" : ""}`}
          onClick={toggleRecording}
          title={isListening ? "Stop listening" : "Start speaking"}
          aria-label={isListening ? "Stop listening" : "Start speaking"}
        >
          {isListening ? "⏹" : "🎙"}
        </button>

        <div className="voice-mic-status">
          {isListening ? (
            <span style={{ color: "#dc2626" }}>
              {statusMessage} ({recordingSeconds}s)
            </span>
          ) : (
            statusMessage || (isTelugu ? promptTelugu : promptEnglish)
          )}
        </div>

        <div className="voice-mic-instruction">
          {isListening
            ? (isTelugu ? "పూర్తయిన తర్వాత ఆపడానికి బటన్ నొక్కండి" : "Tap again to stop and process")
            : (isTelugu ? "నొక్కి మాట్లాడండి లేదా కింద ఉన్న సాధారణ సమస్యపై నొక్కండి" : "Tap to speak, or pick a common problem below")}
        </div>
      </div>

      {/* Helpful One-Tap Common Village Complaints */}
      <div style={{ marginTop: 8, marginBottom: 12 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
          <span style={{ fontSize: "0.82rem", fontWeight: 700, color: "#475569" }}>
            {isTelugu ? "⚡ సులువుగా ఎంచుకోండి (1-Tap Quick Select):" : "⚡ 1-Tap Quick Problem Select:"}
          </span>
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
          {quickList.map((chip, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => handleSelectQuickChip(chip.text)}
              style={{
                background: transcript === chip.text ? "#dbeafe" : "#ffffff",
                border: transcript === chip.text ? "1.5px solid #2563eb" : "1px solid #cbd5e1",
                borderRadius: 9999,
                padding: "6px 12px",
                fontSize: "0.82rem",
                color: transcript === chip.text ? "#1e40af" : "#1e293b",
                fontWeight: 600,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: 5,
                transition: "all 0.15s ease",
              }}
            >
              <span>{chip.icon}</span>
              <span>{chip.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Error Notice */}
      {errorMessage && (
        <div style={{
          background: "#fef2f2",
          color: "#991b1b",
          border: "1px solid #fecaca",
          borderRadius: 12,
          padding: "10px 14px",
          fontSize: "0.9rem",
          display: "flex",
          alignItems: "center",
          gap: 8,
          margin: "8px 0"
        }}>
          <span>⚠️</span>
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Recognized Text Card & Manual Edit Box */}
      <div className="voice-transcript-card">
        <div className="voice-transcript-header">
          <span>{isTelugu ? "సమస్య వివరణ (మార్చవచ్చు):" : "Problem Description (Editable):"}</span>
          {transcript && (
            <button
              type="button"
              onClick={handleReset}
              style={{
                background: "transparent",
                border: "none",
                color: "#64748b",
                cursor: "pointer",
                fontSize: "0.8rem",
                textDecoration: "underline"
              }}
            >
              {isTelugu ? "క్లియర్ చేయండి" : "Clear"}
            </button>
          )}
        </div>

        <textarea
          className="voice-transcript-textarea"
          value={transcript}
          onChange={handleTextChange}
          placeholder={isTranscribing ? (isTelugu ? "⏳ మీ మాటలను విశ్లేషిస్తున్నాము..." : "⏳ Converting speech to text...") : placeholder}
          rows={3}
        />

        {/* WhatsApp-Style Voice Translation Preview */}
        {translationText && (
          <div style={{
            marginTop: 8,
            padding: "8px 12px",
            background: "#f0fdf4",
            border: "1px solid #bbf7d0",
            borderRadius: 8,
            fontSize: "0.85rem",
            color: "#166534"
          }}>
            <strong>🌐 {isTelugu ? "ఇంగ్లీష్ అనువాదం (English Translation):" : "Translation:"}</strong>
            <p style={{ margin: "4px 0 0 0", color: "#14532d" }}>{translationText}</p>
          </div>
        )}

        {audioUrl && (
          <div style={{ marginTop: 8 }}>
            <p style={{ fontSize: "0.82rem", color: "#475569", marginBottom: 4 }}>
              {isTelugu ? "🎤 రికార్డ్ చేసిన మీ వాయిస్:" : "🎤 Your Recorded Voice Audio:"}
            </p>
            <audio src={audioUrl} controls style={{ width: "100%", height: 36 }} />
          </div>
        )}
      </div>
    </div>
  );
}
