import { useState, useEffect, useCallback } from "react";
import "../styles/villager.css";
import { useNavigate } from "react-router-dom";
import Toast from "../components/Toast";
import VoiceComplaintModal from "../components/VoiceComplaintModal";
import VoiceStatusTracker from "../components/VoiceStatusTracker";
import GPSLocationPicker from "../components/GPSLocationPicker";
import { updateComplaintAPI, deleteComplaintAPI } from "../services/aiApi";
import VillagerAnnouncementsSection from "../components/VillagerAnnouncementsSection";
import { fetchAnnouncementStatsSummaryAPI } from "../services/announcementApi";

const getImageUrl = (photo) => {
  if (!photo) return null;
  if (photo.startsWith("http")) return photo;
  return photo.startsWith("/") ? photo : `/media/${photo}`;
};

const CATEGORIES = [
  { id: "electricity", nameEn: "Electricity", nameTe: "విద్యుత్", icon: "⚡", color: "#f59e0b", bg: "#fef3c7" },
  { id: "water", nameEn: "Water Supply", nameTe: "మంచినీరు", icon: "💧", color: "#0284c7", bg: "#e0f2fe" },
  { id: "garbage", nameEn: "Garbage / Waste", nameTe: "పారిశుధ్యం", icon: "🗑", color: "#16a34a", bg: "#f0fdf4" },
  { id: "drainage", nameEn: "Drainage / Sewage", nameTe: "మురుగు కాలువలు", icon: "🚰", color: "#7c3aed", bg: "#f3e8ff" },
];

const STATUS_STEPS = ["Pending", "Assigned", "In Progress", "Resolved"];

const getCookie = (name) => {
  const cookies = document.cookie.split("; ");
  const cookie = cookies.find((val) => val.startsWith(`${name}=`));
  return cookie ? decodeURIComponent(cookie.split("=").slice(1).join("=")) : null;
};

