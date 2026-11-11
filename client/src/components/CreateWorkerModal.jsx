import React, { useState } from "react";
import { createWorkerAPI } from "../services/aiApi";

export default function CreateWorkerModal({ onWorkerCreated, onClose }) {
  const [formData, setFormData] = useState({
    first_name: "",
    last_name: "",
    username: "",
    email: "",
    aadhar: "",
    password: "",
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [createdCredentials, setCreatedCredentials] = useState(null);
  const [copied, setCopied] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Generate a friendly, secure temporary password (e.g., Worker@2026 or Work9482)
  const generatePassword = () => {
    const randomNum = Math.floor(1000 + Math.random() * 9000);
    const pass = `Worker@${randomNum}`;
    setFormData((prev) => ({ ...prev, password: pass }));
  };

  // Auto-generate username from first name if empty
  const handleFirstNameBlur = () => {
    if (!formData.username && formData.first_name) {
      const cleanName = formData.first_name.toLowerCase().replace(/[^a-z0-9]/g, "");
      const randomNum = Math.floor(10 + Math.random() * 90);
      setFormData((prev) => ({ ...prev, username: `worker_${cleanName}${randomNum}` }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (!formData.username || !formData.email || !formData.password) {
      setError("Please fill in all required fields (Username, Email, and Password).");
      return;
    }

    if (formData.aadhar && formData.aadhar.length !== 12) {
      setError("Aadhaar number must be exactly 12 digits (or leave blank).");
      return;
    }

    setLoading(true);
    try {
      const res = await createWorkerAPI(formData);
      setCreatedCredentials({
        name: `${formData.first_name} ${formData.last_name}`.trim() || formData.username,
        username: res.credentials?.username || formData.username,
        password: res.credentials?.password || formData.password,
        email: formData.email,
        role: "Worker",
        loginUrl: `${window.location.origin}/login`,
      });
      if (onWorkerCreated) onWorkerCreated();
    } catch (err) {
      setError(err.message || "Failed to create worker account.");
    } finally {
      setLoading(false);
    }
  };

  const copyCredentialsText = () => {
    if (!createdCredentials) return;
    const text = `Fix My Village - Worker Login Details:\n-------------------------------------\nName: ${createdCredentials.name}\nUsername: ${createdCredentials.username}\nPassword: ${createdCredentials.password}\nRole: Worker\nLogin Portal: ${createdCredentials.loginUrl}\n-------------------------------------\nPlease login and start tracking your assigned field complaints.`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(15, 23, 42, 0.65)",
        backdropFilter: "blur(4px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 10000,
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
          maxWidth: "540px",
          maxHeight: "92vh",
          overflowY: "auto",
          boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.2)",
          padding: "1.5rem",
        }}
      >
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.2rem", borderBottom: "1px solid #e2e8f0", paddingBottom: "0.75rem" }}>
          <div>
            <h3 style={{ margin: 0, fontSize: "1.25rem", color: "#1e293b", fontWeight: "700" }}>
              👷 {createdCredentials ? "Worker Credentials Created" : "Create New Worker Account"}
            </h3>
            <span style={{ fontSize: "0.85rem", color: "#64748b" }}>
              {createdCredentials
                ? "Share these login details directly with the field worker"
                : "Add worker credentials and provide them to field personnel"}
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{ background: "transparent", border: "none", fontSize: "1.5rem", cursor: "pointer", color: "#64748b" }}
          >
            ✕
          </button>
        </div>

        {/* SUCCESS CREDENTIALS CARD */}
        {createdCredentials ? (
          <div>
            <div style={{ background: "#ecfdf5", border: "1.5px solid #10b981", borderRadius: "10px", padding: "1.25rem", marginBottom: "1.25rem" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", color: "#065f46", fontWeight: "700", fontSize: "1rem", marginBottom: "0.75rem" }}>
                <span>✅</span> Worker Account Activated Successfully!
              </div>

              <div style={{ background: "#ffffff", borderRadius: "8px", padding: "0.85rem", border: "1px solid #a7f3d0", fontSize: "0.9rem", lineHeight: "1.8" }}>
                <div>
                  <strong>Worker Name:</strong> {createdCredentials.name}
                </div>
                <div>
                  <strong>Username:</strong> <code style={{ background: "#f1f5f9", padding: "2px 6px", borderRadius: "4px", color: "#0f766e", fontWeight: "700" }}>{createdCredentials.username}</code>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <strong>Password:</strong>
                  <code style={{ background: "#f1f5f9", padding: "2px 6px", borderRadius: "4px", color: "#b91c1c", fontWeight: "700" }}>
                    {showPassword ? createdCredentials.password : "••••••••••••"}
                  </code>
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    style={{ background: "none", border: "none", cursor: "pointer", fontSize: "0.85rem", color: "#2563eb", textDecoration: "underline" }}
                  >
                    {showPassword ? "Hide" : "Show"}
                  </button>
                </div>
                <div>
                  <strong>Role:</strong> <span style={{ color: "#2563eb", fontWeight: "700" }}>Worker</span>
                </div>
                <div>
                  <strong>Login Page:</strong> <a href={createdCredentials.loginUrl} target="_blank" rel="noopener noreferrer" style={{ color: "#2563eb" }}>{createdCredentials.loginUrl}</a>
                </div>
              </div>

              <button
                type="button"
                onClick={copyCredentialsText}
                style={{
                  width: "100%",
                  marginTop: "1rem",
                  padding: "0.75rem",
                  background: copied ? "#059669" : "#10b981",
                  color: "#ffffff",
                  border: "none",
                  borderRadius: "8px",
                  cursor: "pointer",
                  fontWeight: "700",
                  fontSize: "0.95rem",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "0.5rem",
                  boxShadow: "0 2px 4px rgba(16, 185, 129, 0.3)",
                }}
              >
                <span>{copied ? "✓" : "📋"}</span>
                {copied ? "Credentials Copied to Clipboard!" : "Copy Details to Send to Worker (WhatsApp / SMS)"}
              </button>
            </div>

            <div style={{ display: "flex", gap: "0.75rem" }}>
              <button
                type="button"
                onClick={() => {
                  setCreatedCredentials(null);
                  setFormData({ first_name: "", last_name: "", username: "", email: "", aadhar: "", password: "" });
                }}
                style={{
                  flex: 1,
                  padding: "0.6rem 1rem",
                  background: "#f1f5f9",
                  border: "1px solid #cbd5e1",
                  borderRadius: "8px",
                  cursor: "pointer",
                  fontWeight: "600",
                  color: "#334155",
                }}
              >
                + Create Another Worker
              </button>

              <button
                type="button"
                onClick={onClose}
                style={{
                  flex: 1,
                  padding: "0.6rem 1rem",
                  background: "#2563eb",
                  color: "#ffffff",
                  border: "none",
                  borderRadius: "8px",
                  cursor: "pointer",
                  fontWeight: "700",
                }}
              >
                Done
              </button>
            </div>
          </div>
        ) : (
          /* CREATION FORM */
          <form onSubmit={handleSubmit}>
            {error && (
              <div style={{ background: "#fee2e2", color: "#b91c1c", padding: "0.75rem", borderRadius: "8px", marginBottom: "1rem", fontSize: "0.85rem" }}>
                ⚠️ {error}
              </div>
            )}

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem", marginBottom: "0.85rem" }}>
              <div>
                <label style={{ display: "block", fontWeight: "600", marginBottom: "0.3rem", fontSize: "0.85rem", color: "#334155" }}>
                  First Name (మొదటి పేరు)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Ramesh"
                  value={formData.first_name}
                  onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                  onBlur={handleFirstNameBlur}
                  style={{ width: "100%", padding: "0.5rem", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "0.85rem", boxSizing: "border-box" }}
                />
              </div>

              <div>
                <label style={{ display: "block", fontWeight: "600", marginBottom: "0.3rem", fontSize: "0.85rem", color: "#334155" }}>
                  Last Name (చివరి పేరు)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Kumar"
                  value={formData.last_name}
                  onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                  style={{ width: "100%", padding: "0.5rem", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "0.85rem", boxSizing: "border-box" }}
                />
              </div>
            </div>

            <div style={{ marginBottom: "0.85rem" }}>
              <label style={{ display: "block", fontWeight: "600", marginBottom: "0.3rem", fontSize: "0.85rem", color: "#334155" }}>
                Username (లాగిన్ యూజర్‌నేమ్) *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. worker_ramesh"
                value={formData.username}
                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                style={{ width: "100%", padding: "0.5rem", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "0.85rem", boxSizing: "border-box" }}
              />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem", marginBottom: "0.85rem" }}>
              <div>
                <label style={{ display: "block", fontWeight: "600", marginBottom: "0.3rem", fontSize: "0.85rem", color: "#334155" }}>
                  Email Address *
                </label>
                <input
                  type="email"
                  required
                  placeholder="e.g. ramesh@village.org"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  style={{ width: "100%", padding: "0.5rem", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "0.85rem", boxSizing: "border-box" }}
                />
              </div>

              <div>
                <label style={{ display: "block", fontWeight: "600", marginBottom: "0.3rem", fontSize: "0.85rem", color: "#334155" }}>
                  Aadhaar / ID (12 digits, Optional)
                </label>
                <input
                  type="text"
                  maxLength={12}
                  placeholder="12 digit Aadhaar"
                  value={formData.aadhar}
                  onChange={(e) => setFormData({ ...formData, aadhar: e.target.value.replace(/\D/g, "") })}
                  style={{ width: "100%", padding: "0.5rem", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "0.85rem", boxSizing: "border-box" }}
                />
              </div>
            </div>

            <div style={{ marginBottom: "1.2rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.3rem" }}>
                <label style={{ fontWeight: "600", fontSize: "0.85rem", color: "#334155" }}>
                  Login Password (పాస్‌వర్డ్) *
                </label>
                <button
                  type="button"
                  onClick={generatePassword}
                  style={{ background: "none", border: "none", color: "#2563eb", cursor: "pointer", fontSize: "0.8rem", fontWeight: "600" }}
                >
                  🎲 Generate Password
                </button>
              </div>
              <input
                type="text"
                required
                placeholder="Set worker password (e.g., pass123 or Worker@2026)"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                style={{ width: "100%", padding: "0.5rem", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "0.85rem", boxSizing: "border-box" }}
              />
            </div>

            <div style={{ display: "flex", gap: "0.75rem", justifyContent: "flex-end" }}>
              <button
                type="button"
                onClick={onClose}
                style={{ padding: "0.55rem 1.2rem", background: "#e2e8f0", border: "none", borderRadius: "8px", cursor: "pointer", fontWeight: "600", color: "#475569" }}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                style={{
                  padding: "0.55rem 1.4rem",
                  background: loading ? "#93c5fd" : "#2563eb",
                  color: "#ffffff",
                  border: "none",
                  borderRadius: "8px",
                  cursor: loading ? "not-allowed" : "pointer",
                  fontWeight: "700",
                }}
              >
                {loading ? "Creating Worker..." : "✓ Create & Get Credentials"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

