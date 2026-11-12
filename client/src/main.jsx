import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./styles/responsive.css";
import "./styles/theme.css";
import "./styles/animations.css";

// Global API interceptor: in production (e.g. Vercel), route /api/ and /media/ directly to the Render backend
const BACKEND_URL = (import.meta.env.VITE_API_URL || "https://smartvillage-api-tjih.onrender.com").replace(/\/$/, "");

if (typeof window !== "undefined" && window.location.hostname !== "localhost" && window.location.hostname !== "127.0.0.1") {
  const originalFetch = window.fetch;
  window.fetch = function (url, options = {}) {
    let finalUrl = url;
    if (typeof url === "string") {
      if (url.startsWith("/api/") || url === "/api") {
        finalUrl = `${BACKEND_URL}${url}`;
      } else if (url.startsWith("/media/")) {
        finalUrl = `${BACKEND_URL}${url}`;
      }
    }
    const newOptions = {
      ...options,
      credentials: options.credentials || "include",
    };
    return originalFetch(finalUrl, newOptions);
  };
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
