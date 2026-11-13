import React, { useState, useEffect } from "react";
import {
  BookOpen,
  FileSpreadsheet,
  CheckCircle2,
  Users,
  User,
  Sparkles,
  LogOut,
  Building2,
  ChevronRight,
  Menu,
  X,
  MessageCircle
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
  onOpenQuickCheck?: () => void;
}

export const LeftDock: React.FC<LeftDockProps> = ({
  activeTab,
  onTabChange,
  onLogout,
  userName = "Faculty",
  onOpenQuickCheck
}) => {
  const [institutionName, setInstitutionName] = useState<string>("Niera Campus");
  const [institutionType, setInstitutionType] = useState<string>("School / College");
  const [mobileOpen, setMobileOpen] = useState<boolean>(false);

  useEffect(() => {
    academicApi
      .listInstitutions()
      .then((insts: Institution[]) => {
        if (insts && insts.length > 0) {
          setInstitutionName(insts[0].name);
          setInstitutionType(
            insts[0].type === "college"
              ? "College / University"
              : insts[0].type === "school"
              ? "School (CBSE / ICSE)"
              : "Competitive / JEE"
          );
        }
      })
      .catch(() => {});
  }, []);

  const navItems: {
    id: NavTab;
    label: string;
    description: string;
    icon: React.ReactNode;
    badge?: string;
  }[] = [
    {
      id: "dashboard",
      label: "My Classes",
      description: "Sections & subjects",
      icon: <BookOpen size={20} />
    },
    {
      id: "exams",
      label: "Exams & Papers",
      description: "Question papers & keys",
      icon: <FileSpreadsheet size={20} />
    },
    {
      id: "evaluation",
      label: "Evaluation Desk",
      description: "AI grading & Magic Ink",
      icon: <CheckCircle2 size={20} />,
      badge: "AI"
    },
    {
      id: "students",
      label: "Marks Register",
      description: "Roster & award lists",
      icon: <Users size={20} />
    },
    {
      id: "profile",
      label: "Settings",
      description: "Faculty & preferences",
      icon: <User size={20} />
    }
  ];

  const handleItemClick = (id: NavTab) => {
    onTabChange(id);
    setMobileOpen(false);
  };

  return (
    <>
      {/* Mobile Hamburger Trigger */}
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

      {/* Backdrop for mobile */}
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

      {/* Left Dock Sidebar */}
      <aside
        className={`niera-left-dock ${mobileOpen ? "mobile-open" : ""}`}
        style={{
          width: "260px",
          minWidth: "260px",
          height: "100vh",
          position: "sticky",
          top: 0,
          background: "#ffffff",
          borderRight: "1px solid #e2e8f0",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          zIndex: 100,
          boxShadow: "1px 0 3px rgba(0,0,0,0.02)",
          userSelect: "none"
        }}
      >
        {/* Top: Brand & Quick Action */}
        <div style={{ padding: "1.25rem 1.15rem 0.75rem 1.15rem" }}>
          {/* Brand Logo & Name */}
          <div
            onClick={() => handleItemClick("dashboard")}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.75rem",
              cursor: "pointer",
              marginBottom: "1.15rem"
            }}
          >
            <div
              style={{
                width: "42px",
                height: "42px",
                borderRadius: "10px",
                background: "linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#ffffff",
                boxShadow: "0 4px 10px rgba(37, 99, 235, 0.25)"
              }}
            >
              <img
                src="/niera-logo.png"
                alt="Niera"
                style={{ width: "26px", height: "26px", objectFit: "contain" }}
                onError={(e) => {
                  (e.target as HTMLElement).style.display = "none";
                }}
              />
              <span style={{ fontSize: "1.2rem", fontWeight: 800 }}>N</span>
            </div>
            <div>
              <div
                style={{
                  fontWeight: 800,
                  fontSize: "1.25rem",
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
                  fontWeight: 600,
                  color: "#2563eb",
                  letterSpacing: "0.02em",
                  textTransform: "uppercase"
                }}
              >
                AI Paper Grader
              </div>
            </div>
          </div>

          {/* Institution Chip */}
          <div
            onClick={() => handleItemClick("students")}
            title="Click to view organization & register"
            style={{
              background: "#f8fafc",
              border: "1px solid #e2e8f0",
              borderRadius: "8px",
              padding: "0.45rem 0.65rem",
              marginBottom: "1.25rem",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              cursor: "pointer",
              transition: "all 0.15s ease"
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "0.45rem", minWidth: 0 }}>
              <Building2 size={14} style={{ color: "#64748b", flexShrink: 0 }} />
              <div style={{ minWidth: 0 }}>
                <div
                  style={{
                    fontSize: "0.78rem",
                    fontWeight: 700,
                    color: "#1e293b",
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis"
                  }}
                >
                  {institutionName}
                </div>
                <div style={{ fontSize: "0.68rem", color: "#64748b" }}>
                  {institutionType}
                </div>
              </div>
            </div>
            <ChevronRight size={13} style={{ color: "#94a3b8", flexShrink: 0 }} />
          </div>

          {/* Golden Primary CTA: Check New Exam */}
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
              background: "linear-gradient(135deg, #2563eb 0%, #1e40af 100%)",
              color: "#ffffff",
              border: "none",
              borderRadius: "10px",
              padding: "0.75rem 0.85rem",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "0.55rem",
              fontWeight: 700,
              fontSize: "0.88rem",
              cursor: "pointer",
              boxShadow: "0 4px 14px rgba(37, 99, 235, 0.3)",
              transition: "transform 0.15s ease, box-shadow 0.15s ease"
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = "translateY(-1px)";
              e.currentTarget.style.boxShadow = "0 6px 18px rgba(37, 99, 235, 0.35)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = "translateY(0)";
              e.currentTarget.style.boxShadow = "0 4px 14px rgba(37, 99, 235, 0.3)";
            }}
          >
            <Sparkles size={16} />
            <span>+ Check New Exam</span>
          </button>
        </div>

        {/* Navigation Links */}
        <div style={{ flex: 1, padding: "0.75rem 0.75rem", overflowY: "auto" }}>
          <div
            style={{
              fontSize: "0.68rem",
              fontWeight: 800,
              textTransform: "uppercase",
              letterSpacing: "0.06em",
              color: "#94a3b8",
              padding: "0.25rem 0.65rem 0.5rem 0.65rem"
            }}
          >
            Workspace
          </div>

          <nav style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
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
                    padding: "0.65rem 0.75rem",
                    borderRadius: "8px",
                    border: "none",
                    background: isActive ? "#eff6ff" : "transparent",
                    color: isActive ? "#1d4ed8" : "#475569",
                    cursor: "pointer",
                    textAlign: "left",
                    width: "100%",
                    fontWeight: isActive ? 700 : 500,
                    transition: "all 0.15s ease",
                    position: "relative"
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

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: "0.88rem", lineHeight: 1.2 }}>{item.label}</div>
                    <div
                      style={{
                        fontSize: "0.68rem",
                        color: isActive ? "#3b82f6" : "#94a3b8",
                        lineHeight: 1.2,
                        marginTop: "1px"
                      }}
                    >
                      {item.description}
                    </div>
                  </div>

                  {item.badge && (
                    <span
                      style={{
                        fontSize: "0.62rem",
                        fontWeight: 800,
                        padding: "0.15rem 0.4rem",
                        borderRadius: "9999px",
                        background: isActive ? "#dbeafe" : "#f1f5f9",
                        color: isActive ? "#1d4ed8" : "#64748b"
                      }}
                    >
                      {item.badge}
                    </span>
                  )}

                  {isActive && (
                    <div
                      style={{
                        position: "absolute",
                        left: 0,
                        top: "15%",
                        bottom: "15%",
                        width: "3px",
                        background: "#2563eb",
                        borderRadius: "0 4px 4px 0"
                      }}
                    />
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Bottom Section: Help & Profile */}
        <div
          style={{
            padding: "0.85rem 0.85rem",
            borderTop: "1px solid #e2e8f0",
            background: "#fafafa"
          }}
        >
          {/* WhatsApp Support Box */}
          <a
            href="https://wa.me/919999999999?text=Hello%20Niera%20Team%2C%20I%20am%20a%20teacher%20and%20need%20quick%20assistance."
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.55rem",
              background: "#f0fdf4",
              border: "1px solid #bbf7d0",
              color: "#166534",
              padding: "0.5rem 0.65rem",
              borderRadius: "8px",
              textDecoration: "none",
              fontSize: "0.78rem",
              fontWeight: 600,
              marginBottom: "0.75rem",
              transition: "all 0.15s ease"
            }}
          >
            <MessageCircle size={15} style={{ color: "#16a34a", flexShrink: 0 }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ lineHeight: 1.1 }}>Teacher Helpdesk</div>
              <div style={{ fontSize: "0.66rem", color: "#15803d" }}>Chat on WhatsApp</div>
            </div>
            <span
              style={{
                width: "8px",
                height: "8px",
                borderRadius: "50%",
                background: "#22c55e"
              }}
            />
          </a>

          {/* User Profile Snippet */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              paddingTop: "0.25rem"
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
            >
              <div
                style={{
                  width: "34px",
                  height: "34px",
                  borderRadius: "50%",
                  background: "#e2e8f0",
                  color: "#334155",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontWeight: 700,
                  fontSize: "0.85rem",
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
                  Faculty Portal
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
              onMouseEnter={(e) => (e.currentTarget.style.color = "#ef4444")}
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
