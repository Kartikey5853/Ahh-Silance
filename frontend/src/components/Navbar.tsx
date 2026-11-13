import React from "react";
import { MessageCircle, Calendar, ChevronRight } from "lucide-react";
import type { NavTab } from "./LeftDock";

interface NavbarProps {
  onSelectTab: (tab: any) => void;
  activeTab: NavTab;
  onLogout: () => void;
  userName?: string;
  onOpenQuickCheck?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  onSelectTab,
  activeTab,
  userName = "Faculty"
}) => {
  const getTabTitle = (tab: NavTab) => {
    switch (tab) {
      case "dashboard":
        return { title: "My Classes & Subjects", subtitle: "Sections, courses, and exam checking" };
      case "exams":
        return { title: "Exams & Question Papers", subtitle: "Answer keys, rubrics, and scanning" };
      case "evaluation":
        return { title: "Evaluation Desk", subtitle: "Magic Ink grading, handwriting OCR, and mark adjustments" };
      case "students":
        return { title: "Marks Register & Students", subtitle: "Award list, Excel export, and institution roster" };
      case "academics":
        return { title: "Academics & Curriculum", subtitle: "Class levels, semesters, and departments" };
      case "profile":
        return { title: "Settings & Profile", subtitle: "Teacher account and institution preferences" };
      case "subject-detail":
        return { title: "Subject Workspace", subtitle: "Exams, roster, and syllabus overview" };
      default:
        return { title: "Faculty Console", subtitle: "AI-assisted academic evaluation" };
    }
  };

  const current = getTabTitle(activeTab);

  return (
    <header
      className="niera-top-navbar"
      style={{
        background: "#ffffff",
        borderBottom: "1px solid #e2e8f0",
        padding: "0.85rem 1.75rem",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        position: "sticky",
        top: 0,
        zIndex: 40,
        boxShadow: "0 1px 2px 0 rgba(0, 0, 0, 0.02)"
      }}
    >
      {/* View Title & Breadcrumb */}
      <div>
        <div style={{ display: "flex", alignItems: "center", gap: "0.45rem" }}>
          <span style={{ fontSize: "0.78rem", fontWeight: 700, color: "#64748b" }}>
            Faculty Desk
          </span>
          <ChevronRight size={13} style={{ color: "#94a3b8" }} />
          <h1
            style={{
              fontSize: "1.1rem",
              fontWeight: 800,
              color: "#0f172a",
              letterSpacing: "-0.02em",
              margin: 0
            }}
          >
            {current.title}
          </h1>
        </div>
        <div style={{ fontSize: "0.74rem", color: "#64748b", marginTop: "1px" }}>
          {current.subtitle}
        </div>
      </div>

      {/* Right Side Utility Pills */}
      <div style={{ display: "flex", alignItems: "center", gap: "0.85rem" }}>
        {/* Academic Session Pill */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.35rem",
            background: "#f8fafc",
            border: "1px solid #e2e8f0",
            padding: "0.35rem 0.65rem",
            borderRadius: "6px",
            fontSize: "0.78rem",
            fontWeight: 600,
            color: "#475569"
          }}
        >
          <Calendar size={13} style={{ color: "#2563eb" }} />
          <span>Session 2026-2027</span>
        </div>

        {/* WhatsApp Help Quick Pill */}
        <a
          href="https://wa.me/919999999999?text=Hello%20Niera%20Support%2C%20I%20am%20a%20teacher%20and%20need%20quick%20help."
          target="_blank"
          rel="noopener noreferrer"
          title="Instant Teacher WhatsApp Support"
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.35rem",
            background: "#f0fdf4",
            border: "1px solid #bbf7d0",
            padding: "0.35rem 0.65rem",
            borderRadius: "6px",
            fontSize: "0.78rem",
            fontWeight: 700,
            color: "#166534",
            textDecoration: "none"
          }}
        >
          <MessageCircle size={14} style={{ color: "#16a34a" }} />
          <span>Teacher Support</span>
        </a>

        {/* User Profile Avatar Link */}
        <button
          type="button"
          onClick={() => onSelectTab("profile")}
          style={{
            background: "none",
            border: "none",
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
            cursor: "pointer",
            padding: "0.25rem 0.5rem",
            borderRadius: "6px"
          }}
        >
          <div
            style={{
              width: "28px",
              height: "28px",
              borderRadius: "50%",
              background: "#2563eb",
              color: "#ffffff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "0.78rem",
              fontWeight: 800
            }}
          >
            {userName.charAt(0).toUpperCase()}
          </div>
          <span style={{ fontSize: "0.85rem", fontWeight: 700, color: "#1e293b" }}>
            {userName}
          </span>
        </button>
      </div>
    </header>
  );
};
