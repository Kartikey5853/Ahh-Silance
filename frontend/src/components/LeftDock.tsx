import React, { useState, useEffect } from "react";
import {
  BookOpen,
  FileSpreadsheet,
  CheckCircle2,
  Users,
  Settings,
  Sparkles,
  LogOut,
  Menu,
  X
} from "lucide-react";
import { academicApi } from "../api/academicApi";
import type { Institution } from "../types/academic";

export type NavTab =
  | "dashboard"
  | "academics"
  | "students"
  | "exams"
  | "evaluation"
  | "profile"
  | "subject-detail";

interface LeftDockProps {
  activeTab: NavTab;
  onTabChange: (tab: NavTab) => void;
  onLogout: () => void;
  userName?: string;
  institutionName?: string;
  onOpenQuickCheck?: () => void;
}

export const LeftDock: React.FC<LeftDockProps> = ({
  activeTab,
  onTabChange,
  onLogout,
  userName = "Faculty",
  institutionName: propInstitutionName,
  onOpenQuickCheck
}) => {
  const [localInstitutionName, setLocalInstitutionName] = useState<string>("");
  const [mobileOpen, setMobileOpen] = useState<boolean>(false);

  useEffect(() => {
    Promise.all([
      academicApi.getProfile().catch(() => null),
      academicApi.listInstitutions().catch(() => [])
    ]).then(([prof, insts]: [any, Institution[]]) => {
      if (prof?.institution_id && insts?.length > 0) {
        const found = insts.find((i) => i.id === prof.institution_id);
        if (found) {
          setLocalInstitutionName(found.name);
          return;
        }
      }
      if (insts && insts.length > 0) {
        setLocalInstitutionName(insts[0].name);
      }
    }).catch(() => {});
  }, []);

  const displayOrgName = propInstitutionName || localInstitutionName || "Academic Portal";

  const navItems: {
    id: NavTab;
    label: string;
    icon: React.ReactNode;
  }[] = [
    {
      id: "dashboard",
      label: "My Classes",
      icon: <BookOpen size={19} />
    },
    {
      id: "exams",
      label: "Exams & Papers",
      icon: <FileSpreadsheet size={19} />
    },
    {
      id: "evaluation",
      label: "Evaluation Desk",
      icon: <CheckCircle2 size={19} />
    },
    {
      id: "students",
      label: "Marks Register",
      icon: <Users size={19} />
    },
    {
      id: "profile",
      label: "Settings",
      icon: <Settings size={19} />
    }
  ];

  const handleItemClick = (id: NavTab) => {
    onTabChange(id);
    setMobileOpen(false);
  };

  return (
    <>
      {/* Mobile Hamburger Toggle */}
      <button
        type="button"
        className="mobile-sidebar-toggle"
        onClick={() => setMobileOpen(!mobileOpen)}
        aria-label="Toggle navigation menu"
        style={{
          display: "none",
          position: "fixed",
          bottom: "1.25rem",
          left: "1.25rem",
          zIndex: 120,
          background: "#2563eb",
          color: "#ffffff",
          border: "none",
          borderRadius: "50%",
          width: "48px",
          height: "48px",
          alignItems: "center",
          justifyContent: "center",
          boxShadow: "0 4px 14px rgba(37, 99, 235, 0.4)",
          cursor: "pointer"
        }}
      >
        {mobileOpen ? <X size={22} /> : <Menu size={22} />}
      </button>

      {mobileOpen && (
        <div
          onClick={() => setMobileOpen(false)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(15, 23, 42, 0.45)",
            backdropFilter: "blur(4px)",
            zIndex: 90
          }}
        />
      )}

      {/* Persistent Left Dock */}
      <aside
        className={`niera-left-dock ${mobileOpen ? "mobile-open" : ""}`}
        style={{
          width: "250px",
          minWidth: "250px",
          height: "100vh",
          position: "sticky",
          top: 0,
          background: "#ffffff",
          borderRight: "1px solid #e2e8f0",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          zIndex: 100,
          userSelect: "none"
        }}
      >
        {/* Top: Brand & Action */}
        <div style={{ padding: "1.25rem 1rem 0.75rem 1rem" }}>
          {/* Logo & Title */}
          <div
            onClick={() => handleItemClick("dashboard")}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.65rem",
              cursor: "pointer",
              marginBottom: "1.25rem"
            }}
          >
            <div
              style={{
                width: "36px",
                height: "36px",
                borderRadius: "8px",
                background: "#2563eb",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#ffffff",
                overflow: "hidden"
              }}
            >
              <img
                src="/niera-logo.png"
                alt="Niera"
                style={{ width: "24px", height: "24px", objectFit: "contain" }}
              />
            </div>
            <div>
              <div
                style={{
                  fontWeight: 800,
                  fontSize: "1.2rem",
                  letterSpacing: "-0.03em",
                  color: "#0f172a",
                  lineHeight: 1.1
                }}
              >
                Niera
              </div>
              <div
                style={{
                  fontSize: "0.72rem",
                  color: "#64748b",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  maxWidth: "170px",
                  marginTop: "0.1rem",
                  fontWeight: 600
                }}
                title={displayOrgName}
              >
                {displayOrgName}
              </div>
            </div>
          </div>

          {/* Primary Action Button */}
          <button
            type="button"
            onClick={() => {
              if (onOpenQuickCheck) {
                onOpenQuickCheck();
              } else {
                handleItemClick("exams");
              }
            }}
            style={{
              width: "100%",
              background: "#2563eb",
              color: "#ffffff",
              border: "none",
              borderRadius: "8px",
              padding: "0.65rem 0.85rem",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "0.5rem",
              fontWeight: 700,
              fontSize: "0.85rem",
              cursor: "pointer",
              transition: "background 0.15s ease"
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "#1d4ed8")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "#2563eb")}
          >
            <Sparkles size={15} />
            <span>+ Check New Exam</span>
          </button>
        </div>

        {/* Navigation Menu */}
        <div style={{ flex: 1, padding: "0.5rem 0.75rem", overflowY: "auto" }}>
          <nav style={{ display: "flex", flexDirection: "column", gap: "0.2rem" }}>
            {navItems.map((item) => {
              const isActive =
                activeTab === item.id ||
                (item.id === "dashboard" && activeTab === "subject-detail") ||
                (item.id === "students" && activeTab === "academics");

              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleItemClick(item.id)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.75rem",
                    padding: "0.6rem 0.75rem",
                    borderRadius: "8px",
                    border: "none",
                    background: isActive ? "#eff6ff" : "transparent",
                    color: isActive ? "#1d4ed8" : "#475569",
                    cursor: "pointer",
                    textAlign: "left",
                    width: "100%",
                    fontWeight: isActive ? 700 : 500,
                    fontSize: "0.88rem",
                    transition: "all 0.15s ease"
                  }}
                  onMouseEnter={(e) => {
                    if (!isActive) {
                      e.currentTarget.style.background = "#f8fafc";
                      e.currentTarget.style.color = "#0f172a";
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive) {
                      e.currentTarget.style.background = "transparent";
                      e.currentTarget.style.color = "#475569";
                    }
                  }}
                >
                  <span
                    style={{
                      display: "flex",
                      alignItems: "center",
                      color: isActive ? "#2563eb" : "#64748b"
                    }}
                  >
                    {item.icon}
                  </span>
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Bottom Section: Single User Profile & Sign Out */}
        <div
          style={{
            padding: "0.85rem 1rem",
            borderTop: "1px solid #e2e8f0"
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between"
            }}
          >
            <div
              onClick={() => handleItemClick("profile")}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.55rem",
                cursor: "pointer",
                minWidth: 0,
                flex: 1
              }}
              title="View profile & settings"
            >
              <div
                style={{
                  width: "32px",
                  height: "32px",
                  borderRadius: "50%",
                  background: "#e2e8f0",
                  color: "#334155",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontWeight: 700,
                  fontSize: "0.82rem",
                  flexShrink: 0
                }}
              >
                {userName.charAt(0).toUpperCase()}
              </div>
              <div style={{ minWidth: 0 }}>
                <div
                  style={{
                    fontSize: "0.82rem",
                    fontWeight: 700,
                    color: "#0f172a",
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis"
                  }}
                >
                  {userName}
                </div>
                <div style={{ fontSize: "0.68rem", color: "#64748b" }}>
                  Educator
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={onLogout}
              title="Sign Out"
              style={{
                background: "transparent",
                border: "none",
                color: "#94a3b8",
                cursor: "pointer",
                padding: "0.35rem",
                borderRadius: "6px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                transition: "color 0.15s ease"
              }}
              onMouseEnter={(e) => (e.currentTarget.style.color = "#dc2626")}
              onMouseLeave={(e) => (e.currentTarget.style.color = "#94a3b8")}
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
};

export default LeftDock;
