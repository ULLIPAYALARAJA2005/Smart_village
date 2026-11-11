import React, { useState, useEffect } from "react";
import {
  fetchAdminAnnouncementsAPI,
  createAnnouncementAPI,
  updateAnnouncementAPI,
  deleteAnnouncementAPI,
  togglePublishAnnouncementAPI,
  aiTranslateAnnouncementAPI,
} from "../services/announcementApi";
import AnnouncementBroadcaster from "./AnnouncementBroadcaster";

const CATEGORIES = [
  { id: "general", name: "General Information (సాధారణ సమాచారం)", icon: "📢" },
  { id: "schemes", name: "Government Schemes (ప్రభుత్వ పథకాలు)", icon: "🏛️" },
  { id: "health", name: "Health & Medical Camps (ఆరోగ్య & వైద్య శిబిరాలు)", icon: "🏥" },
  { id: "electricity", name: "Electricity Updates (విద్యుత్ సమాచారం)", icon: "⚡" },
  { id: "water", name: "Water Supply Updates (తాగునీటి సరఫరా)", icon: "💧" },
  { id: "meetings", name: "Village Meetings (గ్రామ సభలు)", icon: "👥" },
  { id: "emergency", name: "Emergency Alerts (అత్యవసర హెచ్చరికలు)", icon: "🚨" },
  { id: "agriculture", name: "Agriculture Information (వ్యవసాయ సమాచారం)", icon: "🌾" },
  { id: "other", name: "Other Notices (ఇతర వివరాలు)", icon: "📋" },
];

