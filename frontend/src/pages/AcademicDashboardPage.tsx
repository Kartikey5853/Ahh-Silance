import React, { useEffect, useState } from "react";
import { academicApi } from "../api/academicApi";
import type { UserProfile, Subject, Institution, ClassItem, InstitutionType, Student, Exam } from "../types/academic";
import { StudentProfileModal } from "../components/StudentProfileModal";
import {
  BookOpen,
  Users,
  Plus,
  FileSpreadsheet,
  Building2,
  FolderGit2,
  GraduationCap,
  ChevronRight,
  School,
  Target,
  Clock,
  Calendar
} from "lucide-react";

interface AcademicDashboardProps {
  onNavigate: (tab: any, params?: any) => void;
}

export const AcademicDashboardPage: React.FC<AcademicDashboardProps> = ({ onNavigate }) => {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [institutions, setInstitutions] = useState<Institution[]>([]);
  const [selectedInstId, setSelectedInstId] = useState<string>("");
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<string>("");
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [allExams, setAllExams] = useState<Exam[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedStudentForProfile, setSelectedStudentForProfile] = useState<Student | null>(null);

  // Modal States
  const [showOrgModal, setShowOrgModal] = useState(false);
  const [showClassModal, setShowClassModal] = useState(false);
  const [showSubjModal, setShowSubjModal] = useState(false);

  // New Organization Form State (College vs School vs JEE)
  const [orgType, setOrgType] = useState<InstitutionType>("college");
  const [orgName, setOrgName] = useState("");
  const [orgCode, setOrgCode] = useState("");
  // College-specific
  const [degreeProgram, setDegreeProgram] = useState("B.Tech / M.Tech");
  const [departmentName, setDepartmentName] = useState("Computer Science & Engineering");
  const [creditRequired, setCreditRequired] = useState(true);
  // School-specific
  const [schoolBoard, setSchoolBoard] = useState("CBSE");
  const [gradeRange, setGradeRange] = useState("Class 9 to 12");
  // JEE-specific
  const [jeeTarget, setJeeTarget] = useState("JEE Main & Advanced");
  const [markingPattern, setMarkingPattern] = useState("+4 / -1 Negative Marking");

  // New Class Form State (with 6-Month Semester Window)
  const [className, setClassName] = useState("Semester 6 - CSE");
  const [classCode, setClassCode] = useState("CSE-SEM6");
  const [classDept, setClassDept] = useState("Computer Science");
  const [classYear, setClassYear] = useState("2026-2027");
  const [startDate, setStartDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [endDate, setEndDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 182);
    return d.toISOString().split("T")[0];
  });

  // New Subject Form State (Adapts dynamically to Org Type)
  const [subjName, setSubjName] = useState("Natural Language Processing");
  const [subjCode, setSubjCode] = useState("NLP-701");
  const [subjCredits, setSubjCredits] = useState(4);
  const [subjSem, setSubjSem] = useState("Sem 6");
  const [subjGrade, setSubjGrade] = useState("Class 12");
  const [subjJeeTarget, setSubjJeeTarget] = useState("Physics");
  const [subjGradingSystem, setSubjGradingSystem] = useState("10-Point CGPA Scale (O, A+, A, B+, B, C, P, F)");
  const [subjSplit, setSubjSplit] = useState("80% Theory + 20% Internal Assessment");
  const [subjBoardOrProgram, setSubjBoardOrProgram] = useState("B.Tech Computer Science");
  const [subjLtpHours, setSubjLtpHours] = useState("3-1-0");

  const loadHierarchy = async () => {
    try {
      setLoading(true);
      const [profData, instData, exList] = await Promise.all([
        academicApi.getProfile().catch(() => null),
        academicApi.listInstitutions().catch(() => []),
        academicApi.listExams().catch(() => [])
      ]);

      if (profData) setProfile(profData);
      setInstitutions(instData || []);
      setAllExams(exList || []);

      if (instData && instData.length > 0) {
        const activeInst = profData?.institution_id && instData.some((i) => i.id === profData.institution_id)
          ? profData.institution_id
          : instData[0].id;

        setSelectedInstId(activeInst);

        const classList = await academicApi.listClasses(activeInst);
        setClasses(classList || []);

        const activeClass = classList && classList.length > 0 ? classList[0].id : "";
        setSelectedClassId(activeClass);

        const subjList = await academicApi.listSubjects(activeInst, activeClass || undefined);
        setSubjects(subjList || []);
      } else {
        setSelectedInstId("");
        setClasses([]);
        setSubjects([]);
      }
    } catch (err) {
      console.error("Failed to load hierarchy:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadHierarchy();
  }, []);

  const handleSelectInstitution = async (instId: string) => {
    setSelectedInstId(instId);
    try {
      const classList = await academicApi.listClasses(instId);
      setClasses(classList);
      const activeClass = classList.length > 0 ? classList[0].id : "";
      setSelectedClassId(activeClass);
      const subjList = await academicApi.listSubjects(instId, activeClass || undefined);
      setSubjects(subjList);
    } catch (err) {
      console.error("Error switching institution:", err);
    }
  };

  const handleSelectClass = async (classId: string) => {
    setSelectedClassId(classId);
    try {
      const subjList = await academicApi.listSubjects(selectedInstId, classId || undefined);
      setSubjects(subjList);
    } catch (err) {
      console.error("Error switching class:", err);
    }
  };

  // Create Organization (Decide College vs School vs JEE)
  const handleCreateOrg = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orgName.trim()) return;

    let config: any = {};
    if (orgType === "college") {
      config = {
        degree: degreeProgram,
        department: departmentName,
        semesters: ["Sem 1", "Sem 2", "Sem 3", "Sem 4", "Sem 5", "Sem 6", "Sem 7", "Sem 8"],
        exam_types: ["Mid-Sem", "End-Sem", "Class Test", "Lab Practical"],
        requires_credits: creditRequired,
        grading_system: "CGPA (10-point scale)"
      };
    } else if (orgType === "school") {
      config = {
        board: schoolBoard,
        grades: ["Class 6", "Class 7", "Class 8", "Class 9", "Class 10", "Class 11", "Class 12"],
        exam_types: ["Unit Test 1", "Unit Test 2", "Half-Yearly Exam", "Annual Final Exam"],
        grading_system: "CBSE / State Percentage"
      };
    } else {
      config = {
        target: jeeTarget,
        pattern: markingPattern,
        batches: ["Rankers Batch", "Droppers Batch", "Foundation"],
        exam_types: ["JEE Main Mock Test", "JEE Advanced Paper 1", "Chapter-wise Unit Test"]
      };
    }

    try {
      const created = await academicApi.createInstitution({
        name: orgName.trim(),
        code: orgCode.trim().toUpperCase() || "ORG",
        type: orgType,
        config: config
      } as any);

      setInstitutions([...institutions, created]);
      setSelectedInstId(created.id);
      setShowOrgModal(false);
      setOrgName("");
      setOrgCode("");
      await handleSelectInstitution(created.id);
    } catch (err) {
      alert("Error creating organization.");
    }
  };

  // Create Class / Cohort
  const handleCreateClass = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!className.trim()) return;
    if (!selectedInstId) {
      alert("Please create an organization first.");
      return;
    }

    try {
      const created = await academicApi.createClass({
        name: className.trim(),
        code: classCode.trim().toUpperCase(),
        institution_id: selectedInstId,
        department: classDept,
        academic_year: classYear,
        start_date: startDate,
        end_date: endDate
      });
      const updatedClasses = [created, ...classes];
      setClasses(updatedClasses);
      setSelectedClassId(created.id);
      setShowClassModal(false);
      await handleSelectClass(created.id);
    } catch (err) {
      alert("Error creating class.");
    }
  };

  // Create Subject (Fields adapt to College / School / JEE)
  const handleCreateSubject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subjName.trim()) return;
    if (!selectedInstId) {
      alert("Please select or create an organization first.");
      return;
    }

    const currentInstType = currentOrg?.type || "college";

    try {
      const created = await academicApi.createSubject({
        name: subjName.trim(),
        code: subjCode.trim().toUpperCase(),
        institution_id: selectedInstId,
        class_id: selectedClassId,
        institution_type: currentInstType,
        semester_or_grade: currentInstType === "college" ? subjSem : currentInstType === "school" ? subjGrade : subjJeeTarget,
        credits: currentInstType === "college" ? Number(subjCredits) : 0,
        academic_year: classYear,
        grading_system: subjGradingSystem,
        theory_practical_split: currentInstType === "school" ? subjSplit : undefined,
        board_or_program: subjBoardOrProgram,
        ltp_hours: currentInstType === "college" ? subjLtpHours : undefined,
        chapters: [
          "1. Foundational Core Principles",
          "2. Theoretical Modeling & Formulations",
          "3. Mathematical Derivations & Analysis",
          "4. Advanced Real-World Applications"
        ]
      });
      setSubjects([created, ...subjects]);
      setShowSubjModal(false);
      setSubjName("");
      setSubjCode("");
    } catch (err) {
      alert("Error creating subject.");
    }
  };

  const currentOrg = institutions.find((i) => i.id === selectedInstId);
  const currentClass = classes.find((c) => c.id === selectedClassId);

  return (
    <div className="academic-dashboard-page pb-32">
      {/* Clean Minimal Header */}
      <div style={{ marginBottom: "2rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "1rem" }}>
          <div>
            <h1 style={{ fontSize: "2rem", fontWeight: 800, color: "#0f172a", letterSpacing: "-0.03em", margin: 0 }}>
              {currentOrg ? currentOrg.name : "Academic Courses & Structure"}
            </h1>
            <p style={{ color: "#475569", fontSize: "0.92rem", marginTop: "0.3rem", margin: 0 }}>
              Faculty: {profile?.full_name || profile?.username || "Faculty"} • {profile?.role || "Professor"} • Classes, sections, and subjects
            </p>
          </div>

          <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
            <button
              onClick={() => setShowOrgModal(true)}
              className="btn btn-secondary"
              style={{ display: "flex", alignItems: "center", gap: "0.4rem", padding: "0.55rem 0.9rem", fontSize: "0.85rem" }}
            >
              <Building2 size={15} />
              Add Organization
            </button>
            <button
              onClick={() => setShowClassModal(true)}
              className="btn btn-secondary"
              style={{ display: "flex", alignItems: "center", gap: "0.4rem", padding: "0.55rem 0.9rem", fontSize: "0.85rem" }}
            >
              <FolderGit2 size={15} />
              Add Class
            </button>
            <button
              onClick={() => setShowSubjModal(true)}
              className="btn btn-primary"
              style={{ display: "flex", alignItems: "center", gap: "0.4rem", padding: "0.55rem 0.95rem", fontSize: "0.85rem" }}
            >
              <Plus size={15} />
              Add Subject
            </button>
          </div>
        </div>
      </div>

      {/* Paper Corrections & Deadlines Alert Banner */}
      {allExams.length > 0 && (
        <div
          style={{
            background: "#ffffff",
            border: "1px solid #bae6fd",
            borderRadius: "14px",
            padding: "1rem 1.25rem",
            marginBottom: "1.75rem",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: "1rem",
            boxShadow: "0 1px 3px rgba(0, 0, 0, 0.04)"
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
            <div style={{ padding: "0.55rem", background: "#e0f2fe", color: "#0284c7", borderRadius: "10px" }}>
              <Clock size={20} />
            </div>
            <div>
              <div style={{ fontSize: "0.95rem", fontWeight: 800, color: "#0f172a" }}>
                Pending Paper Corrections
              </div>
              <div style={{ fontSize: "0.82rem", color: "#64748b" }}>
                You have {allExams.length} scheduled {allExams.length === 1 ? "exam" : "exams"}. Please correct and submit evaluations before the deadline ({allExams[0]?.correction_deadline || "Upcoming"}).
              </div>
            </div>
          </div>

          <button
            onClick={() => onNavigate("evaluation", { initialExamId: allExams[0]?.id })}
            className="btn btn-primary"
            style={{ fontSize: "0.82rem", padding: "0.45rem 0.95rem", borderRadius: "8px" }}
          >
            Grade Papers Now →
          </button>
        </div>
      )}

      {/* If No Organization Created Yet (Fresh User Slate) */}
      {!loading && institutions.length === 0 ? (
        <div
          style={{
            background: "#ffffff",
            border: "2px dashed #cbd5e1",
            borderRadius: "16px",
            padding: "3.5rem 2rem",
            textAlign: "center",
            maxWidth: "600px",
            margin: "0 auto 2rem"
          }}
        >
          <Building2 size={48} style={{ color: "#2563eb", margin: "0 auto 1rem" }} />
          <h2 style={{ fontSize: "1.4rem", fontWeight: 800, color: "#0f172a", marginBottom: "0.5rem" }}>
            Step 1: Set Up Your Organization
          </h2>
          <p style={{ color: "#64748b", fontSize: "0.9rem", lineHeight: 1.6, marginBottom: "1.5rem" }}>
            Decide whether this is a <strong>College</strong> (Credits & Semesters), <strong>School</strong> (Grades & Terms), or <strong>JEE / Competitive Institution</strong> (Negative Marking & Mock Tests).
          </p>
          <button
            onClick={() => setShowOrgModal(true)}
            className="btn btn-primary"
            style={{ padding: "0.75rem 1.75rem", fontSize: "0.95rem", fontWeight: 700 }}
          >
            Create Organization
          </button>
        </div>
      ) : (
        /* Hierarchy Navigation Bar */
        <div
          style={{
            background: "#ffffff",
            border: "1px solid #e2e8f0",
            borderRadius: "12px",
            padding: "1rem 1.25rem",
            marginBottom: "2rem",
            display: "flex",
            alignItems: "center",
            gap: "1rem",
            flexWrap: "wrap",
            boxShadow: "0 1px 2px 0 rgba(0, 0, 0, 0.03)"
          }}
        >
          {/* Organization Dropdown */}
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <Building2 size={16} style={{ color: "#2563eb" }} />
            <span style={{ fontSize: "0.8rem", fontWeight: 700, color: "#64748b" }}>Organization:</span>
            <select
              value={selectedInstId}
              onChange={(e) => handleSelectInstitution(e.target.value)}
              style={{
                padding: "0.4rem 0.75rem",
                borderRadius: "6px",
                border: "1px solid #cbd5e1",
                fontSize: "0.85rem",
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
          </div>

          <ChevronRight size={16} style={{ color: "#cbd5e1" }} />

          {/* Class Dropdown */}
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <FolderGit2 size={16} style={{ color: "#16a34a" }} />
            <span style={{ fontSize: "0.8rem", fontWeight: 700, color: "#64748b" }}>Class / Batch:</span>
            {classes.length === 0 ? (
              <button
                onClick={() => setShowClassModal(true)}
                style={{ background: "#f1f5f9", border: "1px dashed #cbd5e1", padding: "0.35rem 0.75rem", borderRadius: "6px", fontSize: "0.8rem", cursor: "pointer", color: "#334155" }}
              >
                + Set Up First Class
              </button>
            ) : (
              <select
                value={selectedClassId}
                onChange={(e) => handleSelectClass(e.target.value)}
                style={{
                  padding: "0.4rem 0.75rem",
                  borderRadius: "6px",
                  border: "1px solid #cbd5e1",
                  fontSize: "0.85rem",
                  fontWeight: 600,
                  background: "#ffffff"
                }}
              >
                <option value="">All Classes in {currentOrg?.code || "Org"}</option>
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            )}
          </div>

          {currentClass?.start_date && (
            <div style={{ display: "flex", alignItems: "center", gap: "0.35rem", fontSize: "0.78rem", color: "#0369a1", background: "#f0f9ff", padding: "0.25rem 0.6rem", borderRadius: "6px", fontWeight: 600 }}>
              <Calendar size={13} />
              <span>Semester: {currentClass.start_date} to {currentClass.end_date || "Upcoming"} (6 Months)</span>
            </div>
          )}

          <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", fontSize: "0.85rem", color: "#475569", marginLeft: "auto" }}>
            <BookOpen size={16} style={{ color: "#475569" }} />
            <span><strong>{subjects.length}</strong> Subjects</span>
          </div>
        </div>
      )}

      {/* Main Subjects Grid */}
      {loading ? (
        <div style={{ textAlign: "center", padding: "4rem", color: "#64748b" }}>
          Loading curriculum...
        </div>
      ) : subjects.length === 0 && institutions.length > 0 ? (
        <div
          style={{
            background: "#ffffff",
            border: "2px dashed #cbd5e1",
            borderRadius: "16px",
            padding: "3.5rem 2rem",
            textAlign: "center"
          }}
        >
          <BookOpen size={44} style={{ color: "#94a3b8", margin: "0 auto 1rem" }} />
          <h3 style={{ fontSize: "1.25rem", fontWeight: 700, color: "#0f172a", marginBottom: "0.35rem" }}>
            No Subjects Added Yet
          </h3>
          <p style={{ color: "#64748b", fontSize: "0.9rem", maxWidth: "460px", margin: "0 auto 1.5rem" }}>
            Add your first subject to schedule tests, upload question papers, and run strict zero-temperature grading.
          </p>
          <div style={{ display: "flex", justifyContent: "center", gap: "0.75rem" }}>
            {classes.length === 0 && (
              <button
                onClick={() => setShowClassModal(true)}
                className="btn btn-secondary"
                style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}
              >
                <FolderGit2 size={16} /> 1. Set Up Class
              </button>
            )}
            <button
              onClick={() => setShowSubjModal(true)}
              className="btn btn-primary"
              style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}
            >
              <Plus size={16} /> 2. Add Subject
            </button>
          </div>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(360px, 1fr))", gap: "1.25rem" }}>
          {subjects.map((s) => (
            <div
              key={s.id}
              style={{
                background: "#ffffff",
                border: "1px solid #e2e8f0",
                borderRadius: "14px",
                padding: "1.5rem",
                boxShadow: "0 1px 3px 0 rgba(0, 0, 0, 0.03)",
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between"
              }}
            >
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "0.5rem" }}>
                  <span style={{ fontSize: "0.75rem", fontWeight: 700, background: "#f1f5f9", color: "#334155", padding: "0.2rem 0.5rem", borderRadius: "4px" }}>
                    {s.code}
                  </span>
                  <span style={{ fontSize: "0.75rem", color: "#64748b", fontWeight: 600 }}>
                    {s.semester_or_grade} {s.credits ? `• ${s.credits} Credits` : ""}
                  </span>
                </div>

                <h3 style={{ fontSize: "1.2rem", fontWeight: 800, color: "#0f172a", marginBottom: "0.5rem" }}>
                  {s.name}
                </h3>

                <p style={{ fontSize: "0.82rem", color: "#64748b", marginBottom: "1rem" }}>
                  Academic Year: {s.academic_year} • {s.chapters ? `${s.chapters.length} Syllabus Chapters` : "Configured"}
                </p>
              </div>

              {/* Action Buttons */}
              <div style={{ display: "flex", gap: "0.5rem", paddingTop: "1rem", borderTop: "1px solid #f1f5f9" }}>
                <button
                  onClick={() => onNavigate("exams", { subjectId: s.id })}
                  className="btn btn-primary"
                  style={{ flex: 1, fontSize: "0.82rem", padding: "0.45rem", display: "flex", alignItems: "center", justifyContent: "center", gap: "0.35rem" }}
                >
                  <FileSpreadsheet size={14} />
                  Scanner & Tests
                </button>
                <button
                  onClick={() => onNavigate("students", { subjectId: s.id })}
                  className="btn btn-secondary"
                  style={{ flex: 1, fontSize: "0.82rem", padding: "0.45rem", display: "flex", alignItems: "center", justifyContent: "center", gap: "0.35rem" }}
                >
                  <Users size={14} />
                  {s.enrolled_students || 0} Students
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* MODAL 1: Create Organization (College vs School vs JEE) */}
      {showOrgModal && (
        <div className="modal-backdrop" onClick={() => setShowOrgModal(false)}>
          <div className="modal-dialog" onClick={(e) => e.stopPropagation()} style={{ maxWidth: "520px" }}>
            <h3 style={{ fontSize: "1.3rem", fontWeight: 800, color: "#0f172a", marginBottom: "0.25rem" }}>
              Add Academic Organization
            </h3>
            <p style={{ fontSize: "0.85rem", color: "#64748b", marginBottom: "1.25rem" }}>
              Select the institution type to customize curriculum, credits, and grading schemas.
            </p>

            <form onSubmit={handleCreateOrg}>
              {/* Type Switcher Pills */}
              <div style={{ marginBottom: "1.25rem" }}>
                <label style={{ display: "block", fontSize: "0.78rem", fontWeight: 700, color: "#334155", marginBottom: "0.4rem" }}>
                  Institution Type *
                </label>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "0.5rem" }}>
                  <button
                    type="button"
                    onClick={() => setOrgType("college")}
                    style={{
                      padding: "0.6rem 0.5rem",
                      borderRadius: "8px",
                      border: orgType === "college" ? "2px solid #2563eb" : "1px solid #cbd5e1",
                      background: orgType === "college" ? "#eff6ff" : "#ffffff",
                      color: orgType === "college" ? "#2563eb" : "#475569",
                      fontWeight: 700,
                      fontSize: "0.82rem",
                      cursor: "pointer",
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      gap: "0.25rem"
                    }}
                  >
                    <GraduationCap size={18} />
                    College
                  </button>

                  <button
                    type="button"
                    onClick={() => setOrgType("school")}
                    style={{
                      padding: "0.6rem 0.5rem",
                      borderRadius: "8px",
                      border: orgType === "school" ? "2px solid #2563eb" : "1px solid #cbd5e1",
                      background: orgType === "school" ? "#eff6ff" : "#ffffff",
                      color: orgType === "school" ? "#2563eb" : "#475569",
                      fontWeight: 700,
                      fontSize: "0.82rem",
                      cursor: "pointer",
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      gap: "0.25rem"
                    }}
                  >
                    <School size={18} />
                    School (K-12)
                  </button>

                  <button
                    type="button"
                    onClick={() => setOrgType("competitive")}
                    style={{
                      padding: "0.6rem 0.5rem",
                      borderRadius: "8px",
                      border: orgType === "competitive" ? "2px solid #2563eb" : "1px solid #cbd5e1",
                      background: orgType === "competitive" ? "#eff6ff" : "#ffffff",
                      color: orgType === "competitive" ? "#2563eb" : "#475569",
                      fontWeight: 700,
                      fontSize: "0.82rem",
                      cursor: "pointer",
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      gap: "0.25rem"
                    }}
                  >
                    <Target size={18} />
                    JEE / Coaching
                  </button>
                </div>
              </div>

              {/* General Fields */}
              <div style={{ marginBottom: "1rem" }}>
                <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 700, marginBottom: "0.3rem" }}>
                  Organization Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Enter organization name"
                  value={orgName}
                  onChange={(e) => setOrgName(e.target.value)}
                  style={{ width: "100%", padding: "0.55rem 0.75rem", borderRadius: "8px", border: "1px solid #cbd5e1" }}
                />
              </div>

              <div style={{ marginBottom: "1rem" }}>
                <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 700, marginBottom: "0.3rem" }}>
                  Organization Code / Acronym
                </label>
                <input
                  type="text"
                  placeholder="e.g. ACE / DPS / APEX"
                  value={orgCode}
                  onChange={(e) => setOrgCode(e.target.value)}
                  style={{ width: "100%", padding: "0.55rem 0.75rem", borderRadius: "8px", border: "1px solid #cbd5e1" }}
                />
              </div>

              {/* Dynamic Sub-Fields by Type */}
              {orgType === "college" ? (
                <div style={{ background: "#f8fafc", padding: "1rem", borderRadius: "8px", marginBottom: "1.25rem", border: "1px solid #e2e8f0" }}>
                  <div style={{ fontSize: "0.78rem", fontWeight: 700, color: "#2563eb", marginBottom: "0.5rem" }}>
                    College Specific Settings:
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
                    <div>
                      <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 600, color: "#475569", marginBottom: "0.2rem" }}>Degree Program</label>
                      <input
                        type="text"
                        value={degreeProgram}
                        onChange={(e) => setDegreeProgram(e.target.value)}
                        style={{ width: "100%", padding: "0.4rem 0.6rem", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "0.82rem" }}
                      />
                    </div>
                    <div>
                      <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 600, color: "#475569", marginBottom: "0.2rem" }}>Department</label>
                      <input
                        type="text"
                        value={departmentName}
                        onChange={(e) => setDepartmentName(e.target.value)}
                        style={{ width: "100%", padding: "0.4rem 0.6rem", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "0.82rem" }}
                      />
                    </div>
                  </div>
                  <div style={{ marginTop: "0.6rem", display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.8rem", color: "#334155" }}>
                    <input
                      type="checkbox"
                      id="creditsCheck"
                      checked={creditRequired}
                      onChange={(e) => setCreditRequired(e.target.checked)}
                    />
                    <label htmlFor="creditsCheck">Require Subject Credits (e.g. 4 Credits / course)</label>
                  </div>
                </div>
              ) : orgType === "school" ? (
                <div style={{ background: "#f8fafc", padding: "1rem", borderRadius: "8px", marginBottom: "1.25rem", border: "1px solid #e2e8f0" }}>
                  <div style={{ fontSize: "0.78rem", fontWeight: 700, color: "#2563eb", marginBottom: "0.5rem" }}>
                    School Specific Settings:
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
                    <div>
                      <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 600, color: "#475569", marginBottom: "0.2rem" }}>Affiliation Board</label>
                      <select
                        value={schoolBoard}
                        onChange={(e) => setSchoolBoard(e.target.value)}
                        style={{ width: "100%", padding: "0.4rem 0.6rem", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "0.82rem", background: "#ffffff" }}
                      >
                        <option value="CBSE">CBSE Board</option>
                        <option value="ICSE">ICSE Board</option>
                        <option value="State Board">State Board</option>
                        <option value="IB / Cambridge">IB / Cambridge</option>
                      </select>
                    </div>
                    <div>
                      <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 600, color: "#475569", marginBottom: "0.2rem" }}>Grade Classes</label>
                      <input
                        type="text"
                        value={gradeRange}
                        onChange={(e) => setGradeRange(e.target.value)}
                        style={{ width: "100%", padding: "0.4rem 0.6rem", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "0.82rem" }}
                      />
                    </div>
                  </div>
                </div>
              ) : (
                <div style={{ background: "#f8fafc", padding: "1rem", borderRadius: "8px", marginBottom: "1.25rem", border: "1px solid #e2e8f0" }}>
                  <div style={{ fontSize: "0.78rem", fontWeight: 700, color: "#2563eb", marginBottom: "0.5rem" }}>
                    JEE / Competitive Coaching Settings:
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
                    <div>
                      <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 600, color: "#475569", marginBottom: "0.2rem" }}>Target Exam</label>
                      <input
                        type="text"
                        value={jeeTarget}
                        onChange={(e) => setJeeTarget(e.target.value)}
                        style={{ width: "100%", padding: "0.4rem 0.6rem", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "0.82rem" }}
                      />
                    </div>
                    <div>
                      <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 600, color: "#475569", marginBottom: "0.2rem" }}>Marking Pattern</label>
                      <input
                        type="text"
                        value={markingPattern}
                        onChange={(e) => setMarkingPattern(e.target.value)}
                        style={{ width: "100%", padding: "0.4rem 0.6rem", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "0.82rem" }}
                      />
                    </div>
                  </div>
                </div>
              )}

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.5rem" }}>
                <button type="button" onClick={() => setShowOrgModal(false)} className="btn btn-secondary">
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Save Organization
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: Create Class / Cohort */}
      {showClassModal && (
        <div className="modal-backdrop" onClick={() => setShowClassModal(false)}>
          <div className="modal-dialog" onClick={(e) => e.stopPropagation()}>
            <h3 style={{ fontSize: "1.25rem", fontWeight: 800, color: "#0f172a", marginBottom: "0.35rem" }}>
              Set Up Class / Batch
            </h3>
            <p style={{ fontSize: "0.85rem", color: "#64748b", marginBottom: "1.25rem" }}>
              Create a distinct cohort under <strong>{currentOrg?.name || "Organization"}</strong>.
            </p>
            <form onSubmit={handleCreateClass}>
              <div style={{ marginBottom: "1rem" }}>
                <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 700, marginBottom: "0.3rem" }}>
                  Class / Batch Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder={currentOrg?.type === "college" ? "e.g. Semester 6 - CSE" : currentOrg?.type === "school" ? "e.g. Class 12 - Section A" : "e.g. JEE 2027 Rankers Batch"}
                  value={className}
                  onChange={(e) => setClassName(e.target.value)}
                  style={{ width: "100%", padding: "0.55rem 0.75rem", borderRadius: "8px", border: "1px solid #cbd5e1" }}
                />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem", marginBottom: "1rem" }}>
                <div>
                  <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 700, marginBottom: "0.3rem" }}>
                    Batch / Section Code
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. CSE-SEM6"
                    value={classCode}
                    onChange={(e) => setClassCode(e.target.value)}
                    style={{ width: "100%", padding: "0.55rem 0.75rem", borderRadius: "8px", border: "1px solid #cbd5e1" }}
                  />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 700, marginBottom: "0.3rem" }}>
                    Academic Year
                  </label>
                  <input
                    type="text"
                    value={classYear}
                    onChange={(e) => setClassYear(e.target.value)}
                    style={{ width: "100%", padding: "0.55rem 0.75rem", borderRadius: "8px", border: "1px solid #cbd5e1" }}
                  />
                </div>
              </div>

              <div style={{ marginBottom: "1rem" }}>
                <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 700, marginBottom: "0.3rem" }}>
                  Department / Stream
                </label>
                <input
                  type="text"
                  value={classDept}
                  onChange={(e) => setClassDept(e.target.value)}
                  style={{ width: "100%", padding: "0.55rem 0.75rem", borderRadius: "8px", border: "1px solid #cbd5e1" }}
                />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem", marginBottom: "1.5rem" }}>
                <div>
                  <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 700, marginBottom: "0.3rem" }}>
                    Semester Start Date
                  </label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    style={{ width: "100%", padding: "0.55rem 0.75rem", borderRadius: "8px", border: "1px solid #cbd5e1" }}
                  />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 700, marginBottom: "0.3rem" }}>
                    Semester End Date (6 Months)
                  </label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    style={{ width: "100%", padding: "0.55rem 0.75rem", borderRadius: "8px", border: "1px solid #cbd5e1" }}
                  />
                </div>
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.5rem" }}>
                <button type="button" onClick={() => setShowClassModal(false)} className="btn btn-secondary">
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Save Class
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: Create Subject */}
      {showSubjModal && (
        <div className="modal-backdrop" onClick={() => setShowSubjModal(false)}>
          <div className="modal-dialog" onClick={(e) => e.stopPropagation()}>
            <h3 style={{ fontSize: "1.25rem", fontWeight: 800, color: "#0f172a", marginBottom: "0.35rem" }}>
              Add Subject
            </h3>
            <p style={{ fontSize: "0.85rem", color: "#64748b", marginBottom: "1.25rem" }}>
              Assign curriculum under <strong>{currentClass ? currentClass.name : currentOrg?.name || "Organization"}</strong>.
            </p>

            <form onSubmit={handleCreateSubject}>
              <div style={{ marginBottom: "1rem" }}>
                <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 700, marginBottom: "0.3rem" }}>
                  Subject Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Natural Language Processing"
                  value={subjName}
                  onChange={(e) => setSubjName(e.target.value)}
                  style={{ width: "100%", padding: "0.55rem 0.75rem", borderRadius: "8px", border: "1px solid #cbd5e1" }}
                />
              </div>

              {/* Dynamic Academic Details */}
              {currentOrg?.type === "school" ? (
                <div style={{ background: "#f8fafc", padding: "1rem", borderRadius: "8px", border: "1px solid #e2e8f0", marginBottom: "1.25rem" }}>
                  <div style={{ fontSize: "0.8rem", fontWeight: 700, color: "#0369a1", marginBottom: "0.6rem" }}>
                    School Curriculum & Evaluation (No Credits)
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem", marginBottom: "0.75rem" }}>
                    <div>
                      <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 700, color: "#475569", marginBottom: "0.3rem" }}>
                        Subject Code
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. SCI-10"
                        value={subjCode}
                        onChange={(e) => setSubjCode(e.target.value)}
                        style={{ width: "100%", padding: "0.5rem", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "0.85rem" }}
                      />
                    </div>
                    <div>
                      <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 700, color: "#475569", marginBottom: "0.3rem" }}>
                        Grade Level / Term
                      </label>
                      <input
                        type="text"
                        value={subjGrade}
                        onChange={(e) => setSubjGrade(e.target.value)}
                        placeholder="e.g. Class 10 - Term 1"
                        style={{ width: "100%", padding: "0.5rem", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "0.85rem" }}
                      />
                    </div>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
                    <div>
                      <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 700, color: "#475569", marginBottom: "0.3rem" }}>
                        Grading Scale
                      </label>
                      <select
                        value={subjGradingSystem}
                        onChange={(e) => setSubjGradingSystem(e.target.value)}
                        style={{ width: "100%", padding: "0.5rem", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "0.82rem", background: "#ffffff" }}
                      >
                        <option value="CBSE 9-Point Scale (A1 to E)">CBSE 9-Point Scale (A1 to E)</option>
                        <option value="ICSE Percentage Scale (1-100)">ICSE Percentage Scale (1-100)</option>
                        <option value="State Board Grading (A+, A, B, C)">State Board Grading (A+, A, B, C)</option>
                        <option value="Cambridge Assessment (A* to G)">Cambridge Assessment (A* to G)</option>
                      </select>
                    </div>
                    <div>
                      <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 700, color: "#475569", marginBottom: "0.3rem" }}>
                        Theory vs Practical Split
                      </label>
                      <select
                        value={subjSplit}
                        onChange={(e) => setSubjSplit(e.target.value)}
                        style={{ width: "100%", padding: "0.5rem", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "0.82rem", background: "#ffffff" }}
                      >
                        <option value="80% Theory + 20% Internal Assessment">80% Theory + 20% Internal Assessment</option>
                        <option value="70% Theory + 30% Practical Assessment">70% Theory + 30% Practical Assessment</option>
                        <option value="100% Theory">100% Theory Examination</option>
                      </select>
                    </div>
                  </div>
                </div>
              ) : currentOrg?.type === "competitive" ? (
                <div style={{ background: "#f8fafc", padding: "1rem", borderRadius: "8px", border: "1px solid #e2e8f0", marginBottom: "1.25rem" }}>
                  <div style={{ fontSize: "0.8rem", fontWeight: 700, color: "#0369a1", marginBottom: "0.6rem" }}>
                    Competitive & JEE Marking Framework (No Credits)
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem", marginBottom: "0.75rem" }}>
                    <div>
                      <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 700, color: "#475569", marginBottom: "0.3rem" }}>
                        Subject Code
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. JEE-PHY"
                        value={subjCode}
                        onChange={(e) => setSubjCode(e.target.value)}
                        style={{ width: "100%", padding: "0.5rem", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "0.85rem" }}
                      />
                    </div>
                    <div>
                      <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 700, color: "#475569", marginBottom: "0.3rem" }}>
                        Discipline
                      </label>
                      <select
                        value={subjJeeTarget}
                        onChange={(e) => setSubjJeeTarget(e.target.value)}
                        style={{ width: "100%", padding: "0.5rem", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "0.85rem", background: "#ffffff" }}
                      >
                        <option value="Physics">Physics</option>
                        <option value="Chemistry">Chemistry</option>
                        <option value="Mathematics">Mathematics</option>
                        <option value="Biology">Biology</option>
                      </select>
                    </div>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
                    <div>
                      <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 700, color: "#475569", marginBottom: "0.3rem" }}>
                        Target Exam
                      </label>
                      <select
                        value={subjBoardOrProgram}
                        onChange={(e) => setSubjBoardOrProgram(e.target.value)}
                        style={{ width: "100%", padding: "0.5rem", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "0.82rem", background: "#ffffff" }}
                      >
                        <option value="JEE Main & Advanced">JEE Main & Advanced</option>
                        <option value="NEET-UG">NEET-UG</option>
                        <option value="BITSAT">BITSAT</option>
                        <option value="Foundation & Olympiads">Foundation & Olympiads</option>
                      </select>
                    </div>
                    <div>
                      <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 700, color: "#475569", marginBottom: "0.3rem" }}>
                        Marking Pattern
                      </label>
                      <select
                        value={subjGradingSystem}
                        onChange={(e) => setSubjGradingSystem(e.target.value)}
                        style={{ width: "100%", padding: "0.5rem", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "0.82rem", background: "#ffffff" }}
                      >
                        <option value="+4 / -1 Negative Marking Scheme">+4 / -1 Negative Marking Scheme</option>
                        <option value="+3 / -1 Marking Scheme">+3 / -1 Marking Scheme</option>
                        <option value="Numerical (+4 / 0) No Negative">Numerical (+4 / 0) No Negative</option>
                      </select>
                    </div>
                  </div>
                </div>
              ) : (
                <div style={{ background: "#f8fafc", padding: "1rem", borderRadius: "8px", border: "1px solid #e2e8f0", marginBottom: "1.25rem" }}>
                  <div style={{ fontSize: "0.8rem", fontWeight: 700, color: "#0369a1", marginBottom: "0.6rem" }}>
                    College & University Framework (Credits & CGPA)
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "0.75rem", marginBottom: "0.75rem" }}>
                    <div>
                      <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 700, color: "#475569", marginBottom: "0.3rem" }}>
                        Subject Code
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="NLP-701"
                        value={subjCode}
                        onChange={(e) => setSubjCode(e.target.value)}
                        style={{ width: "100%", padding: "0.5rem", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "0.85rem" }}
                      />
                    </div>
                    <div>
                      <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 700, color: "#475569", marginBottom: "0.3rem" }}>
                        Semester
                      </label>
                      <select
                        value={subjSem}
                        onChange={(e) => setSubjSem(e.target.value)}
                        style={{ width: "100%", padding: "0.5rem", borderRadius: "6px", border: "1px solid #cbd5e1", background: "#ffffff", fontSize: "0.85rem" }}
                      >
                        {["Sem 1", "Sem 2", "Sem 3", "Sem 4", "Sem 5", "Sem 6", "Sem 7", "Sem 8"].map((s) => (
                          <option key={s} value={s}>{s}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 700, color: "#475569", marginBottom: "0.3rem" }}>
                        Credits
                      </label>
                      <input
                        type="number"
                        min={1}
                        max={8}
                        value={subjCredits}
                        onChange={(e) => setSubjCredits(Number(e.target.value))}
                        style={{ width: "100%", padding: "0.5rem", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "0.85rem" }}
                      />
                    </div>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
                    <div>
                      <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 700, color: "#475569", marginBottom: "0.3rem" }}>
                        Grading Scale (CGPA)
                      </label>
                      <select
                        value={subjGradingSystem}
                        onChange={(e) => setSubjGradingSystem(e.target.value)}
                        style={{ width: "100%", padding: "0.5rem", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "0.82rem", background: "#ffffff" }}
                      >
                        <option value="10-Point CGPA Scale (O, A+, A, B+, B, C, P, F)">10-Point CGPA Scale (O, A+, A, B+, B, C, P, F)</option>
                        <option value="4.0 GPA Scale">4.0 GPA Scale</option>
                        <option value="Absolute Percentage (1-100)">Absolute Percentage (1-100)</option>
                      </select>
                    </div>
                    <div>
                      <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 700, color: "#475569", marginBottom: "0.3rem" }}>
                        L-T-P Hours
                      </label>
                      <input
                        type="text"
                        value={subjLtpHours}
                        onChange={(e) => setSubjLtpHours(e.target.value)}
                        placeholder="e.g. 3-1-0"
                        style={{ width: "100%", padding: "0.5rem", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "0.85rem" }}
                      />
                    </div>
                  </div>
                </div>
              )}

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.5rem" }}>
                <button type="button" onClick={() => setShowSubjModal(false)} className="btn btn-secondary">
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
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
          onNavigateToEvaluation={(evalId) => {
            setSelectedStudentForProfile(null);
            onNavigate("evaluation", { evalId });
          }}
        />
      )}
    </div>
  );
};
