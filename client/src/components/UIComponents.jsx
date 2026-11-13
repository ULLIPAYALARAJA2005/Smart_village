import React from "react";

export function StatCard({
  title,
  value,
  subtext,
  icon = "📊",
  iconBg = "#E0F2FE",
  iconColor = "#0284C7",
  onClick,
}) {
  return (
    <div
      className="gov-stat-card"
      onClick={onClick}
      style={{ cursor: onClick ? "pointer" : "default" }}
    >
      <div>
        <div className="gov-stat-title">{title}</div>
        <div className="gov-stat-val">{value}</div>
        {subtext && <div className="gov-stat-subtext">{subtext}</div>}
      </div>
      <div
        className="gov-stat-icon-wrap"
        style={{ backgroundColor: iconBg, color: iconColor }}
      >
        {icon}
      </div>
    </div>
  );
}

export function StatusBadge({ status }) {
  let badgeClass = "gov-badge-pending";
  let label = status || "Pending";

  const lower = (status || "").toLowerCase();
  if (lower.includes("resolved") || lower.includes("completed") || lower.includes("verified")) {
    badgeClass = "gov-badge-resolved";
  } else if (lower.includes("progress")) {
    badgeClass = "gov-badge-progress";
  } else if (lower.includes("assigned")) {
    badgeClass = "gov-badge-assigned";
  } else if (lower.includes("reject")) {
    badgeClass = "gov-badge-rejected";
  }

  return (
    <span className={`gov-badge ${badgeClass}`}>
      <span style={{ fontSize: "0.55rem" }}>●</span>
      {label}
    </span>
  );
}

export function PageHeader({ title, description, actions }) {
  return (
    <div className="gov-page-header">
      <div className="gov-page-title-wrap">
        <h1>{title}</h1>
        {description && <p>{description}</p>}
      </div>
      {actions && <div style={{ display: "flex", gap: "0.6rem", flexWrap: "wrap" }}>{actions}</div>}
    </div>
  );
}
