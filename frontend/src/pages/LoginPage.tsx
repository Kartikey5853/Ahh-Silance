/**
 * Clean Academic Sign-In & Registration Portal with Organization Setup.
 * 
 * Allows new users to create their own account from scratch or log into existing accounts.
 * Connects directly to SQLite authentication endpoints and auto-configures organization.
 */

import React, { useState } from "react";
import { authApi } from "../api/authApi";
import { academicApi } from "../api/academicApi";
import type { AuthResponse } from "../types/auth";
import type { InstitutionType } from "../types/academic";
import {
  Lock,
  User,
  ArrowRight,
  Building2
} from "lucide-react";

interface LoginPageProps {
  onLoginSuccess: (authData: AuthResponse) => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onLoginSuccess }) => {
  const [activeTab, setActiveTab] = useState<"login" | "register">("login");

  // Login Form State
  const [loginUsername, setLoginUsername] = useState("");
  const [loginPassword, setLoginPassword] = useState("");

  // Register Form State
  const [regUsername, setRegUsername] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("Teacher / Professor");

  // Organization Fields (As requested: configured on Register page)
  const [orgName, setOrgName] = useState("Delhi Public School");
  const [orgType, setOrgType] = useState<InstitutionType>("school");
  const [orgCode, setOrgCode] = useState("DPS-2026");

  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!loginUsername.trim() || !loginPassword.trim()) {
      setErrorMessage("Please enter both username and password.");
      return;
    }

    setIsLoading(true);

    try {
      const response = await authApi.login({
        username: loginUsername.trim(),
        password: loginPassword.trim()
      });
      localStorage.setItem("auth_token", response.access_token);
      localStorage.setItem("auth_user", JSON.stringify(response));
      onLoginSuccess(response);
    } catch (err: any) {
      if (err.response && err.response.data && err.response.data.detail) {
        setErrorMessage(err.response.data.detail);
      } else {
        setErrorMessage("Login failed. Please verify credentials or register a new account.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!regUsername.trim() || !regPassword.trim()) {
      setErrorMessage("Please choose a username and password.");
      return;
    }
    if (regPassword.length < 4) {
      setErrorMessage("Password must be at least 4 characters.");
      return;
    }

    setIsLoading(true);

    try {
      // 1. Register User
      const response = await authApi.register({
        username: regUsername.trim(),
        password: regPassword.trim(),
        full_name: fullName.trim() || regUsername.trim(),
        email: email.trim(),
        role: role
      });
      localStorage.setItem("auth_token", response.access_token);
      localStorage.setItem("auth_user", JSON.stringify(response));

      // 2. Automatically create & configure Organization on Register!
      try {
        const inst = await academicApi.createInstitution({
          name: orgName.trim() || "My Academic Institution",
          type: orgType,
          code: orgCode.trim() || "INST"
        });
        if (inst && inst.id) {
          await academicApi.updateProfile({ institution_id: inst.id });
        }
      } catch (instErr) {
        console.warn("Auto institution setup fallback:", instErr);
      }

      setSuccessMessage("Account created successfully! Loading your dashboard...");
      setTimeout(() => {
        onLoginSuccess(response);
      }, 500);
    } catch (err: any) {
      if (err.response && err.response.data && err.response.data.detail) {
        setErrorMessage(err.response.data.detail);
      } else {
        setErrorMessage("Registration failed. That username may already be in use.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const applySchoolPreset = () => {
    setOrgName("Delhi Public School");
    setOrgType("school");
    setOrgCode("DPS-CBSE");
    setRole("Senior School Teacher");
  };

  const applyCollegePreset = () => {
    setOrgName("ACE College of Engineering");
    setOrgType("college");
    setOrgCode("ACE-ENG");
    setRole("Associate Professor");
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        backgroundImage: "linear-gradient(rgba(248, 250, 252, 0.88), rgba(248, 250, 252, 0.94)), url('/login-bg.jpg')",
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
        padding: "1.5rem"
      }}
    >
      <div style={{ maxWidth: "440px", width: "100%" }}>
        {/* Brand Header */}
        <div style={{ textAlign: "center", marginBottom: "1.5rem" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "0.75rem", marginBottom: "0.35rem" }}>
            <img
              src="/niera-logo.png"
              alt="Niera Logo"
              style={{ width: "48px", height: "48px", objectFit: "contain" }}
              onError={(e) => {
                (e.target as HTMLElement).style.display = "none";
              }}
            />
            <h1
              style={{
                fontSize: "2.25rem",
                fontWeight: 800,
                letterSpacing: "-0.03em",
                color: "#0f172a",
                margin: 0
              }}
            >
              Niera
            </h1>
          </div>
          <p style={{ fontSize: "0.88rem", color: "#64748b", fontWeight: 500, margin: 0 }}>
            Effortless AI Exam Paper Checking & Marks Registers
          </p>
        </div>

        {/* Tab Switcher */}
        <div
          style={{
            display: "flex",
            background: "rgba(226, 232, 240, 0.85)",
            backdropFilter: "blur(8px)",
            padding: "0.25rem",
            borderRadius: "10px",
            marginBottom: "1rem"
          }}
        >
          <button
            type="button"
            onClick={() => { setActiveTab("login"); setErrorMessage(null); }}
            style={{
              flex: 1,
              padding: "0.55rem",
              border: "none",
              borderRadius: "8px",
              fontWeight: 700,
              fontSize: "0.88rem",
              cursor: "pointer",
              background: activeTab === "login" ? "#ffffff" : "transparent",
              color: activeTab === "login" ? "#0f172a" : "#64748b",
              boxShadow: activeTab === "login" ? "0 1px 3px rgba(0,0,0,0.1)" : "none",
              transition: "all 0.15s ease"
            }}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => { setActiveTab("register"); setErrorMessage(null); }}
            style={{
              flex: 1,
              padding: "0.55rem",
              border: "none",
              borderRadius: "8px",
              fontWeight: 700,
              fontSize: "0.88rem",
              cursor: "pointer",
              background: activeTab === "register" ? "#ffffff" : "transparent",
              color: activeTab === "register" ? "#0f172a" : "#64748b",
              boxShadow: activeTab === "register" ? "0 1px 3px rgba(0,0,0,0.1)" : "none",
              transition: "all 0.15s ease"
            }}
          >
            Create Account
          </button>
        </div>

        {/* Main Card */}
        <div
          style={{
            background: "rgba(255, 255, 255, 0.96)",
            backdropFilter: "blur(12px)",
            border: "1px solid rgba(226, 232, 240, 0.8)",
            borderRadius: "16px",
            padding: "1.75rem",
            boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.08)"
          }}
        >
          {errorMessage && (
            <div
              style={{
                background: "#fef2f2",
                border: "1px solid #fecaca",
                borderRadius: "8px",
                padding: "0.75rem",
                color: "#dc2626",
                fontSize: "0.85rem",
                marginBottom: "1.25rem"
              }}
            >
              {errorMessage}
            </div>
          )}

          {successMessage && (
            <div
              style={{
                background: "#f0fdf4",
                border: "1px solid #bbf7d0",
                borderRadius: "8px",
                padding: "0.75rem",
                color: "#16a34a",
                fontSize: "0.85rem",
                marginBottom: "1.25rem"
              }}
            >
              {successMessage}
            </div>
          )}

          {activeTab === "login" ? (
            <form onSubmit={handleLogin} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              {/* Quick Fill Preset */}
              <div
                style={{
                  background: "#f8fafc",
                  border: "1px solid #e2e8f0",
                  borderRadius: "8px",
                  padding: "0.55rem 0.75rem",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between"
                }}
              >
                <div style={{ fontSize: "0.78rem", color: "#64748b" }}>
                  Demo faculty login: <strong>test</strong> / <strong>test123</strong>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setLoginUsername("test");
                    setLoginPassword("test123");
                  }}
                  style={{
                    background: "#eff6ff",
                    border: "1px solid #bfdbfe",
                    color: "#1d4ed8",
                    padding: "0.2rem 0.5rem",
                    borderRadius: "4px",
                    fontSize: "0.72rem",
                    fontWeight: 700,
                    cursor: "pointer"
                  }}
                >
                  Auto-fill
                </button>
              </div>

              <div>
                <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 700, color: "#334155", marginBottom: "0.35rem" }}>
                  Username
                </label>
                <div style={{ position: "relative" }}>
                  <User size={16} style={{ position: "absolute", left: "0.85rem", top: "50%", transform: "translateY(-50%)", color: "#94a3b8" }} />
                  <input
                    type="text"
                    value={loginUsername}
                    onChange={(e) => setLoginUsername(e.target.value)}
                    placeholder="Enter your username"
                    required
                    style={{
                      width: "100%",
                      padding: "0.6rem 0.85rem 0.6rem 2.4rem",
                      borderRadius: "8px",
                      border: "1px solid #cbd5e1",
                      fontSize: "0.88rem"
                    }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 700, color: "#334155", marginBottom: "0.35rem" }}>
                  Password
                </label>
                <div style={{ position: "relative" }}>
                  <Lock size={16} style={{ position: "absolute", left: "0.85rem", top: "50%", transform: "translateY(-50%)", color: "#94a3b8" }} />
                  <input
                    type="password"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    placeholder="Enter your password"
                    required
                    style={{
                      width: "100%",
                      padding: "0.6rem 0.85rem 0.6rem 2.4rem",
                      borderRadius: "8px",
                      border: "1px solid #cbd5e1",
                      fontSize: "0.88rem"
                    }}
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                style={{
                  width: "100%",
                  padding: "0.75rem",
                  background: "#2563eb",
                  color: "#ffffff",
                  border: "none",
                  borderRadius: "8px",
                  fontWeight: 700,
                  fontSize: "0.95rem",
                  cursor: "pointer",
                  marginTop: "0.5rem",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "0.5rem",
                  boxShadow: "0 2px 6px rgba(37, 99, 235, 0.3)"
                }}
              >
                {isLoading ? "Signing In..." : "Sign In to Niera"}
                <ArrowRight size={16} />
              </button>
            </form>
          ) : (
            <form onSubmit={handleRegister} style={{ display: "flex", flexDirection: "column", gap: "0.85rem" }}>
              {/* Quick Preset Buttons */}
              <div>
                <div style={{ fontSize: "0.74rem", fontWeight: 700, color: "#64748b", marginBottom: "0.35rem" }}>
                  1-Click Organization Setup:
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.45rem" }}>
                  <button
                    type="button"
                    onClick={applySchoolPreset}
                    style={{
                      background: orgType === "school" ? "#eff6ff" : "#f8fafc",
                      border: `1px solid ${orgType === "school" ? "#2563eb" : "#cbd5e1"}`,
                      borderRadius: "6px",
                      padding: "0.35rem 0.45rem",
                      fontSize: "0.74rem",
                      fontWeight: 700,
                      color: orgType === "school" ? "#1d4ed8" : "#475569",
                      cursor: "pointer",
                      textAlign: "center"
                    }}
                  >
                    🏫 School (CBSE)
                  </button>
                  <button
                    type="button"
                    onClick={applyCollegePreset}
                    style={{
                      background: orgType === "college" ? "#eff6ff" : "#f8fafc",
                      border: `1px solid ${orgType === "college" ? "#2563eb" : "#cbd5e1"}`,
                      borderRadius: "6px",
                      padding: "0.35rem 0.45rem",
                      fontSize: "0.74rem",
                      fontWeight: 700,
                      color: orgType === "college" ? "#1d4ed8" : "#475569",
                      cursor: "pointer",
                      textAlign: "center"
                    }}
                  >
                    🎓 College (B.Tech)
                  </button>
                </div>
              </div>

              {/* Organization Name Field (Configured on Register) */}
              <div>
                <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 700, color: "#334155", marginBottom: "0.3rem" }}>
                  School or College Name <span style={{ color: "#ef4444" }}>*</span>
                </label>
                <div style={{ position: "relative" }}>
                  <Building2 size={16} style={{ position: "absolute", left: "0.85rem", top: "50%", transform: "translateY(-50%)", color: "#94a3b8" }} />
                  <input
                    type="text"
                    required
                    value={orgName}
                    onChange={(e) => setOrgName(e.target.value)}
                    placeholder="e.g. Delhi Public School"
                    style={{
                      width: "100%",
                      padding: "0.55rem 0.85rem 0.55rem 2.4rem",
                      borderRadius: "8px",
                      border: "1px solid #cbd5e1",
                      fontSize: "0.88rem"
                    }}
                  />
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
                <div>
                  <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 700, color: "#334155", marginBottom: "0.3rem" }}>
                    Username <span style={{ color: "#ef4444" }}>*</span>
                  </label>
                  <input
                    type="text"
                    value={regUsername}
                    onChange={(e) => setRegUsername(e.target.value)}
                    placeholder="username"
                    required
                    style={{
                      width: "100%",
                      padding: "0.55rem 0.75rem",
                      borderRadius: "8px",
                      border: "1px solid #cbd5e1",
                      fontSize: "0.85rem"
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 700, color: "#334155", marginBottom: "0.3rem" }}>
                    Password <span style={{ color: "#ef4444" }}>*</span>
                  </label>
                  <input
                    type="password"
                    value={regPassword}
                    onChange={(e) => setRegPassword(e.target.value)}
                    placeholder="min 4 chars"
                    required
                    style={{
                      width: "100%",
                      padding: "0.55rem 0.75rem",
                      borderRadius: "8px",
                      border: "1px solid #cbd5e1",
                      fontSize: "0.85rem"
                    }}
                  />
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1.2fr 0.8fr", gap: "0.75rem" }}>
                <div>
                  <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 700, color: "#334155", marginBottom: "0.3rem" }}>
                    Your Full Name / Teacher Title
                  </label>
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="e.g. Dr. Rajesh Sharma"
                    style={{
                      width: "100%",
                      padding: "0.55rem 0.75rem",
                      borderRadius: "8px",
                      border: "1px solid #cbd5e1",
                      fontSize: "0.85rem"
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 700, color: "#334155", marginBottom: "0.3rem" }}>
                    Email (Optional)
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="teacher@school.edu"
                    style={{
                      width: "100%",
                      padding: "0.55rem 0.75rem",
                      borderRadius: "8px",
                      border: "1px solid #cbd5e1",
                      fontSize: "0.85rem"
                    }}
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                style={{
                  width: "100%",
                  padding: "0.75rem",
                  background: "#2563eb",
                  color: "#ffffff",
                  border: "none",
                  borderRadius: "8px",
                  fontWeight: 700,
                  fontSize: "0.95rem",
                  cursor: "pointer",
                  marginTop: "0.4rem",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "0.5rem",
                  boxShadow: "0 2px 6px rgba(37, 99, 235, 0.3)"
                }}
              >
                {isLoading ? "Creating Account..." : "Create Account & Start"}
                <ArrowRight size={16} />
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
