/**
 * Primary Application Navigation Bar.
 * 
 * Clean, distraction-free header displaying the system branding 'Ahh Silance!!!'
 * and navigation tabs for evaluation and results.
 */

import React from "react";
import { FileText, Award } from "lucide-react";

interface NavbarProps {
  /** Active page view selector */
  activeTab: "dashboard" | "history" | "result";
  /** Callback to switch top-level page views */
  onSelectTab: (tab: "dashboard" | "history") => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  onSelectTab,
}) => {
  return (
    <header className="navbar">
      <div className="navbar-inner">
        <a
          href="#home"
          onClick={(e) => {
            e.preventDefault();
            onSelectTab("dashboard");
          }}
          className="brand-logo"
        >
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

          {activeTab === "result" && (
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "0.35rem",
                fontSize: "0.85rem",
                fontWeight: 600,
                color: "var(--blue)",
                backgroundColor: "rgba(37, 99, 235, 0.08)",
                padding: "0.3rem 0.75rem",
                borderRadius: "9999px"
              }}
            >
              <Award size={14} />
              Active Scorecard
            </span>
          )}
        </nav>
      </div>
    </header>
  );
};
