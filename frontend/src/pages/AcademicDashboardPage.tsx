import React, { useEffect, useState } from "react";
import { academicApi } from "../api/academicApi";
import type { UserProfile, Subject, Institution, ClassItem, Student, Exam } from "../types/academic";
import { StudentProfileModal } from "../components/StudentProfileModal";
import {
  BookOpen,
  Plus,
  FileSpreadsheet,
  FolderGit2,
  ChevronRight,
  X,
  Sparkles,
  CheckCircle2,
  Users,
  Search,
  ArrowRight,
  Award
} from "lucide-react";

interface AcademicDashboardProps {
  onNavigate: (tab: any, params?: any) => void;
  onOpenQuickCheck?: () => void;
}

export const AcademicDashboardPage: React.FC<AcademicDashboardProps> = ({
  onNavigate,
  onOpenQuickCheck
}) => {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [institutions, setInstitutions] = useState<Institution[]>([]);
  const [selectedInstId, setSelectedInstId] = useState<string>("");
  const [, setClasses] = useState<ClassItem[]>([]);
  const [selectedClassId] = useState<string>("");
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [allExams, setAllExams] = useState<Exam[]>([]);
  const [selectedStudentForProfile, setSelectedStudentForProfile] = useState<Student | null>(null);
  const [searchFilter, setSearchFilter] = useState("");

  // Modals
  const [showClassModal, setShowClassModal] = useState(false);
  const [showSubjModal, setShowSubjModal] = useState(false);

  // New Class Form State
  const [className, setClassName] = useState("Class 10 - Section A");
  const [classCode, setClassCode] = useState("CLS-10A");
  const [classDept, setClassDept] = useState("Secondary (CBSE)");

  // New Subject Form State
  const [subjName, setSubjName] = useState("Science");
  const [subjCode, setSubjCode] = useState("SCI-10");
  const [subjSem, setSubjSem] = useState("Class 10 - Term 1");

  const SCHOOL_CLASS_PRESETS = [
    { label: "Class 10 - A", name: "Class 10 - Section A", code: "CLS-10A", dept: "Secondary (Board)" },
    { label: "Class 10 - B", name: "Class 10 - Section B", code: "CLS-10B", dept: "Secondary (Board)" },
    { label: "Class 9 - A", name: "Class 9 - Section A", code: "CLS-9A", dept: "Secondary" },
    { label: "Class 11 - Sci", name: "Class 11 - Science", code: "CLS-11SCI", dept: "Science (PCM/B)" },
    { label: "Class 12 - Sci", name: "Class 12 - Science", code: "CLS-12SCI", dept: "Senior Secondary" }
  ];

  const currentOrg = institutions.find((i) => i.id === selectedInstId) || institutions[0];

  const loadDashboardData = async () => {
    try {
      const [profData, instData, exList] = await Promise.all([
        academicApi.getProfile().catch(() => null),
        academicApi.listInstitutions().catch(() => []),
        academicApi.listExams().catch(() => [])
      ]);

      if (profData) setProfile(profData);
      setAllExams(exList || []);

      let activeInsts = instData || [];

      // Auto-fallback: if no institution exists yet, automatically create one so teacher isn't blocked!
      if (activeInsts.length === 0) {
        try {
          const defaultInst = await academicApi.createInstitution({
            name: "Delhi Public School (CBSE)",
            type: "school",
            code: "DPS-2026"
          });
          activeInsts = [defaultInst];
        } catch (e) {
          activeInsts = [{ id: "default-inst", name: "School / College Campus", type: "school", code: "SCH", config: { board: "CBSE", degree: "B.Tech", department: "Academics" } }];
        }
      }

      setInstitutions(activeInsts);
      const chosenInst = activeInsts[0].id;
      setSelectedInstId(chosenInst);

      // Load classes
      let classList = await academicApi.listClasses(chosenInst).catch(() => []);

      // If no classes exist yet, auto-create a sample class so dashboard looks populated!
      if (!classList || classList.length === 0) {
        try {
          const newClass = await academicApi.createClass({
            name: "Class 10 - Section A",
            code: "CLS-10A",
            institution_id: chosenInst,
            department: "Secondary School (CBSE)",
            academic_year: "2026-2027"
          });
          classList = [newClass];

          // Auto-create subject
          await academicApi.createSubject({
            name: "Science",
            code: "SCI-10",
            institution_id: chosenInst,
            class_id: newClass.id,
            institution_type: "school",
            semester_or_grade: "Class 10 - Term 1",
            credits: 4,
            academic_year: "2026-2027",
            chapters: []
          });
        } catch (e) {
          console.log("Auto setup sample class:", e);
        }
      }

      setClasses(classList || []);
      const subjList = await academicApi.listSubjects(chosenInst).catch(() => []);
      setSubjects(subjList || []);
    } catch (err) {
      console.error("Failed to load dashboard data:", err);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, []);

  // Quick Create Class Handler
  const handleCreateClass = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!className.trim() || !selectedInstId) return;

    try {
      const created = await academicApi.createClass({
        name: className.trim(),
        code: classCode.trim(),
        institution_id: selectedInstId,
        department: classDept.trim(),
        academic_year: "2026-2027"
      });
      setShowClassModal(false);
      setClasses((prev) => [created, ...prev]);
    } catch (err) {
      alert("Failed to create class.");
    }
  };

  // Quick Create Subject Handler
  const handleCreateSubject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subjName.trim() || !selectedInstId) return;

    try {
      const created = await academicApi.createSubject({
        name: subjName.trim(),
        code: subjCode.trim(),
        institution_id: selectedInstId,
        class_id: selectedClassId || undefined,
        institution_type: currentOrg?.type || "school",
        semester_or_grade: subjSem,
        credits: 4,
        academic_year: "2026-2027",
        chapters: []
      });
      setShowSubjModal(false);
      setSubjects((prev) => [created, ...prev]);
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
          background: "linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)",
          border: "1px solid #e2e8f0",
          borderRadius: "16px",
          padding: "1.75rem 2rem",
          marginBottom: "1.75rem",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: "1.25rem",
          boxShadow: "0 2px 4px rgba(0,0,0,0.02)"
        }}
      >
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.55rem", marginBottom: "0.25rem" }}>
            <span style={{ fontSize: "1.4rem" }}>👋</span>
            <h1
              style={{
                fontSize: "1.65rem",
                fontWeight: 800,
                color: "#0f172a",
                letterSpacing: "-0.03em",
                margin: 0
              }}
            >
              Namaste, {profile?.full_name || "Teacher"}!
            </h1>
          </div>
          <p style={{ color: "#64748b", fontSize: "0.9rem", margin: 0 }}>
            Upload exam papers, let AI grade student handwriting, and download your marks register effortlessly.
          </p>
        </div>

        {/* Action Buttons */}
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <button
            type="button"
            onClick={() => {
              if (onOpenQuickCheck) {
                onOpenQuickCheck();
              } else {
                onNavigate("exams");
              }
            }}
            style={{
              background: "linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)",
              color: "#ffffff",
              border: "none",
              borderRadius: "10px",
              padding: "0.75rem 1.35rem",
              fontSize: "0.92rem",
              fontWeight: 800,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "0.55rem",
              boxShadow: "0 4px 14px rgba(37, 99, 235, 0.3)",
              transition: "transform 0.15s ease"
            }}
            onMouseEnter={(e) => (e.currentTarget.style.transform = "translateY(-1px)")}
            onMouseLeave={(e) => (e.currentTarget.style.transform = "translateY(0)")}
          >
            <Sparkles size={17} />
            <span>+ Check New Exam</span>
          </button>

          <button
            type="button"
            onClick={() => setShowSubjModal(true)}
            style={{
              background: "#ffffff",
              border: "1px solid #cbd5e1",
              color: "#334155",
              borderRadius: "10px",
              padding: "0.75rem 1.15rem",
              fontSize: "0.88rem",
              fontWeight: 700,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "0.45rem"
            }}
          >
            <Plus size={16} />
            <span>Add Subject</span>
          </button>
        </div>
      </div>

      {/* Quick Metrics Strip */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: "1rem",
          marginBottom: "2rem"
        }}
      >
        <div
          style={{
            background: "#ffffff",
            border: "1px solid #e2e8f0",
            borderRadius: "12px",
            padding: "1.15rem 1.25rem",
            display: "flex",
            alignItems: "center",
            gap: "1rem"
          }}
        >
          <div
            style={{
              width: "44px",
              height: "44px",
              borderRadius: "10px",
              background: "#eff6ff",
              color: "#2563eb",
              display: "flex",
              alignItems: "center",
              justifyContent: "center"
            }}
          >
            <BookOpen size={22} />
          </div>
          <div>
            <div style={{ fontSize: "1.45rem", fontWeight: 800, color: "#0f172a", lineHeight: 1.1 }}>
              {subjects.length}
            </div>
            <div style={{ fontSize: "0.8rem", color: "#64748b", fontWeight: 600 }}>Active Subjects</div>
          </div>
        </div>

        <div
          style={{
            background: "#ffffff",
            border: "1px solid #e2e8f0",
            borderRadius: "12px",
            padding: "1.15rem 1.25rem",
            display: "flex",
            alignItems: "center",
            gap: "1rem"
          }}
        >
          <div
            style={{
              width: "44px",
              height: "44px",
              borderRadius: "10px",
              background: "#f0fdf4",
              color: "#16a34a",
              display: "flex",
              alignItems: "center",
              justifyContent: "center"
            }}
          >
            <FileSpreadsheet size={22} />
          </div>
          <div>
            <div style={{ fontSize: "1.45rem", fontWeight: 800, color: "#0f172a", lineHeight: 1.1 }}>
              {allExams.length}
            </div>
            <div style={{ fontSize: "0.8rem", color: "#64748b", fontWeight: 600 }}>Total Exams</div>
          </div>
        </div>

        <div
          style={{
            background: "#ffffff",
            border: "1px solid #e2e8f0",
            borderRadius: "12px",
            padding: "1.15rem 1.25rem",
            display: "flex",
            alignItems: "center",
            gap: "1rem"
          }}
        >
          <div
            style={{
              width: "44px",
              height: "44px",
              borderRadius: "10px",
              background: "#faf5ff",
              color: "#9333ea",
              display: "flex",
              alignItems: "center",
              justifyContent: "center"
            }}
          >
            <CheckCircle2 size={22} />
          </div>
          <div>
            <div style={{ fontSize: "1.45rem", fontWeight: 800, color: "#0f172a", lineHeight: 1.1 }}>
              AI Ready
            </div>
            <div style={{ fontSize: "0.8rem", color: "#64748b", fontWeight: 600 }}>Magic Ink Grader</div>
          </div>
        </div>

        <div
          onClick={() => onNavigate("students")}
          style={{
            background: "#ffffff",
            border: "1px solid #e2e8f0",
            borderRadius: "12px",
            padding: "1.15rem 1.25rem",
            display: "flex",
            alignItems: "center",
            gap: "1rem",
            cursor: "pointer"
          }}
        >
          <div
            style={{
              width: "44px",
              height: "44px",
              borderRadius: "10px",
              background: "#fffbeb",
              color: "#d97706",
              display: "flex",
              alignItems: "center",
              justifyContent: "center"
            }}
          >
            <Award size={22} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: "1.1rem", fontWeight: 800, color: "#0f172a", lineHeight: 1.1 }}>
              Award Lists
            </div>
            <div style={{ fontSize: "0.8rem", color: "#64748b", fontWeight: 600 }}>Download Register</div>
          </div>
          <ChevronRight size={16} style={{ color: "#94a3b8" }} />
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
          <h2 style={{ fontSize: "1.3rem", fontWeight: 800, color: "#0f172a", margin: 0, letterSpacing: "-0.02em" }}>
            My Classes & Courses
          </h2>
          <p style={{ margin: "2px 0 0 0", color: "#64748b", fontSize: "0.85rem" }}>
            Select any class to check exam answer sheets or view registers.
          </p>
        </div>

        {/* Search filter */}
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
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
            <Search size={15} style={{ color: "#94a3b8" }} />
            <input
              type="text"
              placeholder="Search subjects..."
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              style={{
                border: "none",
                outline: "none",
                fontSize: "0.85rem",
                width: "160px"
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
            <span>+ Add Class / Section</span>
          </button>
        </div>
      </div>

      {/* Google Classroom Style Grid */}
      {filteredSubjects.length > 0 ? (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))",
            gap: "1.5rem",
            marginBottom: "2.5rem"
          }}
        >
          {filteredSubjects.map((subj, idx) => {
            const gradient = CARD_GRADIENTS[idx % CARD_GRADIENTS.length];
            const matchingExams = allExams.filter((e) => e.subject_id === subj.id);

            return (
              <div
                key={subj.id}
                style={{
                  background: "#ffffff",
                  border: "1px solid #e2e8f0",
                  borderRadius: "14px",
                  overflow: "hidden",
                  boxShadow: "0 2px 6px rgba(0,0,0,0.03)",
                  display: "flex",
                  flexDirection: "column",
                  transition: "transform 0.15s ease, box-shadow 0.15s ease"
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = "translateY(-2px)";
                  e.currentTarget.style.boxShadow = "0 8px 20px rgba(0,0,0,0.06)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = "translateY(0)";
                  e.currentTarget.style.boxShadow = "0 2px 6px rgba(0,0,0,0.03)";
                }}
              >
                {/* Colored Top Header Banner (Google Classroom style) */}
                <div
                  style={{
                    background: gradient,
                    padding: "1.25rem 1.25rem 1rem 1.25rem",
                    color: "#ffffff"
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.45rem" }}>
                    <span
                      style={{
                        background: "rgba(255, 255, 255, 0.2)",
                        backdropFilter: "blur(4px)",
                        fontSize: "0.72rem",
                        fontWeight: 700,
                        padding: "0.2rem 0.55rem",
                        borderRadius: "9999px",
                        letterSpacing: "0.02em"
                      }}
                    >
                      {subj.semester_or_grade || "Class Session"}
                    </span>
                    <span style={{ fontSize: "0.78rem", opacity: 0.9 }}>
                      {subj.code || "SUB-01"}
                    </span>
                  </div>

                  <h3
                    style={{
                      fontSize: "1.25rem",
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
                <div style={{ padding: "1.15rem 1.25rem", flex: 1, display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
                  <div style={{ marginBottom: "1rem" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "1rem", fontSize: "0.82rem", color: "#64748b" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}>
                        <FileSpreadsheet size={15} style={{ color: "#2563eb" }} />
                        <span><strong>{matchingExams.length}</strong> Exams</span>
                      </div>

                      <div style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}>
                        <Users size={15} style={{ color: "#16a34a" }} />
                        <span>Students Enrolled</span>
                      </div>
                    </div>
                  </div>

                  {/* Direct Action Buttons on Card */}
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "0.5rem",
                      borderTop: "1px solid #f1f5f9",
                      paddingTop: "0.85rem"
                    }}
                  >
                    <button
                      type="button"
                      onClick={() => {
                        if (matchingExams.length > 0) {
                          onNavigate("evaluation", { examId: matchingExams[0].id });
                        } else if (onOpenQuickCheck) {
                          onOpenQuickCheck();
                        } else {
                          onNavigate("exams", { subjectId: subj.id });
                        }
                      }}
                      style={{
                        flex: 1,
                        background: "#2563eb",
                        color: "#ffffff",
                        border: "none",
                        borderRadius: "8px",
                        padding: "0.55rem 0.75rem",
                        fontSize: "0.82rem",
                        fontWeight: 700,
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: "0.35rem"
                      }}
                    >
                      <Sparkles size={14} />
                      <span>Check Copies</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => onNavigate("exams", { subjectId: subj.id })}
                      style={{
                        background: "#f1f5f9",
                        border: "1px solid #e2e8f0",
                        color: "#334155",
                        borderRadius: "8px",
                        padding: "0.55rem 0.65rem",
                        fontSize: "0.82rem",
                        fontWeight: 600,
                        cursor: "pointer"
                      }}
                      title="View all exams in this subject"
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
                        borderRadius: "8px",
                        padding: "0.55rem 0.65rem",
                        fontSize: "0.82rem",
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
        </div>
      ) : (
        /* Empty State */
        <div
          style={{
            background: "#ffffff",
            border: "2px dashed #cbd5e1",
            borderRadius: "16px",
            padding: "3.5rem 2rem",
            textAlign: "center",
            marginBottom: "2.5rem"
          }}
        >
          <BookOpen size={48} style={{ color: "#94a3b8", margin: "0 auto 1rem" }} />
          <h3 style={{ fontSize: "1.25rem", fontWeight: 800, color: "#0f172a", marginBottom: "0.5rem" }}>
            No subjects created yet
          </h3>
          <p style={{ color: "#64748b", fontSize: "0.9rem", maxWidth: "460px", margin: "0 auto 1.5rem", lineHeight: 1.5 }}>
            Create your first class or subject to start uploading question papers and evaluating student copies.
          </p>
          <button
            type="button"
            onClick={() => setShowSubjModal(true)}
            style={{
              background: "#2563eb",
              color: "#ffffff",
              border: "none",
              borderRadius: "8px",
              padding: "0.65rem 1.35rem",
              fontSize: "0.9rem",
              fontWeight: 700,
              cursor: "pointer"
            }}
          >
            + Create First Subject
          </button>
        </div>
      )}

      {/* Recent Exams Tray */}
      {allExams.length > 0 && (
        <div
          style={{
            background: "#ffffff",
            border: "1px solid #e2e8f0",
            borderRadius: "14px",
            padding: "1.5rem",
            boxShadow: "0 1px 3px rgba(0,0,0,0.02)"
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1rem" }}>
            <h3 style={{ fontSize: "1.1rem", fontWeight: 800, color: "#0f172a", margin: 0 }}>
              Recent Exam Papers
            </h3>
            <button
              type="button"
              onClick={() => onNavigate("exams")}
              style={{
                background: "none",
                border: "none",
                color: "#2563eb",
                fontSize: "0.82rem",
                fontWeight: 700,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "0.25rem"
              }}
            >
              <span>View All Exams</span>
              <ChevronRight size={14} />
            </button>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "0.65rem" }}>
            {allExams.slice(0, 4).map((ex) => (
              <div
                key={ex.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "0.85rem 1rem",
                  background: "#f8fafc",
                  borderRadius: "10px",
                  border: "1px solid #e2e8f0",
                  flexWrap: "wrap",
                  gap: "0.75rem"
                }}
              >
                <div>
                  <div style={{ fontWeight: 700, fontSize: "0.92rem", color: "#0f172a" }}>
                    {ex.title}
                  </div>
                  <div style={{ fontSize: "0.75rem", color: "#64748b", marginTop: "1px" }}>
                    {ex.exam_type} • Max Marks: {ex.max_marks} • Pass: {ex.passing_marks}
                  </div>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                  <span
                    style={{
                      background: "#f0fdf4",
                      color: "#166534",
                      border: "1px solid #bbf7d0",
                      padding: "0.2rem 0.55rem",
                      borderRadius: "9999px",
                      fontSize: "0.72rem",
                      fontWeight: 700
                    }}
                  >
                    Answer Key Ready
                  </span>

                  <button
                    type="button"
                    onClick={() => onNavigate("evaluation", { examId: ex.id })}
                    style={{
                      background: "#2563eb",
                      color: "#ffffff",
                      border: "none",
                      borderRadius: "6px",
                      padding: "0.45rem 0.85rem",
                      fontSize: "0.8rem",
                      fontWeight: 700,
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: "0.35rem"
                    }}
                  >
                    <span>Check Copies</span>
                    <ArrowRight size={13} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ================= MODAL: ADD CLASS / SECTION ================= */}
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
              maxWidth: "500px",
              width: "100%",
              padding: "1.75rem",
              boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1)"
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem" }}>
              <h3 style={{ fontSize: "1.2rem", fontWeight: 800, color: "#0f172a", margin: 0 }}>
                Add Class or Section
              </h3>
              <button
                type="button"
                onClick={() => setShowClassModal(false)}
                style={{ background: "none", border: "none", cursor: "pointer", color: "#64748b" }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Quick Presets */}
            <div style={{ marginBottom: "1rem" }}>
              <span style={{ fontSize: "0.74rem", fontWeight: 700, color: "#64748b" }}>Quick Presets:</span>
              <div style={{ display: "flex", gap: "0.35rem", flexWrap: "wrap", marginTop: "0.35rem" }}>
                {SCHOOL_CLASS_PRESETS.map((p) => (
                  <button
                    key={p.code}
                    type="button"
                    onClick={() => {
                      setClassName(p.name);
                      setClassCode(p.code);
                      setClassDept(p.dept);
                    }}
                    style={{
                      background: "#f1f5f9",
                      border: "1px solid #e2e8f0",
                      borderRadius: "6px",
                      padding: "0.25rem 0.5rem",
                      fontSize: "0.74rem",
                      fontWeight: 600,
                      cursor: "pointer"
                    }}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            <form onSubmit={handleCreateClass}>
              <div style={{ marginBottom: "0.85rem" }}>
                <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 700, marginBottom: "0.3rem" }}>
                  Class / Section Name *
                </label>
                <input
                  type="text"
                  required
                  value={className}
                  onChange={(e) => setClassName(e.target.value)}
                  style={{ width: "100%", padding: "0.5rem 0.75rem", borderRadius: "8px", border: "1px solid #cbd5e1", fontSize: "0.85rem" }}
                />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem", marginBottom: "1.25rem" }}>
                <div>
                  <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 700, marginBottom: "0.3rem" }}>
                    Class Code
                  </label>
                  <input
                    type="text"
                    value={classCode}
                    onChange={(e) => setClassCode(e.target.value)}
                    style={{ width: "100%", padding: "0.5rem 0.75rem", borderRadius: "8px", border: "1px solid #cbd5e1", fontSize: "0.85rem" }}
                  />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 700, marginBottom: "0.3rem" }}>
                    Department / Board
                  </label>
                  <input
                    type="text"
                    value={classDept}
                    onChange={(e) => setClassDept(e.target.value)}
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
                  Save Class
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
              maxWidth: "520px",
              width: "100%",
              padding: "1.75rem",
              boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1)"
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem" }}>
              <h3 style={{ fontSize: "1.2rem", fontWeight: 800, color: "#0f172a", margin: 0 }}>
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
                    Subject Code
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

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.5rem", marginTop: "1.25rem" }}>
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

      {/* Student Profile Modal */}
      {selectedStudentForProfile && (
        <StudentProfileModal
          student={selectedStudentForProfile}
          onClose={() => setSelectedStudentForProfile(null)}
        />
      )}
    </div>
  );
};
