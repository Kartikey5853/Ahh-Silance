import React, { useEffect, useState } from "react";
import { academicApi } from "../api/academicApi";
import type { UserProfile, Subject, Institution, ClassItem, InstitutionType, Student, Exam } from "../types/academic";
import { StudentProfileModal } from "../components/StudentProfileModal";
import {
  BookOpen,
  Plus,
  FileSpreadsheet,
  Building2,
  FolderGit2,
  GraduationCap,
  ChevronRight,
  School,
  Target,
  Clock,
  Calendar,
  X
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
  const [creditRequired] = useState(true);
  // School-specific
  const [schoolBoard, setSchoolBoard] = useState("CBSE");
  const [gradeRange, setGradeRange] = useState("Class 9 to 12");
  // JEE-specific
  const [jeeTarget, setJeeTarget] = useState("JEE Main & Advanced");
  const [markingPattern, setMarkingPattern] = useState("+4 / -1 Negative Marking");

  // New Class Form State (Adapts dynamically to College vs School vs JEE)
  const [className, setClassName] = useState("Semester 1");
  const [classCode, setClassCode] = useState("SEM-01");
  const [classDept, setClassDept] = useState("Computer Science & Engineering");
  const [classYear, setClassYear] = useState("2026-2027");
  const [startDate, setStartDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [endDate, setEndDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 182);
    return d.toISOString().split("T")[0];
  });

  const COLLEGE_CLASS_PRESETS = [
    { label: "Sem 1", name: "Semester 1", code: "SEM-01", dept: "Foundation Engineering" },
    { label: "Sem 2", name: "Semester 2", code: "SEM-02", dept: "Core Engineering" },
    { label: "Sem 3", name: "Semester 3", code: "SEM-03", dept: "Computer Science" },
    { label: "Sem 4", name: "Semester 4", code: "SEM-04", dept: "Computer Science" },
    { label: "Sem 5", name: "Semester 5", code: "SEM-05", dept: "Computer Science" },
    { label: "Sem 6", name: "Semester 6 - CSE", code: "CSE-SEM6", dept: "Computer Science" },
    { label: "Sem 7", name: "Semester 7", code: "SEM-07", dept: "Advanced Specialization" },
    { label: "Sem 8", name: "Semester 8", code: "SEM-08", dept: "Major Project & Capstone" },
  ];

  const SCHOOL_CLASS_PRESETS = [
    { label: "Class 8", name: "Class 8 - Section A", code: "CLS-8A", dept: "Middle School" },
    { label: "Class 9", name: "Class 9 - Section A", code: "CLS-9A", dept: "Secondary" },
    { label: "Class 10 - A", name: "Class 10 - Section A", code: "CLS-10A", dept: "Secondary (Board)" },
    { label: "Class 10 - B", name: "Class 10 - Section B", code: "CLS-10B", dept: "Secondary (Board)" },
    { label: "Class 11 - Sci", name: "Class 11 - Science", code: "CLS-11SCI", dept: "Science (PCM/B)" },
    { label: "Class 11 - Comm", name: "Class 11 - Commerce", code: "CLS-11COMM", dept: "Commerce" },
    { label: "Class 12 - Sci", name: "Class 12 - Science", code: "CLS-12SCI", dept: "Senior Secondary" },
    { label: "Class 12 - Comm", name: "Class 12 - Commerce", code: "CLS-12COMM", dept: "Senior Secondary" },
  ];

  const JEE_CLASS_PRESETS = [
    { label: "Class 11 JEE", name: "Class 11 - JEE Advanced", code: "JEE-11-ADV", dept: "Target 2027 (PCM)" },
    { label: "Class 12 JEE", name: "Class 12 - JEE Advanced", code: "JEE-12-ADV", dept: "Target 2026 (PCM)" },
    { label: "Repeater / Dropper", name: "Repeater Batch - JEE Main & Adv", code: "JEE-REPEAT-1", dept: "Full-Time Intensive" },
    { label: "Foundation Class 10", name: "Foundation Class 10 - JEE Prep", code: "JEE-FND-10", dept: "Early Olympiad / JEE" },
    { label: "Crash Course", name: "JEE Main Final Lap Crash Course", code: "JEE-CRASH", dept: "Mock Tests & Rank Boost" },
  ];

  const COLLEGE_SUBJ_PRESETS = [
    { name: "Natural Language Processing", code: "NLP-701", credits: 4, ltp: "3-1-0", sem: "Sem 6", prog: "B.Tech Computer Science", grading: "10-Point CGPA Scale (O, A+, A, B+, B, C, P, F)" },
    { name: "Automata Theory & Compiler Design", code: "ATCD-602", credits: 4, ltp: "3-1-0", sem: "Sem 6", prog: "B.Tech Computer Science", grading: "10-Point CGPA Scale (O, A+, A, B+, B, C, P, F)" },
    { name: "Data Structures & Algorithms", code: "CS-201", credits: 4, ltp: "3-0-2", sem: "Sem 3", prog: "B.Tech Computer Science", grading: "10-Point CGPA Scale (O, A+, A, B+, B, C, P, F)" },
    { name: "Operating Systems", code: "CS-401", credits: 4, ltp: "3-0-2", sem: "Sem 4", prog: "B.Tech Computer Science", grading: "10-Point CGPA Scale (O, A+, A, B+, B, C, P, F)" },
    { name: "Database Management Systems", code: "CS-501", credits: 4, ltp: "3-0-2", sem: "Sem 5", prog: "B.Tech Computer Science", grading: "10-Point CGPA Scale (O, A+, A, B+, B, C, P, F)" },
    { name: "Computer Networks", code: "CS-601", credits: 3, ltp: "3-0-0", sem: "Sem 6", prog: "B.Tech Computer Science", grading: "10-Point CGPA Scale (O, A+, A, B+, B, C, P, F)" },
    { name: "Machine Learning & AI", code: "AI-701", credits: 4, ltp: "3-0-2", sem: "Sem 7", prog: "Artificial Intelligence & Data Science", grading: "10-Point CGPA Scale (O, A+, A, B+, B, C, P, F)" },
    { name: "Software Engineering & Agile", code: "SE-502", credits: 3, ltp: "3-0-0", sem: "Sem 5", prog: "B.Tech Computer Science", grading: "10-Point CGPA Scale (O, A+, A, B+, B, C, P, F)" },
  ];

  const SCHOOL_SUBJ_PRESETS = [
    { name: "Mathematics", code: "MATH-10", grade: "Class 10 - Term 1", board: "CBSE Board", split: "80% Theory + 20% Internal Assessment", grading: "CBSE 9-Point Scale (A1 to E)" },
    { name: "Science", code: "SCI-10", grade: "Class 10 - Term 1", board: "CBSE Board", split: "80% Theory + 20% Practical Assessment", grading: "CBSE 9-Point Scale (A1 to E)" },
    { name: "English Core", code: "ENG-12", grade: "Class 12 - Term 1", board: "CBSE Board", split: "80% Theory + 20% Internal Assessment", grading: "CBSE 9-Point Scale (A1 to E)" },
    { name: "Physics", code: "PHY-12", grade: "Class 12 - Term 1", board: "CBSE Board", split: "70% Theory + 30% Practical Assessment", grading: "CBSE 9-Point Scale (A1 to E)" },
    { name: "Chemistry", code: "CHEM-12", grade: "Class 12 - Term 1", board: "CBSE Board", split: "70% Theory + 30% Practical Assessment", grading: "CBSE 9-Point Scale (A1 to E)" },
    { name: "Biology", code: "BIO-12", grade: "Class 12 - Term 1", board: "CBSE Board", split: "70% Theory + 30% Practical Assessment", grading: "CBSE 9-Point Scale (A1 to E)" },
    { name: "Computer Science (Python)", code: "CS-12", grade: "Class 12 - Term 1", board: "CBSE Board", split: "70% Theory + 30% Practical Assessment", grading: "CBSE 9-Point Scale (A1 to E)" },
    { name: "Social Science", code: "SST-10", grade: "Class 10 - Term 1", board: "CBSE Board", split: "80% Theory + 20% Internal Assessment", grading: "CBSE 9-Point Scale (A1 to E)" },
  ];

  const JEE_SUBJ_PRESETS = [
    { name: "Physics - Mechanics & General Physics", code: "JEE-PHY-01", target: "Physics - Mechanics", exam: "JEE Main & Advanced", pattern: "+4 / -1 Negative Marking" },
    { name: "Physics - Electrodynamics & Optics", code: "JEE-PHY-02", target: "Physics - Electrodynamics", exam: "JEE Main & Advanced", pattern: "+4 / -1 Negative Marking" },
    { name: "Chemistry - Physical Chemistry", code: "JEE-CHEM-01", target: "Physical Chemistry", exam: "JEE Main & Advanced", pattern: "+4 / -1 Negative Marking" },
    { name: "Chemistry - Organic Chemistry", code: "JEE-CHEM-02", target: "Organic Chemistry", exam: "JEE Main & Advanced", pattern: "+4 / -1 Negative Marking" },
    { name: "Mathematics - Calculus & Functions", code: "JEE-MATH-01", target: "Calculus", exam: "JEE Main & Advanced", pattern: "+4 / -1 Negative Marking" },
    { name: "Mathematics - Coordinate Geometry & Vectors", code: "JEE-MATH-02", target: "Coordinate & Vectors", exam: "JEE Main & Advanced", pattern: "+4 / -1 Negative Marking" },
    { name: "Biology - Botany & Genetics (NEET)", code: "NEET-BIO-01", target: "Botany & Genetics", exam: "NEET-UG", pattern: "+4 / -1 Negative Marking" },
  ];

  const applyOrgTypeDefaults = (type: InstitutionType) => {
    const today = new Date();
    setStartDate(today.toISOString().split("T")[0]);
    if (type === "college") {
      setClassName("Semester 1");
      setClassCode("SEM-01");
      setClassDept("Computer Science & Engineering");
      const end = new Date(today);
      end.setMonth(end.getMonth() + 6);
      setEndDate(end.toISOString().split("T")[0]);

      setSubjName("Natural Language Processing");
      setSubjCode("NLP-701");
      setSubjCredits(4);
      setSubjSem("Sem 6");
      setSubjLtpHours("3-1-0");
      setSubjBoardOrProgram("B.Tech Computer Science");
      setSubjGradingSystem("10-Point CGPA Scale (O, A+, A, B+, B, C, P, F)");
    } else if (type === "school") {
      setClassName("Class 10 - Section A");
      setClassCode("CLS-10A");
      setClassDept("Science (CBSE)");
      const end = new Date(today);
      end.setFullYear(end.getFullYear() + 1);
      setEndDate(end.toISOString().split("T")[0]);

      setSubjName("Mathematics");
      setSubjCode("MATH-10");
      setSubjCredits(0);
      setSubjGrade("Class 10 - Term 1");
      setSubjBoardOrProgram("CBSE Board");
      setSubjSplit("80% Theory + 20% Internal Assessment");
      setSubjGradingSystem("CBSE 9-Point Scale (A1 to E)");
    } else {
      setClassName("Class 11 - JEE Advanced");
      setClassCode("JEE-11-ADV");
      setClassDept("PCM (Target 2027)");
      const end = new Date(today);
      end.setFullYear(end.getFullYear() + 1);
      setEndDate(end.toISOString().split("T")[0]);

      setSubjName("Physics - Mechanics & Electrodynamics");
      setSubjCode("JEE-PHY-01");
      setSubjCredits(0);
      setSubjJeeTarget("Physics - Mechanics");
      setSubjBoardOrProgram("JEE Main & Advanced");
      setSubjGradingSystem("+4 / -1 Negative Marking");
    }
  };

  const handleOpenClassModal = () => {
    if (currentOrg) {
      applyOrgTypeDefaults(currentOrg.type);
    }
    setShowClassModal(true);
  };

  const handleOpenSubjModal = () => {
    if (currentOrg) {
      applyOrgTypeDefaults(currentOrg.type);
    }
    setShowSubjModal(true);
  };

  // New Subject Form State (Adapts dynamically to Org Type)
  const [subjName, setSubjName] = useState("Natural Language Processing");
  const [subjCode, setSubjCode] = useState("NLP-701");
  const [subjCredits, setSubjCredits] = useState(4);
  const [subjSem, setSubjSem] = useState("Sem 6");
  const [subjGrade, setSubjGrade] = useState("Class 10 - Term 1");
  const [subjJeeTarget, setSubjJeeTarget] = useState("Physics - Mechanics");
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
        const activeOrg = instData.find((i) => i.id === activeInst);
        if (activeOrg) {
          applyOrgTypeDefaults(activeOrg.type);
        }

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
    const target = institutions.find((i) => i.id === instId);
    if (target) {
      applyOrgTypeDefaults(target.type);
    }
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
              onClick={handleOpenClassModal}
              className="btn btn-secondary"
              style={{ display: "flex", alignItems: "center", gap: "0.4rem", padding: "0.55rem 0.9rem", fontSize: "0.85rem" }}
            >
              <FolderGit2 size={15} />
              {currentOrg?.type === "college" ? "Add Semester" : "Add Class"}
            </button>
            <button
              onClick={handleOpenSubjModal}
              className="btn btn-primary"
              style={{ display: "flex", alignItems: "center", gap: "0.4rem", padding: "0.55rem 0.95rem", fontSize: "0.85rem" }}
            >
              <Plus size={15} />
              {currentOrg?.type === "college" ? "Add Course Subject" : currentOrg?.type === "school" ? "Add School Subject" : "Add JEE Subject"}
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

          {/* Class / Semester Dropdown */}
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <FolderGit2 size={16} style={{ color: "#16a34a" }} />
            <span style={{ fontSize: "0.8rem", fontWeight: 700, color: "#64748b" }}>
              {currentOrg?.type === "college" ? "Semester:" : "Class / Batch:"}
            </span>
            {classes.length === 0 ? (
              <button
                onClick={handleOpenClassModal}
                style={{ background: "#f1f5f9", border: "1px dashed #cbd5e1", padding: "0.35rem 0.75rem", borderRadius: "6px", fontSize: "0.8rem", cursor: "pointer", color: "#334155" }}
              >
                + Set Up First {currentOrg?.type === "college" ? "Semester" : "Class"}
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
                <option value="">All {currentOrg?.type === "college" ? "Semesters" : "Classes"} in {currentOrg?.code || "Org"}</option>
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            )}
          </div>

          {currentClass?.start_date && (
            <div style={{ display: "flex", alignItems: "center", gap: "0.35rem", fontSize: "0.78rem", color: "#0369a1", background: "#f0f9ff", padding: "0.25rem 0.6rem", borderRadius: "6px", fontWeight: 600 }}>
              <Calendar size={13} />
              <span>
                {currentOrg?.type === "college" ? "Semester Window" : currentOrg?.type === "school" ? "Academic Session" : "Batch Schedule"}: {currentClass.start_date} to {currentClass.end_date || "Upcoming"}
              </span>
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
              onClick={handleOpenSubjModal}
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
              <div
                onClick={() => onNavigate("subject-detail", { subjectId: s.id })}
                style={{ cursor: "pointer" }}
              >
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
                  onClick={() => onNavigate("subject-detail", { subjectId: s.id })}
                  className="btn btn-primary"
                  style={{ flex: 1, fontSize: "0.82rem", padding: "0.45rem", display: "flex", alignItems: "center", justifyContent: "center", gap: "0.35rem" }}
                >
                  <BookOpen size={14} />
                  Subject Details
                </button>
                <button
                  onClick={() => onNavigate("exams", { subjectId: s.id })}
                  className="btn btn-secondary"
                  style={{ flex: 1, fontSize: "0.82rem", padding: "0.45rem", display: "flex", alignItems: "center", justifyContent: "center", gap: "0.35rem" }}
                >
                  <FileSpreadsheet size={14} />
                  Exams
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* MODAL 1: Create Organization (College vs School vs JEE) - 16:9 Widescreen */}
      {showOrgModal && (
        <div className="modal-overlay-16-9" onClick={() => setShowOrgModal(false)}>
          <div className="modal-content-16-9" onClick={(e) => e.stopPropagation()} style={{ maxWidth: "1050px" }}>
            <div style={{ display: "grid", gridTemplateColumns: "320px 1fr", height: "100%", minHeight: "540px" }}>
              {/* Left Brand Panel */}
              <div style={{ background: "#1e1b4b", color: "#ffffff", padding: "2.5rem 2rem", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
                <div>
                  <div style={{ width: "48px", height: "48px", borderRadius: "12px", background: "rgba(255, 255, 255, 0.15)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "1.25rem" }}>
                    <Building2 size={24} />
                  </div>
                  <h3 style={{ fontSize: "1.4rem", fontWeight: 900, letterSpacing: "-0.02em", marginBottom: "0.5rem" }}>
                    Academic Organization
                  </h3>
                  <p style={{ fontSize: "0.88rem", color: "#cbd5e1", lineHeight: 1.6 }}>
                    Configure whether this institution functions as a <strong>College</strong> (Credits & CGPA), <strong>School</strong> (CBSE / Terms), or <strong>Competitive Coaching</strong> (JEE / Negative Marking).
                  </p>
                </div>

                <div style={{ background: "rgba(255, 255, 255, 0.08)", padding: "1rem", borderRadius: "10px", fontSize: "0.8rem", color: "#94a3b8" }}>
                  🏛️ System adapts question paper rubrics and grading models to your institution's configuration.
                </div>
              </div>

              {/* Right Form Panel */}
              <div style={{ padding: "2.5rem", display: "flex", flexDirection: "column", justifyContent: "space-between", overflowY: "auto" }}>
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem" }}>
                    <h4 style={{ fontSize: "1.15rem", fontWeight: 800, color: "#0f172a", margin: 0 }}>
                      Organization Hierarchy & Settings
                    </h4>
                    <button onClick={() => setShowOrgModal(false)} style={{ background: "none", border: "none", color: "#94a3b8", cursor: "pointer" }}>
                      <X size={20} />
                    </button>
                  </div>

                  <form onSubmit={handleCreateOrg} id="add-org-form">
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

                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "1rem" }}>
                      <div>
                        <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 700, marginBottom: "0.3rem" }}>
                          Organization Name *
                        </label>
                        <input
                          type="text"
                          required
                          placeholder="e.g. Indian Institute of Technology"
                          value={orgName}
                          onChange={(e) => setOrgName(e.target.value)}
                          style={{ width: "100%", padding: "0.55rem 0.75rem", borderRadius: "8px", border: "1px solid #cbd5e1", fontSize: "0.88rem" }}
                        />
                      </div>

                      <div>
                        <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 700, marginBottom: "0.3rem" }}>
                          Code / Acronym
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. IIT-D / ACE"
                          value={orgCode}
                          onChange={(e) => setOrgCode(e.target.value)}
                          style={{ width: "100%", padding: "0.55rem 0.75rem", borderRadius: "8px", border: "1px solid #cbd5e1", fontSize: "0.88rem" }}
                        />
                      </div>
                    </div>

                    {orgType === "college" ? (
                      <div style={{ background: "#f8fafc", padding: "1rem", borderRadius: "10px", border: "1px solid #e2e8f0" }}>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
                          <div>
                            <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 600, color: "#475569", marginBottom: "0.2rem" }}>Degree Program</label>
                            <input
                              type="text"
                              value={degreeProgram}
                              onChange={(e) => setDegreeProgram(e.target.value)}
                              style={{ width: "100%", padding: "0.45rem 0.6rem", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "0.82rem" }}
                            />
                          </div>
                          <div>
                            <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 600, color: "#475569", marginBottom: "0.2rem" }}>Department</label>
                            <input
                              type="text"
                              value={departmentName}
                              onChange={(e) => setDepartmentName(e.target.value)}
                              style={{ width: "100%", padding: "0.45rem 0.6rem", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "0.82rem" }}
                            />
                          </div>
                        </div>
                      </div>
                    ) : orgType === "school" ? (
                      <div style={{ background: "#f8fafc", padding: "1rem", borderRadius: "10px", border: "1px solid #e2e8f0" }}>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
                          <div>
                            <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 600, color: "#475569", marginBottom: "0.2rem" }}>Affiliation Board</label>
                            <select
                              value={schoolBoard}
                              onChange={(e) => setSchoolBoard(e.target.value)}
                              style={{ width: "100%", padding: "0.45rem 0.6rem", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "0.82rem", background: "#ffffff" }}
                            >
                              <option value="CBSE">CBSE Board</option>
                              <option value="ICSE">ICSE Board</option>
                              <option value="State Board">State Board</option>
                            </select>
                          </div>
                          <div>
                            <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 600, color: "#475569", marginBottom: "0.2rem" }}>Grade Classes</label>
                            <input
                              type="text"
                              value={gradeRange}
                              onChange={(e) => setGradeRange(e.target.value)}
                              style={{ width: "100%", padding: "0.45rem 0.6rem", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "0.82rem" }}
                            />
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div style={{ background: "#f8fafc", padding: "1rem", borderRadius: "10px", border: "1px solid #e2e8f0" }}>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
                          <div>
                            <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 600, color: "#475569", marginBottom: "0.2rem" }}>Target Exam</label>
                            <input
                              type="text"
                              value={jeeTarget}
                              onChange={(e) => setJeeTarget(e.target.value)}
                              style={{ width: "100%", padding: "0.45rem 0.6rem", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "0.82rem" }}
                            />
                          </div>
                          <div>
                            <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 600, color: "#475569", marginBottom: "0.2rem" }}>Marking Pattern</label>
                            <input
                              type="text"
                              value={markingPattern}
                              onChange={(e) => setMarkingPattern(e.target.value)}
                              style={{ width: "100%", padding: "0.45rem 0.6rem", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "0.82rem" }}
                            />
                          </div>
                        </div>
                      </div>
                    )}
                  </form>
                </div>

                <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.75rem", borderTop: "1px solid #e2e8f0", paddingTop: "1.25rem" }}>
                  <button type="button" onClick={() => setShowOrgModal(false)} className="btn btn-secondary">
                    Cancel
                  </button>
                  <button type="submit" form="add-org-form" className="btn btn-primary">
                    Save Organization
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: Create Class / Semester Cohort - 16:9 Widescreen */}
      {showClassModal && (() => {
        const isCollege = currentOrg?.type === "college";
        const isSchool = currentOrg?.type === "school";
        const presets = isCollege
          ? COLLEGE_CLASS_PRESETS
          : isSchool
          ? SCHOOL_CLASS_PRESETS
          : JEE_CLASS_PRESETS;
        const brandBg = isCollege ? "#1e1b4b" : isSchool ? "#0f766e" : "#7c2d12";

        return (
          <div className="modal-overlay-16-9" onClick={() => setShowClassModal(false)}>
            <div className="modal-content-16-9" onClick={(e) => e.stopPropagation()} style={{ maxWidth: "1050px" }}>
              <div style={{ display: "grid", gridTemplateColumns: "320px 1fr", height: "100%", minHeight: "530px" }}>
                {/* Left Brand Panel */}
                <div style={{ background: brandBg, color: "#ffffff", padding: "2.5rem 2rem", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
                  <div>
                    <div style={{ width: "48px", height: "48px", borderRadius: "12px", background: "rgba(255, 255, 255, 0.15)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "1.25rem" }}>
                      {isCollege ? <GraduationCap size={24} /> : isSchool ? <School size={24} /> : <Target size={24} />}
                    </div>
                    <div style={{ fontSize: "0.72rem", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.08em", color: "rgba(255, 255, 255, 0.7)", marginBottom: "0.35rem" }}>
                      {isCollege ? "Higher Education" : isSchool ? "K-12 Schooling" : "Competitive Training"}
                    </div>
                    <h3 style={{ fontSize: "1.35rem", fontWeight: 900, letterSpacing: "-0.02em", marginBottom: "0.5rem" }}>
                      {isCollege ? "Add College Semester" : isSchool ? "Add School Class" : "Add JEE Class / Batch"}
                    </h3>
                    <p style={{ fontSize: "0.86rem", color: "#e2e8f0", lineHeight: 1.6 }}>
                      {isCollege
                        ? `Configure a semester cohort under ${currentOrg?.name || "College"} with a 6-month academic window (Semesters 1 through 8).`
                        : isSchool
                        ? `Configure a grade / class cohort under ${currentOrg?.name || "School"} with an annual school session schedule.`
                        : `Configure a target examination batch under ${currentOrg?.name || "Institute"} with negative marking rubrics.`}
                    </p>
                  </div>

                  <div style={{ background: "rgba(255, 255, 255, 0.10)", padding: "1rem", borderRadius: "10px", fontSize: "0.8rem", color: "#f1f5f9", lineHeight: 1.5 }}>
                    {isCollege
                      ? "🎓 Semesters group course credits, university examinations, and semester CGPA."
                      : isSchool
                      ? "🏫 Classes group students, board subjects (CBSE / ICSE), and term report cards."
                      : "⚡ JEE classes track MCQ OMR accuracy, test series rankings, and negative marking (-1)."}
                  </div>
                </div>

                {/* Right Form Panel */}
                <div style={{ padding: "2.25rem 2.5rem", display: "flex", flexDirection: "column", justifyContent: "space-between", overflowY: "auto" }}>
                  <div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem" }}>
                      <div>
                        <h4 style={{ fontSize: "1.15rem", fontWeight: 800, color: "#0f172a", margin: 0 }}>
                          {isCollege ? "Semester Details & 6-Month Schedule" : isSchool ? "Class Details & Academic Session" : "Class Details & JEE Target Batch"}
                        </h4>
                        <div style={{ fontSize: "0.78rem", color: "#64748b", marginTop: "0.2rem" }}>
                          Belongs to organization: <strong>{currentOrg?.name}</strong> ({currentOrg?.type.toUpperCase()})
                        </div>
                      </div>
                      <button onClick={() => setShowClassModal(false)} style={{ background: "none", border: "none", color: "#94a3b8", cursor: "pointer" }}>
                        <X size={20} />
                      </button>
                    </div>

                    {/* Quick Selection Pills */}
                    <div style={{ marginBottom: "1.25rem", background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "10px", padding: "0.75rem 0.9rem" }}>
                      <div style={{ fontSize: "0.74rem", fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: "0.45rem" }}>
                        Quick Presets ({isCollege ? "Semesters" : "Classes"}):
                      </div>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem" }}>
                        {presets.map((p, idx) => {
                          const isSel = className === p.name;
                          return (
                            <button
                              key={idx}
                              type="button"
                              onClick={() => {
                                setClassName(p.name);
                                setClassCode(p.code);
                                setClassDept(p.dept);
                              }}
                              style={{
                                padding: "0.25rem 0.65rem",
                                borderRadius: "6px",
                                border: isSel ? "1.5px solid #2563eb" : "1px solid #cbd5e1",
                                background: isSel ? "#eff6ff" : "#ffffff",
                                color: isSel ? "#1d4ed8" : "#334155",
                                fontSize: "0.78rem",
                                fontWeight: isSel ? 800 : 600,
                                cursor: "pointer"
                              }}
                            >
                              {p.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <form onSubmit={handleCreateClass} id="add-class-form">
                      <div style={{ marginBottom: "1rem" }}>
                        <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 700, marginBottom: "0.3rem", color: "#1e293b" }}>
                          {isCollege ? "Semester Name *" : isSchool ? "Class / Grade Name *" : "Class / Target Batch Name *"}
                        </label>
                        <input
                          type="text"
                          required
                          placeholder={isCollege ? "e.g. Semester 6 - Computer Science" : isSchool ? "e.g. Class 10 - Section A" : "e.g. Class 11 - JEE Advanced (Target 2027)"}
                          value={className}
                          onChange={(e) => setClassName(e.target.value)}
                          style={{ width: "100%", padding: "0.55rem 0.75rem", borderRadius: "8px", border: "1px solid #cbd5e1", fontSize: "0.88rem" }}
                        />
                      </div>

                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem", marginBottom: "1rem" }}>
                        <div>
                          <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 700, marginBottom: "0.3rem", color: "#1e293b" }}>
                            {isCollege ? "Semester Code" : isSchool ? "Class Code / Section" : "Batch Code"}
                          </label>
                          <input
                            type="text"
                            placeholder={isCollege ? "e.g. CSE-SEM6" : isSchool ? "e.g. CLS-10A" : "e.g. JEE-11-ADV"}
                            value={classCode}
                            onChange={(e) => setClassCode(e.target.value)}
                            style={{ width: "100%", padding: "0.55rem 0.75rem", borderRadius: "8px", border: "1px solid #cbd5e1", fontSize: "0.88rem" }}
                          />
                        </div>
                        <div>
                          <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 700, marginBottom: "0.3rem", color: "#1e293b" }}>
                            Academic Year
                          </label>
                          <input
                            type="text"
                            value={classYear}
                            onChange={(e) => setClassYear(e.target.value)}
                            style={{ width: "100%", padding: "0.55rem 0.75rem", borderRadius: "8px", border: "1px solid #cbd5e1", fontSize: "0.88rem" }}
                          />
                        </div>
                      </div>

                      <div style={{ marginBottom: "1rem" }}>
                        <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 700, marginBottom: "0.3rem", color: "#1e293b" }}>
                          {isCollege ? "Degree / Department" : isSchool ? "Stream / Board" : "Target Stream / Exam Track"}
                        </label>
                        <input
                          type="text"
                          placeholder={isCollege ? "e.g. Computer Science & Engineering (B.Tech)" : isSchool ? "e.g. Science (CBSE)" : "e.g. JEE Main + Advanced (PCM)"}
                          value={classDept}
                          onChange={(e) => setClassDept(e.target.value)}
                          style={{ width: "100%", padding: "0.55rem 0.75rem", borderRadius: "8px", border: "1px solid #cbd5e1", fontSize: "0.88rem" }}
                        />
                      </div>

                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem", marginBottom: "1.25rem" }}>
                        <div>
                          <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 700, marginBottom: "0.3rem", color: "#1e293b" }}>
                            {isCollege ? "Semester Start Date" : isSchool ? "Academic Session Start Date" : "Batch Start Date"}
                          </label>
                          <input
                            type="date"
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                            style={{ width: "100%", padding: "0.55rem 0.75rem", borderRadius: "8px", border: "1px solid #cbd5e1", fontSize: "0.88rem" }}
                          />
                        </div>
                        <div>
                          <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 700, marginBottom: "0.3rem", color: "#1e293b" }}>
                            {isCollege ? "Semester End Date (6 Months)" : isSchool ? "Session End Date (Academic Year)" : "Target Exam Date"}
                          </label>
                          <input
                            type="date"
                            value={endDate}
                            onChange={(e) => setEndDate(e.target.value)}
                            style={{ width: "100%", padding: "0.55rem 0.75rem", borderRadius: "8px", border: "1px solid #cbd5e1", fontSize: "0.88rem" }}
                          />
                        </div>
                      </div>
                    </form>
                  </div>

                  <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.75rem", borderTop: "1px solid #e2e8f0", paddingTop: "1.25rem" }}>
                    <button type="button" onClick={() => setShowClassModal(false)} className="btn btn-secondary">
                      Cancel
                    </button>
                    <button type="submit" form="add-class-form" className="btn btn-primary">
                      {isCollege ? "Save Semester" : "Save Class"}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* MODAL 3: Create Subject - 16:9 Widescreen */}
      {showSubjModal && (() => {
        const isCollege = currentOrg?.type === "college";
        const isSchool = currentOrg?.type === "school";
        const isCompetitive = currentOrg?.type === "competitive";
        const presets = isCollege
          ? COLLEGE_SUBJ_PRESETS
          : isSchool
          ? SCHOOL_SUBJ_PRESETS
          : JEE_SUBJ_PRESETS;
        const brandBg = isCollege ? "#1e1b4b" : isSchool ? "#0f766e" : "#7c2d12";

        return (
          <div className="modal-overlay-16-9" onClick={() => setShowSubjModal(false)}>
            <div className="modal-content-16-9" onClick={(e) => e.stopPropagation()} style={{ maxWidth: "1050px" }}>
              <div style={{ display: "grid", gridTemplateColumns: "320px 1fr", height: "100%", minHeight: "560px" }}>
                {/* Left Brand Panel */}
                <div style={{ background: brandBg, color: "#ffffff", padding: "2.5rem 2rem", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
                  <div>
                    <div style={{ width: "48px", height: "48px", borderRadius: "12px", background: "rgba(255, 255, 255, 0.15)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "1.25rem" }}>
                      {isCollege ? <GraduationCap size={24} /> : isSchool ? <School size={24} /> : <Target size={24} />}
                    </div>
                    <div style={{ fontSize: "0.72rem", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.08em", color: "rgba(255, 255, 255, 0.7)", marginBottom: "0.35rem" }}>
                      {isCollege ? "College Curriculum" : isSchool ? "K-12 School Syllabus" : "Competitive Test Series"}
                    </div>
                    <h3 style={{ fontSize: "1.35rem", fontWeight: 900, letterSpacing: "-0.02em", marginBottom: "0.5rem" }}>
                      {isCollege ? "Add Course Subject" : isSchool ? "Add School Subject" : "Add JEE Subject"}
                    </h3>
                    <p style={{ fontSize: "0.86rem", color: "#e2e8f0", lineHeight: 1.6 }}>
                      {isCollege
                        ? `Configure credit-based course curriculum, lecture-tutorial-practical (LTP) distribution, and CGPA evaluation for ${currentOrg?.name || "College"}.`
                        : isSchool
                        ? `Configure board-aligned syllabus, Theory vs Practical split (80/20), and term exams for ${currentOrg?.name || "School"}.`
                        : `Configure competitive test subject, question tracks, and negative marking rules (+4 / -1) for ${currentOrg?.name || "Institute"}.`}
                    </p>
                  </div>

                  <div style={{ background: "rgba(255, 255, 255, 0.10)", padding: "1rem", borderRadius: "10px", fontSize: "0.8rem", color: "#f1f5f9", lineHeight: 1.5 }}>
                    {isCollege
                      ? "🎓 University subjects link directly to course credit requirements and semester exam grading."
                      : isSchool
                      ? "🏫 School subjects adapt grading to CBSE/ICSE scales with internal assessment support."
                      : "⚡ JEE subjects track MCQ OMR bubble accuracy, rankings, and -1 penalty deductions."}
                  </div>
                </div>

                {/* Right Form Panel */}
                <div style={{ padding: "2.25rem 2.5rem", display: "flex", flexDirection: "column", justifyContent: "space-between", overflowY: "auto" }}>
                  <div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem" }}>
                      <div>
                        <h4 style={{ fontSize: "1.15rem", fontWeight: 800, color: "#0f172a", margin: 0 }}>
                          {isCollege ? "Course Curriculum & Credit Settings" : isSchool ? "Board Curriculum & Evaluation Split" : "Competitive Track & Marking Scheme"}
                        </h4>
                        <div style={{ fontSize: "0.78rem", color: "#64748b", marginTop: "0.2rem" }}>
                          Belongs to organization: <strong>{currentOrg?.name}</strong> ({currentOrg?.type.toUpperCase()})
                        </div>
                      </div>
                      <button onClick={() => setShowSubjModal(false)} style={{ background: "none", border: "none", color: "#94a3b8", cursor: "pointer" }}>
                        <X size={20} />
                      </button>
                    </div>

                    {/* Quick Selection Pills */}
                    <div style={{ marginBottom: "1.25rem", background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "10px", padding: "0.75rem 0.9rem" }}>
                      <div style={{ fontSize: "0.74rem", fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: "0.45rem" }}>
                        Quick Presets ({isCollege ? "College Subjects" : isSchool ? "School Subjects" : "JEE Subjects"}):
                      </div>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem" }}>
                        {presets.map((p: any, idx: number) => {
                          const isSel = subjName === p.name;
                          return (
                            <button
                              key={idx}
                              type="button"
                              onClick={() => {
                                setSubjName(p.name);
                                setSubjCode(p.code);
                                if (isCollege) {
                                  setSubjCredits(p.credits || 4);
                                  setSubjLtpHours(p.ltp || "3-1-0");
                                  setSubjSem(p.sem || "Sem 6");
                                  setSubjBoardOrProgram(p.prog || "B.Tech Computer Science");
                                  setSubjGradingSystem(p.grading || "10-Point CGPA Scale (O, A+, A, B+, B, C, P, F)");
                                } else if (isSchool) {
                                  setSubjGrade(p.grade || "Class 10 - Term 1");
                                  setSubjBoardOrProgram(p.board || "CBSE Board");
                                  setSubjSplit(p.split || "80% Theory + 20% Internal Assessment");
                                  setSubjGradingSystem(p.grading || "CBSE 9-Point Scale (A1 to E)");
                                } else {
                                  setSubjJeeTarget(p.target || "Physics - Mechanics");
                                  setSubjBoardOrProgram(p.exam || "JEE Main & Advanced");
                                  setSubjGradingSystem(p.pattern || "+4 / -1 Negative Marking");
                                }
                              }}
                              style={{
                                padding: "0.25rem 0.65rem",
                                borderRadius: "6px",
                                border: isSel ? "1.5px solid #2563eb" : "1px solid #cbd5e1",
                                background: isSel ? "#eff6ff" : "#ffffff",
                                color: isSel ? "#1d4ed8" : "#334155",
                                fontSize: "0.78rem",
                                fontWeight: isSel ? 800 : 600,
                                cursor: "pointer"
                              }}
                            >
                              {p.code ? `${p.code} - ${p.name.split(" ")[0]}` : p.name}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <form onSubmit={handleCreateSubject} id="add-subj-form">
                      {/* Linked Cohort */}
                      <div style={{ marginBottom: "1rem" }}>
                        <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 700, marginBottom: "0.3rem", color: "#1e293b" }}>
                          {isCollege ? "Target Semester *" : isSchool ? "Class / Grade Level *" : "Class / Target Batch *"}
                        </label>
                        <select
                          value={selectedClassId}
                          onChange={(e) => setSelectedClassId(e.target.value)}
                          style={{ width: "100%", padding: "0.55rem 0.75rem", borderRadius: "8px", border: "1px solid #cbd5e1", fontSize: "0.88rem", background: "#ffffff", fontWeight: 600 }}
                        >
                          {classes.length === 0 ? (
                            <option value="">No cohorts created yet — will be general</option>
                          ) : (
                            classes.map((c) => (
                              <option key={c.id} value={c.id}>
                                {c.name} ({c.code || "SEC"})
                              </option>
                            ))
                          )}
                        </select>
                      </div>

                      {/* Subject Name and Code */}
                      <div style={{ display: "grid", gridTemplateColumns: "1.2fr 0.8fr", gap: "1rem", marginBottom: "1rem" }}>
                        <div>
                          <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 700, marginBottom: "0.3rem", color: "#1e293b" }}>
                            Subject Name *
                          </label>
                          <input
                            type="text"
                            required
                            placeholder={isCollege ? "e.g. Natural Language Processing" : isSchool ? "e.g. Mathematics" : "e.g. Physics - Mechanics"}
                            value={subjName}
                            onChange={(e) => setSubjName(e.target.value)}
                            style={{ width: "100%", padding: "0.55rem 0.75rem", borderRadius: "8px", border: "1px solid #cbd5e1", fontSize: "0.88rem" }}
                          />
                        </div>
                        <div>
                          <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 700, marginBottom: "0.3rem", color: "#1e293b" }}>
                            Subject Code *
                          </label>
                          <input
                            type="text"
                            required
                            placeholder={isCollege ? "e.g. NLP-701" : isSchool ? "e.g. MATH-10" : "e.g. JEE-PHY-01"}
                            value={subjCode}
                            onChange={(e) => setSubjCode(e.target.value)}
                            style={{ width: "100%", padding: "0.55rem 0.75rem", borderRadius: "8px", border: "1px solid #cbd5e1", fontSize: "0.88rem", textTransform: "uppercase" }}
                          />
                        </div>
                      </div>

                      {/* Dynamic Structure by Org Type */}
                      {isCollege && (
                        <div style={{ background: "#f8fafc", padding: "1rem", borderRadius: "10px", border: "1px solid #e2e8f0", marginBottom: "1rem" }}>
                          <div style={{ fontSize: "0.78rem", fontWeight: 800, color: "#1e1b4b", marginBottom: "0.75rem", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                            College Degree & Credits Structure
                          </div>
                          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem", marginBottom: "0.75rem" }}>
                            <div>
                              <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 700, color: "#475569", marginBottom: "0.3rem" }}>
                                Course Credits (Units)
                              </label>
                              <input
                                type="number"
                                min={0}
                                max={12}
                                value={subjCredits}
                                onChange={(e) => setSubjCredits(Number(e.target.value))}
                                style={{ width: "100%", padding: "0.5rem 0.75rem", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "0.85rem", background: "#ffffff" }}
                              />
                            </div>
                            <div>
                              <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 700, color: "#475569", marginBottom: "0.3rem" }}>
                                LTP Hours (Lecture-Tutorial-Practical)
                              </label>
                              <select
                                value={subjLtpHours}
                                onChange={(e) => setSubjLtpHours(e.target.value)}
                                style={{ width: "100%", padding: "0.5rem 0.75rem", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "0.85rem", background: "#ffffff" }}
                              >
                                <option value="3-1-0">3-1-0 (3 Lectures, 1 Tutorial, 0 Labs)</option>
                                <option value="3-0-2">3-0-2 (3 Lectures, 0 Tutorials, 2 Labs)</option>
                                <option value="4-0-0">4-0-0 (4 Pure Lecture Hours)</option>
                                <option value="2-0-2">2-0-2 (2 Lectures, 2 Labs)</option>
                                <option value="0-0-4">0-0-4 (Pure Lab / Practical)</option>
                              </select>
                            </div>
                          </div>
                          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
                            <div>
                              <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 700, color: "#475569", marginBottom: "0.3rem" }}>
                                Semester Designation
                              </label>
                              <select
                                value={subjSem}
                                onChange={(e) => setSubjSem(e.target.value)}
                                style={{ width: "100%", padding: "0.5rem 0.75rem", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "0.85rem", background: "#ffffff" }}
                              >
                                {["Sem 1", "Sem 2", "Sem 3", "Sem 4", "Sem 5", "Sem 6", "Sem 7", "Sem 8"].map((s) => (
                                  <option key={s} value={s}>{s}</option>
                                ))}
                              </select>
                            </div>
                            <div>
                              <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 700, color: "#475569", marginBottom: "0.3rem" }}>
                                Degree Program
                              </label>
                              <input
                                type="text"
                                value={subjBoardOrProgram}
                                onChange={(e) => setSubjBoardOrProgram(e.target.value)}
                                placeholder="e.g. B.Tech Computer Science"
                                style={{ width: "100%", padding: "0.5rem 0.75rem", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "0.85rem", background: "#ffffff" }}
                              />
                            </div>
                          </div>
                        </div>
                      )}

                      {isSchool && (
                        <div style={{ background: "#f8fafc", padding: "1rem", borderRadius: "10px", border: "1px solid #e2e8f0", marginBottom: "1rem" }}>
                          <div style={{ fontSize: "0.78rem", fontWeight: 800, color: "#0f766e", marginBottom: "0.75rem", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                            School Board Curriculum & Evaluation Split
                          </div>
                          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem", marginBottom: "0.75rem" }}>
                            <div>
                              <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 700, color: "#475569", marginBottom: "0.3rem" }}>
                                Education Board
                              </label>
                              <select
                                value={subjBoardOrProgram}
                                onChange={(e) => setSubjBoardOrProgram(e.target.value)}
                                style={{ width: "100%", padding: "0.5rem 0.75rem", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "0.85rem", background: "#ffffff" }}
                              >
                                <option value="CBSE Board">CBSE Board</option>
                                <option value="ICSE / ISC">ICSE / ISC</option>
                                <option value="Cambridge IGCSE">Cambridge IGCSE</option>
                                <option value="State Board">State Board</option>
                              </select>
                            </div>
                            <div>
                              <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 700, color: "#475569", marginBottom: "0.3rem" }}>
                                Theory vs Practical Split
                              </label>
                              <select
                                value={subjSplit}
                                onChange={(e) => setSubjSplit(e.target.value)}
                                style={{ width: "100%", padding: "0.5rem 0.75rem", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "0.85rem", background: "#ffffff" }}
                              >
                                <option value="80% Theory + 20% Internal Assessment">80% Theory + 20% Internal Assessment</option>
                                <option value="70% Theory + 30% Practical Assessment">70% Theory + 30% Practical Assessment</option>
                                <option value="100% Theory">100% Theory Examination</option>
                              </select>
                            </div>
                          </div>
                          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
                            <div>
                              <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 700, color: "#475569", marginBottom: "0.3rem" }}>
                                Grading System
                              </label>
                              <select
                                value={subjGradingSystem}
                                onChange={(e) => setSubjGradingSystem(e.target.value)}
                                style={{ width: "100%", padding: "0.5rem 0.75rem", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "0.85rem", background: "#ffffff" }}
                              >
                                <option value="CBSE 9-Point Scale (A1 to E)">CBSE 9-Point Scale (A1 to E)</option>
                                <option value="ICSE Percentage Scale (1-100)">ICSE Percentage Scale (1-100)</option>
                                <option value="State Board Marks Scale">State Board Marks Scale</option>
                              </select>
                            </div>
                            <div>
                              <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 700, color: "#475569", marginBottom: "0.3rem" }}>
                                Grade & Term
                              </label>
                              <input
                                type="text"
                                value={subjGrade}
                                onChange={(e) => setSubjGrade(e.target.value)}
                                placeholder="e.g. Class 10 - Term 1"
                                style={{ width: "100%", padding: "0.5rem 0.75rem", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "0.85rem", background: "#ffffff" }}
                              />
                            </div>
                          </div>
                        </div>
                      )}

                      {isCompetitive && (
                        <div style={{ background: "#f8fafc", padding: "1rem", borderRadius: "10px", border: "1px solid #e2e8f0", marginBottom: "1rem" }}>
                          <div style={{ fontSize: "0.78rem", fontWeight: 800, color: "#7c2d12", marginBottom: "0.75rem", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                            JEE & Competitive Test Series Framework
                          </div>
                          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem", marginBottom: "0.75rem" }}>
                            <div>
                              <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 700, color: "#475569", marginBottom: "0.3rem" }}>
                                Target Examination
                              </label>
                              <select
                                value={subjBoardOrProgram}
                                onChange={(e) => setSubjBoardOrProgram(e.target.value)}
                                style={{ width: "100%", padding: "0.5rem 0.75rem", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "0.85rem", background: "#ffffff" }}
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
                                style={{ width: "100%", padding: "0.5rem 0.75rem", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "0.85rem", background: "#ffffff" }}
                              >
                                <option value="+4 / -1 Negative Marking">+4 / -1 Negative Marking (Standard JEE/NEET)</option>
                                <option value="+4 / -2 Multi-Correct Advanced">+4 / -2 Multi-Correct Partial (JEE Adv)</option>
                                <option value="+3 / -1 Single Choice">+3 / -1 Single Choice</option>
                              </select>
                            </div>
                          </div>
                          <div>
                            <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 700, color: "#475569", marginBottom: "0.3rem" }}>
                              Subject Section / Track
                            </label>
                            <input
                              type="text"
                              value={subjJeeTarget}
                              onChange={(e) => setSubjJeeTarget(e.target.value)}
                              placeholder="e.g. Physics - Mechanics or Chemistry - Organic"
                              style={{ width: "100%", padding: "0.5rem 0.75rem", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "0.85rem", background: "#ffffff" }}
                            />
                          </div>
                        </div>
                      )}
                    </form>
                  </div>

                  <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.75rem", borderTop: "1px solid #e2e8f0", paddingTop: "1.25rem" }}>
                    <button type="button" onClick={() => setShowSubjModal(false)} className="btn btn-secondary">
                      Cancel
                    </button>
                    <button type="submit" form="add-subj-form" className="btn btn-primary">
                      {isCollege ? "Save Course Subject" : isSchool ? "Save School Subject" : "Save JEE Subject"}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

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
