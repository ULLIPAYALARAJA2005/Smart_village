import React, { useState } from "react";
import { MapContainer, TileLayer, Marker } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

export default function AssignWorkerModal({ issue, workers = [], onAssign, onClose }) {
  const [selectedWorker, setSelectedWorker] = useState(issue?.assignment?.worker || "");
  const [priority, setPriority] = useState(issue?.priority || "medium");
  const [deadline, setDeadline] = useState(issue?.deadline || "");
  const [instructions, setInstructions] = useState(issue?.assignment?.admin_instructions || "");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  if (!issue) return null;

  const hasGps = issue.latitude && issue.longitude && !isNaN(parseFloat(issue.latitude)) && !isNaN(parseFloat(issue.longitude));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedWorker) {
      setError("Please select a worker to assign this issue.");
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      await onAssign({
        worker_id: selectedWorker,
        priority,
        deadline,
        admin_instructions: instructions,
      });
      onClose();
    } catch (err) {
      setError(err.message || "Failed to assign worker");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: "rgba(15, 23, 42, 0.65)",
        backdropFilter: "blur(4px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 9999,
        padding: "1rem",
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        style={{
          background: "#ffffff",
          borderRadius: "14px",
          width: "100%",
          maxWidth: "640px",
          maxHeight: "92vh",
          overflowY: "auto",
          boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.2)",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "1.2rem 1.5rem", borderBottom: "1px solid #e2e8f0" }}>
          <div>
            <h3 style={{ margin: 0, fontSize: "1.2rem", color: "#1e293b", fontWeight: "700" }}>
              👷 Assign Worker — Issue #{issue.id}
            </h3>
            <span style={{ fontSize: "0.85rem", color: "#64748b" }}>Category: {issue.category}</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{ background: "transparent", border: "none", fontSize: "1.5rem", cursor: "pointer", color: "#64748b" }}
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div style={{ padding: "1.2rem 1.5rem" }}>
          {error && (
            <div style={{ background: "#fee2e2", color: "#b91c1c", padding: "0.75rem", borderRadius: "8px", marginBottom: "1rem", fontSize: "0.85rem" }}>
              ⚠️ {error}
            </div>
          )}

          {/* Issue Summary Card */}
          <div style={{ background: "#f8fafc", borderRadius: "8px", padding: "0.85rem", marginBottom: "1rem", border: "1px solid #e2e8f0", fontSize: "0.85rem" }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem" }}>
              <div>
                <strong>Location:</strong> {issue.street} {issue.house_no ? `(House #${issue.house_no})` : ""}
              </div>
              <div>
                <strong>Reported By:</strong> {issue.villagerName || issue.user?.username || "Villager"}
              </div>
              <div style={{ gridColumn: "1 / -1" }}>
                <strong>Description:</strong> {issue.description}
              </div>
            </div>

            {/* GPS Preview Map */}
            {hasGps && (
              <div style={{ marginTop: "0.75rem" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.3rem" }}>
                  <span style={{ fontWeight: "600", color: "#047857", fontSize: "0.8rem" }}>
                    📍 GPS Coordinates: {parseFloat(issue.latitude).toFixed(6)}, {parseFloat(issue.longitude).toFixed(6)}
                  </span>
                  <a
                    href={`https://www.google.com/maps/dir/?api=1&destination=${issue.latitude},${issue.longitude}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ fontSize: "0.78rem", color: "#2563eb", textDecoration: "none", fontWeight: "600" }}
                  >
                    Open in Google Maps ↗
                  </a>
                </div>
                <div style={{ height: "140px", borderRadius: "6px", overflow: "hidden", border: "1px solid #cbd5e1" }}>
                  <MapContainer
                    center={[parseFloat(issue.latitude), parseFloat(issue.longitude)]}
                    zoom={15}
                    scrollWheelZoom={false}
                    dragging={false}
                    style={{ height: "100%", width: "100%" }}
                  >
                    <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                    <Marker position={[parseFloat(issue.latitude), parseFloat(issue.longitude)]} />
                  </MapContainer>
                </div>
              </div>
            )}
          </div>

          <form onSubmit={handleSubmit}>
            {/* Worker Selection */}
            <div style={{ marginBottom: "1rem" }}>
              <label style={{ display: "block", fontWeight: "600", marginBottom: "0.4rem", color: "#1e293b", fontSize: "0.9rem" }}>
                Select Field Worker (వర్కర్ ఎంపిక) *
              </label>
              <select
                value={selectedWorker}
                onChange={(e) => setSelectedWorker(e.target.value)}
                required
                style={{ width: "100%", padding: "0.55rem 0.75rem", borderRadius: "8px", border: "1px solid #cbd5e1", fontSize: "0.9rem", background: "#fff" }}
              >
                <option value="">-- Choose an Available Worker --</option>
                {workers.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.username} {w.first_name ? `(${w.first_name} ${w.last_name || ""})` : ""} — {w.active_assignments || 0} active works
                  </option>
                ))}
              </select>
            </div>

            {/* Priority & Deadline */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "1rem" }}>
              <div>
                <label style={{ display: "block", fontWeight: "600", marginBottom: "0.4rem", color: "#1e293b", fontSize: "0.9rem" }}>
                  Priority Level (ప్రాధాన్యత)
                </label>
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value)}
                  style={{ width: "100%", padding: "0.55rem 0.75rem", borderRadius: "8px", border: "1px solid #cbd5e1", fontSize: "0.9rem", background: "#fff" }}
                >
                  <option value="low">Low (తక్కువ)</option>
                  <option value="medium">Medium (సాధారణ)</option>
                  <option value="high">High (ఎక్కువ)</option>
                  <option value="urgent">Urgent (అత్యవసరం)</option>
                </select>
              </div>

              <div>
                <label style={{ display: "block", fontWeight: "600", marginBottom: "0.4rem", color: "#1e293b", fontSize: "0.9rem" }}>
                  Resolution Deadline (గడువు)
                </label>
                <input
                  type="date"
                  value={deadline}
                  onChange={(e) => setDeadline(e.target.value)}
                  style={{ width: "100%", padding: "0.55rem 0.75rem", borderRadius: "8px", border: "1px solid #cbd5e1", fontSize: "0.9rem", boxSizing: "border-box" }}
                />
              </div>
            </div>

            {/* Special Instructions */}
            <div style={{ marginBottom: "1.2rem" }}>
              <label style={{ display: "block", fontWeight: "600", marginBottom: "0.4rem", color: "#1e293b", fontSize: "0.9rem" }}>
                Admin Instructions for Worker (వర్కర్‌కు సూచనలు)
              </label>
              <textarea
                value={instructions}
                onChange={(e) => setInstructions(e.target.value)}
                placeholder="E.g., Carry 2-inch PVC pipes and valve replacements. Ensure water pressure is tested before leaving."
                rows={3}
                style={{ width: "100%", padding: "0.55rem 0.75rem", borderRadius: "8px", border: "1px solid #cbd5e1", fontSize: "0.85rem", boxSizing: "border-box", resize: "vertical" }}
              />
            </div>

            {/* Actions */}
            <div style={{ display: "flex", gap: "0.75rem", justifyContent: "flex-end" }}>
              <button
                type="button"
                onClick={onClose}
                style={{ padding: "0.6rem 1.2rem", background: "#e2e8f0", border: "none", borderRadius: "8px", cursor: "pointer", fontWeight: "600", color: "#475569" }}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                style={{
                  padding: "0.6rem 1.4rem",
                  background: submitting ? "#93c5fd" : "#2563eb",
                  color: "#ffffff",
                  border: "none",
                  borderRadius: "8px",
                  cursor: submitting ? "not-allowed" : "pointer",
                  fontWeight: "700",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "0.4rem",
                }}
              >
                {submitting ? "Assigning..." : "✓ Confirm Assignment"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

