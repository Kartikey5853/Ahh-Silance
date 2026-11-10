/**
 * Primary Application Header for ACE College of Engineering.
 * 
 * Clean, uncluttered navigation showing institution title, faculty session, and sign-out.
 */

import React from "react";
import { GraduationCap, LogOut, User } from "lucide-react";

interface NavbarProps {
  onSelectTab: (tab: any) => void;
  activeTab: string;
  onLogout: () => void;
  userName?: string;
}

export const Navbar: React.FC<NavbarProps> = ({
  onSelectTab,
  onLogout,
  userName = "Professor"
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
            gap: "0.6rem",
            textDecoration: "none",
            color: "#0f172a"
          }}
        >
          <div
            style={{
              width: "34px",
              height: "34px",
              borderRadius: "8px",
              background: "#0f172a",
              color: "#ffffff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center"
            }}
          >
            <GraduationCap size={20} />
          </div>
          <div>
            <div style={{ fontWeight: 800, fontSize: "1.1rem", lineHeight: 1.1 }}>
              ACE College of Engineering
            </div>
            <div style={{ fontSize: "0.72rem", color: "#64748b", fontWeight: 500 }}>
              Academic Portal
            </div>
          </div>
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
            title="Sign out of ACE Portal"
          >
            <LogOut size={14} />
            <span>Sign Out</span>
          </button>
        </div>
      </div>
    </header>
  );
};
