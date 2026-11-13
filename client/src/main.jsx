import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./styles/responsive.css";
import "./styles/theme.css";
import "./styles/animations.css";

// Version bump for rebuild
// Global API interceptor: in production (e.g. Vercel), route /api/ and /media/ directly to the Render backend
const BACKEND_URL = (import.meta.env.VITE_API_URL || "https://smartvillage-api-tjih.onrender.com").replace(/\/$/, "");

if (typeof window !== "undefined" && window.location.hostname !== "localhost" && window.location.hostname !== "127.0.0.1") {
// Debug interceptor start
  console.log('[Interceptor] Initializing API interceptor');
  const originalFetch = window.fetch;
  // Log backend URL
  console.log('[Interceptor] Backend URL set to', BACKEND_URL);

  // Pre‑fetch CSRF token once and store it locally
  let csrfPromise = fetch(`${BACKEND_URL}/api/auth/csrf/`, { credentials: "include" })
    .then(r => r.json())
    .then(data => {
      if (data.csrfToken) {
        localStorage.setItem("csrfToken", data.csrfToken);
      }
      return data.csrfToken;
    })
    .catch(() => null);

  window.fetch = async function (url, options = {}) {
    let finalUrl = url;
    if (typeof url === "string") {
      if (url.startsWith("/api/") || url === "/api") {
        finalUrl = `${BACKEND_URL}${url}`;
      } else if (url.startsWith("/media/")) {
        finalUrl = `${BACKEND_URL}${url}`;
      }
    }
    const method = (options.method || "GET").toUpperCase();
    const newOptions = {
      ...options,
      credentials: options.credentials || "include",
    };
    // Attach CSRF header for state‑changing requests
    if (method !== "GET" && method !== "HEAD" && method !== "OPTIONS") {
      const token = localStorage.getItem("csrfToken") || await csrfPromise;
      if (token) {
        newOptions.headers = {
          ...(newOptions.headers || {}),
          "X-CSRFToken": token,
        };
      }
    }
    return originalFetch(finalUrl, newOptions);
  };
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
