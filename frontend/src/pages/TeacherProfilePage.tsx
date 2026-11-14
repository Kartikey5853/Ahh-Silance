import React, { useState, useEffect } from "react";
import { academicApi } from "../api/academicApi";
import type { UserProfile, Institution, InstitutionType, ClassItem } from "../types/academic";
import {
  Save,
  GraduationCap,
  Building2,
  Check,
  Key,
  FolderGit2,
  Plus,
  Trash2,
  Bell,
  Lock
} from "lucide-react";

interface TeacherProfilePageProps {
  onLogout?: () => void;
}

export const TeacherProfilePage: React.FC<TeacherProfilePageProps> = ({ onLogout }) => {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("Professor");
  const [department, setDepartment] = useState("");
  const [geminiApiKey, setGeminiApiKey] = useState("");

  // Organization in Settings
  const [institutions, setInstitutions] = useState<Institution[]>([]);
  const [selectedInstId, setSelectedInstId] = useState<string>("");
  const [showNewOrgForm, setShowNewOrgForm] = useState(false);
  const [newOrgName, setNewOrgName] = useState("");
  const [newOrgType, setNewOrgType] = useState<InstitutionType>("school");
  const [newOrgCode, setNewOrgCode] = useState("");

  // Classes in Settings
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [showNewClassForm, setShowNewClassForm] = useState(false);
  const [newClassName, setNewClassName] = useState("");
  const [newClassCode, setNewClassCode] = useState("");
  const [newClassDept, setNewClassDept] = useState("");

  // Notification Settings (No backend logic connected, pure UI toggles as requested)
  const [notifyGradingComplete, setNotifyGradingComplete] = useState(true);
  const [notifyParentAlerts, setNotifyParentAlerts] = useState(true);
  const [notifyWeeklyDigest, setNotifyWeeklyDigest] = useState(false);
  const [notifyRubricUpdates, setNotifyRubricUpdates] = useState(true);

  const [isSaving, setIsSaving] = useState(false);
  const [savedMessage, setSavedMessage] = useState<string | null>(null);

  const loadClassesForOrg = async (instId?: string) => {
    try {
      const cls = await academicApi.listClasses(instId || undefined);
      setClasses(cls || []);
    } catch {
      setClasses([]);
    }
  };

  useEffect(() => {
    if (selectedInstId) {
      loadClassesForOrg(selectedInstId);
    }
  }, [selectedInstId]);

  useEffect(() => {
    Promise.all([
      academicApi.getProfile().catch(() => null),
      academicApi.listInstitutions().catch(() => []),
      academicApi.listClasses().catch(() => [])
    ]).then(([profData, instList, classList]) => {
      if (profData) {
        setProfile(profData);
        setFullName(profData.full_name || "");
        setEmail(profData.email || "");
        setRole(profData.role || "Professor");
        setDepartment(profData.department || "");
        if (profData.institution_id) {
          setSelectedInstId(profData.institution_id);
        }
      }
      if (instList && instList.length > 0) {
        setInstitutions(instList);
        if (!selectedInstId && !profData?.institution_id) {
          setSelectedInstId(instList[0].id);
        }
      }
      if (classList && classList.length > 0) {
        setClasses(classList);
      }
    });
  }, []);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSavedMessage(null);

    try {
      const payload: any = {
        full_name: fullName.trim(),
        email: email.trim(),
        role: role.trim(),
        department: department.trim(),
        institution_id: selectedInstId || undefined
      };
      if (geminiApiKey.trim()) {
        payload.gemini_api_key = geminiApiKey.trim();
      }

      await academicApi.updateProfile(payload);
      const updated = await academicApi.getProfile();
      setProfile(updated);
      setSavedMessage("Settings saved successfully!");
      setTimeout(() => setSavedMessage(null), 3000);
    } catch (err) {
      alert("Error updating profile.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleCreateNewOrg = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newOrgName.trim()) return;

    try {
      setIsSaving(true);
      const created = await academicApi.createInstitution({
        name: newOrgName.trim(),
        type: newOrgType,
        code: newOrgCode.trim()
      });
      setInstitutions((prev) => [created, ...prev]);
      setSelectedInstId(created.id);
      await academicApi.updateProfile({ institution_id: created.id });
      setShowNewOrgForm(false);
      setNewOrgName("");
      setNewOrgCode("");
      setSavedMessage("Organization created & linked!");
      setTimeout(() => setSavedMessage(null), 3000);
    } catch (err) {
      alert("Failed to create organization.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleCreateClassInSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClassName.trim()) return;

    try {
      setIsSaving(true);
      const created = await academicApi.createClass({
        name: newClassName.trim(),
        code: newClassCode.trim() || undefined,
        institution_id: selectedInstId || undefined,
        department: newClassDept.trim() || undefined
      });
      setClasses((prev) => [created, ...prev]);
      setNewClassName("");
      setNewClassCode("");
      setNewClassDept("");
      setShowNewClassForm(false);
      setSavedMessage("Class registered successfully!");
      setTimeout(() => setSavedMessage(null), 3000);
    } catch (err: any) {
      alert("Failed to create class: " + (err?.response?.data?.detail || err.message));
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteClassInSettings = async (classId: string) => {
    if (!confirm("Are you sure you want to remove this class cohort?")) return;
    try {
      await academicApi.deleteClass(classId);
      setClasses((prev) => prev.filter((c) => c.id !== classId));
      setSavedMessage("Class deleted successfully.");
      setTimeout(() => setSavedMessage(null), 3000);
    } catch {
      alert("Failed to delete class.");
    }
  };

  const currentOrg = institutions.find((i) => i.id === selectedInstId) || institutions[0];

  const isAdmin = (profile?.role || role || "").toLowerCase().includes("admin");

  return (
    <div className="teacher-profile-page pb-24" style={{ maxWidth: "760px", margin: "0 auto" }}>
      <div style={{ marginBottom: "1.5rem" }}>
        <h1 style={{ fontSize: "1.6rem", fontWeight: 800, color: "#0f172a", letterSpacing: "-0.03em", margin: 0 }}>
          Settings &amp; Preferences
        </h1>
        <p style={{ color: "#64748b", fontSize: "0.88rem", marginTop: "2px" }}>
          Manage your faculty profile, organization details, class cohorts and alert preferences
        </p>
      </div>

      {savedMessage && (
        <div
          style={{
            background: "#f0fdf4",
            border: "1px solid #bbf7d0",
            borderRadius: "8px",
            padding: "0.75rem 1rem",
            color: "#166534",
            fontSize: "0.85rem",
            fontWeight: 700,
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
            marginBottom: "1.25rem"
          }}
        >
          <Check size={16} />
          <span>{savedMessage}</span>
        </div>
      )}

      {/* SECTION 1: ORGANIZATION MANAGEMENT IN SETTINGS */}
      <div
        style={{
          background: "#ffffff",
          border: "1px solid #e2e8f0",
          borderRadius: "14px",
          padding: "1.75rem",
          marginBottom: "1.5rem",
          boxShadow: "0 1px 3px 0 rgba(0, 0, 0, 0.03)"
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "1.25rem" }}>
          <div
            style={{
              width: "38px",
              height: "38px",
              borderRadius: "8px",
              background: "#eff6ff",
              color: "#2563eb",
              display: "flex",
              alignItems: "center",
              justifyContent: "center"
            }}
          >
            <Building2 size={20} />
          </div>
          <div>
            <h2 style={{ fontSize: "1.1rem", fontWeight: 800, color: "#0f172a", margin: 0 }}>
              Academic Organization
            </h2>
            <div style={{ fontSize: "0.78rem", color: "#64748b" }}>
              {isAdmin ? "Manage and switch educational institutions" : "Affiliated educational institution (locked for teachers)"}
            </div>
          </div>
        </div>

        {/* Current Active Org Selection (or Read-only for Teachers) */}
        {!isAdmin ? (
          <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "10px", padding: "1rem" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "0.5rem" }}>
              <div>
                <div style={{ fontSize: "0.72rem", fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                  Your School / College
                </div>
                <div style={{ fontSize: "1.1rem", fontWeight: 800, color: "#0f172a", marginTop: "0.2rem" }}>
                  {currentOrg?.name || "Academic Institution"}
                </div>
                <div style={{ fontSize: "0.76rem", color: "#64748b", marginTop: "0.25rem" }}>
                  Type: <strong>{currentOrg?.type === "school" ? "School (CBSE / State)" : currentOrg?.type === "college" ? "College (University)" : "Competitive"}</strong> • Code: {currentOrg?.code || "None"}
                </div>
              </div>
              <div
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "0.35rem",
                  background: "#f1f5f9",
                  border: "1px solid #cbd5e1",
                  padding: "0.35rem 0.65rem",
                  borderRadius: "6px",
                  fontSize: "0.74rem",
                  color: "#475569",
                  fontWeight: 700
                }}
              >
                <Lock size={12} />
                <span>Managed by Admin</span>
              </div>
            </div>
            <div style={{ fontSize: "0.72rem", color: "#94a3b8", marginTop: "0.6rem" }}>
              Teachers cannot change affiliated organization. To request a transfer, please contact your school/college administrator.
            </div>
          </div>
        ) : (
          <>
            {institutions.length > 0 && (
              <div style={{ marginBottom: "1rem" }}>
                <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 700, marginBottom: "0.35rem" }}>
                  Active Organization
                </label>
                <select
                  value={selectedInstId}
                  onChange={(e) => setSelectedInstId(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "0.55rem 0.75rem",
                    borderRadius: "8px",
                    border: "1px solid #cbd5e1",
                    fontSize: "0.88rem",
                    fontWeight: 600,
                    background: "#ffffff"
                  }}
                >
                  {institutions.map((i) => (
                    <option key={i.id} value={i.id}>
                      {i.name} ({i.type.toUpperCase()})
                    </option>
                  ))}
                </select>

                {currentOrg && (
                  <div style={{ fontSize: "0.75rem", color: "#64748b", marginTop: "0.35rem" }}>
                    Type: <strong>{currentOrg.type === "school" ? "School (CBSE / State)" : currentOrg.type === "college" ? "College (University / Autonomous)" : "Competitive"}</strong> • Code: {currentOrg.code || "None"}
                  </div>
                )}
              </div>
            )}

            <div style={{ display: "flex", justifyContent: "flex-end" }}>
              <button
                type="button"
                onClick={() => setShowNewOrgForm(!showNewOrgForm)}
                style={{
                  background: showNewOrgForm ? "#f1f5f9" : "#eff6ff",
                  border: `1px solid ${showNewOrgForm ? "#cbd5e1" : "#bfdbfe"}`,
                  color: showNewOrgForm ? "#475569" : "#1d4ed8",
                  padding: "0.4rem 0.85rem",
                  borderRadius: "6px",
                  fontSize: "0.8rem",
                  fontWeight: 700,
                  cursor: "pointer"
                }}
              >
                {showNewOrgForm ? "Cancel" : "+ Add New Organization"}
              </button>
            </div>

            {/* New Organization Sub-Form */}
            {showNewOrgForm && (
              <form onSubmit={handleCreateNewOrg} style={{ marginTop: "1rem", paddingTop: "1rem", borderTop: "1px solid #f1f5f9" }}>
                <div style={{ marginBottom: "0.85rem" }}>
                  <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 700, marginBottom: "0.3rem" }}>
                    Organization Model
                  </label>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "0.5rem" }}>
                    {[
                      { id: "school", label: "School (CBSE)" },
                      { id: "college", label: "College (B.Tech)" },
                      { id: "competitive", label: "Coaching (JEE)" }
                    ].map((t) => (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => setNewOrgType(t.id as any)}
                        style={{
                          border: newOrgType === t.id ? "2px solid #2563eb" : "1px solid #cbd5e1",
                          background: newOrgType === t.id ? "#eff6ff" : "#ffffff",
                          padding: "0.45rem",
                          borderRadius: "6px",
                          fontSize: "0.78rem",
                          fontWeight: 700,
                          cursor: "pointer"
                        }}
                      >
                        {t.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1.4fr 0.8fr", gap: "0.75rem", marginBottom: "1rem" }}>
                  <div>
                    <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 700, marginBottom: "0.3rem" }}>
                      Name *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Delhi Public School"
                      value={newOrgName}
                      onChange={(e) => setNewOrgName(e.target.value)}
                      style={{ width: "100%", padding: "0.5rem 0.75rem", borderRadius: "8px", border: "1px solid #cbd5e1", fontSize: "0.85rem" }}
                    />
                  </div>
                  <div>
                    <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 700, marginBottom: "0.3rem" }}>
                      Code
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. DPS-2026"
                      value={newOrgCode}
                      onChange={(e) => setNewOrgCode(e.target.value)}
                      style={{ width: "100%", padding: "0.5rem 0.75rem", borderRadius: "8px", border: "1px solid #cbd5e1", fontSize: "0.85rem" }}
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isSaving}
                  style={{
                    background: "#2563eb",
                    color: "#ffffff",
                    border: "none",
                    borderRadius: "6px",
                    padding: "0.45rem 1rem",
                    fontSize: "0.82rem",
                    fontWeight: 700,
                    cursor: "pointer"
                  }}
                >
                  Save Organization
                </button>
              </form>
            )}
          </>
        )}
      </div>

      {/* SECTION 2: CLASSES & BATCHES MANAGEMENT */}
      <div
        style={{
          background: "#ffffff",
          border: "1px solid #e2e8f0",
          borderRadius: "14px",
          padding: "1.75rem",
          marginBottom: "1.5rem",
          boxShadow: "0 1px 3px 0 rgba(0, 0, 0, 0.03)"
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1.25rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
            <div
              style={{
                width: "38px",
                height: "38px",
                borderRadius: "8px",
                background: "#f0fdf4",
                color: "#16a34a",
                display: "flex",
                alignItems: "center",
                justifyContent: "center"
              }}
            >
              <FolderGit2 size={20} />
            </div>
            <div>
              <h2 style={{ fontSize: "1.1rem", fontWeight: 800, color: "#0f172a", margin: 0 }}>
                Classes &amp; Batches
              </h2>
              <div style={{ fontSize: "0.78rem", color: "#64748b" }}>
                Cohorts registered under {currentOrg?.name || "your organization"} ({classes.length} active)
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setShowNewClassForm(!showNewClassForm)}
            style={{
              background: showNewClassForm ? "#f1f5f9" : "#eff6ff",
              border: `1px solid ${showNewClassForm ? "#cbd5e1" : "#bfdbfe"}`,
              color: showNewClassForm ? "#475569" : "#1d4ed8",
              padding: "0.4rem 0.85rem",
              borderRadius: "6px",
              fontSize: "0.8rem",
              fontWeight: 700,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "0.3rem"
            }}
          >
            <Plus size={14} />
            <span>{showNewClassForm ? "Cancel" : "Add New Class"}</span>
          </button>
        </div>

        {/* New Class Sub-Form */}
        {showNewClassForm && (
          <form
            onSubmit={handleCreateClassInSettings}
            style={{
              background: "#f8fafc",
              border: "1.5px dashed #3b82f6",
              borderRadius: "10px",
              padding: "1rem",
              marginBottom: "1.25rem"
            }}
          >
            <div style={{ fontSize: "0.84rem", fontWeight: 800, color: "#1e3a8a", marginBottom: "0.75rem" }}>
              Register New Class / Section
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1.4fr 0.8fr 1fr", gap: "0.75rem", marginBottom: "0.85rem" }}>
              <div>
                <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 700, color: "#475569", marginBottom: "0.25rem" }}>
                  Class Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Class 10 - Section B"
                  value={newClassName}
                  onChange={(e) => setNewClassName(e.target.value)}
                  style={{ width: "100%", padding: "0.48rem 0.65rem", borderRadius: "8px", border: "1px solid #cbd5e1", fontSize: "0.83rem" }}
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 700, color: "#475569", marginBottom: "0.25rem" }}>
                  Code / Short Tag
                </label>
                <input
                  type="text"
                  placeholder="e.g. 10B"
                  value={newClassCode}
                  onChange={(e) => setNewClassCode(e.target.value)}
                  style={{ width: "100%", padding: "0.48rem 0.65rem", borderRadius: "8px", border: "1px solid #cbd5e1", fontSize: "0.83rem" }}
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 700, color: "#475569", marginBottom: "0.25rem" }}>
                  Department / Level
                </label>
                <input
                  type="text"
                  placeholder="e.g. Science / Secondary"
                  value={newClassDept}
                  onChange={(e) => setNewClassDept(e.target.value)}
                  style={{ width: "100%", padding: "0.48rem 0.65rem", borderRadius: "8px", border: "1px solid #cbd5e1", fontSize: "0.83rem" }}
                />
              </div>
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.5rem" }}>
              <button
                type="button"
                onClick={() => setShowNewClassForm(false)}
                style={{
                  background: "#f1f5f9",
                  border: "1px solid #cbd5e1",
                  borderRadius: "6px",
                  padding: "0.42rem 0.75rem",
                  fontSize: "0.8rem",
                  fontWeight: 600,
                  cursor: "pointer"
                }}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSaving || !newClassName.trim()}
                style={{
                  background: "#2563eb",
                  color: "#ffffff",
                  border: "none",
                  borderRadius: "6px",
                  padding: "0.42rem 1rem",
                  fontSize: "0.8rem",
                  fontWeight: 700,
                  cursor: "pointer"
                }}
              >
                {isSaving ? "Saving..." : "Save Class"}
              </button>
            </div>
          </form>
        )}

        {/* Modern UI Class List */}
        {classes.length === 0 ? (
          <div
            style={{
              padding: "1.5rem",
              background: "#f8fafc",
              border: "1px dashed #cbd5e1",
              borderRadius: "10px",
              textAlign: "center"
            }}
          >
            <div style={{ color: "#64748b", fontSize: "0.85rem", marginBottom: "0.5rem" }}>
              No classes registered for {currentOrg?.name || "this organization"} yet.
            </div>
            <button
              type="button"
              onClick={() => setShowNewClassForm(true)}
              style={{
                background: "#eff6ff",
                border: "1px solid #bfdbfe",
                color: "#1d4ed8",
                padding: "0.4rem 0.9rem",
                borderRadius: "6px",
                fontSize: "0.8rem",
                fontWeight: 700,
                cursor: "pointer"
              }}
            >
              + Create First Class
            </button>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
            {classes.map((c) => (
              <div
                key={c.id}
                style={{
                  border: "1px solid #e2e8f0",
                  borderRadius: "10px",
                  padding: "0.85rem 1rem",
                  background: "#ffffff",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  boxShadow: "0 1px 2px rgba(0,0,0,0.02)"
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "0.65rem", minWidth: 0 }}>
                  <div
                    style={{
                      width: "34px",
                      height: "34px",
                      borderRadius: "8px",
                      background: "#f1f5f9",
                      color: "#475569",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0
                    }}
                  >
                    <FolderGit2 size={18} />
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: "0.88rem", fontWeight: 800, color: "#0f172a", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {c.name}
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginTop: "0.2rem", fontSize: "0.72rem", color: "#64748b" }}>
                      {c.code && (
                        <span style={{ background: "#eff6ff", color: "#1d4ed8", padding: "0.1rem 0.4rem", borderRadius: "4px", fontWeight: 700 }}>
                          {c.code}
                        </span>
                      )}
                      <span>
                        {c.students_count || 0} students
                      </span>
                      <span>•</span>
                      <span>
                        {c.subjects_count || 0} subjects
                      </span>
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => handleDeleteClassInSettings(c.id)}
                  title="Delete Class"
                  style={{
                    background: "transparent",
                    border: "none",
                    color: "#94a3b8",
                    padding: "0.4rem",
                    borderRadius: "6px",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    transition: "color 0.15s ease"
                  }}
                  onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.color = "#dc2626")}
                  onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.color = "#94a3b8")}
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* SECTION 3: FACULTY PROFILE */}
      <div
        style={{
          background: "#ffffff",
          border: "1px solid #e2e8f0",
          borderRadius: "14px",
          padding: "1.75rem",
          boxShadow: "0 1px 3px 0 rgba(0, 0, 0, 0.03)"
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "1.5rem", paddingBottom: "1rem", borderBottom: "1px solid #e2e8f0" }}>
          <div
            style={{
              width: "44px",
              height: "44px",
              borderRadius: "50%",
              background: "#0f172a",
              color: "#ffffff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "1.1rem",
              fontWeight: 800
            }}
          >
            <GraduationCap size={22} />
          </div>
          <div>
            <h2 style={{ fontSize: "1.15rem", fontWeight: 800, color: "#0f172a", margin: 0 }}>
              {profile?.full_name || "Faculty Profile"}
            </h2>
            <div style={{ fontSize: "0.78rem", color: "#64748b" }}>
              Username: <strong>{profile?.username}</strong>
            </div>
          </div>
        </div>

        <form onSubmit={handleSaveProfile}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "1rem" }}>
            <div>
              <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 700, marginBottom: "0.3rem" }}>
                Full Name
              </label>
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                style={{ width: "100%", padding: "0.55rem 0.75rem", borderRadius: "8px", border: "1px solid #cbd5e1" }}
              />
            </div>

            <div>
              <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 700, marginBottom: "0.3rem" }}>
                Official Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="teacher@school.edu"
                style={{ width: "100%", padding: "0.55rem 0.75rem", borderRadius: "8px", border: "1px solid #cbd5e1" }}
              />
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "1.25rem" }}>
            <div>
              <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 700, marginBottom: "0.3rem" }}>
                Academic Role
              </label>
              <input
                type="text"
                required
                value={role}
                onChange={(e) => setRole(e.target.value)}
                style={{ width: "100%", padding: "0.55rem 0.75rem", borderRadius: "8px", border: "1px solid #cbd5e1" }}
              />
            </div>

            <div>
              <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 700, marginBottom: "0.3rem" }}>
                Department
              </label>
              <input
                type="text"
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                placeholder="e.g. Science / Computer Science"
                style={{ width: "100%", padding: "0.55rem 0.75rem", borderRadius: "8px", border: "1px solid #cbd5e1" }}
              />
            </div>
          </div>

          <div style={{ marginBottom: "1.5rem" }}>
            <label style={{ display: "flex", alignItems: "center", gap: "0.35rem", fontSize: "0.8rem", fontWeight: 700, marginBottom: "0.3rem" }}>
              <Key size={14} style={{ color: "#2563eb" }} />
              <span>Gemini API Key (Optional)</span>
            </label>
            <input
              type="password"
              value={geminiApiKey}
              onChange={(e) => setGeminiApiKey(e.target.value)}
              placeholder="Leave blank to use system Gemini model"
              style={{ width: "100%", padding: "0.55rem 0.75rem", borderRadius: "8px", border: "1px solid #cbd5e1", fontSize: "0.85rem" }}
            />
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            {onLogout ? (
              <button
                type="button"
                onClick={onLogout}
                style={{
                  background: "#fef2f2",
                  border: "1px solid #fecaca",
                  color: "#dc2626",
                  padding: "0.55rem 1rem",
                  borderRadius: "8px",
                  fontSize: "0.85rem",
                  fontWeight: 600,
                  cursor: "pointer"
                }}
              >
                Sign Out
              </button>
            ) : <div />}

            <button
              type="submit"
              disabled={isSaving}
              style={{
                background: "#2563eb",
                color: "#ffffff",
                border: "none",
                borderRadius: "8px",
                padding: "0.55rem 1.25rem",
                fontSize: "0.88rem",
                fontWeight: 700,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "0.4rem"
              }}
            >
              <Save size={15} />
              <span>{isSaving ? "Saving..." : "Save Settings"}</span>
            </button>
          </div>
        </form>
      </div>

      {/* SECTION 4: NOTIFICATION SETTINGS */}
      <div
        style={{
          background: "#ffffff",
          border: "1px solid #e2e8f0",
          borderRadius: "14px",
          padding: "1.75rem",
          marginTop: "1.5rem",
          boxShadow: "0 1px 3px 0 rgba(0, 0, 0, 0.03)"
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "1.25rem" }}>
          <div
            style={{
              width: "38px",
              height: "38px",
              borderRadius: "8px",
              background: "#eff6ff",
              color: "#2563eb",
              display: "flex",
              alignItems: "center",
              justifyContent: "center"
            }}
          >
            <Bell size={20} />
          </div>
          <div>
            <h2 style={{ fontSize: "1.1rem", fontWeight: 800, color: "#0f172a", margin: 0 }}>
              Notification Settings
            </h2>
            <div style={{ fontSize: "0.78rem", color: "#64748b" }}>
              Configure automatic grading alerts and parent communication channels
            </div>
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "0.85rem" }}>
          {[
            {
              id: "grading",
              label: "Grading Completion Email Alerts",
              desc: "Receive an immediate summary report when a batch of student copies finishes AI grading.",
              checked: notifyGradingComplete,
              toggle: () => setNotifyGradingComplete(!notifyGradingComplete)
            },
            {
              id: "parents",
              label: "Parent Grade Notifications (SMS / WhatsApp)",
              desc: "Allow sending digital scorecard alerts directly to parents after marks are finalized by faculty.",
              checked: notifyParentAlerts,
              toggle: () => setNotifyParentAlerts(!notifyParentAlerts)
            },
            {
              id: "rubric",
              label: "Marking Scheme & Rubric Sync Alerts",
              desc: "Get notified when department-wide syllabus rubrics or question paper templates are updated.",
              checked: notifyRubricUpdates,
              toggle: () => setNotifyRubricUpdates(!notifyRubricUpdates)
            },
            {
              id: "digest",
              label: "Weekly Cohort Performance Digest",
              desc: "Receive a consolidated Monday morning performance digest for all enrolled student batches.",
              checked: notifyWeeklyDigest,
              toggle: () => setNotifyWeeklyDigest(!notifyWeeklyDigest)
            }
          ].map((item) => (
            <div
              key={item.id}
              onClick={item.toggle}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "0.85rem 1rem",
                borderRadius: "10px",
                border: "1px solid #e2e8f0",
                background: item.checked ? "#f8fafc" : "#ffffff",
                cursor: "pointer",
                transition: "all 0.15s ease"
              }}
            >
              <div style={{ paddingRight: "1rem" }}>
                <div style={{ fontSize: "0.86rem", fontWeight: 700, color: "#0f172a" }}>
                  {item.label}
                </div>
                <div style={{ fontSize: "0.76rem", color: "#64748b", marginTop: "0.15rem" }}>
                  {item.desc}
                </div>
              </div>

              {/* Modern iOS / Material style toggle switch */}
              <div
                style={{
                  width: "42px",
                  height: "24px",
                  borderRadius: "999px",
                  background: item.checked ? "#2563eb" : "#cbd5e1",
                  position: "relative",
                  transition: "background 0.2s ease",
                  flexShrink: 0
                }}
              >
                <div
                  style={{
                    width: "18px",
                    height: "18px",
                    borderRadius: "50%",
                    background: "#ffffff",
                    position: "absolute",
                    top: "3px",
                    left: item.checked ? "21px" : "3px",
                    transition: "left 0.2s ease",
                    boxShadow: "0 1px 3px rgba(0,0,0,0.2)"
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
export default TeacherProfilePage;
