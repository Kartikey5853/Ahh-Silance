import React, { useState, useEffect } from "react";
import { academicApi } from "../api/academicApi";
import type { Exam, Student, AcademicEvaluation, Subject } from "../types/academic";
import {
  Sparkles,
  UploadCloud,
  FileCheck2,
  CheckCircle2,
  Clock,
  Search,
  RefreshCw,
  X,
  AlertCircle,
  ArrowLeft,
  Calendar
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
  onNavigate
}) => {
  const [exams, setExams] = useState<Exam[]>([]);
  const [selectedExamId, setSelectedExamId] = useState<string>(initialExamId || "");
  const [subjects, setSubjects] = useState<Subject[]>([]);

  // Students and evaluations for selected exam
  const [students, setStudents] = useState<Student[]>([]);
  const [evaluations, setEvaluations] = useState<Record<string, AcademicEvaluation>>({});
  const [loading, setLoading] = useState(false);

  // Per-student uploaded files or sample text
  const [studentSheets, setStudentSheets] = useState<Record<string, { file?: File; text?: string; filename: string }>>({});

  // Active evaluation modal
  const [activeScorecard, setActiveScorecard] = useState<AcademicEvaluation | null>(null);

  // Evaluating states
  const [evaluatingStudentId, setEvaluatingStudentId] = useState<string | null>(null);
  const [isEvaluatingAll, setIsEvaluatingAll] = useState(false);
  const [evalProgressMessage, setEvalProgressMessage] = useState<string | null>(null);

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
  }, [selectedExamId, exams, initialEvalId, initialStudentId]);

  const activeExam = exams.find((e) => e.id === selectedExamId);
  const activeSubject = activeExam ? subjects.find((s) => s.id === activeExam.subject_id) : null;

  const handleStudentFileUpload = (studentId: string, file: File) => {
    setStudentSheets((prev) => ({
      ...prev,
      [studentId]: {
        file: file,
        filename: file.name
      }
    }));
  };

  const handleAttachSamplePaper = (studentId: string) => {
    setStudentSheets((prev) => ({
      ...prev,
      [studentId]: {
        text:
          "STUDENT ANSWER SHEET\n" +
          "Course: Academic Examination\n\n" +
          "ANS TO PART A:\n" +
          "Q1.a: CBOW predicts target center word from context averages. Skip-gram predicts surrounding words from center token.\n" +
          "Q1.b: Attention(Q,K,V) = softmax(Q K^T / sqrt(d_k)) * V. Scaling prevents vanishing gradients.\n" +
          "Q1.c: Perplexity is PPL = exp(loss). Lower is superior.\n" +
          "Q1.d: Overfitting occurs when a model performs equally well on train and test data.\n" +
          "Q1.e: BPE iteratively merges frequent character pairs to prevent OOV.\n" +
          "Q1.f: LoRA decomposes weight updates into low-rank matrices W_0 + B*A.\n" +
          "Q1.g: Softmax normalizes logits into probability distribution summing to 1.\n" +
          "Q1.i: Self-attention enables tokens to attend to all positions in parallel.\n" +
          "Q1.j: Cross-entropy measures divergence between predicted and true distributions.\n\n" +
          "ANS TO PART B:\n" +
          "Q3 (Unit 1): Detailed 3-page formulation of Attention mechanisms, multi-head projections, and scale factor derivations (~540 words).\n" +
          "Q4 (Unit 2): Comprehensive 3-page mathematical analysis of Word2Vec negative sampling and contrastive loss (~540 words).\n" +
          "Q7 (Unit 3): Exhaustive 3-page walkthrough of Transformer encoder-decoder cross-attention and causal masking (~540 words).\n" +
          "Q8 (Unit 4): 3-page derivations of Subword tokenization and vocabulary compression algorithms (~540 words).\n" +
          "Q11 (Unit 5): Brief 1-page summary (~180 words) of K-Means and Expectation Maximization without full proofs.",
        filename: "sample_handwritten_sheet.pdf"
      }
    }));
  };

  const handleEvaluateSingle = async (student: Student) => {
    if (!selectedExamId) return;
    const sheetData = studentSheets[student.id];
    const file = sheetData?.file;
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
    } catch (err) {
      alert(`Evaluation failed for ${student.name}. Please check connection.`);
    } finally {
      setEvaluatingStudentId(null);
      setEvalProgressMessage(null);
    }
  };

  const handleEvaluateAll = async () => {
    if (!selectedExamId) return;
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
      alert("Batch evaluation error. Evaluating available student sheets individually...");
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

  const getDeadlineStatus = (deadlineStr?: string) => {
    if (!deadlineStr) return { text: "No deadline", isOverdue: false, isNear: false, color: "#64748b", bg: "#f1f5f9" };
    const d = new Date(deadlineStr);
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    d.setHours(0, 0, 0, 0);
    const diffDays = Math.ceil((d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays < 0) {
      return { text: `Overdue by ${Math.abs(diffDays)}d`, isOverdue: true, isNear: false, color: "#dc2626", bg: "#fef2f2" };
    } else if (diffDays === 0) {
      return { text: "Due Today", isOverdue: false, isNear: true, color: "#ea580c", bg: "#fff7ed" };
    } else if (diffDays <= 3) {
      return { text: `${diffDays} days left`, isOverdue: false, isNear: true, color: "#ea580c", bg: "#fff7ed" };
    } else {
      return { text: `${diffDays} days left`, isOverdue: false, isNear: false, color: "#0369a1", bg: "#e0f2fe" };
    }
  };

  return (
    <div className="strict-evaluation-page pb-24" style={{ maxWidth: "1280px", margin: "0 auto", padding: "0 1rem" }}>
      {/* INITIAL STATE: When no exam is selected - Deadlines Overview */}
      {!selectedExamId ? (
        <div>
          {/* Header */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1.5rem", flexWrap: "wrap", gap: "1rem" }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                <h1 style={{ fontSize: "1.75rem", fontWeight: 800, color: "#0f172a", letterSpacing: "-0.03em", margin: 0 }}>
                  Evaluation Deadlines
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
                  {exams.length} {exams.length === 1 ? "exam" : "exams"}
                </span>
              </div>
              <p style={{ color: "#64748b", fontSize: "0.88rem", marginTop: "0.25rem", margin: 0 }}>
                Correction deadlines and student paper grading schedules
              </p>
            </div>

            <button
              onClick={() => onNavigate("exams")}
              className="btn btn-primary"
              style={{ display: "flex", alignItems: "center", gap: "0.45rem", padding: "0.6rem 1.1rem", fontSize: "0.88rem", borderRadius: "8px" }}
            >
              + Create Examination
            </button>
          </div>

          {/* Examinations Deadlines Table */}
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
                      Max Marks
                    </th>
                    <th style={{ padding: "0.85rem 1rem", fontSize: "0.75rem", fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em", textAlign: "right" }}>
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {exams.length === 0 ? (
                    <tr>
                      <td colSpan={7} style={{ padding: "3rem 1.5rem", textAlign: "center", color: "#64748b" }}>
                        <div style={{ display: "inline-flex", padding: "1rem", background: "#f1f5f9", borderRadius: "50%", color: "#94a3b8", marginBottom: "0.75rem" }}>
                          <FileCheck2 size={32} />
                        </div>
                        <div style={{ fontSize: "1rem", fontWeight: 700, color: "#0f172a", marginBottom: "0.25rem" }}>
                          No Scheduled Examinations
                        </div>
                        <p style={{ fontSize: "0.85rem", color: "#64748b", margin: 0, marginBottom: "1rem" }}>
                          Schedule an examination and set correction submission deadlines to grade papers here.
                        </p>
                        <button
                          onClick={() => onNavigate("exams")}
                          className="btn btn-primary"
                          style={{ fontSize: "0.85rem", padding: "0.5rem 1rem" }}
                        >
                          + Create Examination
                        </button>
                      </td>
                    </tr>
                  ) : (
                    exams.map((ex, idx) => {
                      const subj = subjects.find((s) => s.id === ex.subject_id);
                      const dInfo = getDeadlineStatus(ex.correction_deadline);
                      return (
                        <tr
                          key={ex.id}
                          style={{
                            borderBottom: "1px solid #f1f5f9",
                            transition: "background 0.15s ease",
                            cursor: "pointer"
                          }}
                          onClick={() => setSelectedExamId(ex.id)}
                          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#f8fafc")}
                          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "#ffffff")}
                        >
                          <td style={{ padding: "0.85rem 0.75rem", fontSize: "0.85rem", color: "#94a3b8", fontWeight: 600 }}>
                            {idx + 1}
                          </td>
                          <td style={{ padding: "0.85rem 1rem" }}>
                            <div style={{ fontWeight: 700, color: "#0f172a", fontSize: "0.9rem" }}>
                              {ex.title}
                            </div>
                            <div style={{ fontSize: "0.75rem", color: "#64748b" }}>
                              {ex.exam_type || "Semester Exam"} • {ex.academic_year || "2026-2027"}
                            </div>
                          </td>
                          <td style={{ padding: "0.85rem 1rem" }}>
                            <span
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "0.3rem",
                                background: "#f1f5f9",
                                color: "#1e293b",
                                padding: "0.2rem 0.55rem",
                                borderRadius: "6px",
                                fontSize: "0.8rem",
                                fontWeight: 600
                              }}
                            >
                              {subj ? `${subj.name} (${subj.code})` : "General Subject"}
                            </span>
                          </td>
                          <td style={{ padding: "0.85rem 1rem", fontSize: "0.85rem", color: "#475569" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}>
                              <Calendar size={13} style={{ color: "#94a3b8" }} />
                              {ex.exam_date || "—"}
                            </div>
                          </td>
                          <td style={{ padding: "0.85rem 1rem" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: "0.45rem" }}>
                              <span style={{ fontSize: "0.85rem", color: "#1e293b", fontWeight: 600 }}>
                                {ex.correction_deadline || "—"}
                              </span>
                              {ex.correction_deadline && (
                                <span
                                  style={{
                                    fontSize: "0.72rem",
                                    fontWeight: 700,
                                    padding: "0.15rem 0.45rem",
                                    borderRadius: "4px",
                                    background: dInfo.bg,
                                    color: dInfo.color
                                  }}
                                >
                                  {dInfo.text}
                                </span>
                              )}
                            </div>
                          </td>
                          <td style={{ padding: "0.85rem 1rem", fontSize: "0.85rem", fontWeight: 700, color: "#0f172a" }}>
                            {ex.max_marks || 60.0}
                          </td>
                          <td style={{ padding: "0.85rem 1rem", textAlign: "right" }}>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedExamId(ex.id);
                              }}
                              className="btn btn-primary"
                              style={{ padding: "0.4rem 0.85rem", fontSize: "0.8rem", borderRadius: "6px" }}
                            >
                              Evaluate Papers →
                            </button>
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
      ) : (
        /* ACTIVE EXAM STATE: Top bar with deadlines + Vantis Table of Students */
        <div>
          <button
            onClick={() => setSelectedExamId("")}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "0.4rem",
              background: "transparent",
              border: "none",
              color: "#0284c7",
              fontWeight: 700,
              fontSize: "0.85rem",
              cursor: "pointer",
              padding: 0,
              marginBottom: "1rem"
            }}
          >
            <ArrowLeft size={16} />
            Back to Evaluation Deadlines
          </button>

          {/* Header Bar */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1.5rem", flexWrap: "wrap", gap: "1rem" }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", flexWrap: "wrap" }}>
                <h1 style={{ fontSize: "1.65rem", fontWeight: 800, color: "#0f172a", letterSpacing: "-0.03em", margin: 0 }}>
                  {activeExam?.title || "Examination Evaluation"}
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
                  {activeExam?.exam_type || "Exam"}
                </span>
                <span
                  style={{
                    background: "#f1f5f9",
                    color: "#334155",
                    fontSize: "0.75rem",
                    fontWeight: 700,
                    padding: "0.2rem 0.65rem",
                    borderRadius: "9999px"
                  }}
                >
                  Total: {activeExam?.max_marks || 60.0} Marks
                </span>
              </div>
              <p style={{ color: "#64748b", fontSize: "0.88rem", marginTop: "0.3rem", margin: 0 }}>
                Subject: {activeSubject?.name || "Subject"} ({activeSubject?.code || ""}) • Exam Date: {activeExam?.exam_date || "—"} • Correction Deadline: {activeExam?.correction_deadline || "Upcoming"}
              </p>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
              <select
                value={selectedExamId}
                onChange={(e) => setSelectedExamId(e.target.value)}
                style={{
                  padding: "0.55rem 0.85rem",
                  borderRadius: "8px",
                  border: "1px solid #cbd5e1",
                  fontSize: "0.85rem",
                  background: "#ffffff",
                  color: "#1e293b",
                  fontWeight: 600
                }}
              >
                {exams.map((ex) => (
                  <option key={ex.id} value={ex.id}>
                    {ex.title}
                  </option>
                ))}
              </select>

              <button
                onClick={handleEvaluateAll}
                disabled={isEvaluatingAll || students.length === 0}
                className="btn btn-primary"
                style={{ display: "flex", alignItems: "center", gap: "0.45rem", padding: "0.55rem 1rem", fontSize: "0.85rem", borderRadius: "8px" }}
              >
                <Sparkles size={15} />
                {isEvaluatingAll ? "Evaluating All..." : "Evaluate All"}
              </button>
            </div>
          </div>

          {/* Correction Deadline Alert Banner */}
          {activeExam?.correction_deadline && (
            <div
              style={{
                background: "#f0f9ff",
                border: "1px solid #bae6fd",
                borderRadius: "12px",
                padding: "0.75rem 1rem",
                marginBottom: "1.25rem",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                flexWrap: "wrap",
                gap: "0.5rem"
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
                <Clock size={16} style={{ color: "#0284c7" }} />
                <span style={{ fontSize: "0.85rem", color: "#0369a1", fontWeight: 600 }}>
                  Submission Deadline: Grade and finalize papers by <strong>{activeExam.correction_deadline}</strong>.
                </span>
              </div>
              <span style={{ fontSize: "0.8rem", color: "#0284c7", fontWeight: 700 }}>
                {evaluatedCount} of {students.length} completed
              </span>
            </div>
          )}

          {evalProgressMessage && (
            <div
              style={{
                background: "#f8fafc",
                border: "1px solid #e2e8f0",
                borderRadius: "10px",
                padding: "0.75rem 1rem",
                marginBottom: "1.25rem",
                display: "flex",
                alignItems: "center",
                gap: "0.6rem",
                fontSize: "0.85rem",
                color: "#0f172a",
                fontWeight: 600
              }}
            >
              <RefreshCw size={15} className="spin" style={{ color: "#0284c7" }} />
              {evalProgressMessage}
            </div>
          )}

          {/* Search & Filters Bar */}
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
                  placeholder="Search enrolled students..."
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

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
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
                <option value="all">Status: All</option>
                <option value="evaluated">Status: Evaluated</option>
                <option value="pending">Status: Pending</option>
              </select>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
              <div style={{ fontSize: "0.82rem", color: "#64748b", fontWeight: 600 }}>
                Showing {filteredStudents.length} of {students.length} students
              </div>
              {loading && <RefreshCw size={14} className="spin" style={{ color: "#0284c7" }} />}
            </div>
          </div>

          {/* Vantis-Style Student Table */}
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
                      Student Name
                    </th>
                    <th style={{ padding: "0.85rem 1rem", fontSize: "0.75rem", fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                      Roll Number
                    </th>
                    <th style={{ padding: "0.85rem 1rem", fontSize: "0.75rem", fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                      Answer Sheet
                    </th>
                    <th style={{ padding: "0.85rem 1rem", fontSize: "0.75rem", fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                      Score
                    </th>
                    <th style={{ padding: "0.85rem 1rem", fontSize: "0.75rem", fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em", textAlign: "right" }}>
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredStudents.length === 0 ? (
                    <tr>
                      <td colSpan={6} style={{ padding: "3rem 1.5rem", textAlign: "center", color: "#64748b" }}>
                        <div style={{ fontSize: "1rem", fontWeight: 700, color: "#0f172a", marginBottom: "0.25rem" }}>
                          No Students Found for this Examination
                        </div>
                        <p style={{ fontSize: "0.85rem", color: "#64748b", margin: 0, marginBottom: "1rem" }}>
                          Enrolled students for this subject will automatically appear here.
                        </p>
                        <button
                          onClick={() => onNavigate("students")}
                          className="btn btn-primary"
                          style={{ fontSize: "0.85rem", padding: "0.5rem 1rem" }}
                        >
                          + Enroll Students First
                        </button>
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
                            <div>
                              <div style={{ fontWeight: 700, color: "#0f172a", fontSize: "0.9rem" }}>
                                {stud.name}
                              </div>
                              <div style={{ fontSize: "0.75rem", color: "#64748b" }}>
                                Section {stud.section || "A"} {stud.email ? `• ${stud.email}` : ""}
                              </div>
                            </div>
                          </td>
                          <td style={{ padding: "0.85rem 1rem" }}>
                            <span
                              style={{
                                fontFamily: "monospace",
                                fontWeight: 700,
                                color: "#1e293b",
                                fontSize: "0.85rem",
                                background: "#f1f5f9",
                                padding: "0.2rem 0.5rem",
                                borderRadius: "6px"
                              }}
                            >
                              {stud.roll_number}
                            </span>
                          </td>
                          <td style={{ padding: "0.85rem 1rem" }}>
                            {sheet ? (
                              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                                <span
                                  style={{
                                    display: "inline-flex",
                                    alignItems: "center",
                                    gap: "0.3rem",
                                    background: "#f0fdf4",
                                    color: "#166534",
                                    padding: "0.25rem 0.6rem",
                                    borderRadius: "6px",
                                    fontSize: "0.78rem",
                                    fontWeight: 600
                                  }}
                                >
                                  <CheckCircle2 size={13} />
                                  {sheet.filename}
                                </span>
                                <label
                                  style={{
                                    fontSize: "0.75rem",
                                    color: "#0284c7",
                                    cursor: "pointer",
                                    textDecoration: "underline"
                                  }}
                                >
                                  Change
                                  <input
                                    type="file"
                                    accept=".pdf,.png,.jpg,.jpeg,.txt"
                                    onChange={(e) => {
                                      if (e.target.files?.[0]) {
                                        handleStudentFileUpload(stud.id, e.target.files[0]);
                                      }
                                    }}
                                    style={{ display: "none" }}
                                  />
                                </label>
                              </div>
                            ) : (
                              <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
                                <label
                                  style={{
                                    display: "inline-flex",
                                    alignItems: "center",
                                    gap: "0.35rem",
                                    padding: "0.3rem 0.65rem",
                                    background: "#f8fafc",
                                    border: "1px dashed #cbd5e1",
                                    borderRadius: "6px",
                                    color: "#475569",
                                    fontSize: "0.78rem",
                                    fontWeight: 600,
                                    cursor: "pointer"
                                  }}
                                >
                                  <UploadCloud size={13} />
                                  Upload Sheet
                                  <input
                                    type="file"
                                    accept=".pdf,.png,.jpg,.jpeg,.txt"
                                    onChange={(e) => {
                                      if (e.target.files?.[0]) {
                                        handleStudentFileUpload(stud.id, e.target.files[0]);
                                      }
                                    }}
                                    style={{ display: "none" }}
                                  />
                                </label>
                                <button
                                  type="button"
                                  onClick={() => handleAttachSamplePaper(stud.id)}
                                  style={{
                                    background: "transparent",
                                    border: "none",
                                    color: "#0369a1",
                                    fontSize: "0.75rem",
                                    fontWeight: 600,
                                    cursor: "pointer",
                                    textDecoration: "underline"
                                  }}
                                >
                                  Use Sample
                                </button>
                              </div>
                            )}
                          </td>
                          <td style={{ padding: "0.85rem 1rem" }}>
                            {evalRecord ? (
                              <div>
                                <div style={{ display: "flex", alignItems: "baseline", gap: "0.35rem" }}>
                                  <span style={{ fontSize: "1rem", fontWeight: 800, color: "#0f172a" }}>
                                    {evalRecord.total_score}
                                  </span>
                                  <span style={{ fontSize: "0.8rem", color: "#64748b", fontWeight: 600 }}>
                                    / {evalRecord.max_score}
                                  </span>
                                </div>
                                <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", marginTop: "0.15rem" }}>
                                  <span
                                    style={{
                                      fontSize: "0.72rem",
                                      fontWeight: 700,
                                      background: "#f0fdf4",
                                      color: "#16a34a",
                                      padding: "0.1rem 0.45rem",
                                      borderRadius: "4px"
                                    }}
                                  >
                                    {evalRecord.percentage}%
                                  </span>
                                  <span style={{ fontSize: "0.72rem", color: "#64748b" }}>
                                    {evalRecord.grade}
                                  </span>
                                </div>
                              </div>
                            ) : (
                              <span style={{ fontSize: "0.82rem", color: "#94a3b8", fontWeight: 500 }}>
                                — / {activeExam?.max_marks || 60.0}
                              </span>
                            )}
                          </td>
                          <td style={{ padding: "0.85rem 1rem", textAlign: "right" }}>
                            {evalRecord ? (
                              <button
                                onClick={() => setActiveScorecard(evalRecord)}
                                style={{
                                  padding: "0.4rem 0.85rem",
                                  background: "#f0f9ff",
                                  border: "1px solid #bae6fd",
                                  borderRadius: "6px",
                                  color: "#0284c7",
                                  fontSize: "0.8rem",
                                  fontWeight: 600,
                                  cursor: "pointer"
                                }}
                              >
                                View Scorecard
                              </button>
                            ) : (
                              <button
                                onClick={() => handleEvaluateSingle(stud)}
                                disabled={isEvaluatingThis}
                                className="btn btn-primary"
                                style={{ padding: "0.4rem 0.85rem", fontSize: "0.8rem", borderRadius: "6px" }}
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

      {/* Scorecard Detailed Rubric Modal */}
      {activeScorecard && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(15, 23, 42, 0.65)",
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
              maxWidth: "800px",
              maxHeight: "90vh",
              overflowY: "auto",
              boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)"
            }}
          >
            {/* Modal Header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1.5rem", borderBottom: "1px solid #e2e8f0", paddingBottom: "1rem" }}>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
                  <h2 style={{ fontSize: "1.35rem", fontWeight: 800, color: "#0f172a", margin: 0 }}>
                    {activeScorecard.student_name}
                  </h2>
                  <span
                    style={{
                      fontFamily: "monospace",
                      background: "#f1f5f9",
                      padding: "0.2rem 0.5rem",
                      borderRadius: "6px",
                      fontSize: "0.82rem",
                      fontWeight: 700,
                      color: "#334155"
                    }}
                  >
                    {activeScorecard.roll_number}
                  </span>
                </div>
                <p style={{ color: "#64748b", fontSize: "0.85rem", marginTop: "0.25rem", margin: 0 }}>
                  Evaluated at zero temperature against syllabus criteria
                </p>
              </div>

              <button
                type="button"
                onClick={() => setActiveScorecard(null)}
                style={{ background: "transparent", border: "none", color: "#64748b", cursor: "pointer" }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Scorecard Hero Stats */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
                gap: "1rem",
                marginBottom: "1.5rem"
              }}
            >
              <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "10px", padding: "1rem" }}>
                <span style={{ fontSize: "0.75rem", color: "#64748b", fontWeight: 700, textTransform: "uppercase" }}>
                  Total Marks
                </span>
                <div style={{ fontSize: "1.75rem", fontWeight: 800, color: "#0f172a", marginTop: "0.2rem" }}>
                  {activeScorecard.total_score}{" "}
                  <span style={{ fontSize: "1rem", color: "#94a3b8", fontWeight: 600 }}>
                    / {activeScorecard.max_score}
                  </span>
                </div>
              </div>

              <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "10px", padding: "1rem" }}>
                <span style={{ fontSize: "0.75rem", color: "#64748b", fontWeight: 700, textTransform: "uppercase" }}>
                  Percentage
                </span>
                <div style={{ fontSize: "1.75rem", fontWeight: 800, color: "#0284c7", marginTop: "0.2rem" }}>
                  {activeScorecard.percentage}%
                </div>
              </div>

              <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "10px", padding: "1rem" }}>
                <span style={{ fontSize: "0.75rem", color: "#64748b", fontWeight: 700, textTransform: "uppercase" }}>
                  Letter Grade
                </span>
                <div style={{ fontSize: "1.25rem", fontWeight: 800, color: "#16a34a", marginTop: "0.4rem" }}>
                  {activeScorecard.grade}
                </div>
              </div>
            </div>

            {/* Teacher Feedback */}
            {activeScorecard.teacher_feedback && (
              <div
                style={{
                  background: "#f0fdf4",
                  border: "1px solid #bbf7d0",
                  borderRadius: "10px",
                  padding: "1rem",
                  marginBottom: "1.5rem"
                }}
              >
                <div style={{ fontSize: "0.8rem", fontWeight: 700, color: "#166534", textTransform: "uppercase", marginBottom: "0.35rem" }}>
                  Overall Academic Feedback
                </div>
                <p style={{ color: "#1e293b", fontSize: "0.88rem", margin: 0, lineHeight: 1.5 }}>
                  {activeScorecard.teacher_feedback}
                </p>
              </div>
            )}

            {/* Granular Breakdown */}
            <h3 style={{ fontSize: "1.1rem", fontWeight: 800, color: "#0f172a", marginBottom: "1rem" }}>
              Question Breakdown & Rubrics ({activeScorecard.breakdown.length})
            </h3>

            <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
              {activeScorecard.breakdown.map((item, idx) => (
                <div
                  key={idx}
                  style={{
                    border: "1px solid #e2e8f0",
                    borderRadius: "10px",
                    padding: "1rem",
                    background: "#ffffff"
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                      <span style={{ fontWeight: 800, fontSize: "0.95rem", color: "#0f172a" }}>
                        {item.q_no}
                      </span>
                    </div>
                    <span
                      style={{
                        fontWeight: 800,
                        fontSize: "0.9rem",
                        color: item.awarded_marks === item.max_marks ? "#16a34a" : item.awarded_marks > 0 ? "#0284c7" : "#ef4444"
                      }}
                    >
                      {item.awarded_marks} / {item.max_marks} Marks
                    </span>
                  </div>

                  {/* Rubric checks */}
                  {item.rubric_checks && item.rubric_checks.length > 0 && (
                    <div style={{ marginTop: "0.5rem", display: "flex", flexDirection: "column", gap: "0.35rem" }}>
                      {item.rubric_checks.map((rc, rIdx) => (
                        <div
                          key={rIdx}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            fontSize: "0.8rem",
                            background: "#f8fafc",
                            padding: "0.35rem 0.6rem",
                            borderRadius: "6px"
                          }}
                        >
                          <span style={{ color: "#334155" }}>{rc.criterion}</span>
                          <span
                            style={{
                              fontWeight: 700,
                              fontSize: "0.75rem",
                              color: rc.status === "MET" ? "#16a34a" : rc.status === "PARTIAL" ? "#d97706" : "#dc2626"
                            }}
                          >
                            {rc.awarded} / {rc.max} ({rc.status})
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Evidence quote */}
                  {item.evidence_quote && (
                    <div style={{ marginTop: "0.5rem", fontSize: "0.8rem", color: "#475569", fontStyle: "italic", background: "#f8fafc", padding: "0.4rem 0.6rem", borderRadius: "6px" }}>
                      "{item.evidence_quote}"
                    </div>
                  )}

                  {/* Deduction Reason */}
                  {item.deduction_reason && item.deduction_reason !== "None" && item.deduction_reason !== "None. Full credit." && (
                    <div style={{ marginTop: "0.45rem", fontSize: "0.78rem", color: "#b91c1c", display: "flex", alignItems: "center", gap: "0.35rem" }}>
                      <AlertCircle size={13} />
                      {item.deduction_reason}
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div style={{ marginTop: "1.5rem", display: "flex", justifyContent: "flex-end" }}>
              <button
                type="button"
                onClick={() => setActiveScorecard(null)}
                className="btn btn-primary"
                style={{ padding: "0.55rem 1.25rem", borderRadius: "8px", fontSize: "0.88rem" }}
              >
                Close Scorecard
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
