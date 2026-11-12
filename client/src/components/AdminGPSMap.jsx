import React, { useState, useEffect } from "react";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

const statusColors = {
  Pending: "#ef4444", // Red
  Assigned: "#f97316", // Orange
  "In Progress": "#eab308", // Amber
  Resolved: "#22c55e", // Green
  Rejected: "#6b7280", // Grey
};

function createPinIcon(color) {
  return L.divIcon({
    className: "custom-map-pin",
    html: `<div style="
      width: 18px;
      height: 18px;
      background-color: ${color};
      border: 2.5px solid #ffffff;
      border-radius: 50%;
      box-shadow: 0 2px 6px rgba(0,0,0,0.4);
    "></div>`,
    iconSize: [18, 18],
    iconAnchor: [9, 9],
  });
}

export default function AdminGPSMap({ issues = [], onSelectIssue }) {
  const [filters, setFilters] = useState({
    category: "",
    status: "",
    priority: "",
    street: "",
  });

  const validGpsIssues = issues.filter(
    (i) => i.latitude && i.longitude && !isNaN(parseFloat(i.latitude)) && !isNaN(parseFloat(i.longitude))
  );

  const filteredIssues = validGpsIssues.filter((i) => {
    if (filters.category && i.category !== filters.category) return false;
    if (filters.status && i.status !== filters.status) return false;
    if (filters.priority && i.priority !== filters.priority) return false;
    if (filters.street && !i.street?.toLowerCase().includes(filters.street.toLowerCase())) return false;
    return true;
  });

  // Default fallback center when no GPS issues exist
  const defaultCenter = [16.5, 80.0];
  const center =
    filteredIssues.length > 0
      ? [parseFloat(filteredIssues[0].latitude), parseFloat(filteredIssues[0].longitude)]
      : validGpsIssues.length > 0
      ? [parseFloat(validGpsIssues[0].latitude), parseFloat(validGpsIssues[0].longitude)]
      : defaultCenter;

  const categories = ["electricity", "water", "garbage", "drainage"];
  const statuses = ["Pending", "Assigned", "In Progress", "Resolved", "Rejected"];
  const priorities = ["low", "medium", "high", "urgent"];

  return (
    <div style={{ background: "#ffffff", borderRadius: "12px", padding: "1.25rem", boxShadow: "0 1px 3px rgba(0,0,0,0.1)", border: "1px solid #e2e8f0" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem", flexWrap: "wrap", gap: "0.5rem" }}>
        <div>
          <h3 style={{ margin: 0, fontSize: "1.15rem", color: "#1e293b", fontWeight: "700" }}>
            🗺️ Village GPS Complaint Map
          </h3>
          <p style={{ margin: "0.2rem 0 0", fontSize: "0.85rem", color: "#64748b" }}>
            Real-time geolocation tracking of all field issues reported by villagers
          </p>
        </div>
        <div style={{ fontSize: "0.85rem", fontWeight: "600", color: "#0f766e", background: "#ccfbf1", padding: "0.3rem 0.8rem", borderRadius: "9999px" }}>
          📍 {filteredIssues.length} of {validGpsIssues.length} GPS complaints displayed
        </div>
      </div>

      {/* Filter Toolbar */}
      <div style={{ display: "flex", gap: "0.6rem", flexWrap: "wrap", marginBottom: "0.85rem", background: "#f8fafc", padding: "0.75rem", borderRadius: "8px" }}>
        <select
          value={filters.category}
          onChange={(e) => setFilters((f) => ({ ...f, category: e.target.value }))}
          style={{ padding: "0.45rem 0.75rem", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "0.85rem", background: "#fff" }}
        >
          <option value="">All Categories (అన్ని విభాగాలు)</option>
          {categories.map((c) => (
            <option key={c} value={c}>
              {c.charAt(0).toUpperCase() + c.slice(1)}
            </option>
          ))}
        </select>

        <select
          value={filters.status}
          onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value }))}
          style={{ padding: "0.45rem 0.75rem", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "0.85rem", background: "#fff" }}
        >
          <option value="">All Status (అన్ని స్థితి)</option>
          {statuses.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>

        <select
          value={filters.priority}
          onChange={(e) => setFilters((f) => ({ ...f, priority: e.target.value }))}
          style={{ padding: "0.45rem 0.75rem", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "0.85rem", background: "#fff" }}
        >
          <option value="">All Priorities</option>
          {priorities.map((p) => (
            <option key={p} value={p}>
              {p.toUpperCase()}
            </option>
          ))}
        </select>

        <input
          type="text"
          placeholder="Search by street..."
          value={filters.street}
          onChange={(e) => setFilters((f) => ({ ...f, street: e.target.value }))}
          style={{ padding: "0.45rem 0.75rem", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "0.85rem", flex: "1", minWidth: "160px", background: "#fff" }}
        />

        {(filters.category || filters.status || filters.priority || filters.street) && (
          <button
            type="button"
            onClick={() => setFilters({ category: "", status: "", priority: "", street: "" })}
            style={{ padding: "0.45rem 0.75rem", background: "#e2e8f0", border: "none", borderRadius: "6px", cursor: "pointer", fontSize: "0.85rem", color: "#475569" }}
          >
            Reset Filters
          </button>
        )}
      </div>

      {/* Map Legend */}
      <div style={{ display: "flex", gap: "1rem", marginBottom: "0.75rem", flexWrap: "wrap", alignItems: "center", fontSize: "0.8rem", color: "#475569" }}>
        <span style={{ fontWeight: "600" }}>Marker Legend:</span>
        {Object.entries(statusColors).map(([statusName, color]) => (
          <div key={statusName} style={{ display: "inline-flex", alignItems: "center", gap: "0.35rem" }}>
            <span style={{ width: 12, height: 12, borderRadius: "50%", backgroundColor: color, display: "inline-block", border: "1px solid #fff", boxShadow: "0 0 2px rgba(0,0,0,0.3)" }}></span>
            <span>{statusName}</span>
          </div>
        ))}
      </div>

      {/* Leaflet Map */}
      <div style={{ height: "450px", borderRadius: "10px", overflow: "hidden", border: "1px solid #cbd5e1", position: "relative", zIndex: 1 }}>
        {validGpsIssues.length === 0 ? (
          <div style={{ height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: "#f8fafc", color: "#64748b" }}>
            <span style={{ fontSize: "2rem", marginBottom: "0.5rem" }}>📍</span>
            <p style={{ margin: 0, fontWeight: "600" }}>No complaints with GPS coordinates registered yet.</p>
            <p style={{ margin: "0.2rem 0 0", fontSize: "0.85rem" }}>When villagers submit issues with GPS enabled, they will appear on this live map.</p>
          </div>
        ) : (
          <MapContainer center={center} zoom={14} scrollWheelZoom={true} style={{ height: "100%", width: "100%" }}>
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            />
            {filteredIssues.map((issue) => {
              const lat = parseFloat(issue.latitude);
              const lng = parseFloat(issue.longitude);
              const color = statusColors[issue.status] || "#6b7280";

              return (
                <Marker key={issue.id} position={[lat, lng]} icon={createPinIcon(color)}>
                  <Popup>
                    <div style={{ minWidth: "220px", fontSize: "0.85rem", lineHeight: "1.4" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #e2e8f0", paddingBottom: "0.3rem", marginBottom: "0.4rem" }}>
                        <span style={{ fontWeight: "700", color: "#1e293b" }}>Issue #{issue.id}</span>
                        <span
                          style={{
                            padding: "0.15rem 0.45rem",
                            borderRadius: "4px",
                            fontSize: "0.75rem",
                            fontWeight: "600",
                            color: "#fff",
                            backgroundColor: color,
                          }}
                        >
                          {issue.status}
                        </span>
                      </div>

                      <div style={{ marginBottom: "0.3rem" }}>
                        <strong>Category:</strong> {issue.category}
                      </div>

                      <div style={{ marginBottom: "0.3rem" }}>
                        <strong>Description:</strong> {issue.description?.substring(0, 80)}
                        {issue.description?.length > 80 ? "..." : ""}
                      </div>

                      <div style={{ marginBottom: "0.3rem" }}>
                        <strong>Address:</strong> {issue.street} {issue.house_no ? `(House #${issue.house_no})` : ""}
                      </div>

                      <div style={{ marginBottom: "0.3rem" }}>
                        <strong>Priority:</strong>{" "}
                        <span style={{ textTransform: "uppercase", fontWeight: "600", color: issue.priority === "urgent" ? "#dc2626" : "#2563eb" }}>
                          {issue.priority || "Medium"}
                        </span>
                      </div>

                      {issue.assignment?.worker_name && (
                        <div style={{ marginBottom: "0.3rem", color: "#047857" }}>
                          <strong>Worker:</strong> 👷 {issue.assignment.worker_name}
                        </div>
                      )}

                      <div style={{ marginBottom: "0.5rem", color: "#64748b", fontSize: "0.75rem" }}>
                        📅 Reported: {issue.date} {issue.time}
                      </div>

                      <div style={{ display: "flex", gap: "0.5rem" }}>
                        <a
                          href={`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{
                            flex: 1,
                            textAlign: "center",
                            padding: "0.35rem 0.5rem",
                            background: "#059669",
                            color: "#fff",
                            borderRadius: "4px",
                            textDecoration: "none",
                            fontWeight: "600",
                            fontSize: "0.78rem",
                          }}
                        >
                          🧭 Google Maps
                        </a>

                        {onSelectIssue && (
                          <button
                            type="button"
                            onClick={() => onSelectIssue(issue)}
                            style={{
                              flex: 1,
                              padding: "0.35rem 0.5rem",
                              background: "#2563eb",
                              color: "#fff",
                              border: "none",
                              borderRadius: "4px",
                              cursor: "pointer",
                              fontWeight: "600",
                              fontSize: "0.78rem",
                            }}
                          >
                            Assign / Manage
                          </button>
                        )}
                      </div>
                    </div>
                  </Popup>
                </Marker>
              );
            })}
          </MapContainer>
        )}
      </div>
    </div>
  );
}

