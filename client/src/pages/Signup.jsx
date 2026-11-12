import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import Toast from "../components/Toast";
import "../styles/signup.css";

export default function Signup() {

  const navigate = useNavigate();

  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    aadhar: "",
    password: "",
    confirmPassword: ""
  });

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  // Get CSRF token from cookie
  function getCookie(name) {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);

    if (parts.length === 2) {
      return parts.pop().split(";").shift();
    }

    return null;
  }

  // redirect if logged in
  useEffect(() => {
    const role = localStorage.getItem("role");

    if (role === "admin") navigate("/admin");
    else if (role === "worker") navigate("/worker");
    else if (role === "villager") navigate("/villager");
  }, [navigate]);

  // toast helper
  const showToast = (msg, type) => {
    setToast({ message: msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  // Aadhaar formatter
  const formatAadhar = (value) => {
    const digits = value.replace(/\D/g, "").slice(0, 12);
    return digits.replace(/(\d{4})(?=\d)/g, "$1 ");
  };

  // input change
  const handleChange = (e) => {
    const { name, value } = e.target;

    if (name === "aadhar") {
      const formatted = formatAadhar(value);

      setFormData({
        ...formData,
        aadhar: formatted
      });

      return;
    }

    setFormData({
      ...formData,
      [name]: value
    });
  };

  // submit
  const handleSubmit = async (e) => {

    e.preventDefault();

    if (loading) return;

    setLoading(true);

    const rawAadhar = formData.aadhar.replace(/\s/g, "");

    // validation
    if (rawAadhar.length !== 12) {
      showToast("Aadhaar must be exactly 12 digits", "error");
      setLoading(false);
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      showToast("Passwords do not match", "error");
      setLoading(false);
      return;
    }

    try {

      // Get CSRF cookie first
      await fetch("/api/auth/csrf/", { credentials: "include" });

      const csrfToken = getCookie("csrftoken");

      const res = await fetch("/api/auth/signup/", {
        method: "POST",
        credentials: "include",

        headers: {
          "Content-Type": "application/json",
          "X-CSRFToken": csrfToken
        },

        body: JSON.stringify({
          username: formData.name,
          email: formData.email,
          aadhar: rawAadhar,
          password: formData.password
        })
      });

      const data = await res.json();

      if (!res.ok) {

        const errorMessage =
          data.message ||
          Object.values(data).flat().join(" ") ||
          "Registration failed";

        showToast(errorMessage, "error");

        setLoading(false);
        return;
      }

      showToast(
        "Registration request is sent to Admin and Wait for Admin Approval",
        "success"
      );

      setTimeout(() => navigate("/login"), 1500);

    } catch (error) {

      console.error(error);

      showToast("Server error", "error");
      setLoading(false);
    }

    setLoading(false);
  };

  return (
    <div className="signup-container">

      <div
        className="back-btn"
        onClick={() => navigate("/")}
      >
        ←
      </div>

      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
        />
      )}

      <div className="signup-card">

        <h2>FixMyVillage Registration</h2>

        <p className="subtitle">
          Register to report village issues
        </p>

        <form onSubmit={handleSubmit}>

          <div className="form-grid">

            <div className="input-group">
              <label>Full Name</label>

              <input
                name="name"
                onChange={handleChange}
                required
              />
            </div>

            <div className="input-group">
              <label>Email</label>

              <input
                type="email"
                name="email"
                onChange={handleChange}
                required
              />
            </div>

            <div className="input-group">
              <label>Aadhaar Number</label>

              <input
                name="aadhar"
                value={formData.aadhar}
                onChange={handleChange}
                placeholder="XXXX XXXX XXXX"
                required
              />
            </div>

            <div className="input-group password-group">

              <label>Password</label>

              <div className="password-wrapper">

                <input
                  type={showPassword ? "text" : "password"}
                  name="password"
                  onChange={handleChange}
                  required
                />

                <span
                  className="eye"
                  onClick={() =>
                    setShowPassword(!showPassword)
                  }
                >
                  {showPassword ? "🙈" : "👁"}
                </span>

              </div>
            </div>

            <div className="input-group password-group">

              <label>Confirm Password</label>

              <div className="password-wrapper">

                <input
                  type={showConfirm ? "text" : "password"}
                  name="confirmPassword"
                  onChange={handleChange}
                  required
                />

                <span
                  className="eye"
                  onClick={() =>
                    setShowConfirm(!showConfirm)
                  }
                >
                  {showConfirm ? "🙈" : "👁"}
                </span>

              </div>
            </div>

          </div>

          <button
            className="signup-btn"
            disabled={loading}
          >
            {loading ? "Processing..." : "Register"}
          </button>

        </form>

        <p className="auth-switch">
          Already have an account?{" "}
          <Link to="/login">Login</Link>
        </p>

      </div>
    </div>
  );
}