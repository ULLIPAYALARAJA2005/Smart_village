import { useState, useEffect } from "react";
import "../styles/worker.css";
import { useNavigate } from "react-router-dom";
import { SkeletonBox } from "../components/Skeleton";
import WorkerAssignmentCard from "../components/WorkerAssignmentCard";
import { fetchMyAssignmentsAPI } from "../services/aiApi";
import MainLayout from "../components/MainLayout";
import { StatCard, StatusBadge, PageHeader } from "../components/UIComponents";
import {
  PieChart, Pie, Cell, ResponsiveContainer,
  Tooltip, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid
} from "recharts";

const STATUS = ["Assigned", "In Progress", "Resolved"];
const CHART_COLORS = ["#3b82f6", "#8b5cf6", "#10b981"];

const getCookie = (name) => document.cookie
  .split("; ")
  .find(cookie => cookie.startsWith(`${name}=`))
  ?.split("=").slice(1).join("=");

function TaskImageWithSkeleton({ photoId }) {
  const [imgLoaded, setImgLoaded] = useState(false);
  return (
    <div className="task-right">
      {!imgLoaded && <div className="task-img-skeleton" />}
      <img
        src={photoId.startsWith("http") || photoId.startsWith("/") ? photoId : `/media/${photoId}`}
        alt="issue"
        style={{ display: imgLoaded ? "block" : "none" }}
        onLoad={() => setImgLoaded(true)}
      />
    </div>
  );
}