// ── Progress Stepper Component ──
function ProgressTimeline({ status }) {
  if (status === "Rejected") {
    return (
      <div style={{ background: "#fee2e2", color: "#991b1b", padding: "0.5rem 0.75rem", borderRadius: "8px", fontSize: "0.85rem", fontWeight: "600", display: "flex", alignItems: "center", gap: "0.4rem" }}>
        <span>❌</span> Complaint Rejected by Administration
      </div>
    );
  }

  const activeIdx = STATUS_STEPS.indexOf(status);

  return (
    <div style={{ display: "flex", alignItems: "center", width: "100%", margin: "0.75rem 0 0.5rem" }}>
      {STATUS_STEPS.map((step, idx) => {
        const isDone = idx < activeIdx;
        const isCurrent = idx === activeIdx;
        return (
          <div key={step} style={{ display: "flex", alignItems: "center", flex: idx === STATUS_STEPS.length - 1 ? "0 0 auto" : 1 }}>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "0.2rem" }}>
              <div
                style={{
                  width: "26px",
                  height: "26px",
                  borderRadius: "50%",
                  background: isDone ? "#16a34a" : isCurrent ? "#2563eb" : "#e2e8f0",
                  color: isDone || isCurrent ? "#ffffff" : "#94a3b8",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "0.75rem",
                  fontWeight: "700",
                  boxShadow: isCurrent ? "0 0 0 3px rgba(37, 99, 235, 0.2)" : "none",
                  transition: "all 0.3s ease",
                }}
              >
                {isDone ? "✓" : idx + 1}
              </div>
              <span style={{ fontSize: "0.7rem", fontWeight: isCurrent ? "700" : "500", color: isCurrent ? "#1e293b" : "#64748b", whiteSpace: "nowrap" }}>
                {step}
              </span>
            </div>
            {idx < STATUS_STEPS.length - 1 && (
              <div
                style={{
                  flex: 1,
                  height: "3px",
                  background: isDone ? "#16a34a" : "#e2e8f0",
                  margin: "0 0.4rem",
                  marginBottom: "1rem",
                  transition: "background 0.3s ease",
                }}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

export default function VillagerDashboard() {
  const navigate = useNavigate();
  const userName = localStorage.getItem("userName") || "Citizen";
  const userId = localStorage.getItem("userId");

  // Main navigation tab: "my-complaints" | "new-complaint" | "community" | "announcements"
  const [activeTab, setActiveTab] = useState("my-complaints");
  // Increments each time the announcements tab is activated → forces VillagerAnnouncementsSection to remount & refetch
  const [announcementsKey, setAnnouncementsKey] = useState(0);

  // Data states
  const [loadingData, setLoadingData] = useState(true);
  const [toast, setToast] = useState(null);
  const [logoutLoading, setLogoutLoading] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const [userInfo, setUserInfo] = useState({ email: "", aadhar: "" });
  const [myIssues, setMyIssues] = useState([]);
  const [allCommunityIssues, setAllCommunityIssues] = useState([]);
  const [stats, setStats] = useState({ total: 0, pending: 0, assigned: 0, progress: 0, resolved: 0 });

  // Filtering states
  const [myStatusFilter, setMyStatusFilter] = useState("all"); // "all" | "active" | "resolved"
  const [communityCatFilter, setCommunityCatFilter] = useState("all");
  const [communityStatusFilter, setCommunityStatusFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Form states
  const [selectedCategory, setSelectedCategory] = useState("water");
  const [formData, setFormData] = useState({
    street: "",
    houseNo: "",
    description: "",
    photo: null,
    priority: "medium",
    latitude: null,
    longitude: null,
    location_accuracy: null,
    location_captured: false,
  });
  const [photoPreview, setPhotoPreview] = useState(null);
  const [submitLoading, setSubmitLoading] = useState(false);

  // AI Voice & Status States
  const [showVoiceModal, setShowVoiceModal] = useState(false);
  const [showVoiceTracker, setShowVoiceTracker] = useState(false);
  const [refreshCount, setRefreshCount] = useState(0);

  // Village Announcements Stats Badge
  const [announcementStats, setAnnouncementStats] = useState({ total_active: 0, unread_count: 0, emergency_count: 0 });

  // Photo viewer modal state
  const [previewImage, setPreviewImage] = useState(null);

  // Edit & Delete Complaint States (allowed before worker is assigned)
  const [editingIssue, setEditingIssue] = useState(null);
  const [deletingIssue, setDeletingIssue] = useState(null);
  const [editLoading, setEditLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const handleUpdateComplaint = async (e) => {
    e.preventDefault();
    if (!editingIssue) return;
    setEditLoading(true);

    try {
      const data = new FormData();
      data.append("category", editingIssue.category);
      data.append("street", editingIssue.street || "");
      data.append("houseNo", editingIssue.houseNo || "");
      data.append("description", editingIssue.description || "");
      if (editingIssue.newPhoto) {
        data.append("photo", editingIssue.newPhoto);
      }
      if (editingIssue.latitude && editingIssue.longitude) {
        data.append("latitude", editingIssue.latitude);
        data.append("longitude", editingIssue.longitude);
        if (editingIssue.location_accuracy) {
          data.append("location_accuracy", editingIssue.location_accuracy);
        }
      }

      await updateComplaintAPI(editingIssue.id, data);
      showToast("✅ Complaint updated successfully! (ఫిర్యాదు సవరించబడింది)", "success");
      setEditingIssue(null);
      setRefreshCount((prev) => prev + 1);
    } catch (err) {
      showToast(err.message || "Failed to update complaint", "error");
    } finally {
      setEditLoading(false);
    }
  };

  const handleDeleteComplaint = async () => {
    if (!deletingIssue) return;
    setDeleteLoading(true);

    try {
      await deleteComplaintAPI(deletingIssue.id);
      showToast("🗑️ Complaint deleted successfully! (ఫిర్యాదు తొలగించబడింది)", "success");
      setDeletingIssue(null);
      setRefreshCount((prev) => prev + 1);
    } catch (err) {
      showToast(err.message || "Failed to delete complaint", "error");
    } finally {
      setDeleteLoading(false);
    }
  };

  const showToast = (msg, type = "info") => {
    setToast({ message: msg, type });
    setTimeout(() => setToast(null), 3200);
  };

  const logout = () => {
    setLogoutLoading(true);
    setTimeout(() => {
      localStorage.clear();
      navigate("/");
    }, 800);
  };

  // ── Fetch user profile info ──
  useEffect(() => {
    fetch("/api/auth/csrf/", { credentials: "same-origin" });
    const fetchUserInfo = async () => {
      try {
        const res = await fetch(`/api/auth/users/${userId}/`);
        if (res.ok) {
          const data = await res.json();
          setUserInfo({ email: data.email, aadhar: data.aadhar });
        }
      } catch {
        console.warn("Could not load user profile");
      }
    };
    if (userId) fetchUserInfo();
  }, [userId]);

  // ── Real-time Fetch All Complaints ──
  const fetchIssues = useCallback(async () => {
    setLoadingData(true);
    try {
      const categories = ["electricity", "water", "garbage", "drainage"];
      const results = await Promise.all(
        categories.map(async (cat) => {
          try {
            const res = await fetch(`/api/issues/${cat}/`, { credentials: "same-origin" });
            if (!res.ok) return [];
            const data = await res.json();
            return data.map((i) => ({
              ...i,
              category: cat,
              houseNo: i.house_no,
              userId: String(i.user),
            }));
          } catch {
            return [];
          }
        })
      );

      const flatIssues = results.flat();

      // Separate into citizen's own issues and community issues
      const myFiltered = flatIssues.filter((i) => String(i.userId) === String(userId) || String(i.user) === String(userId));
      const myPending = myFiltered.filter((i) => i.status === "Pending").length;
      const myAssigned = myFiltered.filter((i) => i.status === "Assigned").length;
      const myProgress = myFiltered.filter((i) => i.status === "In Progress").length;
      const myResolved = myFiltered.filter((i) => i.status === "Resolved").length;

      setMyIssues(myFiltered.reverse());
      setAllCommunityIssues(flatIssues.reverse());
      setStats({
        total: myFiltered.length,
        pending: myPending,
        assigned: myAssigned,
        progress: myProgress,
        resolved: myResolved,
      });
    } catch (err) {
      console.warn("Error fetching issues:", err);
      showToast("Failed to refresh complaints", "error");
    } finally {
      setLoadingData(false);
    }
  }, [userId]);

  useEffect(() => {
    if (userId) {
      fetchIssues();
      fetchAnnouncementStatsSummaryAPI().then(setAnnouncementStats).catch(() => {});
    }
  }, [userId, refreshCount, fetchIssues]);

  // ── Form Handlers ──
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handlePhotoSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      setFormData((prev) => ({ ...prev, photo: file }));
      const reader = new FileReader();
      reader.onloadend = () => setPhotoPreview(reader.result);
      reader.readAsDataURL(file);
    }
  };

  const removeSelectedPhoto = () => {
    setFormData((prev) => ({ ...prev, photo: null }));
    setPhotoPreview(null);
  };

  const resetForm = () => {
    setFormData({
      street: "",
      houseNo: "",
      description: "",
      photo: null,
      priority: "medium",
      latitude: null,
      longitude: null,
      location_accuracy: null,
      location_captured: false,
    });
    setPhotoPreview(null);
  };

  const handleSubmitComplaint = async (e) => {
    e.preventDefault();
    if (submitLoading) return;

    if (!selectedCategory) return showToast("Please select an issue category", "error");
    if (!formData.street.trim()) return showToast("Street name / landmark is required", "error");
    if (!formData.description.trim()) return showToast("Problem description is required", "error");

    setSubmitLoading(true);
    const data = new FormData();
    data.append("street", formData.street);
    data.append("houseNo", formData.houseNo || "");
    data.append("description", formData.description);
    if (formData.photo) data.append("photo", formData.photo);
    data.append("priority", formData.priority || "medium");
    data.append("date", new Date().toLocaleDateString());
    data.append("time", new Date().toLocaleTimeString());
    data.append("userId", userId);
    data.append("input_method", "manual");
    data.append("language", "te");

    if (formData.latitude) data.append("latitude", formData.latitude);
    if (formData.longitude) data.append("longitude", formData.longitude);
    if (formData.location_accuracy) data.append("location_accuracy", formData.location_accuracy);
    data.append("location_captured", formData.location_captured ? "true" : "false");

    try {
      if (!getCookie("csrftoken")) {
        await fetch("/api/auth/csrf/", { credentials: "same-origin" });
      }
      const csrfToken = getCookie("csrftoken");
      const res = await fetch(`/api/issues/${selectedCategory}/`, {
        method: "POST",
        credentials: "same-origin",
        headers: csrfToken ? { "X-CSRFToken": csrfToken } : {},
        body: data,
      });

      if (!res.ok) {
        throw new Error("Complaint submission failed");
      }

      showToast("🎉 Complaint submitted successfully!", "success");
      resetForm();
      fetchIssues();
      setActiveTab("my-complaints"); // Auto-switch to real-time complaint tracking tab
    } catch (err) {
      showToast(err.message || "Failed to submit complaint", "error");
    } finally {
      setSubmitLoading(false);
    }
  };

  // Filtered lists
  const filteredMyIssues = myIssues.filter((i) => {
    if (myStatusFilter === "active") return i.status !== "Resolved" && i.status !== "Rejected";
    if (myStatusFilter === "resolved") return i.status === "Resolved";
    return true;
  });

  const filteredCommunity = allCommunityIssues.filter((i) => {
    if (communityCatFilter !== "all" && i.category !== communityCatFilter) return false;
    if (communityStatusFilter !== "all" && i.status !== communityStatusFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchDesc = i.description?.toLowerCase().includes(q);
      const matchStreet = i.street?.toLowerCase().includes(q);
      if (!matchDesc && !matchStreet) return false;
    }
    return true;
  });

  return (
    <div style={{ minHeight: "100vh", background: "#f8fafc", fontFamily: "'Poppins', sans-serif", color: "#1e293b" }}>
      {toast && <Toast message={toast.message} type={toast.type} />}

      {/* ── TOP MODERN NAVBAR ── */}
      <header
        style={{
          background: "#ffffff",
          borderBottom: "1px solid #e2e8f0",
          position: "sticky",
          top: 0,
          zIndex: 100,
          boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
        }}
      >
        <div style={{ maxWidth: "1240px", margin: "0 auto", padding: "0.85rem 1.25rem", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          {/* Logo & Portal Info */}
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
            <div style={{ width: 42, height: 42, borderRadius: "10px", background: "linear-gradient(135deg, #2563eb, #1d4ed8)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: "1.4rem", fontWeight: "700", boxShadow: "0 4px 10px rgba(37,99,235,0.3)" }}>
              🏘️
            </div>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <h1 style={{ margin: 0, fontSize: "1.15rem", fontWeight: "800", color: "#0f172a" }}>Fix My Village</h1>
                <span style={{ background: "#dcfce7", color: "#166534", fontSize: "0.72rem", padding: "0.15rem 0.5rem", borderRadius: "9999px", fontWeight: "700" }}>
                  🟢 Live Citizen Portal
                </span>
              </div>
              <p style={{ margin: 0, fontSize: "0.78rem", color: "#64748b" }}>Community Issue Reporting & Governance</p>
            </div>
          </div>

          {/* Quick Action Buttons */}
          <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
            <button
              type="button"
              onClick={() => setShowVoiceModal(true)}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "0.4rem",
                padding: "0.5rem 0.9rem",
                background: "linear-gradient(135deg, #7c3aed, #6d28d9)",
                color: "#ffffff",
                border: "none",
                borderRadius: "8px",
                cursor: "pointer",
                fontWeight: "700",
                fontSize: "0.85rem",
                boxShadow: "0 2px 6px rgba(124, 58, 237, 0.3)",
              }}
            >
              <span>🎙️</span> AI Voice Complaint
            </button>

            <button
              type="button"
              onClick={() => setShowVoiceTracker(true)}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "0.4rem",
                padding: "0.5rem 0.85rem",
                background: "#f1f5f9",
                color: "#334155",
                border: "1px solid #cbd5e1",
                borderRadius: "8px",
                cursor: "pointer",
                fontWeight: "600",
                fontSize: "0.85rem",
              }}
            >
              <span>🔍</span> Voice Status
            </button>

            <button
              type="button"
              onClick={() => navigate("/villager/feedback")}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "0.3rem",
                padding: "0.5rem 0.75rem",
                background: "#f8fafc",
                color: "#475569",
                border: "1px solid #e2e8f0",
                borderRadius: "8px",
                cursor: "pointer",
                fontWeight: "600",
                fontSize: "0.85rem",
              }}
            >
              <span>⭐</span> Feedback
            </button>

            <button
              type="button"
              onClick={() => setShowLogoutConfirm(true)}
              style={{
                padding: "0.5rem 0.8rem",
                background: "#fee2e2",
                color: "#b91c1c",
                border: "none",
                borderRadius: "8px",
                cursor: "pointer",
                fontWeight: "700",
                fontSize: "0.85rem",
              }}
            >
              ⏻ Logout
            </button>
          </div>
        </div>
      </header>

      {/* ── USER WELCOME & REAL-TIME SUMMARY STRIP ── */}
      <div style={{ maxWidth: "1240px", margin: "1.25rem auto 0", padding: "0 1.25rem" }}>
        <div
          style={{
            background: "linear-gradient(135deg, #1e293b 0%, #0f172a 100%)",
            color: "#ffffff",
            borderRadius: "14px",
            padding: "1.25rem 1.5rem",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "1rem",
            boxShadow: "0 4px 15px rgba(15, 23, 42, 0.15)",
          }}
        >
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.25rem" }}>
              <span style={{ fontSize: "1.4rem" }}>👋</span>
              <h2 style={{ margin: 0, fontSize: "1.25rem", fontWeight: "700" }}>Welcome, {userName}!</h2>
            </div>
            <p style={{ margin: 0, fontSize: "0.82rem", color: "#94a3b8" }}>
              {userInfo.aadhar ? `Aadhaar: ${userInfo.aadhar} · ` : ""}Citizen ID #{userId} · {userInfo.email || "Registered Villager"}
            </p>
          </div>

          {/* Quick Metrics */}
          <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
            <div style={{ background: "rgba(255,255,255,0.08)", padding: "0.5rem 0.9rem", borderRadius: "8px", textAlign: "center", minWidth: "90px" }}>
              <span style={{ fontSize: "1.3rem", fontWeight: "800", display: "block", color: "#60a5fa" }}>{stats.total}</span>
              <span style={{ fontSize: "0.72rem", color: "#cbd5e1" }}>My Complaints</span>
            </div>
            <div style={{ background: "rgba(255,255,255,0.08)", padding: "0.5rem 0.9rem", borderRadius: "8px", textAlign: "center", minWidth: "90px" }}>
              <span style={{ fontSize: "1.3rem", fontWeight: "800", display: "block", color: "#facc15" }}>{stats.pending + stats.assigned}</span>
              <span style={{ fontSize: "0.72rem", color: "#cbd5e1" }}>Pending / Assigned</span>
            </div>
            <div style={{ background: "rgba(255,255,255,0.08)", padding: "0.5rem 0.9rem", borderRadius: "8px", textAlign: "center", minWidth: "90px" }}>
              <span style={{ fontSize: "1.3rem", fontWeight: "800", display: "block", color: "#38bdf8" }}>{stats.progress}</span>
              <span style={{ fontSize: "0.72rem", color: "#cbd5e1" }}>In Progress</span>
            </div>
            <div style={{ background: "rgba(255,255,255,0.08)", padding: "0.5rem 0.9rem", borderRadius: "8px", textAlign: "center", minWidth: "90px" }}>
              <span style={{ fontSize: "1.3rem", fontWeight: "800", display: "block", color: "#4ade80" }}>{stats.resolved}</span>
              <span style={{ fontSize: "0.72rem", color: "#cbd5e1" }}>Resolved</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── CLEAN TAB DIVISION (Real-time, Uncluttered) ── */}
      <div style={{ maxWidth: "1240px", margin: "1.25rem auto", padding: "0 1.25rem" }}>
        <div style={{ display: "flex", gap: "0.5rem", background: "#ffffff", padding: "0.4rem", borderRadius: "12px", border: "1px solid #e2e8f0", boxShadow: "0 1px 3px rgba(0,0,0,0.04)", flexWrap: "wrap" }}>
          <button
            type="button"
            onClick={() => setActiveTab("my-complaints")}
            style={{
              flex: "1 1 200px",
              padding: "0.75rem 1rem",
              borderRadius: "8px",
              border: "none",
              background: activeTab === "my-complaints" ? "#2563eb" : "transparent",
              color: activeTab === "my-complaints" ? "#ffffff" : "#475569",
              fontWeight: "700",
              fontSize: "0.95rem",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "0.5rem",
              transition: "all 0.2s ease",
            }}
          >
            <span>📋</span> My Complaints (నా ఫిర్యాదులు)
            <span
              style={{
                background: activeTab === "my-complaints" ? "rgba(255,255,255,0.25)" : "#e2e8f0",
                color: activeTab === "my-complaints" ? "#ffffff" : "#334155",
                fontSize: "0.75rem",
                padding: "0.15rem 0.5rem",
                borderRadius: "9999px",
              }}
            >
              {myIssues.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("new-complaint")}
            style={{
              flex: "1 1 200px",
              padding: "0.75rem 1rem",
              borderRadius: "8px",
              border: "none",
              background: activeTab === "new-complaint" ? "#2563eb" : "transparent",
              color: activeTab === "new-complaint" ? "#ffffff" : "#475569",
              fontWeight: "700",
              fontSize: "0.95rem",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "0.5rem",
              transition: "all 0.2s ease",
            }}
          >
            <span>✍️</span> File New Complaint (ఫిర్యాదు చేయండి)
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("community")}
            style={{
              flex: "1 1 200px",
              padding: "0.75rem 1rem",
              borderRadius: "8px",
              border: "none",
              background: activeTab === "community" ? "#2563eb" : "transparent",
              color: activeTab === "community" ? "#ffffff" : "#475569",
              fontWeight: "700",
              fontSize: "0.95rem",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "0.5rem",
              transition: "all 0.2s ease",
            }}
          >
            <span>🏘️</span> Village Community Feed ({allCommunityIssues.length})
          </button>

          <button
            type="button"
            onClick={() => { setActiveTab("announcements"); setAnnouncementsKey(k => k + 1); }}
            style={{
              flex: "1 1 200px",
              padding: "0.75rem 1rem",
              borderRadius: "8px",
              border: "none",
              background: activeTab === "announcements" ? "#2563eb" : "transparent",
              color: activeTab === "announcements" ? "#ffffff" : "#475569",
              fontWeight: "700",
              fontSize: "0.95rem",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "0.5rem",
              transition: "all 0.2s ease",
            }}
          >
            <span>📢</span> Announcements (గ్రామ ప్రకటనలు)
            {announcementStats.unread_count > 0 && (
              <span
                style={{
                  background: "#dc2626",
                  color: "#ffffff",
                  padding: "2px 7px",
                  borderRadius: "9999px",
                  fontSize: "0.72rem",
                  fontWeight: "800",
                }}
              >
                {announcementStats.unread_count} New
              </span>
            )}
          </button>
        </div>
      </div>

      {/* ── MAIN CONTENT CONTAINER ── */}
      <main style={{ maxWidth: "1240px", margin: "0 auto 3rem", padding: "0 1.25rem" }}>
        {/* ========================================================= */}
        {/* TAB 1: MY COMPLAINTS REAL-TIME TRACKING                   */}
        {/* ========================================================= */}
        {activeTab === "my-complaints" && (
          <div>
            {/* Filter Bar */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem", flexWrap: "wrap", gap: "0.75rem" }}>
              <div style={{ display: "flex", gap: "0.4rem" }}>
                <button
                  type="button"
                  onClick={() => setMyStatusFilter("all")}
                  style={{
                    padding: "0.4rem 0.85rem",
                    borderRadius: "6px",
                    border: "none",
                    background: myStatusFilter === "all" ? "#1e293b" : "#e2e8f0",
                    color: myStatusFilter === "all" ? "#ffffff" : "#475569",
                    fontWeight: "600",
                    fontSize: "0.82rem",
                    cursor: "pointer",
                  }}
                >
                  All ({myIssues.length})
                </button>
                <button
                  type="button"
                  onClick={() => setMyStatusFilter("active")}
                  style={{
                    padding: "0.4rem 0.85rem",
                    borderRadius: "6px",
                    border: "none",
                    background: myStatusFilter === "active" ? "#2563eb" : "#e2e8f0",
                    color: myStatusFilter === "active" ? "#ffffff" : "#475569",
                    fontWeight: "600",
                    fontSize: "0.82rem",
                    cursor: "pointer",
                  }}
                >
                  Active ({myIssues.filter((i) => i.status !== "Resolved" && i.status !== "Rejected").length})
                </button>
                <button
                  type="button"
                  onClick={() => setMyStatusFilter("resolved")}
                  style={{
                    padding: "0.4rem 0.85rem",
                    borderRadius: "6px",
                    border: "none",
                    background: myStatusFilter === "resolved" ? "#16a34a" : "#e2e8f0",
                    color: myStatusFilter === "resolved" ? "#ffffff" : "#475569",
                    fontWeight: "600",
                    fontSize: "0.82rem",
                    cursor: "pointer",
                  }}
                >
                  Resolved ({myIssues.filter((i) => i.status === "Resolved").length})
                </button>
              </div>

              <div style={{ display: "flex", gap: "0.5rem" }}>
                <button
                  type="button"
                  onClick={fetchIssues}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "0.3rem",
                    padding: "0.4rem 0.75rem",
                    background: "#ffffff",
                    border: "1px solid #cbd5e1",
                    borderRadius: "6px",
                    cursor: "pointer",
                    fontSize: "0.82rem",
                    color: "#475569",
                    fontWeight: "600",
                  }}
                >
                  🔄 Live Refresh
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("new-complaint")}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "0.3rem",
                    padding: "0.4rem 0.85rem",
                    background: "#2563eb",
                    color: "#ffffff",
                    border: "none",
                    borderRadius: "6px",
                    cursor: "pointer",
                    fontSize: "0.82rem",
                    fontWeight: "700",
                  }}
                >
                  + New Complaint
                </button>
              </div>
            </div>

            {/* Complaints List */}
            {loadingData ? (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(360px, 1fr))", gap: "1rem" }}>
                {[1, 2, 3].map((i) => (
                  <div key={i} style={{ height: "220px", background: "#ffffff", borderRadius: "12px", border: "1px solid #e2e8f0", animation: "pulse 1.5s infinite" }} />
                ))}
              </div>
            ) : filteredMyIssues.length === 0 ? (
              <div style={{ textAlign: "center", padding: "3.5rem 1rem", background: "#ffffff", borderRadius: "14px", border: "1px solid #e2e8f0" }}>
                <span style={{ fontSize: "3rem", display: "block", marginBottom: "0.75rem" }}>📭</span>
                <h3 style={{ margin: "0 0 0.4rem", fontSize: "1.15rem", color: "#1e293b" }}>No Complaints Found</h3>
                <p style={{ margin: "0 0 1.25rem", fontSize: "0.88rem", color: "#64748b" }}>
                  {myStatusFilter === "all"
                    ? "You haven't submitted any complaints yet. Report a village problem easily using AI Voice or the form."
                    : "No complaints found matching this status filter."}
                </p>
                <button
                  type="button"
                  onClick={() => setActiveTab("new-complaint")}
                  style={{ padding: "0.6rem 1.4rem", background: "#2563eb", color: "#ffffff", border: "none", borderRadius: "8px", fontWeight: "700", cursor: "pointer" }}
                >
                  + File Your First Complaint
                </button>
              </div>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(360px, 1fr))", gap: "1rem" }}>
                {filteredMyIssues.map((issue) => {
                  const catMeta = CATEGORIES.find((c) => c.id === issue.category) || {
                    icon: "📋",
                    nameEn: issue.category,
                    nameTe: issue.category,
                    color: "#2563eb",
                    bg: "#eff6ff",
                  };
                  const isResolved = issue.status === "Resolved";
                  const isRejected = issue.status === "Rejected";
                  const hasGps = issue.latitude && issue.longitude;

                  return (
                    <div
                      key={issue.id}
                      style={{
                        background: "#ffffff",
                        borderRadius: "14px",
                        padding: "1.25rem",
                        border: isResolved ? "1.5px solid #86efac" : "1px solid #e2e8f0",
                        boxShadow: "0 2px 6px rgba(0,0,0,0.04)",
                        display: "flex",
                        flexDirection: "column",
                        gap: "0.75rem",
                      }}
                    >
                      {/* Card Header */}
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "0.5rem" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                          <span style={{ fontSize: "1.4rem" }}>{catMeta.icon}</span>
                          <div>
                            <span style={{ fontWeight: "700", color: "#1e293b", fontSize: "0.95rem" }}>
                              {catMeta.nameEn} (#{issue.id})
                            </span>
                            <div style={{ fontSize: "0.75rem", color: "#64748b" }}>
                              {issue.date} at {issue.time}
                            </div>
                          </div>
                        </div>

                        <span
                          style={{
                            padding: "0.2rem 0.6rem",
                            borderRadius: "9999px",
                            fontSize: "0.75rem",
                            fontWeight: "700",
                            background: isResolved ? "#dcfce7" : isRejected ? "#fee2e2" : "#fef3c7",
                            color: isResolved ? "#166534" : isRejected ? "#991b1b" : "#92400e",
                          }}
                        >
                          {issue.status}
                        </span>
                      </div>

                      {/* Real-time Status Stepper */}
                      <ProgressTimeline status={issue.status} />

                      {/* Location & GPS Info */}
                      <div style={{ background: "#f8fafc", padding: "0.55rem 0.75rem", borderRadius: "8px", fontSize: "0.82rem", color: "#334155", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "0.4rem" }}>
                        <div>
                          📍 <strong>Location:</strong> {issue.street} {issue.houseNo ? `(House #${issue.houseNo})` : ""}
                        </div>
                        {hasGps && (
                          <a
                            href={`https://www.google.com/maps/dir/?api=1&destination=${issue.latitude},${issue.longitude}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{ color: "#059669", fontWeight: "700", textDecoration: "none", fontSize: "0.78rem" }}
                          >
                            🗺️ Google Maps ↗
                          </a>
                        )}
                      </div>

                      {/* Worker Assignment Info if available */}
                      {issue.assignment?.worker_name && (
                        <div style={{ background: "#eff6ff", border: "1px solid #bfdbfe", padding: "0.45rem 0.75rem", borderRadius: "8px", fontSize: "0.8rem", color: "#1e40af", display: "flex", justifyContent: "space-between" }}>
                          <span>👷 <strong>Assigned Worker:</strong> {issue.assignment.worker_name}</span>
                          {issue.deadline && <span>Deadline: {issue.deadline}</span>}
                        </div>
                      )}

                      {/* Problem Description */}
                      <p style={{ margin: 0, fontSize: "0.88rem", color: "#334155", lineHeight: "1.4" }}>
                        {issue.description}
                      </p>

                      {/* Photo Thumbnail */}
                      {issue.photo && (
                        <div style={{ marginTop: "0.2rem" }}>
                          <span style={{ fontSize: "0.75rem", color: "#64748b", fontWeight: "600", display: "block", marginBottom: "0.2rem" }}>
                            Uploaded Photo:
                          </span>
                          <img
                            src={getImageUrl(issue.photo)}
                            alt="Complaint attachment"
                            onClick={() => setPreviewImage(getImageUrl(issue.photo))}
                            style={{ width: "90px", height: "70px", objectFit: "cover", borderRadius: "8px", cursor: "pointer", border: "1px solid #cbd5e1" }}
                            onError={(e) => (e.target.style.display = "none")}
                          />
                        </div>
                      )}

                      {/* Rejection Reason */}
                      {isRejected && issue.reason && (
                        <div style={{ background: "#fef2f2", color: "#991b1b", border: "1px solid #fecaca", padding: "0.6rem", borderRadius: "8px", fontSize: "0.82rem" }}>
                          <strong>Rejection Reason:</strong> {issue.reason}
                        </div>
                      )}

                      {/* AI Prediction Badge if available */}
                      {issue.ai_analysis && (
                        <div style={{ fontSize: "0.75rem", color: "#047857", background: "#f0fdf4", padding: "0.35rem 0.6rem", borderRadius: "6px" }}>
                          🤖 AI Verified: {issue.ai_analysis.predicted_text_category || issue.ai_analysis.predicted_image_category || "Category matched"}
                        </div>
                      )}

                      {/* Edit & Delete Action Row (Allowed ONLY Before Worker is Assigned) */}
                      <div style={{ marginTop: "0.5rem", paddingTop: "0.6rem", borderTop: "1px solid #f1f5f9", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "0.5rem" }}>
                        {!issue.assignment?.worker_name && (issue.status === "Pending" || !issue.status) ? (
                          <div style={{ display: "flex", gap: "0.5rem", width: "100%", justifyContent: "flex-end" }}>
                            <button
                              type="button"
                              onClick={() => setEditingIssue({
                                ...issue,
                                houseNo: issue.house_no || issue.houseNo || "",
                                newPhoto: null,
                                newPhotoPreview: null,
                              })}
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "0.35rem",
                                padding: "0.45rem 0.9rem",
                                background: "#f0fdf4",
                                color: "#166534",
                                border: "1.5px solid #86efac",
                                borderRadius: "8px",
                                fontWeight: "700",
                                fontSize: "0.82rem",
                                cursor: "pointer",
                                transition: "all 0.15s",
                              }}
                            >
                              <span>✏️</span> Edit (సవరించు)
                            </button>
                            <button
                              type="button"
                              onClick={() => setDeletingIssue(issue)}
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "0.35rem",
                                padding: "0.45rem 0.9rem",
                                background: "#fef2f2",
                                color: "#991b1b",
                                border: "1.5px solid #fecaca",
                                borderRadius: "8px",
                                fontWeight: "700",
                                fontSize: "0.82rem",
                                cursor: "pointer",
                                transition: "all 0.15s",
                              }}
                            >
                              <span>🗑️</span> Delete (తొలగించు)
                            </button>
                          </div>
                        ) : (
                          <div style={{ fontSize: "0.78rem", color: "#64748b", display: "flex", alignItems: "center", gap: "0.3rem" }}>
                            <span>🔒</span> Worker assigned ({issue.assignment?.worker_name || "Active"}) — Locked
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 2: FILE NEW COMPLAINT                                 */}
        {/* ========================================================= */}
        {activeTab === "new-complaint" && (
          <div style={{ maxWidth: "760px", margin: "0 auto" }}>
            {/* Top Banner: AI Voice & Photo Complaint Fast Track */}
            <div
              style={{
                background: "linear-gradient(135deg, #eff6ff 0%, #f0fdf4 100%)",
                border: "2px solid #3b82f6",
                borderRadius: "14px",
                padding: "1.25rem 1.5rem",
                marginBottom: "1.5rem",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                flexWrap: "wrap",
                gap: "1rem",
                boxShadow: "0 4px 12px rgba(59, 130, 246, 0.1)",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "0.85rem" }}>
                <div style={{ width: 48, height: 48, borderRadius: "50%", background: "#2563eb", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.5rem" }}>
                  🎙️
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: "1.1rem", fontWeight: "800", color: "#0f172a" }}>
                    AI Voice & Photo Complaint
                  </h3>
                  <p style={{ margin: "0.2rem 0 0", color: "#475569", fontSize: "0.85rem" }}>
                    తెలుగు లేదా English లో మాట్లాడి ఫోటో తీయండి — AI స్వయంచాలకంగా సమస్యను నమోదు చేస్తుంది.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowVoiceModal(true)}
                style={{
                  padding: "0.65rem 1.25rem",
                  background: "#2563eb",
                  color: "#ffffff",
                  border: "none",
                  borderRadius: "8px",
                  fontWeight: "700",
                  fontSize: "0.9rem",
                  cursor: "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "0.4rem",
                }}
              >
                <span>🎤</span> Start Voice Complaint
              </button>
            </div>

            {/* Standard Category Complaint Form */}
            <div style={{ background: "#ffffff", borderRadius: "14px", padding: "1.5rem", border: "1px solid #e2e8f0", boxShadow: "0 2px 8px rgba(0,0,0,0.04)" }}>
              <h3 style={{ margin: "0 0 0.3rem", fontSize: "1.2rem", fontWeight: "700", color: "#1e293b" }}>
                📝 Complaint Form
              </h3>
              <p style={{ margin: "0 0 1.25rem", fontSize: "0.85rem", color: "#64748b" }}>
                Select a category, describe the issue, and provide the location for our field workers.
              </p>

              <form onSubmit={handleSubmitComplaint}>
                {/* 1. Category Selector */}
                <div style={{ marginBottom: "1.25rem" }}>
                  <label style={{ display: "block", fontWeight: "600", marginBottom: "0.5rem", fontSize: "0.9rem" }}>
                    1. Select Problem Category (సమస్య విభాగం) *
                  </label>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: "0.6rem" }}>
                    {CATEGORIES.map((cat) => {
                      const isSelected = selectedCategory === cat.id;
                      return (
                        <div
                          key={cat.id}
                          onClick={() => setSelectedCategory(cat.id)}
                          style={{
                            padding: "0.75rem 0.5rem",
                            borderRadius: "10px",
                            border: isSelected ? `2px solid ${cat.color}` : "1.5px solid #e2e8f0",
                            background: isSelected ? cat.bg : "#ffffff",
                            textAlign: "center",
                            cursor: "pointer",
                            transition: "all 0.2s ease",
                          }}
                        >
                          <span style={{ fontSize: "1.5rem", display: "block", marginBottom: "0.2rem" }}>{cat.icon}</span>
                          <span style={{ fontSize: "0.85rem", fontWeight: "700", color: isSelected ? cat.color : "#334155", display: "block" }}>
                            {cat.nameEn}
                          </span>
                          <span style={{ fontSize: "0.75rem", color: "#64748b" }}>{cat.nameTe}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* 2. Location Inputs */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.85rem", marginBottom: "1rem" }}>
                  <div>
                    <label style={{ display: "block", fontWeight: "600", marginBottom: "0.35rem", fontSize: "0.85rem" }}>
                      Street Name / Landmark (వీధి పేరు) *
                    </label>
                    <input
                      type="text"
                      name="street"
                      required
                      placeholder="e.g. Gandhi Nagar Road 3"
                      value={formData.street}
                      onChange={handleInputChange}
                      style={{ width: "100%", padding: "0.55rem 0.75rem", borderRadius: "8px", border: "1px solid #cbd5e1", fontSize: "0.9rem", boxSizing: "border-box" }}
                    />
                  </div>

                  <div>
                    <label style={{ display: "block", fontWeight: "600", marginBottom: "0.35rem", fontSize: "0.85rem" }}>
                      House No / Near Pole (ఇంటి నంబరు)
                    </label>
                    <input
                      type="text"
                      name="houseNo"
                      placeholder="e.g. 4-12/A or Near Water Tank"
                      value={formData.houseNo}
                      onChange={handleInputChange}
                      style={{ width: "100%", padding: "0.55rem 0.75rem", borderRadius: "8px", border: "1px solid #cbd5e1", fontSize: "0.9rem", boxSizing: "border-box" }}
                    />
                  </div>
                </div>

                {/* 3. GPS Location Picker */}
                <div style={{ marginBottom: "1rem" }}>
                  <GPSLocationPicker
                    onLocationChange={(loc) => {
                      setFormData((prev) => ({ ...prev, ...loc }));
                    }}
                  />
                </div>

                {/* 4. Problem Description */}
                <div style={{ marginBottom: "1rem" }}>
                  <label style={{ display: "block", fontWeight: "600", marginBottom: "0.35rem", fontSize: "0.85rem" }}>
                    Problem Description (సమస్య వివరణ) *
                  </label>
                  <textarea
                    name="description"
                    required
                    rows={4}
                    placeholder="Describe what is broken, leaking, or causing an issue in your area..."
                    value={formData.description}
                    onChange={handleInputChange}
                    style={{ width: "100%", padding: "0.6rem 0.75rem", borderRadius: "8px", border: "1px solid #cbd5e1", fontSize: "0.9rem", boxSizing: "border-box", resize: "vertical" }}
                  />
                </div>

                {/* 5. Priority & Photo Upload */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.85rem", marginBottom: "1.5rem" }}>
                  <div>
                    <label style={{ display: "block", fontWeight: "600", marginBottom: "0.35rem", fontSize: "0.85rem" }}>
                      Priority Level (ప్రాధాన్యత)
                    </label>
                    <select
                      name="priority"
                      value={formData.priority}
                      onChange={handleInputChange}
                      style={{ width: "100%", padding: "0.55rem 0.75rem", borderRadius: "8px", border: "1px solid #cbd5e1", fontSize: "0.9rem", background: "#ffffff" }}
                    >
                      <option value="low">Low (తక్కువ)</option>
                      <option value="medium">Medium (సాధారణ)</option>
                      <option value="high">High (ఎక్కువ)</option>
                      <option value="urgent">Urgent (అత్యవసరం)</option>
                    </select>
                  </div>

                  <div>
                    <label style={{ display: "block", fontWeight: "600", marginBottom: "0.35rem", fontSize: "0.85rem" }}>
                      Photo Attachment (ఫోటో)
                    </label>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handlePhotoSelect}
                      style={{ width: "100%", fontSize: "0.85rem" }}
                    />
                    {photoPreview && (
                      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginTop: "0.4rem" }}>
                        <img src={photoPreview} alt="Preview" style={{ width: "50px", height: "40px", objectFit: "cover", borderRadius: "4px" }} />
                        <button
                          type="button"
                          onClick={removeSelectedPhoto}
                          style={{ padding: "0.2rem 0.5rem", background: "#fee2e2", color: "#b91c1c", border: "none", borderRadius: "4px", fontSize: "0.75rem", cursor: "pointer" }}
                        >
                          ✕ Remove
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Submit Action */}
                <div style={{ display: "flex", gap: "0.75rem", justifyContent: "flex-end" }}>
                  <button
                    type="button"
                    onClick={resetForm}
                    style={{ padding: "0.65rem 1.25rem", background: "#f1f5f9", color: "#475569", border: "none", borderRadius: "8px", cursor: "pointer", fontWeight: "600" }}
                  >
                    Clear Form
                  </button>

                  <button
                    type="submit"
                    disabled={submitLoading}
                    style={{
                      padding: "0.65rem 1.75rem",
                      background: submitLoading ? "#93c5fd" : "linear-gradient(135deg, #2563eb, #1d4ed8)",
                      color: "#ffffff",
                      border: "none",
                      borderRadius: "8px",
                      fontWeight: "700",
                      fontSize: "0.95rem",
                      cursor: submitLoading ? "not-allowed" : "pointer",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "0.4rem",
                      boxShadow: "0 2px 6px rgba(37,99,235,0.25)",
                    }}
                  >
                    {submitLoading ? "Submitting..." : "🚀 Submit Complaint"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 3: VILLAGE COMMUNITY LIVE FEED                        */}
        {/* ========================================================= */}
        {activeTab === "community" && (
          <div>
            <div style={{ marginBottom: "1rem", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "0.75rem" }}>
              <div>
                <h3 style={{ margin: 0, fontSize: "1.15rem", fontWeight: "700" }}>🏘️ Village Community Feed</h3>
                <p style={{ margin: "0.2rem 0 0", fontSize: "0.82rem", color: "#64748b" }}>
                  Public overview of community maintenance and ongoing development in the village
                </p>
              </div>

              {/* Filters */}
              <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                <input
                  type="text"
                  placeholder="Search street or keyword..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{ padding: "0.4rem 0.75rem", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "0.85rem" }}
                />

                <select
                  value={communityCatFilter}
                  onChange={(e) => setCommunityCatFilter(e.target.value)}
                  style={{ padding: "0.4rem 0.75rem", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "0.85rem" }}
                >
                  <option value="all">All Categories</option>
                  <option value="water">💧 Water</option>
                  <option value="electricity">⚡ Electricity</option>
                  <option value="garbage">🗑 Garbage</option>
                  <option value="drainage">🚰 Drainage</option>
                </select>

                <select
                  value={communityStatusFilter}
                  onChange={(e) => setCommunityStatusFilter(e.target.value)}
                  style={{ padding: "0.4rem 0.75rem", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "0.85rem" }}
                >
                  <option value="all">All Status</option>
                  <option value="Pending">Pending</option>
                  <option value="Assigned">Assigned</option>
                  <option value="In Progress">In Progress</option>
                  <option value="Resolved">Resolved</option>
                </select>
              </div>
            </div>

            {filteredCommunity.length === 0 ? (
              <div style={{ textAlign: "center", padding: "3rem", background: "#ffffff", borderRadius: "12px", border: "1px solid #e2e8f0", color: "#64748b" }}>
                <span>🔍</span> No community issues found matching your filters.
              </div>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: "1rem" }}>
                {filteredCommunity.map((issue) => {
                  const catMeta = CATEGORIES.find((c) => c.id === issue.category) || { icon: "📋", nameEn: issue.category };
                  return (
                    <div key={issue.id} style={{ background: "#ffffff", borderRadius: "12px", padding: "1rem", border: "1px solid #e2e8f0", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <span style={{ fontWeight: "700", fontSize: "0.9rem" }}>
                          {catMeta.icon} {catMeta.nameEn} (#{issue.id})
                        </span>
                        <span style={{ fontSize: "0.75rem", padding: "0.15rem 0.5rem", borderRadius: "9999px", background: issue.status === "Resolved" ? "#dcfce7" : "#eff6ff", color: issue.status === "Resolved" ? "#166534" : "#1d4ed8", fontWeight: "700" }}>
                          {issue.status}
                        </span>
                      </div>

                      <div style={{ fontSize: "0.8rem", color: "#64748b" }}>
                        📍 {issue.street} {issue.houseNo ? `· #${issue.houseNo}` : ""}
                      </div>

                      <p style={{ margin: 0, fontSize: "0.85rem", color: "#334155", lineHeight: "1.4" }}>
                        {issue.description?.substring(0, 100)}{issue.description?.length > 100 ? "..." : ""}
                      </p>

                      <div style={{ fontSize: "0.75rem", color: "#94a3b8", borderTop: "1px solid #f1f5f9", paddingTop: "0.4rem" }}>
                        📅 Reported: {issue.date}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 4: VILLAGE ANNOUNCEMENTS & VOICE BROADCASTING         */}
        {/* ========================================================= */}
        {activeTab === "announcements" && (
          <VillagerAnnouncementsSection key={announcementsKey} />
        )}
      </main>

      {/* ── PHOTO VIEWER POPUP ── */}
      {previewImage && (
        <div
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", zIndex: 10000, display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem" }}
          onClick={() => setPreviewImage(null)}
        >
          <div style={{ background: "#fff", borderRadius: "10px", padding: "0.5rem", maxWidth: "90%", maxHeight: "90%" }}>
            <img src={previewImage} alt="Large preview" style={{ maxWidth: "100%", maxHeight: "80vh", borderRadius: "8px", display: "block" }} />
            <button
              type="button"
              onClick={() => setPreviewImage(null)}
              style={{ marginTop: "0.5rem", width: "100%", padding: "0.4rem", background: "#1e293b", color: "#fff", border: "none", borderRadius: "6px", cursor: "pointer" }}
            >
              Close Preview
            </button>
          </div>
        </div>
      )}

      {/* ── LOGOUT CONFIRMATION POPUP ── */}
      {showLogoutConfirm && (
        <div
          style={{ position: "fixed", inset: 0, background: "rgba(15, 23, 42, 0.6)", backdropFilter: "blur(4px)", zIndex: 10000, display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem" }}
          onClick={(e) => { if (e.target === e.currentTarget) setShowLogoutConfirm(false); }}
        >
          <div style={{ background: "#ffffff", borderRadius: "12px", padding: "1.5rem", maxWidth: "380px", width: "100%", textAlign: "center", boxShadow: "0 20px 25px -5px rgba(0,0,0,0.2)" }}>
            <span style={{ fontSize: "2rem", display: "block", marginBottom: "0.5rem" }}>👋</span>
            <h3 style={{ margin: "0 0 0.4rem", fontSize: "1.15rem", color: "#1e293b" }}>Sign Out</h3>
            <p style={{ margin: "0 0 1.25rem", fontSize: "0.88rem", color: "#64748b" }}>
              Are you sure you want to log out of your citizen account?
            </p>
            <div style={{ display: "flex", gap: "0.5rem" }}>
              <button
                type="button"
                onClick={() => setShowLogoutConfirm(false)}
                style={{ flex: 1, padding: "0.55rem", background: "#f1f5f9", border: "none", borderRadius: "6px", cursor: "pointer", fontWeight: "600", color: "#475569" }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={logout}
                disabled={logoutLoading}
                style={{ flex: 1, padding: "0.55rem", background: "#dc2626", color: "#fff", border: "none", borderRadius: "6px", cursor: "pointer", fontWeight: "700" }}
              >
                {logoutLoading ? "Logging out..." : "Yes, Sign Out"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── AI VOICE COMPLAINT MODAL ── */}
      <VoiceComplaintModal
        isOpen={showVoiceModal}
        onClose={() => setShowVoiceModal(false)}
        onSuccess={() => {
          setRefreshCount((c) => c + 1);
          showToast("🎉 Complaint registered successfully via AI Voice!", "success");
          setActiveTab("my-complaints");
        }}
        userId={userId}
      />

      {/* ── VOICE STATUS TRACKER MODAL ── */}
      <VoiceStatusTracker
        isOpen={showVoiceTracker}
        onClose={() => setShowVoiceTracker(false)}
        userId={userId}
      />

      {/* ── EDIT COMPLAINT MODAL (Allowed Before Worker Assignment) ── */}
      {editingIssue && (
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
            if (e.target === e.currentTarget) setEditingIssue(null);
          }}
        >
          <div
            style={{
              background: "#ffffff",
              borderRadius: "14px",
              padding: "1.5rem",
              maxWidth: "600px",
              width: "100%",
              boxShadow: "0 20px 25px -5px rgba(0,0,0,0.2)",
              maxHeight: "90vh",
              overflowY: "auto",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
              <h3 style={{ margin: 0, fontSize: "1.15rem", color: "#1e293b", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <span>✏️</span> Edit Complaint #{editingIssue.id} (ఫిర్యాదు సవరణ)
              </h3>
              <button
                type="button"
                onClick={() => setEditingIssue(null)}
                style={{ background: "none", border: "none", fontSize: "1.2rem", cursor: "pointer", color: "#64748b" }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleUpdateComplaint}>
              {/* Category */}
              <div style={{ marginBottom: "1rem" }}>
                <label style={{ display: "block", fontWeight: "600", marginBottom: "0.35rem", fontSize: "0.85rem" }}>
                  Problem Category (సమస్య రకం) *
                </label>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "0.5rem" }}>
                  {CATEGORIES.map((cat) => (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setEditingIssue((prev) => ({ ...prev, category: cat.id }))}
                      style={{
                        padding: "0.5rem",
                        borderRadius: "8px",
                        border: editingIssue.category === cat.id ? "2px solid #2563eb" : "1px solid #cbd5e1",
                        background: editingIssue.category === cat.id ? "#eff6ff" : "#ffffff",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        gap: "0.4rem",
                        fontSize: "0.85rem",
                        fontWeight: editingIssue.category === cat.id ? "700" : "500",
                        color: editingIssue.category === cat.id ? "#1d4ed8" : "#334155",
                      }}
                    >
                      <span>{cat.icon}</span>
                      <span>{cat.nameEn} ({cat.nameTe})</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Street & House No */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem", marginBottom: "1rem" }}>
                <div>
                  <label style={{ display: "block", fontWeight: "600", marginBottom: "0.35rem", fontSize: "0.85rem" }}>
                    Street Name (వీధి పేరు) *
                  </label>
                  <input
                    type="text"
                    required
                    value={editingIssue.street || ""}
                    onChange={(e) => setEditingIssue((prev) => ({ ...prev, street: e.target.value }))}
                    style={{ width: "100%", padding: "0.5rem", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "0.85rem", boxSizing: "border-box" }}
                  />
                </div>
                <div>
                  <label style={{ display: "block", fontWeight: "600", marginBottom: "0.35rem", fontSize: "0.85rem" }}>
                    House No (ఇంటి నంబరు)
                  </label>
                  <input
                    type="text"
                    value={editingIssue.houseNo || ""}
                    onChange={(e) => setEditingIssue((prev) => ({ ...prev, houseNo: e.target.value }))}
                    style={{ width: "100%", padding: "0.5rem", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "0.85rem", boxSizing: "border-box" }}
                  />
                </div>
              </div>

              {/* Description */}
              <div style={{ marginBottom: "1rem" }}>
                <label style={{ display: "block", fontWeight: "600", marginBottom: "0.35rem", fontSize: "0.85rem" }}>
                  Problem Description (సమస్య వివరాలు) *
                </label>
                <textarea
                  required
                  rows={3}
                  value={editingIssue.description || ""}
                  onChange={(e) => setEditingIssue((prev) => ({ ...prev, description: e.target.value }))}
                  style={{ width: "100%", padding: "0.5rem", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "0.85rem", boxSizing: "border-box" }}
                />
              </div>

              {/* Replace Photo */}
              <div style={{ marginBottom: "1rem" }}>
                <label style={{ display: "block", fontWeight: "600", marginBottom: "0.35rem", fontSize: "0.85rem" }}>
                  Update Photo (ఫోటో మార్చండి - ఐచ్ఛికం)
                </label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files[0];
                    if (file) {
                      setEditingIssue((prev) => ({
                        ...prev,
                        newPhoto: file,
                        newPhotoPreview: URL.createObjectURL(file),
                      }));
                    }
                  }}
                  style={{ fontSize: "0.82rem" }}
                />
                {editingIssue.newPhotoPreview ? (
                  <div style={{ marginTop: "0.4rem" }}>
                    <span style={{ fontSize: "0.75rem", color: "#16a34a", fontWeight: "600" }}>New Photo Selected:</span>
                    <br />
                    <img src={editingIssue.newPhotoPreview} alt="New" style={{ width: "90px", height: "70px", objectFit: "cover", borderRadius: "6px", border: "1.5px solid #16a34a", marginTop: "0.2rem" }} />
                  </div>
                ) : editingIssue.photo ? (
                  <div style={{ marginTop: "0.4rem" }}>
                    <span style={{ fontSize: "0.75rem", color: "#64748b" }}>Current Photo:</span>
                    <br />
                    <img src={getImageUrl(editingIssue.photo)} alt="Current" style={{ width: "90px", height: "70px", objectFit: "cover", borderRadius: "6px", marginTop: "0.2rem" }} />
                  </div>
                ) : null}
              </div>

              {/* GPS Location Picker */}
              <div style={{ marginBottom: "1rem" }}>
                <GPSLocationPicker
                  onLocationChange={(loc) => {
                    setEditingIssue((prev) => ({
                      ...prev,
                      latitude: loc.latitude,
                      longitude: loc.longitude,
                      location_accuracy: loc.location_accuracy,
                      location_captured: loc.location_captured,
                    }));
                  }}
                />
              </div>

              {/* Submit Buttons */}
              <div style={{ display: "flex", gap: "0.75rem", justifyContent: "flex-end", borderTop: "1px solid #e2e8f0", paddingTop: "1rem" }}>
                <button
                  type="button"
                  onClick={() => setEditingIssue(null)}
                  style={{ padding: "0.55rem 1.1rem", background: "#f1f5f9", border: "none", borderRadius: "8px", cursor: "pointer", fontWeight: "600", color: "#475569" }}
                >
                  Cancel (రద్దు చేయి)
                </button>
                <button
                  type="submit"
                  disabled={editLoading}
                  style={{
                    padding: "0.55rem 1.4rem",
                    background: editLoading ? "#93c5fd" : "#16a34a",
                    color: "#ffffff",
                    border: "none",
                    borderRadius: "8px",
                    fontWeight: "700",
                    cursor: editLoading ? "not-allowed" : "pointer",
                  }}
                >
                  {editLoading ? "Saving..." : "✓ Save Changes (మార్పులను భద్రపరచు)"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── DELETE COMPLAINT CONFIRMATION MODAL (Allowed Before Worker Assignment) ── */}
      {deletingIssue && (
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
            if (e.target === e.currentTarget) setDeletingIssue(null);
          }}
        >
          <div
            style={{
              background: "#ffffff",
              borderRadius: "14px",
              padding: "1.5rem",
              maxWidth: "420px",
              width: "100%",
              textAlign: "center",
              boxShadow: "0 20px 25px -5px rgba(0,0,0,0.2)",
            }}
          >
            <div style={{ fontSize: "2.5rem", marginBottom: "0.5rem" }}>🗑️</div>
            <h3 style={{ margin: "0 0 0.5rem", fontSize: "1.2rem", color: "#1e293b" }}>
              Delete Complaint #{deletingIssue.id}?
            </h3>
            <p style={{ margin: "0 0 0.5rem", color: "#475569", fontSize: "0.88rem", lineHeight: "1.4" }}>
              మీరు నిజంగా ఈ ఫిర్యాదును తొలగించాలనుకుంటున్నారా?
            </p>
            <p style={{ margin: "0 0 1.25rem", color: "#dc2626", fontSize: "0.8rem", fontWeight: "600" }}>
              ⚠️ This complaint has not yet been assigned to a worker and will be permanently removed.
            </p>

            <div style={{ background: "#f8fafc", padding: "0.6rem 0.8rem", borderRadius: "8px", marginBottom: "1.25rem", textAlign: "left", fontSize: "0.82rem", color: "#334155" }}>
              <strong>Category:</strong> {deletingIssue.category}
              <br />
              <strong>Location:</strong> {deletingIssue.street}
              <br />
              <strong>Description:</strong> {deletingIssue.description?.substring(0, 70)}...
            </div>

            <div style={{ display: "flex", gap: "0.75rem" }}>
              <button
                type="button"
                onClick={() => setDeletingIssue(null)}
                style={{ flex: 1, padding: "0.6rem", background: "#f1f5f9", border: "none", borderRadius: "8px", cursor: "pointer", fontWeight: "600", color: "#475569" }}
              >
                Cancel (రద్దు చేయి)
              </button>
              <button
                type="button"
                onClick={handleDeleteComplaint}
                disabled={deleteLoading}
                style={{
                  flex: 1,
                  padding: "0.6rem",
                  background: deleteLoading ? "#fca5a5" : "#dc2626",
                  color: "#ffffff",
                  border: "none",
                  borderRadius: "8px",
                  fontWeight: "700",
                  cursor: deleteLoading ? "not-allowed" : "pointer",
                }}
              >
                {deleteLoading ? "Deleting..." : "Yes, Delete (తొలగించు)"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
