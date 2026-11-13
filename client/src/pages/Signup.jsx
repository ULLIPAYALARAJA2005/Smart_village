import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import Toast from "../components/Toast";
import { useLanguage } from "../context/LanguageContext";
import "../styles/signup.css";

export default function Signup() {
  const navigate = useNavigate();
  const { lang, t } = useLanguage();

  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);

  const [formData, setFormData] = useState({
    fullName: "",
    mobileNumber: "",
    villageName: "",
    streetName: "",
    houseNumber: "",
    username: "",
    email: "",
    password: "",
    confirmPassword: "",
    aadhar: "",
  });

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  // Get CSRF token from cookie or storage
  function getCookie(name) {
    const fromStorage = localStorage.getItem(name);
    if (fromStorage) return fromStorage;

    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) {
      return parts.pop().split(";").shift();
    }
    return null;
  }

  // Redirect if logged in
  useEffect(() => {
    const role = localStorage.getItem("role");
    if (role === "admin") navigate("/admin");
    else if (role === "worker") navigate("/worker");
    else if (role === "villager") navigate("/villager");
  }, [navigate]);

  const showToast = (msg, type = "error") => {
    setToast({ message: msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  // Format Aadhaar
  const formatAadhar = (value) => {
    const digits = value.replace(/\D/g, "").slice(0, 12);
    return digits.replace(/(\d{4})(?=\d)/g, "$1 ");
  };

  const handleChange = (e) => {
    const { name, value } = e.target;

    if (name === "aadhar") {
      setFormData({
        ...formData,
        aadhar: formatAadhar(value),
      });
      return;
    }

    if (name === "mobileNumber") {
      // Keep only digits, max 10
      const digits = value.replace(/\D/g, "").slice(0, 10);
      setFormData({
        ...formData,
        mobileNumber: digits,
      });
      return;
    }

    setFormData({
      ...formData,
      [name]: value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (loading) return;

    // 1. Mandatory fields validation
    if (!formData.fullName.trim()) {
      showToast("Full Name is mandatory", "error");
      return;
    }

    // 2. Mobile number validation (Indian 10-digit starting with 6,7,8,9)
    const phoneClean = formData.mobileNumber.trim();
    if (!/^[6-9]\d{9}$/.test(phoneClean)) {
      showToast(
        "Please enter a valid 10-digit Indian mobile number (e.g. 9876543210)",
        "error"
      );
      return;
    }

    // 3. Address fields validation
    if (!formData.villageName.trim()) {
      showToast("Village Name is mandatory", "error");
      return;
    }
    if (!formData.streetName.trim()) {
      showToast("Street / Area Name is mandatory", "error");
      return;
    }
    if (!formData.houseNumber.trim()) {
      showToast("House Number is mandatory", "error");
      return;
    }

    // 4. Username & Email
    if (!formData.username.trim()) {
      showToast("Username is mandatory", "error");
      return;
    }
    if (!formData.email.trim()) {
      showToast("Email address is mandatory", "error");
      return;
    }

    // 5. Password validation
    if (formData.password.length < 6) {
      showToast("Password must be at least 6 characters", "error");
      return;
    }
    if (formData.password !== formData.confirmPassword) {
      showToast("Passwords do not match", "error");
      return;
    }

    // 6. Aadhaar validation if provided
    const rawAadhar = formData.aadhar.replace(/\s/g, "");
    if (rawAadhar && rawAadhar.length !== 12) {
      showToast("Aadhaar must be exactly 12 digits", "error");
      return;
    }

    setLoading(true);

    try {
      // Ensure CSRF token
      const csrfRes = await fetch("/api/auth/csrf/", { credentials: "include" });
      const csrfData = await csrfRes.json().catch(() => ({}));
      if (csrfData && csrfData.csrfToken) {
        localStorage.setItem("csrftoken", csrfData.csrfToken);
      }
      const csrfToken = csrfData?.csrfToken || getCookie("csrftoken");

      const res = await fetch("/api/auth/signup/", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          "X-CSRFToken": csrfToken || "",
        },
        body: JSON.stringify({
          full_name: formData.fullName.trim(),
          mobile_number: phoneClean,
          village_name: formData.villageName.trim(),
          street_name: formData.streetName.trim(),
          house_number: formData.houseNumber.trim(),
          username: formData.username.trim(),
          email: formData.email.trim().toLowerCase(),
          password: formData.password,
          confirm_password: formData.confirmPassword,
          aadhar: rawAadhar || null,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        let errorMessage = "Registration failed";
        if (data.message) {
          errorMessage = data.message;
        } else if (typeof data === "object") {
          const errorsList = [];
          for (const key of Object.keys(data)) {
            const val = Array.isArray(data[key]) ? data[key].join(", ") : data[key];
            errorsList.push(`${key}: ${val}`);
          }
          if (errorsList.length > 0) errorMessage = errorsList.join(" | ");
        }
        showToast(errorMessage, "error");
        setLoading(false);
        return;
      }

      showToast(
        "Registration request submitted! Awaiting Admin approval.",
        "success"
      );
      setTimeout(() => navigate("/login"), 1800);
    } catch (error) {
      console.error(error);
      showToast("Network / Server error. Please try again.", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="signup-container">
      <div className="back-btn" onClick={() => navigate("/")} title="Back to Home">
        ← Back
      </div>

      {toast && <Toast message={toast.message} type={toast.type} />}

      <div className="signup-card">
        <h2>{lang === "te" ? "గ్రామస్తుల నమోదు (Villager Registration)" : "Villager Registration"}</h2>
        <p className="subtitle">
          {lang === "te"
            ? "సమస్యలను నమోదు చేయడానికి మీ సంప్రదింపు మరియు నివాస చిరునామా వివరాలను అందించండి"
            : "Register with your verified mobile number & residential address to report village problems"}
        </p>

        <form onSubmit={handleSubmit} noValidate>
          <div className="form-grid">
            {/* 1. Full Name */}
            <div className="input-group">
              <label>
                {t("fullName")} / పూర్తి పేరు <span style={{ color: "#e11d48" }}>*</span>
              </label>
              <input
                type="text"
                name="fullName"
                value={formData.fullName}
                onChange={handleChange}
                placeholder="e.g. Raja Ullipayala"
                required
              />
            </div>

            {/* 2. Mobile Number */}
            <div className="input-group">
              <label>
                {t("mobileNumber")} / మొబైల్ నంబర్ <span style={{ color: "#e11d48" }}>*</span>
              </label>
              <div style={{ position: "relative" }}>
                <span
                  style={{
                    position: "absolute",
                    left: "10px",
                    top: "50%",
                    transform: "translateY(-50%)",
                    color: "#64748b",
                    fontSize: "0.85rem",
                    fontWeight: 600,
                  }}
                >
                  +91
                </span>
                <input
                  type="tel"
                  name="mobileNumber"
                  value={formData.mobileNumber}
                  onChange={handleChange}
                  placeholder="9876543210 (10 digits)"
                  style={{ paddingLeft: "42px" }}
                  maxLength={10}
                  required
                />
              </div>
            </div>

            {/* 3. Village Name */}
            <div className="input-group">
              <label>
                {t("villageName")} / గ్రామం పేరు <span style={{ color: "#e11d48" }}>*</span>
              </label>
              <input
                type="text"
                name="villageName"
                value={formData.villageName}
                onChange={handleChange}
                placeholder="e.g. Bandepalli"
                required
              />
            </div>

            {/* 4. Street / Area Name */}
            <div className="input-group">
              <label>
                {t("streetName")} / వీధి పేరు <span style={{ color: "#e11d48" }}>*</span>
              </label>
              <input
                type="text"
                name="streetName"
                value={formData.streetName}
                onChange={handleChange}
                placeholder="e.g. Main Road / Temple Lane"
                required
              />
            </div>

            {/* 5. House Number */}
            <div className="input-group">
              <label>
                {t("houseNumber")} / ఇంటి నంబర్ <span style={{ color: "#e11d48" }}>*</span>
              </label>
              <input
                type="text"
                name="houseNumber"
                value={formData.houseNumber}
                onChange={handleChange}
                placeholder="e.g. 3-45"
                required
              />
            </div>

            {/* 6. Username */}
            <div className="input-group">
              <label>
                {t("username")} / యూజర్ నేమ్ <span style={{ color: "#e11d48" }}>*</span>
              </label>
              <input
                type="text"
                name="username"
                value={formData.username}
                onChange={handleChange}
                placeholder="e.g. raja123"
                required
              />
            </div>

            {/* 7. Email Address */}
            <div className="input-group">
              <label>
                {t("emailAddress")} / ఈమెయిల్ <span style={{ color: "#e11d48" }}>*</span>
              </label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="e.g. raja@gmail.com"
                required
              />
            </div>

            {/* Optional Aadhaar */}
            <div className="input-group">
              <label>
                Aadhaar Number / ఆధార్ నంబర్ (Optional)
              </label>
              <input
                type="text"
                name="aadhar"
                value={formData.aadhar}
                onChange={handleChange}
                placeholder="XXXX XXXX XXXX"
              />
            </div>

            {/* 8. Password */}
            <div className="input-group password-group">
              <label>
                {t("password")} / పాస్వర్డ్ <span style={{ color: "#e11d48" }}>*</span>
              </label>
              <div className="password-wrapper">
                <input
                  type={showPassword ? "text" : "password"}
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="Min 6 characters"
                  required
                />
                <span
                  className="eye"
                  onClick={() => setShowPassword(!showPassword)}
                  title={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? "🙈" : "👁"}
                </span>
              </div>
            </div>

            {/* 9. Confirm Password */}
            <div className="input-group password-group">
              <label>
                {t("confirmPassword")} / నిర్ధారించండి <span style={{ color: "#e11d48" }}>*</span>
              </label>
              <div className="password-wrapper">
                <input
                  type={showConfirm ? "text" : "password"}
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  placeholder="Re-enter password"
                  required
                />
                <span
                  className="eye"
                  onClick={() => setShowConfirm(!showConfirm)}
                  title={showConfirm ? "Hide password" : "Show password"}
                >
                  {showConfirm ? "🙈" : "👁"}
                </span>
              </div>
            </div>
          </div>

          <button className="signup-btn" disabled={loading} style={{ background: "#173B57" }}>
            {loading ? "Processing Registration..." : (lang === "te" ? "నమోదు చేసుకోండి (Register)" : "Register as Villager")}
          </button>
        </form>

        <p className="auth-switch">
          Already have an account? <Link to="/login">Login here</Link>
        </p>
      </div>
    </div>
  );
}
