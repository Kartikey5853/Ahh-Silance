import React, { useState, useEffect } from "react";
import {
  BookOpen,
  FileSpreadsheet,
  Users,
  Settings,
  LogOut,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  CheckSquare
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
  | "subject-detail"
  | "admin";

interface LeftDockProps {
  activeTab: NavTab;
  onTabChange: (tab: NavTab) => void;
  onLogout: () => void;
  userName?: string;
  userRole?: string;
  institutionName?: string;
  onOpenQuickCheck?: () => void;
}

export const LeftDock: React.FC<LeftDockProps> = ({
  activeTab,
  onTabChange,
  onLogout,
  userName = "Faculty",
  userRole,
  institutionName: propInstitutionName
}) => {
  const [localInstitutionName, setLocalInstitutionName] = useState<string>("");
  const [localUserRole, setLocalUserRole] = useState<string>("");
  const [isCollapsed, setIsCollapsed] = useState<boolean>(false);

  useEffect(() => {
    Promise.all([
      academicApi.getProfile().catch(() => null),
      academicApi.listInstitutions().catch(() => [])
    ]).then(([prof, insts]: [any, Institution[]]) => {
      if (prof?.role) {
        setLocalUserRole(prof.role);
      }
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
  const effectiveRole = userRole || localUserRole || "";
  const isAdmin =
    effectiveRole.toLowerCase().trim() === "admin" ||
    userName.toLowerCase().trim() === "admin";

  // Unified, uncluttered navigation items
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
      label: "Check Test Desk",
      icon: <CheckSquare size={19} />
    },
    {
      id: "students",
      label: "Marks Register",
      icon: <Users size={19} />
    },
    ...(isAdmin
      ? [
          {
            id: "admin" as NavTab,
            label: "Admin Console",
            icon: <ShieldCheck size={19} />
          }
        ]
      : []),
    {
      id: "profile",
      label: "Settings",
      icon: <Settings size={19} />
    }
  ];

  const handleItemClick = (id: NavTab) => {
    onTabChange(id);
  };

  return (
    <>
      {/* Mobile Top App Bar with Branding & Quick Profile / Logout */}
      <header className="niera-mobile-topbar">
        <div style={{ display: "flex", alignItems: "center", gap: "0.55rem" }}>
          <div
            style={{
              width: "30px",
              height: "30px",
              borderRadius: "8px",
              background: "#ffffff",
              border: "1px solid #e2e8f0",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              overflow: "hidden"
            }}
          >
            <img
              src="/niera-logo.png"
              alt="Niera"
              style={{ width: "20px", height: "20px", objectFit: "contain" }}
            />
          </div>
          <div>
            <div style={{ fontSize: "0.95rem", fontWeight: 800, color: "#0f172a", lineHeight: 1.1 }}>
              Niera
            </div>
            <div style={{ fontSize: "0.65rem", color: "#64748b", fontWeight: 600, maxWidth: "150px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {displayOrgName}
            </div>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
          <button
            type="button"
            onClick={() => handleItemClick("profile")}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.35rem",
              background: activeTab === "profile" ? "#eff6ff" : "#f8fafc",
              border: "1px solid #e2e8f0",
              borderRadius: "20px",
              padding: "0.25rem 0.6rem",
              cursor: "pointer"
            }}
          >
            <div
              style={{
                width: "22px",
                height: "22px",
                borderRadius: "50%",
                background: "#2563eb",
                color: "#ffffff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontWeight: 700,
                fontSize: "0.72rem"
              }}
            >
              {userName.charAt(0).toUpperCase()}
            </div>
            <span style={{ fontSize: "0.75rem", fontWeight: 700, color: "#334155" }}>
              {userName.split(" ")[0]}
            </span>
          </button>

          <button
            type="button"
            onClick={onLogout}
            title="Sign Out"
            style={{
              background: "#f8fafc",
              border: "1px solid #e2e8f0",
              borderRadius: "8px",
              padding: "0.35rem",
              color: "#64748b",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center"
            }}
          >
            <LogOut size={16} />
          </button>
        </div>
      </header>

      {/* Mobile Bottom Dock Navigation Bar */}
      <nav className="niera-bottom-dock" aria-label="Mobile Navigation">
        {navItems.map((item) => {
          const isActive =
            activeTab === item.id ||
            (item.id === "exams" && activeTab === "evaluation") ||
            (item.id === "dashboard" && activeTab === "subject-detail") ||
            (item.id === "students" && activeTab === "academics");

          return (
            <button
              key={item.id}
              type="button"
              className={`niera-dock-item ${isActive ? "active" : ""}`}
              onClick={() => handleItemClick(item.id)}
              aria-label={item.label}
            >
              <span className="niera-dock-icon">{item.icon}</span>
              <span className="niera-dock-label">{item.label}</span>
              {isActive && <span className="niera-dock-indicator" />}
            </button>
          );
        })}
      </nav>

      {/* Desktop Persistent Rounded & Collapsible Left Dock */}
      <aside
        className="niera-left-dock"
        style={{
          width: isCollapsed ? "72px" : "240px",
          minWidth: isCollapsed ? "72px" : "240px",
          height: "calc(100vh - 1.5rem)",
          margin: "0.75rem 0 0.75rem 0.75rem",
          position: "sticky",
          top: "0.75rem",
          background: "#ffffff",
          border: "1px solid #e2e8f0",
          borderRadius: "16px",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          zIndex: 100,
          userSelect: "none",
          transition: "width 0.2s ease, min-width 0.2s ease",
          boxShadow: "0 2px 8px rgba(0, 0, 0, 0.04)"
        }}
      >
        {/* Top: Brand Header & Collapse Toggle */}
        <div style={{ padding: isCollapsed ? "1rem 0.5rem" : "1.1rem 1rem 0.75rem 1rem" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: isCollapsed ? "center" : "space-between",
              marginBottom: "0.75rem"
            }}
          >
            {/* Logo & Title */}
            <div
              onClick={() => handleItemClick("dashboard")}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.65rem",
                cursor: "pointer",
                minWidth: 0
              }}
              title="Niera Academic Portal"
            >
              {/* White background logo box because the logo itself is blue */}
              <div
                style={{
                  width: "38px",
                  height: "38px",
                  borderRadius: "10px",
                  background: "#ffffff",
                  border: "1px solid #e2e8f0",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  overflow: "hidden",
                  boxShadow: "0 1px 3px rgba(0, 0, 0, 0.04)",
                  flexShrink: 0
                }}
              >
                <img
                  src="/niera-logo.png"
                  alt="Niera"
                  style={{ width: "26px", height: "26px", objectFit: "contain" }}
                />
              </div>

              {!isCollapsed && (
                <div style={{ minWidth: 0 }}>
                  <div
                    style={{
                      fontWeight: 800,
                      fontSize: "1.18rem",
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
                      maxWidth: "140px",
                      marginTop: "0.1rem",
                      fontWeight: 600
                    }}
                    title={displayOrgName}
                  >
                    {displayOrgName}
                  </div>
                </div>
              )}
            </div>

            {/* Collapse / Expand Toggle Button */}
            {!isCollapsed && (
              <button
                type="button"
                onClick={() => setIsCollapsed(true)}
                title="Collapse Sidebar"
                style={{
                  background: "#f8fafc",
                  border: "1px solid #e2e8f0",
                  borderRadius: "6px",
                  padding: "0.3rem",
                  color: "#64748b",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center"
                }}
              >
                <ChevronLeft size={15} />
              </button>
            )}
          </div>

          {isCollapsed && (
            <div style={{ display: "flex", justifyContent: "center", marginTop: "0.4rem" }}>
              <button
                type="button"
                onClick={() => setIsCollapsed(false)}
                title="Expand Sidebar"
                style={{
                  background: "#f8fafc",
                  border: "1px solid #e2e8f0",
                  borderRadius: "6px",
                  padding: "0.3rem",
                  color: "#64748b",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center"
                }}
              >
                <ChevronRight size={15} />
              </button>
            </div>
          )}
        </div>

        {/* Navigation Menu */}
        <div style={{ flex: 1, padding: isCollapsed ? "0.5rem 0.4rem" : "0.5rem 0.75rem", overflowY: "auto" }}>
          <nav style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
            {navItems.map((item) => {
              const isActive =
                activeTab === item.id ||
                (item.id === "exams" && activeTab === "evaluation") ||
                (item.id === "dashboard" && activeTab === "subject-detail") ||
                (item.id === "students" && activeTab === "academics");

              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleItemClick(item.id)}
                  title={item.label}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: isCollapsed ? "center" : "flex-start",
                    gap: isCollapsed ? "0" : "0.75rem",
                    padding: isCollapsed ? "0.65rem" : "0.65rem 0.75rem",
                    borderRadius: "10px",
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
                      justifyContent: "center",
                      color: isActive ? "#2563eb" : "#64748b"
                    }}
                  >
                    {item.icon}
                  </span>
                  {!isCollapsed && <span>{item.label}</span>}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Bottom Section: Single User Profile & Sign Out */}
        <div
          style={{
            padding: isCollapsed ? "0.75rem 0.4rem" : "0.85rem 1rem",
            borderTop: "1px solid #e2e8f0"
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: isCollapsed ? "center" : "space-between",
              gap: isCollapsed ? "0" : "0.5rem"
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
                flex: isCollapsed ? "none" : 1
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
              {!isCollapsed && (
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
              )}
            </div>

            {!isCollapsed && (
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
            )}
          </div>
        </div>
      </aside>
    </>
  );
};

export default LeftDock;