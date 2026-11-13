import React, { useEffect, useState } from "react";
import { academicApi } from "../api/academicApi";
import type { UserProfile, Subject, Institution, ClassItem, Exam } from "../types/academic";
import {
  BookOpen,
  Plus,
  FileSpreadsheet,
  FolderGit2,
  ChevronRight,
  X,
  Sparkles,
  Search,
  ArrowRight
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
  const [selectedClassFilter, setSelectedClassFilter] = useState<string>("all");

  // Modals
  const [showClassModal, setShowClassModal] = useState(false);
  const [showSubjModal, setShowSubjModal] = useState(false);

  // New Class Form State
  const [className, setClassName] = useState("Class 10 - Section A");
  const [classCode, setClassCode] = useState("CLS-10A");
  const [classDept, setClassDept] = useState("Secondary School");

  // New Subject Form State
  const [subjName, setSubjName] = useState("Science");
  const [subjCode, setSubjCode] = useState("SCI-10");
  const [subjSem, setSubjSem] = useState("Class 10 - Term 1");
  const [subjClassId, setSubjClassId] = useState<string>("");

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
        setSelectedClassFilter(created.id);
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

  const filteredSubjects = subjects.filter(
    (s) =>
      s.name.toLowerCase().includes(searchFilter.toLowerCase()) ||
      (s.code && s.code.toLowerCase().includes(searchFilter.toLowerCase()))
  );

  const CARD_GRADIENTS = [
    "linear-gradient(135deg, #1e40af 0%, #3b82f6 100%)",
    "linear-gradient(135deg, #065f46 0%, #10b981 100%)",
    "linear-gradient(135deg, #6b21a8 0%, #a855f7 100%)",
    "linear-gradient(135deg, #9a3412 0%, #f97316 100%)",
    "linear-gradient(135deg, #0f766e 0%, #14b8a6 100%)"
  ];

  return (
    <div className="academic-dashboard-page" style={{ maxWidth: "1280px", margin: "0 auto", paddingBottom: "4rem" }}>
      {/* Welcome Banner */}
      <div
        style={{
          background: "#ffffff",
          border: "1px solid #e2e8f0",
          borderRadius: "14px",
          padding: "1.5rem 1.75rem",
          marginBottom: "1.5rem",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: "1.25rem"
        }}
      >
        <div>
          <h1
            style={{
              fontSize: "1.5rem",
              fontWeight: 800,
              color: "#0f172a",
              letterSpacing: "-0.03em",
              margin: 0
            }}
          >
            Namaste, {profile?.full_name || "Faculty"}
          </h1>
          <p style={{ color: "#64748b", fontSize: "0.88rem", margin: "3px 0 0 0" }}>
            {currentOrg?.name ? `${currentOrg.name} • ` : ""}Upload papers, parse question schemes, and evaluate student copies.
          </p>
        </div>

        {/* Action Buttons */}
        <div style={{ display: "flex", alignItems: "center", gap: "0.65rem" }}>
          <button
            type="button"
            onClick={() => onNavigate("exams", { mode: "create" })}
            style={{
              background: "#2563eb",
              color: "#ffffff",
              border: "none",
              borderRadius: "8px",
              padding: "0.65rem 1.15rem",
              fontSize: "0.88rem",
              fontWeight: 700,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "0.45rem",
              boxShadow: "0 2px 6px rgba(37, 99, 235, 0.25)"
            }}
          >
            <Sparkles size={16} />
            <span>+ Check New Exam</span>
          </button>

          <button
            type="button"
            onClick={() => setShowSubjModal(true)}
            style={{
              background: "#ffffff",
              border: "1px solid #cbd5e1",
              color: "#334155",
              borderRadius: "8px",
              padding: "0.65rem 1rem",
              fontSize: "0.85rem",
              fontWeight: 700,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "0.35rem"
            }}
          >
            <Plus size={15} />
            <span>Add Subject</span>
          </button>
        </div>
      </div>

      {/* Real Metrics Strip (Zero fluff) */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
          gap: "1rem",
          marginBottom: "1.75rem"
        }}
      >
        <div
          style={{
            background: "#ffffff",
            border: "1px solid #e2e8f0",
            borderRadius: "10px",
            padding: "1rem 1.25rem",
            display: "flex",
            alignItems: "center",
            gap: "0.85rem"
          }}
        >
          <div
            style={{
              width: "40px",
              height: "40px",
              borderRadius: "8px",
              background: "#eff6ff",
              color: "#2563eb",
              display: "flex",
              alignItems: "center",
              justifyContent: "center"
            }}
          >
            <FolderGit2 size={20} />
          </div>
          <div>
            <div style={{ fontSize: "1.35rem", fontWeight: 800, color: "#0f172a", lineHeight: 1.1 }}>
              {classes.length}
            </div>
            <div style={{ fontSize: "0.78rem", color: "#64748b", fontWeight: 600 }}>Classes / Batches</div>
          </div>
        </div>

        <div
          style={{
            background: "#ffffff",
            border: "1px solid #e2e8f0",
            borderRadius: "10px",
            padding: "1rem 1.25rem",
            display: "flex",
            alignItems: "center",
            gap: "0.85rem"
          }}
        >
          <div
            style={{
              width: "40px",
              height: "40px",
              borderRadius: "8px",
              background: "#f0fdf4",
              color: "#16a34a",
              display: "flex",
              alignItems: "center",
              justifyContent: "center"
            }}
          >
            <BookOpen size={20} />
          </div>
          <div>
            <div style={{ fontSize: "1.35rem", fontWeight: 800, color: "#0f172a", lineHeight: 1.1 }}>
              {subjects.length}
            </div>
            <div style={{ fontSize: "0.78rem", color: "#64748b", fontWeight: 600 }}>Active Subjects</div>
          </div>
        </div>

        <div
          style={{
            background: "#ffffff",
            border: "1px solid #e2e8f0",
            borderRadius: "10px",
            padding: "1rem 1.25rem",
            display: "flex",
            alignItems: "center",
            gap: "0.85rem"
          }}
        >
          <div
            style={{
              width: "40px",
              height: "40px",
              borderRadius: "8px",
              background: "#faf5ff",
              color: "#9333ea",
              display: "flex",
              alignItems: "center",
              justifyContent: "center"
            }}
          >
            <FileSpreadsheet size={20} />
          </div>
          <div>
            <div style={{ fontSize: "1.35rem", fontWeight: 800, color: "#0f172a", lineHeight: 1.1 }}>
              {allExams.length}
            </div>
            <div style={{ fontSize: "0.78rem", color: "#64748b", fontWeight: 600 }}>Created Exams</div>
          </div>
        </div>
      </div>

      {/* Classes & Subjects Section Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: "1.25rem",
          flexWrap: "wrap",
          gap: "1rem"
        }}
      >
        <div>
          <h2 style={{ fontSize: "1.2rem", fontWeight: 800, color: "#0f172a", margin: 0, letterSpacing: "-0.02em" }}>
            My Courses & Subjects
          </h2>
          <p style={{ margin: "2px 0 0 0", color: "#64748b", fontSize: "0.82rem" }}>
            Select a subject to upload papers or view evaluations
          </p>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "0.65rem" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.45rem",
              background: "#ffffff",
              border: "1px solid #cbd5e1",
              borderRadius: "8px",
              padding: "0.35rem 0.65rem"
            }}
          >
            <Search size={14} style={{ color: "#94a3b8" }} />
            <input
              type="text"
              placeholder="Search subjects..."
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              style={{
                border: "none",
                outline: "none",
                fontSize: "0.82rem",
                width: "140px"
              }}
            />
          </div>

          <button
            type="button"
            onClick={() => setShowClassModal(true)}
            style={{
              background: "#f1f5f9",
              border: "1px solid #e2e8f0",
              color: "#334155",
              borderRadius: "8px",
              padding: "0.45rem 0.85rem",
              fontSize: "0.82rem",
              fontWeight: 700,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "0.35rem"
            }}
          >
            <FolderGit2 size={14} />
            <span>+ Add Class</span>
          </button>
        </div>
      </div>

      {/* Class Filter Bar */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "0.5rem",
          overflowX: "auto",
          paddingBottom: "0.6rem",
          marginBottom: "1.25rem"
        }}
      >
        <button
          type="button"
          onClick={() => setSelectedClassFilter("all")}
          style={{
            background: selectedClassFilter === "all" ? "#1e293b" : "#ffffff",
            color: selectedClassFilter === "all" ? "#ffffff" : "#475569",
            border: `1px solid ${selectedClassFilter === "all" ? "#1e293b" : "#cbd5e1"}`,
            padding: "0.4rem 0.9rem",
            borderRadius: "999px",
            fontSize: "0.82rem",
            fontWeight: 700,
            cursor: "pointer",
            whiteSpace: "nowrap"
          }}
        >
          All Classes ({classes.length})
        </button>

        {classes.map((cls) => {
          const isSel = selectedClassFilter === cls.id;
          const sCount = subjects.filter((s) => s.class_id === cls.id).length;
          return (
            <button
              key={cls.id}
              type="button"
              onClick={() => {
                setSelectedClassFilter(cls.id);
                setSubjClassId(cls.id);
              }}
              style={{
                background: isSel ? "#2563eb" : "#ffffff",
                color: isSel ? "#ffffff" : "#475569",
                border: `1px solid ${isSel ? "#2563eb" : "#cbd5e1"}`,
                padding: "0.4rem 0.9rem",
                borderRadius: "999px",
                fontSize: "0.82rem",
                fontWeight: 700,
                cursor: "pointer",
                whiteSpace: "nowrap"
              }}
            >
              {cls.name} ({sCount})
            </button>
          );
        })}
      </div>

      {/* Subject & Class Cards Grid */}
      {(() => {
        const visibleSubjects = filteredSubjects.filter((s) => {
          if (selectedClassFilter === "all") return true;
          return s.class_id === selectedClassFilter;
        });

        const emptyClasses = classes.filter((cls) => {
          if (selectedClassFilter !== "all" && selectedClassFilter !== cls.id) return false;
          return !subjects.some((s) => s.class_id === cls.id);
        });

        if (visibleSubjects.length === 0 && emptyClasses.length === 0) {
          return (
            <div
              style={{
                background: "#ffffff",
                border: "2px dashed #cbd5e1",
                borderRadius: "14px",
                padding: "3.5rem 1.5rem",
                textAlign: "center",
                marginBottom: "2.5rem"
              }}
            >
              <BookOpen size={42} style={{ color: "#94a3b8", margin: "0 auto 1rem" }} />
              <h3 style={{ fontSize: "1.15rem", fontWeight: 800, color: "#0f172a", marginBottom: "0.35rem" }}>
                No Classes or Subjects Found
              </h3>
              <p style={{ color: "#64748b", fontSize: "0.85rem", maxWidth: "420px", margin: "0 auto 1.5rem" }}>
                Add your class and subjects to schedule exams, scan papers, and run evaluations.
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
              gap: "1.25rem",
              marginBottom: "2.5rem"
            }}
          >
            {visibleSubjects.map((subj, idx) => {
              const gradient = CARD_GRADIENTS[idx % CARD_GRADIENTS.length];
              const matchingExams = allExams.filter((e) => e.subject_id === subj.id);
              const parentClass = classes.find((c) => c.id === subj.class_id);

              return (
                <div
                  key={subj.id}
                  style={{
                    background: "#ffffff",
                    border: "1px solid #e2e8f0",
                    borderRadius: "12px",
                    overflow: "hidden",
                    boxShadow: "0 1px 3px rgba(0,0,0,0.02)",
                    display: "flex",
                    flexDirection: "column"
                  }}
                >
                  {/* Header Banner */}
                  <div
                    style={{
                      background: gradient,
                      padding: "1.15rem 1.25rem 0.95rem 1.25rem",
                      color: "#ffffff"
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.35rem" }}>
                      <span
                        style={{
                          background: "rgba(255, 255, 255, 0.2)",
                          fontSize: "0.72rem",
                          fontWeight: 700,
                          padding: "0.2rem 0.5rem",
                          borderRadius: "4px"
                        }}
                      >
                        {parentClass ? parentClass.name : (subj.semester_or_grade || "General Batch")}
                      </span>
                      <span style={{ fontSize: "0.76rem", opacity: 0.9 }}>
                        {subj.code || "SUB"}
                      </span>
                    </div>

                    <h3
                      style={{
                        fontSize: "1.15rem",
                        fontWeight: 800,
                        margin: 0,
                        lineHeight: 1.2,
                        letterSpacing: "-0.02em"
                      }}
                    >
                      {subj.name}
                    </h3>
                  </div>

                  {/* Card Body */}
                  <div style={{ padding: "1rem 1.25rem", flex: 1, display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
                    <div style={{ marginBottom: "0.85rem", fontSize: "0.8rem", color: "#64748b" }}>
                      <strong>{matchingExams.length}</strong> Exams Created
                    </div>

                    {/* Actions */}
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "0.5rem",
                        borderTop: "1px solid #f1f5f9",
                        paddingTop: "0.75rem"
                      }}
                    >
                      <button
                        type="button"
                        onClick={() => onNavigate("exams", { mode: "create", subjectId: subj.id })}
                        style={{
                          flex: 1,
                          background: "#2563eb",
                          color: "#ffffff",
                          border: "none",
                          borderRadius: "6px",
                          padding: "0.5rem 0.75rem",
                          fontSize: "0.8rem",
                          fontWeight: 700,
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: "0.35rem"
                        }}
                      >
                        <Sparkles size={13} />
                        <span>Upload Paper</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => onNavigate("exams", { subjectId: subj.id })}
                        style={{
                          background: "#f1f5f9",
                          border: "1px solid #e2e8f0",
                          color: "#334155",
                          borderRadius: "6px",
                          padding: "0.5rem 0.65rem",
                          fontSize: "0.8rem",
                          fontWeight: 600,
                          cursor: "pointer"
                        }}
                      >
                        Exams
                      </button>

                      <button
                        type="button"
                        onClick={() => onNavigate("students", { subjectId: subj.id })}
                        style={{
                          background: "#f1f5f9",
                          border: "1px solid #e2e8f0",
                          color: "#334155",
                          borderRadius: "6px",
                          padding: "0.5rem 0.65rem",
                          fontSize: "0.8rem",
                          fontWeight: 600,
                          cursor: "pointer"
                        }}
                        title="View Marks Register"
                      >
                        Register
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}

            {emptyClasses.map((emptyCls) => (
              <div
                key={emptyCls.id}
                style={{
                  background: "#ffffff",
                  border: "2px dashed #cbd5e1",
                  borderRadius: "12px",
                  padding: "1.25rem",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                  minHeight: "180px"
                }}
              >
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.45rem", color: "#2563eb", marginBottom: "0.4rem" }}>
                    <FolderGit2 size={18} />
                    <span style={{ fontSize: "0.75rem", fontWeight: 700, background: "#eff6ff", color: "#1d4ed8", padding: "0.15rem 0.45rem", borderRadius: "4px" }}>
                      {emptyCls.code || "CLASS"}
                    </span>
                  </div>
                  <h3 style={{ fontSize: "1.15rem", fontWeight: 800, color: "#0f172a", margin: "0 0 0.35rem 0" }}>
                    {emptyCls.name}
                  </h3>
                  <p style={{ fontSize: "0.8rem", color: "#64748b", margin: 0 }}>
                    Class active in backend SQLite database. Add a subject to begin grading papers.
                  </p>
                </div>

                <div style={{ marginTop: "1rem", borderTop: "1px solid #f1f5f9", paddingTop: "0.75rem" }}>
                  <button
                    type="button"
                    onClick={() => {
                      setSubjClassId(emptyCls.id);
                      setShowSubjModal(true);
                    }}
                    style={{
                      width: "100%",
                      background: "#2563eb",
                      color: "#ffffff",
                      border: "none",
                      borderRadius: "6px",
                      padding: "0.5rem 0.75rem",
                      fontSize: "0.8rem",
                      fontWeight: 700,
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "0.35rem"
                    }}
                  >
                    <Plus size={14} />
                    <span>+ Add Subject to {emptyCls.name}</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        );
      })()}

      {/* Recent Exams Section */}
      {allExams.length > 0 && (
        <div
          style={{
            background: "#ffffff",
            border: "1px solid #e2e8f0",
            borderRadius: "12px",
            padding: "1.25rem 1.5rem"
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.85rem" }}>
            <h3 style={{ fontSize: "1.05rem", fontWeight: 800, color: "#0f172a", margin: 0 }}>
              Recent Exams
            </h3>
            <button
              type="button"
              onClick={() => onNavigate("exams")}
              style={{
                background: "none",
                border: "none",
                color: "#2563eb",
                fontSize: "0.8rem",
                fontWeight: 700,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "0.2rem"
              }}
            >
              <span>View All</span>
              <ChevronRight size={13} />
            </button>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "0.55rem" }}>
            {allExams.slice(0, 4).map((ex) => (
              <div
                key={ex.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "0.75rem 1rem",
                  background: "#f8fafc",
                  borderRadius: "8px",
                  border: "1px solid #e2e8f0",
                  flexWrap: "wrap",
                  gap: "0.75rem"
                }}
              >
                <div>
                  <div style={{ fontWeight: 700, fontSize: "0.9rem", color: "#0f172a" }}>
                    {ex.title}
                  </div>
                  <div style={{ fontSize: "0.74rem", color: "#64748b" }}>
                    {ex.exam_type} • Max: {ex.max_marks} Marks
                  </div>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <button
                    type="button"
                    onClick={() => onNavigate("evaluation", { examId: ex.id })}
                    style={{
                      background: "#2563eb",
                      color: "#ffffff",
                      border: "none",
                      borderRadius: "6px",
                      padding: "0.4rem 0.75rem",
                      fontSize: "0.78rem",
                      fontWeight: 700,
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: "0.3rem"
                    }}
                  >
                    <span>Grade Papers</span>
                    <ArrowRight size={12} />
                  </button>
                </div>
              </div>
            ))}
          </div>
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

              {classes.length > 0 && (
                <div style={{ marginBottom: "1.25rem" }}>
                  <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 700, marginBottom: "0.3rem" }}>
                    Assign to Class
                  </label>
                  <select
                    value={subjClassId}
                    onChange={(e) => setSubjClassId(e.target.value)}
                    style={{ width: "100%", padding: "0.5rem 0.75rem", borderRadius: "8px", border: "1px solid #cbd5e1", fontSize: "0.85rem", background: "#ffffff" }}
                  >
                    {classes.map((c) => (
                      <option key={c.id} value={c.id}>{c.name} ({c.code || "CLS"})</option>
                    ))}
                  </select>
                </div>
              )}

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
    </div>
  );
};
