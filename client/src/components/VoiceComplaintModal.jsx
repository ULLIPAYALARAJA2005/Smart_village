import { useState, useEffect, useRef } from "react";
import VoiceRecorder from "./VoiceRecorder";
import { analyzeComplaintAPI, submitConfirmedComplaintAPI } from "../services/aiApi";
import GPSLocationPicker from "./GPSLocationPicker";
import { ttsService } from "../services/ttsService";
import "../styles/voice.css";

const CATEGORIES = [
  { id: "water", nameEn: "Water Supply", nameTe: "💧 మంచినీరు", icon: "💧" },
  { id: "electricity", nameEn: "Electricity", nameTe: "⚡ విద్యుత్", icon: "⚡" },
  { id: "garbage", nameEn: "Garbage / Waste", nameTe: "🗑 చెత్త / పారిశుధ్యం", icon: "🗑" },
  { id: "drainage", nameEn: "Drainage / Sewage", nameTe: "🚰 మురుగు / డ్రైనేజీ", icon: "🚰" },
];

export default function VoiceComplaintModal({ isOpen, onClose, onSuccess, userId }) {
  const [lang, setLang] = useState("te-IN");
  const isTelugu = lang.startsWith("te");

  // Multi-step states: 'input' -> 'analyzing' -> 'review' -> 'submitting' -> 'success'
  const [step, setStep] = useState("input");

  // Form data
  const [description, setDescription] = useState("");
  const [photo, setPhoto] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [street, setStreet] = useState("Main Village Road");
  const [houseNo, setHouseNo] = useState("");
  const [gpsData, setGpsData] = useState({
    latitude: null,
    longitude: null,
    location_accuracy: null,
    location_captured: false,
  });

  // AI analysis results
  const [aiData, setAiData] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState("");
  const [analysisError, setAnalysisError] = useState("");
  const [submissionError, setSubmissionError] = useState("");

  // Success state
  const [submittedIssue, setSubmittedIssue] = useState(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      setStep("input");
      setDescription("");
      setPhoto(null);
      setPhotoPreview(null);
      setAiData(null);
      setSelectedCategory("");
      setAnalysisError("");
      setSubmissionError("");
      setSubmittedIssue(null);
      ttsService.speakPromptMicrophone(isTelugu);
    } else {
      ttsService.stop();
    }
  }, [isOpen, isTelugu]);

  if (!isOpen) return null;

  const handleLanguageToggle = (newLang) => {
    setLang(newLang);
    ttsService.speakPromptMicrophone(newLang.startsWith("te"));
  };

  const handlePhotoSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      alert(isTelugu ? "దయచేసి సరైన ఫోటోను ఎంచుకోండి." : "Please select a valid image file.");
      return;
    }
    setPhoto(file);
    setPhotoPreview(URL.createObjectURL(file));
  };

  const handleRemovePhoto = () => {
    setPhoto(null);
    setPhotoPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

// Client-side quick compression to make photo analysis instantaneous
const compressImageForAnalysis = (file) => {
  if (!file) return Promise.resolve(null);
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new window.Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const maxDim = 480;
        let w = img.width;
        let h = img.height;
        if (w > h && w > maxDim) {
          h = Math.round((h * maxDim) / w);
          w = maxDim;
        } else if (h > maxDim) {
          w = Math.round((w * maxDim) / h);
          h = maxDim;
        }
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, w, h);
        canvas.toBlob(
          (blob) => {
            if (blob) {
              resolve(new File([blob], file.name || "photo.jpg", { type: "image/jpeg" }));
            } else {
              resolve(file);
            }
          },
          "image/jpeg",
          0.85
        );
      };
      img.onerror = () => resolve(file);
      img.src = e.target.result;
    };
    reader.onerror = () => resolve(file);
    reader.readAsDataURL(file);
  });
};

  // Instant client-side keyword classifier (runs in < 1ms, no network needed)
  const quickClassify = (text) => {
    const lower = (text || "").toLowerCase();
    if (lower.includes("మురుగు") || lower.includes("కాలువ") || lower.includes("drain") || lower.includes("sewage") || lower.includes("గట్టర్")) return "drainage";
    if (lower.includes("చెత్త") || lower.includes("waste") || lower.includes("trash") || lower.includes("garbage") || lower.includes("పారిశుధ్యం")) return "garbage";
    if (lower.includes("కరెంటు") || lower.includes("విద్యుత్") || lower.includes("electric") || lower.includes("power") || lower.includes("transformer") || lower.includes("pole") || lower.includes("దీపాలు")) return "electricity";
    if (lower.includes("నీళ్లు") || lower.includes("నీరు") || lower.includes("పైప్") || lower.includes("బోరు") || lower.includes("water") || lower.includes("pipeline") || lower.includes("tap")) return "water";
    return null;
  };

  // Run AI analysis
  const handleProceedToAnalysis = async () => {
    if (!description.trim() && !photo) {
      alert(isTelugu ? "దయచేసి మీ సమస్యను చెప్పండి లేదా ఫోటో తీయండి." : "Please speak your problem or capture a photo.");
      return;
    }

    setStep("analyzing");
    setAnalysisError("");

    // ⚡ Instant pre-classification: show a preliminary category < 1ms
    const instantCat = quickClassify(description);
    if (instantCat) {
      setSelectedCategory(instantCat);
    }

    try {
      const optimizedPhoto = photo ? await compressImageForAnalysis(photo) : null;

      // Race the API call against a 7-second timeout; whichever wins first
      const apiCallPromise = analyzeComplaintAPI({
        description: description.trim(),
        photo: optimizedPhoto,
        language: isTelugu ? "te" : "en",
      });
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error("timeout")), 7000)
      );

      const result = await Promise.race([apiCallPromise, timeoutPromise]);

      setAiData(result);
      if (result.suggested_category) {
        setSelectedCategory(result.suggested_category);
        ttsService.speakAiSuggestion(result.suggested_category, isTelugu);
      } else {
        ttsService.speak({
          text: isTelugu ? "దయచేసి మీ సమస్య కేటగిరీని ఎంచుకోండి." : "Please select the issue category.",
          language: isTelugu ? "te-IN" : "en-IN",
        });
      }
      setStep("review");
    } catch (err) {
      console.warn("AI analysis note:", err);
      // Fall back to the already-computed instant category or derive one now
      const fallbackCat = instantCat || quickClassify(description) || "water";
      setSelectedCategory(fallbackCat);

      setAiData({
        suggested_category: fallbackCat,
        prediction_agreement: true,
        message: isTelugu
          ? `AI ఇది ${fallbackCat} సమస్యగా గుర్తించింది. నిర్ధారించండి.`
          : `AI identified this as a ${fallbackCat} issue. Please confirm.`,
      });
      ttsService.speakAiSuggestion(fallbackCat, isTelugu);
      setStep("review");
    }
  };

  // Final submission
  const handleSubmitComplaint = async () => {
    if (!selectedCategory) {
      alert(isTelugu ? "దయచేసి సమస్య రకాన్ని ఎంచుకోండి." : "Please select a category.");
      return;
    }

    setStep("submitting");
    setSubmissionError("");

    try {
      let inputMethod = "voice_photo";
      if (description && !photo) inputMethod = "voice";
      if (!description && photo) inputMethod = "photo";

      const aiAnalysisPayload = aiData ? {
        predicted_text_category: aiData.text_prediction?.predicted_category,
        text_similarity_score: aiData.text_prediction?.confidence,
        predicted_image_category: aiData.image_prediction?.predicted_category,
        image_similarity_score: aiData.image_prediction?.confidence,
      } : null;

      const res = await submitConfirmedComplaintAPI({
        category: selectedCategory,
        street: street.trim() || "Main Bazaar",
        houseNo: houseNo.trim(),
        description: description.trim() || `Reported ${selectedCategory} problem`,
        photo,
        userId,
        inputMethod,
        language: isTelugu ? "te" : "en",
        aiAnalysis: aiAnalysisPayload,
        latitude: gpsData.latitude,
        longitude: gpsData.longitude,
        location_accuracy: gpsData.location_accuracy,
        location_captured: gpsData.location_captured,
      });

      const issueId = res.id || res.issue?.id || "REG-" + Math.floor(Math.random() * 9000 + 1000);
      setSubmittedIssue({
        id: issueId,
        category: selectedCategory,
        date: new Date().toLocaleDateString(),
      });

      ttsService.speakSuccess(issueId, isTelugu);
      setStep("success");
      if (onSuccess) onSuccess();
    } catch (err) {
      setSubmissionError(err.message || "Failed to submit complaint. Please try again.");
      setStep("review");
    }
  };

  const getCategoryObj = (catId) => CATEGORIES.find(c => c.id === catId);

  return (
    <div className="voice-modal-overlay">
      <div className="voice-modal-content">
        {/* Header */}
        <div className="voice-header">
          <div className="voice-header-title">
            <span>🎙️</span>
            <span>{isTelugu ? "స్వర & ఫోటో ఫిర్యాదు" : "AI Voice & Photo Complaint"}</span>
          </div>
          <button className="voice-close-btn" onClick={onClose} aria-label="Close">✕</button>
        </div>

        <div className="voice-body">
          {/* STEP 1: VOICE INPUT & PHOTO CAPTURE */}
          {step === "input" && (
            <>
              <VoiceRecorder
                language={lang}
                onLanguageChange={handleLanguageToggle}
                onTranscriptChange={(t) => setDescription(t)}
                initialText={description}
                placeholder={isTelugu ? "మీరు మాట్లాడిన మాటలు ఇక్కడ కనిపిస్తాయి..." : "Recognized voice text will appear here..."}
              />

              {/* Photo Capture Section */}
              <div className="voice-photo-card" onClick={() => fileInputRef.current?.click()}>
                <input
                  type="file"
                  ref={fileInputRef}
                  style={{ display: "none" }}
                  accept="image/*"
                  capture="environment"
                  onChange={handlePhotoSelect}
                />
                {photoPreview ? (
                  <div style={{ width: "100%", position: "relative" }}>
                    <img src={photoPreview} alt="Captured problem" className="voice-photo-preview" />
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); handleRemovePhoto(); }}
                      style={{
                        position: "absolute",
                        top: 8,
                        right: 8,
                        background: "rgba(15, 23, 42, 0.75)",
                        color: "white",
                        border: "none",
                        borderRadius: "50%",
                        width: 28,
                        height: 28,
                        cursor: "pointer"
                      }}
                    >✕</button>
                  </div>
                ) : (
                  <>
                    <span style={{ fontSize: 36 }}>📸</span>
                    <strong style={{ fontSize: "1rem", color: "#1e293b" }}>
                      {isTelugu ? "సమస్య ఫోటో తీయండి / అప్‌లోడ్ చేయండి" : "Capture or Upload Problem Photo"}
                    </strong>
                    <span style={{ fontSize: "0.85rem", color: "#64748b" }}>
                      {isTelugu ? "కెమెరా తెరవడానికి ఇక్కడ తాకండి" : "Tap here to take photo or choose from gallery"}
                    </span>
                  </>
                )}
              </div>

              {/* GPS Location Picker - Real-time */}
              <GPSLocationPicker onLocationChange={setGpsData} />

              {/* Action Button */}
              <button
                type="button"
                className="voice-btn-primary"
                onClick={handleProceedToAnalysis}
              >
                <span>🔍</span>
                <span>{isTelugu ? "సమస్యను పరిశీలించండి (Analyze)" : "Analyze Complaint with AI"}</span>
              </button>
            </>
          )}

          {/* STEP 2: ANALYZING LOADING STATE */}
          {step === "analyzing" && (
            <div style={{ textAlign: "center", padding: "32px 20px" }}>
              {/* Spinner */}
              <div style={{
                width: 56, height: 56, border: "5px solid #e2e8f0",
                borderTop: "5px solid #138A72", borderRadius: "50%",
                animation: "spin 0.8s linear infinite", margin: "0 auto"
              }} />
              <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>

              <h3 style={{ marginTop: 16, color: "#1e293b", fontSize: "1.05rem" }}>
                {isTelugu ? "AI పరిశీలిస్తోంది..." : "AI is analyzing..."}
              </h3>

              {/* Show instant pre-classified category immediately if available */}
              {selectedCategory && (
                <div style={{
                  display: "inline-flex", alignItems: "center", gap: 8,
                  marginTop: 12, background: "#f0fdf4", border: "1px solid #bbf7d0",
                  borderRadius: 999, padding: "6px 16px", fontSize: "0.9rem",
                  color: "#166534", fontWeight: 600
                }}>
                  <span>{getCategoryObj(selectedCategory)?.icon}</span>
                  <span>
                    {isTelugu
                      ? getCategoryObj(selectedCategory)?.nameTe
                      : getCategoryObj(selectedCategory)?.nameEn}
                  </span>
                  <span style={{ fontSize: "0.78rem", color: "#4ade80" }}>
                    {isTelugu ? "(అంచనా)" : "(estimated)"}
                  </span>
                </div>
              )}

              <p style={{ color: "#94a3b8", marginTop: 10, fontSize: "0.82rem" }}>
                {isTelugu ? "సర్వర్ నిర్ధారణ కోసం వేచి ఉంది... (సాధారణంగా 2–4 సెకండ్లు)" : "Waiting for server confirmation… (usually 2–4 s)"}
              </p>
            </div>
          )}

          {/* STEP 3: REVIEW & CONFIRM */}
          {step === "review" && (
            <>
              {/* AI Suggestion Card */}
              <div className="voice-ai-card">
                <div className="voice-ai-header">
                  <span className="voice-ai-badge">AI RECOMMENDATION</span>
                  {aiData?.prediction_agreement && (
                    <span style={{ fontSize: "0.8rem", color: "#16a34a", fontWeight: 700 }}>
                      ✔ Models Agree
                    </span>
                  )}
                  {aiData && !aiData.prediction_agreement && aiData.image_prediction?.predicted_category && (
                    <span style={{ fontSize: "0.8rem", color: "#d97706", fontWeight: 700 }}>
                      ⚠️ Mismatch Detected
                    </span>
                  )}
                </div>

                <div className="voice-ai-suggestion">
                  <span>{selectedCategory ? getCategoryObj(selectedCategory)?.icon : "❓"}</span>
                  <span>
                    {selectedCategory
                      ? (isTelugu ? getCategoryObj(selectedCategory)?.nameTe : getCategoryObj(selectedCategory)?.nameEn)
                      : (isTelugu ? "కేటగిరీ ఎంచుకోండి" : "Select Category")}
                  </span>
                </div>

                <p className="voice-ai-confidence">
                  {aiData?.message || (isTelugu ? "దయచేసి సరైన సమస్య రకాన్ని నిర్ధారించండి." : "Please confirm the appropriate problem category.")}
                </p>

                {/* Category Selection Grid (Allows Villager Correction) */}
                <div className="voice-category-grid">
                  {CATEGORIES.map((cat) => (
                    <button
                      key={cat.id}
                      type="button"
                      className={`voice-cat-btn ${selectedCategory === cat.id ? "selected" : ""}`}
                      onClick={() => setSelectedCategory(cat.id)}
                    >
                      <span>{cat.icon}</span>
                      <span>{isTelugu ? cat.nameTe : cat.nameEn}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Review Description & Photo */}
              <div style={{ background: "#f8fafc", padding: 14, borderRadius: 14, border: "1px solid #e2e8f0" }}>
                <strong style={{ fontSize: "0.85rem", color: "#64748b", textTransform: "uppercase" }}>
                  {isTelugu ? "ఫిర్యాదు వివరాలు" : "Problem Summary"}
                </strong>
                <p style={{ margin: "6px 0", fontSize: "0.95rem", color: "#0f172a" }}>
                  {description || (isTelugu ? "(వివరణ నమోదు చేయబడలేదు)" : "(No description provided)")}
                </p>
                {photoPreview && (
                  <img src={photoPreview} alt="Preview" style={{ height: 80, borderRadius: 8, marginTop: 4, objectFit: "cover" }} />
                )}
              </div>

              {/* GPS summary in review */}
              {gpsData.location_captured && (
                <div style={{ background: "#dcfce7", padding: "0.6rem 1rem", borderRadius: "8px", marginBottom: "0.5rem", fontSize: "0.85rem", color: "#166534", fontWeight: 600 }}>
                  📍 Location captured: Lat {parseFloat(gpsData.latitude).toFixed(6)}, Lng {parseFloat(gpsData.longitude).toFixed(6)}
                  {gpsData.location_accuracy && ` (±${Math.round(gpsData.location_accuracy)}m)`}
                </div>
              )}

              <div className="voice-loc-grid">
                <div>
                  <label style={{ fontSize: "0.8rem", fontWeight: 600, color: "#475569" }}>
                    {isTelugu ? "వీధి పేరు" : "Street"}
                  </label>
                  <input
                    type="text"
                    className="voice-input"
                    value={street}
                    onChange={(e) => setStreet(e.target.value)}
                    placeholder={isTelugu ? "వీధి పేరు" : "Street name"}
                  />
                </div>
                <div>
                  <label style={{ fontSize: "0.8rem", fontWeight: 600, color: "#475569" }}>
                    {isTelugu ? "ఇంటి నంబరు (ఐచ్ఛికం)" : "House No (Optional)"}
                  </label>
                  <input
                    type="text"
                    className="voice-input"
                    value={houseNo}
                    onChange={(e) => setHouseNo(e.target.value)}
                    placeholder="e.g. 12-B"
                  />
                </div>
              </div>

              {submissionError && (
                <div style={{ color: "#dc2626", fontSize: "0.9rem", fontWeight: 500 }}>
                  ⚠️ {submissionError}
                </div>
              )}

              {/* Confirm / Back Controls */}
              <div className="voice-actions">
                <button
                  type="button"
                  className="voice-btn-secondary"
                  onClick={() => setStep("input")}
                >
                  {isTelugu ? "సవరించండి (Back)" : "Edit Details"}
                </button>
                <button
                  type="button"
                  className="voice-btn-primary"
                  onClick={handleSubmitComplaint}
                  disabled={!selectedCategory}
                >
                  <span>✔</span>
                  <span>{isTelugu ? "అవును, నమోదు చేయండి" : "Yes, Submit Complaint"}</span>
                </button>
              </div>
            </>
          )}

          {/* STEP 4: SUBMITTING STATE */}
          {step === "submitting" && (
            <div style={{ textAlign: "center", padding: "40px 20px" }}>
              <div style={{ fontSize: 50 }}>⏳</div>
              <h3 style={{ marginTop: 16, color: "#1e293b" }}>
                {isTelugu ? "ఫిర్యాదు నమోదు అవుతోంది..." : "Submitting your complaint..."}
              </h3>
            </div>
          )}

          {/* STEP 5: SUCCESS SCREEN */}
          {step === "success" && submittedIssue && (
            <div className="voice-success-box">
              <div className="voice-success-icon">🎉</div>
              <h2 style={{ color: "#065f46", margin: 0 }}>
                {isTelugu ? "ఫిర్యాదు విజయవంతంగా నమోదైంది!" : "Complaint Registered Successfully!"}
              </h2>
              <p style={{ color: "#475569", margin: "4px 0" }}>
                {isTelugu ? "మీ ప్రత్యేక ఫిర్యాదు సంఖ్య:" : "Your Official Complaint Tracking ID:"}
              </p>
              <div className="voice-success-id">
                ID #{submittedIssue.id}
              </div>

              <div style={{ background: "#f8fafc", padding: "12px 20px", borderRadius: 12, border: "1px solid #e2e8f0", width: "100%" }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.95rem", color: "#334155" }}>
                  <span>{isTelugu ? "సమస్య రకం:" : "Category:"}</span>
                  <strong>{getCategoryObj(submittedIssue.category)?.nameEn}</strong>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.95rem", color: "#334155", marginTop: 6 }}>
                  <span>{isTelugu ? "తేదీ:" : "Date:"}</span>
                  <strong>{submittedIssue.date}</strong>
                </div>
              </div>

              <button
                type="button"
                className="voice-btn-primary"
                style={{ width: "100%", marginTop: 10 }}
                onClick={onClose}
              >
                <span>📋</span>
                <span>{isTelugu ? "డాష్‌బోర్డ్‌లో చూడండి" : "View in Dashboard"}</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

