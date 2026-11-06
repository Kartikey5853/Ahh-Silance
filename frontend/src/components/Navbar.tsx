/**
 * Primary Application Navigation Bar.
 * 
 * Displays the system title 'Ahh Silance!!!', active user authentication status,
 * navigation tabs between evaluation hub and history, and session termination controls.
 */

import React from "react";
import { LogOut, CheckCircle, FileText, History } from "lucide-react";
import { authApi } from "../api/authApi";

interface NavbarProps {
  /** Active page view selector */
  activeTab: "dashboard" | "history" | "result";
  /** Callback to switch top-level page views */
  onSelectTab: (tab: "dashboard" | "history") => void;
  /** Current logged in username */
  username: string;
  /** Callback invoked on user logout */
  onLogout: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  onSelectTab,
  username,
  onLogout
}) => {
  /**
   * Logs out the user and cleans up browser storage tokens.
   */
  const handleLogout = () => {
    authApi.logout();
    onLogout();
  };

  return (
    <header className="navbar">
      <div className="navbar-inner">
        <a href="#home" onClick={(e) => { e.preventDefault(); onSelectTab("dashboard"); }} className="brand-logo">
          <span>Ahh Silance!!!</span>
        </a>

        <nav className="nav-links">
          <button
            type="button"
            className={`nav-link btn-secondary ${activeTab === "dashboard" ? "active" : ""}`}
            onClick={() => onSelectTab("dashboard")}
            style={{ border: "none" }}
          >
            <FileText size={16} />
            Evaluate Sheet
          </button>

          <button
            type="button"
            className={`nav-link btn-secondary ${activeTab === "history" ? "active" : ""}`}
            onClick={() => onSelectTab("history")}
            style={{ border: "none" }}
          >
            <History size={16} />
            History
          </button>

          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", borderLeft: "1px solid var(--border-color)", paddingLeft: "1rem" }}>
            <span style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--text-secondary)", display: "flex", alignItems: "center", gap: "0.35rem" }}>
              <CheckCircle size={14} color="var(--green)" />
              {username}
            </span>

            <button
              type="button"
              className="btn btn-secondary"
              onClick={handleLogout}
              title="Sign out"
              style={{ padding: "0.35rem 0.65rem", fontSize: "0.8rem" }}
            >
              <LogOut size={14} />
              Sign Out
            </button>
          </div>
        </nav>
      </div>
    </header>
  );
};
