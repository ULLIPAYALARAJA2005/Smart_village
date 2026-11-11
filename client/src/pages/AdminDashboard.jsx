import { useState, useEffect } from "react";
import "../styles/admin.css";
import "../styles/skeleton.css";
import { useNavigate } from "react-router-dom";
import { SkeletonBox, SkeletonCircle, SkeletonText } from "../components/Skeleton";
import AdminGPSMap from "../components/AdminGPSMap";
import AssignWorkerModal from "../components/AssignWorkerModal";
import CreateWorkerModal from "../components/CreateWorkerModal";
import AdminAnnouncementManager from "../components/AdminAnnouncementManager";
import {
  fetchAllIssuesAPI,
  fetchWorkersAPI,
  assignWorkerAPI,
  verifyAssignmentAPI,
  fetchAssignmentStatsAPI,
  fetchAdminWorkersListAPI,
  resetWorkerPasswordAPI,
} from "../services/aiApi";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Legend
} from "recharts";

const getCookie = (name) => document.cookie
  .split('; ')
  .find(cookie => cookie.startsWith(`${name}=`))
  ?.split('=').slice(1).join('=');

const csrfHeaders = () => {
  const token = getCookie('csrftoken');
  return token ? { 'X-CSRFToken': decodeURIComponent(token) } : {};
};

const getImageUrl = (photo) => {
  if (!photo) return null;
  if (photo.startsWith("http")) return photo;
  return photo.startsWith("/") ? photo : `/media/${photo}`;
};

