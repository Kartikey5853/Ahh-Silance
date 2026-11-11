import React, { useState, useEffect } from "react";
import { academicApi } from "../api/academicApi";
import type { Exam, Student, AcademicEvaluation, Subject } from "../types/academic";
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
  Send
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

  // Students and evaluations for selected exam
  const [students, setStudents] = useState<Student[]>([]);
  const [evaluations, setEvaluations] = useState<Record<string, AcademicEvaluation>>({});
  const [, setLoading] = useState(false);

  // Per-student uploaded files or sample text
  const [studentSheets, setStudentSheets] = useState<Record<string, { file?: File; text?: string; filename: string }>>({});

  // Active evaluation report (Image 7)
  const [activeScorecard, setActiveScorecard] = useState<AcademicEvaluation | null>(null);
  const [hideAnswerSheet, setHideAnswerSheet] = useState(false);
  const [sheetZoom, setSheetZoom] = useState(105);
  const [magicInk, setMagicInk] = useState(true);

  // Evaluating states
  const [evaluatingStudentId, setEvaluatingStudentId] = useState<string | null>(null);
  const [isEvaluatingAll, setIsEvaluatingAll] = useState(false);
  const [evalProgressMessage, setEvalProgressMessage] = useState<string | null>(null);
  const [isGeneratingKey, setIsGeneratingKey] = useState(false);

  // Filter & Search
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "evaluated" | "pending">("all");

  useEffect(() => {
    Promise.all([
      academicApi.listExams(),
      academicApi.listSubjects()
    ]).then(([exList, subjList]) => {
      setExams(exList);
      setSubjects(subjList);
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
        if (found) setActiveScorecard(found);
      } else if (initialStudentId) {
        const found = evalList.find((ev) => ev.student_id === initialStudentId);
        if (found) setActiveScorecard(found);
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
      // Update local exam state
      setExams((prev) =>
        prev.map((ex) => (ex.id === selectedExamId ? { ...ex, answer_key_text: res.answer_key_text } : ex))
      );
      alert("Master Answer Key & Rubrics generated successfully using Gemini! Grading is now enabled.");
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

  const filteredStudents = students.filter((s) => {
    const matchesSearch =
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.roll_number.toLowerCase().includes(searchQuery.toLowerCase());
    const isEval = Boolean(evaluations[s.id]);
    if (statusFilter === "evaluated") return matchesSearch && isEval;
    if (statusFilter === "pending") return matchesSearch && !isEval;
    return matchesSearch;
  });

  const evaluatedCount = students.filter((s) => Boolean(evaluations[s.id])).length;

  // ==============================================================
  // VIEW 1: FULLSCREEN SPLIT EVALUATION REPORT (Matching Image 7)
  // ==============================================================
  if (activeScorecard) {
    const totalScore = activeScorecard.total_score || 0;
    const maxScore = activeScorecard.max_score || 20;
    const percentage = activeScorecard.percentage || Math.round((totalScore / maxScore) * 100);

    const breakdown = activeScorecard.breakdown || [];
    const correctCount = breakdown.filter((b) => b.awarded_marks >= b.max_marks * 0.9).length;
    const partialCount = breakdown.filter((b) => b.awarded_marks > 0 && b.awarded_marks < b.max_marks * 0.9).length;
    const incorrectCount = breakdown.filter((b) => b.awarded_marks === 0).length;

    return (
      <div className="evaluation-report-view pb-16" style={{ background: "#0b132b", minHeight: "100vh", color: "#ffffff", margin: "-1.5rem", padding: "1.5rem" }}>
        {/* Top Navbar matching Image 7 */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #1e293b", paddingBottom: "1rem", marginBottom: "1.25rem", flexWrap: "wrap", gap: "1rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
            <button
              onClick={() => setActiveScorecard(null)}
              style={{ background: "#1e293b", border: "1px solid #334155", color: "#ffffff", padding: "0.45rem", borderRadius: "8px", cursor: "pointer" }}
            >
              <ArrowLeft size={16} />
            </button>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <h2 style={{ fontSize: "1.25rem", fontWeight: 800, margin: 0, color: "#ffffff" }}>
                  Evaluation Report
                </h2>
              </div>
              <div style={{ fontSize: "0.82rem", color: "#94a3b8" }}>
                {activeScorecard.student_name} • {totalScore}/{maxScore} marks
              </div>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
            <button
              onClick={() => setHideAnswerSheet(!hideAnswerSheet)}
              style={{
                background: "#1e293b",
                border: "1px solid #334155",
                color: "#e2e8f0",
                padding: "0.45rem 0.95rem",
                borderRadius: "8px",
                fontSize: "0.82rem",
                fontWeight: 600,
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
              onClick={() => alert("Downloading student scorecard PDF...")}
              style={{ background: "#1e293b", border: "1px solid #334155", color: "#e2e8f0", padding: "0.45rem", borderRadius: "8px", cursor: "pointer" }}
            >
              <Download size={16} />
            </button>
          </div>
        </div>

        {/* Split Screen Workspace */}
        <div style={{ display: "grid", gridTemplateColumns: hideAnswerSheet ? "1fr" : "1.1fr 0.9fr", gap: "1.25rem", minHeight: "78vh" }}>
          {/* LEFT HALF: Scorecard, Answer Map, Breakdown, Scope of Improvement */}
          <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem", overflowY: "auto", maxHeight: "82vh" }}>
            {/* Dark Blue Hero Score Card */}
            <div
              style={{
                background: "linear-gradient(135deg, #172554 0%, #0f172a 100%)",
                border: "1px solid #1e3a8a",
                borderRadius: "16px",
                padding: "1.5rem",
                boxShadow: "0 4px 20px rgba(0, 0, 0, 0.25)",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                flexWrap: "wrap",
                gap: "1.5rem"
              }}
            >
              <div>
                <div style={{ fontSize: "0.72rem", fontWeight: 800, color: "#60a5fa", letterSpacing: "0.05em", textTransform: "uppercase", marginBottom: "0.25rem" }}>
                  EVALUATION REPORT • {activeExam?.title || "EXAMINATION"}
                </div>
                <h1 style={{ fontSize: "1.85rem", fontWeight: 900, color: "#ffffff", margin: 0 }}>
                  {activeScorecard.student_name}
                </h1>
                <div style={{ fontSize: "0.82rem", color: "#93c5fd", marginTop: "0.35rem", display: "flex", gap: "0.75rem" }}>
                  <span>Evaluated 11 Nov 2026</span>
                  <span>•</span>
                  <span>{breakdown.length || 4} questions</span>
                </div>

                {/* Sub Stats Row */}
                <div style={{ display: "flex", gap: "1.25rem", marginTop: "1.25rem", fontSize: "0.85rem" }}>
                  <div>
                    <div style={{ fontSize: "1.2rem", fontWeight: 900, color: "#ffffff" }}>
                      {totalScore}/{maxScore}
                    </div>
                    <div style={{ fontSize: "0.72rem", color: "#94a3b8" }}>Total score</div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}>
                    <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#22c55e" }} />
                    <span style={{ fontWeight: 800 }}>{correctCount}</span> <span style={{ color: "#94a3b8", fontSize: "0.75rem" }}>Correct</span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}>
                    <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#f59e0b" }} />
                    <span style={{ fontWeight: 800 }}>{partialCount}</span> <span style={{ color: "#94a3b8", fontSize: "0.75rem" }}>Partial</span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}>
                    <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#ef4444" }} />
                    <span style={{ fontWeight: 800 }}>{incorrectCount}</span> <span style={{ color: "#94a3b8", fontSize: "0.75rem" }}>Incorrect</span>
                  </div>
                </div>
              </div>

              {/* Big Circular Score Ring */}
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                <div
                  style={{
                    width: "110px",
                    height: "110px",
                    borderRadius: "50%",
                    border: "5px solid #22c55e",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    background: "rgba(34, 197, 94, 0.1)",
                    boxShadow: "0 0 25px rgba(34, 197, 94, 0.25)"
                  }}
                >
                  <span style={{ fontSize: "1.45rem", fontWeight: 900, color: "#ffffff" }}>
                    {percentage}%
                  </span>
                  <span style={{ fontSize: "0.72rem", color: "#94a3b8" }}>
                    {totalScore}/{maxScore}
                  </span>
                </div>
                <div style={{ marginTop: "0.5rem", fontSize: "0.75rem", fontWeight: 800, color: "#4ade80", background: "rgba(34, 197, 94, 0.15)", padding: "0.15rem 0.55rem", borderRadius: "9999px" }}>
                  ★ Outstanding
                </div>
                <div style={{ fontSize: "0.72rem", color: "#94a3b8", marginTop: "0.2rem" }}>
                  98% overall score
                </div>
              </div>
            </div>

            {/* ANSWER MAP - the whole exam at a glance */}
            <div style={{ background: "#0f172a", border: "1px solid #1e293b", borderRadius: "14px", padding: "1.25rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.85rem" }}>
                <div style={{ fontSize: "0.85rem", fontWeight: 800, color: "#ffffff" }}>
                  ANSWER MAP <span style={{ color: "#94a3b8", fontWeight: 500 }}>— the whole exam at a glance</span>
                </div>
                <div style={{ display: "flex", gap: "0.75rem", fontSize: "0.72rem", color: "#94a3b8" }}>
                  <span style={{ display: "flex", alignItems: "center", gap: "0.25rem" }}>
                    <div style={{ width: "8px", height: "8px", borderRadius: "2px", background: "#22c55e" }} /> Full marks
                  </span>
                  <span style={{ display: "flex", alignItems: "center", gap: "0.25rem" }}>
                    <div style={{ width: "8px", height: "8px", borderRadius: "2px", background: "#f59e0b" }} /> Partially correct
                  </span>
                  <span style={{ display: "flex", alignItems: "center", gap: "0.25rem" }}>
                    <div style={{ width: "8px", height: "8px", borderRadius: "2px", background: "#ef4444" }} /> Incorrect
                  </span>
                </div>
              </div>

              {/* Number Tiles */}
              <div style={{ display: "flex", gap: "0.6rem" }}>
                {(breakdown.length > 0 ? breakdown : [{ q_no: "1" }, { q_no: "2" }, { q_no: "3" }, { q_no: "4" }]).map((q: any, qIdx: number) => {
                  const isFull = q.awarded_marks >= (q.max_marks || 5) * 0.9;
                  const isPartial = q.awarded_marks > 0 && !isFull;
                  const borderColor = isFull ? "#22c55e" : isPartial ? "#f59e0b" : "#ef4444";

                  return (
                    <button
                      key={qIdx}
                      style={{
                        width: "36px",
                        height: "36px",
                        borderRadius: "8px",
                        background: "#1e293b",
                        border: `2px solid ${borderColor}`,
                        color: borderColor,
                        fontWeight: 800,
                        fontSize: "0.88rem",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center"
                      }}
                    >
                      {qIdx + 1}
                    </button>
                  );
                })}
              </div>
              <div style={{ fontSize: "0.72rem", color: "#64748b", marginTop: "0.5rem" }}>
                Click a tile to jump to that question.
              </div>
            </div>

            {/* SECTION-WISE BREAKDOWN */}
            <div style={{ background: "#0f172a", border: "1px solid #1e293b", borderRadius: "14px", padding: "1.25rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.6rem" }}>
                <span style={{ fontSize: "0.82rem", fontWeight: 800, color: "#ffffff" }}>
                  SECTION-WISE BREAKDOWN
                </span>
                <span style={{ fontSize: "0.82rem", fontWeight: 800, color: "#60a5fa" }}>
                  {totalScore} / {maxScore}
                </span>
              </div>
              <div style={{ fontSize: "0.8rem", color: "#cbd5e1", marginBottom: "0.4rem" }}>Section A</div>
              <div style={{ width: "100%", height: "8px", background: "#1e293b", borderRadius: "9999px", overflow: "hidden" }}>
                <div style={{ width: `${percentage}%`, height: "100%", background: "#f59e0b", borderRadius: "9999px" }} />
              </div>
            </div>

            {/* SCOPE OF IMPROVEMENT */}
            <div style={{ background: "#0f172a", border: "1px solid #1e293b", borderRadius: "14px", padding: "1.25rem" }}>
              <div style={{ fontSize: "0.82rem", fontWeight: 800, color: "#ffffff", marginBottom: "0.75rem", textTransform: "uppercase" }}>
                Scope of Improvement
              </div>

              <div style={{ background: "#1e293b", border: "1px solid #334155", borderRadius: "10px", padding: "1rem" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.35rem" }}>
                  <span style={{ width: "20px", height: "20px", borderRadius: "4px", background: "#f59e0b", color: "#000000", fontSize: "0.72rem", fontWeight: 900, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    1
                  </span>
                  <span style={{ fontSize: "0.88rem", fontWeight: 800, color: "#ffffff" }}>
                    SLR Parsing Table Action Placement
                  </span>
                </div>
                <p style={{ fontSize: "0.8rem", color: "#cbd5e1", margin: 0, lineHeight: 1.5 }}>
                  {activeScorecard.teacher_feedback ||
                    "In SLR parsing table construction (Q1.a), ensure that reduce entries are systematically added to the ACTION table under every symbol in the FOLLOW set of the LHS non-terminal, including the endmarker '$'."}
                </p>
              </div>
            </div>

            {/* Footer Actions */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "auto", paddingTop: "1rem" }}>
              <span style={{ fontSize: "0.75rem", color: "#64748b" }}>
                Niera Academic AI • Zero Temperature Evaluation
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
                    background: "#1e293b",
                    border: "1px solid #334155",
                    color: "#e2e8f0",
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

          {/* RIGHT HALF: Evaluated Student Handwritten Answer Sheet Preview */}
          {!hideAnswerSheet && (
            <div style={{ background: "#0f172a", border: "1px solid #1e293b", borderRadius: "14px", padding: "1.25rem", display: "flex", flexDirection: "column" }}>
              {/* Top Controls Toolbar */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem", borderBottom: "1px solid #1e293b", paddingBottom: "0.5rem" }}>
                <button
                  onClick={() => setMagicInk(!magicInk)}
                  style={{
                    background: magicInk ? "#1e293b" : "transparent",
                    border: "1px solid #334155",
                    color: magicInk ? "#60a5fa" : "#94a3b8",
                    padding: "0.3rem 0.65rem",
                    borderRadius: "6px",
                    fontSize: "0.75rem",
                    fontWeight: 700,
                    cursor: "pointer"
                  }}
                >
                  {magicInk ? "✓ MagicInk On" : "Turn on MagicInk"}
                </button>

                <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
                  <span style={{ fontSize: "0.75rem", color: "#94a3b8" }}>1 / 17</span>
                  <span style={{ fontSize: "0.75rem", color: "#94a3b8" }}>{sheetZoom}%</span>
                  <input
                    type="range"
                    min="60"
                    max="180"
                    value={sheetZoom}
                    onChange={(e) => setSheetZoom(Number(e.target.value))}
                    style={{ width: "70px" }}
                  />
                  <button style={{ background: "none", border: "none", color: "#94a3b8", cursor: "pointer" }}>
                    <Download size={15} />
                  </button>
                </div>
              </div>

              {/* Sheet Canvas Container */}
              <div style={{ flex: 1, overflow: "auto", background: "#f1f5f9", borderRadius: "10px", padding: "1.5rem", display: "flex", justifyContent: "center", alignItems: "flex-start", position: "relative" }}>
                <div style={{ width: `${sheetZoom * 4.5}px`, transition: "width 0.15s ease", position: "relative" }}>
                  <img
                    src="/sample-evaluated-sheet.png"
                    alt="Evaluated Student Answer Booklet"
                    style={{ width: "100%", height: "auto", display: "block", borderRadius: "6px", boxShadow: "0 4px 16px rgba(0,0,0,0.2)" }}
                  />
                  {/* Red Score Circle Stamp on upper right */}
                  <div
                    style={{
                      position: "absolute",
                      top: "20px",
                      right: "20px",
                      width: "65px",
                      height: "65px",
                      borderRadius: "50%",
                      border: "3px solid #dc2626",
                      color: "#dc2626",
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      justifyContent: "center",
                      fontWeight: 900,
                      fontSize: "1rem",
                      transform: "rotate(-10deg)",
                      background: "rgba(254, 242, 242, 0.7)"
                    }}
                  >
                    <span>{totalScore}</span>
                    <span style={{ fontSize: "0.65rem", borderTop: "1px solid #dc2626" }}>{maxScore}</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ==============================================================
  // VIEW 2: EXAM SELECTION & STUDENT GRADING TABLE
  // ==============================================================
  return (
    <div className="strict-evaluation-page pb-24">
      {/* INITIAL STATE: When no exam is selected - Deadlines Overview */}
      {!selectedExamId ? (
        <div>
          {/* Header */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1.5rem", flexWrap: "wrap", gap: "1rem" }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                <h1 style={{ fontSize: "1.85rem", fontWeight: 800, color: "#0f172a", letterSpacing: "-0.03em", margin: 0 }}>
                  Evaluation Deadlines
                </h1>
                <span style={{ background: "#e0e7ff", color: "#3730a3", fontSize: "0.75rem", fontWeight: 700, padding: "0.2rem 0.65rem", borderRadius: "9999px" }}>
                  {exams.length} Pending Exams
                </span>
              </div>
              <p style={{ color: "#64748b", fontSize: "0.88rem", marginTop: "0.25rem", margin: 0 }}>
                Select an examination to upload student answer booklets and run zero-temperature evaluation.
              </p>
            </div>
          </div>

          {/* Grid of Exams with Deadlines */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(360px, 1fr))", gap: "1.25rem" }}>
            {exams.map((ex) => {
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
        </div>
      ) : (
        /* ACTIVE EXAM STATE: Student List & Evaluation Console */
        <div>
          {/* Back & Breadcrumb Header */}
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

          {/* ANSWER KEY REQUIRED WARNING BANNER */}
          {!hasAnswerKey && (
            <div
              style={{
                background: "#fffbeb",
                border: "1px solid #fde68a",
                borderRadius: "12px",
                padding: "1rem 1.25rem",
                marginBottom: "1.5rem",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                flexWrap: "wrap",
                gap: "1rem"
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                <AlertCircle size={20} style={{ color: "#d97706" }} />
                <div>
                  <div style={{ fontSize: "0.92rem", fontWeight: 800, color: "#92400e" }}>
                    Answer Key Required Before Grading
                  </div>
                  <div style={{ fontSize: "0.82rem", color: "#b45309" }}>
                    Strict zero-temperature grading cannot run without an approved master answer key. Generate with Gemini or create rubrics.
                  </div>
                </div>
              </div>

              <button
                onClick={handleGenerateAnswerKey}
                disabled={isGeneratingKey}
                style={{
                  background: "#d97706",
                  color: "#ffffff",
                  border: "none",
                  padding: "0.5rem 1rem",
                  borderRadius: "8px",
                  fontSize: "0.82rem",
                  fontWeight: 700,
                  cursor: "pointer"
                }}
              >
                {isGeneratingKey ? "Generating with Gemini..." : "✨ Generate Answer Key with Gemini"}
              </button>
            </div>
          )}

          {/* Search and Filters Bar */}
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
                <Search size={16} style={{ position: "absolute", left: "0.75rem", top: "50%", transform: "translateY(-50%)", color: "#94a3b8" }} />
                <input
                  type="text"
                  placeholder="Search enrolled students..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{ width: "100%", padding: "0.5rem 0.75rem 0.5rem 2.25rem", borderRadius: "8px", border: "1px solid #cbd5e1", fontSize: "0.85rem", outline: "none" }}
                />
              </div>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                style={{ padding: "0.5rem 0.75rem", borderRadius: "8px", border: "1px solid #cbd5e1", fontSize: "0.85rem", background: "#ffffff", color: "#1e293b", fontWeight: 500 }}
              >
                <option value="all">Status: All</option>
                <option value="evaluated">Status: Evaluated</option>
                <option value="pending">Status: Pending</option>
              </select>
            </div>

            <div style={{ fontSize: "0.82rem", color: "#64748b", fontWeight: 600 }}>
              Showing {filteredStudents.length} of {students.length} students ({evaluatedCount} Evaluated)
            </div>
          </div>

          {/* Student Roster Table for Evaluation */}
          <div style={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: "14px", overflow: "hidden", boxShadow: "0 1px 4px rgba(0, 0, 0, 0.04)" }}>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
                <thead>
                  <tr style={{ background: "#f8fafc", borderBottom: "1px solid #e2e8f0" }}>
                    <th style={{ padding: "0.85rem 1rem", fontSize: "0.75rem", fontWeight: 700, color: "#64748b", textTransform: "uppercase", width: "45px" }}>#</th>
                    <th style={{ padding: "0.85rem 1rem", fontSize: "0.75rem", fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>Student Name</th>
                    <th style={{ padding: "0.85rem 1rem", fontSize: "0.75rem", fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>Roll Number</th>
                    <th style={{ padding: "0.85rem 1rem", fontSize: "0.75rem", fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>Answer Sheet</th>
                    <th style={{ padding: "0.85rem 1rem", fontSize: "0.75rem", fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>Score</th>
                    <th style={{ padding: "0.85rem 1rem", fontSize: "0.75rem", fontWeight: 700, color: "#64748b", textTransform: "uppercase", textAlign: "right" }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredStudents.length === 0 ? (
                    <tr>
                      <td colSpan={6} style={{ padding: "3rem 1.5rem", textAlign: "center", color: "#64748b" }}>
                        No students found for this examination.
                      </td>
                    </tr>
                  ) : (
                    filteredStudents.map((stud, idx) => {
                      const evalRecord = evaluations[stud.id];
                      const sheet = studentSheets[stud.id];
                      const isEvaluatingThis = evaluatingStudentId === stud.id;

                      return (
                        <tr
                          key={stud.id}
                          style={{ borderBottom: "1px solid #f1f5f9", transition: "background 0.15s ease" }}
                          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#f8fafc")}
                          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "#ffffff")}
                        >
                          <td style={{ padding: "0.85rem 1rem", fontSize: "0.85rem", color: "#94a3b8", fontWeight: 600 }}>{idx + 1}</td>
                          <td style={{ padding: "0.85rem 1rem" }}>
                            <div style={{ fontWeight: 700, color: "#0f172a", fontSize: "0.9rem" }}>{stud.name}</div>
                            <div style={{ fontSize: "0.75rem", color: "#64748b" }}>Section {stud.section || "A"}</div>
                          </td>
                          <td style={{ padding: "0.85rem 1rem" }}>
                            <span style={{ fontFamily: "monospace", fontWeight: 700, color: "#1e293b", fontSize: "0.85rem", background: "#f1f5f9", padding: "0.2rem 0.5rem", borderRadius: "6px" }}>
                              {stud.roll_number}
                            </span>
                          </td>
                          <td style={{ padding: "0.85rem 1rem" }}>
                            {sheet ? (
                              <span style={{ display: "inline-flex", alignItems: "center", gap: "0.3rem", background: "#f0fdf4", color: "#166534", padding: "0.25rem 0.6rem", borderRadius: "6px", fontSize: "0.78rem", fontWeight: 600 }}>
                                <CheckCircle2 size={13} /> {sheet.filename}
                              </span>
                            ) : (
                              <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
                                <label style={{ fontSize: "0.78rem", color: "#2563eb", fontWeight: 600, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: "0.3rem" }}>
                                  <UploadCloud size={14} /> Upload Sheet
                                  <input type="file" accept=".pdf,.png,.jpg,.jpeg" onChange={(e) => handleFileUpload(stud.id, e)} style={{ display: "none" }} />
                                </label>
                                <button
                                  type="button"
                                  onClick={() => handleAttachSamplePaper(stud.id)}
                                  style={{ background: "transparent", border: "none", color: "#64748b", fontSize: "0.75rem", cursor: "pointer", textDecoration: "underline" }}
                                >
                                  Sample
                                </button>
                              </div>
                            )}
                          </td>
                          <td style={{ padding: "0.85rem 1rem" }}>
                            {evalRecord ? (
                              <div>
                                <span style={{ fontSize: "1rem", fontWeight: 800, color: "#0f172a" }}>{evalRecord.total_score}</span>
                                <span style={{ fontSize: "0.8rem", color: "#64748b" }}> / {evalRecord.max_score}</span>
                                <div style={{ fontSize: "0.72rem", color: "#16a34a", fontWeight: 700 }}>{evalRecord.percentage}% • {evalRecord.grade}</div>
                              </div>
                            ) : (
                              <span style={{ fontSize: "0.82rem", color: "#94a3b8" }}>— / {activeExam?.max_marks || 60}</span>
                            )}
                          </td>
                          <td style={{ padding: "0.85rem 1rem", textAlign: "right" }}>
                            {evalRecord ? (
                              <button
                                onClick={() => setActiveScorecard(evalRecord)}
                                className="btn btn-secondary"
                                style={{ fontSize: "0.8rem", padding: "0.4rem 0.85rem" }}
                              >
                                View Report
                              </button>
                            ) : (
                              <button
                                onClick={() => handleEvaluateSingle(stud)}
                                disabled={isEvaluatingThis || !hasAnswerKey}
                                className="btn btn-primary"
                                style={{ fontSize: "0.8rem", padding: "0.4rem 0.85rem" }}
                              >
                                {isEvaluatingThis ? "Grading..." : "Evaluate"}
                              </button>
                            )}
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
    </div>
  );
};