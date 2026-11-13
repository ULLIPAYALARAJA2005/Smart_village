import React, { useState } from "react";
import { assignmentActionAPI } from "../services/aiApi";

// Haversine formula to calculate distance between two coordinates in km
function calculateHaversineDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth's radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const d = R * c; // Distance in km
  if (d < 1) {
    return `${Math.round(d * 1000)} metres away`;
  }
  return `${d.toFixed(2)} km away`;
}

export default function WorkerAssignmentCard({ item, onUpdate, showToast }) {
  const assignment = item.assignment || {};
  const assignmentId = assignment.id || item.id;
  const currentStatus = assignment.work_status || item.status || "Assigned";

  const [loadingAction, setLoadingAction] = useState(false);
  const [distanceText, setDistanceText] = useState(null);
  const [distanceLoading, setDistanceLoading] = useState(false);

  // Complete work modal / inline state
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [completionPhoto, setCompletionPhoto] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [completionNotes, setCompletionNotes] = useState("");
  const [workerNotes, setWorkerNotes] = useState("");
  const [modalError, setModalError] = useState(null);

  const hasGps =
    item.latitude &&
    item.longitude &&
    !isNaN(parseFloat(item.latitude)) &&
    !isNaN(parseFloat(item.longitude));

  const lat = hasGps ? parseFloat(item.latitude) : null;
  const lng = hasGps ? parseFloat(item.longitude) : null;

  // Measure distance from worker current position with robust dual-accuracy fallback
  const handleGetDistance = () => {
    if (!hasGps) return;
    if (!navigator.geolocation) {
      if (showToast) showToast("Geolocation is not supported by your browser.", "error");
      return;
    }
    setDistanceLoading(true);

    const onLocationSuccess = (pos) => {
      const dist = calculateHaversineDistance(
        pos.coords.latitude,
        pos.coords.longitude,
        lat,
        lng
      );
      setDistanceText(dist);
      setDistanceLoading(false);
      if (showToast) showToast(`📍 Calculated distance: ${dist}`, "success");
    };

    // Try high-accuracy first (satellite GPS); if it times out/fails, fallback to standard Wi-Fi/Cell/IP
    navigator.geolocation.getCurrentPosition(
      onLocationSuccess,
      (err1) => {
        console.warn("High-accuracy GPS attempt note:", err1?.message || err1);
        // Fallback: standard accuracy with longer timeout
        navigator.geolocation.getCurrentPosition(
          onLocationSuccess,
          (err2) => {
            console.warn("Standard accuracy fallback note:", err2?.message || err2);
            setDistanceLoading(false);
            if (showToast) {
              showToast(
                "Could not access device location. Please enable location permissions or use Google Maps navigation below.",
                "error"
              );
            }
          },
          { enableHighAccuracy: false, timeout: 12000, maximumAge: 60000 }
        );
      },
      { enableHighAccuracy: true, timeout: 6000, maximumAge: 0 }
    );
  };

  // Perform lifecycle action
  const handleAction = async (actionName, payload = {}) => {
    const targetId = assignment.id || item.id;
    if (!targetId) {
      if (showToast) showToast("No assignment or issue ID found", "error");
      return;
    }
    setLoadingAction(true);
    try {
      const res = await assignmentActionAPI(targetId, actionName, payload);
      if (showToast) showToast(res.message || "Updated status", "success");
      if (onUpdate) onUpdate();
    } catch (err) {
      if (showToast) showToast(err.message || "Action failed", "error");
    } finally {
      setLoadingAction(false);
    }
  };

  // Submit complete work with photo and notes
  const handleCompleteSubmit = async (e) => {
    e.preventDefault();
    setModalError(null);
    if (!completionPhoto) {
      setModalError("Please upload a completion photo as proof of work.");
      return;
    }

    const formData = new FormData();
    formData.append("completion_photo", completionPhoto);
    if (completionNotes) formData.append("completion_notes", completionNotes);
    if (workerNotes) formData.append("worker_notes", workerNotes);

    setLoadingAction(true);
    try {
      const targetId = assignment.id || item.id;
      await assignmentActionAPI(targetId, "complete", formData);
      if (showToast) showToast("Work marked as completed! Awaiting admin verification.", "success");
      setShowCompleteModal(false);
      setCompletionPhoto(null);
      setPhotoPreview(null);
      setCompletionNotes("");
      if (onUpdate) onUpdate();
    } catch (err) {
      setModalError(err.message || "Failed to submit work proof. Please try again.");
    } finally {
      setLoadingAction(false);
    }
  };

  const priorityColors = {
    urgent: { bg: "#fee2e2", text: "#b91c1c" },
    high: { bg: "#ffedd5", text: "#c2410c" },
    medium: { bg: "#e0f2fe", text: "#0369a1" },
    low: { bg: "#f1f5f9", text: "#475569" },
  };
  const prio = item.priority?.toLowerCase() || "medium";
  const prioStyle = priorityColors[prio] || priorityColors.medium;

  const categoryIcons = {
    electricity: "⚡",
    water: "💧",
    garbage: "🗑",
    drainage: "🚰",
  };

  return (
    <div
      style={{
        background: "#ffffff",
        borderRadius: "12px",
        padding: "1.25rem",
        border: "1px solid #e2e8f0",
        boxShadow: "0 2px 5px rgba(0,0,0,0.05)",
        display: "flex",
        flexDirection: "column",
        gap: "0.85rem",
        position: "relative",
      }}
    >
      {/* Header Row */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "0.5rem" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <span style={{ fontSize: "1.3rem" }}>{categoryIcons[item.category] || "📋"}</span>
          <div>
            <h4 style={{ margin: 0, fontSize: "1rem", color: "#1e293b", textTransform: "capitalize" }}>
              {item.category} Issue #{item.id}
            </h4>
            <span style={{ fontSize: "0.78rem", color: "#64748b" }}>
              📅 Assigned: {new Date(assignment.assigned_at || item.date).toLocaleDateString()}
            </span>
          </div>
        </div>

        <div style={{ display: "flex", gap: "0.4rem", alignItems: "center" }}>
          <span
            style={{
              padding: "0.2rem 0.55rem",
              borderRadius: "9999px",
              fontSize: "0.75rem",
              fontWeight: "700",
              background: prioStyle.bg,
              color: prioStyle.text,
              textTransform: "uppercase",
            }}
          >
            {prio}
          </span>

          <span
            style={{
              padding: "0.2rem 0.65rem",
              borderRadius: "9999px",
              fontSize: "0.75rem",
              fontWeight: "700",
              background:
                currentStatus === "Verified"
                  ? "#dcfce7"
                  : currentStatus === "Completed"
                  ? "#e0e7ff"
                  : currentStatus === "In Progress" || currentStatus === "On the Way" || currentStatus === "Reached"
                  ? "#fef3c7"
                  : "#f1f5f9",
              color:
                currentStatus === "Verified"
                  ? "#166534"
                  : currentStatus === "Completed"
                  ? "#3730a3"
                  : currentStatus === "In Progress" || currentStatus === "On the Way" || currentStatus === "Reached"
                  ? "#92400e"
                  : "#334155",
            }}
          >
            {currentStatus}
          </span>
        </div>
      </div>

      {/* Description */}
      <div style={{ fontSize: "0.88rem", color: "#334155", lineHeight: "1.4" }}>
        <strong>Description:</strong> {item.description}
      </div>

      {/* ── VILLAGER CONTACT & RESIDENTIAL ADDRESS INFORMATION ── */}
      <div
        style={{
          background: "#f0fdf4",
          border: "1.5px solid #86efac",
          borderRadius: "10px",
          padding: "1rem",
          display: "flex",
          flexDirection: "column",
          gap: "0.6rem",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #bbf7d0", paddingBottom: "0.4rem", flexWrap: "wrap", gap: "0.3rem" }}>
          <h5 style={{ margin: 0, fontSize: "0.92rem", fontWeight: "700", color: "#166534", display: "flex", alignItems: "center", gap: "0.4rem" }}>
            <span>👤</span> Villager Contact Information (సంప్రదింపు వివరాలు)
          </h5>
          {(item.citizen_phone || item.mobile_number) && (
            <span style={{ fontSize: "0.75rem", background: "#dcfce7", color: "#15803d", fontWeight: "700", padding: "2px 8px", borderRadius: "9999px" }}>
              ✓ Verified Contact
            </span>
          )}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: "0.6rem", fontSize: "0.85rem", color: "#1e293b" }}>
          <div>
            <span style={{ color: "#64748b", display: "block", fontSize: "0.75rem", fontWeight: 600 }}>Citizen Name (పౌరుడి పేరు):</span>
            <strong style={{ fontSize: "0.95rem", color: "#0f172a" }}>
              {item.citizen_name || item.villagerName || "Citizen"}
            </strong>
          </div>

          <div>
            <span style={{ color: "#64748b", display: "block", fontSize: "0.75rem", fontWeight: 600 }}>Mobile Number (మొబైల్ నంబర్):</span>
            <strong style={{ fontSize: "0.95rem", color: "#0f172a" }}>
              {item.citizen_phone ? `+91 ${item.citizen_phone}` : (item.mobile_number ? `+91 ${item.mobile_number}` : "Not Available")}
            </strong>
          </div>
        </div>

        <div style={{ fontSize: "0.85rem", color: "#334155", background: "#ffffff", padding: "0.6rem 0.75rem", borderRadius: "6px", border: "1px solid #e2e8f0" }}>
          <span style={{ color: "#64748b", display: "block", fontSize: "0.75rem", marginBottom: "2px", fontWeight: 600 }}>
            Residential Address (నివాస చిరునామా):
          </span>
          <div style={{ color: "#0f172a", fontWeight: 600 }}>
            {item.village_name ? `${item.village_name} Village, ` : ""}
            {item.street || "Main Road"}
            {(item.house_no || item.houseNo) ? `, House No: ${item.house_no || item.houseNo}` : ""}
          </div>
        </div>

        {/* Action Buttons: 1. Call Villager  2. Navigate to Location */}
        <div style={{ display: "flex", gap: "0.6rem", flexWrap: "wrap", marginTop: "0.3rem", alignItems: "center" }}>
          {(item.citizen_phone || item.mobile_number) ? (
            <a
              href={`tel:+91${(item.citizen_phone || item.mobile_number).replace(/\D/g, '')}`}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "0.4rem",
                padding: "0.6rem 1.1rem",
                background: "#16a34a",
                color: "#ffffff",
                borderRadius: "8px",
                textDecoration: "none",
                fontWeight: "700",
                fontSize: "0.88rem",
                boxShadow: "0 2px 5px rgba(22, 163, 74, 0.3)",
              }}
            >
              <span>📞</span> Call Villager (+91 {item.citizen_phone || item.mobile_number})
            </a>
          ) : (
            <span style={{ fontSize: "0.82rem", color: "#64748b", fontStyle: "italic" }}>
              Mobile number not provided
            </span>
          )}

          {hasGps ? (
            <a
              href={`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "0.4rem",
                padding: "0.6rem 1.1rem",
                background: "#0284c7",
                color: "#ffffff",
                borderRadius: "8px",
                textDecoration: "none",
                fontWeight: "700",
                fontSize: "0.88rem",
                boxShadow: "0 2px 5px rgba(2, 132, 199, 0.3)",
              }}
            >
              <span>🧭</span> Navigate to Location (GPS)
            </a>
          ) : (
            <div style={{ fontSize: "0.82rem", color: "#b45309", background: "#fef3c7", border: "1px solid #fde68a", padding: "0.5rem 0.75rem", borderRadius: "6px" }}>
              ⚠️ GPS coordinates not captured. Use registered address above ({item.village_name || "Village"}, {item.street || "Street"}, House #{item.house_no || item.houseNo || "N/A"}) to locate citizen.
            </div>
          )}
        </div>
      </div>

      {/* Admin Instructions */}
      {assignment.admin_instructions && (
        <div style={{ fontSize: "0.85rem", background: "#fef9c3", color: "#854d0e", padding: "0.55rem 0.75rem", borderRadius: "6px", border: "1px solid #fef08a" }}>
          <strong>📝 Admin Instructions:</strong> {assignment.admin_instructions}
        </div>
      )}

      {/* Deadline Info */}
      {item.deadline && (
        <div style={{ fontSize: "0.82rem", color: "#b91c1c", fontWeight: "600" }}>
          ⏰ Deadline: {item.deadline}
        </div>
      )}

      {/* GPS NAVIGATION BLOCK */}
      <div
        style={{
          background: hasGps ? "#ecfdf5" : "#f8fafc",
          border: hasGps ? "1px solid #a7f3d0" : "1px dashed #cbd5e1",
          borderRadius: "8px",
          padding: "0.75rem",
        }}
      >
        {hasGps ? (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem", flexWrap: "wrap", gap: "0.4rem" }}>
              <div style={{ fontSize: "0.82rem", color: "#065f46" }}>
                <strong>GPS Coordinates:</strong> {lat.toFixed(6)}, {lng.toFixed(6)}
                {item.location_accuracy && <span> (±{Math.round(item.location_accuracy)}m)</span>}
              </div>
              {distanceText && (
                <span style={{ fontSize: "0.82rem", fontWeight: "700", color: "#047857", background: "#d1fae5", padding: "0.2rem 0.5rem", borderRadius: "4px" }}>
                  📍 {distanceText}
                </span>
              )}
            </div>

            <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
              {/* PRIMARY 1-CLICK GOOGLE MAPS NAVIGATION */}
              <a
                href={`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "0.4rem",
                  padding: "0.55rem 1rem",
                  background: "#059669",
                  color: "#ffffff",
                  borderRadius: "6px",
                  textDecoration: "none",
                  fontWeight: "700",
                  fontSize: "0.88rem",
                  boxShadow: "0 2px 4px rgba(5, 150, 105, 0.2)",
                }}
              >
                <span>🧭</span> NAVIGATE TO LOCATION (Google Maps)
              </a>

              <button
                type="button"
                onClick={handleGetDistance}
                disabled={distanceLoading}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "0.3rem",
                  padding: "0.55rem 0.85rem",
                  background: "#ffffff",
                  color: "#047857",
                  border: "1px solid #6ee7b7",
                  borderRadius: "6px",
                  cursor: "pointer",
                  fontSize: "0.82rem",
                  fontWeight: "600",
                }}
              >
                {distanceLoading ? "Calculating..." : "📏 Get Distance"}
              </button>
            </div>
          </div>
        ) : (
          <div style={{ fontSize: "0.85rem", color: "#64748b" }}>
            📍 GPS coordinates not provided by villager. Please navigate using street address: <strong>{item.street}</strong>
          </div>
        )}
      </div>

      {/* Before / After Photos */}
      <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
        {item.photo && (
          <div style={{ flex: 1, minWidth: "120px" }}>
            <span style={{ fontSize: "0.75rem", color: "#64748b", fontWeight: "600" }}>Villager Photo (Before):</span>
            <img
              src={item.photo.startsWith("http") || item.photo.startsWith("/") ? item.photo : `/media/${item.photo}`}
              alt="Problem"
              style={{ width: "100%", maxHeight: "110px", objectFit: "cover", borderRadius: "6px", marginTop: "0.2rem" }}
              onError={(e) => (e.target.style.display = "none")}
            />
          </div>
        )}
        {assignment.completion_photo && (
          <div style={{ flex: 1, minWidth: "120px" }}>
            <span style={{ fontSize: "0.75rem", color: "#047857", fontWeight: "600" }}>Completion Photo (After):</span>
            <img
              src={assignment.completion_photo.startsWith("http") || assignment.completion_photo.startsWith("/") ? assignment.completion_photo : `/media/${assignment.completion_photo}`}
              alt="Resolved Proof"
              style={{ width: "100%", maxHeight: "110px", objectFit: "cover", borderRadius: "6px", marginTop: "0.2rem" }}
              onError={(e) => (e.target.style.display = "none")}
            />
          </div>
        )}
      </div>

      {/* WORK LIFECYCLE ACTION BUTTONS */}
      <div style={{ borderTop: "1px solid #e2e8f0", paddingTop: "0.75rem", display: "flex", gap: "0.5rem", flexWrap: "wrap", alignItems: "center" }}>
        {currentStatus === "Assigned" && (
          <button
            type="button"
            disabled={loadingAction}
            onClick={() => handleAction("accept")}
            style={{
              padding: "0.5rem 1rem",
              background: "#2563eb",
              color: "#fff",
              border: "none",
              borderRadius: "6px",
              cursor: "pointer",
              fontWeight: "600",
              fontSize: "0.85rem",
            }}
          >
            {loadingAction ? "Updating..." : "✓ Accept Task"}
          </button>
        )}

        {currentStatus === "Accepted" && (
          <button
            type="button"
            disabled={loadingAction}
            onClick={() => handleAction("on-the-way")}
            style={{
              padding: "0.5rem 1rem",
              background: "#d97706",
              color: "#fff",
              border: "none",
              borderRadius: "6px",
              cursor: "pointer",
              fontWeight: "600",
              fontSize: "0.85rem",
            }}
          >
            {loadingAction ? "Updating..." : "🚗 Start Travel (On the Way)"}
          </button>
        )}

        {currentStatus === "On the Way" && (
          <button
            type="button"
            disabled={loadingAction}
            onClick={() => handleAction("reached")}
            style={{
              padding: "0.5rem 1rem",
              background: "#0891b2",
              color: "#fff",
              border: "none",
              borderRadius: "6px",
              cursor: "pointer",
              fontWeight: "600",
              fontSize: "0.85rem",
            }}
          >
            {loadingAction ? "Updating..." : "📍 Reached Site"}
          </button>
        )}

        {currentStatus === "Reached" && (
          <button
            type="button"
            disabled={loadingAction}
            onClick={() => handleAction("start")}
            style={{
              padding: "0.5rem 1rem",
              background: "#7c3aed",
              color: "#fff",
              border: "none",
              borderRadius: "6px",
              cursor: "pointer",
              fontWeight: "600",
              fontSize: "0.85rem",
            }}
          >
            {loadingAction ? "Updating..." : "▶ Start Work"}
          </button>
        )}

        {(currentStatus === "In Progress" || currentStatus === "Reached") && (
          <button
            type="button"
            disabled={loadingAction}
            onClick={() => setShowCompleteModal(true)}
            style={{
              padding: "0.5rem 1rem",
              background: "#16a34a",
              color: "#fff",
              border: "none",
              borderRadius: "6px",
              cursor: "pointer",
              fontWeight: "700",
              fontSize: "0.85rem",
              display: "inline-flex",
              alignItems: "center",
              gap: "0.3rem",
            }}
          >
            <span>📸</span> Submit Completed Work
          </button>
        )}

        {currentStatus === "Completed" && (
          <div style={{ color: "#4f46e5", fontWeight: "600", fontSize: "0.85rem", display: "inline-flex", alignItems: "center", gap: "0.3rem" }}>
            <span>⏳</span> Completed — Waiting for Admin Verification
          </div>
        )}

        {currentStatus === "Verified" && (
          <div style={{ color: "#16a34a", fontWeight: "700", fontSize: "0.85rem", display: "inline-flex", alignItems: "center", gap: "0.3rem" }}>
            <span>✅</span> Work Verified & Issue Resolved!
          </div>
        )}
      </div>

      {/* COMPLETE WORK MODAL */}
      {showCompleteModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(15, 23, 42, 0.65)",
            backdropFilter: "blur(4px)",
            zIndex: 10000,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "1rem",
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowCompleteModal(false);
          }}
        >
          <div
            style={{
              background: "#ffffff",
              borderRadius: "12px",
              padding: "1.5rem",
              maxWidth: "500px",
              width: "100%",
              boxShadow: "0 20px 25px -5px rgba(0,0,0,0.2)",
            }}
          >
            <h3 style={{ margin: "0 0 1rem", fontSize: "1.15rem", color: "#1e293b" }}>
              📸 Complete Work Proof — #{item.id}
            </h3>

            {modalError && (
              <div style={{ background: "#fee2e2", color: "#b91c1c", padding: "0.6rem 0.8rem", borderRadius: "8px", fontSize: "0.85rem", marginBottom: "1rem", border: "1px solid #fecaca" }}>
                ⚠️ {modalError}
              </div>
            )}

            <form onSubmit={handleCompleteSubmit}>
              <div style={{ marginBottom: "1rem" }}>
                <label style={{ display: "block", fontWeight: "600", marginBottom: "0.35rem", fontSize: "0.88rem" }}>
                  Upload Completion Photo (పూర్తయిన ఫోటో) *
                </label>
                <input
                  type="file"
                  accept="image/*"
                  required
                  onChange={(e) => {
                    const file = e.target.files[0];
                    if (file) {
                      setCompletionPhoto(file);
                      const reader = new FileReader();
                      reader.onloadend = () => setPhotoPreview(reader.result);
                      reader.readAsDataURL(file);
                    }
                  }}
                  style={{ width: "100%", fontSize: "0.85rem" }}
                />
                {photoPreview && (
                  <div style={{ marginTop: "0.5rem" }}>
                    <img src={photoPreview} alt="Work Proof Preview" style={{ width: "100px", height: "75px", objectFit: "cover", borderRadius: "6px", border: "1.5px solid #10b981" }} />
                  </div>
                )}
              </div>

              <div style={{ marginBottom: "1rem" }}>
                <label style={{ display: "block", fontWeight: "600", marginBottom: "0.35rem", fontSize: "0.88rem" }}>
                  Completion Work Notes (పని వివరాలు)
                </label>
                <textarea
                  value={completionNotes}
                  onChange={(e) => setCompletionNotes(e.target.value)}
                  placeholder="E.g., Cleared blockage in drainage pipe, replaced damaged manhole cover, tested flow."
                  rows={3}
                  style={{ width: "100%", padding: "0.5rem", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "0.85rem", boxSizing: "border-box" }}
                />
              </div>

              <div style={{ display: "flex", gap: "0.75rem", justifyContent: "flex-end" }}>
                <button
                  type="button"
                  onClick={() => setShowCompleteModal(false)}
                  style={{ padding: "0.5rem 1rem", background: "#e2e8f0", border: "none", borderRadius: "6px", cursor: "pointer" }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loadingAction}
                  style={{
                    padding: "0.5rem 1.2rem",
                    background: loadingAction ? "#93c5fd" : "#16a34a",
                    color: "#fff",
                    border: "none",
                    borderRadius: "6px",
                    cursor: loadingAction ? "not-allowed" : "pointer",
                    fontWeight: "700",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "0.4rem",
                  }}
                >
                  {loadingAction ? "Uploading Proof..." : "✓ Submit for Verification"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

