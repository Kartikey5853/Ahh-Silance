import React, { useEffect, useState } from "react";
import { academicApi } from "../api/academicApi";
import type { UserProfile, Subject, Institution, ClassItem, Exam, Student } from "../types/academic";
import {
  Plus,
  FileSpreadsheet,
  FolderGit2,
  ChevronRight,
  X,
  Sparkles,
  Search,
  ArrowRight,
  ArrowLeft,
  Check,
  Users,
  UploadCloud,
  ClipboardList
} from "lucide-react";

interface AcademicDashboardProps {
  onNavigate: (tab: any, params?: any) => void;
  onOpenQuickCheck?: () => void;
}

export const AcademicDashboardPage: React.FC<AcademicDashboardProps> = ({
  onNavigate
}) => {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [institutions, setInstitutions] = useState<Institution[]>([]);
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [allExams, setAllExams] = useState<Exam[]>([]);
  const [searchFilter, setSearchFilter] = useState("");

  // Modals
  const [showClassModal, setShowClassModal] = useState(false);
  const [showSubjModal, setShowSubjModal] = useState(false);

  // Dedicated Class Details View
  const [selectedClassDetail, setSelectedClassDetail] = useState<ClassItem | null>(null);
  const [classStudents, setClassStudents] = useState<Student[]>([]);
  const [loadingClassStudents, setLoadingClassStudents] = useState<boolean>(false);

  // Add Student to Class Modal State
  const [showAddStudentModal, setShowAddStudentModal] = useState(false);
  const [newStudentName, setNewStudentName] = useState("");
  const [newStudentRoll, setNewStudentRoll] = useState("");
  const [newStudentSection, setNewStudentSection] = useState("A");
  const [newStudentEmail, setNewStudentEmail] = useState("");
  const [newStudentParentName, setNewStudentParentName] = useState("");
  const [newStudentParentPhone, setNewStudentParentPhone] = useState("");
  const [isAddingStudent, setIsAddingStudent] = useState(false);

  // Bulk Student Import Modal State (as requested: "just add the part now we will add the function later")
  const [showBulkImportModal, setShowBulkImportModal] = useState(false);
  const [bulkImportText, setBulkImportText] = useState("");
  const [isImportingBulk, setIsImportingBulk] = useState(false);

  const loadClassStudents = async (classId: string) => {
    setLoadingClassStudents(true);
    try {
      const list = await academicApi.listClassStudents(classId);
      setClassStudents(list || []);
    } catch (err) {
      console.error("Failed to load class students:", err);
      setClassStudents([]);
    } finally {
      setLoadingClassStudents(false);
    }
  };

  const handleOpenClassDetail = (cls: ClassItem) => {
    setSelectedClassDetail(cls);
    void loadClassStudents(cls.id);
  };

  const handleAddStudentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClassDetail || !newStudentName.trim() || !newStudentRoll.trim()) return;
    setIsAddingStudent(true);
    try {
      await academicApi.addStudentToClass(selectedClassDetail.id, {
        name: newStudentName.trim(),
        roll_number: newStudentRoll.trim(),
        section: newStudentSection.trim() || "A",
        email: newStudentEmail.trim(),
        parent_name: newStudentParentName.trim(),
        parent_phone: newStudentParentPhone.trim()
      });
      setShowAddStudentModal(false);
      setNewStudentName("");
      setNewStudentRoll("");
      setNewStudentEmail("");
      setNewStudentParentName("");
      setNewStudentParentPhone("");
      await loadClassStudents(selectedClassDetail.id);
    } catch (err: any) {
      alert("Failed to add student: " + (err?.response?.data?.detail || err.message));
    } finally {
      setIsAddingStudent(false);
    }
  };

  const handleBulkImportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClassDetail || !bulkImportText.trim()) return;
    setIsImportingBulk(true);
    try {
      const lines = bulkImportText.split("\n").map((l) => l.trim()).filter(Boolean);
      for (const line of lines) {
        const parts = line.split(",").map((p) => p.trim());
        if (parts.length >= 2) {
          const roll = parts[0];
          const name = parts[1];
          const phone = parts[2] || "";
          await academicApi.addStudentToClass(selectedClassDetail.id, {
            roll_number: roll,
            name: name,
            parent_phone: phone,
            section: "A"
          });
        }
      }
      setShowBulkImportModal(false);
      setBulkImportText("");
      await loadClassStudents(selectedClassDetail.id);
    } catch (err: any) {
      alert("Bulk import completed with note: " + (err?.message || "Check roster lines"));
    } finally {
      setIsImportingBulk(false);
    }
  };

  // New Class Form State
  const [className, setClassName] = useState("Class 10 - Section A");
  const [classCode, setClassCode] = useState("CLS-10A");
  const [classDept, setClassDept] = useState("Secondary School");

  // New Subject Form State
  const [subjName, setSubjName] = useState("Science");
  const [subjCode, setSubjCode] = useState("SCI-10");
  const [subjSem, setSubjSem] = useState("Class 10 - Term 1");
  const [subjClassId, setSubjClassId] = useState<string>("");

  // Inline Quick Add Class within Subject Creation
  const [showInlineAddClassInModal, setShowInlineAddClassInModal] = useState(false);
  const [inlineClassName, setInlineClassName] = useState("");
  const [inlineClassCode, setInlineClassCode] = useState("");
  const [isCreatingInlineClass, setIsCreatingInlineClass] = useState(false);

  const handleInlineCreateClass = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inlineClassName.trim()) return;
    setIsCreatingInlineClass(true);
    try {
      const created = await academicApi.createClass({
        name: inlineClassName.trim(),
        code: inlineClassCode.trim() || undefined,
        institution_id: currentOrg?.id || undefined
      });
      setClasses((prev) => [...prev, created]);
      setSubjClassId(created.id);
      setInlineClassName("");
      setInlineClassCode("");
      setShowInlineAddClassInModal(false);
    } catch (err: any) {
      alert("Failed to create class: " + (err?.response?.data?.detail || err.message));
    } finally {
      setIsCreatingInlineClass(false);
    }
  };

  const currentOrg = institutions.length > 0 ? institutions[0] : null;

  const loadRealData = async () => {
    try {
      const [profData, instData, classList, subjList, exList] = await Promise.all([
        academicApi.getProfile().catch(() => null),
        academicApi.listInstitutions().catch(() => []),
        academicApi.listClasses().catch(() => []),
        academicApi.listSubjects().catch(() => []),
        academicApi.listExams().catch(() => [])
      ]);

      if (profData) setProfile(profData);
      setInstitutions(instData || []);
      setClasses(classList || []);
      setSubjects(subjList || []);
      setAllExams(exList || []);

      if (classList && classList.length > 0 && !subjClassId) {
        setSubjClassId(classList[0].id);
      }
    } catch (err) {
      console.error("Failed to load dashboard data:", err);
    }
  };

  useEffect(() => {
    loadRealData();
  }, []);

  // Real Class Creation via backend API
  const handleCreateClass = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!className.trim()) return;

    try {
      let activeInstId = currentOrg?.id || profile?.institution_id || "";
      if (!activeInstId && institutions.length > 0) {
        activeInstId = institutions[0].id;
      }
      const codeToUse = classCode.trim() || `CLS-${Date.now().toString().slice(-4)}`;

      const created = await academicApi.createClass({
        name: className.trim(),
        code: codeToUse,
        institution_id: activeInstId,
        department: classDept.trim() || "Academics",
        academic_year: "2026-2027"
      });

      setShowClassModal(false);
      setClassName("");
      setClassCode("");
      // Real re-fetch from SQLite database
      const updatedClasses = await academicApi.listClasses();
      setClasses(updatedClasses);
      if (created?.id) {
        handleOpenClassDetail(created);
        setSubjClassId(created.id);
      }
    } catch (err) {
      alert("Failed to create class. Check network or server status.");
    }
  };

  // Real Subject Creation via backend API
  const handleCreateSubject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subjName.trim()) return;

    try {
      let activeInstId = currentOrg?.id || profile?.institution_id || "";
      if (!activeInstId && institutions.length > 0) {
        activeInstId = institutions[0].id;
      }

      await academicApi.createSubject({
        name: subjName.trim(),
        code: subjCode.trim(),
        institution_id: activeInstId,
        class_id: subjClassId || (classes[0]?.id ?? undefined),
        institution_type: currentOrg?.type || "school",
        semester_or_grade: subjSem,
        credits: 4,
        academic_year: "2026-2027",
        chapters: []
      });

      setShowSubjModal(false);
      setSubjName("");
      setSubjCode("");
      // Real re-fetch from SQLite database
      const updatedSubjects = await academicApi.listSubjects();
      setSubjects(updatedSubjects);
    } catch (err) {
      alert("Failed to create subject.");
    }
  };

  return (
    <div className="academic-dashboard-page" style={{ maxWidth: "1280px", margin: "0 auto", paddingBottom: "4rem" }}>
      {selectedClassDetail ? (
        /* ============================================================== */
        /* CLASS DETAILS VIEW (Students Roster & Nested Recent Exams)     */
        /* ============================================================== */
        <div>
          {/* Top Bar for Class Detail */}
          <div
            style={{
              background: "#ffffff",
              border: "1px solid #e2e8f0",
              borderRadius: "14px",
              padding: "1.25rem 1.5rem",
              marginBottom: "1.5rem",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              flexWrap: "wrap",
              gap: "1rem"
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "0.85rem" }}>
              <button
                type="button"
                onClick={() => setSelectedClassDetail(null)}
                style={{
                  background: "#f1f5f9",
                  border: "1px solid #cbd5e1",
                  borderRadius: "8px",
                  padding: "0.5rem 0.85rem",
                  fontSize: "0.82rem",
                  fontWeight: 700,
                  color: "#334155",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.35rem"
                }}
              >
                <ArrowLeft size={15} />
                <span>All Classes</span>
              </button>

              <div>
                <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
                  <h2 style={{ fontSize: "1.35rem", fontWeight: 800, color: "#0f172a", margin: 0 }}>
                    {selectedClassDetail.name}
                  </h2>
                  <span
                    style={{
                      background: "#eff6ff",
                      color: "#1d4ed8",
                      border: "1px solid #bfdbfe",
                      padding: "0.15rem 0.5rem",
                      borderRadius: "6px",
                      fontSize: "0.75rem",
                      fontWeight: 700,
                      fontFamily: "monospace"
                    }}
                  >
                    {selectedClassDetail.code || "CLS"}
                  </span>
                </div>
                <div style={{ fontSize: "0.8rem", color: "#64748b", marginTop: "0.2rem" }}>
                  {selectedClassDetail.department || "General Academics"} • Academic Year {selectedClassDetail.academic_year || "2026-2027"}
                </div>
              </div>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "0.65rem" }}>
              <button
                type="button"
                onClick={() => onNavigate("exams", { mode: "create", classId: selectedClassDetail.id })}
                style={{
                  background: "#2563eb",
                  color: "#ffffff",
                  border: "none",
                  borderRadius: "8px",
                  padding: "0.55rem 1.15rem",
                  fontSize: "0.82rem",
                  fontWeight: 700,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.4rem",
                  boxShadow: "0 2px 6px rgba(37, 99, 235, 0.25)"
                }}
              >
                <UploadCloud size={15} />
                <span>+ Upload Exam Paper</span>
              </button>
            </div>
          </div>

          {/* Section 1: Enrolled Students */}
          <div
            style={{
              background: "#ffffff",
              border: "1px solid #e2e8f0",
              borderRadius: "14px",
              padding: "1.25rem 1.5rem",
              marginBottom: "1.75rem",
              boxShadow: "0 1px 3px rgba(0,0,0,0.02)"
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: "1.25rem",
                flexWrap: "wrap",
                gap: "0.75rem"
              }}
            >
              <div>
                <h3 style={{ fontSize: "1.1rem", fontWeight: 800, color: "#0f172a", margin: 0 }}>
                  Enrolled Students ({classStudents.length})
                </h3>
                <p style={{ margin: "2px 0 0 0", fontSize: "0.8rem", color: "#64748b" }}>
                  Manage the official student roster for this class cohort.
                </p>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
                <button
                  type="button"
                  onClick={() => setShowAddStudentModal(true)}
                  style={{
                    background: "#2563eb",
                    color: "#ffffff",
                    border: "none",
                    borderRadius: "8px",
                    padding: "0.5rem 0.95rem",
                    fontSize: "0.8rem",
                    fontWeight: 700,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "0.35rem"
                  }}
                >
                  <Plus size={14} />
                  <span>+ Add Student</span>
                </button>

                <button
                  type="button"
                  onClick={() => setShowBulkImportModal(true)}
                  style={{
                    background: "#ffffff",
                    border: "1px solid #cbd5e1",
                    color: "#334155",
                    borderRadius: "8px",
                    padding: "0.5rem 0.95rem",
                    fontSize: "0.8rem",
                    fontWeight: 700,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "0.35rem"
                  }}
                  title="Add List of Students via bulk text/CSV"
                >
                  <ClipboardList size={14} />
                  <span>Add List of Students</span>
                </button>
              </div>
            </div>

            {loadingClassStudents ? (
              <div style={{ padding: "2rem", textAlign: "center", color: "#64748b", fontSize: "0.88rem" }}>
                Loading students...
              </div>
            ) : classStudents.length === 0 ? (
              <div
                style={{
                  background: "#f8fafc",
                  border: "1.5px dashed #cbd5e1",
                  borderRadius: "10px",
                  padding: "2.5rem 1.5rem",
                  textAlign: "center"
                }}
              >
                <Users size={36} style={{ color: "#94a3b8", margin: "0 auto 0.75rem" }} />
                <div style={{ fontWeight: 800, color: "#0f172a", fontSize: "1rem" }}>
                  No students enrolled in {selectedClassDetail.name} yet
                </div>
                <div style={{ fontSize: "0.82rem", color: "#64748b", margin: "0.25rem auto 1.25rem", maxWidth: "440px" }}>
                  Add students individually or import a roster list with roll numbers and names.
                </div>
                <div style={{ display: "flex", justifyContent: "center", gap: "0.6rem" }}>
                  <button
                    type="button"
                    onClick={() => setShowAddStudentModal(true)}
                    style={{ background: "#2563eb", color: "#ffffff", border: "none", borderRadius: "6px", padding: "0.45rem 1rem", fontSize: "0.82rem", fontWeight: 700, cursor: "pointer" }}
                  >
                    + Add Student
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowBulkImportModal(true)}
                    style={{ background: "#ffffff", border: "1px solid #cbd5e1", color: "#334155", borderRadius: "6px", padding: "0.45rem 1rem", fontSize: "0.82rem", fontWeight: 700, cursor: "pointer" }}
                  >
                    Add List of Students
                  </button>
                </div>
              </div>
            ) : (
              <div style={{ border: "1px solid #e2e8f0", borderRadius: "10px", overflow: "hidden" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "0.85rem" }}>
                  <thead>
                    <tr style={{ background: "#f8fafc", borderBottom: "1px solid #e2e8f0" }}>
                      <th style={{ padding: "0.7rem 1rem", color: "#64748b", fontWeight: 700 }}>Roll No</th>
                      <th style={{ padding: "0.7rem 1rem", color: "#64748b", fontWeight: 700 }}>Student Name</th>
                      <th style={{ padding: "0.7rem 1rem", color: "#64748b", fontWeight: 700 }}>Section</th>
                      <th style={{ padding: "0.7rem 1rem", color: "#64748b", fontWeight: 700 }}>Parent Details</th>
                      <th style={{ padding: "0.7rem 1rem", color: "#64748b", fontWeight: 700 }}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {classStudents.map((stud) => (
                      <tr key={stud.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                        <td style={{ padding: "0.75rem 1rem", fontFamily: "monospace", fontWeight: 700, color: "#1e293b" }}>
                          {stud.roll_number}
                        </td>
                        <td style={{ padding: "0.75rem 1rem", fontWeight: 700, color: "#0f172a" }}>
                          {stud.name}
                        </td>
                        <td style={{ padding: "0.75rem 1rem", color: "#64748b" }}>
                          Section {stud.section || "A"}
                        </td>
                        <td style={{ padding: "0.75rem 1rem", color: "#64748b", fontSize: "0.8rem" }}>
                          {stud.parent_name ? `${stud.parent_name} (${stud.parent_phone || "No phone"})` : (stud.parent_phone || "—")}
                        </td>
                        <td style={{ padding: "0.75rem 1rem" }}>
                          <span style={{ background: "#f0fdf4", color: "#166534", padding: "0.15rem 0.5rem", borderRadius: "4px", fontSize: "0.74rem", fontWeight: 700 }}>
                            {stud.status || "Active"}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Section 2: Recent Exams for this Class (Nested directly into the class!) */}
          {(() => {
            const classSubjIds = new Set(subjects.filter((s) => s.class_id === selectedClassDetail.id).map((s) => s.id));
            const classExams = allExams.filter((e) => classSubjIds.has(e.subject_id) || (e as any).class_id === selectedClassDetail.id);

            return (
              <div
                style={{
                  background: "#ffffff",
                  border: "1px solid #e2e8f0",
                  borderRadius: "14px",
                  padding: "1.25rem 1.5rem",
                  boxShadow: "0 1px 3px rgba(0,0,0,0.02)"
                }}
              >
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1rem" }}>
                  <div>
                    <h3 style={{ fontSize: "1.1rem", fontWeight: 800, color: "#0f172a", margin: 0 }}>
                      Recent Exams for {selectedClassDetail.name} ({classExams.length})
                    </h3>
                    <p style={{ margin: "2px 0 0 0", fontSize: "0.8rem", color: "#64748b" }}>
                      Examinations scheduled and evaluated for this class cohort.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => onNavigate("exams", { mode: "create", classId: selectedClassDetail.id })}
                    style={{
                      background: "#2563eb",
                      color: "#ffffff",
                      border: "none",
                      borderRadius: "8px",
                      padding: "0.45rem 0.95rem",
                      fontSize: "0.8rem",
                      fontWeight: 700,
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: "0.35rem"
                    }}
                  >
                    <Plus size={14} />
                    <span>+ New Exam</span>
                  </button>
                </div>

                {classExams.length === 0 ? (
                  <div
                    style={{
                      background: "#f8fafc",
                      border: "1.5px dashed #cbd5e1",
                      borderRadius: "10px",
                      padding: "2.5rem 1.5rem",
                      textAlign: "center"
                    }}
                  >
                    <FileSpreadsheet size={36} style={{ color: "#94a3b8", margin: "0 auto 0.75rem" }} />
                    <div style={{ fontWeight: 800, color: "#0f172a", fontSize: "1rem" }}>
                      No exams created for {selectedClassDetail.name} yet
                    </div>
                    <div style={{ fontSize: "0.82rem", color: "#64748b", margin: "0.25rem auto 1.25rem", maxWidth: "440px" }}>
                      Upload question papers to auto-generate answer keys, schemes, and evaluate student copies.
                    </div>
                    <button
                      type="button"
                      onClick={() => onNavigate("exams", { mode: "create", classId: selectedClassDetail.id })}
                      style={{ background: "#2563eb", color: "#ffffff", border: "none", borderRadius: "6px", padding: "0.45rem 1.15rem", fontSize: "0.82rem", fontWeight: 700, cursor: "pointer" }}
                    >
                      + Upload First Question Paper
                    </button>
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
                    {classExams.map((ex) => {
                      const matchedSubj = subjects.find((s) => s.id === ex.subject_id);
                      return (
                        <div
                          key={ex.id}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            padding: "0.85rem 1.15rem",
                            background: "#f8fafc",
                            borderRadius: "10px",
                            border: "1px solid #e2e8f0",
                            flexWrap: "wrap",
                            gap: "0.75rem"
                          }}
                        >
                          <div>
                            <div style={{ fontWeight: 800, fontSize: "0.94rem", color: "#0f172a" }}>
                              {ex.title}
                            </div>
                            <div style={{ fontSize: "0.76rem", color: "#64748b", marginTop: "0.15rem" }}>
                              {matchedSubj?.name || "Subject"} • {ex.exam_type} • Max: {ex.max_marks} Marks
                            </div>
                          </div>

                          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                            <button
                              type="button"
                              onClick={() => onNavigate("evaluation", { examId: ex.id })}
                              style={{
                                background: "#16a34a",
                                color: "#ffffff",
                                border: "none",
                                borderRadius: "6px",
                                padding: "0.45rem 0.95rem",
                                fontSize: "0.8rem",
                                fontWeight: 700,
                                cursor: "pointer",
                                display: "flex",
                                alignItems: "center",
                                gap: "0.35rem",
                                boxShadow: "0 2px 6px rgba(22, 163, 74, 0.25)"
                              }}
                            >
                              <Sparkles size={13} />
                              <span>Grade Papers</span>
                              <ArrowRight size={12} />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })()}
        </div>
      ) : (
        /* ============================================================== */
        /* MAIN DASHBOARD: CLASSES OVERVIEW & HERO PAPER UPLOAD           */
        /* ============================================================== */
        <div>
          {/* Welcome Banner */}
          <div
            style={{
              background: "#ffffff",
              border: "1px solid #e2e8f0",
              borderRadius: "14px",
              padding: "1.25rem 1.5rem",
              marginBottom: "1.25rem",
              boxShadow: "0 1px 3px rgba(0, 0, 0, 0.02)"
            }}
          >
            <h1
              style={{
                fontSize: "1.45rem",
                fontWeight: 800,
                color: "#0f172a",
                letterSpacing: "-0.03em",
                margin: 0
              }}
            >
              Namaste, {profile?.full_name || profile?.username || "Faculty"}
            </h1>
            <p style={{ color: "#64748b", fontSize: "0.85rem", margin: "0.25rem 0 0 0" }}>
              {institutions.find((i) => i.id === profile?.institution_id)?.name || institutions[0]?.name || "Delhi Public School (CBSE)"}
            </p>
          </div>

          {/* Clean Drag and Drop / Upload Question Paper Section */}
          <div
            onClick={() => onNavigate("exams", { mode: "create" })}
            style={{
              background: "#f8faff",
              border: "1.5px dashed #3b82f6",
              borderRadius: "14px",
              padding: "1.5rem 1.75rem",
              marginBottom: "1.75rem",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "1.25rem",
              flexWrap: "wrap",
              cursor: "pointer",
              transition: "all 0.15s ease"
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = "#1d4ed8";
              e.currentTarget.style.background = "#eff6ff";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = "#3b82f6";
              e.currentTarget.style.background = "#f8faff";
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
              <div
                style={{
                  width: "42px",
                  height: "42px",
                  borderRadius: "10px",
                  background: "#eff6ff",
                  color: "#2563eb",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0
                }}
              >
                <UploadCloud size={22} />
              </div>
              <div>
                <div style={{ fontSize: "1.05rem", fontWeight: 800, color: "#0f172a" }}>
                  Drop Question Paper Here or Click to Upload &amp; Grade
                </div>
              </div>
            </div>

            <button
              type="button"
              style={{
                background: "#2563eb",
                color: "#ffffff",
                border: "none",
                borderRadius: "8px",
                padding: "0.6rem 1.25rem",
                fontSize: "0.85rem",
                fontWeight: 700,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "0.4rem",
                boxShadow: "0 2px 8px rgba(37, 99, 235, 0.25)",
                pointerEvents: "none"
              }}
            >
              <UploadCloud size={15} />
              <span>+ Upload Question Paper &amp; Grade</span>
            </button>
          </div>

          {/* Classes Section Header */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: "1.25rem",
              flexWrap: "wrap",
              gap: "0.75rem"
            }}
          >
            <div>
              <h2 style={{ fontSize: "1.25rem", fontWeight: 800, color: "#0f172a", margin: 0, letterSpacing: "-0.02em" }}>
                My Classes ({classes.length})
              </h2>
            </div>

            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.45rem",
                background: "#ffffff",
                border: "1px solid #cbd5e1",
                borderRadius: "8px",
                padding: "0.4rem 0.75rem"
              }}
            >
              <Search size={14} style={{ color: "#94a3b8" }} />
              <input
                type="text"
                placeholder="Search classes..."
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                style={{
                  border: "none",
                  outline: "none",
                  fontSize: "0.82rem",
                  width: "160px"
                }}
              />
            </div>
          </div>

          {/* Classes Grid */}
          {(() => {
            const filteredClasses = classes.filter(
              (c) =>
                c.name.toLowerCase().includes(searchFilter.toLowerCase()) ||
                (c.code && c.code.toLowerCase().includes(searchFilter.toLowerCase()))
            );

            if (filteredClasses.length === 0) {
              return (
                <div
                  style={{
                    background: "#ffffff",
                    border: "2px dashed #cbd5e1",
                    borderRadius: "14px",
                    padding: "3.5rem 1.5rem",
                    textAlign: "center"
                  }}
                >
                  <FolderGit2 size={42} style={{ color: "#94a3b8", margin: "0 auto 1rem" }} />
                  <h3 style={{ fontSize: "1.15rem", fontWeight: 800, color: "#0f172a", marginBottom: "0.35rem" }}>
                    No Classes Found
                  </h3>
                  <p style={{ color: "#64748b", fontSize: "0.85rem", maxWidth: "420px", margin: "0 auto 1.5rem" }}>
                    Create your first class cohort to start enrolling students and conducting exams.
                  </p>
                  <button
                    type="button"
                    onClick={() => setShowClassModal(true)}
                    style={{
                      background: "#2563eb",
                      color: "#ffffff",
                      border: "none",
                      borderRadius: "8px",
                      padding: "0.6rem 1.25rem",
                      fontSize: "0.88rem",
                      fontWeight: 700,
                      cursor: "pointer"
                    }}
                  >
                    + Add First Class
                  </button>
                </div>
              );
            }

            return (
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))",
                  gap: "1.25rem"
                }}
              >
                {filteredClasses.map((cls) => {
                  const matchingSubjs = subjects.filter((s) => s.class_id === cls.id);
                  const classSubjIds = new Set(matchingSubjs.map((s) => s.id));
                  const matchingExams = allExams.filter((e) => classSubjIds.has(e.subject_id) || (e as any).class_id === cls.id);

                  return (
                    <div
                      key={cls.id}
                      onClick={() => handleOpenClassDetail(cls)}
                      style={{
                        background: "#ffffff",
                        border: "1px solid #e2e8f0",
                        borderRadius: "14px",
                        padding: "1.35rem",
                        boxShadow: "0 1px 3px rgba(0,0,0,0.03)",
                        cursor: "pointer",
                        display: "flex",
                        flexDirection: "column",
                        justifyContent: "space-between",
                        transition: "all 0.18s ease"
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.borderColor = "#3b82f6";
                        e.currentTarget.style.boxShadow = "0 6px 16px rgba(37,99,235,0.08)";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.borderColor = "#e2e8f0";
                        e.currentTarget.style.boxShadow = "0 1px 3px rgba(0,0,0,0.03)";
                      }}
                    >
                      <div>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.5rem" }}>
                          <span
                            style={{
                              background: "#eff6ff",
                              color: "#1d4ed8",
                              border: "1px solid #bfdbfe",
                              padding: "0.15rem 0.5rem",
                              borderRadius: "6px",
                              fontSize: "0.75rem",
                              fontWeight: 700,
                              fontFamily: "monospace"
                            }}
                          >
                            {cls.code || "CLASS"}
                          </span>
                          <span style={{ fontSize: "0.75rem", color: "#64748b" }}>
                            {cls.academic_year || "2026-2027"}
                          </span>
                        </div>

                        <h3 style={{ fontSize: "1.2rem", fontWeight: 800, color: "#0f172a", margin: "0 0 0.35rem 0" }}>
                          {cls.name}
                        </h3>
                        <p style={{ fontSize: "0.8rem", color: "#64748b", margin: 0 }}>
                          {cls.department || "General Academics"}
                        </p>
                      </div>

                      <div style={{ marginTop: "1.25rem", borderTop: "1px solid #f1f5f9", paddingTop: "0.85rem", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", fontSize: "0.78rem", color: "#475569" }}>
                          <span><strong>{matchingSubjs.length}</strong> Subjects</span>
                          <span>•</span>
                          <span><strong>{matchingExams.length}</strong> Exams</span>
                        </div>
                        <span style={{ fontSize: "0.8rem", fontWeight: 700, color: "#2563eb", display: "flex", alignItems: "center", gap: "0.2rem" }}>
                          View Details <ChevronRight size={14} />
                        </span>
                      </div>
                    </div>
                  );
                })}

                {/* Add New Class Card */}
                <div
                  onClick={() => setShowClassModal(true)}
                  style={{
                    background: "#f8fafc",
                    border: "2px dashed #cbd5e1",
                    borderRadius: "14px",
                    padding: "1.5rem",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    cursor: "pointer",
                    minHeight: "160px",
                    textAlign: "center"
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = "#3b82f6";
                    e.currentTarget.style.background = "#f0f7ff";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = "#cbd5e1";
                    e.currentTarget.style.background = "#f8fafc";
                  }}
                >
                  <Plus size={28} style={{ color: "#3b82f6", marginBottom: "0.5rem" }} />
                  <div style={{ fontSize: "0.95rem", fontWeight: 800, color: "#1e293b" }}>+ Add Another Class</div>
                  <div style={{ fontSize: "0.76rem", color: "#64748b", marginTop: "0.2rem" }}>Create a new batch or cohort</div>
                </div>
              </div>
            );
          })()}
        </div>
      )}

      {/* ================= MODAL: ADD CLASS ================= */}
      {showClassModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(15, 23, 42, 0.5)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 220,
            padding: "1rem"
          }}
        >
          <div
            style={{
              background: "#ffffff",
              borderRadius: "14px",
              maxWidth: "480px",
              width: "100%",
              padding: "1.75rem",
              boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1)"
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem" }}>
              <h3 style={{ fontSize: "1.15rem", fontWeight: 800, color: "#0f172a", margin: 0 }}>
                Add New Class / Batch
              </h3>
              <button
                type="button"
                onClick={() => setShowClassModal(false)}
                style={{ background: "none", border: "none", cursor: "pointer", color: "#64748b" }}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateClass}>
              <div style={{ marginBottom: "0.85rem" }}>
                <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 700, marginBottom: "0.3rem" }}>
                  Class Name *
                </label>
                <input
                  type="text"
                  required
                  value={className}
                  onChange={(e) => setClassName(e.target.value)}
                  placeholder="e.g. Class 10 - Section A or Semester 6"
                  style={{ width: "100%", padding: "0.5rem 0.75rem", borderRadius: "8px", border: "1px solid #cbd5e1", fontSize: "0.85rem" }}
                />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem", marginBottom: "1.25rem" }}>
                <div>
                  <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 700, marginBottom: "0.3rem" }}>
                    Code
                  </label>
                  <input
                    type="text"
                    value={classCode}
                    onChange={(e) => setClassCode(e.target.value)}
                    placeholder="e.g. CLS-10A"
                    style={{ width: "100%", padding: "0.5rem 0.75rem", borderRadius: "8px", border: "1px solid #cbd5e1", fontSize: "0.85rem" }}
                  />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 700, marginBottom: "0.3rem" }}>
                    Department / Stream
                  </label>
                  <input
                    type="text"
                    value={classDept}
                    onChange={(e) => setClassDept(e.target.value)}
                    placeholder="e.g. Science / Secondary"
                    style={{ width: "100%", padding: "0.5rem 0.75rem", borderRadius: "8px", border: "1px solid #cbd5e1", fontSize: "0.85rem" }}
                  />
                </div>
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.5rem" }}>
                <button
                  type="button"
                  onClick={() => setShowClassModal(false)}
                  style={{ background: "#f1f5f9", border: "1px solid #e2e8f0", padding: "0.5rem 1rem", borderRadius: "8px", fontSize: "0.85rem", fontWeight: 600, cursor: "pointer" }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{ background: "#2563eb", color: "#ffffff", border: "none", padding: "0.5rem 1.25rem", borderRadius: "8px", fontSize: "0.85rem", fontWeight: 700, cursor: "pointer" }}
                >
                  Create Class
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL: ADD SUBJECT ================= */}
      {showSubjModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(15, 23, 42, 0.5)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 220,
            padding: "1rem"
          }}
        >
          <div
            style={{
              background: "#ffffff",
              borderRadius: "14px",
              maxWidth: "500px",
              width: "100%",
              padding: "1.75rem",
              boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1)"
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem" }}>
              <h3 style={{ fontSize: "1.15rem", fontWeight: 800, color: "#0f172a", margin: 0 }}>
                Add New Subject
              </h3>
              <button
                type="button"
                onClick={() => setShowSubjModal(false)}
                style={{ background: "none", border: "none", cursor: "pointer", color: "#64748b" }}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateSubject}>
              <div style={{ marginBottom: "0.85rem" }}>
                <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 700, marginBottom: "0.3rem" }}>
                  Subject Name *
                </label>
                <input
                  type="text"
                  required
                  value={subjName}
                  onChange={(e) => setSubjName(e.target.value)}
                  placeholder="e.g. Science, Mathematics, English"
                  style={{ width: "100%", padding: "0.5rem 0.75rem", borderRadius: "8px", border: "1px solid #cbd5e1", fontSize: "0.85rem" }}
                />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem", marginBottom: "0.85rem" }}>
                <div>
                  <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 700, marginBottom: "0.3rem" }}>
                    Code
                  </label>
                  <input
                    type="text"
                    value={subjCode}
                    onChange={(e) => setSubjCode(e.target.value)}
                    placeholder="e.g. SCI-10"
                    style={{ width: "100%", padding: "0.5rem 0.75rem", borderRadius: "8px", border: "1px solid #cbd5e1", fontSize: "0.85rem" }}
                  />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 700, marginBottom: "0.3rem" }}>
                    Term / Grade
                  </label>
                  <input
                    type="text"
                    value={subjSem}
                    onChange={(e) => setSubjSem(e.target.value)}
                    placeholder="e.g. Class 10 Term 1"
                    style={{ width: "100%", padding: "0.5rem 0.75rem", borderRadius: "8px", border: "1px solid #cbd5e1", fontSize: "0.85rem" }}
                  />
                </div>
              </div>

              <div style={{ marginBottom: "1.25rem" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.45rem" }}>
                  <label style={{ fontSize: "0.8rem", fontWeight: 700, color: "#1e293b" }}>
                    Assign to Class
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowInlineAddClassInModal(!showInlineAddClassInModal)}
                    style={{
                      background: showInlineAddClassInModal ? "#f1f5f9" : "#eff6ff",
                      color: showInlineAddClassInModal ? "#475569" : "#2563eb",
                      border: `1px solid ${showInlineAddClassInModal ? "#cbd5e1" : "#bfdbfe"}`,
                      borderRadius: "6px",
                      padding: "0.22rem 0.6rem",
                      fontSize: "0.74rem",
                      fontWeight: 700,
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: "0.25rem"
                    }}
                  >
                    <Plus size={12} /> {showInlineAddClassInModal ? "Close" : "Add New Class"}
                  </button>
                </div>

                {showInlineAddClassInModal && (
                  <div
                    style={{
                      background: "#f8fafc",
                      border: "1.5px dashed #3b82f6",
                      borderRadius: "10px",
                      padding: "0.75rem",
                      marginBottom: "0.75rem"
                    }}
                  >
                    <div style={{ fontSize: "0.76rem", fontWeight: 800, color: "#1e3a8a", marginBottom: "0.4rem" }}>
                      Create New Class Cohort
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "1.2fr 0.8fr auto", gap: "0.5rem", alignItems: "end" }}>
                      <div>
                        <label style={{ display: "block", fontSize: "0.68rem", fontWeight: 700, color: "#64748b", marginBottom: "0.2rem" }}>
                          Class Name *
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. Class 11 - Batch B"
                          value={inlineClassName}
                          onChange={(e) => setInlineClassName(e.target.value)}
                          style={{ width: "100%", padding: "0.4rem 0.6rem", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "0.8rem" }}
                        />
                      </div>
                      <div>
                        <label style={{ display: "block", fontSize: "0.68rem", fontWeight: 700, color: "#64748b", marginBottom: "0.2rem" }}>
                          Code / Section
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. 11B"
                          value={inlineClassCode}
                          onChange={(e) => setInlineClassCode(e.target.value)}
                          style={{ width: "100%", padding: "0.4rem 0.6rem", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "0.8rem" }}
                        />
                      </div>
                      <button
                        type="button"
                        onClick={handleInlineCreateClass}
                        disabled={isCreatingInlineClass || !inlineClassName.trim()}
                        style={{
                          background: "#2563eb",
                          color: "#ffffff",
                          border: "none",
                          borderRadius: "6px",
                          padding: "0.45rem 0.85rem",
                          fontSize: "0.76rem",
                          fontWeight: 700,
                          cursor: "pointer"
                        }}
                      >
                        {isCreatingInlineClass ? "Saving..." : "Add"}
                      </button>
                    </div>
                  </div>
                )}

                {classes.length === 0 ? (
                  <div style={{ padding: "0.8rem", background: "#f8fafc", borderRadius: "8px", border: "1px dashed #cbd5e1", textAlign: "center", fontSize: "0.8rem", color: "#64748b" }}>
                    No classes found. Click &quot;+ Add New Class&quot; above to create one.
                  </div>
                ) : (
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: "0.45rem", maxHeight: "155px", overflowY: "auto", paddingRight: "2px" }}>
                    {classes.map((c) => {
                      const isSelected = subjClassId === c.id;
                      return (
                        <div
                          key={c.id}
                          onClick={() => setSubjClassId(c.id)}
                          style={{
                            padding: "0.5rem 0.65rem",
                            borderRadius: "8px",
                            border: isSelected ? "2px solid #2563eb" : "1px solid #e2e8f0",
                            background: isSelected ? "#eff6ff" : "#ffffff",
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            transition: "all 0.15s ease",
                            boxShadow: isSelected ? "0 1px 3px rgba(37,99,235,0.12)" : "0 1px 2px rgba(0,0,0,0.02)"
                          }}
                        >
                          <div style={{ display: "flex", alignItems: "center", gap: "0.45rem", minWidth: 0 }}>
                            <div
                              style={{
                                width: "24px",
                                height: "24px",
                                borderRadius: "6px",
                                background: isSelected ? "#2563eb" : "#f1f5f9",
                                color: isSelected ? "#ffffff" : "#64748b",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                flexShrink: 0
                              }}
                            >
                              <FolderGit2 size={13} />
                            </div>
                            <div style={{ minWidth: 0 }}>
                              <div
                                style={{
                                  fontSize: "0.78rem",
                                  fontWeight: isSelected ? 800 : 600,
                                  color: isSelected ? "#1e3a8a" : "#1e293b",
                                  whiteSpace: "nowrap",
                                  overflow: "hidden",
                                  textOverflow: "ellipsis"
                                }}
                              >
                                {c.name}
                              </div>
                              {c.code && (
                                <div style={{ fontSize: "0.66rem", color: isSelected ? "#3b82f6" : "#94a3b8" }}>
                                  {c.code}
                                </div>
                              )}
                            </div>
                          </div>
                          {isSelected && (
                            <div
                              style={{
                                width: "16px",
                                height: "16px",
                                borderRadius: "50%",
                                background: "#2563eb",
                                color: "#ffffff",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                flexShrink: 0
                              }}
                            >
                              <Check size={10} strokeWidth={3} />
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.5rem", marginTop: "1rem" }}>
                <button
                  type="button"
                  onClick={() => setShowSubjModal(false)}
                  style={{ background: "#f1f5f9", border: "1px solid #e2e8f0", padding: "0.5rem 1rem", borderRadius: "8px", fontSize: "0.85rem", fontWeight: 600, cursor: "pointer" }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{ background: "#2563eb", color: "#ffffff", border: "none", padding: "0.5rem 1.25rem", borderRadius: "8px", fontSize: "0.85rem", fontWeight: 700, cursor: "pointer" }}
                >
                  Save Subject
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL: ADD STUDENT TO CLASS ================= */}
      {showAddStudentModal && selectedClassDetail && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(15, 23, 42, 0.5)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 220,
            padding: "1rem"
          }}
        >
          <div
            style={{
              background: "#ffffff",
              borderRadius: "14px",
              maxWidth: "480px",
              width: "100%",
              padding: "1.75rem",
              boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1)"
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem" }}>
              <div>
                <h3 style={{ fontSize: "1.15rem", fontWeight: 800, color: "#0f172a", margin: 0 }}>
                  Add Student to {selectedClassDetail.name}
                </h3>
                <div style={{ fontSize: "0.78rem", color: "#64748b", marginTop: "0.2rem" }}>
                  Enrolls student directly into this class cohort.
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowAddStudentModal(false)}
                style={{ background: "none", border: "none", cursor: "pointer", color: "#64748b" }}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleAddStudentSubmit}>
              <div style={{ marginBottom: "0.85rem" }}>
                <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 700, marginBottom: "0.3rem" }}>
                  Student Full Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Aarav Sharma"
                  value={newStudentName}
                  onChange={(e) => setNewStudentName(e.target.value)}
                  style={{ width: "100%", padding: "0.5rem 0.75rem", borderRadius: "8px", border: "1px solid #cbd5e1", fontSize: "0.85rem" }}
                />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1.2fr 0.8fr", gap: "0.75rem", marginBottom: "0.85rem" }}>
                <div>
                  <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 700, marginBottom: "0.3rem" }}>
                    Roll Number *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 101"
                    value={newStudentRoll}
                    onChange={(e) => setNewStudentRoll(e.target.value)}
                    style={{ width: "100%", padding: "0.5rem 0.75rem", borderRadius: "8px", border: "1px solid #cbd5e1", fontSize: "0.85rem" }}
                  />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 700, marginBottom: "0.3rem" }}>
                    Section
                  </label>
                  <input
                    type="text"
                    placeholder="A"
                    value={newStudentSection}
                    onChange={(e) => setNewStudentSection(e.target.value)}
                    style={{ width: "100%", padding: "0.5rem 0.75rem", borderRadius: "8px", border: "1px solid #cbd5e1", fontSize: "0.85rem" }}
                  />
                </div>
              </div>

              <div style={{ marginBottom: "0.85rem" }}>
                <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 700, marginBottom: "0.3rem" }}>
                  Student Email (optional)
                </label>
                <input
                  type="email"
                  placeholder="aarav@school.edu"
                  value={newStudentEmail}
                  onChange={(e) => setNewStudentEmail(e.target.value)}
                  style={{ width: "100%", padding: "0.5rem 0.75rem", borderRadius: "8px", border: "1px solid #cbd5e1", fontSize: "0.85rem" }}
                />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem", marginBottom: "1.25rem" }}>
                <div>
                  <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 700, marginBottom: "0.3rem" }}>
                    Parent Name
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Rajesh Sharma"
                    value={newStudentParentName}
                    onChange={(e) => setNewStudentParentName(e.target.value)}
                    style={{ width: "100%", padding: "0.5rem 0.75rem", borderRadius: "8px", border: "1px solid #cbd5e1", fontSize: "0.85rem" }}
                  />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 700, marginBottom: "0.3rem" }}>
                    Parent Phone
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. +91 9876543210"
                    value={newStudentParentPhone}
                    onChange={(e) => setNewStudentParentPhone(e.target.value)}
                    style={{ width: "100%", padding: "0.5rem 0.75rem", borderRadius: "8px", border: "1px solid #cbd5e1", fontSize: "0.85rem" }}
                  />
                </div>
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.5rem" }}>
                <button
                  type="button"
                  onClick={() => setShowAddStudentModal(false)}
                  style={{ background: "#f1f5f9", border: "1px solid #e2e8f0", padding: "0.5rem 1rem", borderRadius: "8px", fontSize: "0.85rem", fontWeight: 600, cursor: "pointer" }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isAddingStudent}
                  style={{ background: "#2563eb", color: "#ffffff", border: "none", padding: "0.5rem 1.25rem", borderRadius: "8px", fontSize: "0.85rem", fontWeight: 700, cursor: "pointer" }}
                >
                  {isAddingStudent ? "Adding..." : "Add Student"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL: BULK IMPORT STUDENTS ================= */}
      {showBulkImportModal && selectedClassDetail && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(15, 23, 42, 0.5)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 220,
            padding: "1rem"
          }}
        >
          <div
            style={{
              background: "#ffffff",
              borderRadius: "14px",
              maxWidth: "520px",
              width: "100%",
              padding: "1.75rem",
              boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1)"
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem" }}>
              <div>
                <h3 style={{ fontSize: "1.15rem", fontWeight: 800, color: "#0f172a", margin: 0 }}>
                  Add List of Students (Bulk Import)
                </h3>
                <div style={{ fontSize: "0.78rem", color: "#64748b", marginTop: "0.2rem" }}>
                  Import to: {selectedClassDetail.name}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowBulkImportModal(false)}
                style={{ background: "none", border: "none", cursor: "pointer", color: "#64748b" }}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleBulkImportSubmit}>
              <div style={{ marginBottom: "0.85rem" }}>
                <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 700, marginBottom: "0.3rem" }}>
                  Paste Student Roster (Roll No, Full Name, Parent Phone)
                </label>
                <div style={{ fontSize: "0.75rem", color: "#64748b", marginBottom: "0.5rem" }}>
                  One student per line. Example: <code>101, Aarav Sharma, 9876543210</code>
                </div>
                <textarea
                  rows={6}
                  required
                  placeholder={"101, Aarav Sharma, 9876543210\n102, Ananya Patel, 9876543211\n103, Rohan Verma, 9876543212"}
                  value={bulkImportText}
                  onChange={(e) => setBulkImportText(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "0.65rem 0.75rem",
                    borderRadius: "8px",
                    border: "1px solid #cbd5e1",
                    fontSize: "0.85rem",
                    fontFamily: "monospace"
                  }}
                />
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.5rem" }}>
                <button
                  type="button"
                  onClick={() => setShowBulkImportModal(false)}
                  style={{ background: "#f1f5f9", border: "1px solid #e2e8f0", padding: "0.5rem 1rem", borderRadius: "8px", fontSize: "0.85rem", fontWeight: 600, cursor: "pointer" }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isImportingBulk}
                  style={{ background: "#2563eb", color: "#ffffff", border: "none", padding: "0.5rem 1.25rem", borderRadius: "8px", fontSize: "0.85rem", fontWeight: 700, cursor: "pointer" }}
                >
                  {isImportingBulk ? "Importing Roster..." : "Import Students"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
