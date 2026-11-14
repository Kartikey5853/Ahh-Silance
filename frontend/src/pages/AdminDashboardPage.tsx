/**
 * Admin Console & Institutional Command Center for Niera.
 * 
 * Provides institutional administration:
 * - Faculty directory and role management (Teacher, HOD, Coordinator, Admin)
 * - Workload reassignments and password resets
 * - Cross-institution global student directory and cohort transfers
 * - Organization switcher, board affiliation, and central Gemini AI key configuration
 * - System troubleshooter: overdue grading deadlines, missing answer keys, and orphan subject resolution
 * 
 * Follows the clean, minimalist Google Classroom / Linear design philosophy of Niera.
 */

import React, { useState, useEffect } from "react";
import { academicApi } from "../api/academicApi";
import { authApi } from "../api/authApi";
import type {
  Institution,
  ClassItem,
  Student,
  TeacherUser,
  AdminSystemHealth,
  InstitutionType
} from "../types/academic";
import { StudentProfileModal } from "../components/StudentProfileModal";
import {
  ShieldCheck,
  Users,
  GraduationCap,
  Building2,
  AlertTriangle,
  CheckCircle2,
  Search,
  Plus,
  RefreshCw,
  KeyRound,
  ArrowRightLeft,
  Trash2,
  ChevronRight,
  Sparkles,
  Lock,
  Layers,
  Check,
  X,
  Clock
} from "lucide-react";

interface AdminDashboardPageProps {
  onNavigate: (tab: any, params?: any) => void;
}

