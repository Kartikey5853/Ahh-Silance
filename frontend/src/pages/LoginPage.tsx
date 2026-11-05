/**
 * User Authentication and Sign-In Page.
 * 
 * Provides a clean, distraction-free white background login screen displaying
 * the brand logo 'Ahh Silance!!!' and pre-seeded test user credentials (test / test123).
 */

import React, { useState } from "react";
import { authApi } from "../api/authApi";
import type { AuthResponse } from "../types/auth";
import { Lock, User, ArrowRight, AlertCircle, Info } from "lucide-react";

interface LoginPageProps {
  /** Callback fired upon successful credential verification and token issuance */
  onLoginSuccess: (authData: AuthResponse) => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onLoginSuccess }) => {
  const [username, setUsername] = useState("test");
  const [password, setPassword] = useState("test123");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  /**
   * Submits credentials to backend /api/v1/auth/login and stores token on success.
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setIsLoading(true);

    try {
      const response = await authApi.login({ username, password });
      localStorage.setItem("auth_token", response.access_token);
      localStorage.setItem("auth_user", JSON.stringify(response));
      onLoginSuccess(response);
    } catch (err: any) {
      if (err.response && err.response.data && err.response.data.detail) {
        setErrorMessage(err.response.data.detail);
      } else {
        setErrorMessage("Unable to connect to the evaluation server. Ensure backend is running on port 8000.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Populates default test user credentials for immediate 1-click login.
   */
  const handleQuickFill = () => {
    setUsername("test");
    setPassword("test123");
    setErrorMessage(null);
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: "#ffffff",
        padding: "1.5rem"
      }}
    >
      <div style={{ maxWidth: "420px", width: "100%" }}>
        {/* Brand Header */}
        <div style={{ textAlign: "center", marginBottom: "2rem" }}>
          <h1
            style={{
              fontSize: "2.25rem",
              fontWeight: 800,
              letterSpacing: "-0.04em",
              color: "var(--text-primary)",
              marginBottom: "0.25rem"
            }}
          >
            Ahh Silance!!!
          </h1>
          <p style={{ fontSize: "0.95rem", color: "var(--text-secondary)", fontWeight: 500 }}>
            Automated JEE Evaluation Engine
          </p>
        </div>

        {/* Credentials Form Box */}
        <div className="card" style={{ padding: "2rem" }}>
          <div style={{ marginBottom: "1.5rem" }}>
            <h2 style={{ fontSize: "1.25rem", fontWeight: 700, color: "var(--text-primary)" }}>
              Sign In
            </h2>
            <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", marginTop: "0.25rem" }}>
              Access the evaluation console to scan and score test sheets.
            </p>
          </div>

          {/* Test Credentials Helper Pill */}
          <div
            onClick={handleQuickFill}
            style={{
              background: "var(--bg-secondary)",
              border: "1px solid var(--border-color)",
              borderRadius: "6px",
              padding: "0.75rem",
              marginBottom: "1.5rem",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "0.6rem"
            }}
            title="Click to auto-fill test credentials"
          >
            <Info size={16} color="var(--blue)" style={{ flexShrink: 0 }} />
            <div style={{ fontSize: "0.82rem" }}>
              <span style={{ fontWeight: 600, color: "var(--text-primary)" }}>Test Credentials: </span>
              <code style={{ fontFamily: "var(--font-mono)", background: "#ffffff", padding: "0.15rem 0.35rem", borderRadius: "3px", border: "1px solid var(--border-color)" }}>test</code> / <code style={{ fontFamily: "var(--font-mono)", background: "#ffffff", padding: "0.15rem 0.35rem", borderRadius: "3px", border: "1px solid var(--border-color)" }}>test123</code>
            </div>
          </div>

          {errorMessage && (
            <div
              style={{
                backgroundColor: "var(--red-bg)",
                border: "1px solid var(--red)",
                borderRadius: "6px",
                padding: "0.75rem",
                color: "var(--red)",
                fontSize: "0.85rem",
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
                marginBottom: "1.25rem"
              }}
            >
              <AlertCircle size={16} style={{ flexShrink: 0 }} />
              <span>{errorMessage}</span>
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label" htmlFor="username">
                Username
              </label>
              <div style={{ position: "relative" }}>
                <input
                  id="username"
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="form-input"
                  style={{ paddingLeft: "2.25rem" }}
                  placeholder="Enter username"
                />
                <User
                  size={16}
                  style={{ position: "absolute", left: "0.75rem", top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }}
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="password">
                Password
              </label>
              <div style={{ position: "relative" }}>
                <input
                  id="password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="form-input"
                  style={{ paddingLeft: "2.25rem" }}
                  placeholder="Enter password"
                />
                <Lock
                  size={16}
                  style={{ position: "absolute", left: "0.75rem", top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="btn btn-primary"
              style={{ width: "100%", marginTop: "0.5rem" }}
            >
              {isLoading ? "Signing in..." : "Continue to Dashboard"}
              {!isLoading && <ArrowRight size={16} />}
            </button>
          </form>
        </div>

        <div style={{ textAlign: "center", marginTop: "1.5rem", fontSize: "0.78rem", color: "var(--text-muted)" }}>
          Strict NTA Scoring Standard • Fast Local Edge Engine
        </div>
      </div>
    </div>
  );
};