export default function AdminAnnouncementManager({ showToast }) {
  const [data, setData] = useState({ stats: {}, announcements: [] });
  const [loading, setLoading] = useState(true);
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Create / Edit Modal State
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    title: "",
    content: "",
    language: "en",
    category: "general",
    priority: "normal",
    expiry_date: "",
    is_published: true,
    english_title: "",
    english_content: "",
    telugu_title: "",
    telugu_content: "",
  });
  const [attachmentFile, setAttachmentFile] = useState(null);
  const [attachmentPreview, setAttachmentPreview] = useState(null);
  const [isTranslating, setIsTranslating] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Delete Confirm State
  const [deletingAnnouncement, setDeletingAnnouncement] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const loadAnnouncements = async () => {
    setLoading(true);
    try {
      const res = await fetchAdminAnnouncementsAPI({
        category: categoryFilter !== "all" ? categoryFilter : undefined,
        priority: priorityFilter !== "all" ? priorityFilter : undefined,
        search: searchQuery.trim() || undefined,
      });
      setData(res);
    } catch (err) {
      if (showToast) showToast(err.message || "Failed to load announcements", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAnnouncements();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [categoryFilter, priorityFilter]);

  const handleSearch = (e) => {
    e.preventDefault();
    loadAnnouncements();
  };

  // ── Open Create Modal ──
  const openCreateModal = () => {
    setEditingId(null);
    setFormData({
      title: "",
      content: "",
      language: "en",
      category: "general",
      priority: "normal",
      expiry_date: "",
      is_published: true,
      english_title: "",
      english_content: "",
      telugu_title: "",
      telugu_content: "",
    });
    setAttachmentFile(null);
    setAttachmentPreview(null);
    setShowModal(true);
  };

  // ── Open Edit Modal ──
  const openEditModal = (item) => {
    setEditingId(item.id);
    setFormData({
      title: item.original_title,
      content: item.original_content,
      language: item.original_language,
      category: item.category,
      priority: item.priority,
      expiry_date: item.expiry_date || "",
      is_published: item.is_published,
      english_title: item.english_title,
      english_content: item.english_content,
      telugu_title: item.telugu_title,
      telugu_content: item.telugu_content,
    });
    setAttachmentFile(null);
    setAttachmentPreview(item.attachment_url || null);
    setShowModal(true);
  };

  // ── Run AI Translation (Bilingual Sync) ──
  const handleAutoTranslate = async () => {
    const textToTranslate = formData.content.trim();
    const titleToTranslate = formData.title.trim();
    if (!textToTranslate && !titleToTranslate) {
      if (showToast) showToast("Please enter title or content before translating", "error");
      return;
    }

    setIsTranslating(true);
    try {
      const res = await aiTranslateAnnouncementAPI({
        title: titleToTranslate,
        content: textToTranslate,
        language: formData.language,
      });

      setFormData((prev) => ({
        ...prev,
        english_title: res.english_title || prev.english_title,
        english_content: res.english_content || prev.english_content,
        telugu_title: res.telugu_title || prev.telugu_title,
        telugu_content: res.telugu_content || prev.telugu_content,
      }));

      if (showToast) showToast("🤖 AI translation completed successfully!", "success");
    } catch (err) {
      if (showToast) showToast("AI translation error: " + err.message, "error");
    } finally {
      setIsTranslating(false);
    }
  };

  // ── Submit Create or Edit ──
  const handleFormSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const payload = new FormData();
      payload.append("title", formData.title || formData.english_title || formData.telugu_title);
      payload.append("content", formData.content || formData.english_content || formData.telugu_content);
      payload.append("language", formData.language);
      payload.append("category", formData.category);
      payload.append("priority", formData.priority);
      payload.append("is_published", formData.is_published);
      if (formData.expiry_date) payload.append("expiry_date", formData.expiry_date);

      payload.append("english_title", formData.english_title);
      payload.append("english_content", formData.english_content);
      payload.append("telugu_title", formData.telugu_title);
      payload.append("telugu_content", formData.telugu_content);

      if (attachmentFile) {
        payload.append("attachment", attachmentFile);
      }

      if (editingId) {
        await updateAnnouncementAPI(editingId, payload);
        if (showToast) showToast("✅ Announcement updated successfully!", "success");
      } else {
        await createAnnouncementAPI(payload);
        if (showToast) showToast("🎉 New announcement published to villagers!", "success");
      }

      setShowModal(false);
      loadAnnouncements();
    } catch (err) {
      if (showToast) showToast(err.message || "Failed to save announcement", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── Toggle Publish / Deactivate ──
  const handleTogglePublish = async (id) => {
    try {
      const res = await togglePublishAnnouncementAPI(id);
      if (showToast) showToast(res.message, "success");
      loadAnnouncements();
    } catch (err) {
      if (showToast) showToast(err.message || "Failed to toggle status", "error");
    }
  };

  // ── Delete Announcement ──
  const handleDeleteConfirm = async () => {
    if (!deletingAnnouncement) return;
    setIsDeleting(true);
    try {
      await deleteAnnouncementAPI(deletingAnnouncement.id);
      if (showToast) showToast("🗑️ Announcement deleted successfully", "success");
      setDeletingAnnouncement(null);
      loadAnnouncements();
    } catch (err) {
      if (showToast) showToast(err.message || "Failed to delete announcement", "error");
    } finally {
      setIsDeleting(false);
    }
  };

  const stats = data?.stats || {};
  const announcementsList = Array.isArray(data?.announcements)
    ? data.announcements
    : Array.isArray(data)
    ? data
    : [];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      {/* ── TOP KPI STATS CARDS ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "1rem" }}>
        {[
          { label: "Total Announcements", value: stats.total_announcements || 0, icon: "📢", color: "#2563eb", bg: "#eff6ff" },
          { label: "Active Published", value: stats.published_announcements || 0, icon: "✅", color: "#16a34a", bg: "#f0fdf4" },
          { label: "Emergency Alerts", value: stats.emergency_announcements || 0, icon: "🚨", color: "#dc2626", bg: "#fef2f2" },
          { label: "Total Villager Views", value: stats.total_views || 0, icon: "👁️", color: "#0284c7", bg: "#e0f2fe" },
          { label: "AI Voice Listens", value: stats.total_listens || 0, icon: "🎧", color: "#7c3aed", bg: "#f3e8ff" },
        ].map((kpi, i) => (
          <div
            key={i}
            style={{
              background: "#ffffff",
              borderRadius: "14px",
              padding: "1.1rem",
              border: "1px solid #e2e8f0",
              boxShadow: "0 2px 5px rgba(0,0,0,0.04)",
              display: "flex",
              alignItems: "center",
              gap: "0.85rem",
            }}
          >
            <div
              style={{
                width: "48px",
                height: "48px",
                borderRadius: "12px",
                background: kpi.bg,
                color: kpi.color,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "1.4rem",
              }}
            >
              {kpi.icon}
            </div>
            <div>
              <div style={{ fontSize: "1.45rem", fontWeight: "800", color: "#0f172a", lineHeight: 1.2 }}>
                {kpi.value}
              </div>
              <div style={{ fontSize: "0.8rem", color: "#64748b", fontWeight: "600" }}>
                {kpi.label}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* ── ACTION BAR (Search, Filters, New Announcement Button) ── */}
      <div
        style={{
          background: "#ffffff",
          borderRadius: "14px",
          padding: "1.2rem",
          border: "1px solid #e2e8f0",
          boxShadow: "0 2px 6px rgba(0,0,0,0.04)",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "1rem",
        }}
      >
        {/* Filters */}
        <div style={{ display: "flex", gap: "0.6rem", flexWrap: "wrap", alignItems: "center" }}>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            style={{ padding: "0.55rem 0.85rem", borderRadius: "8px", border: "1px solid #cbd5e1", fontSize: "0.85rem", outline: "none" }}
          >
            <option value="all">All Categories (అన్ని రకాలు)</option>
            {CATEGORIES.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>

          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            style={{ padding: "0.55rem 0.85rem", borderRadius: "8px", border: "1px solid #cbd5e1", fontSize: "0.85rem", outline: "none" }}
          >
            <option value="all">All Priorities</option>
            <option value="normal">Normal</option>
            <option value="important">Important (ముఖ్యమైనవి)</option>
            <option value="emergency">Emergency (అత్యవసరం)</option>
          </select>

          <form onSubmit={handleSearch} style={{ display: "flex", gap: "0.3rem" }}>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search title/content..."
              style={{ padding: "0.55rem 0.85rem", borderRadius: "8px", border: "1px solid #cbd5e1", fontSize: "0.85rem", outline: "none" }}
            />
            <button
              type="submit"
              style={{ padding: "0.55rem 0.85rem", background: "#0284c7", color: "#fff", border: "none", borderRadius: "8px", cursor: "pointer", fontWeight: "600", fontSize: "0.85rem" }}
            >
              Search
            </button>
          </form>
        </div>

        {/* Create Button */}
        <button
          type="button"
          onClick={openCreateModal}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "0.45rem",
            padding: "0.65rem 1.35rem",
            background: "linear-gradient(135deg, #2563eb, #1d4ed8)",
            color: "#ffffff",
            border: "none",
            borderRadius: "10px",
            fontWeight: "700",
            fontSize: "0.92rem",
            cursor: "pointer",
            boxShadow: "0 3px 8px rgba(37, 99, 235, 0.25)",
          }}
        >
          <span style={{ fontSize: "1.1rem" }}>➕</span>
          <span>కొత్త ప్రకటనను సృష్టించండి (New Announcement)</span>
        </button>
      </div>

      {/* ── ANNOUNCEMENTS TABLE / LIST ── */}
      <div style={{ background: "#ffffff", borderRadius: "14px", border: "1px solid #e2e8f0", overflow: "hidden", boxShadow: "0 2px 6px rgba(0,0,0,0.04)" }}>
        {loading ? (
          <div style={{ padding: "3rem", textAlign: "center", color: "#64748b" }}>
            Loading announcements...
          </div>
        ) : announcementsList.length === 0 ? (
          <div style={{ padding: "3rem", textAlign: "center", color: "#64748b" }}>
            <span style={{ fontSize: "2.5rem" }}>📭</span>
            <div style={{ marginTop: "0.5rem", fontWeight: "600" }}>No announcements found. Click "+ New Announcement" to broadcast to villagers.</div>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column" }}>
            {announcementsList.map((item, idx) => {
              const isEmerg = item.priority === "emergency";
              const isImp = item.priority === "important";

              return (
                <div
                  key={item.id}
                  style={{
                    padding: "1.25rem",
                    borderBottom: idx < announcementsList.length - 1 ? "1px solid #f1f5f9" : "none",
                    background: isEmerg ? "#fff5f5" : "#ffffff",
                    display: "flex",
                    flexDirection: "column",
                    gap: "0.75rem",
                  }}
                >
                  {/* Item Header */}
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "0.5rem" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
                      <span style={{ fontSize: "1.3rem" }}>
                        {CATEGORIES.find((c) => c.id === item.category)?.icon || "📢"}
                      </span>
                      <h4 style={{ margin: 0, fontSize: "1.05rem", color: "#0f172a", fontWeight: "700" }}>
                        {item.english_title || item.original_title}
                      </h4>

                      {/* Telugu Title pill */}
                      {item.telugu_title && (
                        <span style={{ background: "#f0fdf4", color: "#166534", padding: "0.2rem 0.6rem", borderRadius: "6px", fontSize: "0.82rem", fontWeight: "600" }}>
                          {item.telugu_title}
                        </span>
                      )}

                      {/* Priority Tag */}
                      <span
                        style={{
                          padding: "0.2rem 0.55rem",
                          borderRadius: "9999px",
                          fontSize: "0.75rem",
                          fontWeight: "700",
                          background: isEmerg ? "#fee2e2" : isImp ? "#fef3c7" : "#e0f2fe",
                          color: isEmerg ? "#b91c1c" : isImp ? "#92400e" : "#0369a1",
                          textTransform: "uppercase",
                        }}
                      >
                        {item.priority}
                      </span>

                      {/* Publish State */}
                      <span
                        style={{
                          padding: "0.2rem 0.55rem",
                          borderRadius: "9999px",
                          fontSize: "0.75rem",
                          fontWeight: "700",
                          background: item.is_published ? "#dcfce7" : "#f1f5f9",
                          color: item.is_published ? "#15803d" : "#64748b",
                        }}
                      >
                        {item.is_published ? "● Published" : "○ Deactivated"}
                      </span>
                    </div>

                    {/* Engagement Counts: Views & Listens */}
                    <div style={{ display: "flex", gap: "0.75rem", alignItems: "center", fontSize: "0.82rem", color: "#475569" }}>
                      <span title="Total Villagers who viewed this announcement" style={{ display: "inline-flex", alignItems: "center", gap: "0.25rem", background: "#f8fafc", padding: "0.25rem 0.55rem", borderRadius: "6px" }}>
                        👁️ <strong>{item.total_views}</strong> views
                      </span>
                      <span title="Total Villagers who listened to voice announcement" style={{ display: "inline-flex", alignItems: "center", gap: "0.25rem", background: "#f8fafc", padding: "0.25rem 0.55rem", borderRadius: "6px" }}>
                        🎧 <strong>{item.total_listens}</strong> listens
                      </span>
                    </div>
                  </div>

                  {/* Bilingual Contents Display */}
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "1rem", background: "#f8fafc", padding: "0.85rem", borderRadius: "10px" }}>
                    <div>
                      <span style={{ fontSize: "0.75rem", fontWeight: "700", color: "#0284c7" }}>ENGLISH CONTENT:</span>
                      <p style={{ margin: "0.25rem 0 0", fontSize: "0.86rem", color: "#334155", lineHeight: "1.5" }}>
                        {item.english_content || item.original_content}
                      </p>
                    </div>
                    <div>
                      <span style={{ fontSize: "0.75rem", fontWeight: "700", color: "#16a34a" }}>TELUGU CONTENT (తెలుగు):</span>
                      <p style={{ margin: "0.25rem 0 0", fontSize: "0.86rem", color: "#334155", lineHeight: "1.5" }}>
                        {item.telugu_content || "అనువాదం లేదు"}
                      </p>
                    </div>
                  </div>

                  {/* Embedded Voice Broadcaster for Admin Preview */}
                  <AnnouncementBroadcaster
                    announcementId={item.id}
                    title={item.telugu_title || item.original_title}
                    content={item.telugu_content || item.original_content}
                    language="te"
                  />

                  {/* Footer Bar: Publishing Dates + Action Buttons */}
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "0.5rem", paddingTop: "0.5rem", borderTop: "1px solid #f1f5f9" }}>
                    <div style={{ fontSize: "0.78rem", color: "#64748b" }}>
                      Published: {new Date(item.published_at).toLocaleDateString()} {item.expiry_date && ` • Expires: ${item.expiry_date}`}
                    </div>

                    <div style={{ display: "flex", gap: "0.4rem", alignItems: "center" }}>
                      {/* Toggle Publish / Deactivate */}
                      <button
                        type="button"
                        onClick={() => handleTogglePublish(item.id)}
                        style={{
                          padding: "0.35rem 0.75rem",
                          borderRadius: "6px",
                          border: "1px solid #cbd5e1",
                          background: item.is_published ? "#fff" : "#f0fdf4",
                          color: item.is_published ? "#475569" : "#16a34a",
                          fontWeight: "600",
                          fontSize: "0.8rem",
                          cursor: "pointer",
                        }}
                      >
                        {item.is_published ? "Deactivate" : "Publish"}
                      </button>

                      {/* Edit */}
                      <button
                        type="button"
                        onClick={() => openEditModal(item)}
                        style={{
                          padding: "0.35rem 0.75rem",
                          borderRadius: "6px",
                          border: "1px solid #cbd5e1",
                          background: "#ffffff",
                          color: "#0f172a",
                          fontWeight: "600",
                          fontSize: "0.8rem",
                          cursor: "pointer",
                        }}
                      >
                        ✏️ Edit
                      </button>

                      {/* Delete */}
                      <button
                        type="button"
                        onClick={() => setDeletingAnnouncement(item)}
                        style={{
                          padding: "0.35rem 0.75rem",
                          borderRadius: "6px",
                          border: "1px solid #fca5a5",
                          background: "#fee2e2",
                          color: "#b91c1c",
                          fontWeight: "600",
                          fontSize: "0.8rem",
                          cursor: "pointer",
                        }}
                      >
                        🗑️ Delete
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── CREATE / EDIT ANNOUNCEMENT MODAL ── */}
      {showModal && (
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
            overflowY: "auto",
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowModal(false);
          }}
        >
          <div
            style={{
              background: "#ffffff",
              borderRadius: "16px",
              padding: "1.75rem",
              maxWidth: "750px",
              width: "100%",
              maxHeight: "92vh",
              overflowY: "auto",
              boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
            }}
          >
            {/* Modal Header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem", borderBottom: "1px solid #e2e8f0", paddingBottom: "0.75rem" }}>
              <h3 style={{ margin: 0, fontSize: "1.25rem", color: "#0f172a", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <span>📢</span>
                <span>{editingId ? "Edit Announcement" : "Create Village Announcement (కొత్త ప్రకటన)"}</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                style={{ background: "none", border: "none", fontSize: "1.3rem", cursor: "pointer", color: "#64748b" }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleFormSubmit}>
              {/* Category & Priority Row */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "1rem" }}>
                <div>
                  <label style={{ display: "block", fontWeight: "600", marginBottom: "0.35rem", fontSize: "0.85rem", color: "#334155" }}>
                    Category (వర్గం) *
                  </label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData((p) => ({ ...p, category: e.target.value }))}
                    style={{ width: "100%", padding: "0.6rem", borderRadius: "8px", border: "1px solid #cbd5e1", fontSize: "0.88rem" }}
                  >
                    {CATEGORIES.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ display: "block", fontWeight: "600", marginBottom: "0.35rem", fontSize: "0.85rem", color: "#334155" }}>
                    Priority (ప్రాధాన్యత) *
                  </label>
                  <select
                    value={formData.priority}
                    onChange={(e) => setFormData((p) => ({ ...p, priority: e.target.value }))}
                    style={{ width: "100%", padding: "0.6rem", borderRadius: "8px", border: "1px solid #cbd5e1", fontSize: "0.88rem" }}
                  >
                    <option value="normal">Normal (సాధారణ)</option>
                    <option value="important">Important (ముఖ్యమైనది - Highlight)</option>
                    <option value="emergency">🚨 Emergency Alert (అత్యవసర హెచ్చరిక)</option>
                  </select>
                </div>
              </div>

              {/* Source Input Language Selector */}
              <div style={{ marginBottom: "1rem", background: "#f0f9ff", padding: "0.75rem", borderRadius: "10px", border: "1px solid #bae6fd" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "0.5rem" }}>
                  <div>
                    <strong style={{ fontSize: "0.88rem", color: "#0369a1" }}>Input Language (మీరు టైప్ చేసే భాష):</strong>
                    <div style={{ fontSize: "0.78rem", color: "#64748b" }}>
                      AI will automatically translate into the other language.
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: "0.4rem" }}>
                    <button
                      type="button"
                      onClick={() => setFormData((p) => ({ ...p, language: "en" }))}
                      style={{
                        padding: "0.35rem 0.8rem",
                        borderRadius: "6px",
                        border: "none",
                        fontWeight: "700",
                        fontSize: "0.82rem",
                        cursor: "pointer",
                        background: formData.language === "en" ? "#0284c7" : "#e0f2fe",
                        color: formData.language === "en" ? "#ffffff" : "#0369a1",
                      }}
                    >
                      English
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormData((p) => ({ ...p, language: "te" }))}
                      style={{
                        padding: "0.35rem 0.8rem",
                        borderRadius: "6px",
                        border: "none",
                        fontWeight: "700",
                        fontSize: "0.82rem",
                        cursor: "pointer",
                        background: formData.language === "te" ? "#0284c7" : "#e0f2fe",
                        color: formData.language === "te" ? "#ffffff" : "#0369a1",
                      }}
                    >
                      తెలుగు (Telugu)
                    </button>
                  </div>
                </div>
              </div>

              {/* Title Input */}
              <div style={{ marginBottom: "1rem" }}>
                <label style={{ display: "block", fontWeight: "600", marginBottom: "0.35rem", fontSize: "0.85rem", color: "#334155" }}>
                  Announcement Title (ప్రకటన శీర్షిక) *
                </label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) => setFormData((p) => ({ ...p, title: e.target.value }))}
                  placeholder={formData.language === "te" ? "ఉదా: తాగునీటి సరఫరా మరమ్మత్తులు" : "E.g. Drinking Water Supply Maintenance"}
                  style={{ width: "100%", padding: "0.6rem 0.85rem", borderRadius: "8px", border: "1px solid #cbd5e1", fontSize: "0.9rem", boxSizing: "border-box" }}
                />
              </div>

              {/* Content Input */}
              <div style={{ marginBottom: "1rem" }}>
                <label style={{ display: "block", fontWeight: "600", marginBottom: "0.35rem", fontSize: "0.85rem", color: "#334155" }}>
                  Announcement Content / Details (ప్రకటన పూర్తి వివరాలు) *
                </label>
                <textarea
                  required
                  rows={4}
                  value={formData.content}
                  onChange={(e) => setFormData((p) => ({ ...p, content: e.target.value }))}
                  placeholder={
                    formData.language === "te"
                      ? "ఉదా: రేపు ఉదయం 9 గంటల నుండి మధ్యాహ్నం 2 గంటల వరకు పైప్ లైన్ పనుల వలన గాంధీ నగర్ లో నీటి సరఫరా ఉండదు..."
                      : "E.g. Tomorrow drinking water supply will be closed from 9 AM to 2 PM due to pipeline maintenance..."
                  }
                  style={{ width: "100%", padding: "0.6rem 0.85rem", borderRadius: "8px", border: "1px solid #cbd5e1", fontSize: "0.9rem", boxSizing: "border-box" }}
                />
              </div>

              {/* AI Translate Trigger Button */}
              <div style={{ marginBottom: "1.25rem" }}>
                <button
                  type="button"
                  onClick={handleAutoTranslate}
                  disabled={isTranslating}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "0.45rem",
                    padding: "0.6rem 1.25rem",
                    background: "linear-gradient(135deg, #0284c7, #0369a1)",
                    color: "#ffffff",
                    border: "none",
                    borderRadius: "8px",
                    fontWeight: "700",
                    fontSize: "0.88rem",
                    cursor: isTranslating ? "not-allowed" : "pointer",
                  }}
                >
                  <span>🤖</span>
                  <span>{isTranslating ? "Translating with AI..." : "Generate AI Translation (ఇంగ్లీష్ ↔ తెలుగు అనువాదం)"}</span>
                </button>
              </div>

              {/* BILINGUAL REVIEW BOX: English & Telugu editable side-by-side */}
              <div
                style={{
                  background: "#f8fafc",
                  borderRadius: "12px",
                  padding: "1rem",
                  border: "1.5px solid #cbd5e1",
                  marginBottom: "1.25rem",
                }}
              >
                <strong style={{ fontSize: "0.88rem", color: "#1e293b", display: "block", marginBottom: "0.75rem" }}>
                  🌐 Review & Edit Bilingual Content (ప్రకటనను తనిఖీ చేసి సవరించండి):
                </strong>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                  {/* English Section */}
                  <div>
                    <label style={{ display: "block", fontSize: "0.78rem", fontWeight: "700", color: "#0369a1", marginBottom: "0.25rem" }}>
                      ENGLISH TITLE:
                    </label>
                    <input
                      type="text"
                      value={formData.english_title}
                      onChange={(e) => setFormData((p) => ({ ...p, english_title: e.target.value }))}
                      style={{ width: "100%", padding: "0.45rem", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "0.85rem", marginBottom: "0.5rem", boxSizing: "border-box" }}
                    />
                    <label style={{ display: "block", fontSize: "0.78rem", fontWeight: "700", color: "#0369a1", marginBottom: "0.25rem" }}>
                      ENGLISH CONTENT:
                    </label>
                    <textarea
                      rows={3}
                      value={formData.english_content}
                      onChange={(e) => setFormData((p) => ({ ...p, english_content: e.target.value }))}
                      style={{ width: "100%", padding: "0.45rem", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "0.85rem", boxSizing: "border-box" }}
                    />
                  </div>

                  {/* Telugu Section */}
                  <div>
                    <label style={{ display: "block", fontSize: "0.78rem", fontWeight: "700", color: "#166534", marginBottom: "0.25rem" }}>
                      తెలుగు శీర్షిక (TELUGU TITLE):
                    </label>
                    <input
                      type="text"
                      value={formData.telugu_title}
                      onChange={(e) => setFormData((p) => ({ ...p, telugu_title: e.target.value }))}
                      style={{ width: "100%", padding: "0.45rem", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "0.85rem", marginBottom: "0.5rem", boxSizing: "border-box" }}
                    />
                    <label style={{ display: "block", fontSize: "0.78rem", fontWeight: "700", color: "#166534", marginBottom: "0.25rem" }}>
                      తెలుగు సమాచారం (TELUGU CONTENT):
                    </label>
                    <textarea
                      rows={3}
                      value={formData.telugu_content}
                      onChange={(e) => setFormData((p) => ({ ...p, telugu_content: e.target.value }))}
                      style={{ width: "100%", padding: "0.45rem", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "0.85rem", boxSizing: "border-box" }}
                    />
                  </div>
                </div>
              </div>

              {/* Attachment & Expiry Date Row */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "1.25rem" }}>
                <div>
                  <label style={{ display: "block", fontWeight: "600", marginBottom: "0.35rem", fontSize: "0.85rem", color: "#334155" }}>
                    Attach Photo or PDF Document (ఐచ్ఛికం)
                  </label>
                  <input
                    type="file"
                    accept="image/*,.pdf,.doc,.docx"
                    onChange={(e) => {
                      const f = e.target.files[0];
                      if (f) {
                        setAttachmentFile(f);
                        if (f.type.startsWith("image/")) {
                          setAttachmentPreview(URL.createObjectURL(f));
                        } else {
                          setAttachmentPreview(null);
                        }
                      }
                    }}
                    style={{ fontSize: "0.82rem" }}
                  />
                  {attachmentPreview && (
                    <img src={attachmentPreview} alt="Preview" style={{ height: "65px", marginTop: "0.4rem", borderRadius: "6px", objectFit: "cover" }} />
                  )}
                </div>

                <div>
                  <label style={{ display: "block", fontWeight: "600", marginBottom: "0.35rem", fontSize: "0.85rem", color: "#334155" }}>
                    Expiry Date (ముగింపు తేదీ - ఐచ్ఛికం)
                  </label>
                  <input
                    type="date"
                    value={formData.expiry_date}
                    onChange={(e) => setFormData((p) => ({ ...p, expiry_date: e.target.value }))}
                    style={{ width: "100%", padding: "0.55rem", borderRadius: "8px", border: "1px solid #cbd5e1", fontSize: "0.88rem", boxSizing: "border-box" }}
                  />
                </div>
              </div>

              {/* Publish Toggle */}
              <div style={{ marginBottom: "1.25rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <input
                  type="checkbox"
                  id="pub-check"
                  checked={formData.is_published}
                  onChange={(e) => setFormData((p) => ({ ...p, is_published: e.target.checked }))}
                />
                <label htmlFor="pub-check" style={{ fontSize: "0.88rem", color: "#1e293b", fontWeight: "600" }}>
                  Publish immediately to Villagers' Dashboard (వెంటనే ప్రచురించండి)
                </label>
              </div>

              {/* Form Action Buttons */}
              <div style={{ display: "flex", gap: "0.75rem", justifyContent: "flex-end", borderTop: "1px solid #e2e8f0", paddingTop: "1rem" }}>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  style={{ padding: "0.6rem 1.25rem", background: "#f1f5f9", border: "none", borderRadius: "8px", cursor: "pointer", fontWeight: "600", color: "#475569" }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  style={{
                    padding: "0.6rem 1.5rem",
                    background: isSubmitting ? "#93c5fd" : "#2563eb",
                    color: "#ffffff",
                    border: "none",
                    borderRadius: "8px",
                    fontWeight: "700",
                    fontSize: "0.92rem",
                    cursor: isSubmitting ? "not-allowed" : "pointer",
                  }}
                >
                  {isSubmitting ? "Publishing..." : editingId ? "Save Changes" : "Publish Announcement (ప్రచురించండి)"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── DELETE CONFIRMATION MODAL ── */}
      {deletingAnnouncement && (
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
            if (e.target === e.currentTarget) setDeletingAnnouncement(null);
          }}
        >
          <div style={{ background: "#ffffff", borderRadius: "14px", padding: "1.5rem", maxWidth: "420px", width: "100%", textAlign: "center" }}>
            <div style={{ fontSize: "2.5rem" }}>🗑️</div>
            <h3 style={{ margin: "0.5rem 0", color: "#0f172a" }}>Delete Announcement?</h3>
            <p style={{ margin: "0 0 1.25rem", color: "#475569", fontSize: "0.88rem" }}>
              Are you sure you want to delete <strong>"{deletingAnnouncement.english_title || deletingAnnouncement.original_title}"</strong>? This will remove it from all villagers' dashboards.
            </p>
            <div style={{ display: "flex", gap: "0.75rem" }}>
              <button
                type="button"
                onClick={() => setDeletingAnnouncement(null)}
                style={{ flex: 1, padding: "0.6rem", background: "#f1f5f9", border: "none", borderRadius: "8px", fontWeight: "600", color: "#475569", cursor: "pointer" }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteConfirm}
                disabled={isDeleting}
                style={{ flex: 1, padding: "0.6rem", background: "#dc2626", color: "#fff", border: "none", borderRadius: "8px", fontWeight: "700", cursor: "pointer" }}
              >
                {isDeleting ? "Deleting..." : "Yes, Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