export default function AdminDashboard() {

  const navigate = useNavigate();
  const adminName = "Admin";
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);


  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [logoutLoading, setLogoutLoading] = useState(false);
  const logout = () => {
    setShowLogoutConfirm(true);
  };
  const confirmLogout = () => {
    setLogoutLoading(true);
    setTimeout(() => {
      localStorage.clear();
      navigate("/");
    }, 700);
  };


  const [requests, setRequests] = useState([]);
  const [showRequestPopup, setShowRequestPopup] = useState(false);

  const [activeCategory, setActiveCategory] = useState("");
  const [requestLoading, setRequestLoading] = useState(null);
  const [issues, setIssues] = useState({
    electricity: [],
    water: [],
    garbage: [],
    drainage: []
  });


  const [assignedIssues, setAssignedIssues] = useState([]);
  const [progressIssues, setProgressIssues] = useState([]);
  const [overdueIssues, setOverdueIssues] = useState([]);
  const [loadingData, setLoadingData] = useState(true);

  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    assigned: 0,
    progress: 0,
    resolved: 0,
    rejected: 0
  });


  const [rejectReason, setRejectReason] = useState({});
  const [deadline, setDeadline] = useState({});
  const [issueLoading, setIssueLoading] = useState({});

  const [popupMessage, setPopupMessage] = useState("");
  const showToast = (message) => {
    const text = typeof message === "string" ? message : (message?.message || "Notification");
    setPopupMessage(text);
  };
  const [pendingCounts, setPendingCounts] = useState({ electricity: 0, water: 0, garbage: 0, drainage: 0 });

  // ── GPS & WORK ASSIGNMENT SYSTEM STATES ──
  const [adminActiveTab, setAdminActiveTab] = useState("overview"); // "overview" | "map" | "assignments"
  const [allIssuesList, setAllIssuesList] = useState([]);
  const [workersList, setWorkersList] = useState([]);
  const [selectedIssueForAssign, setSelectedIssueForAssign] = useState(null);
  const [monitoringStats, setMonitoringStats] = useState(null);
  const [verifyingId, setVerifyingId] = useState(null);
  const [showCreateWorkerModal, setShowCreateWorkerModal] = useState(false);
  const [adminWorkersDetailed, setAdminWorkersDetailed] = useState([]);
  const [resetWorkerModal, setResetWorkerModal] = useState(null);
  const [resetNewPass, setResetNewPass] = useState("");
  const [resettingLoading, setResettingLoading] = useState(false);
  const [monitoringFilter, setMonitoringFilter] = useState("all"); // "all" | "completed" | "active" | "verified"

  const pendingVerificationIssues = allIssuesList.filter(
    (i) => i.assignment?.work_status === "Completed"
  );

  const loadGpsAndAssignmentData = async () => {
    try {
      const [allIssues, workers, statsData, detailedWorkers] = await Promise.all([
        fetchAllIssuesAPI().catch(() => []),
        fetchWorkersAPI().catch(() => []),
        fetchAssignmentStatsAPI().catch(() => null),
        fetchAdminWorkersListAPI().catch(() => []),
      ]);
      setAllIssuesList(Array.isArray(allIssues) ? allIssues : []);
      setWorkersList(Array.isArray(workers) ? workers : []);
      if (statsData) setMonitoringStats(statsData);
      setAdminWorkersDetailed(Array.isArray(detailedWorkers) ? detailedWorkers : []);
    } catch (err) {
      console.warn("Error loading GPS/assignment data:", err);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (!resetWorkerModal || !resetNewPass) return;
    setResettingLoading(true);
    try {
      await resetWorkerPasswordAPI(resetWorkerModal.id, resetNewPass);
      setPopupMessage(`✅ Password for ${resetWorkerModal.username} updated to "${resetNewPass}"!`);
      setTimeout(() => setPopupMessage(""), 4000);
      setResetWorkerModal(null);
      setResetNewPass("");
      loadGpsAndAssignmentData();
    } catch (err) {
      setPopupMessage("❌ " + err.message);
      setTimeout(() => setPopupMessage(""), 3000);
    } finally {
      setResettingLoading(false);
    }
  };

  const handleAssignWorker = async ({ worker_id, priority, deadline, admin_instructions }) => {
    if (!selectedIssueForAssign) return;
    await assignWorkerAPI(selectedIssueForAssign.id, {
      worker_id,
      priority,
      deadline,
      admin_instructions,
    });
    setPopupMessage("✅ Worker successfully assigned!");
    setTimeout(() => setPopupMessage(""), 3000);
    loadGpsAndAssignmentData();
    if (activeCategory) fetchIssues(activeCategory);
  };

  const handleVerifyWork = async (assignmentId) => {
    try {
      setVerifyingId(assignmentId);
      await verifyAssignmentAPI(assignmentId);
      setPopupMessage("✅ Work verified! Issue marked as Resolved.");
      setTimeout(() => setPopupMessage(""), 3000);
      loadGpsAndAssignmentData();
      if (activeCategory) fetchIssues(activeCategory);
    } catch (err) {
      setPopupMessage("❌ Failed to verify work: " + err.message);
      setTimeout(() => setPopupMessage(""), 3000);
    } finally {
      setVerifyingId(null);
    }
  };

  /* CATEGORY LABEL */

  const label = (cat) => {
    if (cat === "electricity") return "⚡ Electricity";
    if (cat === "water") return "💧 Water";
    if (cat === "garbage") return "🗑 Garbage";
    if (cat === "drainage") return "🚰 Drainage";
  };


  /* FETCH SIGNUP REQUESTS */

  useEffect(() => {
    fetch("/api/auth/csrf/", { credentials: "same-origin" });
    loadGpsAndAssignmentData();
    fetch("/api/admin/requests/")
      .then(res => res.json())
      .then(data => setRequests(data));
  }, []);


  /* APPROVE USER */

  const approveUser = async (id) => {
    setRequestLoading({ id, type: "approve" });
    try {
      await fetch("/api/auth/csrf/", { credentials: "same-origin" });
      const res = await fetch(`/api/admin/approve/${id}/`, { method: "PUT", headers: csrfHeaders(), credentials: "same-origin" });
      const data = await res.json();
      if (data.success) {
        setPopupMessage("✅ Request Approved");
      } else {
        setPopupMessage("❌ Operation failed");
      }
      setRequests(requests.filter(u => u.id !== id));
    } catch (err) {
      setPopupMessage("❌ Error while approving");
    } finally {
      setRequestLoading(null);
    }
  };


  /* REJECT USER */

  const rejectUser = async (id) => {
    setRequestLoading({ id, type: "reject" });
    try {
      await fetch("/api/auth/csrf/", { credentials: "same-origin" });
      const res = await fetch(`/api/admin/reject/${id}/`, { method: "PUT", headers: csrfHeaders(), credentials: "same-origin" });
      const data = await res.json();
      if (data.success) {
        setPopupMessage("❌ Request Rejected");
      } else {
        setPopupMessage("❌ Reject failed");
      }
      setRequests(requests.filter(u => u.id !== id));
    } catch (err) {
      setPopupMessage("❌ Error while rejecting");
    } finally {
      setRequestLoading(null);
    }
  };



  /* FETCH ALL ISSUES */


  const fetchAllIssues = async () => {
    setLoadingData(true);
    const categories = ["electricity", "water", "garbage", "drainage"];
    let assigned = [];
    let progress = [];
    let overdue = [];
    let total = 0;
    let pending = 0;
    let resolved = 0;
    let rejected = 0;
    let pendingObj = {};
    for (const cat of categories) {
      const res = await fetch(`/api/issues/${cat}/`);
      const data = await res.json();
      const withCategory = data.map(i => ({ ...i, category: cat }));
      total += withCategory.length;
      const catPending = withCategory.filter(i => i.status === "Pending").length;
      pending += catPending;
      pendingObj[cat] = catPending;
      resolved += withCategory.filter(i => i.status === "Resolved").length;
      rejected += withCategory.filter(i => i.status === "Rejected").length;
      assigned.push(...withCategory.filter(i => i.status === "Assigned"));
      progress.push(...withCategory.filter(i => i.status === "In Progress"));
      const today = new Date();
      overdue.push(...withCategory.filter(i => {
        if (!i.deadline) return false;
        return new Date(i.deadline) <= today && i.status !== "Resolved";
      }));
    }
    setAssignedIssues(assigned);
    setProgressIssues(progress);
    setOverdueIssues(overdue);
    setStats({
      total,
      pending,
      assigned: assigned.length,
      progress: progress.length,
      resolved,
      rejected
    });
    setPendingCounts(pendingObj);
    setLoadingData(false);
  };

  useEffect(() => {
    fetchAllIssues();
  }, []);



  /* FETCH CATEGORY ISSUES */

  const fetchIssues = async (category) => {

    const res = await fetch(`/api/issues/${category}/`);
    const data = await res.json();

    setIssues(prev => ({
      ...prev,
      [category]: data
    }));

  };



  /* ACCEPT ISSUE */


  const acceptIssue = async (id) => {
    if (!deadline[id]) {
      setPopupMessage("⚠️ Please select a deadline first");
      return;
    }
    setIssueLoading(prev => ({ ...prev, [id]: 'accept' }));
    try {
      await fetch("/api/auth/csrf/", { credentials: "same-origin" });
      const res = await fetch(`/api/issues/status/${activeCategory}/${id}/`, {
        method: "PUT",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json", ...csrfHeaders() },
        body: JSON.stringify({ status: "Assigned", deadline: deadline[id] })
      });
      const data = await res.json();
      if (data.success) {
        setPopupMessage("✅ Issue Accepted");
      } else {
        setPopupMessage("❌ Failed to accept issue");
      }
      await fetchIssues(activeCategory);
      await fetchAllIssues();
    } finally {
      setIssueLoading(prev => ({ ...prev, [id]: null }));
    }
  };



  /* REJECT ISSUE */


  const rejectIssue = async (id) => {
    if (!rejectReason[id]) {
      setPopupMessage("⚠️ Please select a rejection reason");
      return;
    }
    setIssueLoading(prev => ({ ...prev, [id]: 'reject' }));
    try {
      await fetch("/api/auth/csrf/", { credentials: "same-origin" });
      const res = await fetch(`/api/issues/status/${activeCategory}/${id}/`, {
        method: "PUT",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json", ...csrfHeaders() },
        body: JSON.stringify({ status: "Rejected", reason: rejectReason[id] })
      });
      const data = await res.json();
      if (data.success) {
        setPopupMessage("✅ Issue Rejected");
      } else {
        setPopupMessage("❌ Failed to reject issue");
      }
      await fetchIssues(activeCategory);
      await fetchAllIssues();
    } finally {
      setIssueLoading(prev => ({ ...prev, [id]: null }));
    }
  };



  /* CHART DATA */

  const chartData = [
    { name: "Pending", value: stats.pending },
    { name: "Assigned", value: stats.assigned },
    { name: "Progress", value: stats.progress },
    { name: "Resolved", value: stats.resolved },
    { name: "Rejected", value: stats.rejected }
  ];

  const COLORS = ["#f59e0b", "#3b82f6", "#6366f1", "#22c55e", "#ef4444"];



  /* ISSUE CARD */

  const IssueCard = ({ issue }) => {
    const [imgLoaded, setImgLoaded] = useState(false);
    const statusClass = issue.status === "Assigned" ? "badge-assigned" : "badge-progress";

    return (
      <div className="ipc-card">

        {/* Photo header */}
        {getImageUrl(issue.photo) && (
          <div className="ipc-img-wrap">
            <div className={`ipc-cat-pill ${issue.category}`}>{label(issue.category)}</div>
            {!imgLoaded && <div className="ipc-img-skeleton" />}
            <img
              src={getImageUrl(issue.photo)}
              alt="issue"
              className="ipc-img"
              onLoad={() => setImgLoaded(true)}
              style={{ opacity: imgLoaded ? 1 : 0, transition: "opacity 0.4s ease" }}
            />
          </div>
        )}

        {/* No photo: category pill in body */}
        {!getImageUrl(issue.photo) && (
          <div className="ipc-body-pill">
            <span className={`ipc-cat-pill ${issue.category}`}>{label(issue.category)}</span>
          </div>
        )}

        {/* Info body */}
        <div className="ipc-body">
          <div className="ipc-row">
            <span className="ipc-icon">📍</span>
            <span><b>Street&nbsp;</b>{issue.street}</span>
          </div>

          {issue.houseNo && (
            <div className="ipc-row">
              <span className="ipc-icon">🏠</span>
              <span><b>House&nbsp;</b>{issue.houseNo}</span>
            </div>
          )}

          <p className="ipc-desc">{issue.description}</p>

          <div className="ipc-footer">
            <span className={`ipc-status ${statusClass}`}>{issue.status}</span>
            {issue.deadline && (
              <span className="ipc-deadline">📅 {issue.deadline}</span>
            )}
          </div>
        </div>

      </div>
    );
  };





  // Carousel for Assigned/In Progress issues
  // ≤4 issues → static flex wrap  |  >4 issues → CSS marquee (infinite scroll)
  const Carousel = ({ issues, title, loading, highlight }) => {
    const total = issues.length;
    const useCarousel = total > 4;
    // Duration scales with issue count so speed stays consistent
    const duration = Math.max(total * 3, 14);

    return (
      <div className="progress-section">
        <div className="section-header" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <h2 className={`section-title${highlight ? ' highlight' : ''}`}>{title}</h2>
          {useCarousel && <span className="carousel-badge">{total} issues</span>}
        </div>

        {loading ? (
          <div style={{ display: 'flex', gap: 20, overflow: 'hidden' }}>
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="skeleton-card" style={{ minWidth: 260, maxWidth: 260, height: 220 }} />
            ))}
          </div>
        ) : total === 0 ? (
          <p className="no-issues">No issues</p>
        ) : useCarousel ? (
          /* ── Marquee: render issues twice, animate translateX(0→-50%) ── */
          <div className="crs-wrap">
            <div
              className="crs-marquee"
              style={{ animationDuration: `${duration}s` }}
            >
              {[...issues, ...issues].map((issue, idx) => (
                <IssueCard key={`${issue.id}-${idx}`} issue={issue} />
              ))}
            </div>
          </div>
        ) : (
          /* ── Static: just flex-wrap ── */
          <div className="crs-static">
            {issues.map(issue => (
              <IssueCard key={issue.id} issue={issue} />
            ))}
          </div>
        )}
      </div>
    );
  };




  /* CATEGORY ISSUE LIST */


  const renderIssues = () => {
    const list = (issues[activeCategory] || []).filter(
      issue => issue.status === "Pending"
    );
    const needsScroll = list.length > 4;
    return (
      <div>
        <div className="section-header" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <h2 className="section-title highlight">{label(activeCategory)} Issues</h2>
          {list.length > 0 && <span className="issue-count-badge">{list.length} pending</span>}
        </div>
        {loadingData ? (
          <div className="issue-grid">
            {Array.from({ length: 2 }).map((_, i) => (
              <div key={i} className="skeleton-card" style={{ minWidth: 320, maxWidth: 420, height: 220 }}></div>
            ))}
          </div>
        ) : list.length === 0 ? (
          <p className="no-issues">No pending issues.</p>
        ) : (
          <div className={needsScroll ? "issue-list-scroll" : "issue-grid"}>
            {list.map(issue => (
              <div key={issue.id} className="issue-card super-modern animate-fadein">
                <div className="issue-left">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
                    <span className="category-tag" style={{ position: 'static', margin: 0 }}>{label(activeCategory)}</span>
                    <span className="issue-title" style={{ marginRight: 8 }}>{issue.villagerName}</span>
                    <span className="aadhaar-stamp">(Aadhaar: {issue.aadhar})</span>
                    {issue.input_method && issue.input_method !== 'manual' && (
                      <span style={{ fontSize: '0.75rem', background: '#eff6ff', color: '#1d4ed8', border: '1px solid #bfdbfe', borderRadius: 9999, padding: '2px 8px', fontWeight: 700 }}>
                        {issue.input_method === 'voice' ? '🎙️ Voice' : issue.input_method === 'photo' ? '📸 Photo' : '🎙️+📸 AI'}
                      </span>
                    )}
                    {issue.language && (
                      <span style={{ fontSize: '0.72rem', background: '#f8fafc', color: '#64748b', border: '1px solid #e2e8f0', borderRadius: 9999, padding: '2px 6px', fontWeight: 600 }}>
                        {issue.language.toUpperCase()}
                      </span>
                    )}
                  </div>
                  <div className="issue-meta" style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginBottom: 6 }}>
                    <span><b>Street:</b> {issue.street}</span>
                    {activeCategory !== "garbage" && <span><b>House No:</b> {issue.houseNo || 'N/A'}</span>}
                    {issue.latitude && issue.longitude && (
                      <span style={{ background: '#ecfdf5', color: '#047857', border: '1px solid #a7f3d0', borderRadius: 6, padding: '2px 8px', fontSize: '0.8rem', fontWeight: 600 }}>
                        📍 GPS: {parseFloat(issue.latitude).toFixed(4)}, {parseFloat(issue.longitude).toFixed(4)}
                        <a
                          href={`https://www.google.com/maps/dir/?api=1&destination=${issue.latitude},${issue.longitude}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{ marginLeft: 6, color: '#059669', textDecoration: 'underline' }}
                        >
                          Maps ↗
                        </a>
                      </span>
                    )}
                  </div>
                  <div className="desc" style={{ marginBottom: 8 }}>{issue.description}</div>
                  {issue.ai_analysis && (
                    <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 8, padding: '8px 12px', marginBottom: 8 }}>
                      <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#166534' }}>🤖 AI Analysis: </span>
                      {issue.ai_analysis.predicted_text_category && (
                        <span style={{ fontSize: '0.8rem', color: '#1e293b', marginRight: 10 }}>
                          Text: <b>{issue.ai_analysis.predicted_text_category}</b> ({Math.round((issue.ai_analysis.text_similarity_score || 0) * 100)}%)
                        </span>
                      )}
                      {issue.ai_analysis.predicted_image_category && (
                        <span style={{ fontSize: '0.8rem', color: '#1e293b' }}>
                          Photo: <b>{issue.ai_analysis.predicted_image_category}</b> ({Math.round((issue.ai_analysis.image_similarity_score || 0) * 100)}%)
                        </span>
                      )}
                    </div>
                  )}
                  <div className="issue-date-row" style={{ display: 'flex', gap: 16, alignItems: 'center', marginBottom: 8, flexWrap: 'wrap' }}>
                    <span className="date-pill">📅 {issue.date}</span>
                    <span className="date-pill">⏰ {issue.time}</span>
                    {issue.deadline && <span className="date-pill deadline">Deadline: {issue.deadline}</span>}
                  </div>
                  <div className="reason-row">
                    <input
                      type="date"
                      min={new Date().toISOString().split("T")[0]}
                      value={deadline[issue.id] || ""}
                      onChange={(e) => {
                        e.stopPropagation();
                        setDeadline({ ...deadline, [issue.id]: e.target.value });
                      }}
                      className="date-input"
                    />
                    <select
                      value={rejectReason[issue.id] || ""}
                      onChange={(e) => {
                        e.stopPropagation();
                        setRejectReason({ ...rejectReason, [issue.id]: e.target.value });
                      }}
                      className="reason-select"
                    >
                      <option value="">Select Reason</option>
                      <option>Duplicate issue</option>
                      <option>Wrong category</option>
                      <option>Fake complaint</option>
                      <option>Already fixed</option>
                    </select>
                  </div>
                  <div className="issue-actions">
                    <button
                      type="button"
                      style={{
                        background: '#2563eb',
                        color: '#fff',
                        padding: '8px 14px',
                        borderRadius: 8,
                        border: 'none',
                        cursor: 'pointer',
                        fontWeight: 700,
                        fontSize: '0.82rem',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 4,
                      }}
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedIssueForAssign(issue);
                      }}
                    >
                      👷 Assign Worker
                    </button>
                    <button
                      className={`approve-btn super-btn${issueLoading[issue.id] === 'accept' ? ' loading' : ''}`}
                      onClick={(e) => { e.stopPropagation(); acceptIssue(issue.id); }}
                      disabled={!!issueLoading[issue.id]}
                    >
                      {issueLoading[issue.id] === 'accept' ? 'Accepting...' : '✓ Accept'}
                    </button>
                    <button
                      className={`reject-btn super-btn${issueLoading[issue.id] === 'reject' ? ' loading' : ''}`}
                      onClick={(e) => { e.stopPropagation(); rejectIssue(issue.id); }}
                      disabled={!!issueLoading[issue.id]}
                    >
                      {issueLoading[issue.id] === 'reject' ? 'Rejecting...' : '✕ Reject'}
                    </button>
                  </div>
                </div>
                {getImageUrl(issue.photo) && (
                  <div className="issue-right">
                    <img src={getImageUrl(issue.photo)} alt="issue" className="issue-photo" />
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };


  useEffect(() => {
    if (popupMessage) {
      const timer = setTimeout(() => {
        setPopupMessage("");
      }, 2500);
      return () => clearTimeout(timer);
    }
  }, [popupMessage]);

  return (

    <div className="admin-container">
      {/* NAVBAR */}
      <div className="admin-navbar">
        <h2 className="main-heading">Admin Dashboard</h2>
        
        {/* Mobile Hamburger */}
        <button 
          className="admin-hamburger" 
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        >
          {isMobileMenuOpen ? "✕" : "☰"}
        </button>

        <div className={`admin-right ${isMobileMenuOpen ? 'menu-open' : ''}`}>
          <button
            type="button"
            className="premium-nav-btn"
            style={{
              background: adminActiveTab === "announcements" ? "#2563eb" : "#f8fafc",
              color: adminActiveTab === "announcements" ? "#ffffff" : "#1e293b",
              fontWeight: "700",
              border: "1px solid #cbd5e1",
            }}
            onClick={() => {
              setIsMobileMenuOpen(false);
              setAdminActiveTab("announcements");
            }}
          >
            <span className="n-icon">📢</span> Announcements
          </button>
          <button
            type="button"
            className="premium-nav-btn"
            style={{ background: "#059669", color: "#fff", border: "none", fontWeight: "700" }}
            onClick={() => {
              setIsMobileMenuOpen(false);
              setShowCreateWorkerModal(true);
            }}
          >
            <span className="n-icon">➕</span> Create Worker
          </button>
          <button className="premium-nav-btn nav-feedback" onClick={() => { setIsMobileMenuOpen(false); navigate("/admin/feedback"); }}>
            <span className="n-icon">📝</span> Manage Feedbacks
          </button>
          <button className="premium-nav-btn nav-requests" onClick={() => { setIsMobileMenuOpen(false); setShowRequestPopup(true); }}>
            <span className="n-icon">👤</span> Signup Requests
            {requests.length > 0 && <span className="notification-dot"></span>}
          </button>
          <button className="premium-nav-btn nav-logout" onClick={() => { setIsMobileMenuOpen(false); logout(); }}>
            <span className="n-icon">⏻</span> Logout
          </button>
        </div>
      </div>

      {/* LOGOUT CONFIRMATION POPUP */}
      {showLogoutConfirm && (
        <div className="popup-overlay">
          <div className="popup-box">
            <p>Are you sure you want to logout?</p>
            <button onClick={confirmLogout} disabled={logoutLoading} style={{ marginRight: 8 }}>
              {logoutLoading ? "Logging out..." : "Yes, Logout"}
            </button>
            <button
              className="cancel-btn"
              onClick={() => setShowLogoutConfirm(false)}
              disabled={logoutLoading}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* REQUEST POPUP */}
      {showRequestPopup && (
        <div className="popup-overlay">
          <div className="popup-box request-popup">

            {/* HEADER */}
            <div className="popup-header">
              <h2>Signup Requests</h2>
            </div>

            {/* SCROLL AREA */}
            <div className="popup-content">

              {requests.length === 0 ? (
                <div className="empty-state" style={{ gridColumn: '1 / -1' }}>
                  <span className="empty-icon">📂</span>
                  <p>No signup requests at the moment.</p>
                </div>
              ) : (
                requests.map(user => (
                  <div key={user.id} className="request-card premium-request-card">
                    <div className="req-card-header">
                      <div className="req-avatar">{user.username.charAt(0).toUpperCase()}</div>
                      <div className="req-info">
                        <h4>{user.username}</h4>

                        <span className="req-email">{user.email}</span>
                      </div>
                    </div>
                    <div className="req-body">
                      <div className="req-badge">
                        <span className="req-icon">🪪</span>
                      Aadhaar: <b>{user.aadhar || "Not provided"}</b>
                      </div>
                    </div>

                    <div className="request-actions">
                      <button
                        onClick={() => approveUser(user.id)}
                        disabled={requestLoading !== null}
                        className={`btn-approve ${requestLoading?.id === user.id && requestLoading?.type === "approve" ? "loading" : ""}`}
                      >
                        {requestLoading?.id === user.id && requestLoading?.type === "approve"
                          ? "Approving..."
                          : "✓ Approve"}
                      </button>

                      <button
                        onClick={() => rejectUser(user.id)}
                        disabled={requestLoading !== null}
                        className={`btn-reject ${requestLoading?.id === user.id && requestLoading?.type === "reject" ? "loading" : ""}`}
                      >
                        {requestLoading?.id === user.id && requestLoading?.type === "reject"
                          ? "Rejecting..."
                          : "✕ Reject"}
                      </button>
                    </div>
                  </div>
                ))
              )}

            </div>

            {/* FOOTER */}
            <div className="popup-footer">
              <button onClick={() => setShowRequestPopup(false)}>Close</button>
            </div>

          </div>
        </div>
      )}

      {/* ── ADMIN NAVIGATION TABS ── */}
      <div style={{ margin: "1rem auto", maxWidth: "1280px", padding: "0 1rem" }}>
        <div style={{ display: "flex", gap: "0.5rem", background: "#ffffff", padding: "0.5rem", borderRadius: "12px", border: "1px solid #e2e8f0", boxShadow: "0 1px 3px rgba(0,0,0,0.05)", flexWrap: "wrap" }}>
          <button
            type="button"
            onClick={() => setAdminActiveTab("overview")}
            style={{
              flex: "1 1 200px",
              padding: "0.75rem 1rem",
              borderRadius: "8px",
              border: "none",
              background: adminActiveTab === "overview" ? "#2563eb" : "transparent",
              color: adminActiveTab === "overview" ? "#ffffff" : "#475569",
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
            <span>📊</span> Overview & Categories
          </button>

          <button
            type="button"
            onClick={() => {
              setAdminActiveTab("map");
              loadGpsAndAssignmentData();
            }}
            style={{
              flex: "1 1 200px",
              padding: "0.75rem 1rem",
              borderRadius: "8px",
              border: "none",
              background: adminActiveTab === "map" ? "#2563eb" : "transparent",
              color: adminActiveTab === "map" ? "#ffffff" : "#475569",
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
            <span>🗺️</span> Village GPS Map ({allIssuesList.filter(i => i.location_captured).length})
          </button>

          <button
            type="button"
            onClick={() => {
              setAdminActiveTab("assignments");
              if (pendingVerificationIssues.length > 0) setMonitoringFilter("completed");
              loadGpsAndAssignmentData();
            }}
            style={{
              flex: "1 1 200px",
              padding: "0.75rem 1rem",
              borderRadius: "8px",
              border: "none",
              background: adminActiveTab === "assignments" ? "#2563eb" : "transparent",
              color: adminActiveTab === "assignments" ? "#ffffff" : "#475569",
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
            <span>📋</span> Work Monitoring
            {pendingVerificationIssues.length > 0 && (
              <span style={{ background: "#dc2626", color: "#ffffff", padding: "2px 7px", borderRadius: "9999px", fontSize: "0.72rem", fontWeight: "800" }}>
                🔔 {pendingVerificationIssues.length} to Verify!
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => {
              setAdminActiveTab("workers");
              loadGpsAndAssignmentData();
            }}
            style={{
              flex: "1 1 200px",
              padding: "0.75rem 1rem",
              borderRadius: "8px",
              border: "none",
              background: adminActiveTab === "workers" ? "#2563eb" : "transparent",
              color: adminActiveTab === "workers" ? "#ffffff" : "#475569",
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
            <span>👷</span> Workers & Credentials ({adminWorkersDetailed.length})
          </button>

          <button
            type="button"
            onClick={() => setAdminActiveTab("announcements")}
            style={{
              flex: "1 1 200px",
              padding: "0.75rem 1rem",
              borderRadius: "8px",
              border: "none",
              background: adminActiveTab === "announcements" ? "#2563eb" : "transparent",
              color: adminActiveTab === "announcements" ? "#ffffff" : "#475569",
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
            <span>📢</span> Village Announcements (ప్రకటనలు)
          </button>
        </div>
      </div>

      {/* ── TAB 1: OVERVIEW & CATEGORY ISSUES ── */}
      {adminActiveTab === "overview" && (
        <>
          {/* Action Required Banner for Completed Works */}
          {pendingVerificationIssues.length > 0 && (
            <div
              style={{
                maxWidth: "1280px",
                margin: "0 auto 1.5rem",
                padding: "0 1rem",
              }}
            >
              <div
                style={{
                  background: "linear-gradient(135deg, #f5f3ff 0%, #ede9fe 100%)",
                  border: "2px solid #8b5cf6",
                  borderRadius: "14px",
                  padding: "1.2rem 1.5rem",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  flexWrap: "wrap",
                  gap: "1rem",
                  boxShadow: "0 4px 15px rgba(139, 92, 246, 0.15)",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "0.85rem" }}>
                  <div style={{ width: 44, height: 44, borderRadius: "50%", background: "#7c3aed", color: "#ffffff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.3rem" }}>
                    🔔
                  </div>
                  <div>
                    <h4 style={{ margin: 0, fontSize: "1.05rem", color: "#4c1d95", fontWeight: "800" }}>
                      Action Required: {pendingVerificationIssues.length} Completed Work{pendingVerificationIssues.length > 1 ? "s" : ""} Awaiting Admin Verification!
                    </h4>
                    <p style={{ margin: "0.2rem 0 0", fontSize: "0.85rem", color: "#6d28d9" }}>
                      Field workers have submitted completion proofs and photos (e.g. Issue #{pendingVerificationIssues.map(i => i.id).join(", #")}).
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setAdminActiveTab("assignments");
                    setMonitoringFilter("completed");
                    loadGpsAndAssignmentData();
                  }}
                  style={{
                    padding: "0.65rem 1.3rem",
                    background: "#7c3aed",
                    color: "#ffffff",
                    border: "none",
                    borderRadius: "8px",
                    fontWeight: "700",
                    fontSize: "0.9rem",
                    cursor: "pointer",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "0.4rem",
                    boxShadow: "0 2px 6px rgba(124, 58, 237, 0.3)",
                  }}
                >
                  <span>📸</span> Inspect Proofs & Verify
                </button>
              </div>
            </div>
          )}

          {/* DASHBOARD STATISTICS */}
          <div className="stats-section">
        <h2 className="main-heading">Dashboard Statistics</h2>
        <div className="stats-cards">
          {loadingData ? (
            Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="stat-card"><SkeletonBox height={38} /></div>
            ))
          ) : (
            <>
              <div className="stat-card">Total<br />{stats.total}</div>
              <div className="stat-card pending">Pending<br />{stats.pending}</div>
              <div className="stat-card assigned">Assigned<br />{stats.assigned}</div>
              <div className="stat-card progress">Progress<br />{stats.progress}</div>
              <div className="stat-card resolved">Resolved<br />{stats.resolved}</div>
              <div className="stat-card rejected">Rejected<br />{stats.rejected}</div>
            </>
          )}
        </div>
        <div className="charts">
          <div className="chart-box">
            <h3 className="sub-heading">Status Distribution</h3>
            {loadingData ? (
              <SkeletonBox height={250} />
            ) : (
              <div className="responsive-chart-container">
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie data={chartData} dataKey="value" outerRadius={80}>
                      {chartData.map((entry, index) => (
                        <Cell key={index} fill={COLORS[index]} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
          <div className="chart-box">
            <h3 className="sub-heading">Status Comparison</h3>
            {loadingData ? (
              <SkeletonBox height={250} />
            ) : (
              <div className="responsive-chart-container">
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={chartData}>
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="value" fill="#2563eb" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        </div>
      </div>
      {/* ...existing code... */}



      {/* OVERDUE ISSUES */}
      <div className="overdue-section animated-overdue">
        <div className="section-header" style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
          <h2 className="section-title" style={{ color: '#dc2626' }}>⚠ Overdue Tasks</h2>
        </div>
        {loadingData ? (
          <>
            <div className="skeleton-row" style={{ height: 32, marginBottom: 8 }}></div>
            <div className="skeleton-row" style={{ height: 32, marginBottom: 8 }}></div>
          </>
        ) : overdueIssues.length === 0 ? (
          <p className="no-issues">No overdue issues.</p>
        ) : (
          <div className="overdue-grid overdue-scroll">
            {overdueIssues.map(i => (
              <div key={i.id} className="overdue-card animated-overdue-card">
                <p><b>Street:</b> {i.street}</p>
                <p><b>Deadline:</b> <span style={{ color: '#dc2626' }}>{i.deadline}</span></p>
                <p style={{ fontWeight: 600, color: '#64748b' }}>{label(i.category)}</p>
              </div>
            ))}
          </div>
        )}
      </div>



      {/* ASSIGNED WRAPPER */}
      <div className="issue-group assigned-group">
        <Carousel
          title="Assigned Issues"
          issues={assignedIssues}
          loading={loadingData}
          highlight
        />
      </div>

      {/* IN PROGRESS WRAPPER */}
      <div className="issue-group progress-group">
        <Carousel
          title="In Progress Issues"
          issues={progressIssues}
          loading={loadingData}
          highlight
        />
      </div>

      {/* CATEGORY CARDS */}
      <div className="raise-wrapper">

        <div className="category-section">

          <div className="section-header" style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <h2 className="section-title highlight">Reported Issues</h2>
          </div>

          <div className="category-cards">
            {['electricity', 'water', 'garbage', 'drainage'].map(cat => (
              <div
                key={cat}
                className={`category-card${activeCategory === cat ? ' active' : ''}`}
                onClick={() => { setActiveCategory(cat); fetchIssues(cat) }}
                style={{ position: 'relative' }}
              >
                {label(cat)}
                {pendingCounts[cat] > 0 && <span className="notification-dot"></span>}
              </div>
            ))}
          </div>

        </div> {/* category-section */}

      </div> {/* raise-wrapper */}


      {/* CATEGORY ISSUES */}

      <div className="issue-section">
        {activeCategory && renderIssues()}
      </div>
        </>
      )}

      {/* ── TAB 2: VILLAGE GPS COMPLAINT MAP ── */}
      {adminActiveTab === "map" && (
        <div style={{ maxWidth: "1280px", margin: "1rem auto", padding: "0 1rem" }}>
          <AdminGPSMap
            issues={allIssuesList}
            onSelectIssue={(issue) => setSelectedIssueForAssign(issue)}
          />
        </div>
      )}

      {/* ── TAB 3: WORK MONITORING & VERIFICATION ── */}
      {adminActiveTab === "assignments" && (
        <div style={{ maxWidth: "1280px", margin: "1rem auto", padding: "0 1rem" }}>
          {/* Monitoring Stats */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: "1rem", marginBottom: "1.5rem" }}>
            <div style={{ background: "#ffffff", padding: "1rem", borderRadius: "10px", border: "1px solid #e2e8f0", textAlign: "center" }}>
              <span style={{ fontSize: "1.6rem", fontWeight: "800", color: "#1e293b", display: "block" }}>
                {monitoringStats?.total_issues || allIssuesList.length}
              </span>
              <span style={{ fontSize: "0.82rem", color: "#64748b", fontWeight: "600" }}>Total Issues</span>
            </div>

            <div style={{ background: "#ffffff", padding: "1rem", borderRadius: "10px", border: "1px solid #e2e8f0", textAlign: "center" }}>
              <span style={{ fontSize: "1.6rem", fontWeight: "800", color: "#dc2626", display: "block" }}>
                {monitoringStats?.pending_issues || allIssuesList.filter(i => i.status === "Pending").length}
              </span>
              <span style={{ fontSize: "0.82rem", color: "#dc2626", fontWeight: "600" }}>Pending</span>
            </div>

            <div style={{ background: "#ffffff", padding: "1rem", borderRadius: "10px", border: "1px solid #e2e8f0", textAlign: "center" }}>
              <span style={{ fontSize: "1.6rem", fontWeight: "800", color: "#d97706", display: "block" }}>
                {allIssuesList.filter(i => i.status === "Assigned").length}
              </span>
              <span style={{ fontSize: "0.82rem", color: "#d97706", fontWeight: "600" }}>Assigned</span>
            </div>

            <div style={{ background: "#ffffff", padding: "1rem", borderRadius: "10px", border: "1px solid #e2e8f0", textAlign: "center" }}>
              <span style={{ fontSize: "1.6rem", fontWeight: "800", color: "#0284c7", display: "block" }}>
                {allIssuesList.filter(i => i.status === "In Progress").length}
              </span>
              <span style={{ fontSize: "0.82rem", color: "#0284c7", fontWeight: "600" }}>In Progress</span>
            </div>

            <div style={{ background: "#ffffff", padding: "1rem", borderRadius: "10px", border: "1px solid #e2e8f0", textAlign: "center" }}>
              <span style={{ fontSize: "1.6rem", fontWeight: "800", color: "#7c3aed", display: "block" }}>
                {allIssuesList.filter(i => i.assignment?.work_status === "Completed").length}
              </span>
              <span style={{ fontSize: "0.82rem", color: "#7c3aed", fontWeight: "600" }}>Awaiting Verification</span>
            </div>

            <div style={{ background: "#ffffff", padding: "1rem", borderRadius: "10px", border: "1px solid #e2e8f0", textAlign: "center" }}>
              <span style={{ fontSize: "1.6rem", fontWeight: "800", color: "#16a34a", display: "block" }}>
                {monitoringStats?.resolved_issues || allIssuesList.filter(i => i.status === "Resolved").length}
              </span>
              <span style={{ fontSize: "0.82rem", color: "#16a34a", fontWeight: "600" }}>Resolved</span>
            </div>
          </div>

          {/* Assignments List */}
          <div style={{ background: "#ffffff", borderRadius: "12px", padding: "1.25rem", border: "1px solid #e2e8f0", boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem", flexWrap: "wrap", gap: "0.5rem" }}>
              <div>
                <h3 style={{ margin: 0, fontSize: "1.15rem", color: "#1e293b", fontWeight: "700" }}>
                  📋 Field Work Lifecycle & Verification
                </h3>
                <p style={{ margin: "0.2rem 0 0", fontSize: "0.85rem", color: "#64748b" }}>
                  Track worker progress in real-time, inspect completion proofs, and verify work to resolve issues
                </p>
              </div>
              <button
                type="button"
                onClick={loadGpsAndAssignmentData}
                style={{ padding: "0.4rem 0.8rem", background: "#f1f5f9", border: "1px solid #cbd5e1", borderRadius: "6px", cursor: "pointer", fontSize: "0.85rem", fontWeight: "600", color: "#475569" }}
              >
                🔄 Refresh
              </button>
            </div>

            {allIssuesList.filter(i => i.assignment).length === 0 ? (
              <div style={{ textAlign: "center", padding: "2.5rem", color: "#64748b", background: "#f8fafc", borderRadius: "8px" }}>
                <span style={{ fontSize: "2rem", display: "block", marginBottom: "0.5rem" }}>📋</span>
                <p style={{ margin: 0, fontWeight: "600" }}>No work assignments created yet.</p>
                <p style={{ margin: "0.2rem 0 0", fontSize: "0.85rem" }}>Go to Reported Issues or the GPS Map to assign field workers to pending complaints.</p>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                {allIssuesList
                  .filter(i => i.assignment)
                  .map((issue) => {
                    const asgn = issue.assignment;
                    const isCompleted = asgn.work_status === "Completed";
                    const isVerified = asgn.work_status === "Verified";

                    return (
                      <div
                        key={issue.id}
                        style={{
                          background: isCompleted ? "#f5f3ff" : "#ffffff",
                          border: isCompleted ? "1.5px solid #c4b5fd" : "1px solid #e2e8f0",
                          borderRadius: "10px",
                          padding: "1rem",
                          display: "flex",
                          flexDirection: "column",
                          gap: "0.75rem",
                        }}
                      >
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "0.5rem" }}>
                          <div>
                            <span style={{ fontWeight: "700", color: "#1e293b", fontSize: "1rem", marginRight: "0.5rem" }}>
                              Issue #{issue.id} — {issue.category?.toUpperCase()}
                            </span>
                            <span style={{ fontSize: "0.85rem", color: "#64748b" }}>
                              Reported by {issue.villagerName} ({issue.street}{issue.house_no ? `, #${issue.house_no}` : ""})
                            </span>
                          </div>

                          <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
                            <span style={{ fontSize: "0.8rem", padding: "0.2rem 0.6rem", borderRadius: "9999px", fontWeight: "700", background: "#e0f2fe", color: "#0369a1" }}>
                              👷 {asgn.worker_name || "Unassigned"}
                            </span>

                            <span
                              style={{
                                fontSize: "0.8rem",
                                padding: "0.2rem 0.6rem",
                                borderRadius: "9999px",
                                fontWeight: "700",
                                background: isVerified ? "#dcfce7" : isCompleted ? "#ede9fe" : "#fef3c7",
                                color: isVerified ? "#166534" : isCompleted ? "#6d28d9" : "#92400e",
                              }}
                            >
                              {asgn.work_status}
                            </span>
                          </div>
                        </div>

                        <div style={{ fontSize: "0.85rem", color: "#334155" }}>
                          <strong>Complaint:</strong> {issue.description}
                        </div>

                        {/* GPS Navigation info if present */}
                        {issue.latitude && issue.longitude && (
                          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.82rem", background: "#ecfdf5", padding: "0.4rem 0.7rem", borderRadius: "6px", color: "#065f46" }}>
                            <span>📍 GPS: {parseFloat(issue.latitude).toFixed(5)}, {parseFloat(issue.longitude).toFixed(5)}</span>
                            <a
                              href={`https://www.google.com/maps/dir/?api=1&destination=${issue.latitude},${issue.longitude}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              style={{ color: "#047857", fontWeight: "700", textDecoration: "underline" }}
                            >
                              Open in Google Maps ↗
                            </a>
                          </div>
                        )}

                        {/* Before & After Photos */}
                        <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap", alignItems: "center" }}>
                          {issue.photo && (
                            <div>
                              <span style={{ fontSize: "0.75rem", color: "#64748b", fontWeight: "600", display: "block" }}>Villager Photo:</span>
                              <img
                                src={getImageUrl(issue.photo)}
                                alt="before"
                                style={{ width: "90px", height: "70px", objectFit: "cover", borderRadius: "6px", marginTop: "2px" }}
                                onError={e => e.target.style.display="none"}
                              />
                            </div>
                          )}

                          {asgn.completion_photo && (
                            <div>
                              <span style={{ fontSize: "0.75rem", color: "#059669", fontWeight: "700", display: "block" }}>Worker Completion Proof:</span>
                              <img
                                src={getImageUrl(asgn.completion_photo)}
                                alt="after"
                                style={{ width: "90px", height: "70px", objectFit: "cover", borderRadius: "6px", marginTop: "2px", border: "2px solid #10b981" }}
                                onError={e => e.target.style.display="none"}
                              />
                            </div>
                          )}

                          {asgn.completion_notes && (
                            <div style={{ flex: 1, minWidth: "200px", fontSize: "0.82rem", background: "#f8fafc", padding: "0.5rem 0.75rem", borderRadius: "6px" }}>
                              <strong>Worker Completion Notes:</strong> {asgn.completion_notes}
                            </div>
                          )}
                        </div>

                        {/* Actions */}
                        <div style={{ display: "flex", gap: "0.5rem", justifyContent: "flex-end", borderTop: "1px solid #f1f5f9", paddingTop: "0.5rem" }}>
                          <button
                            type="button"
                            onClick={() => setSelectedIssueForAssign(issue)}
                            style={{ padding: "0.4rem 0.8rem", background: "#f1f5f9", border: "1px solid #cbd5e1", borderRadius: "6px", cursor: "pointer", fontSize: "0.8rem", fontWeight: "600" }}
                          >
                            Reassign Worker
                          </button>

                          {isCompleted && (
                            <button
                              type="button"
                              disabled={verifyingId === asgn.id}
                              onClick={() => handleVerifyWork(asgn.id)}
                              style={{
                                padding: "0.45rem 1rem",
                                background: "#16a34a",
                                color: "#ffffff",
                                border: "none",
                                borderRadius: "6px",
                                cursor: verifyingId === asgn.id ? "not-allowed" : "pointer",
                                fontWeight: "700",
                                fontSize: "0.85rem",
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "0.3rem",
                              }}
                            >
                              <span>✓</span> {verifyingId === asgn.id ? "Verifying..." : "Verify & Mark Resolved"}
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── TAB 4: WORKER MANAGEMENT & CREDENTIALS ── */}
      {adminActiveTab === "workers" && (
        <div style={{ maxWidth: "1280px", margin: "1rem auto", padding: "0 1rem" }}>
          {/* Header Bar */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem", flexWrap: "wrap", gap: "1rem", background: "#ffffff", padding: "1.25rem", borderRadius: "12px", border: "1px solid #e2e8f0", boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
            <div>
              <h3 style={{ margin: 0, fontSize: "1.25rem", color: "#1e293b", fontWeight: "700", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <span>👷</span> Field Workers & Login Credentials
              </h3>
              <p style={{ margin: "0.2rem 0 0", fontSize: "0.85rem", color: "#64748b" }}>
                Create login accounts for field personnel, distribute credentials, and monitor active assignments
              </p>
            </div>

            <button
              type="button"
              onClick={() => setShowCreateWorkerModal(true)}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "0.5rem",
                padding: "0.65rem 1.25rem",
                background: "#059669",
                color: "#ffffff",
                border: "none",
                borderRadius: "8px",
                cursor: "pointer",
                fontWeight: "700",
                fontSize: "0.95rem",
                boxShadow: "0 2px 4px rgba(5, 150, 105, 0.25)",
              }}
            >
              <span>➕</span> Create New Worker Account
            </button>
          </div>

          {/* Workers Grid */}
          {adminWorkersDetailed.length === 0 ? (
            <div style={{ textAlign: "center", padding: "3rem", background: "#ffffff", borderRadius: "12px", border: "1px solid #e2e8f0", color: "#64748b" }}>
              <span style={{ fontSize: "2.5rem", display: "block", marginBottom: "0.5rem" }}>👷</span>
              <p style={{ margin: 0, fontWeight: "700", fontSize: "1.1rem", color: "#1e293b" }}>No Worker Accounts Created Yet</p>
              <p style={{ margin: "0.3rem 0 1rem", fontSize: "0.9rem" }}>
                Click the button below to create a worker account and generate their login credentials.
              </p>
              <button
                type="button"
                onClick={() => setShowCreateWorkerModal(true)}
                style={{ padding: "0.6rem 1.2rem", background: "#2563eb", color: "#fff", border: "none", borderRadius: "8px", cursor: "pointer", fontWeight: "700" }}
              >
                + Create First Worker
              </button>
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))", gap: "1rem" }}>
              {adminWorkersDetailed.map((worker) => (
                <div
                  key={worker.id}
                  style={{
                    background: "#ffffff",
                    borderRadius: "12px",
                    padding: "1.25rem",
                    border: "1px solid #e2e8f0",
                    boxShadow: "0 2px 4px rgba(0,0,0,0.04)",
                    display: "flex",
                    flexDirection: "column",
                    gap: "0.75rem",
                  }}
                >
                  {/* Worker Card Header */}
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.65rem" }}>
                      <div
                        style={{
                          width: "42px",
                          height: "42px",
                          borderRadius: "50%",
                          background: "#e0e7ff",
                          color: "#3730a3",
                          fontWeight: "800",
                          fontSize: "1.1rem",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        {worker.username.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <h4 style={{ margin: 0, fontSize: "1rem", color: "#1e293b" }}>
                          {worker.first_name ? `${worker.first_name} ${worker.last_name || ""}` : worker.username}
                        </h4>
                        <span style={{ fontSize: "0.8rem", color: "#64748b" }}>
                          Joined: {worker.date_joined || "N/A"}
                        </span>
                      </div>
                    </div>

                    <span style={{ padding: "0.2rem 0.6rem", borderRadius: "9999px", fontSize: "0.75rem", fontWeight: "700", background: "#dcfce7", color: "#166534" }}>
                      Active
                    </span>
                  </div>

                  {/* Details List */}
                  <div style={{ background: "#f8fafc", borderRadius: "8px", padding: "0.75rem", fontSize: "0.85rem", lineHeight: "1.7", color: "#334155" }}>
                    <div>
                      <strong>Username:</strong> <code style={{ background: "#e2e8f0", padding: "2px 6px", borderRadius: "4px", color: "#0f766e", fontWeight: "700" }}>{worker.username}</code>
                    </div>
                    <div>
                      <strong>Email:</strong> {worker.email}
                    </div>
                    {worker.aadhar && (
                      <div>
                        <strong>Aadhaar:</strong> {worker.aadhar}
                      </div>
                    )}
                  </div>

                  {/* Workload Status */}
                  <div style={{ display: "flex", gap: "0.5rem" }}>
                    <span style={{ flex: 1, textAlign: "center", padding: "0.4rem", borderRadius: "6px", background: worker.active_tasks > 0 ? "#fef3c7" : "#f1f5f9", color: worker.active_tasks > 0 ? "#92400e" : "#475569", fontWeight: "700", fontSize: "0.8rem" }}>
                      ⏳ {worker.active_tasks || 0} Active Works
                    </span>
                    <span style={{ flex: 1, textAlign: "center", padding: "0.4rem", borderRadius: "6px", background: "#dcfce7", color: "#166534", fontWeight: "700", fontSize: "0.8rem" }}>
                      ✓ {worker.completed_tasks || 0} Completed
                    </span>
                  </div>

                  {/* Actions */}
                  <div style={{ display: "flex", gap: "0.5rem", borderTop: "1px solid #f1f5f9", paddingTop: "0.6rem" }}>
                    <button
                      type="button"
                      onClick={() => {
                        const info = `Worker Login Details:\nUsername: ${worker.username}\nRole: Worker\nLogin: ${window.location.origin}/login`;
                        navigator.clipboard.writeText(info);
                        setPopupMessage(`📋 Copied login info for ${worker.username}!`);
                        setTimeout(() => setPopupMessage(""), 2500);
                      }}
                      style={{
                        flex: 1,
                        padding: "0.45rem",
                        background: "#f1f5f9",
                        color: "#334155",
                        border: "1px solid #cbd5e1",
                        borderRadius: "6px",
                        cursor: "pointer",
                        fontWeight: "600",
                        fontSize: "0.82rem",
                      }}
                    >
                      📋 Copy Details
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setResetWorkerModal(worker);
                        setResetNewPass("Worker@" + Math.floor(1000 + Math.random() * 9000));
                      }}
                      style={{
                        flex: 1,
                        padding: "0.45rem",
                        background: "#2563eb",
                        color: "#ffffff",
                        border: "none",
                        borderRadius: "6px",
                        cursor: "pointer",
                        fontWeight: "600",
                        fontSize: "0.82rem",
                      }}
                    >
                      🔑 Reset Password
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── TAB 5: VILLAGE ANNOUNCEMENTS & VOICE BROADCASTING ── */}
      {adminActiveTab === "announcements" && (
        <div style={{ maxWidth: "1280px", margin: "0 auto", padding: "0 1rem" }}>
          <AdminAnnouncementManager showToast={showToast} />
        </div>
      )}

      {/* ── RESET PASSWORD POPUP ── */}
      {resetWorkerModal && (
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
            if (e.target === e.currentTarget) setResetWorkerModal(null);
          }}
        >
          <div style={{ background: "#ffffff", borderRadius: "12px", padding: "1.5rem", maxWidth: "440px", width: "100%", boxShadow: "0 20px 25px -5px rgba(0,0,0,0.2)" }}>
            <h3 style={{ margin: "0 0 0.5rem", fontSize: "1.15rem", color: "#1e293b" }}>
              🔑 Reset Password for {resetWorkerModal.username}
            </h3>
            <p style={{ margin: "0 0 1rem", fontSize: "0.85rem", color: "#64748b" }}>
              Set a new password and give the updated credentials to the worker.
            </p>

            <form onSubmit={handleResetPassword}>
              <div style={{ marginBottom: "1rem" }}>
                <label style={{ display: "block", fontWeight: "600", marginBottom: "0.3rem", fontSize: "0.85rem" }}>
                  New Password *
                </label>
                <input
                  type="text"
                  required
                  value={resetNewPass}
                  onChange={(e) => setResetNewPass(e.target.value)}
                  style={{ width: "100%", padding: "0.5rem", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "0.9rem", boxSizing: "border-box" }}
                />
              </div>

              <div style={{ display: "flex", gap: "0.5rem", justifyContent: "flex-end" }}>
                <button
                  type="button"
                  onClick={() => setResetWorkerModal(null)}
                  style={{ padding: "0.5rem 1rem", background: "#f1f5f9", border: "none", borderRadius: "6px", cursor: "pointer" }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={resettingLoading}
                  style={{
                    padding: "0.5rem 1.2rem",
                    background: "#2563eb",
                    color: "#ffffff",
                    border: "none",
                    borderRadius: "6px",
                    cursor: resettingLoading ? "not-allowed" : "pointer",
                    fontWeight: "700",
                  }}
                >
                  {resettingLoading ? "Updating..." : "Save & Update Password"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── CREATE WORKER MODAL ── */}
      {showCreateWorkerModal && (
        <CreateWorkerModal
          onWorkerCreated={loadGpsAndAssignmentData}
          onClose={() => setShowCreateWorkerModal(false)}
        />
      )}

      {/* ── ASSIGN WORKER MODAL ── */}
      {selectedIssueForAssign && (
        <AssignWorkerModal
          issue={selectedIssueForAssign}
          workers={workersList}
          onAssign={handleAssignWorker}
          onClose={() => setSelectedIssueForAssign(null)}
        />
      )}

      {/* EMAIL POPUP */}

      {popupMessage && (
        <div className="side-toast">
          {popupMessage}
        </div>
      )}


    </div>

  );

}