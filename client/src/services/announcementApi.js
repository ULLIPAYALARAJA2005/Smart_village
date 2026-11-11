/**
 * Village Announcement API Service
 * Supports Admin management, Villager broadcasting, AI translation, and Activity Tracking.
 */

const getCookie = (name) => {
  if (typeof document === "undefined") return null;
  const cookie = document.cookie
    .split("; ")
    .find((row) => row.startsWith(`${name}=`));
  return cookie ? decodeURIComponent(cookie.split("=").slice(1).join("=")) : null;
};

const getCsrfHeaders = async () => {
  let token = getCookie("csrftoken");
  if (!token) {
    try {
      await fetch("/api/auth/csrf/", { credentials: "same-origin" });
      token = getCookie("csrftoken");
    } catch {}
  }
  return token ? { "X-CSRFToken": token } : {};
};

// ==================== ADMIN APIS ====================

export const fetchAdminAnnouncementsAPI = async (params = {}) => {
  // Filter out undefined/null values so they don't become "?category=undefined"
  const cleanParams = Object.fromEntries(
    Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== "undefined")
  );
  const query = new URLSearchParams(cleanParams).toString();
  const url = `/api/announcements/admin/${query ? `?${query}` : ""}`;
  const res = await fetch(url, { credentials: "include" });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || `Failed to load admin announcements (${res.status})`);
  }
  return await res.json();
};

export const createAnnouncementAPI = async (formData) => {
  const csrfHeaders = await getCsrfHeaders();
  const res = await fetch("/api/announcements/admin/create/", {
    method: "POST",
    credentials: "include",
    headers: { ...csrfHeaders },
    body: formData,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: "Failed to create announcement" }));
    throw new Error(err.message || "Failed to create announcement");
  }
  return await res.json();
};

export const updateAnnouncementAPI = async (id, formData) => {
  const csrfHeaders = await getCsrfHeaders();
  const res = await fetch(`/api/announcements/admin/${id}/`, {
    method: "PUT",
    credentials: "include",
    headers: { ...csrfHeaders },
    body: formData,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: "Failed to update announcement" }));
    throw new Error(err.message || "Failed to update announcement");
  }
  return await res.json();
};

export const deleteAnnouncementAPI = async (id) => {
  const csrfHeaders = await getCsrfHeaders();
  const res = await fetch(`/api/announcements/admin/${id}/delete/`, {
    method: "DELETE",
    credentials: "include",
    headers: { ...csrfHeaders },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: "Failed to delete announcement" }));
    throw new Error(err.message || "Failed to delete announcement");
  }
  return await res.json();
};

export const togglePublishAnnouncementAPI = async (id) => {
  const csrfHeaders = await getCsrfHeaders();
  const res = await fetch(`/api/announcements/admin/${id}/publish/`, {
    method: "POST",
    credentials: "include",
    headers: { ...csrfHeaders, "Content-Type": "application/json" },
  });
  if (!res.ok) throw new Error("Failed to toggle publish status");
  return await res.json();
};

export const aiTranslateAnnouncementAPI = async ({ title, content, language = "en" }) => {
  const csrfHeaders = await getCsrfHeaders();
  const res = await fetch("/api/announcements/admin/translate/", {
    method: "POST",
    credentials: "include",
    headers: { ...csrfHeaders, "Content-Type": "application/json" },
    body: JSON.stringify({ title, content, language }),
  });
  if (!res.ok) throw new Error("AI Translation failed");
  return await res.json();
};

// ==================== VILLAGER APIS ====================

export const fetchVillagerAnnouncementsAPI = async (params = {}) => {
  // Filter out undefined/null values so they don't become "?category=undefined"
  const cleanParams = Object.fromEntries(
    Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== "undefined")
  );
  const query = new URLSearchParams(cleanParams).toString();
  const url = `/api/announcements/${query ? `?${query}` : ""}`;
  const res = await fetch(url, { credentials: "include" });
  if (!res.ok) throw new Error(`Failed to load announcements (${res.status})`);
  return await res.json();
};

export const fetchImportantAnnouncementsAPI = async () => {
  const res = await fetch("/api/announcements/important/", { credentials: "include" });
  if (!res.ok) throw new Error("Failed to load important announcements");
  return await res.json();
};

export const fetchEmergencyAnnouncementsAPI = async () => {
  const res = await fetch("/api/announcements/emergency/", { credentials: "include" });
  if (!res.ok) throw new Error("Failed to load emergency announcements");
  return await res.json();
};

export const recordAnnouncementViewAPI = async (id) => {
  const csrfHeaders = await getCsrfHeaders();
  const res = await fetch(`/api/announcements/${id}/view/`, {
    method: "POST",
    credentials: "include",
    headers: { ...csrfHeaders, "Content-Type": "application/json" },
  });
  if (!res.ok) return null;
  return await res.json();
};

export const recordAnnouncementListenAPI = async (id) => {
  const csrfHeaders = await getCsrfHeaders();
  const res = await fetch(`/api/announcements/${id}/listen/`, {
    method: "POST",
    credentials: "include",
    headers: { ...csrfHeaders, "Content-Type": "application/json" },
  });
  if (!res.ok) return null;
  return await res.json();
};

export const fetchAnnouncementStatsSummaryAPI = async () => {
  const res = await fetch("/api/announcements/stats/", { credentials: "include" });
  if (!res.ok) return { total_active: 0, unread_count: 0, emergency_count: 0 };
  return await res.json();
};

