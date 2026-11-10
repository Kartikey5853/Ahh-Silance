/**
 * Clean Academic Sign-In & Registration Portal.
 * 
 * Allows new users to create their own account from scratch or log into existing accounts.
 * Connects directly to SQLite authentication endpoints.
 */

import React, { useState } from "react";
import { authApi } from "../api/authApi";
import type { AuthResponse } from "../types/auth";
import {
  GraduationCap,
  Lock,
  User,
  ArrowRight,
  Key
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
  const [role, setRole] = useState("Professor");
  const [geminiApiKey, setGeminiApiKey] = useState("");

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
      const response = await authApi.register({
        username: regUsername.trim(),
        password: regPassword.trim(),
        full_name: fullName.trim() || regUsername.trim(),
        email: email.trim(),
        role: role,
        gemini_api_key: geminiApiKey.trim()
      });
      localStorage.setItem("auth_token", response.access_token);
      localStorage.setItem("auth_user", JSON.stringify(response));
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

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: "#f8fafc",
        padding: "1.5rem"
      }}
    >
      <div style={{ maxWidth: "440px", width: "100%" }}>
        {/* Brand Header */}
        <div style={{ textAlign: "center", marginBottom: "1.75rem" }}>
          <div
            style={{
              width: "56px",
              height: "56px",
              background: "#0f172a",
              color: "#ffffff",
              borderRadius: "14px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 1rem",
              boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)"
            }}
          >
            <GraduationCap size={28} />
          </div>
          <h1
            style={{
              fontSize: "1.75rem",
              fontWeight: 800,
              letterSpacing: "-0.03em",
              color: "#0f172a",
              marginBottom: "0.25rem"
            }}
          >
            Academic Grading Platform
          </h1>
          <p style={{ fontSize: "0.88rem", color: "#64748b", fontWeight: 500 }}>
            Automated examination scanning, digital papers & strict evaluation
          </p>
        </div>

        {/* Tab Switcher */}
        <div
          style={{
            display: "flex",
            background: "#e2e8f0",
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
            background: "#ffffff",
            border: "1px solid #e2e8f0",
            borderRadius: "16px",
            padding: "2rem",
            boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.05)"
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
                      fontSize: "0.9rem"
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
                      fontSize: "0.9rem"
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
                  background: "#0f172a",
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
                  gap: "0.5rem"
                }}
              >
                {isLoading ? "Signing In..." : "Sign In"}
                <ArrowRight size={16} />
              </button>
            </form>
          ) : (
            <form onSubmit={handleRegister} style={{ display: "flex", flexDirection: "column", gap: "0.85rem" }}>
              <div>
                <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 700, color: "#334155", marginBottom: "0.3rem" }}>
                  Username <span style={{ color: "#ef4444" }}>*</span>
                </label>
                <div style={{ position: "relative" }}>
                  <User size={16} style={{ position: "absolute", left: "0.85rem", top: "50%", transform: "translateY(-50%)", color: "#94a3b8" }} />
                  <input
                    type="text"
                    value={regUsername}
                    onChange={(e) => setRegUsername(e.target.value)}
                    placeholder="e.g. dr_sharma"
                    required
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

              <div>
                <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 700, color: "#334155", marginBottom: "0.3rem" }}>
                  Password <span style={{ color: "#ef4444" }}>*</span>
                </label>
                <div style={{ position: "relative" }}>
                  <Lock size={16} style={{ position: "absolute", left: "0.85rem", top: "50%", transform: "translateY(-50%)", color: "#94a3b8" }} />
                  <input
                    type="password"
                    value={regPassword}
                    onChange={(e) => setRegPassword(e.target.value)}
                    placeholder="At least 4 characters"
                    required
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

              <div>
                <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 700, color: "#334155", marginBottom: "0.3rem" }}>
                  Full Name / Title
                </label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="e.g. Dr. Rajesh Sharma"
                  style={{
                    width: "100%",
                    padding: "0.55rem 0.85rem",
                    borderRadius: "8px",
                    border: "1px solid #cbd5e1",
                    fontSize: "0.88rem"
                  }}
                />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
                <div>
                  <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 700, color: "#334155", marginBottom: "0.3rem" }}>
                    Role
                  </label>
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "0.55rem 0.85rem",
                      borderRadius: "8px",
                      border: "1px solid #cbd5e1",
                      fontSize: "0.88rem",
                      background: "#ffffff"
                    }}
                  >
                    <option value="Professor">Professor</option>
                    <option value="Associate Professor">Associate Professor</option>
                    <option value="School Teacher">School Teacher</option>
                    <option value="JEE / Competitive Faculty">JEE Faculty</option>
                    <option value="Examiner / Evaluator">Examiner</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 700, color: "#334155", marginBottom: "0.3rem" }}>
                    Email
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="prof@univ.edu"
                    style={{
                      width: "100%",
                      padding: "0.55rem 0.85rem",
                      borderRadius: "8px",
                      border: "1px solid #cbd5e1",
                      fontSize: "0.88rem"
                    }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "0.8rem", fontWeight: 700, color: "#334155", marginBottom: "0.3rem" }}>
                  <span>Gemini API Key</span>
                  <span style={{ fontSize: "0.72rem", color: "#64748b", fontWeight: 500 }}>Optional (can add later)</span>
                </label>
                <div style={{ position: "relative" }}>
                  <Key size={16} style={{ position: "absolute", left: "0.85rem", top: "50%", transform: "translateY(-50%)", color: "#94a3b8" }} />
                  <input
                    type="password"
                    value={geminiApiKey}
                    onChange={(e) => setGeminiApiKey(e.target.value)}
                    placeholder="AIzaSy... (from Google AI Studio)"
                    style={{
                      width: "100%",
                      padding: "0.55rem 0.85rem 0.55rem 2.4rem",
                      borderRadius: "8px",
                      border: "1px solid #cbd5e1",
                      fontSize: "0.88rem",
                      fontFamily: "monospace"
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
                  gap: "0.5rem"
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