export const AdminDashboardPage: React.FC<AdminDashboardPageProps> = ({ onNavigate }) => {
  // Navigation Sub-tab
  const [activeTab, setActiveTab] = useState<"faculty" | "students" | "organization" | "troubleshooter">("faculty");

  // Core Data State
  const [institutions, setInstitutions] = useState<Institution[]>([]);
  const [selectedInstId, setSelectedInstId] = useState<string>("");
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [facultyList, setFacultyList] = useState<TeacherUser[]>([]);
  const [studentsList, setStudentsList] = useState<Student[]>([]);
  const [healthData, setHealthData] = useState<AdminSystemHealth | null>(null);

  // Loading & Feedback
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isActionLoading, setIsActionLoading] = useState<boolean>(false);
  const [notification, setNotification] = useState<{ type: "success" | "error"; message: string } | null>(null);

  // Search & Filters
  const [facultySearch, setFacultySearch] = useState<string>("");
  const [studentSearch, setStudentSearch] = useState<string>("");
  const [selectedClassFilter, setSelectedClassFilter] = useState<string>("");

  // Modals State
  const [showRoleModal, setShowRoleModal] = useState<boolean>(false);
  const [targetTeacher, setTargetTeacher] = useState<TeacherUser | null>(null);
  const [selectedNewRole, setSelectedNewRole] = useState<string>("Teacher");
  const [selectedNewDept, setSelectedNewDept] = useState<string>("");

  const [showReassignModal, setShowReassignModal] = useState<boolean>(false);
  const [reassignFromTeacher, setReassignFromTeacher] = useState<TeacherUser | null>(null);
  const [reassignToTeacherId, setReassignToTeacherId] = useState<string>("");

  const [showPasswordResetModal, setShowPasswordResetModal] = useState<boolean>(false);
  const [resetTeacherTarget, setResetTeacherTarget] = useState<TeacherUser | null>(null);
  const [newPasswordVal, setNewPasswordVal] = useState<string>("");

  const [showTransferModal, setShowTransferModal] = useState<boolean>(false);
  const [transferStudentTarget, setTransferStudentTarget] = useState<Student | null>(null);
  const [transferTargetClassId, setTransferTargetClassId] = useState<string>("");
  const [transferTargetSection, setTransferTargetSection] = useState<string>("A");

  const [selectedStudentForProfile, setSelectedStudentForProfile] = useState<Student | null>(null);

  const [showNewTeacherModal, setShowNewTeacherModal] = useState<boolean>(false);
  const [newTeacherUsername, setNewTeacherUsername] = useState<string>("");
  const [newTeacherPassword, setNewTeacherPassword] = useState<string>("");
  const [newTeacherFullName, setNewTeacherFullName] = useState<string>("");
  const [newTeacherEmail, setNewTeacherEmail] = useState<string>("");
  const [newTeacherRole, setNewTeacherRole] = useState<string>("Teacher");
  const [newTeacherDept, setNewTeacherDept] = useState<string>("");

  // Organization Editing Form State
  const [orgEditName, setOrgEditName] = useState<string>("");
  const [orgEditCode, setOrgEditCode] = useState<string>("");
  const [orgEditType, setOrgEditType] = useState<InstitutionType>("school");
  const [orgEditBoard, setOrgEditBoard] = useState<string>("CBSE");
  const [orgEditYear, setOrgEditYear] = useState<string>("2026-2027");
  const [orgGeminiKey, setOrgGeminiKey] = useState<string>("");

  const showNotification = (message: string, type: "success" | "error" = "success") => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3500);
  };

  const loadAllData = async (instId?: string) => {
    setIsLoading(true);
    try {
      const [insts, cls, teachers, studs, health] = await Promise.all([
        academicApi.listInstitutions().catch(() => []),
        academicApi.listClasses(instId).catch(() => []),
        academicApi.listAdminTeachers(instId).catch(() => []),
        academicApi.listAdminStudents("", undefined).catch(() => []),
        academicApi.getAdminHealth(instId).catch(() => null)
      ]);

      setInstitutions(insts || []);
      const activeId = instId || (insts && insts[0]?.id) || "";
      setSelectedInstId(activeId);

      const activeInst = insts?.find((i: Institution) => i.id === activeId);
      if (activeInst) {
        setOrgEditName(activeInst.name || "");
        setOrgEditCode(activeInst.code || "");
        setOrgEditType(activeInst.type || "school");
        setOrgEditBoard(activeInst.config?.board || "CBSE");
      }

      setClasses(cls || []);
      setFacultyList(teachers || []);
      setStudentsList(studs || []);
      setHealthData(health);
    } catch (err: any) {
      showNotification("Failed to load administrative records", "error");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadAllData();
  }, []);

  const handleSwitchOrganization = async (instId: string) => {
    setSelectedInstId(instId);
    await academicApi.updateProfile({ institution_id: instId }).catch(() => {});
    await loadAllData(instId);
    showNotification("Switched active organization");
  };

  const handleSaveOrganization = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedInstId) return;
    setIsActionLoading(true);
    try {
      await academicApi.updateInstitution(selectedInstId, {
        name: orgEditName.trim(),
        code: orgEditCode.trim(),
        type: orgEditType,
        config: {
          board: orgEditBoard.trim(),
          academic_year: orgEditYear.trim()
        }
      });
      if (orgGeminiKey.trim()) {
        await academicApi.updateProfile({ gemini_api_key: orgGeminiKey.trim() });
      }
      showNotification("Organization settings updated successfully");
      await loadAllData(selectedInstId);
    } catch (err: any) {
      showNotification("Failed to update organization", "error");
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleUpdateRole = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetTeacher) return;
    setIsActionLoading(true);
    try {
      await academicApi.updateTeacherRole(targetTeacher.id, selectedNewRole, selectedNewDept.trim());
      setShowRoleModal(false);
      showNotification(`Updated ${targetTeacher.full_name}'s role to ${selectedNewRole}`);
      await loadAllData(selectedInstId);
    } catch (err: any) {
      showNotification("Failed to update role", "error");
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleReassignWorkload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reassignFromTeacher || !reassignToTeacherId) return;
    setIsActionLoading(true);
    try {
      const res = await academicApi.reassignTeacherSubjects(reassignFromTeacher.id, parseInt(reassignToTeacherId, 10));
      setShowReassignModal(false);
      showNotification(`Reassigned ${res.reassigned_subjects_count || 0} subjects successfully`);
      await loadAllData(selectedInstId);
    } catch (err: any) {
      showNotification("Failed to reassign subjects", "error");
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetTeacherTarget || !newPasswordVal.trim()) return;
    setIsActionLoading(true);
    try {
      await academicApi.resetTeacherPassword(resetTeacherTarget.id, newPasswordVal.trim());
      setShowPasswordResetModal(false);
      setNewPasswordVal("");
      showNotification(`Password reset successfully for ${resetTeacherTarget.username}`);
    } catch (err: any) {
      showNotification(err?.response?.data?.detail || "Failed to reset password", "error");
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleDeleteTeacher = async (teacher: TeacherUser) => {
    if (!confirm(`Are you sure you want to remove ${teacher.full_name || teacher.username}? Any assigned subjects will be marked as orphaned.`)) {
      return;
    }
    setIsActionLoading(true);
    try {
      await academicApi.deleteTeacher(teacher.id);
      showNotification(`Faculty account for ${teacher.username} removed`);
      await loadAllData(selectedInstId);
    } catch (err: any) {
      showNotification("Failed to remove faculty member", "error");
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleTransferStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!transferStudentTarget || !transferTargetClassId) return;
    setIsActionLoading(true);
    try {
      await academicApi.transferStudentClass(transferStudentTarget.id, transferTargetClassId, transferTargetSection);
      setShowTransferModal(false);
      showNotification(`Transferred ${transferStudentTarget.name} to new class cohort`);
      await loadAllData(selectedInstId);
    } catch (err: any) {
      showNotification("Failed to transfer student", "error");
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleCreateNewTeacher = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTeacherUsername.trim() || !newTeacherPassword.trim()) return;
    setIsActionLoading(true);
    try {
      await authApi.register({
        username: newTeacherUsername.trim(),
        password: newTeacherPassword.trim(),
        full_name: newTeacherFullName.trim() || newTeacherUsername.trim(),
        email: newTeacherEmail.trim(),
        role: newTeacherRole,
        department: newTeacherDept.trim(),
        institution_id: selectedInstId
      });
      setShowNewTeacherModal(false);
      setNewTeacherUsername("");
      setNewTeacherPassword("");
      setNewTeacherFullName("");
      setNewTeacherEmail("");
      setNewTeacherDept("");
      showNotification("Faculty account created and linked to organization");
      await loadAllData(selectedInstId);
    } catch (err: any) {
      showNotification(err?.response?.data?.detail || "Failed to create teacher account", "error");
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleFixAllOrphans = async () => {
    setIsActionLoading(true);
    try {
      const res = await academicApi.fixOrphans();
      showNotification(`Resolved and reclaimed ${res.reassigned_orphans_count || 0} orphaned subjects`);
      await loadAllData(selectedInstId);
    } catch (err: any) {
      showNotification("Failed to fix orphaned subjects", "error");
    } finally {
      setIsActionLoading(false);
    }
  };

  const filteredFaculty = facultyList.filter((f) => {
    const q = facultySearch.toLowerCase();
    return (
      (f.full_name || "").toLowerCase().includes(q) ||
      f.username.toLowerCase().includes(q) ||
      (f.email || "").toLowerCase().includes(q) ||
      (f.department || "").toLowerCase().includes(q) ||
      (f.role || "").toLowerCase().includes(q)
    );
  });

  const filteredStudents = studentsList.filter((s) => {
    const q = studentSearch.toLowerCase();
    const matchClass = selectedClassFilter ? s.class_id === selectedClassFilter : true;
    const matchQuery =
      (s.name || "").toLowerCase().includes(q) ||
      (s.roll_number || "").toLowerCase().includes(q) ||
      (s.email || "").toLowerCase().includes(q) ||
      (s.phone || "").toLowerCase().includes(q) ||
      (s.parent_name || "").toLowerCase().includes(q);
    return matchClass && matchQuery;
  });

  const activeInstitution = institutions.find((i) => i.id === selectedInstId) || institutions[0];

  return (
    <div className="admin-dashboard-page pb-24" style={{ maxWidth: "1280px", margin: "0 auto" }}>
      {/* Toast Notification */}
      {notification && (
        <div
          style={{
            position: "fixed",
            bottom: "1.5rem",
            right: "1.5rem",
            zIndex: 9999,
            background: notification.type === "success" ? "#166534" : "#991b1b",
            color: "#ffffff",
            padding: "0.75rem 1.25rem",
            borderRadius: "10px",
            boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.2)",
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
            fontSize: "0.88rem",
            fontWeight: 700
          }}
        >
          {notification.type === "success" ? <Check size={18} /> : <AlertTriangle size={18} />}
          <span>{notification.message}</span>
        </div>
      )}

      {/* Main Command Header */}
      <div
        style={{
          background: "#ffffff",
          border: "1px solid #e2e8f0",
          borderRadius: "16px",
          padding: "1.5rem 1.75rem",
          marginBottom: "1.5rem",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: "1rem",
          boxShadow: "0 2px 8px rgba(0, 0, 0, 0.03)"
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          <div
            style={{
              width: "48px",
              height: "48px",
              borderRadius: "12px",
              background: "#eff6ff",
              color: "#2563eb",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 2px 6px rgba(37, 99, 235, 0.15)"
            }}
          >
            <ShieldCheck size={26} />
          </div>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <h1 style={{ fontSize: "1.5rem", fontWeight: 800, color: "#0f172a", letterSpacing: "-0.03em", margin: 0 }}>
                Administration Hub
              </h1>
              <span
                style={{
                  background: "#dbeafe",
                  color: "#1e40af",
                  fontSize: "0.72rem",
                  fontWeight: 700,
                  padding: "0.2rem 0.55rem",
                  borderRadius: "6px"
                }}
              >
                Super Admin
              </span>
            </div>
            <p style={{ color: "#64748b", fontSize: "0.84rem", margin: "0.2rem 0 0 0" }}>
              Oversee faculty assignments, manage student cohorts, switch organizations, and resolve system bottlenecks
            </p>
          </div>
        </div>

        {/* Organization Switcher Dropdown */}
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: "0.7rem", fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>
              Active Organization
            </div>
            <select
              value={selectedInstId}
              onChange={(e) => handleSwitchOrganization(e.target.value)}
              style={{
                padding: "0.45rem 0.75rem",
                borderRadius: "8px",
                border: "1px solid #cbd5e1",
                fontSize: "0.85rem",
                fontWeight: 700,
                color: "#0f172a",
                background: "#f8fafc",
                cursor: "pointer"
              }}
            >
              {institutions.map((i) => (
                <option key={i.id} value={i.id}>
                  {i.name} ({i.type.toUpperCase()})
                </option>
              ))}
            </select>
          </div>

          <button
            type="button"
            onClick={() => loadAllData(selectedInstId)}
            disabled={isLoading}
            title="Refresh administrative data"
            style={{
              padding: "0.5rem",
              borderRadius: "8px",
              border: "1px solid #e2e8f0",
              background: "#ffffff",
              color: "#64748b",
              cursor: isLoading ? "not-allowed" : "pointer",
              opacity: isLoading ? 0.6 : 1
            }}
          >
            <RefreshCw size={16} className={isLoading ? "animate-spin" : ""} />
          </button>
        </div>
      </div>

      {/* KPI Pulse Stat Cards */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: "1rem",
          marginBottom: "1.5rem"
        }}
      >
        {/* Total Faculty */}
        <div
          onClick={() => setActiveTab("faculty")}
          style={{
            background: "#ffffff",
            border: "1px solid #e2e8f0",
            borderRadius: "14px",
            padding: "1.2rem",
            cursor: "pointer",
            transition: "all 0.15s ease",
            boxShadow: activeTab === "faculty" ? "0 0 0 2px #2563eb" : "0 1px 3px rgba(0,0,0,0.03)"
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span style={{ fontSize: "0.8rem", fontWeight: 700, color: "#64748b" }}>Teachers &amp; Faculty</span>
            <Users size={18} style={{ color: "#2563eb" }} />
          </div>
          <div style={{ fontSize: "1.75rem", fontWeight: 800, color: "#0f172a", marginTop: "0.4rem" }}>
            {healthData?.total_faculty ?? facultyList.length}
          </div>
          <div style={{ fontSize: "0.75rem", color: "#64748b", marginTop: "0.2rem" }}>
            {facultyList.filter((f) => (f.role || "").toLowerCase().includes("admin")).length} Admins •{" "}
            {facultyList.filter((f) => !(f.role || "").toLowerCase().includes("admin")).length} Teaching Staff
          </div>
        </div>

        {/* Total Students */}
        <div
          onClick={() => setActiveTab("students")}
          style={{
            background: "#ffffff",
            border: "1px solid #e2e8f0",
            borderRadius: "14px",
            padding: "1.2rem",
            cursor: "pointer",
            transition: "all 0.15s ease",
            boxShadow: activeTab === "students" ? "0 0 0 2px #2563eb" : "0 1px 3px rgba(0,0,0,0.03)"
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span style={{ fontSize: "0.8rem", fontWeight: 700, color: "#64748b" }}>Enrolled Students</span>
            <GraduationCap size={18} style={{ color: "#16a34a" }} />
          </div>
          <div style={{ fontSize: "1.75rem", fontWeight: 800, color: "#0f172a", marginTop: "0.4rem" }}>
            {healthData?.total_students ?? studentsList.length}
          </div>
          <div style={{ fontSize: "0.75rem", color: "#64748b", marginTop: "0.2rem" }}>
            Across {classes.length} Class Cohorts
          </div>
        </div>

        {/* Active Classes */}
        <div
          onClick={() => setActiveTab("organization")}
          style={{
            background: "#ffffff",
            border: "1px solid #e2e8f0",
            borderRadius: "14px",
            padding: "1.2rem",
            cursor: "pointer",
            transition: "all 0.15s ease",
            boxShadow: activeTab === "organization" ? "0 0 0 2px #2563eb" : "0 1px 3px rgba(0,0,0,0.03)"
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span style={{ fontSize: "0.8rem", fontWeight: 700, color: "#64748b" }}>Organization &amp; Classes</span>
            <Building2 size={18} style={{ color: "#8b5cf6" }} />
          </div>
          <div style={{ fontSize: "1.75rem", fontWeight: 800, color: "#0f172a", marginTop: "0.4rem" }}>
            {classes.length}
          </div>
          <div style={{ fontSize: "0.75rem", color: "#64748b", marginTop: "0.2rem" }}>
            {activeInstitution?.type?.toUpperCase() || "ACADEMIC"} • {activeInstitution?.code || "INST"}
          </div>
        </div>

        {/* System Health / Bottlenecks */}
        <div
          onClick={() => setActiveTab("troubleshooter")}
          style={{
            background: (healthData?.overdue_exams?.length || 0) > 0 ? "#fef2f2" : "#f0fdf4",
            border: `1px solid ${(healthData?.overdue_exams?.length || 0) > 0 ? "#fecaca" : "#bbf7d0"}`,
            borderRadius: "14px",
            padding: "1.2rem",
            cursor: "pointer",
            transition: "all 0.15s ease",
            boxShadow: activeTab === "troubleshooter" ? "0 0 0 2px #ef4444" : "0 1px 3px rgba(0,0,0,0.03)"
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span
              style={{
                fontSize: "0.8rem",
                fontWeight: 700,
                color: (healthData?.overdue_exams?.length || 0) > 0 ? "#dc2626" : "#166534"
              }}
            >
              System Health &amp; Alerts
            </span>
            {(healthData?.overdue_exams?.length || 0) > 0 ? (
              <AlertTriangle size={18} style={{ color: "#ef4444" }} />
            ) : (
              <CheckCircle2 size={18} style={{ color: "#16a34a" }} />
            )}
          </div>
          <div
            style={{
              fontSize: "1.75rem",
              fontWeight: 800,
              color: (healthData?.overdue_exams?.length || 0) > 0 ? "#991b1b" : "#166534",
              marginTop: "0.4rem"
            }}
          >
            {(healthData?.overdue_exams?.length || 0) + (healthData?.orphaned_subjects?.length || 0)}
          </div>
          <div
            style={{
              fontSize: "0.75rem",
              color: (healthData?.overdue_exams?.length || 0) > 0 ? "#b91c1c" : "#15803d",
              marginTop: "0.2rem"
            }}
          >
            {(healthData?.overdue_exams?.length || 0) > 0
              ? `${healthData?.overdue_exams?.length} Overdue Papers Pending`
              : "All exam pipelines operating smoothly"}
          </div>
        </div>
      </div>

      {/* Navigation Tabs Bar */}
      <div
        style={{
          display: "flex",
          borderBottom: "1px solid #e2e8f0",
          marginBottom: "1.5rem",
          gap: "1.5rem"
        }}
      >
        <button
          type="button"
          onClick={() => setActiveTab("faculty")}
          style={{
            padding: "0.75rem 0.25rem",
            border: "none",
            borderBottom: activeTab === "faculty" ? "3px solid #2563eb" : "3px solid transparent",
            background: "transparent",
            fontSize: "0.92rem",
            fontWeight: activeTab === "faculty" ? 800 : 600,
            color: activeTab === "faculty" ? "#2563eb" : "#64748b",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: "0.5rem"
          }}
        >
          <Users size={17} />
          <span>Faculty &amp; Roles ({facultyList.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("students")}
          style={{
            padding: "0.75rem 0.25rem",
            border: "none",
            borderBottom: activeTab === "students" ? "3px solid #2563eb" : "3px solid transparent",
            background: "transparent",
            fontSize: "0.92rem",
            fontWeight: activeTab === "students" ? 800 : 600,
            color: activeTab === "students" ? "#2563eb" : "#64748b",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: "0.5rem"
          }}
        >
          <GraduationCap size={17} />
          <span>Institution Students ({studentsList.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("organization")}
          style={{
            padding: "0.75rem 0.25rem",
            border: "none",
            borderBottom: activeTab === "organization" ? "3px solid #2563eb" : "3px solid transparent",
            background: "transparent",
            fontSize: "0.92rem",
            fontWeight: activeTab === "organization" ? 800 : 600,
            color: activeTab === "organization" ? "#2563eb" : "#64748b",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: "0.5rem"
          }}
        >
          <Building2 size={17} />
          <span>Organization Settings</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("troubleshooter")}
          style={{
            padding: "0.75rem 0.25rem",
            border: "none",
            borderBottom: activeTab === "troubleshooter" ? "3px solid #2563eb" : "3px solid transparent",
            background: "transparent",
            fontSize: "0.92rem",
            fontWeight: activeTab === "troubleshooter" ? 800 : 600,
            color: activeTab === "troubleshooter" ? "#2563eb" : "#64748b",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: "0.5rem"
          }}
        >
          <AlertTriangle size={17} style={{ color: (healthData?.overdue_exams?.length || 0) > 0 ? "#ef4444" : "inherit" }} />
          <span>Troubleshooter &amp; Quick Fixes</span>
          {(healthData?.overdue_exams?.length || 0) > 0 && (
            <span
              style={{
                background: "#fee2e2",
                color: "#dc2626",
                fontSize: "0.68rem",
                fontWeight: 800,
                padding: "0.1rem 0.4rem",
                borderRadius: "999px"
              }}
            >
              {healthData?.overdue_exams?.length}
            </span>
          )}
        </button>
      </div>

      {/* TAB 1: FACULTY & ROLE MANAGEMENT */}
      {activeTab === "faculty" && (
        <div
          style={{
            background: "#ffffff",
            border: "1px solid #e2e8f0",
            borderRadius: "16px",
            padding: "1.75rem",
            boxShadow: "0 1px 3px rgba(0,0,0,0.03)"
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "1rem", marginBottom: "1.25rem" }}>
            <div>
              <h2 style={{ fontSize: "1.2rem", fontWeight: 800, color: "#0f172a", margin: 0 }}>
                Faculty &amp; Teaching Staff
              </h2>
              <p style={{ fontSize: "0.82rem", color: "#64748b", margin: "0.2rem 0 0 0" }}>
                Assign administrative roles, balance course workloads, and manage faculty credentials
              </p>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
              <div style={{ position: "relative" }}>
                <Search size={15} style={{ position: "absolute", left: "0.75rem", top: "50%", transform: "translateY(-50%)", color: "#94a3b8" }} />
                <input
                  type="text"
                  placeholder="Search faculty by name, department, role..."
                  value={facultySearch}
                  onChange={(e) => setFacultySearch(e.target.value)}
                  style={{
                    padding: "0.45rem 0.75rem 0.45rem 2.2rem",
                    borderRadius: "8px",
                    border: "1px solid #cbd5e1",
                    fontSize: "0.84rem",
                    minWidth: "260px"
                  }}
                />
              </div>

              <button
                type="button"
                onClick={() => setShowNewTeacherModal(true)}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "0.4rem",
                  background: "#2563eb",
                  color: "#ffffff",
                  padding: "0.45rem 0.85rem",
                  borderRadius: "8px",
                  fontSize: "0.84rem",
                  fontWeight: 700,
                  border: "none",
                  cursor: "pointer",
                  boxShadow: "0 2px 4px rgba(37, 99, 235, 0.2)"
                }}
              >
                <Plus size={16} />
                <span>Add Faculty</span>
              </button>
            </div>
          </div>

          {/* Faculty Table */}
          <div style={{ overflowX: "auto", WebkitOverflowScrolling: "touch", borderRadius: "10px", border: "1px solid #e2e8f0" }}>
            <table style={{ width: "100%", minWidth: "680px", borderCollapse: "collapse", textAlign: "left" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid #e2e8f0", background: "#f8fafc" }}>
                  <th style={{ padding: "0.75rem 1rem", fontSize: "0.74rem", fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>
                    Faculty Name &amp; Handle
                  </th>
                  <th style={{ padding: "0.75rem 1rem", fontSize: "0.74rem", fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>
                    Department
                  </th>
                  <th style={{ padding: "0.75rem 1rem", fontSize: "0.74rem", fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>
                    Assigned Role
                  </th>
                  <th style={{ padding: "0.75rem 1rem", fontSize: "0.74rem", fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>
                    Workload
                  </th>
                  <th style={{ padding: "0.75rem 1rem", fontSize: "0.74rem", fontWeight: 700, color: "#64748b", textTransform: "uppercase", textAlign: "right" }}>
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredFaculty.map((teacher) => {
                  const isAdminRole = (teacher.role || "").toLowerCase().includes("admin");
                  const isHodRole = (teacher.role || "").toLowerCase().includes("hod");

                  return (
                    <tr key={teacher.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                      <td style={{ padding: "0.85rem 1rem" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                          <div
                            style={{
                              width: "36px",
                              height: "36px",
                              borderRadius: "8px",
                              background: isAdminRole ? "#eff6ff" : isHodRole ? "#faf5ff" : "#f1f5f9",
                              color: isAdminRole ? "#2563eb" : isHodRole ? "#7c3aed" : "#475569",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              fontWeight: 800,
                              fontSize: "0.9rem"
                            }}
                          >
                            {(teacher.full_name || teacher.username).charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div style={{ fontWeight: 700, fontSize: "0.9rem", color: "#0f172a" }}>
                              {teacher.full_name || teacher.username}
                            </div>
                            <div style={{ fontSize: "0.75rem", color: "#64748b" }}>
                              @{teacher.username} {teacher.email && `• ${teacher.email}`}
                            </div>
                          </div>
                        </div>
                      </td>

                      <td style={{ padding: "0.85rem 1rem", fontSize: "0.84rem", color: "#334155" }}>
                        {teacher.department || <span style={{ color: "#94a3b8" }}>General / Unassigned</span>}
                      </td>

                      <td style={{ padding: "0.85rem 1rem" }}>
                        <span
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "0.3rem",
                            fontSize: "0.74rem",
                            fontWeight: 700,
                            padding: "0.25rem 0.6rem",
                            borderRadius: "6px",
                            background: isAdminRole ? "#dbeafe" : isHodRole ? "#f3e8ff" : "#f1f5f9",
                            color: isAdminRole ? "#1e40af" : isHodRole ? "#6b21a8" : "#475569"
                          }}
                        >
                          {isAdminRole && <ShieldCheck size={13} />}
                          {teacher.role || "Teacher"}
                        </span>
                      </td>

                      <td style={{ padding: "0.85rem 1rem", fontSize: "0.84rem", fontWeight: 700, color: "#0f172a" }}>
                        {teacher.subjects_count ?? 0} Subjects
                      </td>

                      <td style={{ padding: "0.85rem 1rem", textAlign: "right" }}>
                        <div style={{ display: "inline-flex", alignItems: "center", gap: "0.4rem" }}>
                          {/* Change Role Button */}
                          <button
                            type="button"
                            onClick={() => {
                              setTargetTeacher(teacher);
                              setSelectedNewRole(teacher.role || "Teacher");
                              setSelectedNewDept(teacher.department || "");
                              setShowRoleModal(true);
                            }}
                            title="Edit Role & Department"
                            style={{
                              padding: "0.35rem 0.6rem",
                              borderRadius: "6px",
                              border: "1px solid #cbd5e1",
                              background: "#ffffff",
                              fontSize: "0.75rem",
                              fontWeight: 700,
                              color: "#334155",
                              cursor: "pointer"
                            }}
                          >
                            Role
                          </button>

                          {/* Reassign Workload Button */}
                          <button
                            type="button"
                            onClick={() => {
                              setReassignFromTeacher(teacher);
                              setReassignToTeacherId("");
                              setShowReassignModal(true);
                            }}
                            title="Transfer All Subjects to Another Teacher"
                            style={{
                              padding: "0.35rem 0.6rem",
                              borderRadius: "6px",
                              border: "1px solid #cbd5e1",
                              background: "#ffffff",
                              fontSize: "0.75rem",
                              fontWeight: 700,
                              color: "#334155",
                              cursor: "pointer",
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "0.25rem"
                            }}
                          >
                            <ArrowRightLeft size={13} />
                            <span>Transfer</span>
                          </button>

                          {/* Reset Password Button */}
                          <button
                            type="button"
                            onClick={() => {
                              setResetTeacherTarget(teacher);
                              setNewPasswordVal("");
                              setShowPasswordResetModal(true);
                            }}
                            title="Reset Teacher Password"
                            style={{
                              padding: "0.35rem 0.5rem",
                              borderRadius: "6px",
                              border: "1px solid #cbd5e1",
                              background: "#ffffff",
                              color: "#64748b",
                              cursor: "pointer"
                            }}
                          >
                            <KeyRound size={14} />
                          </button>

                          {/* Delete Account */}
                          <button
                            type="button"
                            onClick={() => handleDeleteTeacher(teacher)}
                            title="Delete Faculty Account"
                            style={{
                              padding: "0.35rem 0.5rem",
                              borderRadius: "6px",
                              border: "1px solid #fecaca",
                              background: "#fef2f2",
                              color: "#dc2626",
                              cursor: "pointer"
                            }}
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: GLOBAL INSTITUTION STUDENTS */}
      {activeTab === "students" && (
        <div
          style={{
            background: "#ffffff",
            border: "1px solid #e2e8f0",
            borderRadius: "16px",
            padding: "1.75rem",
            boxShadow: "0 1px 3px rgba(0,0,0,0.03)"
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "1rem", marginBottom: "1.25rem" }}>
            <div>
              <h2 style={{ fontSize: "1.2rem", fontWeight: 800, color: "#0f172a", margin: 0 }}>
                Institution Student Directory
              </h2>
              <p style={{ fontSize: "0.82rem", color: "#64748b", margin: "0.2rem 0 0 0" }}>
                Global search across all classes, transfer students between cohorts, and view comprehensive academic records
              </p>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", flexWrap: "wrap" }}>
              {/* Class Filter */}
              <select
                value={selectedClassFilter}
                onChange={(e) => setSelectedClassFilter(e.target.value)}
                style={{
                  padding: "0.45rem 0.75rem",
                  borderRadius: "8px",
                  border: "1px solid #cbd5e1",
                  fontSize: "0.84rem",
                  fontWeight: 600,
                  background: "#ffffff"
                }}
              >
                <option value="">All Class Cohorts</option>
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} {c.code && `(${c.code})`}
                  </option>
                ))}
              </select>

              {/* Search Bar */}
              <div style={{ position: "relative" }}>
                <Search size={15} style={{ position: "absolute", left: "0.75rem", top: "50%", transform: "translateY(-50%)", color: "#94a3b8" }} />
                <input
                  type="text"
                  placeholder="Search by Roll No, Name, Phone..."
                  value={studentSearch}
                  onChange={(e) => setStudentSearch(e.target.value)}
                  style={{
                    padding: "0.45rem 0.75rem 0.45rem 2.2rem",
                    borderRadius: "8px",
                    border: "1px solid #cbd5e1",
                    fontSize: "0.84rem",
                    minWidth: "240px"
                  }}
                />
              </div>
            </div>
          </div>

          {/* Student Table */}
          <div style={{ overflowX: "auto", WebkitOverflowScrolling: "touch", borderRadius: "10px", border: "1px solid #e2e8f0" }}>
            <table style={{ width: "100%", minWidth: "680px", borderCollapse: "collapse", textAlign: "left" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid #e2e8f0", background: "#f8fafc" }}>
                  <th style={{ padding: "0.75rem 1rem", fontSize: "0.74rem", fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>
                    Roll Number
                  </th>
                  <th style={{ padding: "0.75rem 1rem", fontSize: "0.74rem", fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>
                    Student Name
                  </th>
                  <th style={{ padding: "0.75rem 1rem", fontSize: "0.74rem", fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>
                    Class &amp; Section
                  </th>
                  <th style={{ padding: "0.75rem 1rem", fontSize: "0.74rem", fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>
                    Parent Contact
                  </th>
                  <th style={{ padding: "0.75rem 1rem", fontSize: "0.74rem", fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>
                    Status
                  </th>
                  <th style={{ padding: "0.75rem 1rem", fontSize: "0.74rem", fontWeight: 700, color: "#64748b", textTransform: "uppercase", textAlign: "right" }}>
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredStudents.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ padding: "2rem", textAlign: "center", color: "#94a3b8", fontSize: "0.9rem" }}>
                      No students found matching current filters.
                    </td>
                  </tr>
                ) : (
                  filteredStudents.map((stud) => {
                    const studentClass = classes.find((c) => c.id === stud.class_id);

                    return (
                      <tr key={stud.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                        <td style={{ padding: "0.85rem 1rem" }}>
                          <span
                            style={{
                              fontFamily: "monospace",
                              fontWeight: 800,
                              fontSize: "0.84rem",
                              background: "#f1f5f9",
                              padding: "0.2rem 0.5rem",
                              borderRadius: "6px",
                              color: "#0f172a"
                            }}
                          >
                            {stud.roll_number}
                          </span>
                        </td>

                        <td style={{ padding: "0.85rem 1rem" }}>
                          <div style={{ fontWeight: 700, fontSize: "0.9rem", color: "#0f172a" }}>
                            {stud.name}
                          </div>
                          {stud.email && <div style={{ fontSize: "0.75rem", color: "#64748b" }}>{stud.email}</div>}
                        </td>

                        <td style={{ padding: "0.85rem 1rem", fontSize: "0.84rem", color: "#334155" }}>
                          {studentClass?.name || "Class"} • Sec {stud.section || "A"}
                        </td>

                        <td style={{ padding: "0.85rem 1rem", fontSize: "0.82rem", color: "#475569" }}>
                          {stud.parent_name || stud.parent_phone ? (
                            <div>
                              <div>{stud.parent_name || "Parent"}</div>
                              <div style={{ fontSize: "0.75rem", color: "#64748b" }}>{stud.parent_phone}</div>
                            </div>
                          ) : (
                            <span style={{ color: "#94a3b8" }}>Not Provided</span>
                          )}
                        </td>

                        <td style={{ padding: "0.85rem 1rem" }}>
                          <span
                            style={{
                              fontSize: "0.72rem",
                              fontWeight: 700,
                              padding: "0.2rem 0.5rem",
                              borderRadius: "4px",
                              background: (stud.status || "Active").toLowerCase() === "active" ? "#dcfce7" : "#f1f5f9",
                              color: (stud.status || "Active").toLowerCase() === "active" ? "#166534" : "#475569"
                            }}
                          >
                            {stud.status || "Active"}
                          </span>
                        </td>

                        <td style={{ padding: "0.85rem 1rem", textAlign: "right" }}>
                          <div style={{ display: "inline-flex", alignItems: "center", gap: "0.4rem" }}>
                            {/* Transfer Student Button */}
                            <button
                              type="button"
                              onClick={() => {
                                setTransferStudentTarget(stud);
                                setTransferTargetClassId(stud.class_id || (classes[0]?.id ?? ""));
                                setTransferTargetSection(stud.section || "A");
                                setShowTransferModal(true);
                              }}
                              title="Transfer Class Cohort / Section"
                              style={{
                                padding: "0.35rem 0.6rem",
                                borderRadius: "6px",
                                border: "1px solid #cbd5e1",
                                background: "#ffffff",
                                fontSize: "0.75rem",
                                fontWeight: 700,
                                color: "#2563eb",
                                cursor: "pointer",
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "0.25rem"
                              }}
                            >
                              <ArrowRightLeft size={13} />
                              <span>Transfer</span>
                            </button>

                            {/* View Profile */}
                            <button
                              type="button"
                              onClick={() => setSelectedStudentForProfile(stud)}
                              title="View Academic Scorecard & Profile"
                              style={{
                                padding: "0.35rem 0.6rem",
                                borderRadius: "6px",
                                border: "1px solid #cbd5e1",
                                background: "#ffffff",
                                fontSize: "0.75rem",
                                fontWeight: 700,
                                color: "#334155",
                                cursor: "pointer"
                              }}
                            >
                              Profile
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: ORGANIZATION SETTINGS */}
      {activeTab === "organization" && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: "1.5rem" }}>
          <div
            style={{
              background: "#ffffff",
              border: "1px solid #e2e8f0",
              borderRadius: "16px",
              padding: "1.75rem",
              boxShadow: "0 1px 3px rgba(0,0,0,0.03)"
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "1.25rem" }}>
              <div
                style={{
                  width: "40px",
                  height: "40px",
                  borderRadius: "10px",
                  background: "#eff6ff",
                  color: "#2563eb",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center"
                }}
              >
                <Building2 size={22} />
              </div>
              <div>
                <h2 style={{ fontSize: "1.2rem", fontWeight: 800, color: "#0f172a", margin: 0 }}>
                  Organization Configuration
                </h2>
                <p style={{ fontSize: "0.82rem", color: "#64748b", margin: "0.2rem 0 0 0" }}>
                  Modify institutional metadata, board affiliation, and central evaluation API keys
                </p>
              </div>
            </div>

            <form onSubmit={handleSaveOrganization} style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
              <div style={{ display: "grid", gridTemplateColumns: "1.2fr 0.8fr", gap: "1rem" }}>
                <div>
                  <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 700, color: "#334155", marginBottom: "0.35rem" }}>
                    Institution / School / College Name
                  </label>
                  <input
                    type="text"
                    required
                    value={orgEditName}
                    onChange={(e) => setOrgEditName(e.target.value)}
                    placeholder="e.g. Delhi Public School or ACE College of Engineering"
                    style={{
                      width: "100%",
                      padding: "0.6rem 0.85rem",
                      borderRadius: "8px",
                      border: "1px solid #cbd5e1",
                      fontSize: "0.88rem",
                      fontWeight: 600
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 700, color: "#334155", marginBottom: "0.35rem" }}>
                    Organization Code
                  </label>
                  <input
                    type="text"
                    value={orgEditCode}
                    onChange={(e) => setOrgEditCode(e.target.value)}
                    placeholder="e.g. DPS-CBSE or ACE-ENG"
                    style={{
                      width: "100%",
                      padding: "0.6rem 0.85rem",
                      borderRadius: "8px",
                      border: "1px solid #cbd5e1",
                      fontSize: "0.88rem"
                    }}
                  />
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "1rem" }}>
                <div>
                  <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 700, color: "#334155", marginBottom: "0.35rem" }}>
                    Institution Tier
                  </label>
                  <select
                    value={orgEditType}
                    onChange={(e) => setOrgEditType(e.target.value as InstitutionType)}
                    style={{
                      width: "100%",
                      padding: "0.6rem 0.85rem",
                      borderRadius: "8px",
                      border: "1px solid #cbd5e1",
                      fontSize: "0.88rem",
                      background: "#ffffff"
                    }}
                  >
                    <option value="school">School (Classes 6-12 / CBSE / ICSE)</option>
                    <option value="college">College / University (Undergraduate / Postgrad)</option>
                    <option value="competitive">Competitive Coaching (JEE / NEET / UPSC)</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 700, color: "#334155", marginBottom: "0.35rem" }}>
                    Affiliated Board / Program
                  </label>
                  <input
                    type="text"
                    value={orgEditBoard}
                    onChange={(e) => setOrgEditBoard(e.target.value)}
                    placeholder="e.g. CBSE, ICSE, University"
                    style={{
                      width: "100%",
                      padding: "0.6rem 0.85rem",
                      borderRadius: "8px",
                      border: "1px solid #cbd5e1",
                      fontSize: "0.88rem"
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 700, color: "#334155", marginBottom: "0.35rem" }}>
                    Active Academic Cycle
                  </label>
                  <input
                    type="text"
                    value={orgEditYear}
                    onChange={(e) => setOrgEditYear(e.target.value)}
                    placeholder="2026-2027"
                    style={{
                      width: "100%",
                      padding: "0.6rem 0.85rem",
                      borderRadius: "8px",
                      border: "1px solid #cbd5e1",
                      fontSize: "0.88rem"
                    }}
                  />
                </div>
              </div>

              {/* Central Gemini AI Key Configuration */}
              <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "10px", padding: "1.2rem" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.35rem" }}>
                  <Sparkles size={18} style={{ color: "#2563eb" }} />
                  <div style={{ fontWeight: 800, fontSize: "0.92rem", color: "#0f172a" }}>
                    Institutional Gemini Vision API Key (Optional)
                  </div>
                </div>
                <p style={{ fontSize: "0.78rem", color: "#64748b", margin: "0 0 0.85rem 0" }}>
                  Set a central institutional Gemini API key so individual teachers do not need to configure their own personal API keys for OCR and automatic grading.
                </p>
                <div style={{ position: "relative" }}>
                  <Lock size={16} style={{ position: "absolute", left: "0.85rem", top: "50%", transform: "translateY(-50%)", color: "#94a3b8" }} />
                  <input
                    type="password"
                    value={orgGeminiKey}
                    onChange={(e) => setOrgGeminiKey(e.target.value)}
                    placeholder="AIzaSy... (Leave empty to retain system default)"
                    style={{
                      width: "100%",
                      padding: "0.55rem 0.85rem 0.55rem 2.4rem",
                      borderRadius: "8px",
                      border: "1px solid #cbd5e1",
                      fontSize: "0.88rem"
                    }}
                  />
                </div>
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "0.5rem" }}>
                <button
                  type="submit"
                  disabled={isActionLoading}
                  style={{
                    background: "#2563eb",
                    color: "#ffffff",
                    padding: "0.65rem 1.25rem",
                    borderRadius: "8px",
                    fontWeight: 700,
                    fontSize: "0.9rem",
                    border: "none",
                    cursor: "pointer",
                    boxShadow: "0 2px 6px rgba(37, 99, 235, 0.25)"
                  }}
                >
                  {isActionLoading ? "Saving Settings..." : "Save Organization Settings"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* TAB 4: TROUBLESHOOTER & QUICK FIXES ("FIX THE PROBLEMS AND STUFF") */}
      {activeTab === "troubleshooter" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
          {/* Overdue Exam Deadlines */}
          <div
            style={{
              background: "#ffffff",
              border: "1px solid #e2e8f0",
              borderRadius: "16px",
              padding: "1.75rem",
              boxShadow: "0 1px 3px rgba(0,0,0,0.03)"
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1rem" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                <div
                  style={{
                    width: "36px",
                    height: "36px",
                    borderRadius: "8px",
                    background: "#fef2f2",
                    color: "#dc2626",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center"
                  }}
                >
                  <Clock size={20} />
                </div>
                <div>
                  <h3 style={{ fontSize: "1.1rem", fontWeight: 800, color: "#0f172a", margin: 0 }}>
                    Grading Backlog &amp; Overdue Deadlines
                  </h3>
                  <div style={{ fontSize: "0.78rem", color: "#64748b" }}>
                    Exams past their scheduled correction deadline requiring administrative attention
                  </div>
                </div>
              </div>
            </div>

            {healthData?.overdue_exams && healthData.overdue_exams.length > 0 ? (
              <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                {healthData.overdue_exams.map((exam) => (
                  <div
                    key={exam.id}
                    style={{
                      background: "#fff1f2",
                      border: "1px solid #fecdd3",
                      borderRadius: "10px",
                      padding: "0.9rem 1.1rem",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      flexWrap: "wrap",
                      gap: "0.75rem"
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 800, fontSize: "0.92rem", color: "#9f1239" }}>
                        {exam.title}
                      </div>
                      <div style={{ fontSize: "0.76rem", color: "#be123c", marginTop: "0.15rem" }}>
                        Exam Date: {exam.exam_date} • <strong>Deadline was {exam.correction_deadline}</strong> •{" "}
                        {exam.evals_count} papers evaluated
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => onNavigate("exams", { examId: exam.id })}
                      style={{
                        padding: "0.4rem 0.8rem",
                        background: "#be123c",
                        color: "#ffffff",
                        border: "none",
                        borderRadius: "6px",
                        fontSize: "0.78rem",
                        fontWeight: 700,
                        cursor: "pointer",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "0.3rem"
                      }}
                    >
                      <span>Open Exam Desk</span>
                      <ChevronRight size={14} />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div
                style={{
                  background: "#f0fdf4",
                  border: "1px solid #bbf7d0",
                  borderRadius: "10px",
                  padding: "1rem",
                  color: "#166534",
                  fontSize: "0.85rem",
                  fontWeight: 600,
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem"
                }}
              >
                <CheckCircle2 size={18} />
                <span>Great news! No exams are currently past their correction deadline.</span>
              </div>
            )}
          </div>

          {/* Orphaned Subjects & Courses */}
          <div
            style={{
              background: "#ffffff",
              border: "1px solid #e2e8f0",
              borderRadius: "16px",
              padding: "1.75rem",
              boxShadow: "0 1px 3px rgba(0,0,0,0.03)"
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1rem", flexWrap: "wrap", gap: "0.75rem" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                <div
                  style={{
                    width: "36px",
                    height: "36px",
                    borderRadius: "8px",
                    background: "#fffbeb",
                    color: "#d97706",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center"
                  }}
                >
                  <Layers size={20} />
                </div>
                <div>
                  <h3 style={{ fontSize: "1.1rem", fontWeight: 800, color: "#0f172a", margin: 0 }}>
                    Orphaned Subjects &amp; Workload Gaps
                  </h3>
                  <div style={{ fontSize: "0.78rem", color: "#64748b" }}>
                    Subjects without an assigned faculty teacher or whose teacher has departed
                  </div>
                </div>
              </div>

              {healthData?.orphaned_subjects && healthData.orphaned_subjects.length > 0 && (
                <button
                  type="button"
                  onClick={handleFixAllOrphans}
                  style={{
                    padding: "0.45rem 0.85rem",
                    background: "#d97706",
                    color: "#ffffff",
                    border: "none",
                    borderRadius: "8px",
                    fontSize: "0.82rem",
                    fontWeight: 700,
                    cursor: "pointer",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "0.4rem"
                  }}
                >
                  <Sparkles size={15} />
                  <span>Auto-Reassign to My Admin Profile</span>
                </button>
              )}
            </div>

            {healthData?.orphaned_subjects && healthData.orphaned_subjects.length > 0 ? (
              <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                {healthData.orphaned_subjects.map((sub) => (
                  <div
                    key={sub.id}
                    style={{
                      background: "#fffbeb",
                      border: "1px solid #fef3c7",
                      borderRadius: "10px",
                      padding: "0.85rem 1.1rem",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between"
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 800, fontSize: "0.9rem", color: "#92400e" }}>
                        {sub.name} ({sub.code})
                      </div>
                      <div style={{ fontSize: "0.75rem", color: "#b45309" }}>
                        Subject ID: {sub.id} • Currently has no assigned teacher
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div
                style={{
                  background: "#f0fdf4",
                  border: "1px solid #bbf7d0",
                  borderRadius: "10px",
                  padding: "1rem",
                  color: "#166534",
                  fontSize: "0.85rem",
                  fontWeight: 600,
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem"
                }}
              >
                <CheckCircle2 size={18} />
                <span>All active subjects have assigned faculty teachers.</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL 1: CHANGE FACULTY ROLE */}
      {showRoleModal && targetTeacher && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(15, 23, 42, 0.45)",
            backdropFilter: "blur(4px)",
            zIndex: 9999,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "1.5rem"
          }}
        >
          <div
            style={{
              background: "#ffffff",
              borderRadius: "16px",
              padding: "1.75rem",
              maxWidth: "440px",
              width: "100%",
              boxShadow: "0 20px 25px -5px rgba(0,0,0,0.1)"
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1rem" }}>
              <h3 style={{ fontSize: "1.15rem", fontWeight: 800, color: "#0f172a", margin: 0 }}>
                Manage Role: {targetTeacher.full_name}
              </h3>
              <button
                type="button"
                onClick={() => setShowRoleModal(false)}
                style={{ border: "none", background: "transparent", color: "#94a3b8", cursor: "pointer" }}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleUpdateRole} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              <div>
                <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 700, color: "#334155", marginBottom: "0.35rem" }}>
                  Institutional Role
                </label>
                <select
                  value={selectedNewRole}
                  onChange={(e) => setSelectedNewRole(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "0.55rem 0.75rem",
                    borderRadius: "8px",
                    border: "1px solid #cbd5e1",
                    fontSize: "0.88rem",
                    background: "#ffffff"
                  }}
                >
                  <option value="Teacher">Teacher / Faculty</option>
                  <option value="HOD">Head of Department (HOD)</option>
                  <option value="Exam Coordinator">Exam Coordinator</option>
                  <option value="Admin">Administrator (Super Admin)</option>
                </select>
              </div>

              <div>
                <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 700, color: "#334155", marginBottom: "0.35rem" }}>
                  Department
                </label>
                <input
                  type="text"
                  value={selectedNewDept}
                  onChange={(e) => setSelectedNewDept(e.target.value)}
                  placeholder="e.g. Science, Mathematics, English"
                  style={{
                    width: "100%",
                    padding: "0.55rem 0.75rem",
                    borderRadius: "8px",
                    border: "1px solid #cbd5e1",
                    fontSize: "0.88rem"
                  }}
                />
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.5rem", marginTop: "0.5rem" }}>
                <button
                  type="button"
                  onClick={() => setShowRoleModal(false)}
                  style={{
                    padding: "0.55rem 0.85rem",
                    border: "1px solid #cbd5e1",
                    background: "#ffffff",
                    borderRadius: "8px",
                    fontWeight: 700,
                    fontSize: "0.85rem",
                    color: "#475569",
                    cursor: "pointer"
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isActionLoading}
                  style={{
                    padding: "0.55rem 1rem",
                    background: "#2563eb",
                    color: "#ffffff",
                    border: "none",
                    borderRadius: "8px",
                    fontWeight: 700,
                    fontSize: "0.85rem",
                    cursor: "pointer"
                  }}
                >
                  {isActionLoading ? "Saving..." : "Save Role"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: REASSIGN TEACHER WORKLOAD */}
      {showReassignModal && reassignFromTeacher && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(15, 23, 42, 0.45)",
            backdropFilter: "blur(4px)",
            zIndex: 9999,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "1.5rem"
          }}
        >
          <div
            style={{
              background: "#ffffff",
              borderRadius: "16px",
              padding: "1.75rem",
              maxWidth: "460px",
              width: "100%",
              boxShadow: "0 20px 25px -5px rgba(0,0,0,0.1)"
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1rem" }}>
              <h3 style={{ fontSize: "1.15rem", fontWeight: 800, color: "#0f172a", margin: 0 }}>
                Transfer Subjects Workload
              </h3>
              <button
                type="button"
                onClick={() => setShowReassignModal(false)}
                style={{ border: "none", background: "transparent", color: "#94a3b8", cursor: "pointer" }}
              >
                <X size={20} />
              </button>
            </div>

            <p style={{ fontSize: "0.82rem", color: "#64748b", margin: "0 0 1rem 0" }}>
              Transfer all {reassignFromTeacher.subjects_count ?? 0} assigned subjects from{" "}
              <strong>{reassignFromTeacher.full_name}</strong> to another faculty member.
            </p>

            <form onSubmit={handleReassignWorkload} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              <div>
                <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 700, color: "#334155", marginBottom: "0.35rem" }}>
                  Select Target Teacher
                </label>
                <select
                  required
                  value={reassignToTeacherId}
                  onChange={(e) => setReassignToTeacherId(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "0.55rem 0.75rem",
                    borderRadius: "8px",
                    border: "1px solid #cbd5e1",
                    fontSize: "0.88rem",
                    background: "#ffffff"
                  }}
                >
                  <option value="">-- Choose Target Faculty --</option>
                  {facultyList
                    .filter((f) => f.id !== reassignFromTeacher.id)
                    .map((f) => (
                      <option key={f.id} value={f.id}>
                        {f.full_name || f.username} ({f.department || "General"})
                      </option>
                    ))}
                </select>
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.5rem", marginTop: "0.5rem" }}>
                <button
                  type="button"
                  onClick={() => setShowReassignModal(false)}
                  style={{
                    padding: "0.55rem 0.85rem",
                    border: "1px solid #cbd5e1",
                    background: "#ffffff",
                    borderRadius: "8px",
                    fontWeight: 700,
                    fontSize: "0.85rem",
                    color: "#475569",
                    cursor: "pointer"
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isActionLoading || !reassignToTeacherId}
                  style={{
                    padding: "0.55rem 1rem",
                    background: "#2563eb",
                    color: "#ffffff",
                    border: "none",
                    borderRadius: "8px",
                    fontWeight: 700,
                    fontSize: "0.85rem",
                    cursor: "pointer"
                  }}
                >
                  {isActionLoading ? "Transferring..." : "Confirm Transfer"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: RESET TEACHER PASSWORD */}
      {showPasswordResetModal && resetTeacherTarget && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(15, 23, 42, 0.45)",
            backdropFilter: "blur(4px)",
            zIndex: 9999,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "1.5rem"
          }}
        >
          <div
            style={{
              background: "#ffffff",
              borderRadius: "16px",
              padding: "1.75rem",
              maxWidth: "420px",
              width: "100%",
              boxShadow: "0 20px 25px -5px rgba(0,0,0,0.1)"
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1rem" }}>
              <h3 style={{ fontSize: "1.15rem", fontWeight: 800, color: "#0f172a", margin: 0 }}>
                Reset Password: @{resetTeacherTarget.username}
              </h3>
              <button
                type="button"
                onClick={() => setShowPasswordResetModal(false)}
                style={{ border: "none", background: "transparent", color: "#94a3b8", cursor: "pointer" }}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleResetPassword} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              <div>
                <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 700, color: "#334155", marginBottom: "0.35rem" }}>
                  New Plaintext Password
                </label>
                <input
                  type="password"
                  required
                  value={newPasswordVal}
                  onChange={(e) => setNewPasswordVal(e.target.value)}
                  placeholder="Min 4 characters"
                  style={{
                    width: "100%",
                    padding: "0.55rem 0.75rem",
                    borderRadius: "8px",
                    border: "1px solid #cbd5e1",
                    fontSize: "0.88rem"
                  }}
                />
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.5rem", marginTop: "0.5rem" }}>
                <button
                  type="button"
                  onClick={() => setShowPasswordResetModal(false)}
                  style={{
                    padding: "0.55rem 0.85rem",
                    border: "1px solid #cbd5e1",
                    background: "#ffffff",
                    borderRadius: "8px",
                    fontWeight: 700,
                    fontSize: "0.85rem",
                    color: "#475569",
                    cursor: "pointer"
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isActionLoading || newPasswordVal.length < 4}
                  style={{
                    padding: "0.55rem 1rem",
                    background: "#2563eb",
                    color: "#ffffff",
                    border: "none",
                    borderRadius: "8px",
                    fontWeight: 700,
                    fontSize: "0.85rem",
                    cursor: "pointer"
                  }}
                >
                  {isActionLoading ? "Resetting..." : "Set Password"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 4: TRANSFER STUDENT COHORT */}
      {showTransferModal && transferStudentTarget && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(15, 23, 42, 0.45)",
            backdropFilter: "blur(4px)",
            zIndex: 9999,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "1.5rem"
          }}
        >
          <div
            style={{
              background: "#ffffff",
              borderRadius: "16px",
              padding: "1.75rem",
              maxWidth: "440px",
              width: "100%",
              boxShadow: "0 20px 25px -5px rgba(0,0,0,0.1)"
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1rem" }}>
              <h3 style={{ fontSize: "1.15rem", fontWeight: 800, color: "#0f172a", margin: 0 }}>
                Transfer: {transferStudentTarget.name}
              </h3>
              <button
                type="button"
                onClick={() => setShowTransferModal(false)}
                style={{ border: "none", background: "transparent", color: "#94a3b8", cursor: "pointer" }}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleTransferStudent} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              <div>
                <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 700, color: "#334155", marginBottom: "0.35rem" }}>
                  Destination Class Cohort
                </label>
                <select
                  required
                  value={transferTargetClassId}
                  onChange={(e) => setTransferTargetClassId(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "0.55rem 0.75rem",
                    borderRadius: "8px",
                    border: "1px solid #cbd5e1",
                    fontSize: "0.88rem",
                    background: "#ffffff"
                  }}
                >
                  {classes.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} {c.code && `(${c.code})`}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 700, color: "#334155", marginBottom: "0.35rem" }}>
                  Assigned Section
                </label>
                <input
                  type="text"
                  required
                  value={transferTargetSection}
                  onChange={(e) => setTransferTargetSection(e.target.value)}
                  placeholder="e.g. A or B"
                  style={{
                    width: "100%",
                    padding: "0.55rem 0.75rem",
                    borderRadius: "8px",
                    border: "1px solid #cbd5e1",
                    fontSize: "0.88rem"
                  }}
                />
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.5rem", marginTop: "0.5rem" }}>
                <button
                  type="button"
                  onClick={() => setShowTransferModal(false)}
                  style={{
                    padding: "0.55rem 0.85rem",
                    border: "1px solid #cbd5e1",
                    background: "#ffffff",
                    borderRadius: "8px",
                    fontWeight: 700,
                    fontSize: "0.85rem",
                    color: "#475569",
                    cursor: "pointer"
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isActionLoading}
                  style={{
                    padding: "0.55rem 1rem",
                    background: "#2563eb",
                    color: "#ffffff",
                    border: "none",
                    borderRadius: "8px",
                    fontWeight: 700,
                    fontSize: "0.85rem",
                    cursor: "pointer"
                  }}
                >
                  {isActionLoading ? "Transferring..." : "Confirm Transfer"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 5: ADD NEW FACULTY ACCOUNT */}
      {showNewTeacherModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(15, 23, 42, 0.45)",
            backdropFilter: "blur(4px)",
            zIndex: 9999,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "1.5rem"
          }}
        >
          <div
            style={{
              background: "#ffffff",
              borderRadius: "16px",
              padding: "1.75rem",
              maxWidth: "460px",
              width: "100%",
              boxShadow: "0 20px 25px -5px rgba(0,0,0,0.1)"
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1rem" }}>
              <h3 style={{ fontSize: "1.15rem", fontWeight: 800, color: "#0f172a", margin: 0 }}>
                Register New Faculty Member
              </h3>
              <button
                type="button"
                onClick={() => setShowNewTeacherModal(false)}
                style={{ border: "none", background: "transparent", color: "#94a3b8", cursor: "pointer" }}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreateNewTeacher} style={{ display: "flex", flexDirection: "column", gap: "0.85rem" }}>
              <div>
                <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 700, color: "#334155", marginBottom: "0.3rem" }}>
                  Full Name
                </label>
                <input
                  type="text"
                  required
                  value={newTeacherFullName}
                  onChange={(e) => setNewTeacherFullName(e.target.value)}
                  placeholder="e.g. Dr. Rajesh Sharma"
                  style={{
                    width: "100%",
                    padding: "0.55rem 0.75rem",
                    borderRadius: "8px",
                    border: "1px solid #cbd5e1",
                    fontSize: "0.88rem"
                  }}
                />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
                <div>
                  <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 700, color: "#334155", marginBottom: "0.3rem" }}>
                    Username
                  </label>
                  <input
                    type="text"
                    required
                    value={newTeacherUsername}
                    onChange={(e) => setNewTeacherUsername(e.target.value)}
                    placeholder="rsharma"
                    style={{
                      width: "100%",
                      padding: "0.55rem 0.75rem",
                      borderRadius: "8px",
                      border: "1px solid #cbd5e1",
                      fontSize: "0.88rem"
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 700, color: "#334155", marginBottom: "0.3rem" }}>
                    Password
                  </label>
                  <input
                    type="password"
                    required
                    value={newTeacherPassword}
                    onChange={(e) => setNewTeacherPassword(e.target.value)}
                    placeholder="min 4 chars"
                    style={{
                      width: "100%",
                      padding: "0.55rem 0.75rem",
                      borderRadius: "8px",
                      border: "1px solid #cbd5e1",
                      fontSize: "0.88rem"
                    }}
                  />
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1.2fr 0.8fr", gap: "0.75rem" }}>
                <div>
                  <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 700, color: "#334155", marginBottom: "0.3rem" }}>
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={newTeacherEmail}
                    onChange={(e) => setNewTeacherEmail(e.target.value)}
                    placeholder="teacher@school.edu"
                    style={{
                      width: "100%",
                      padding: "0.55rem 0.75rem",
                      borderRadius: "8px",
                      border: "1px solid #cbd5e1",
                      fontSize: "0.88rem"
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 700, color: "#334155", marginBottom: "0.3rem" }}>
                    Role
                  </label>
                  <select
                    value={newTeacherRole}
                    onChange={(e) => setNewTeacherRole(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "0.55rem 0.75rem",
                      borderRadius: "8px",
                      border: "1px solid #cbd5e1",
                      fontSize: "0.88rem",
                      background: "#ffffff"
                    }}
                  >
                    <option value="Teacher">Teacher</option>
                    <option value="HOD">HOD</option>
                    <option value="Exam Coordinator">Exam Coordinator</option>
                    <option value="Admin">Admin</option>
                  </select>
                </div>
              </div>

              <div>
                <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 700, color: "#334155", marginBottom: "0.3rem" }}>
                  Department
                </label>
                <input
                  type="text"
                  value={newTeacherDept}
                  onChange={(e) => setNewTeacherDept(e.target.value)}
                  placeholder="e.g. Science or Computer Science"
                  style={{
                    width: "100%",
                    padding: "0.55rem 0.75rem",
                    borderRadius: "8px",
                    border: "1px solid #cbd5e1",
                    fontSize: "0.88rem"
                  }}
                />
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.5rem", marginTop: "0.5rem" }}>
                <button
                  type="button"
                  onClick={() => setShowNewTeacherModal(false)}
                  style={{
                    padding: "0.55rem 0.85rem",
                    border: "1px solid #cbd5e1",
                    background: "#ffffff",
                    borderRadius: "8px",
                    fontWeight: 700,
                    fontSize: "0.85rem",
                    color: "#475569",
                    cursor: "pointer"
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isActionLoading}
                  style={{
                    padding: "0.55rem 1rem",
                    background: "#2563eb",
                    color: "#ffffff",
                    border: "none",
                    borderRadius: "8px",
                    fontWeight: 700,
                    fontSize: "0.85rem",
                    cursor: "pointer"
                  }}
                >
                  {isActionLoading ? "Registering..." : "Create Account"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* STUDENT PROFILE MODAL */}
      {selectedStudentForProfile && (
        <StudentProfileModal
          student={selectedStudentForProfile}
          onClose={() => setSelectedStudentForProfile(null)}
          onStudentUpdated={() => loadAllData(selectedInstId)}
        />
      )}
    </div>
  );
};

export default AdminDashboardPage;