export default function WorkerDashboard() {
  const navigate = useNavigate();

  /* ── STATES ── */
  const [confirmBox, setConfirmBox] = useState({ show: false, message: "", action: null });
  const [actionLoading, setActionLoading] = useState(false);
  const [logoutLoading, setLogoutLoading] = useState(false);
  const [popup, setPopup] = useState({ show: false, message: "", type: "success" });
  const [activeCategory, setActiveCategory] = useState("");
  const [loading, setLoading] = useState(true);
  const [tasks, setTasks] = useState({ electricity: [], water: [], garbage: [], drainage: [] });
  const [myAssignments, setMyAssignments] = useState([]);
  const [loadingAssignments, setLoadingAssignments] = useState(false);
  const [assignmentFilter, setAssignmentFilter] = useState("active"); // "all" | "active" | "completed"

  const loadAssignments = async () => {
    try {
      setLoadingAssignments(true);
      const data = await fetchMyAssignmentsAPI();
      setMyAssignments(Array.isArray(data) ? data : []);
    } catch (err) {
      console.warn("Failed to load worker assignments:", err);
    } finally {
      setLoadingAssignments(false);
    }
  };

  /* ── HELPERS ── */
  const openConfirm = (message, action) => setConfirmBox({ show: true, message, action });
  const closeConfirm = () => setConfirmBox({ show: false, message: "", action: null });

  const showPopup = (msg, type = "success") => {
    setPopup({ show: true, message: msg, type });
    setTimeout(() => setPopup({ show: false, message: "", type: "success" }), 2800);
  };

  /* ── LOGOUT ── */
  const logout = () => {
    openConfirm("Are you sure you want to logout?", async () => {
      setLogoutLoading(true);
      setTimeout(() => { localStorage.clear(); navigate("/"); }, 1500);
    });
  };

  /* ── FETCH ── */
  useEffect(() => {
    fetch("/api/auth/csrf/", { credentials: "same-origin" });
    setLoading(true);
    loadAssignments();
    Promise.all([
      fetch("/api/issues/electricity/").then(r => r.json()),
      fetch("/api/issues/water/").then(r => r.json()),
      fetch("/api/issues/garbage/").then(r => r.json()),
      fetch("/api/issues/drainage/").then(r => r.json()),
    ]).then(([electricity, water, garbage, drainage]) => {
      setTasks({ electricity, water, garbage, drainage });
    }).finally(() => setLoading(false));
  }, []);

  /* ── UPDATE STATUS ── */
  const updateStatus = async (id, status) => {
    try {
      if (!getCookie("csrftoken")) {
        await fetch("/api/auth/csrf/", { credentials: "same-origin" });
      }
      const csrfToken = getCookie("csrftoken");
      const res = await fetch(`/api/issues/status/${activeCategory}/${id}/`, {
        method: "PUT",
        credentials: "same-origin",
        headers: {
          "Content-Type": "application/json",
          ...(csrfToken ? { "X-CSRFToken": decodeURIComponent(csrfToken) } : {}),
        },
        body: JSON.stringify({ status }),
      });
      const data = await res.json();
      // ✅ Update UI immediately
      setTasks(prev => ({
        ...prev,
        [activeCategory]: prev[activeCategory].map(t => t.id === id ? { ...t, status } : t),
      }));
      return data;
    } catch {
      return { success: false };
    }
  };

  /* ── COMPLETE TASK ── */
  const resolveIssue = (id) => {
    openConfirm("Mark this task as completed?", async () => {
      setActionLoading(true);
      const data = await updateStatus(id, "Resolved");
      setActionLoading(false);
      // ✅ Instant feedback — not based on email
      if (data.success) {
        showPopup("✅ Task Completed!", "success");
      } else {
        showPopup("❌ Failed to complete task", "error");
      }
    });
  };

  /* ── DEADLINE STATUS ── */
  const getDeadlineInfo = (deadline) => {
    if (!deadline) return null;
    const diff = Math.ceil((new Date(deadline) - new Date()) / (1000 * 60 * 60 * 24));
    if (diff > 0) return `${diff} day${diff > 1 ? "s" : ""} left`;
    if (diff === 0) return "Due today";
    return "❌ Deadline Over";
  };

  /* ── TASK LIST ── */
  const renderTasks = () => {
    const list = (tasks[activeCategory] || []).filter(
      t => t.status === "Assigned" || t.status === "In Progress"
    );
    return (
      <div className="wd-task-list-container">
        <div className="wd-section-header" style={{display:'flex',alignItems:'center',gap:'10px',marginBottom:'18px'}}>
          <h2 className="wd-section-heading" style={{margin:0}}>📋 {activeCategory.charAt(0).toUpperCase() + activeCategory.slice(1)} Tasks</h2>
          {list.length > 0 && <span className="wd-cat-badge" style={{position:'static',animation:'none',transform:'none'}}>{list.length}</span>}
        </div>
        
        {list.length === 0 ? (
          <p className="no-tasks">No assigned tasks for this category.</p>
        ) : (
          <div className={`task-grid ${list.length > 4 ? "task-list-scroll" : ""}`}>
            {list.map(task => (
              <div key={task.id} className="task-card">
            <div className="task-left">
              {/* Header */}
              <div className="task-card-header">
                <span className={`task-cat-pill task-cat-${activeCategory}`}>
                  {activeCategory === "electricity" ? "⚡" :
                    activeCategory === "water" ? "💧" :
                      activeCategory === "garbage" ? "🗑" : "🚰"} {activeCategory.toUpperCase()}
                </span>
                {task.input_method && task.input_method !== 'manual' && (
                  <span style={{ fontSize: '0.72rem', background: '#eff6ff', color: '#1d4ed8', border: '1px solid #bfdbfe', borderRadius: 9999, padding: '2px 8px', fontWeight: 700 }}>
                    {task.input_method === 'voice' ? '🎙️ Voice' : task.input_method === 'photo' ? '📸 Photo' : '🎙️+📸 AI'}
                  </span>
                )}
                <span className={`task-status-pill ${task.status === "Assigned" ? "status-assigned" : "status-progress"}`}>
                  {task.status}
                </span>
              </div>

              {/* Details */}
              <div className="task-detail-row">
                <span className="task-detail-label">📍 Street</span>
                <span className="task-detail-value">{task.street}</span>
              </div>
              {task.houseNo && (
                <div className="task-detail-row">
                  <span className="task-detail-label">🏠 House</span>
                  <span className="task-detail-value">{task.houseNo}</span>
                </div>
              )}
              <div className="task-detail-row">
                <span className="task-detail-label">📝 Description</span>
                <span className="task-detail-value task-desc">{task.description}</span>
              </div>

              {task.deadline && (
                <div className="task-deadline-row">
                  <span className="task-deadline-label">📅 Deadline:</span>
                  <span className="task-deadline-date">{task.deadline}</span>
                  <span className={`deadline-chip ${getDeadlineInfo(task.deadline)?.includes("Over") ? "chip-expired" : "chip-active"}`}>
                    {getDeadlineInfo(task.deadline)}
                  </span>
                </div>
              )}

              {/* Actions */}
              <div className="task-actions">
                {task.status === "Assigned" && (
                  <button
                    className="progress-btn"
                    onClick={() => openConfirm("Start this task?", async () => {
                      setActionLoading(true);
                      const data = await updateStatus(task.id, "In Progress");
                      setActionLoading(false);
                      if (data.success) showPopup("🚀 Task Started!", "success");
                      else showPopup("❌ Failed to start task", "error");
                    })}
                  >
                    ▶ Start Task
                  </button>
                )}
                {task.status === "In Progress" && (
                  <button className="complete-btn" onClick={() => resolveIssue(task.id)}>
                    ✓ Mark Complete
                  </button>
                )}
              </div>
            </div>

            {task.photo && <TaskImageWithSkeleton photoId={task.photo} />}
          </div>
        ))}
          </div>
        )}
      </div>
    );
  };

  /* ── STATS ── */
  const getStats = () => {
    let s = { Assigned: 0, "In Progress": 0, Resolved: 0 };
    Object.values(tasks).forEach(arr => arr.forEach(t => { if (STATUS.includes(t.status)) s[t.status]++; }));
    return s;
  };
  const stats = getStats();
  const chartData = STATUS.map(status => ({ name: status, value: stats[status] }));
  const categoryData = Object.keys(tasks).map(cat => {
    let c = { Assigned: 0, "In Progress": 0, Resolved: 0 };
    tasks[cat].forEach(t => { if (STATUS.includes(t.status)) c[t.status]++; });
    return { name: cat, Assigned: c["Assigned"], Progress: c["In Progress"], Resolved: c["Resolved"] };
  });

  /* ── CATEGORY CARD HELPER ── */
  const catConfig = {
    electricity: { icon: "⚡", label: "Electricity", color: "#f59e0b", bg: "linear-gradient(135deg,#fde68a,#f59e0b)" },
    water: { icon: "💧", label: "Water", color: "#0ea5e9", bg: "linear-gradient(135deg,#bae6fd,#0ea5e9)" },
    garbage: { icon: "🗑", label: "Garbage", color: "#16a34a", bg: "linear-gradient(135deg,#bbf7d0,#16a34a)" },
    drainage: { icon: "🚰", label: "Drainage", color: "#7c3aed", bg: "linear-gradient(135deg,#ddd6fe,#7c3aed)" },
  };

  const navSections = [
    {
      title: "Field Tasks",
      items: [
        { key: "all", label: "All Assigned Tasks", icon: "📋", badge: myAssignments.length },
        { key: "active", label: "Active Pending Tasks", icon: "⏳", badge: myAssignments.filter(a => a.status !== "Completed" && a.assignment?.work_status !== "Completed").length },
        { key: "completed", label: "Completed Tasks", icon: "✅" },
      ],
    },
    {
      title: "Departments",
      items: [
        { key: "electricity", label: "Electricity (విద్యుత్)", icon: "⚡" },
        { key: "water", label: "Water (మంచినీరు)", icon: "💧" },
        { key: "garbage", label: "Garbage (పారిశుధ్యం)", icon: "🗑" },
        { key: "drainage", label: "Drainage (మురుగు)", icon: "🚰" },
      ],
    },
  ];

  const handleNavSelect = (key) => {
    if (["all", "active", "completed"].includes(key)) {
      setAssignmentFilter(key);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } else if (["electricity", "water", "garbage", "drainage"].includes(key)) {
      setActiveCategory(key);
      const el = document.querySelector(".wd-cat-section");
      if (el) el.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <MainLayout
      pageTitle="Field Worker Dashboard"
      role="worker"
      userName={localStorage.getItem("userName") || "Worker"}
      navSections={navSections}
      activeNavKey={assignmentFilter}
      onSelectNavKey={handleNavSelect}
      onLogout={logout}
    >
      {/* ── TOAST ── */}
      {popup.show && (
        <div className={`wd-toast ${popup.type === "error" ? "wd-toast--error" : "wd-toast--success"}`}>
          {popup.message}
        </div>
      )}

      {/* ── LOGOUT OVERLAY ── */}
      {logoutLoading && (
        <div className="wd-overlay">
          <div className="wd-overlay-box">
            <div className="wd-spinner" />
            <p>Logging out<span className="dots" /></p>
          </div>
        </div>
      )}

      {/* ── CONFIRM DIALOG ── */}
      {confirmBox.show && (
        <div className="wd-overlay" onClick={closeConfirm}>
          <div className="wd-confirm-box" onClick={e => e.stopPropagation()}>
            <div className="wd-confirm-icon">🤔</div>
            <p className="wd-confirm-msg">{confirmBox.message}</p>
            <div className="wd-confirm-actions">
              <button
                className="wd-btn-yes"
                disabled={actionLoading || logoutLoading}
                onClick={async () => {
                  setActionLoading(true);
                  await confirmBox.action();
                  setActionLoading(false);
                  closeConfirm();
                }}
              >
                {actionLoading ? "Processing…" : "✓ Yes"}
              </button>
              <button className="wd-btn-no" onClick={closeConfirm}>✕ Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* ── STATS CARDS ── */}
      <PageHeader
        title="Field Worker Operations"
        description="Assigned Panchayat tasks with GPS Navigation & live verification"
      />

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "1rem", marginBottom: "1.75rem" }}>
        <StatCard
          title="Total Assigned"
          value={myAssignments.length}
          subtext="Total tasks assigned to you"
          icon="📋"
          iconBg="var(--color-info-bg)"
          iconColor="var(--color-info)"
          onClick={() => setAssignmentFilter("all")}
        />
        <StatCard
          title="Active Pending"
          value={myAssignments.filter(a => a.status !== "Completed" && a.assignment?.work_status !== "Completed").length}
          subtext="Awaiting on-site resolution"
          icon="⏳"
          iconBg="var(--color-warning-bg)"
          iconColor="var(--color-warning)"
          onClick={() => setAssignmentFilter("active")}
        />
        <StatCard
          title="Completed"
          value={myAssignments.filter(a => a.status === "Completed" || a.assignment?.work_status === "Completed").length}
          subtext="Finished tasks"
          icon="✅"
          iconBg="var(--color-success-bg)"
          iconColor="var(--color-success)"
          onClick={() => setAssignmentFilter("completed")}
        />
      </div>

      {/* ── MY ASSIGNED WORKS & GPS SMART NAVIGATION ── */}
      <div style={{ margin: "1.5rem 1rem", padding: "1.5rem", background: "#ffffff", borderRadius: "14px", boxShadow: "0 4px 12px rgba(0,0,0,0.06)", border: "1px solid #e2e8f0" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem", flexWrap: "wrap", gap: "0.75rem" }}>
          <div>
            <h2 style={{ margin: 0, fontSize: "1.3rem", color: "#1e293b", fontWeight: "700", display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <span>🧭</span> My Field Assignments & Smart Navigation
            </h2>
            <p style={{ margin: "0.2rem 0 0", fontSize: "0.85rem", color: "#64748b" }}>
              Direct one-click Google Maps routing to complaint coordinates and field status updates
            </p>
          </div>

          <div style={{ display: "flex", gap: "0.4rem", background: "#f1f5f9", padding: "0.25rem", borderRadius: "8px" }}>
            <button
              type="button"
              onClick={() => setAssignmentFilter("active")}
              style={{
                padding: "0.35rem 0.75rem",
                borderRadius: "6px",
                border: "none",
                background: assignmentFilter === "active" ? "#2563eb" : "transparent",
                color: assignmentFilter === "active" ? "#ffffff" : "#475569",
                fontWeight: "600",
                fontSize: "0.82rem",
                cursor: "pointer",
              }}
            >
              Active Works ({myAssignments.filter(a => !["Completed", "Verified", "Rejected"].includes(a.assignment?.work_status)).length})
            </button>
            <button
              type="button"
              onClick={() => setAssignmentFilter("completed")}
              style={{
                padding: "0.35rem 0.75rem",
                borderRadius: "6px",
                border: "none",
                background: assignmentFilter === "completed" ? "#2563eb" : "transparent",
                color: assignmentFilter === "completed" ? "#ffffff" : "#475569",
                fontWeight: "600",
                fontSize: "0.82rem",
                cursor: "pointer",
              }}
            >
              Completed ({myAssignments.filter(a => ["Completed", "Verified"].includes(a.assignment?.work_status)).length})
            </button>
            <button
              type="button"
              onClick={() => setAssignmentFilter("all")}
              style={{
                padding: "0.35rem 0.75rem",
                borderRadius: "6px",
                border: "none",
                background: assignmentFilter === "all" ? "#2563eb" : "transparent",
                color: assignmentFilter === "all" ? "#ffffff" : "#475569",
                fontWeight: "600",
                fontSize: "0.82rem",
                cursor: "pointer",
              }}
            >
              All ({myAssignments.length})
            </button>
          </div>
        </div>

        {loadingAssignments ? (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: "1rem" }}>
            {[1, 2].map((i) => (
              <SkeletonBox key={i} height={180} />
            ))}
          </div>
        ) : myAssignments.length === 0 ? (
          <div style={{ textAlign: "center", padding: "2rem", color: "#64748b", background: "#f8fafc", borderRadius: "10px" }}>
            <span style={{ fontSize: "2rem", display: "block", marginBottom: "0.5rem" }}>👷</span>
            <p style={{ margin: 0, fontWeight: "600" }}>No tasks assigned to you currently.</p>
            <p style={{ margin: "0.2rem 0 0", fontSize: "0.85rem" }}>When an administrator assigns an issue to you, it will appear here with direct navigation.</p>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))", gap: "1rem" }}>
            {myAssignments
              .filter((item) => {
                const status = item.assignment?.work_status;
                if (assignmentFilter === "active") return !["Completed", "Verified", "Rejected"].includes(status);
                if (assignmentFilter === "completed") return ["Completed", "Verified"].includes(status);
                return true;
              })
              .map((item) => (
                <WorkerAssignmentCard
                  key={item.id}
                  item={item}
                  onUpdate={loadAssignments}
                  showToast={showPopup}
                />
              ))}
          </div>
        )}
      </div>

      {/* ── STATISTICS ── */}
      <div className="stats-section">
        <h2 className="wd-section-heading">📊 Task Statistics</h2>

        <div className="stats-subsection">
          <h3 className="wd-sub-heading title-overview">Status Overview</h3>
          <div className="stats-cards">
            {loading ? (
              [1, 2, 3].map(i => <SkeletonBox key={i} height={70} />)
            ) : (
              <>
                <div className="stat-card assigned"><span className="stat-num">{stats["Assigned"]}</span><span className="stat-lbl">Assigned</span></div>
                <div className="stat-card progress"><span className="stat-num">{stats["In Progress"]}</span><span className="stat-lbl">In Progress</span></div>
                <div className="stat-card resolved"><span className="stat-num">{stats["Resolved"]}</span><span className="stat-lbl">Resolved</span></div>
              </>
            )}
          </div>

          <div className="charts">
            <div className="chart-box">
              <h4 className="wd-chart-title chart-dist">Status Distribution</h4>
              {loading ? <SkeletonBox height={300} /> : (
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie data={chartData} dataKey="value" nameKey="name"
                      cx="50%" cy="50%" outerRadius={95} innerRadius={60} paddingAngle={6} stroke="none">
                      {chartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 8px 24px rgba(0,0,0,0.12)' }} />
                    <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontWeight: 600, color: '#475569', fontSize: '13px' }} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>
            <div className="chart-box">
              <h4 className="wd-chart-title chart-count">Status Count</h4>
              {loading ? <SkeletonBox height={300} /> : (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                    <XAxis dataKey="name" tick={{ fill: '#64748b', fontSize: 13, fontWeight: 600 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: '#64748b', fontSize: 13, fontWeight: 600 }} axisLine={false} tickLine={false} />
                    <Tooltip cursor={{ fill: '#f1f5f9' }} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 8px 24px rgba(0,0,0,0.12)' }} />
                    <Bar dataKey="value" barSize={34} radius={[6, 6, 0, 0]}>
                      {chartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
        </div>

        <div className="stats-subsection">
          <h3 className="wd-sub-heading title-perf">Category-wise Performance</h3>
          <div className="chart-box">
            <h4 className="wd-chart-title chart-prog">Category Progress</h4>
            {loading ? <SkeletonBox height={250} /> : (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={categoryData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="name" tick={{ fill: '#64748b', fontSize: 13, fontWeight: 600 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: '#64748b', fontSize: 13, fontWeight: 600 }} axisLine={false} tickLine={false} />
                  <Tooltip cursor={{ fill: '#f1f5f9' }} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 8px 24px rgba(0,0,0,0.12)' }} />
                  <Legend iconType="circle" wrapperStyle={{ fontWeight: 600, color: '#475569', fontSize: '13px', paddingTop: '10px' }} />
                  <Bar dataKey="Assigned" fill={CHART_COLORS[0]} radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Progress" fill={CHART_COLORS[1]} radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Resolved" fill={CHART_COLORS[2]} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      {/* ── CATEGORY SELECTION ── */}
      <div className="wd-cat-section">
        <h2 className="wd-section-heading">🗂️ Select Issue Category</h2>
        <div className="wd-cat-grid">
          {Object.entries(catConfig).map(([key, cfg]) => {
            const active = activeCategory === key;
            const taskCount = tasks[key]?.filter(t => t.status === "Assigned" || t.status === "In Progress").length || 0;
            return (
              <div
                key={key}
                className={`wd-cat-card ${active ? "wd-cat-card--active" : ""}`}
                style={{ "--cat-color": cfg.color, "--cat-bg": cfg.bg }}
                onClick={() => setActiveCategory(key)}
                tabIndex={0}
                onKeyDown={e => e.key === "Enter" && setActiveCategory(key)}
              >
                <div className="wd-cat-icon">{cfg.icon}</div>
                <div className="wd-cat-label">{cfg.label}</div>
                {taskCount > 0 && (
                  <div className="wd-cat-badge">{taskCount}</div>
                )}
                {active && <div className="wd-cat-active-bar" />}
              </div>
            );
          })}
        </div>
      </div>

      {/* ── TASK LIST ── */}
      <div className="task-section">
        {activeCategory && renderTasks()}
      </div>

    </MainLayout>
  );
}