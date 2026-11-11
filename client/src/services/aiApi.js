/**
 * AI API Helper Service
 * Handles communication with /api/ai/ endpoints and issue creation with AI metadata.
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

export const analyzeComplaintAPI = async ({ description, photo, language = "te" }) => {
  const csrfHeaders = await getCsrfHeaders();
  const formData = new FormData();
  if (description) formData.append("description", description);
  formData.append("language", language);
  if (photo) formData.append("photo", photo);

  const res = await fetch("/api/ai/analyze/", {
    method: "POST",
    credentials: "same-origin",
    headers: { ...csrfHeaders },
    body: formData,
  });

  if (!res.ok) {
    throw new Error(`AI Analysis failed (${res.status})`);
  }
  return await res.json();
};

export const submitConfirmedComplaintAPI = async ({
  category,
  street,
  houseNo,
  description,
  photo,
  date,
  time,
  userId,
  inputMethod = "voice_photo",
  language = "te",
  aiAnalysis = null,
  latitude = null,
  longitude = null,
  location_accuracy = null,
  location_captured = false,
}) => {
  const csrfHeaders = await getCsrfHeaders();
  const formData = new FormData();

  formData.append("street", street || "Village Center");
  formData.append("houseNo", houseNo || "");
  formData.append("description", description || "");
  if (photo) formData.append("photo", photo);
  formData.append("date", date || new Date().toLocaleDateString());
  formData.append("time", time || new Date().toLocaleTimeString());
  formData.append("userId", userId);
  formData.append("input_method", inputMethod);
  formData.append("language", language);

  // GPS location fields
  if (location_captured && latitude != null && longitude != null) {
    formData.append("latitude", latitude);
    formData.append("longitude", longitude);
    if (location_accuracy != null) formData.append("location_accuracy", location_accuracy);
    formData.append("location_captured", "true");
  }

  if (aiAnalysis) {
    if (aiAnalysis.predicted_text_category) {
      formData.append("predicted_text_category", aiAnalysis.predicted_text_category);
      formData.append("text_similarity_score", aiAnalysis.text_similarity_score || 0.0);
    }
    if (aiAnalysis.predicted_image_category) {
      formData.append("predicted_image_category", aiAnalysis.predicted_image_category);
      formData.append("image_similarity_score", aiAnalysis.image_similarity_score || 0.0);
    }
  }

  const res = await fetch(`/api/issues/${category}/`, {
    method: "POST",
    credentials: "same-origin",
    headers: { ...csrfHeaders },
    body: formData,
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Complaint submission failed: ${errorText}`);
  }
  return await res.json();
};

export const fetchIssueStatusAPI = async (issueId) => {
  const res = await fetch(`/api/ai/issues/${issueId}/status/`, {
    credentials: "same-origin",
  });
  if (!res.ok) {
    throw new Error(`Failed to load issue status (${res.status})`);
  }
  return await res.json();
};

export const fetchMyAIComplaintsAPI = async () => {
  const res = await fetch("/api/ai/my-issues/", {
    credentials: "same-origin",
  });
  if (!res.ok) {
    throw new Error(`Failed to load complaints (${res.status})`);
  }
  return await res.json();
};

export const transcribeAudioAPI = async ({ audioBlob, language = "te" }) => {
  const csrfHeaders = await getCsrfHeaders();
  const formData = new FormData();
  const ext = (audioBlob.type && audioBlob.type.includes("ogg")) ? "ogg" : (audioBlob.type && audioBlob.type.includes("wav")) ? "wav" : "webm";
  formData.append("audio", audioBlob, `voice_recording.${ext}`);
  formData.append("language", language);

  const res = await fetch("/api/ai/transcribe/", {
    method: "POST",
    credentials: "same-origin",
    headers: { ...csrfHeaders },
    body: formData,
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Audio transcription failed (${res.status}): ${errorText}`);
  }
  return await res.json();
};

// ==================== GPS / WORK ASSIGNMENT API ====================

export const fetchMapIssuesAPI = async () => {
  const res = await fetch("/api/issues/map/all/", { credentials: "same-origin" });
  if (!res.ok) throw new Error(`Failed to fetch map issues (${res.status})`);
  return await res.json();
};

export const fetchAllIssuesAPI = async () => {
  const res = await fetch("/api/issues/all/", { credentials: "same-origin" });
  if (!res.ok) throw new Error(`Failed to fetch issues (${res.status})`);
  return await res.json();
};

export const fetchWorkersAPI = async () => {
  const res = await fetch("/api/issues/admin/workers/", { credentials: "same-origin" });
  if (!res.ok) throw new Error(`Failed to fetch workers (${res.status})`);
  return await res.json();
};

export const assignWorkerAPI = async (issueId, data) => {
  const csrfHeaders = await getCsrfHeaders();
  const res = await fetch(`/api/issues/${issueId}/assign/`, {
    method: "POST",
    credentials: "same-origin",
    headers: { ...csrfHeaders, "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Assignment failed: ${err}`);
  }
  return await res.json();
};

export const fetchMyAssignmentsAPI = async () => {
  const res = await fetch("/api/issues/worker/assignments/", { credentials: "same-origin" });
  if (!res.ok) throw new Error(`Failed to fetch assignments (${res.status})`);
  return await res.json();
};

export const assignmentActionAPI = async (assignmentId, action, data = {}) => {
  const csrfHeaders = await getCsrfHeaders();
  let body;
  let headers = { ...csrfHeaders };
  if (data instanceof FormData) {
    body = data;
  } else {
    body = JSON.stringify(data);
    headers["Content-Type"] = "application/json";
  }
  const res = await fetch(`/api/issues/worker/assignments/${assignmentId}/${action}/`, {
    method: "POST",
    credentials: "same-origin",
    headers,
    body,
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Action failed: ${err}`);
  }
  return await res.json();
};

export const verifyAssignmentAPI = async (assignmentId) => {
  const csrfHeaders = await getCsrfHeaders();
  const res = await fetch(`/api/issues/admin/assignments/${assignmentId}/verify/`, {
    method: "POST",
    credentials: "same-origin",
    headers: { ...csrfHeaders, "Content-Type": "application/json" },
    body: JSON.stringify({}),
  });
  if (!res.ok) throw new Error(`Verify failed (${res.status})`);
  return await res.json();
};

export const fetchAssignmentStatsAPI = async () => {
  const res = await fetch("/api/issues/admin/stats/", { credentials: "same-origin" });
  if (!res.ok) throw new Error(`Stats failed (${res.status})`);
  return await res.json();
};

export const createWorkerAPI = async (data) => {
  const csrfHeaders = await getCsrfHeaders();
  const res = await fetch("/api/admin/workers/create/", {
    method: "POST",
    credentials: "same-origin",
    headers: { ...csrfHeaders, "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: "Failed to create worker" }));
    throw new Error(err.message || "Failed to create worker");
  }
  return await res.json();
};

export const fetchAdminWorkersListAPI = async () => {
  const res = await fetch("/api/admin/workers/", { credentials: "same-origin" });
  if (!res.ok) throw new Error(`Failed to load workers (${res.status})`);
  return await res.json();
};

export const resetWorkerPasswordAPI = async (workerId, newPassword) => {
  const csrfHeaders = await getCsrfHeaders();
  const res = await fetch(`/api/admin/workers/${workerId}/reset-password/`, {
    method: "POST",
    credentials: "same-origin",
    headers: { ...csrfHeaders, "Content-Type": "application/json" },
    body: JSON.stringify({ new_password: newPassword }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: "Failed to reset password" }));
    throw new Error(err.message || "Failed to reset password");
  }
  return await res.json();
};

export const updateComplaintAPI = async (issueId, formData) => {
  const csrfHeaders = await getCsrfHeaders();
  const res = await fetch(`/api/issues/manage/${issueId}/`, {
    method: "PUT",
    credentials: "same-origin",
    headers: { ...csrfHeaders },
    body: formData,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: "Failed to update complaint" }));
    throw new Error(err.message || "Failed to update complaint");
  }
  return await res.json();
};

export const deleteComplaintAPI = async (issueId) => {
  const csrfHeaders = await getCsrfHeaders();
  const res = await fetch(`/api/issues/manage/${issueId}/`, {
    method: "DELETE",
    credentials: "same-origin",
    headers: { ...csrfHeaders },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: "Failed to delete complaint" }));
    throw new Error(err.message || "Failed to delete complaint");
  }
  return await res.json();
};




