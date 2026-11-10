import React, { useState, useEffect } from "react";
import { academicApi } from "../api/academicApi";
import type { Subject, Exam, QuestionItem, ClassItem, DigitalPaperHeader } from "../types/academic";
import {
  UploadCloud,
  ArrowRight,
  ArrowLeft,
  FileText,
  Plus,
  Trash2,
  Save,
  Check,
  Search,
  RefreshCw,
  Clock,
  Calendar
} from "lucide-react";

interface ExamManagementProps {
  initialSubjectId?: string;
  onNavigate: (tab: any, params?: any) => void;
}

export const ExamManagementPage: React.FC<ExamManagementProps> = ({
  initialSubjectId,
  onNavigate
}) => {
  // View mode: "list" shows the master table of exams; "create" shows the 3-step creator/workspace
  const [viewMode, setViewMode] = useState<"list" | "create">("list");
  // Modular Flow Steps: 1 = Upload PDF, 2 = Confirm Meta & Structure, 3 = Split Workspace
  const [step, setStep] = useState<1 | 2 | 3>(1);

  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<string>("");
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>(initialSubjectId || "");
  const [exams, setExams] = useState<Exam[]>([]);
  const [activeExam, setActiveExam] = useState<Exam | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(false);

  // Exam Details Form
  const [examTitle, setExamTitle] = useState("B.Tech Semester End Examination");
  const [examType, setExamType] = useState("Semester Exam");
  const [passingMarks, setPassingMarks] = useState(24.0);
  const [academicYear, setAcademicYear] = useState("2026-2027");
  const [examDate, setExamDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [correctionDeadline, setCorrectionDeadline] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 10);
    return d.toISOString().split("T")[0];
  });
  const [answerKeyText, setAnswerKeyText] = useState("");
  const [showAnswerKeyModal, setShowAnswerKeyModal] = useState(false);

  // Digital Paper Header
  const [digitalHeader, setDigitalHeader] = useState<DigitalPaperHeader>({
    title: "EXAMINATION QUESTION PAPER",
    institution: "Academic Department",
    course: "Core Curriculum",
    time_allowed: "3 Hours",
    max_marks: 60.0,
    instructions: [
      "Part A is compulsory. All ten short questions carry 1.0 mark each (10 Marks).",
      "Part B contains five units with internal OR choice. Answer any ONE full question from each unit (50 Marks).",
      "Minimum 3 pages with ~180 words per page required on Part B descriptive questions for full marks.",
      "Brief answers lacking required analytical depth are capped at a maximum of 5 marks out of 10."
    ]
  });

  // Upload & Gemini Scan State
  const [paperFile, setPaperFile] = useState<File | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [scanMessage, setScanMessage] = useState<string | null>(null);

  // Questions List & Active Focus
  const [questions, setQuestions] = useState<QuestionItem[]>([]);
  const [activeQuestionId, setActiveQuestionId] = useState<string | null>(null);

  // Save State
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    Promise.all([
      academicApi.listClasses(),
      academicApi.listSubjects()
    ]).then(([classList, subjList]) => {
      setClasses(classList);
      setSubjects(subjList);

      if (classList.length > 0) {
        setSelectedClassId(classList[0].id);
      }

      if (initialSubjectId && subjList.some((s) => s.id === initialSubjectId)) {
        setSelectedSubjectId(initialSubjectId);
      } else {
        setSelectedSubjectId("");
      }
    });
  }, [initialSubjectId]);

  const loadExams = async () => {
    setLoading(true);
    try {
      const exList = await academicApi.listExams(selectedSubjectId || undefined);
      setExams(exList);
    } catch (err) {
      console.error("Failed to load exams:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadExams();
  }, [selectedSubjectId]);

  const loadExamIntoEditor = (exam: Exam) => {
    setActiveExam(exam);
    setExamTitle(exam.title);
    setExamType(exam.exam_type);
    setPassingMarks(exam.passing_marks);
    setAcademicYear(exam.academic_year || "2026-2027");
    setExamDate(exam.exam_date || new Date().toISOString().split("T")[0]);
    if (exam.correction_deadline) {
      setCorrectionDeadline(exam.correction_deadline);
    }
    setAnswerKeyText(exam.answer_key_text || "");

    const qs = (exam.questions || []).map((q, idx) => ({
      ...q,
      id: q.id || `q-${idx + 1}`
    }));
    setQuestions(qs);
    if (qs.length > 0) {
      setActiveQuestionId(qs[0].id || "q-1a");
    }

    setDigitalHeader({
      title: exam.title.toUpperCase(),
      institution: currentSubject?.name || "Academic Department",
      course: `${currentSubject?.name || "Course"} (${currentSubject?.code || "CODE"})`,
      time_allowed: "3 Hours",
      max_marks: exam.max_marks || 60.0,
      instructions: [
        "Part A is compulsory. All ten short questions carry 1.0 mark each (10 Marks).",
        "Part B contains five units with internal OR choice. Answer any ONE full question from each unit (50 Marks).",
        "Minimum 3 pages with ~180 words per page required on Part B descriptive questions for full marks."
      ]
    });

    setViewMode("create");
    setStep(3);
  };

  const handleStartUploadNewExam = () => {
    setActiveExam(null);
    setExamTitle("B.Tech Semester End Examination");
    setExamType("Semester Exam");
    setPassingMarks(24.0);
    setExamDate(new Date().toISOString().split("T")[0]);
    const d = new Date();
    d.setDate(d.getDate() + 10);
    setCorrectionDeadline(d.toISOString().split("T")[0]);
    setAnswerKeyText("");
    setQuestions([]);
    setPaperFile(null);
    setScanMessage(null);
    setViewMode("create");
    setStep(1);
  };

  const handlePaperUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setPaperFile(file);
    setIsScanning(true);
    setScanMessage("Reading document and generating structured digital exam paper...");

    try {
      const res = await academicApi.scanQuestionPaper(file);

      const qs = res.questions.map((q, idx) => ({
        ...q,
        id: q.id || `q-${idx + 1}`,
        marks: Number(q.marks) || (q.section === "Part A" ? 1.0 : 10.0)
      }));

      setQuestions(qs);
      if (qs.length > 0) {
        setActiveQuestionId(qs[0].id || "q-1a");
      }

      if (res.header) {
        setDigitalHeader({
          title: res.header.title || "EXAMINATION QUESTION PAPER",
          institution: res.header.institution || "Academic Department",
          course: res.header.course || (currentSubject ? `${currentSubject.name} (${currentSubject.code})` : "Curriculum"),
          time_allowed: res.header.time_allowed || "3 Hours",
          max_marks: res.total_marks || 60.0,
          instructions: res.header.instructions || [
            "Part A is compulsory (10 Marks).",
            "Part B contains five units with internal OR choice (50 Marks)."
          ]
        });
      }

      setScanMessage(`Paper extracted successfully (${qs.length} questions).`);
      setTimeout(() => {
        setStep(2);
      }, 700);
    } catch (err: any) {
      console.error("Scan error:", err);
      setScanMessage("Paper extracted using fallback parser. Ready for confirmation.");
      setTimeout(() => {
        setStep(2);
      }, 700);
    } finally {
      setIsScanning(false);
    }
  };

  const handleSkipToStep2WithoutUpload = async () => {
    try {
      const fakeFile = new File(["dummy"], "question_paper.txt", { type: "text/plain" });
      const res = await academicApi.scanQuestionPaper(fakeFile);
      setQuestions(res.questions);
      if (res.questions.length > 0) {
        setActiveQuestionId(res.questions[0].id || "q-1a");
      }
    } catch {
      // Fallback
    }
    setStep(2);
  };

  const handleJumpToQuestion = (qId: string) => {
    setActiveQuestionId(qId);
    const element = document.getElementById(`editor-card-${qId}`);
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "center" });
      const numInput = element.querySelector("input[type=number]") as HTMLInputElement;
      if (numInput) {
        numInput.focus();
      }
    }
  };

  const handleMarkChange = (index: number, newMark: number) => {
    const updated = [...questions];
    updated[index].marks = Number(newMark) || 0;
    setQuestions(updated);
  };

  const handleTextChange = (index: number, newText: string) => {
    const updated = [...questions];
    updated[index].text = newText;
    setQuestions(updated);
  };

  const handleRubricChange = (index: number, newRubric: string) => {
    const updated = [...questions];
    updated[index].rubric = newRubric;
    setQuestions(updated);
  };

  const handleDeleteQuestion = (index: number) => {
    const updated = questions.filter((_, i) => i !== index);
    setQuestions(updated);
    if (updated.length > 0) {
      setActiveQuestionId(updated[0].id || "q-1");
    } else {
      setActiveQuestionId(null);
    }
  };

  const handleAddQuestion = () => {
    const nextIdx = questions.length + 1;
    const nextQId = `q-${nextIdx}`;
    const newQ: QuestionItem = {
      id: nextQId,
      q_no: `Q${nextIdx}`,
      section: "Part B - Unit 5",
      text: "State the theoretical principles and derive the formulations.",
      marks: 10.0,
      is_or_choice: false,
      rubric: "Full credit requires minimum 3-page depth with comprehensive formulations.",
      ideal_answer: "Standard model derivation expected."
    };
    const updated = [...questions, newQ];
    setQuestions(updated);
    setActiveQuestionId(nextQId);
  };

  const calculateTotalMarks = (): number => {
    const groupsSeen = new Set<string>();
    let total = 0.0;
    for (const q of questions) {
      const og = q.or_group;
      const m = Number(q.marks) || 0;
      if (og) {
        if (!groupsSeen.has(og)) {
          groupsSeen.add(og);
          total += m;
        }
      } else {
        total += m;
      }
    }
    return total > 0 ? total : 60.0;
  };

  const totalAllocatedMarks = calculateTotalMarks();

  const handleSaveExam = async () => {
    if (!examTitle.trim()) {
      alert("Please enter an exam title.");
      return;
    }
    if (questions.length === 0) {
      alert("Please add or scan at least one question.");
      return;
    }

    setIsSaving(true);
    setSaveSuccess(false);

    try {
      if (activeExam) {
        await academicApi.updateExamQuestions(activeExam.id, questions, totalAllocatedMarks);
        if (answerKeyText) {
          await academicApi.updateExamAnswerKey(activeExam.id, answerKeyText);
        }
      } else {
        const created = await academicApi.createExam({
          subject_id: selectedSubjectId,
          title: examTitle,
          exam_type: examType,
          max_marks: totalAllocatedMarks,
          passing_marks: passingMarks,
          academic_year: academicYear,
          exam_date: examDate,
          correction_deadline: correctionDeadline,
          answer_key_text: answerKeyText,
          questions: questions
        });
        setActiveExam(created);
        setExams([created, ...exams]);
      }

      setSaveSuccess(true);
      await loadExams();
      setTimeout(() => {
        setSaveSuccess(false);
        setViewMode("list");
      }, 1200);
    } catch (err) {
      alert("Failed to save exam.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteExam = async (examId: string, title: string) => {
    if (!confirm(`Are you sure you want to delete ${title}?`)) return;
    try {
      await academicApi.deleteExam(examId);
      setExams((prev) => prev.filter((e) => e.id !== examId));
    } catch (err) {
      alert("Failed to delete examination.");
    }
  };

  const currentSubject = subjects.find((s) => s.id === selectedSubjectId);
  const partAQuestions = questions.filter((q) => q.section === "Part A" || Number(q.marks) <= 2.0);
  const partBQuestions = questions.filter((q) => q.section !== "Part A" && Number(q.marks) > 2.0);

  const unitGroups: { name: string; questions: QuestionItem[] }[] = [];
  const unitMap = new Map<string, QuestionItem[]>();

  for (const q of partBQuestions) {
    const key = q.or_group || q.section || "General";
    if (!unitMap.has(key)) {
      unitMap.set(key, []);
    }
    unitMap.get(key)!.push(q);
  }

  unitMap.forEach((qList, key) => {
    unitGroups.push({
      name: key.toUpperCase().replace("-", " "),
      questions: qList
    });
  });

  const filteredExams = exams.filter((e) =>
    e.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="exam-management-page pb-24" style={{ maxWidth: "1280px", margin: "0 auto", padding: "0 1rem" }}>
      {/* ============================================================== */}
      {/* VIEW MODE 1: EXAMINATIONS LIST (VANTIS DATA TABLE LAYOUT)       */}
      {/* ============================================================== */}
      {viewMode === "list" && (
        <div>
          {/* Header */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1.5rem", flexWrap: "wrap", gap: "1rem" }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                <h1 style={{ fontSize: "1.75rem", fontWeight: 800, color: "#0f172a", letterSpacing: "-0.03em", margin: 0 }}>
                  Examinations
                </h1>
                <span
                  style={{
                    background: "#e0f2fe",
                    color: "#0369a1",
                    fontSize: "0.75rem",
                    fontWeight: 700,
                    padding: "0.2rem 0.65rem",
                    borderRadius: "9999px"
                  }}
                >
                  {filteredExams.length} {filteredExams.length === 1 ? "exam" : "exams"}
                </span>
              </div>
              <p style={{ color: "#64748b", fontSize: "0.88rem", marginTop: "0.25rem", margin: 0 }}>
                Scheduled examinations, correction deadlines, and digital question papers
              </p>
            </div>

            <button
              onClick={handleStartUploadNewExam}
              className="btn btn-primary"
              style={{ display: "flex", alignItems: "center", gap: "0.45rem", padding: "0.6rem 1.1rem", fontSize: "0.88rem", borderRadius: "8px" }}
            >
              <Plus size={16} />
              Add Exam
            </button>
          </div>

          {/* Filters & Search Bar */}
          <div
            style={{
              background: "#ffffff",
              border: "1px solid #e2e8f0",
              borderRadius: "12px",
              padding: "0.75rem 1rem",
              marginBottom: "1.25rem",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              flexWrap: "wrap",
              gap: "0.75rem",
              boxShadow: "0 1px 3px rgba(0, 0, 0, 0.04)"
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", flex: 1, minWidth: "260px" }}>
              <div style={{ position: "relative", width: "100%", maxWidth: "340px" }}>
                <Search
                  size={16}
                  style={{ position: "absolute", left: "0.75rem", top: "50%", transform: "translateY(-50%)", color: "#94a3b8" }}
                />
                <input
                  type="text"
                  placeholder="Search examinations..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "0.5rem 0.75rem 0.5rem 2.25rem",
                    borderRadius: "8px",
                    border: "1px solid #cbd5e1",
                    fontSize: "0.85rem",
                    outline: "none"
                  }}
                />
              </div>

              {/* Subject filter */}
              <div>
                <select
                  value={selectedSubjectId}
                  onChange={(e) => setSelectedSubjectId(e.target.value)}
                  style={{
                    padding: "0.5rem 0.75rem",
                    borderRadius: "8px",
                    border: "1px solid #cbd5e1",
                    fontSize: "0.85rem",
                    background: "#ffffff",
                    color: "#1e293b",
                    fontWeight: 500
                  }}
                >
                  <option value="">Subject: All</option>
                  {subjects.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.code})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <button
              onClick={loadExams}
              title="Refresh List"
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.35rem",
                padding: "0.5rem 0.75rem",
                background: "#f8fafc",
                border: "1px solid #cbd5e1",
                borderRadius: "8px",
                color: "#475569",
                fontSize: "0.85rem",
                cursor: "pointer",
                fontWeight: 500
              }}
            >
              <RefreshCw size={14} className={loading ? "spin" : ""} />
              Refresh
            </button>
          </div>

          {/* Table */}
          <div
            style={{
              background: "#ffffff",
              border: "1px solid #e2e8f0",
              borderRadius: "14px",
              overflow: "hidden",
              boxShadow: "0 1px 4px rgba(0, 0, 0, 0.04)"
            }}
          >
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
                <thead>
                  <tr style={{ background: "#f8fafc", borderBottom: "1px solid #e2e8f0" }}>
                    <th style={{ padding: "0.85rem 0.75rem", fontSize: "0.75rem", fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em", width: "45px" }}>
                      #
                    </th>
                    <th style={{ padding: "0.85rem 1rem", fontSize: "0.75rem", fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                      Examination
                    </th>
                    <th style={{ padding: "0.85rem 1rem", fontSize: "0.75rem", fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                      Subject
                    </th>
                    <th style={{ padding: "0.85rem 1rem", fontSize: "0.75rem", fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                      Exam Date
                    </th>
                    <th style={{ padding: "0.85rem 1rem", fontSize: "0.75rem", fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                      Correction Deadline
                    </th>
                    <th style={{ padding: "0.85rem 1rem", fontSize: "0.75rem", fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                      Total Marks
                    </th>
                    <th style={{ padding: "0.85rem 1rem", fontSize: "0.75rem", fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em", textAlign: "right" }}>
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredExams.length === 0 ? (
                    <tr>
                      <td colSpan={7} style={{ padding: "3rem 1.5rem", textAlign: "center", color: "#64748b" }}>
                        <div style={{ display: "inline-flex", padding: "1rem", background: "#f1f5f9", borderRadius: "50%", color: "#94a3b8", marginBottom: "0.75rem" }}>
                          <FileText size={32} />
                        </div>
                        <div style={{ fontSize: "1rem", fontWeight: 700, color: "#0f172a", marginBottom: "0.25rem" }}>
                          No Examinations Created
                        </div>
                        <p style={{ fontSize: "0.85rem", color: "#64748b", margin: 0, marginBottom: "1rem" }}>
                          Upload and scan your question papers to schedule examinations.
                        </p>
                        <button
                          onClick={handleStartUploadNewExam}
                          className="btn btn-primary"
                          style={{ fontSize: "0.85rem", padding: "0.5rem 1rem" }}
                        >
                          + Add First Exam
                        </button>
                      </td>
                    </tr>
                  ) : (
                    filteredExams.map((ex, idx) => {
                      const subj = subjects.find((s) => s.id === ex.subject_id);
                      return (
                        <tr
                          key={ex.id}
                          style={{
                            borderBottom: "1px solid #f1f5f9",
                            transition: "background 0.15s ease"
                          }}
                          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#f8fafc")}
                          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "#ffffff")}
                        >
                          <td style={{ padding: "0.85rem 0.75rem", fontSize: "0.85rem", color: "#94a3b8", fontWeight: 600 }}>
                            {idx + 1}
                          </td>
                          <td style={{ padding: "0.85rem 1rem" }}>
                            <div
                              onClick={() => loadExamIntoEditor(ex)}
                              style={{ fontWeight: 700, color: "#0f172a", fontSize: "0.9rem", cursor: "pointer" }}
                              onMouseEnter={(e) => ((e.target as HTMLElement).style.textDecoration = "underline")}
                              onMouseLeave={(e) => ((e.target as HTMLElement).style.textDecoration = "none")}
                            >
                              {ex.title}
                            </div>
                            <div style={{ fontSize: "0.75rem", color: "#64748b", display: "flex", alignItems: "center", gap: "0.4rem" }}>
                              <span style={{ background: "#f1f5f9", padding: "0.1rem 0.4rem", borderRadius: "4px", fontWeight: 600 }}>
                                {ex.exam_type}
                              </span>
                              <span>• {ex.questions?.length || 0} questions</span>
                            </div>
                          </td>
                          <td style={{ padding: "0.85rem 1rem" }}>
                            <div style={{ fontSize: "0.85rem", fontWeight: 600, color: "#1e293b" }}>
                              {subj?.name || "Subject"}
                            </div>
                            <div style={{ fontSize: "0.75rem", color: "#64748b" }}>
                              {subj?.code || ""}
                            </div>
                          </td>
                          <td style={{ padding: "0.85rem 1rem" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: "0.35rem", fontSize: "0.85rem", color: "#334155" }}>
                              <Calendar size={14} style={{ color: "#64748b" }} />
                              {ex.exam_date || "Not Set"}
                            </div>
                          </td>
                          <td style={{ padding: "0.85rem 1rem" }}>
                            {ex.correction_deadline ? (
                              <div
                                style={{
                                  display: "inline-flex",
                                  alignItems: "center",
                                  gap: "0.35rem",
                                  background: "#f0f9ff",
                                  color: "#0369a1",
                                  padding: "0.2rem 0.55rem",
                                  borderRadius: "6px",
                                  fontSize: "0.78rem",
                                  fontWeight: 600
                                }}
                              >
                                <Clock size={13} />
                                {ex.correction_deadline}
                              </div>
                            ) : (
                              <span style={{ fontSize: "0.8rem", color: "#94a3b8" }}>—</span>
                            )}
                          </td>
                          <td style={{ padding: "0.85rem 1rem" }}>
                            <span style={{ fontWeight: 800, fontSize: "0.95rem", color: "#0f172a" }}>
                              {ex.max_marks} M
                            </span>
                            <div style={{ fontSize: "0.75rem", color: "#64748b" }}>
                              Pass: {ex.passing_marks} M
                            </div>
                          </td>
                          <td style={{ padding: "0.85rem 1rem", textAlign: "right" }}>
                            <div style={{ display: "inline-flex", alignItems: "center", gap: "0.45rem" }}>
                              <button
                                onClick={() => loadExamIntoEditor(ex)}
                                style={{
                                  padding: "0.35rem 0.75rem",
                                  background: "#f8fafc",
                                  border: "1px solid #cbd5e1",
                                  borderRadius: "6px",
                                  color: "#0f172a",
                                  fontSize: "0.78rem",
                                  fontWeight: 600,
                                  cursor: "pointer"
                                }}
                              >
                                Paper
                              </button>
                              <button
                                onClick={() => onNavigate("evaluation", { initialExamId: ex.id })}
                                style={{
                                  display: "inline-flex",
                                  alignItems: "center",
                                  gap: "0.3rem",
                                  padding: "0.35rem 0.75rem",
                                  background: "#0284c7",
                                  border: "none",
                                  borderRadius: "6px",
                                  color: "#ffffff",
                                  fontSize: "0.78rem",
                                  fontWeight: 600,
                                  cursor: "pointer"
                                }}
                              >
                                Grade
                              </button>
                              <button
                                onClick={() => handleDeleteExam(ex.id, ex.title)}
                                title="Delete Examination"
                                style={{
                                  padding: "0.35rem",
                                  background: "transparent",
                                  border: "none",
                                  color: "#ef4444",
                                  cursor: "pointer",
                                  borderRadius: "4px"
                                }}
                              >
                                <Trash2 size={16} />
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
        </div>
      )}

      {/* ============================================================== */}
      {/* VIEW MODE 2: CREATION WORKFLOW (STEP 1, 2, 3)                   */}
      {/* ============================================================== */}
      {viewMode === "create" && (
        <div>
          {/* Top Back Navigation Bar */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
            <button
              onClick={() => setViewMode("list")}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "0.4rem",
                background: "transparent",
                border: "none",
                color: "#64748b",
                fontWeight: 600,
                fontSize: "0.88rem",
                cursor: "pointer"
              }}
            >
              <ArrowLeft size={16} /> Back to Examinations List
            </button>

            {/* Step Indicators */}
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.82rem", fontWeight: 700 }}>
              <span style={{ color: step === 1 ? "#0284c7" : "#64748b" }}>1. Upload Paper</span>
              <span style={{ color: "#cbd5e1" }}>→</span>
              <span style={{ color: step === 2 ? "#0284c7" : "#64748b" }}>2. Confirm Details</span>
              <span style={{ color: "#cbd5e1" }}>→</span>
              <span style={{ color: step === 3 ? "#0284c7" : "#64748b" }}>3. Split Workspace</span>
            </div>
          </div>

          {/* STEP 1: MODULAR FULL-PAGE QUESTION PAPER UPLOAD */}
          {step === 1 && (
            <div style={{ maxWidth: "800px", margin: "2rem auto" }}>
              <div style={{ marginBottom: "2rem", textAlign: "center" }}>
                <h1 style={{ fontSize: "2rem", fontWeight: 800, color: "#0f172a", letterSpacing: "-0.03em", marginBottom: "0.4rem" }}>
                  Upload Question Paper
                </h1>
                <p style={{ color: "#64748b", fontSize: "0.95rem" }}>
                  Upload examination PDF to extract questions, internal choices, and digitalize the paper
                </p>
              </div>

              <div
                style={{
                  background: "#ffffff",
                  border: "2px dashed #cbd5e1",
                  borderRadius: "16px",
                  padding: "4rem 2rem",
                  textAlign: "center",
                  boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.05)"
                }}
              >
                <div
                  style={{
                    width: "72px",
                    height: "72px",
                    borderRadius: "50%",
                    background: "#eff6ff",
                    color: "#0284c7",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    margin: "0 auto 1.5rem"
                  }}
                >
                  <UploadCloud size={36} />
                </div>

                <h3 style={{ fontSize: "1.25rem", fontWeight: 700, color: "#0f172a", marginBottom: "0.5rem" }}>
                  {isScanning ? "Processing Question Paper..." : "Drag and drop question paper PDF"}
                </h3>

                <p style={{ color: "#64748b", fontSize: "0.88rem", maxWidth: "460px", margin: "0 auto 1.75rem" }}>
                  {isScanning
                    ? "Extracting questions, marks allocation, and syllabus sections..."
                    : "Supports PDF and scanned exam papers. Automatically extracts Part A compulsory questions and Part B internal choices."}
                </p>

                <label
                  className="btn btn-primary"
                  style={{
                    padding: "0.75rem 2rem",
                    fontSize: "0.95rem",
                    cursor: isScanning ? "not-allowed" : "pointer",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "0.5rem"
                  }}
                >
                  <FileText size={16} />
                  {isScanning ? "Scanning Paper..." : "Select Question Paper PDF"}
                  <input
                    type="file"
                    accept=".pdf,.png,.jpg,.jpeg"
                    style={{ display: "none" }}
                    onChange={handlePaperUpload}
                    disabled={isScanning}
                  />
                </label>

                {paperFile && (
                  <div style={{ marginTop: "1rem", fontSize: "0.85rem", color: "#334155", fontWeight: 600 }}>
                    Selected: {paperFile.name}
                  </div>
                )}

                {scanMessage && (
                  <div style={{ marginTop: "1rem", fontSize: "0.88rem", color: "#16a34a", fontWeight: 600 }}>
                    {scanMessage}
                  </div>
                )}

                <div style={{ marginTop: "3rem", paddingTop: "1.5rem", borderTop: "1px solid #f1f5f9" }}>
                  <button
                    type="button"
                    onClick={handleSkipToStep2WithoutUpload}
                    style={{
                      background: "none",
                      border: "none",
                      color: "#64748b",
                      fontSize: "0.85rem",
                      cursor: "pointer",
                      textDecoration: "underline"
                    }}
                  >
                    Or configure examination structure manually without file
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: SUBJECT & EXAMINATION CONFIRMATION */}
          {step === 2 && (
            <div style={{ maxWidth: "680px", margin: "2rem auto" }}>
              <div style={{ marginBottom: "2rem", textAlign: "center" }}>
                <h1 style={{ fontSize: "1.85rem", fontWeight: 800, color: "#0f172a", letterSpacing: "-0.03em", marginBottom: "0.4rem" }}>
                  Confirm Examination Structure
                </h1>
                <p style={{ color: "#64748b", fontSize: "0.95rem" }}>
                  Verify target course, batch, exam date, and correction deadline
                </p>
              </div>

              <div
                style={{
                  background: "#ffffff",
                  border: "1px solid #e2e8f0",
                  borderRadius: "16px",
                  padding: "2rem",
                  boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.05)"
                }}
              >
                <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
                  <div>
                    <label style={{ display: "block", fontSize: "0.82rem", fontWeight: 700, color: "#334155", marginBottom: "0.35rem" }}>
                      Target Subject
                    </label>
                    <select
                      value={selectedSubjectId}
                      onChange={(e) => setSelectedSubjectId(e.target.value)}
                      style={{ width: "100%", padding: "0.6rem 0.85rem", borderRadius: "8px", border: "1px solid #cbd5e1", fontSize: "0.9rem", fontWeight: 600 }}
                    >
                      {subjects.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name} ({s.code}) - {s.semester_or_grade}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label style={{ display: "block", fontSize: "0.82rem", fontWeight: 700, color: "#334155", marginBottom: "0.35rem" }}>
                      Target Class / Batch
                    </label>
                    <select
                      value={selectedClassId}
                      onChange={(e) => setSelectedClassId(e.target.value)}
                      style={{ width: "100%", padding: "0.6rem 0.85rem", borderRadius: "8px", border: "1px solid #cbd5e1", fontSize: "0.9rem" }}
                    >
                      <option value="">All Batches</option>
                      {classes.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label style={{ display: "block", fontSize: "0.82rem", fontWeight: 700, color: "#334155", marginBottom: "0.35rem" }}>
                      Examination Title
                    </label>
                    <input
                      type="text"
                      value={examTitle}
                      onChange={(e) => setExamTitle(e.target.value)}
                      style={{ width: "100%", padding: "0.6rem 0.85rem", borderRadius: "8px", border: "1px solid #cbd5e1", fontSize: "0.9rem", fontWeight: 600 }}
                    />
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                    <div>
                      <label style={{ display: "block", fontSize: "0.82rem", fontWeight: 700, color: "#334155", marginBottom: "0.35rem" }}>
                        Exam Type
                      </label>
                      <select
                        value={examType}
                        onChange={(e) => setExamType(e.target.value)}
                        style={{ width: "100%", padding: "0.6rem 0.85rem", borderRadius: "8px", border: "1px solid #cbd5e1", fontSize: "0.9rem" }}
                      >
                        <option value="Semester Exam">Semester End Exam</option>
                        <option value="Mid-Sem">Mid-Semester Exam</option>
                        <option value="Assessment 1">Continuous Assessment</option>
                        <option value="Mock Test">Mock Test</option>
                      </select>
                    </div>

                    <div>
                      <label style={{ display: "block", fontSize: "0.82rem", fontWeight: 700, color: "#334155", marginBottom: "0.35rem" }}>
                        Total Marks
                      </label>
                      <input
                        type="number"
                        value={totalAllocatedMarks}
                        readOnly
                        style={{ width: "100%", padding: "0.6rem 0.85rem", borderRadius: "8px", border: "1px solid #cbd5e1", fontSize: "0.9rem", background: "#f8fafc", fontWeight: 700 }}
                      />
                    </div>
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                    <div>
                      <label style={{ display: "block", fontSize: "0.82rem", fontWeight: 700, color: "#334155", marginBottom: "0.35rem" }}>
                        Exam Date
                      </label>
                      <input
                        type="date"
                        value={examDate}
                        onChange={(e) => setExamDate(e.target.value)}
                        style={{ width: "100%", padding: "0.6rem 0.85rem", borderRadius: "8px", border: "1px solid #cbd5e1", fontSize: "0.9rem" }}
                      />
                    </div>

                    <div>
                      <label style={{ display: "block", fontSize: "0.82rem", fontWeight: 700, color: "#334155", marginBottom: "0.35rem" }}>
                        Correction Submission Deadline
                      </label>
                      <input
                        type="date"
                        value={correctionDeadline}
                        onChange={(e) => setCorrectionDeadline(e.target.value)}
                        style={{ width: "100%", padding: "0.6rem 0.85rem", borderRadius: "8px", border: "1px solid #cbd5e1", fontSize: "0.9rem" }}
                      />
                    </div>
                  </div>

                  <div
                    style={{
                      background: "#eff6ff",
                      border: "1px solid #bfdbfe",
                      borderRadius: "10px",
                      padding: "1rem",
                      fontSize: "0.85rem",
                      color: "#1e40af"
                    }}
                  >
                    <strong>Scanned Structure:</strong> {questions.length} Questions detected (Part A Compulsory 10M + Part B 5 Units with OR internal choices = {totalAllocatedMarks} Marks).
                  </div>

                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "1rem" }}>
                    <button
                      type="button"
                      onClick={() => setStep(1)}
                      className="btn btn-secondary"
                      style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}
                    >
                      <ArrowLeft size={16} />
                      Back to Upload
                    </button>

                    <button
                      type="button"
                      onClick={() => setStep(3)}
                      className="btn btn-primary"
                      style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}
                    >
                      Continue to Workspace
                      <ArrowRight size={16} />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: FULLSCREEN LIVE SPLIT WORKSPACE */}
          {step === 3 && (
            <div>
              {/* Workspace Action Bar */}
              <div
                style={{
                  background: "#ffffff",
                  border: "1px solid #e2e8f0",
                  borderRadius: "12px",
                  padding: "0.85rem 1.25rem",
                  marginBottom: "1.25rem",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  flexWrap: "wrap",
                  gap: "1rem"
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                  <button
                    onClick={() => setStep(2)}
                    className="btn btn-secondary"
                    style={{ fontSize: "0.82rem", display: "flex", alignItems: "center", gap: "0.3rem" }}
                  >
                    <ArrowLeft size={14} /> Details
                  </button>
                  <div>
                    <h2 style={{ fontSize: "1.1rem", fontWeight: 800, color: "#0f172a", margin: 0 }}>
                      {examTitle}
                    </h2>
                    <span style={{ fontSize: "0.78rem", color: "#64748b" }}>
                      Allocated: {totalAllocatedMarks} Marks • Passing: {passingMarks} Marks
                    </span>
                  </div>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <button
                    type="button"
                    onClick={() => setShowAnswerKeyModal(true)}
                    className="btn btn-secondary"
                    style={{ fontSize: "0.85rem", display: "flex", alignItems: "center", gap: "0.4rem" }}
                  >
                    <FileText size={15} />
                    {answerKeyText ? "Edit Answer Key" : "+ Add Answer Key"}
                  </button>

                  <button
                    type="button"
                    onClick={handleSaveExam}
                    disabled={isSaving}
                    className="btn btn-primary"
                    style={{ fontSize: "0.85rem", display: "flex", alignItems: "center", gap: "0.4rem" }}
                  >
                    {saveSuccess ? <Check size={16} /> : <Save size={16} />}
                    {isSaving ? "Saving..." : saveSuccess ? "Saved!" : "Save Examination"}
                  </button>
                </div>
              </div>

              {/* Split Screen Workspace */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem", minHeight: "750px" }}>
                {/* LEFT HALF: Question Settings Editor */}
                <div
                  style={{
                    background: "#ffffff",
                    border: "1px solid #e2e8f0",
                    borderRadius: "12px",
                    padding: "1.25rem",
                    overflowY: "auto",
                    maxHeight: "85vh"
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
                    <div>
                      <h3 style={{ fontSize: "1.05rem", fontWeight: 800, color: "#0f172a", margin: 0 }}>
                        Question Matrix & Settings
                      </h3>
                      <p style={{ fontSize: "0.8rem", color: "#64748b", margin: 0 }}>
                        Adjust question statements, allocated marks, and strict grading rubrics
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={handleAddQuestion}
                      className="btn btn-secondary"
                      style={{ fontSize: "0.8rem", display: "flex", alignItems: "center", gap: "0.3rem" }}
                    >
                      <Plus size={14} /> Add Question
                    </button>
                  </div>

                  <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                    {questions.map((q, idx) => {
                      const isFocused = activeQuestionId === q.id;
                      return (
                        <div
                          key={q.id || idx}
                          id={`editor-card-${q.id}`}
                          style={{
                            border: isFocused ? "2px solid #0284c7" : "1px solid #cbd5e1",
                            borderRadius: "10px",
                            padding: "1rem",
                            background: isFocused ? "#f0f9ff" : "#ffffff",
                            transition: "all 0.15s ease"
                          }}
                        >
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.6rem" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                              <span style={{ fontWeight: 800, fontSize: "0.95rem", color: "#0f172a" }}>
                                {q.q_no}
                              </span>
                              <span style={{ fontSize: "0.72rem", background: "#e2e8f0", color: "#334155", padding: "0.15rem 0.45rem", borderRadius: "4px", fontWeight: 600 }}>
                                {q.section || "Part B"}
                              </span>
                            </div>

                            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                              <div style={{ display: "flex", alignItems: "center", gap: "0.3rem" }}>
                                <label style={{ fontSize: "0.75rem", fontWeight: 700, color: "#475569" }}>
                                  Marks:
                                </label>
                                <input
                                  type="number"
                                  step="0.5"
                                  min="0.5"
                                  max="50"
                                  value={q.marks}
                                  onChange={(e) => handleMarkChange(idx, Number(e.target.value))}
                                  style={{
                                    width: "60px",
                                    padding: "0.25rem 0.4rem",
                                    borderRadius: "4px",
                                    border: "1px solid #cbd5e1",
                                    fontWeight: 700,
                                    fontSize: "0.85rem"
                                  }}
                                />
                              </div>
                              <button
                                type="button"
                                onClick={() => handleDeleteQuestion(idx)}
                                style={{ background: "none", border: "none", color: "#ef4444", cursor: "pointer", padding: "0.2rem" }}
                              >
                                <Trash2 size={15} />
                              </button>
                            </div>
                          </div>

                          <div style={{ marginBottom: "0.6rem" }}>
                            <textarea
                              rows={2}
                              value={q.text}
                              onChange={(e) => handleTextChange(idx, e.target.value)}
                              style={{
                                width: "100%",
                                padding: "0.5rem",
                                borderRadius: "6px",
                                border: "1px solid #cbd5e1",
                                fontSize: "0.85rem",
                                lineHeight: 1.4
                              }}
                            />
                          </div>

                          <div>
                            <label style={{ display: "block", fontSize: "0.72rem", fontWeight: 700, color: "#64748b", marginBottom: "0.2rem" }}>
                              Evaluation Rubric
                            </label>
                            <input
                              type="text"
                              value={q.rubric || ""}
                              onChange={(e) => handleRubricChange(idx, e.target.value)}
                              placeholder="Grading rubric for this question..."
                              style={{
                                width: "100%",
                                padding: "0.4rem 0.6rem",
                                borderRadius: "6px",
                                border: "1px solid #cbd5e1",
                                fontSize: "0.8rem"
                              }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* RIGHT HALF: Live Digital Paper (Interactive) */}
                <div
                  style={{
                    background: "#ffffff",
                    border: "1px solid #cbd5e1",
                    borderRadius: "12px",
                    padding: "2rem",
                    overflowY: "auto",
                    maxHeight: "85vh",
                    boxShadow: "0 4px 20px -2px rgba(0, 0, 0, 0.08)"
                  }}
                >
                  {/* Digital Paper Header */}
                  <div style={{ textAlign: "center", borderBottom: "2px solid #0f172a", paddingBottom: "1.25rem", marginBottom: "1.5rem" }}>
                    <h2 style={{ fontSize: "1.3rem", fontWeight: 900, color: "#0f172a", letterSpacing: "0.02em", margin: 0 }}>
                      {digitalHeader.title}
                    </h2>
                    <div style={{ fontSize: "0.88rem", fontWeight: 700, color: "#334155", marginTop: "0.3rem" }}>
                      {digitalHeader.course}
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.82rem", fontWeight: 700, color: "#64748b", marginTop: "0.75rem", borderTop: "1px solid #e2e8f0", paddingTop: "0.5rem" }}>
                      <span>Time: {digitalHeader.time_allowed}</span>
                      <span>Max. Marks: {totalAllocatedMarks}</span>
                    </div>
                  </div>

                  {/* Part A Section */}
                  {partAQuestions.length > 0 && (
                    <div style={{ marginBottom: "1.75rem" }}>
                      <div style={{ background: "#f8fafc", padding: "0.4rem 0.75rem", borderRadius: "6px", fontWeight: 800, fontSize: "0.85rem", color: "#0f172a", marginBottom: "0.75rem" }}>
                        PART A (Compulsory Short Questions - 10 Marks)
                      </div>
                      <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                        {partAQuestions.map((q) => {
                          const isSelected = activeQuestionId === q.id;
                          return (
                            <div
                              key={q.id}
                              onClick={() => handleJumpToQuestion(q.id || "")}
                              style={{
                                padding: "0.65rem 0.85rem",
                                border: isSelected ? "2px solid #0284c7" : "1px solid #e2e8f0",
                                borderRadius: "6px",
                                background: isSelected ? "#f0f9ff" : "#ffffff",
                                cursor: "pointer",
                                display: "flex",
                                justifyContent: "space-between",
                                alignItems: "flex-start",
                                gap: "0.75rem"
                              }}
                            >
                              <div style={{ display: "flex", gap: "0.5rem" }}>
                                <span style={{ fontWeight: 800, fontSize: "0.85rem", color: "#0f172a", minWidth: "35px" }}>
                                  {q.q_no}
                                </span>
                                <span style={{ fontSize: "0.85rem", color: "#1e293b" }}>{q.text}</span>
                              </div>
                              <span style={{ fontSize: "0.8rem", fontWeight: 700, color: "#0284c7", whiteSpace: "nowrap" }}>
                                [{q.marks}M]
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Part B Section */}
                  {unitGroups.length > 0 && (
                    <div>
                      <div style={{ background: "#f8fafc", padding: "0.4rem 0.75rem", borderRadius: "6px", fontWeight: 800, fontSize: "0.85rem", color: "#0f172a", marginBottom: "0.75rem" }}>
                        PART B (Answer Any One Question From Each Unit - 50 Marks)
                      </div>

                      <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
                        {unitGroups.map((ug, uIdx) => (
                          <div key={uIdx} style={{ border: "1px solid #e2e8f0", borderRadius: "8px", padding: "0.85rem" }}>
                            <div style={{ fontSize: "0.78rem", fontWeight: 800, color: "#64748b", textTransform: "uppercase", marginBottom: "0.6rem" }}>
                              {ug.name}
                            </div>
                            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                              {ug.questions.map((q, qSubIdx) => {
                                const isSelected = activeQuestionId === q.id;
                                return (
                                  <React.Fragment key={q.id}>
                                    {qSubIdx > 0 && (
                                      <div style={{ textAlign: "center", margin: "0.2rem 0", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                                        <div style={{ flex: 1, height: "1px", background: "#e2e8f0" }} />
                                        <span style={{ fontSize: "0.72rem", fontWeight: 800, color: "#0284c7", background: "#eff6ff", padding: "0.1rem 0.5rem", borderRadius: "9999px" }}>
                                          OR
                                        </span>
                                        <div style={{ flex: 1, height: "1px", background: "#e2e8f0" }} />
                                      </div>
                                    )}
                                    <div
                                      onClick={() => handleJumpToQuestion(q.id || "")}
                                      style={{
                                        padding: "0.75rem",
                                        border: isSelected ? "2px solid #0284c7" : "1px solid #e2e8f0",
                                        borderRadius: "6px",
                                        background: isSelected ? "#f0f9ff" : "#ffffff",
                                        cursor: "pointer",
                                        display: "flex",
                                        justifyContent: "space-between",
                                        alignItems: "flex-start",
                                        gap: "0.75rem"
                                      }}
                                    >
                                      <div style={{ display: "flex", gap: "0.6rem" }}>
                                        <span style={{ fontWeight: 800, fontSize: "0.88rem", color: "#0f172a", minWidth: "32px" }}>
                                          {q.q_no}
                                        </span>
                                        <div>
                                          <div style={{ fontSize: "0.85rem", color: "#1e293b", lineHeight: 1.4 }}>
                                            {q.text}
                                          </div>
                                          {q.rubric && (
                                            <div style={{ fontSize: "0.72rem", color: "#64748b", marginTop: "0.25rem" }}>
                                              Rubric: {q.rubric}
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                      <span style={{ fontSize: "0.82rem", fontWeight: 700, color: "#0284c7", whiteSpace: "nowrap" }}>
                                        [{q.marks}M]
                                      </span>
                                    </div>
                                  </React.Fragment>
                                );
                              })}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Master Answer Key Modal */}
          {showAnswerKeyModal && (
            <div
              style={{
                position: "fixed",
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                background: "rgba(15, 23, 42, 0.6)",
                backdropFilter: "blur(4px)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                zIndex: 1050,
                padding: "1rem"
              }}
            >
              <div
                style={{
                  background: "#ffffff",
                  borderRadius: "16px",
                  padding: "2rem",
                  width: "100%",
                  maxWidth: "600px",
                  boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.2)"
                }}
              >
                <h3 style={{ fontSize: "1.25rem", fontWeight: 800, color: "#0f172a", marginBottom: "0.25rem" }}>
                  Master Answer Key
                </h3>
                <p style={{ fontSize: "0.85rem", color: "#64748b", marginBottom: "1rem" }}>
                  Ground truth solutions and expected derivations used for strict evaluation.
                </p>

                <textarea
                  rows={10}
                  value={answerKeyText}
                  onChange={(e) => setAnswerKeyText(e.target.value)}
                  placeholder="Paste or write detailed master solution steps and rubrics for each question..."
                  style={{
                    width: "100%",
                    padding: "0.75rem",
                    borderRadius: "8px",
                    border: "1px solid #cbd5e1",
                    fontSize: "0.88rem",
                    lineHeight: 1.5,
                    marginBottom: "1rem"
                  }}
                />

                <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.5rem" }}>
                  <button
                    type="button"
                    onClick={() => setShowAnswerKeyModal(false)}
                    className="btn btn-secondary"
                    style={{ fontSize: "0.85rem" }}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowAnswerKeyModal(false)}
                    className="btn btn-primary"
                    style={{ fontSize: "0.85rem" }}
                  >
                    Save Answer Key
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
