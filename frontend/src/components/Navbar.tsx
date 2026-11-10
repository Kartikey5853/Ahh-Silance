/**
 * Primary Application Header for ACE College of Engineering.
 * 
 * Clean, uncluttered navigation showing institution title, faculty session, and sign-out.
 */

import React from "react";
import { LogOut, User } from "lucide-react";

interface NavbarProps {
  onSelectTab: (tab: any) => void;
  activeTab: string;
  onLogout: () => void;
  userName?: string;
}

export const Navbar: React.FC<NavbarProps> = ({
  onSelectTab,
  onLogout,
  userName = "Faculty"
}) => {
  return (
    <header className="navbar" style={{ background: "#ffffff", borderBottom: "1px solid #e2e8f0" }}>
      <div className="navbar-inner" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0.85rem 1.5rem" }}>
        <a
          href="#dashboard"
          onClick={(e) => {
            e.preventDefault();
            onSelectTab("dashboard");
          }}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.65rem",
            textDecoration: "none",
            color: "#0f172a"
          }}
        >
          <img
            src="/niera.svg"
            alt="Niera Logo"
            style={{ width: "32px", height: "32px", objectFit: "contain" }}
          />
          <span style={{ fontWeight: 800, fontSize: "1.3rem", color: "#0f172a", letterSpacing: "-0.02em" }}>
            Niera
          </span>
        </a>

        <div style={{ display: "flex", alignItems: "center", gap: "1.25rem" }}>
          <button
            type="button"
            onClick={() => onSelectTab("profile")}
            style={{
              background: "none",
              border: "none",
              display: "flex",
              alignItems: "center",
              gap: "0.45rem",
              cursor: "pointer",
              color: "#334155",
              fontSize: "0.88rem",
              fontWeight: 600,
              padding: "0.35rem 0.65rem",
              borderRadius: "6px"
            }}
          >
            <User size={16} style={{ color: "#2563eb" }} />
            <span>{userName}</span>
          </button>

          <button
            type="button"
            onClick={onLogout}
            style={{
              background: "#f1f5f9",
              border: "1px solid #e2e8f0",
              color: "#475569",
              padding: "0.35rem 0.75rem",
              borderRadius: "6px",
              fontSize: "0.82rem",
              fontWeight: 600,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "0.35rem"
            }}
          >
            <LogOut size={14} />
            <span>Sign Out</span>
          </button>
        </div>
      </div>
    </header>
  );
};
