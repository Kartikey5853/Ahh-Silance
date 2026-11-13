import React from "react";
import { ChevronRight, Calendar } from "lucide-react";
import type { NavTab } from "./LeftDock";

interface NavbarProps {
  onSelectTab: (tab: any) => void;
  activeTab: NavTab;
  onLogout: () => void;
  userName?: string;
  onOpenQuickCheck?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab
}) => {
  const getTabTitle = (tab: NavTab) => {
    switch (tab) {
      case "dashboard":
        return "My Classes & Subjects";
      case "exams":
        return "Exams & Question Papers";
      case "evaluation":
        return "Evaluation Desk";
      case "students":
        return "Marks Register";
      case "academics":
        return "Academics Hierarchy";
      case "profile":
        return "Settings & Organization";
      case "subject-detail":
        return "Subject Workspace";
      default:
        return "Faculty Console";
    }
  };

  return (
    <header
      className="niera-top-navbar"
      style={{
        background: "#ffffff",
        borderBottom: "1px solid #e2e8f0",
        padding: "0.75rem 1.75rem",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        position: "sticky",
        top: 0,
        zIndex: 40
      }}
    >
      {/* View Title & Breadcrumb */}
      <div style={{ display: "flex", alignItems: "center", gap: "0.45rem" }}>
        <span style={{ fontSize: "0.8rem", color: "#64748b", fontWeight: 600 }}>
          Faculty Desk
        </span>
        <ChevronRight size={14} style={{ color: "#94a3b8" }} />
        <h1
          style={{
            fontSize: "1.05rem",
            fontWeight: 800,
            color: "#0f172a",
            letterSpacing: "-0.02em",
            margin: 0
          }}
        >
          {getTabTitle(activeTab)}
        </h1>
      </div>

      {/* Right Side Session Tag */}
      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.35rem",
            background: "#f8fafc",
            border: "1px solid #e2e8f0",
            padding: "0.3rem 0.65rem",
            borderRadius: "6px",
            fontSize: "0.75rem",
            fontWeight: 600,
            color: "#475569"
          }}
        >
          <Calendar size={13} style={{ color: "#2563eb" }} />
          <span>Academic Year 2026-2027</span>
        </div>
      </div>
    </header>
  );
};
