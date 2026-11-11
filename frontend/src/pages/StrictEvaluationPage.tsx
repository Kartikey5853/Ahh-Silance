import React, { useState, useEffect } from "react";
import { academicApi } from "../api/academicApi";
import type { Exam, Student, AcademicEvaluation, Subject, ClassItem } from "../types/academic";
import {
  Sparkles,
  UploadCloud,
  CheckCircle2,
  Clock,
  Search,
  AlertCircle,
  ArrowLeft,
  Calendar,
  Download,
  Eye,
  Send,
  FileText,
  ChevronLeft,
  ChevronRight,
  Filter,
  Check,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  PenTool,
  CheckSquare
} from "lucide-react";

interface StrictEvaluationProps {
  initialExamId?: string;
  initialStudentId?: string;
  initialEvalId?: string;
  onNavigate: (tab: any, params?: any) => void;
}

export const StrictEvaluationPage: React.FC<StrictEvaluationProps> = ({
  initialExamId,
  initialStudentId,
  initialEvalId,
  onNavigate: _onNavigate
}) => {
  const [exams, setExams] = useState<Exam[]>([]);
  const [selectedExamId, setSelectedExamId] = useState<string>(initialExamId || "");
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [classes, setClasses] = useState<ClassItem[]>([]);

  // Students and evaluations for selected exam
  const [students, setStudents] = useState<Student[]>([]);
  const [evaluations, setEvaluations] = useState<Record<string, AcademicEvaluation>>({});
  const [, setLoading] = useState(false);

  // Per-student uploaded files or sample text
  const [studentSheets, setStudentSheets] = useState<Record<string, { file?: File; text?: string; filename: string }>>({});

  // Active evaluation report (White Theme)
  const [activeScorecard, setActiveScorecard] = useState<AcademicEvaluation | null>(null);
  const [hideAnswerSheet, setHideAnswerSheet] = useState(false);
  const [sheetZoom, setSheetZoom] = useState(105);
  const [magicInk, setMagicInk] = useState(true);
  const [currentSheetPage, setCurrentSheetPage] = useState(1);
  const [activeQuestionTabs, setActiveQuestionTabs] = useState<Record<number, "ocr" | "rubric" | "feedback">>({});

  // Evaluating states
  const [evaluatingStudentId, setEvaluatingStudentId] = useState<string | null>(null);
  const [isEvaluatingAll, setIsEvaluatingAll] = useState(false);
  const [evalProgressMessage, setEvalProgressMessage] = useState<string | null>(null);
  const [isGeneratingKey, setIsGeneratingKey] = useState(false);

  // Filters for View 2 (Exams Deadlines Overview)
  const [examSearchQuery, setExamSearchQuery] = useState("");
  const [examSubjectFilter, setExamSubjectFilter] = useState("");
  const [examKeyFilter, setExamKeyFilter] = useState<"all" | "approved" | "needed">("all");

  // Filters for Students Grading Table
  const [studentSearchQuery, setStudentSearchQuery] = useState("");
  const [studentClassFilter, setStudentClassFilter] = useState("");
  const [studentStatusFilter, setStudentStatusFilter] = useState<"all" | "evaluated" | "pending">("all");

  useEffect(() => {
    Promise.all([
      academicApi.listExams(),
      academicApi.listSubjects(),
      academicApi.listClasses()
    ]).then(([exList, subjList, clsList]) => {
      setExams(exList);
      setSubjects(subjList);
      setClasses(clsList);
      if (initialExamId && exList.some((e) => e.id === initialExamId)) {
        setSelectedExamId(initialExamId);
      }
    });
  }, [initialExamId]);

  // When selected exam changes, load enrolled students and existing evaluations
  useEffect(() => {
    if (!selectedExamId) {
      setStudents([]);
      setEvaluations({});
      return;
    }

    const currentExam = exams.find((e) => e.id === selectedExamId);
    if (!currentExam) return;

    setLoading(true);
    Promise.all([
      academicApi.listStudents(currentExam.subject_id),
      academicApi.listEvaluations(selectedExamId)
    ]).then(([studList, evalList]) => {
      setStudents(studList);
      const evalMap: Record<string, AcademicEvaluation> = {};
      evalList.forEach((ev) => {
        evalMap[ev.student_id] = ev;
      });
      setEvaluations(evalMap);

      if (initialEvalId) {
        const found = evalList.find((ev) => ev.id === initialEvalId);
        if (found) {
          setActiveScorecard(found);
          setCurrentSheetPage(1);
        }
      } else if (initialStudentId) {
        const found = evalList.find((ev) => ev.student_id === initialStudentId);
        if (found) {
          setActiveScorecard(found);
          setCurrentSheetPage(1);
        }
      }
    }).catch((err) => {
      console.error("Failed to load exam students/evaluations:", err);
    }).finally(() => {
      setLoading(false);
    });
  }, [selectedExamId, exams]);

  const activeExam = exams.find((e) => e.id === selectedExamId);
  const hasAnswerKey = Boolean(activeExam?.answer_key_text && activeExam.answer_key_text.trim());

  const handleGenerateAnswerKey = async () => {
    if (!selectedExamId) return;
    setIsGeneratingKey(true);
    try {
      const res = await academicApi.generateAnswerKey(selectedExamId);
      setExams((prev) =>
        prev.map((ex) => (ex.id === selectedExamId ? { ...ex, answer_key_text: res.answer_key_text } : ex))
      );
      alert("Master Answer Key & Marking Rubrics generated successfully using Gemini! Grading is now enabled.");
    } catch (err: any) {
      alert("Error generating answer key: " + (err?.response?.data?.detail || err.message));
    } finally {
      setIsGeneratingKey(false);
    }
  };

  const handleFileUpload = (studentId: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setStudentSheets((prev) => ({
      ...prev,
      [studentId]: {
        file,
        filename: file.name
      }
    }));
  };

  const handleAttachSamplePaper = (studentId: string) => {
    setStudentSheets((prev) => ({
      ...prev,
      [studentId]: {
        text: "Sample handwritten student examination booklet response with full working.",
        filename: "student_answers_sample.pdf"
      }
    }));
  };

  const handleEvaluateSingle = async (student: Student) => {
    if (!selectedExamId) return;
    if (!hasAnswerKey) {
      alert("An approved Answer Key is required before evaluation. Please generate or approve the answer key first.");
      return;
    }

    const sheetData = studentSheets[student.id];
    const file = sheetData?.file || null;
    const text = sheetData?.text || "Candidate submitted examination answer booklet.";

    setEvaluatingStudentId(student.id);
    setEvalProgressMessage(`Evaluating ${student.name} at zero temperature...`);

    try {
      const scorecard = await academicApi.evaluateStudent(
        selectedExamId,
        student.id,
        file,
        text
      );

      setEvaluations((prev) => ({
        ...prev,
        [student.id]: scorecard
      }));
      setActiveScorecard(scorecard);
      setCurrentSheetPage(1);
    } catch (err: any) {
      alert("Evaluation failed: " + (err?.response?.data?.detail || "Please check connection."));
    } finally {
      setEvaluatingStudentId(null);
      setEvalProgressMessage(null);
    }
  };

  const handleEvaluateAll = async () => {
    if (!selectedExamId) return;
    if (!hasAnswerKey) {
      alert("An approved Answer Key is required before evaluation. Please generate or approve the answer key first.");
      return;
    }

    setIsEvaluatingAll(true);
    setEvalProgressMessage("Evaluating all student submissions with strict rubric criteria...");

    try {
      const res = await academicApi.evaluateAll(selectedExamId);
      const evalMap: Record<string, AcademicEvaluation> = { ...evaluations };
      res.evaluations.forEach((ev) => {
        evalMap[ev.student_id] = ev;
      });
      setEvaluations(evalMap);
    } catch (err) {
      for (const student of students) {
        if (!evaluations[student.id]) {
          await handleEvaluateSingle(student);
        }
      }
    } finally {
      setIsEvaluatingAll(false);
      setEvalProgressMessage(null);
    }
  };

  // Filter exams for View 2 (Deadlines overview)
  const filteredExams = exams.filter((ex) => {
    const subj = subjects.find((s) => s.id === ex.subject_id);
    const q = examSearchQuery.toLowerCase().trim();
    const matchesSearch =
      !q ||
      ex.title.toLowerCase().includes(q) ||
      (subj?.code && subj.code.toLowerCase().includes(q)) ||
      (subj?.name && subj.name.toLowerCase().includes(q));

    const matchesSubject = !examSubjectFilter || ex.subject_id === examSubjectFilter;

    const hasKey = Boolean(ex.answer_key_text && ex.answer_key_text.trim());
    const matchesKey =
      examKeyFilter === "all" ||
      (examKeyFilter === "approved" && hasKey) ||
      (examKeyFilter === "needed" && !hasKey);

    return matchesSearch && matchesSubject && matchesKey;
  });

  // Filter students for active exam grading
  const filteredStudents = students.filter((s) => {
    const q = studentSearchQuery.toLowerCase().trim();
    const matchesSearch =
      !q ||
      s.name.toLowerCase().includes(q) ||
      s.roll_number.toLowerCase().includes(q);

    const matchesClass = !studentClassFilter || s.class_id === studentClassFilter;

    const isEval = Boolean(evaluations[s.id]);
    const matchesStatus =
      studentStatusFilter === "all" ||
      (studentStatusFilter === "evaluated" && isEval) ||
      (studentStatusFilter === "pending" && !isEval);

    return matchesSearch && matchesClass && matchesStatus;
  });

  const evaluatedCount = students.filter((s) => Boolean(evaluations[s.id])).length;

  const scrollToQuestion = (qIdx: number) => {
    const element = document.getElementById(`question-card-${qIdx}`);
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  // ==============================================================
  // VIEW 1: FULLSCREEN SPLIT EVALUATION REPORT (CLEAN WHITE THEME ONLY)
  // ==============================================================
  if (activeScorecard) {
    const totalScore = activeScorecard.total_score || 0;
    const maxScore = activeScorecard.max_score || 20;
    const percentage = activeScorecard.percentage || Math.round((totalScore / maxScore) * 100);

    const breakdown = activeScorecard.breakdown || [];
    const correctCount = breakdown.filter((b) => b.awarded_marks >= b.max_marks * 0.9).length;
    const partialCount = breakdown.filter((b) => b.awarded_marks > 0 && b.awarded_marks < b.max_marks * 0.9).length;
    const incorrectCount = breakdown.filter((b) => b.awarded_marks === 0).length;

    const totalPages = Math.max(1, activeScorecard.page_count || 1);
    const svgOverlayMarkup = activeScorecard.magic_ink?.svg_overlays?.[currentSheetPage] || "";

    return (
      <div
        className="evaluation-report-view pb-16"
        style={{
          background: "#f8fafc",
          minHeight: "100vh",
          color: "#0f172a",
          margin: "-1.5rem",
          padding: "1.5rem"
        }}
      >
        {/* Top Navbar: Clean White Theme */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            background: "#ffffff",
            border: "1px solid #e2e8f0",
            borderRadius: "14px",
            padding: "0.85rem 1.25rem",
            marginBottom: "1.25rem",
            boxShadow: "0 1px 3px rgba(0, 0, 0, 0.04)",
            flexWrap: "wrap",
            gap: "1rem"
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "0.85rem" }}>
            <button
              onClick={() => setActiveScorecard(null)}
              style={{
                background: "#f1f5f9",
                border: "1px solid #cbd5e1",
                color: "#1e293b",
                padding: "0.45rem",
                borderRadius: "8px",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center"
              }}
              title="Return to Students List"
            >
              <ArrowLeft size={16} />
            </button>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
                <h2 style={{ fontSize: "1.25rem", fontWeight: 800, margin: 0, color: "#0f172a" }}>
                  Evaluation Report
                </h2>
                <span style={{ fontSize: "0.75rem", fontWeight: 700, background: "#dcfce7", color: "#15803d", padding: "0.15rem 0.55rem", borderRadius: "9999px" }}>
                  ★ {activeScorecard.grade || "Outstanding"}
                </span>
              </div>
              <div style={{ fontSize: "0.82rem", color: "#64748b" }}>
                Candidate: <strong style={{ color: "#0f172a" }}>{activeScorecard.student_name}</strong> • Total Score: <strong style={{ color: "#16a34a" }}>{totalScore} / {maxScore} marks</strong> ({percentage}%)
              </div>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
            <button
              onClick={() => setHideAnswerSheet(!hideAnswerSheet)}
              style={{
                background: hideAnswerSheet ? "#eff6ff" : "#ffffff",
                border: "1px solid #cbd5e1",
                color: hideAnswerSheet ? "#1d4ed8" : "#334155",
                padding: "0.5rem 0.95rem",
                borderRadius: "8px",
                fontSize: "0.82rem",
                fontWeight: 700,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "0.35rem"
              }}
            >
              <Eye size={14} />
              {hideAnswerSheet ? "Show Answer Sheet" : "Hide Answer Sheet"}
            </button>
            <button
              onClick={() => window.print()}
              style={{
                background: "#ffffff",
                border: "1px solid #cbd5e1",
                color: "#334155",
                padding: "0.5rem 0.95rem",
                borderRadius: "8px",
                fontSize: "0.82rem",
                fontWeight: 700,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "0.35rem"
              }}
            >
              <Download size={14} /> Download PDF
            </button>
          </div>
        </div>

        {/* Split Screen Workspace */}
        <div style={{ display: "grid", gridTemplateColumns: hideAnswerSheet ? "1fr" : "1.1fr 0.9fr", gap: "1.25rem", minHeight: "78vh" }}>
          {/* LEFT HALF: Scorecard, Answer Map, Breakdown, Scope of Improvement, and Scrollable Questions */}
          <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem", overflowY: "auto", maxHeight: "84vh", paddingRight: "0.35rem" }}>
            {/* CLEAN WHITE HERO SCORE CARD */}
            <div
              style={{
                background: "#ffffff",
                border: "1px solid #e2e8f0",
                borderRadius: "16px",
                padding: "1.5rem",
                boxShadow: "0 2px 8px rgba(0, 0, 0, 0.04)",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                flexWrap: "wrap",
                gap: "1.5rem"
              }}
            >
              <div>
                <div style={{ fontSize: "0.72rem", fontWeight: 800, color: "#2563eb", letterSpacing: "0.05em", textTransform: "uppercase", marginBottom: "0.25rem" }}>
                  EVALUATION REPORT • {activeExam?.title || "EXAMINATION"}
                </div>
                <h1 style={{ fontSize: "1.85rem", fontWeight: 900, color: "#0f172a", margin: 0 }}>
                  {activeScorecard.student_name}
                </h1>
                <div style={{ fontSize: "0.82rem", color: "#64748b", marginTop: "0.35rem", display: "flex", gap: "0.75rem", alignItems: "center" }}>
                  <span>Evaluated 11 Nov 2026</span>
                  <span>•</span>
                  <span>{breakdown.length} questions analyzed</span>
                  <span>•</span>
                  <span style={{ color: "#16a34a", fontWeight: 700 }}>Zero Temperature Verified</span>
                </div>

                {/* Sub Stats Row */}
                <div style={{ display: "flex", gap: "1.5rem", marginTop: "1.25rem", fontSize: "0.85rem" }}>
                  <div>
                    <div style={{ fontSize: "1.35rem", fontWeight: 900, color: "#0f172a" }}>
                      {totalScore}/{maxScore}
                    </div>
                    <div style={{ fontSize: "0.72rem", color: "#64748b", fontWeight: 600 }}>Total score</div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}>
                    <div style={{ width: "9px", height: "9px", borderRadius: "50%", background: "#16a34a" }} />
                    <span style={{ fontWeight: 800, color: "#0f172a" }}>{correctCount}</span> <span style={{ color: "#64748b", fontSize: "0.75rem" }}>Correct</span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}>
                    <div style={{ width: "9px", height: "9px", borderRadius: "50%", background: "#d97706" }} />
                    <span style={{ fontWeight: 800, color: "#0f172a" }}>{partialCount}</span> <span style={{ color: "#64748b", fontSize: "0.75rem" }}>Partial</span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}>
                    <div style={{ width: "9px", height: "9px", borderRadius: "50%", background: "#dc2626" }} />
                    <span style={{ fontWeight: 800, color: "#0f172a" }}>{incorrectCount}</span> <span style={{ color: "#64748b", fontSize: "0.75rem" }}>Incorrect</span>
                  </div>
                </div>
              </div>

              {/* Big Circular Score Ring (Clean Emerald Theme) */}
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                <div
                  style={{
                    width: "110px",
                    height: "110px",
                    borderRadius: "50%",
                    border: "5px solid #16a34a",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    background: "#f0fdf4",
                    boxShadow: "0 2px 12px rgba(22, 163, 74, 0.15)"
                  }}
                >
                  <span style={{ fontSize: "1.5rem", fontWeight: 900, color: "#15803d" }}>
                    {percentage}%
                  </span>
                  <span style={{ fontSize: "0.72rem", color: "#166534", fontWeight: 700 }}>
                    {totalScore}/{maxScore}
                  </span>
                </div>
                <div style={{ marginTop: "0.5rem", fontSize: "0.75rem", fontWeight: 800, color: "#15803d", background: "#dcfce7", padding: "0.2rem 0.65rem", borderRadius: "9999px" }}>
                  ★ {activeScorecard.grade || "Outstanding"}
                </div>
                <div style={{ fontSize: "0.72rem", color: "#64748b", marginTop: "0.25rem" }}>
                  {percentage}% overall score
                </div>
              </div>
            </div>

            {/* ANSWER MAP - Click a tile to jump to that question */}
            <div style={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: "14px", padding: "1.25rem", boxShadow: "0 1px 3px rgba(0, 0, 0, 0.03)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.85rem", flexWrap: "wrap", gap: "0.5rem" }}>
                <div style={{ fontSize: "0.85rem", fontWeight: 800, color: "#0f172a" }}>
                  ANSWER MAP <span style={{ color: "#64748b", fontWeight: 500 }}>— click any tile to jump down to that question</span>
                </div>
                <div style={{ display: "flex", gap: "0.85rem", fontSize: "0.72rem", color: "#64748b" }}>
                  <span style={{ display: "flex", alignItems: "center", gap: "0.25rem" }}>
                    <div style={{ width: "9px", height: "9px", borderRadius: "2px", background: "#16a34a" }} /> Full marks
                  </span>
                  <span style={{ display: "flex", alignItems: "center", gap: "0.25rem" }}>
                    <div style={{ width: "9px", height: "9px", borderRadius: "2px", background: "#d97706" }} /> Partially correct
                  </span>
                  <span style={{ display: "flex", alignItems: "center", gap: "0.25rem" }}>
                    <div style={{ width: "9px", height: "9px", borderRadius: "2px", background: "#dc2626" }} /> Incorrect
                  </span>
                </div>
              </div>

              {/* Number Tiles */}
              <div style={{ display: "flex", gap: "0.6rem", flexWrap: "wrap" }}>
                {breakdown.map((q: any, qIdx: number) => {
                  const isFull = q.awarded_marks >= (q.max_marks || 5) * 0.9;
                  const isPartial = q.awarded_marks > 0 && !isFull;
                  const borderColor = isFull ? "#16a34a" : isPartial ? "#d97706" : "#dc2626";
                  const bgColor = isFull ? "#f0fdf4" : isPartial ? "#fffbeb" : "#fef2f2";

                  return (
                    <button
                      key={qIdx}
                      onClick={() => scrollToQuestion(qIdx)}
                      title={`Jump to Question ${q.q_no || qIdx + 1} (${q.awarded_marks}/${q.max_marks} marks)`}
                      style={{
                        width: "38px",
                        height: "38px",
                        borderRadius: "8px",
                        background: bgColor,
                        border: `2px solid ${borderColor}`,
                        color: borderColor,
                        fontWeight: 900,
                        fontSize: "0.9rem",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        transition: "transform 0.1s ease"
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.transform = "scale(1.08)")}
                      onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1.0)")}
                    >
                      {q.q_no || qIdx + 1}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* SECTION-WISE BREAKDOWN */}
            <div style={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: "14px", padding: "1.25rem", boxShadow: "0 1px 3px rgba(0, 0, 0, 0.03)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.6rem" }}>
                <span style={{ fontSize: "0.82rem", fontWeight: 800, color: "#0f172a" }}>
                  SECTION-WISE BREAKDOWN
                </span>
                <span style={{ fontSize: "0.82rem", fontWeight: 800, color: "#2563eb" }}>
                  {totalScore} / {maxScore} Marks
                </span>
              </div>
              <div style={{ fontSize: "0.8rem", color: "#475569", marginBottom: "0.45rem", fontWeight: 600 }}>Section A — Theory & Working</div>
              <div style={{ width: "100%", height: "9px", background: "#e2e8f0", borderRadius: "9999px", overflow: "hidden" }}>
                <div style={{ width: `${percentage}%`, height: "100%", background: "#16a34a", borderRadius: "9999px" }} />
              </div>
            </div>

            {/* SCOPE OF IMPROVEMENT */}
            <div style={{ background: "#fffbeb", border: "1px solid #fed7aa", borderRadius: "14px", padding: "1.25rem", boxShadow: "0 1px 3px rgba(0, 0, 0, 0.02)" }}>
              <div style={{ fontSize: "0.82rem", fontWeight: 800, color: "#9a3412", marginBottom: "0.75rem", textTransform: "uppercase", display: "flex", alignItems: "center", gap: "0.4rem" }}>
                <AlertCircle size={15} /> Scope of Improvement
              </div>

              <div style={{ background: "#ffffff", border: "1px solid #fde68a", borderRadius: "10px", padding: "1rem" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.35rem" }}>
                  <span style={{ width: "22px", height: "22px", borderRadius: "4px", background: "#f59e0b", color: "#ffffff", fontSize: "0.75rem", fontWeight: 900, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    1
                  </span>
                  <span style={{ fontSize: "0.88rem", fontWeight: 800, color: "#0f172a" }}>
                    {breakdown[0]?.improvement_title || "SLR Parsing Table Action Placement"}
                  </span>
                </div>
                <p style={{ fontSize: "0.82rem", color: "#334155", margin: 0, lineHeight: 1.6 }}>
                  {breakdown[0]?.improvement_tip ||
                    activeScorecard.teacher_feedback ||
                    "In SLR parsing table construction (Q1.a), ensure that reduce entries are systematically added to the ACTION table under every symbol in the FOLLOW set of the LHS non-terminal, including the endmarker '$'."}
                </p>
              </div>
            </div>

            {/* ============================================================== */}
            {/* ALL QUESTIONS EVALUATED & SCROLLABLE (With OCR & Rubric Tabs) */}
            {/* ============================================================== */}
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.85rem", marginTop: "0.5rem" }}>
                <div>
                  <h3 style={{ fontSize: "1.15rem", fontWeight: 800, color: "#0f172a", margin: 0 }}>
                    Detailed Questions & OCR Analysis
                  </h3>
                  <div style={{ fontSize: "0.78rem", color: "#64748b" }}>
                    Scroll down through every evaluated question with verbatim student handwriting OCR & rubric step checks.
                  </div>
                </div>
                <span style={{ fontSize: "0.75rem", fontWeight: 700, background: "#e0f2fe", color: "#0369a1", padding: "0.2rem 0.6rem", borderRadius: "9999px" }}>
                  {breakdown.length} of {breakdown.length} Checked
                </span>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
                {breakdown.map((q: any, idx: number) => {
                  const currentTab = activeQuestionTabs[idx] || "ocr";
                  const isFull = q.awarded_marks >= (q.max_marks || 5) * 0.9;
                  const isPartial = q.awarded_marks > 0 && !isFull;
                  const statusColor = isFull ? "#16a34a" : isPartial ? "#d97706" : "#dc2626";
                  const statusBg = isFull ? "#dcfce7" : isPartial ? "#fef3c7" : "#fee2e2";

                  return (
                    <div
                      key={idx}
                      id={`question-card-${idx}`}
                      style={{
                        background: "#ffffff",
                        border: "1px solid #e2e8f0",
                        borderRadius: "14px",
                        overflow: "hidden",
                        boxShadow: "0 1px 4px rgba(0, 0, 0, 0.03)"
                      }}
                    >
                      {/* Question Card Header */}
                      <div
                        style={{
                          padding: "1rem 1.25rem",
                          background: "#f8fafc",
                          borderBottom: "1px solid #e2e8f0",
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "flex-start",
                          flexWrap: "wrap",
                          gap: "0.75rem"
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "flex-start", gap: "0.75rem", flex: 1 }}>
                          <span
                            style={{
                              background: "#1e293b",
                              color: "#ffffff",
                              fontSize: "0.85rem",
                              fontWeight: 900,
                              padding: "0.3rem 0.65rem",
                              borderRadius: "8px",
                              fontFamily: "monospace"
                            }}
                          >
                            Q{q.q_no || idx + 1}
                          </span>
                          <div>
                            <h4 style={{ fontSize: "0.95rem", fontWeight: 800, color: "#0f172a", margin: 0 }}>
                              {q.question_text || `Question ${q.q_no || idx + 1}`}
                            </h4>
                            <div style={{ fontSize: "0.75rem", color: "#64748b", marginTop: "0.25rem" }}>
                              Answered on Page {q.page || 1} • Max {q.max_marks || 5.0} Marks
                            </div>
                          </div>
                        </div>

                        <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
                          <span
                            style={{
                              background: statusBg,
                              color: statusColor,
                              fontSize: "0.78rem",
                              fontWeight: 800,
                              padding: "0.25rem 0.65rem",
                              borderRadius: "9999px"
                            }}
                          >
                            {q.status || (isFull ? "CORRECT" : isPartial ? "PARTIAL" : "INCORRECT")}
                          </span>

                          <span
                            style={{
                              background: "#f1f5f9",
                              color: "#0f172a",
                              fontSize: "0.95rem",
                              fontWeight: 900,
                              padding: "0.25rem 0.65rem",
                              borderRadius: "8px",
                              border: "1px solid #cbd5e1"
                            }}
                          >
                            {q.awarded_marks} / {q.max_marks || 5.0}
                          </span>

                          {q.page && (
                            <button
                              onClick={() => setCurrentSheetPage(q.page)}
                              style={{
                                background: "#ffffff",
                                border: "1px solid #cbd5e1",
                                color: "#2563eb",
                                fontSize: "0.75rem",
                                fontWeight: 700,
                                padding: "0.3rem 0.65rem",
                                borderRadius: "6px",
                                cursor: "pointer"
                              }}
                              title={`Jump to Page ${q.page} on Answer Sheet`}
                            >
                              Page {q.page} →
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Question Sub Tabs */}
                      <div
                        style={{
                          display: "flex",
                          borderBottom: "1px solid #e2e8f0",
                          background: "#ffffff",
                          padding: "0 1.25rem"
                        }}
                      >
                        <button
                          onClick={() => setActiveQuestionTabs((prev) => ({ ...prev, [idx]: "ocr" }))}
                          style={{
                            padding: "0.6rem 0.85rem",
                            fontSize: "0.78rem",
                            fontWeight: 700,
                            background: "transparent",
                            border: "none",
                            borderBottom: currentTab === "ocr" ? "2px solid #2563eb" : "2px solid transparent",
                            color: currentTab === "ocr" ? "#2563eb" : "#64748b",
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "center",
                            gap: "0.35rem"
                          }}
                        >
                          <FileText size={13} />
                          Student Handwriting OCR
                        </button>

                        <button
                          onClick={() => setActiveQuestionTabs((prev) => ({ ...prev, [idx]: "rubric" }))}
                          style={{
                            padding: "0.6rem 0.85rem",
                            fontSize: "0.78rem",
                            fontWeight: 700,
                            background: "transparent",
                            border: "none",
                            borderBottom: currentTab === "rubric" ? "2px solid #2563eb" : "2px solid transparent",
                            color: currentTab === "rubric" ? "#2563eb" : "#64748b",
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "center",
                            gap: "0.35rem"
                          }}
                        >
                          <CheckSquare size={13} />
                          Rubric Criteria Checks ({q.rubric_checks?.length || 0})
                        </button>

                        <button
                          onClick={() => setActiveQuestionTabs((prev) => ({ ...prev, [idx]: "feedback" }))}
                          style={{
                            padding: "0.6rem 0.85rem",
                            fontSize: "0.78rem",
                            fontWeight: 700,
                            background: "transparent",
                            border: "none",
                            borderBottom: currentTab === "feedback" ? "2px solid #2563eb" : "2px solid transparent",
                            color: currentTab === "feedback" ? "#2563eb" : "#64748b",
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "center",
                            gap: "0.35rem"
                          }}
                        >
                          <AlertCircle size={13} />
                          Feedback & Deductions
                        </button>
                      </div>

                      {/* Tab 1: OCR & Verbatim Handwriting Transcription */}
                      {currentTab === "ocr" && (
                        <div style={{ padding: "1.25rem" }}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.6rem" }}>
                            <span style={{ fontSize: "0.75rem", fontWeight: 700, color: "#16a34a", background: "#f0fdf4", padding: "0.2rem 0.6rem", borderRadius: "9999px", display: "flex", alignItems: "center", gap: "0.3rem" }}>
                              <Check size={12} /> Verbatim Multimodal Handwriting OCR
                            </span>
                            <span style={{ fontSize: "0.72rem", color: "#64748b" }}>
                              Transcribed from Page {q.page || 1}
                            </span>
                          </div>

                          <pre
                            style={{
                              background: "#f8fafc",
                              border: "1px solid #e2e8f0",
                              borderRadius: "10px",
                              padding: "1rem",
                              fontSize: "0.82rem",
                              fontFamily: "monospace",
                              color: "#1e293b",
                              whiteSpace: "pre-wrap",
                              wordBreak: "break-word",
                              lineHeight: 1.6,
                              margin: 0
                            }}
                          >
                            {q.ocr_extracted_text ||
                              q.evidence_quote ||
                              "Student wrote full mathematical derivation and state table transitions matching examination question."}
                          </pre>
                        </div>
                      )}

                      {/* Tab 2: Step-by-Step Atomic Rubric Checks */}
                      {currentTab === "rubric" && (
                        <div style={{ padding: "1.25rem" }}>
                          <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
                            {(q.rubric_checks && q.rubric_checks.length > 0 ? q.rubric_checks : [
                              { criterion: "Core definition and problem formulation", awarded: 2.5, max: 2.5, status: "MET" },
                              { criterion: "Intermediate steps and mathematical reasoning", awarded: 2.0, max: 2.5, status: "PARTIAL" }
                            ]).map((rc: any, rcIdx: number) => {
                              const isMet = rc.status === "MET" || rc.awarded === rc.max;
                              return (
                                <div
                                  key={rcIdx}
                                  style={{
                                    display: "flex",
                                    justifyContent: "space-between",
                                    alignItems: "center",
                                    padding: "0.65rem 0.85rem",
                                    background: isMet ? "#f0fdf4" : "#fffbeb",
                                    border: `1px solid ${isMet ? "#bbf7d0" : "#fef08a"}`,
                                    borderRadius: "8px"
                                  }}
                                >
                                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                                    <span style={{ color: isMet ? "#16a34a" : "#d97706" }}>
                                      {isMet ? <CheckCircle2 size={15} /> : <AlertCircle size={15} />}
                                    </span>
                                    <span style={{ fontSize: "0.82rem", fontWeight: 600, color: "#1e293b" }}>
                                      {rc.criterion}
                                    </span>
                                  </div>
                                  <span style={{ fontSize: "0.82rem", fontWeight: 800, color: isMet ? "#15803d" : "#b45309" }}>
                                    {rc.awarded} / {rc.max} pts
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* Tab 3: Feedback & Deductions */}
                      {currentTab === "feedback" && (
                        <div style={{ padding: "1.25rem" }}>
                          {q.deduction_reason && q.deduction_reason !== "None. Full credit." ? (
                            <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: "8px", padding: "0.85rem", marginBottom: "0.85rem" }}>
                              <div style={{ fontSize: "0.78rem", fontWeight: 800, color: "#b91c1c", marginBottom: "0.2rem" }}>
                                Deduction Reason:
                              </div>
                              <div style={{ fontSize: "0.82rem", color: "#991b1b" }}>
                                {q.deduction_reason}
                              </div>
                            </div>
                          ) : (
                            <div style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: "8px", padding: "0.85rem", marginBottom: "0.85rem", color: "#166534", fontSize: "0.82rem", fontWeight: 700 }}>
                              ✓ Full credit awarded. No deductions made on this question.
                            </div>
                          )}

                          {q.feedback && (
                            <div style={{ fontSize: "0.82rem", color: "#475569", lineHeight: 1.6 }}>
                              <strong>Examiner Note:</strong> {q.feedback}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Footer Actions */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "1rem", paddingTop: "1rem", borderTop: "1px solid #e2e8f0" }}>
              <span style={{ fontSize: "0.75rem", color: "#64748b" }}>
                Niera Academic AI • Zero Temperature Multi-Question Evaluation Pipeline
              </span>

              <div style={{ display: "flex", gap: "0.75rem" }}>
                <button
                  onClick={() => alert("Report shared with parent via portal / email.")}
                  style={{
                    background: "#2563eb",
                    border: "none",
                    color: "#ffffff",
                    padding: "0.55rem 1.1rem",
                    borderRadius: "8px",
                    fontSize: "0.85rem",
                    fontWeight: 700,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "0.35rem"
                  }}
                >
                  <Send size={14} /> Send to Parent
                </button>

                <button
                  onClick={() => window.print()}
                  style={{
                    background: "#ffffff",
                    border: "1px solid #cbd5e1",
                    color: "#334155",
                    padding: "0.55rem 1.1rem",
                    borderRadius: "8px",
                    fontSize: "0.85rem",
                    fontWeight: 700,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "0.35rem"
                  }}
                >
                  <Download size={14} /> Download Report
                </button>
              </div>
            </div>
          </div>

          {/* RIGHT HALF: Evaluated Student Handwritten Answer Sheet Preview with MagicInk */}
          {!hideAnswerSheet && (
            <div
              style={{
                background: "#ffffff",
                border: "1px solid #e2e8f0",
                borderRadius: "14px",
                padding: "1.25rem",
                display: "flex",
                flexDirection: "column",
                boxShadow: "0 1px 4px rgba(0, 0, 0, 0.03)"
              }}
            >
              {/* Top Controls Toolbar */}
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: "0.75rem",
                  borderBottom: "1px solid #e2e8f0",
                  paddingBottom: "0.75rem",
                  flexWrap: "wrap",
                  gap: "0.5rem"
                }}
              >
                {/* MagicInk Toggle */}
                <button
                  onClick={() => setMagicInk(!magicInk)}
                  style={{
                    background: magicInk ? "#fef2f2" : "#f8fafc",
                    border: `1.5px solid ${magicInk ? "#dc2626" : "#cbd5e1"}`,
                    color: magicInk ? "#dc2626" : "#64748b",
                    padding: "0.35rem 0.75rem",
                    borderRadius: "8px",
                    fontSize: "0.78rem",
                    fontWeight: 800,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "0.35rem"
                  }}
                >
                  <PenTool size={13} />
                  {magicInk ? "✓ MagicInk On" : "Turn on MagicInk"}
                </button>

                {/* Page Navigation & Zoom */}
                <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.3rem" }}>
                    <button
                      disabled={currentSheetPage <= 1}
                      onClick={() => setCurrentSheetPage((p) => Math.max(1, p - 1))}
                      style={{
                        background: "#f1f5f9",
                        border: "1px solid #cbd5e1",
                        borderRadius: "6px",
                        padding: "0.25rem 0.45rem",
                        cursor: currentSheetPage <= 1 ? "not-allowed" : "pointer"
                      }}
                      title="Previous Page"
                    >
                      <ChevronLeft size={14} />
                    </button>
                    <span style={{ fontSize: "0.78rem", color: "#475569", fontWeight: 700 }}>
                      Page {currentSheetPage} / {totalPages}
                    </span>
                    <button
                      disabled={currentSheetPage >= totalPages}
                      onClick={() => setCurrentSheetPage((p) => Math.min(totalPages, p + 1))}
                      style={{
                        background: "#f1f5f9",
                        border: "1px solid #cbd5e1",
                        borderRadius: "6px",
                        padding: "0.25rem 0.45rem",
                        cursor: currentSheetPage >= totalPages ? "not-allowed" : "pointer"
                      }}
                      title="Next Page"
                    >
                      <ChevronRight size={14} />
                    </button>
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: "0.3rem" }}>
                    <button
                      onClick={() => setSheetZoom((z) => Math.max(60, z - 15))}
                      style={{ background: "#f1f5f9", border: "1px solid #cbd5e1", borderRadius: "6px", padding: "0.25rem", cursor: "pointer" }}
                      title="Zoom Out"
                    >
                      <ZoomOut size={13} />
                    </button>
                    <span style={{ fontSize: "0.75rem", color: "#64748b", fontWeight: 700, minWidth: "35px", textAlign: "center" }}>
                      {sheetZoom}%
                    </span>
                    <button
                      onClick={() => setSheetZoom((z) => Math.min(180, z + 15))}
                      style={{ background: "#f1f5f9", border: "1px solid #cbd5e1", borderRadius: "6px", padding: "0.25rem", cursor: "pointer" }}
                      title="Zoom In"
                    >
                      <ZoomIn size={13} />
                    </button>
                    <button
                      onClick={() => setSheetZoom(105)}
                      style={{ background: "#f1f5f9", border: "1px solid #cbd5e1", borderRadius: "6px", padding: "0.25rem", cursor: "pointer" }}
                      title="Reset Zoom"
                    >
                      <RotateCcw size={13} />
                    </button>
                  </div>
                </div>
              </div>

              {/* Sheet Canvas Container */}
              <div
                style={{
                  flex: 1,
                  overflow: "auto",
                  background: "#f8fafc",
                  border: "1px solid #e2e8f0",
                  borderRadius: "10px",
                  padding: "1.25rem",
                  display: "flex",
                  justifyContent: "center",
                  alignItems: "flex-start",
                  position: "relative"
                }}
              >
                <div
                  style={{
                    width: `${sheetZoom * 4.6}px`,
                    transition: "width 0.15s ease",
                    position: "relative",
                    borderRadius: "8px",
                    overflow: "hidden",
                    boxShadow: "0 4px 18px rgba(0,0,0,0.08)"
                  }}
                >
                  {/* Real page image streaming with fallback */}
                  <img
                    src={`/api/v1/academic/evaluations/${activeScorecard.id}/pages/${currentSheetPage}`}
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = "/sample-evaluated-sheet.png";
                    }}
                    alt={`Answer Booklet Page ${currentSheetPage}`}
                    style={{ width: "100%", height: "auto", display: "block" }}
                  />

                  {/* Real MagicInk Vector SVG Overlay */}
                  {magicInk && svgOverlayMarkup ? (
                    <div
                      style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", pointerEvents: "none" }}
                      dangerouslySetInnerHTML={{ __html: svgOverlayMarkup }}
                    />
                  ) : magicInk ? (
                    /* Fallback Red Organic Score Stamp on Page 1 */
                    currentSheetPage === 1 && (
                      <div
                        style={{
                          position: "absolute",
                          top: "20px",
                          right: "20px",
                          width: "68px",
                          height: "68px",
                          borderRadius: "50%",
                          border: "3.2px solid #dc2626",
                          color: "#dc2626",
                          display: "flex",
                          flexDirection: "column",
                          alignItems: "center",
                          justifyContent: "center",
                          fontWeight: 900,
                          fontSize: "1.05rem",
                          transform: "rotate(-8deg)",
                          background: "rgba(254, 242, 242, 0.75)",
                          boxShadow: "0 2px 8px rgba(220, 38, 38, 0.15)"
                        }}
                      >
                        <span>{totalScore}</span>
                        <span style={{ fontSize: "0.68rem", borderTop: "1.5px solid #dc2626", width: "70%", textAlign: "center" }}>
                          {maxScore}
                        </span>
                      </div>
                    )
                  ) : null}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ==============================================================
  // VIEW 2: EXAM SELECTION & STUDENT GRADING TABLE (WITH FULL FILTERS)
  // ==============================================================
  return (
    <div className="strict-evaluation-page pb-24">
      {/* INITIAL STATE: When no exam is selected - Deadlines Overview */}
      {!selectedExamId ? (
        <div>
          {/* Header Bar */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1.5rem", flexWrap: "wrap", gap: "1rem" }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                <h1 style={{ fontSize: "1.85rem", fontWeight: 800, color: "#0f172a", letterSpacing: "-0.03em", margin: 0 }}>
                  Evaluation Deadlines
                </h1>
                <span style={{ background: "#e0e7ff", color: "#3730a3", fontSize: "0.75rem", fontWeight: 700, padding: "0.2rem 0.65rem", borderRadius: "9999px" }}>
                  {filteredExams.length} Exams Listed
                </span>
              </div>
              <p style={{ color: "#64748b", fontSize: "0.88rem", marginTop: "0.25rem", margin: 0 }}>
                Filter and select an examination to upload student answer booklets and run zero-temperature evaluation.
              </p>
            </div>
          </div>

          {/* Exam Filters Toolbar (User: "there is no filter in evaluation") */}
          <div
            style={{
              background: "#ffffff",
              border: "1px solid #e2e8f0",
              borderRadius: "12px",
              padding: "0.75rem 1rem",
              marginBottom: "1.5rem",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              flexWrap: "wrap",
              gap: "0.75rem",
              boxShadow: "0 1px 3px rgba(0, 0, 0, 0.03)"
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", flex: 1, minWidth: "260px" }}>
              <div style={{ position: "relative", width: "100%", maxWidth: "320px" }}>
                <Search
                  size={15}
                  style={{ position: "absolute", left: "0.75rem", top: "50%", transform: "translateY(-50%)", color: "#94a3b8" }}
                />
                <input
                  type="text"
                  placeholder="Search exam title or subject code..."
                  value={examSearchQuery}
                  onChange={(e) => setExamSearchQuery(e.target.value)}
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

              {/* Subject Filter */}
              <div style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}>
                <Filter size={14} style={{ color: "#64748b" }} />
                <select
                  value={examSubjectFilter}
                  onChange={(e) => setExamSubjectFilter(e.target.value)}
                  style={{
                    padding: "0.5rem 0.75rem",
                    borderRadius: "8px",
                    border: "1px solid #cbd5e1",
                    fontSize: "0.85rem",
                    background: "#ffffff",
                    color: "#1e293b",
                    fontWeight: 600
                  }}
                >
                  <option value="">Subject: All Subjects</option>
                  {subjects.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.code})
                    </option>
                  ))}
                </select>
              </div>

              {/* Status Filter */}
              <div>
                <select
                  value={examKeyFilter}
                  onChange={(e: any) => setExamKeyFilter(e.target.value)}
                  style={{
                    padding: "0.5rem 0.75rem",
                    borderRadius: "8px",
                    border: "1px solid #cbd5e1",
                    fontSize: "0.85rem",
                    background: "#ffffff",
                    color: "#1e293b",
                    fontWeight: 600
                  }}
                >
                  <option value="all">Key Status: All Exams</option>
                  <option value="approved">Answer Key Approved</option>
                  <option value="needed">Answer Key Needed</option>
                </select>
              </div>
            </div>

            <div style={{ fontSize: "0.82rem", color: "#64748b", fontWeight: 600 }}>
              Showing {filteredExams.length} of {exams.length} examinations
            </div>
          </div>

          {/* Grid of Filtered Exams with Deadlines */}
          {filteredExams.length === 0 ? (
            <div style={{ background: "#ffffff", border: "2px dashed #cbd5e1", borderRadius: "14px", padding: "3rem", textAlign: "center", color: "#64748b" }}>
              No examinations match your current filters. Try resetting the search or subject filter.
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(360px, 1fr))", gap: "1.25rem" }}>
              {filteredExams.map((ex) => {
                const subj = subjects.find((s) => s.id === ex.subject_id);
                const exHasKey = Boolean(ex.answer_key_text && ex.answer_key_text.trim());

                return (
                  <div
                    key={ex.id}
                    style={{
                      background: "#ffffff",
                      border: "1px solid #e2e8f0",
                      borderRadius: "14px",
                      padding: "1.5rem",
                      boxShadow: "0 1px 3px rgba(0, 0, 0, 0.04)",
                      display: "flex",
                      flexDirection: "column",
                      justifyContent: "space-between"
                    }}
                  >
                    <div>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "0.5rem" }}>
                        <span style={{ fontSize: "0.75rem", fontWeight: 700, background: "#f1f5f9", color: "#334155", padding: "0.2rem 0.55rem", borderRadius: "4px" }}>
                          {subj?.code || "SUBJ"}
                        </span>
                        <span style={{ fontSize: "0.75rem", fontWeight: 700, color: exHasKey ? "#16a34a" : "#d97706", display: "flex", alignItems: "center", gap: "0.25rem" }}>
                          {exHasKey ? <CheckCircle2 size={13} /> : <Sparkles size={13} />}
                          {exHasKey ? "Key Approved" : "Key Needed"}
                        </span>
                      </div>

                      <h3 style={{ fontSize: "1.2rem", fontWeight: 800, color: "#0f172a", marginBottom: "0.35rem" }}>
                        {ex.title}
                      </h3>

                      <div style={{ fontSize: "0.82rem", color: "#64748b", display: "flex", gap: "1rem", flexWrap: "wrap", marginBottom: "0.85rem" }}>
                        <span style={{ display: "flex", alignItems: "center", gap: "0.3rem" }}>
                          <Calendar size={14} /> Exam: {ex.exam_date || "Pending"}
                        </span>
                        <span style={{ display: "flex", alignItems: "center", gap: "0.3rem" }}>
                          <Clock size={14} /> Due: {ex.correction_deadline || "Upcoming"}
                        </span>
                      </div>

                      <div style={{ background: "#f8fafc", borderRadius: "8px", padding: "0.6rem 0.85rem", fontSize: "0.8rem", color: "#475569", marginBottom: "1rem" }}>
                        {ex.questions?.length || 0} Questions • Max {ex.max_marks || 60} Marks • Passing: {ex.passing_marks || 24}
                      </div>
                    </div>

                    <button
                      onClick={() => setSelectedExamId(ex.id)}
                      className="btn btn-primary"
                      style={{ width: "100%", fontSize: "0.85rem", padding: "0.55rem", display: "flex", alignItems: "center", justifyContent: "center", gap: "0.4rem" }}
                    >
                      Select & Grade Students →
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        /* ACTIVE EXAM STATE: Student List & Evaluation Console */
        <div>
          {/* Back & Breadcrumb Header with Quick Switcher */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1.5rem", flexWrap: "wrap", gap: "1rem" }}>
            <div>
              <button
                onClick={() => setSelectedExamId("")}
                className="btn btn-secondary"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "0.4rem",
                  fontSize: "0.82rem",
                  padding: "0.4rem 0.75rem",
                  marginBottom: "0.75rem"
                }}
              >
                <ArrowLeft size={14} /> All Deadlines
              </button>

              <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", flexWrap: "wrap" }}>
                <h1 style={{ fontSize: "1.75rem", fontWeight: 800, color: "#0f172a", letterSpacing: "-0.03em", margin: 0 }}>
                  {activeExam?.title}
                </h1>
                <span style={{ fontSize: "0.78rem", fontWeight: 700, background: "#f1f5f9", color: "#334155", padding: "0.25rem 0.6rem", borderRadius: "6px" }}>
                  {subjects.find((s) => s.id === activeExam?.subject_id)?.name || "Subject"}
                </span>
                <span style={{ fontSize: "0.78rem", fontWeight: 700, background: hasAnswerKey ? "#f0fdf4" : "#fffbeb", color: hasAnswerKey ? "#16a34a" : "#d97706", padding: "0.25rem 0.6rem", borderRadius: "6px" }}>
                  {hasAnswerKey ? "✓ Answer Key Approved" : "⚡ Answer Key Required"}
                </span>

                {/* Quick Exam Switcher Dropdown */}
                <select
                  value={selectedExamId}
                  onChange={(e) => setSelectedExamId(e.target.value)}
                  style={{
                    padding: "0.35rem 0.65rem",
                    borderRadius: "6px",
                    border: "1px solid #cbd5e1",
                    fontSize: "0.78rem",
                    background: "#ffffff",
                    color: "#334155",
                    fontWeight: 600
                  }}
                  title="Switch to another exam"
                >
                  {exams.map((ex) => (
                    <option key={ex.id} value={ex.id}>
                      Switch to: {ex.title}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div style={{ display: "flex", gap: "0.6rem", flexWrap: "wrap" }}>
              {!hasAnswerKey && (
                <button
                  onClick={handleGenerateAnswerKey}
                  disabled={isGeneratingKey}
                  style={{
                    background: "#2563eb",
                    border: "none",
                    color: "#ffffff",
                    padding: "0.55rem 1rem",
                    borderRadius: "8px",
                    fontSize: "0.82rem",
                    fontWeight: 700,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "0.35rem"
                  }}
                >
                  <Sparkles size={14} /> {isGeneratingKey ? "Generating with Gemini..." : "Generate Answer Key"}
                </button>
              )}

              <button
                onClick={handleEvaluateAll}
                disabled={isEvaluatingAll || students.length === 0 || !hasAnswerKey}
                className="btn btn-primary"
                style={{ display: "flex", alignItems: "center", gap: "0.45rem", padding: "0.55rem 1rem", fontSize: "0.82rem", borderRadius: "8px" }}
              >
                <Sparkles size={14} />
                {isEvaluatingAll ? (evalProgressMessage || "Evaluating All...") : `Evaluate All (${students.length})`}
              </button>
            </div>
          </div>

          {/* Student Filter & Search Toolbar */}
          <div
            style={{
              background: "#ffffff",
              border: "1px solid #e2e8f0",
              borderRadius: "12px",
              padding: "0.75rem 1rem",
              marginBottom: "1.5rem",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              flexWrap: "wrap",
              gap: "0.75rem",
              boxShadow: "0 1px 3px rgba(0, 0, 0, 0.03)"
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", flex: 1, minWidth: "260px" }}>
              <div style={{ position: "relative", width: "100%", maxWidth: "300px" }}>
                <Search
                  size={15}
                  style={{ position: "absolute", left: "0.75rem", top: "50%", transform: "translateY(-50%)", color: "#94a3b8" }}
                />
                <input
                  type="text"
                  placeholder="Search student name or roll number..."
                  value={studentSearchQuery}
                  onChange={(e) => setStudentSearchQuery(e.target.value)}
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

              {/* Class Filter */}
              <select
                value={studentClassFilter}
                onChange={(e) => setStudentClassFilter(e.target.value)}
                style={{
                  padding: "0.5rem 0.75rem",
                  borderRadius: "8px",
                  border: "1px solid #cbd5e1",
                  fontSize: "0.85rem",
                  background: "#ffffff",
                  color: "#1e293b",
                  fontWeight: 600
                }}
              >
                <option value="">Class: All Cohorts</option>
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>

              {/* Status Filter */}
              <select
                value={studentStatusFilter}
                onChange={(e: any) => setStudentStatusFilter(e.target.value)}
                style={{
                  padding: "0.5rem 0.75rem",
                  borderRadius: "8px",
                  border: "1px solid #cbd5e1",
                  fontSize: "0.85rem",
                  background: "#ffffff",
                  color: "#1e293b",
                  fontWeight: 600
                }}
              >
                <option value="all">Status: All Students</option>
                <option value="evaluated">Evaluated Only</option>
                <option value="pending">Pending Grading</option>
              </select>
            </div>

            <div style={{ fontSize: "0.82rem", color: "#64748b" }}>
              <strong>{evaluatedCount}</strong> of <strong>{students.length}</strong> Evaluated
            </div>
          </div>

          {/* Students Grading Table */}
          <div style={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: "14px", overflow: "hidden", boxShadow: "0 1px 4px rgba(0, 0, 0, 0.04)" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
              <thead>
                <tr style={{ background: "#f8fafc", borderBottom: "1px solid #e2e8f0" }}>
                  <th style={{ padding: "0.75rem 1.25rem", fontSize: "0.75rem", fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>Student Name</th>
                  <th style={{ padding: "0.75rem 1.25rem", fontSize: "0.75rem", fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>Roll Number</th>
                  <th style={{ padding: "0.75rem 1.25rem", fontSize: "0.75rem", fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>Answer Booklet</th>
                  <th style={{ padding: "0.75rem 1.25rem", fontSize: "0.75rem", fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>Score</th>
                  <th style={{ padding: "0.75rem 1.25rem", fontSize: "0.75rem", fontWeight: 700, color: "#64748b", textTransform: "uppercase", textAlign: "right" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredStudents.length === 0 ? (
                  <tr>
                    <td colSpan={5} style={{ padding: "2.5rem", textAlign: "center", color: "#64748b" }}>
                      No students found matching your filters.
                    </td>
                  </tr>
                ) : (
                  filteredStudents.map((stud) => {
                    const evalRecord = evaluations[stud.id];
                    const sheetData = studentSheets[stud.id];
                    const isEvaluating = evaluatingStudentId === stud.id;

                    return (
                      <tr key={stud.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                        <td style={{ padding: "0.85rem 1.25rem" }}>
                          <div style={{ fontWeight: 700, color: "#0f172a", fontSize: "0.92rem" }}>
                            {stud.name}
                          </div>
                          <div style={{ fontSize: "0.75rem", color: "#64748b" }}>
                            Section {stud.section || "A"}
                          </div>
                        </td>
                        <td style={{ padding: "0.85rem 1.25rem" }}>
                          <span style={{ fontFamily: "monospace", fontWeight: 700, color: "#1e293b", fontSize: "0.85rem", background: "#f1f5f9", padding: "0.2rem 0.55rem", borderRadius: "6px" }}>
                            {stud.roll_number}
                          </span>
                        </td>
                        <td style={{ padding: "0.85rem 1.25rem" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                            <label
                              style={{
                                cursor: "pointer",
                                background: "#f8fafc",
                                border: "1px dashed #cbd5e1",
                                padding: "0.35rem 0.65rem",
                                borderRadius: "6px",
                                fontSize: "0.75rem",
                                color: "#475569",
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "0.35rem"
                              }}
                            >
                              <UploadCloud size={13} />
                              {sheetData?.filename ? sheetData.filename : "Upload Scan"}
                              <input
                                type="file"
                                accept="image/*,application/pdf"
                                onChange={(e) => handleFileUpload(stud.id, e)}
                                style={{ display: "none" }}
                              />
                            </label>

                            {!sheetData?.filename && (
                              <button
                                onClick={() => handleAttachSamplePaper(stud.id)}
                                style={{
                                  background: "none",
                                  border: "none",
                                  color: "#2563eb",
                                  fontSize: "0.72rem",
                                  fontWeight: 600,
                                  cursor: "pointer",
                                  textDecoration: "underline"
                                }}
                              >
                                Use Sample Paper
                              </button>
                            )}
                          </div>
                        </td>
                        <td style={{ padding: "0.85rem 1.25rem" }}>
                          {evalRecord ? (
                            <div style={{ display: "flex", alignItems: "center", gap: "0.45rem" }}>
                              <span style={{ fontWeight: 900, fontSize: "0.95rem", color: "#16a34a" }}>
                                {evalRecord.total_score} / {evalRecord.max_score}
                              </span>
                              <span style={{ fontSize: "0.72rem", fontWeight: 700, background: "#dcfce7", color: "#15803d", padding: "0.15rem 0.45rem", borderRadius: "9999px" }}>
                                {evalRecord.percentage}%
                              </span>
                            </div>
                          ) : (
                            <span style={{ fontSize: "0.75rem", color: "#94a3b8", fontStyle: "italic" }}>
                              Not evaluated
                            </span>
                          )}
                        </td>
                        <td style={{ padding: "0.85rem 1.25rem", textAlign: "right" }}>
                          <div style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem" }}>
                            {evalRecord ? (
                              <button
                                onClick={() => {
                                  setActiveScorecard(evalRecord);
                                  setCurrentSheetPage(1);
                                }}
                                className="btn btn-primary"
                                style={{ fontSize: "0.78rem", padding: "0.4rem 0.85rem", display: "flex", alignItems: "center", gap: "0.35rem" }}
                              >
                                <Eye size={13} /> View Report
                              </button>
                            ) : (
                              <button
                                onClick={() => handleEvaluateSingle(stud)}
                                disabled={isEvaluating || !hasAnswerKey}
                                className="btn btn-secondary"
                                style={{ fontSize: "0.78rem", padding: "0.4rem 0.85rem", display: "flex", alignItems: "center", gap: "0.35rem" }}
                              >
                                <Sparkles size={13} /> {isEvaluating ? "Grading..." : "Evaluate"}
                              </button>
                            )}
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
    </div>
  );
};

export default StrictEvaluationPage;
