import React, { useState, useEffect } from "react";
import { academicApi } from "../api/academicApi";
import type { Exam, Student, AcademicEvaluation, ClassItem, Subject } from "../types/academic";
import {
  FileText,
  User,
  RefreshCw,
  Sparkles,
  Check,
  Copy,
  Code
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
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<string>("");
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>("");

  const [exams, setExams] = useState<Exam[]>([]);
  const [selectedExamId, setSelectedExamId] = useState<string>(initialExamId || "");
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState<string>(initialStudentId || "");

  // Sheet file or text
  const [sheetFile, setSheetFile] = useState<File | null>(null);
  const [sheetText, setSheetText] = useState<string>("");

  // Evaluation Execution State
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [evalProgressMessage, setEvalProgressMessage] = useState<string | null>(null);
  const [activeScorecard, setActiveScorecard] = useState<AcademicEvaluation | null>(null);

  // View toggle: "scorecard" | "rawJson"
  const [viewMode, setViewMode] = useState<"scorecard" | "rawJson">("scorecard");
  const [copiedJson, setCopiedJson] = useState(false);

  // Past evaluations list
  const [evaluationsHistory, setEvaluationsHistory] = useState<AcademicEvaluation[]>([]);

  useEffect(() => {
    // Initial fetch of classes, subjects, exams, and history
    Promise.all([
      academicApi.listClasses(),
      academicApi.listSubjects(),
      academicApi.listExams(),
      academicApi.listEvaluations()
    ]).then(([classList, subjList, exList, history]) => {
      setClasses(classList);
      setSubjects(subjList);
      setExams(exList);
      setEvaluationsHistory(history);

      if (classList.length > 0) {
        setSelectedClassId(classList[0].id);
      }
      if (subjList.length > 0) {
        setSelectedSubjectId(subjList[0].id);
      }

      if (initialExamId && exList.some((e) => e.id === initialExamId)) {
        setSelectedExamId(initialExamId);
      } else if (exList.length > 0) {
        setSelectedExamId(exList[0].id);
      }

      if (initialEvalId) {
        const found = history.find((h) => h.id === initialEvalId);
        if (found) setActiveScorecard(found);
      } else if (history.length > 0) {
        setActiveScorecard(history[0]);
      }
    });
  }, [initialExamId, initialEvalId]);

  // When class changes, filter subjects
  const handleClassChange = async (classId: string) => {
    setSelectedClassId(classId);
    try {
      const filtered = await academicApi.listSubjects(undefined, classId || undefined);
      setSubjects(filtered);
      if (filtered.length > 0) {
        setSelectedSubjectId(filtered[0].id);
      }
    } catch (err) {
      console.error("Failed to filter subjects:", err);
    }
  };

  // When subject changes, fetch exams and students
  useEffect(() => {
    if (selectedSubjectId) {
      academicApi.listExams(selectedSubjectId).then((exList) => {
        setExams(exList);
        if (exList.length > 0) {
          setSelectedExamId(exList[0].id);
        } else {
          setSelectedExamId("");
        }
      });

      academicApi.listStudents(selectedSubjectId).then((studList) => {
        setStudents(studList);
        if (initialStudentId && studList.some((s) => s.id === initialStudentId)) {
          setSelectedStudentId(initialStudentId);
        } else if (studList.length > 0) {
          setSelectedStudentId(studList[0].id);
        } else {
          setSelectedStudentId("");
        }
      });
    }
  }, [selectedSubjectId, initialStudentId]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSheetFile(file);
      setSheetText("");
    }
  };

  const handleLoadSamplePaper = () => {
    setSheetFile(null);
    setSheetText(
      "STUDENT RESPONSE SHEET\n" +
      "Course: Natural Language Processing | Academic Examination\n\n" +
      "ANS TO Q1:\n" +
      "CBOW predicts the target center word using the average of context word embeddings. It trains faster on frequent words.\n" +
      "Skip-gram inverts this by taking the center word to predict surrounding context words. Because each context pair is sampled, it performs much better on rare words.\n\n" +
      "ANS TO Q2:\n" +
      "Attention(Q,K,V) = softmax(Q K^T / sqrt(d_k)) * V.\n" +
      "Without dividing by sqrt(d_k), for large d_k, dot products grow large in magnitude. This pushes the softmax into extreme saturation zones where gradients vanish.\n\n" +
      "ANS TO Q3:\n" +
      "Perplexity is PPL = exp(CrossEntropy loss). It represents the effective branching factor—the geometric mean of choices. Lower perplexity indicates superior predictive accuracy.\n\n" +
      "ANS TO Q4:\n" +
      "BPE starts with all individual characters and iteratively merges the most frequent adjacent character pairs until reaching vocabulary capacity. It prevents Out-Of-Vocabulary (OOV) tokens.\n\n" +
      "ANS TO Q5:\n" +
      "LoRA freezes base weights W_0 and models weight updates as low-rank matrices B * A, where rank r << d. This reduces trainable parameters by over 99% and slashes GPU memory."
    );
  };

  const handleRunEvaluation = async () => {
    if (!selectedExamId || !selectedStudentId) {
      alert("Please select both an exam and a student.");
      return;
    }
    if (!sheetFile && !sheetText) {
      alert("Please upload a student answer sheet or click 'Load Sample Response'.");
      return;
    }

    setIsEvaluating(true);
    setEvalProgressMessage("Executing Strict Prompt: Grounded against SQLite questions, master answer key & temperature: 0.0...");

    try {
      const scorecard = await academicApi.evaluateStudent(
        selectedExamId,
        selectedStudentId,
        sheetFile,
        sheetText
      );

      setActiveScorecard(scorecard);
      setEvaluationsHistory([scorecard, ...evaluationsHistory]);
      setEvalProgressMessage(null);
    } catch (err: any) {
      console.error("Evaluation error:", err);
      alert("Evaluation failed. Please verify the backend connection.");
    } finally {
      setIsEvaluating(false);
    }
  };

  const handleCopyJson = () => {
    if (!activeScorecard) return;
    navigator.clipboard.writeText(JSON.stringify(activeScorecard, null, 2));
    setCopiedJson(true);
    setTimeout(() => setCopiedJson(false), 2000);
  };

  const activeExam = exams.find((e) => e.id === selectedExamId);

  return (
    <div className="strict-evaluation-page pb-24">
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1.5rem", flexWrap: "wrap", gap: "1rem" }}>
        <div>
          <h1 style={{ fontSize: "1.75rem", fontWeight: 800, letterSpacing: "-0.03em" }}>
            Strict Multimodal Student Evaluation
          </h1>
          <p style={{ color: "var(--text-muted)", fontSize: "0.9rem" }}>
            Grounded scoring against SQLite DB questions, allocated marks, and master answer key (temperature: 0.0)
          </p>
        </div>

        <button
          onClick={() => onNavigate("exams")}
          className="btn btn-secondary"
          style={{ fontSize: "0.85rem", display: "flex", alignItems: "center", gap: "0.4rem" }}
        >
          <FileText size={15} /> Modify Exam Marks
        </button>
      </div>

      {/* Selectors Bar */}
      <div className="card" style={{ padding: "1.25rem", marginBottom: "1.5rem", background: "var(--bg-secondary)" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "1rem", alignItems: "flex-end" }}>
          {/* Class Filter */}
          {classes.length > 0 && (
            <div>
              <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 700, textTransform: "uppercase", color: "var(--text-muted)", marginBottom: "0.25rem" }}>
                Class / Section
              </label>
              <select
                value={selectedClassId}
                onChange={(e) => handleClassChange(e.target.value)}
                style={{ width: "100%", padding: "0.5rem 0.75rem", borderRadius: "6px", border: "1px solid var(--border-color)", fontWeight: 600, background: "#ffffff" }}
              >
                <option value="">All Classes</option>
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.code || "SEC"})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Subject Filter */}
          <div>
            <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 700, textTransform: "uppercase", color: "var(--text-muted)", marginBottom: "0.25rem" }}>
              Subject
            </label>
            <select
              value={selectedSubjectId}
              onChange={(e) => setSelectedSubjectId(e.target.value)}
              style={{ width: "100%", padding: "0.5rem 0.75rem", borderRadius: "6px", border: "1px solid var(--border-color)", fontWeight: 600, background: "#ffffff" }}
            >
              {subjects.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.code})
                </option>
              ))}
            </select>
          </div>

          {/* Exam Selector */}
          <div>
            <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 700, textTransform: "uppercase", color: "var(--text-muted)", marginBottom: "0.25rem" }}>
              Select Examination
            </label>
            <select
              value={selectedExamId}
              onChange={(e) => setSelectedExamId(e.target.value)}
              style={{ width: "100%", padding: "0.5rem 0.75rem", borderRadius: "6px", border: "1px solid var(--border-color)", fontWeight: 600, background: "#ffffff" }}
            >
              {exams.length === 0 ? (
                <option value="">No exams scheduled for this subject</option>
              ) : (
                exams.map((ex) => (
                  <option key={ex.id} value={ex.id}>
                    {ex.title} ({(ex.questions || []).length} Qs • {ex.max_marks} pts)
                  </option>
                ))
              )}
            </select>
          </div>

          {/* Student Selector */}
          <div>
            <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 700, textTransform: "uppercase", color: "var(--text-muted)", marginBottom: "0.25rem" }}>
              Select Student Candidate
            </label>
            <select
              value={selectedStudentId}
              onChange={(e) => setSelectedStudentId(e.target.value)}
              style={{ width: "100%", padding: "0.5rem 0.75rem", borderRadius: "6px", border: "1px solid var(--border-color)", fontWeight: 600, background: "#ffffff" }}
            >
              {students.length === 0 ? (
                <option value="">No enrolled students in this subject</option>
              ) : (
                students.map((st) => (
                  <option key={st.id} value={st.id}>
                    {st.name} ({st.roll_number}) - {st.section || "A"}
                  </option>
                ))
              )}
            </select>
          </div>
        </div>

        {/* Paper Input & Action Bar */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "1rem", paddingTop: "0.75rem", borderTop: "1px solid var(--border-color)", flexWrap: "wrap", gap: "0.75rem" }}>
          <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
            <button
              type="button"
              onClick={handleLoadSamplePaper}
              className="btn btn-secondary"
              style={{ fontSize: "0.8rem", whiteSpace: "nowrap" }}
            >
              Load Sample Response
            </button>

            <label className="btn btn-secondary" style={{ fontSize: "0.8rem", cursor: "pointer", textAlign: "center", whiteSpace: "nowrap" }}>
              Upload Answer Sheet
              <input
                type="file"
                accept=".pdf,.png,.jpg,.jpeg,.txt"
                style={{ display: "none" }}
                onChange={handleFileUpload}
              />
            </label>

            <span style={{ fontSize: "0.8rem", color: "var(--text-secondary)", marginLeft: "0.5rem" }}>
              {sheetFile ? (
                <strong style={{ color: "var(--blue)" }}>File: {sheetFile.name}</strong>
              ) : sheetText ? (
                <strong style={{ color: "var(--green)" }}>Sample Answer Sheet (Ready)</strong>
              ) : (
                <span style={{ color: "var(--text-muted)" }}>No sheet selected</span>
              )}
            </span>
          </div>

          <button
            onClick={handleRunEvaluation}
            disabled={isEvaluating}
            className="btn btn-primary"
            style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "0.4rem", padding: "0.55rem 1.25rem", background: "#0f172a" }}
          >
            {isEvaluating ? <RefreshCw className="spin" size={16} /> : <Sparkles size={16} style={{ color: "#38bdf8" }} />}
            {isEvaluating ? "Strict Grading (temp: 0.0)..." : "Evaluate with Strict Rubric"}
          </button>
        </div>
      </div>

      {isEvaluating && (
        <div className="card" style={{ textAlign: "center", padding: "2.5rem", marginBottom: "1.5rem" }}>
          <RefreshCw className="spin" size={28} style={{ color: "var(--blue)", margin: "0 auto 1rem" }} />
          <h3 style={{ fontSize: "1.1rem", fontWeight: 700, marginBottom: "0.4rem" }}>Evaluating Against Strict Rubric</h3>
          <p style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>{evalProgressMessage}</p>
        </div>
      )}

      {/* SCORECARD RESULTS & JSON VIEWER */}
      {activeScorecard && !isEvaluating && (
        <div>
          {/* View Mode Switcher */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem", flexWrap: "wrap", gap: "0.5rem" }}>
            <div style={{ display: "flex", gap: "0.5rem" }}>
              <button
                onClick={() => setViewMode("scorecard")}
                className={`btn ${viewMode === "scorecard" ? "btn-primary" : "btn-secondary"}`}
                style={{ fontSize: "0.85rem", display: "flex", alignItems: "center", gap: "0.4rem" }}
              >
                <FileText size={14} /> Scorecard & Breakdown
              </button>
              <button
                onClick={() => setViewMode("rawJson")}
                className={`btn ${viewMode === "rawJson" ? "btn-primary" : "btn-secondary"}`}
                style={{ fontSize: "0.85rem", display: "flex", alignItems: "center", gap: "0.4rem" }}
              >
                <Code size={14} /> Gemini Evaluation JSON (Raw)
              </button>
            </div>

            {viewMode === "rawJson" && (
              <button
                onClick={handleCopyJson}
                className="btn btn-secondary"
                style={{ fontSize: "0.82rem", display: "flex", alignItems: "center", gap: "0.3rem" }}
              >
                {copiedJson ? <Check size={14} style={{ color: "var(--green)" }} /> : <Copy size={14} />}
                {copiedJson ? "Copied!" : "Copy JSON"}
              </button>
            )}
          </div>

          {viewMode === "rawJson" ? (
            <div className="card" style={{ padding: "1.5rem" }}>
              <h3 style={{ fontSize: "1.1rem", fontWeight: 800, marginBottom: "0.5rem" }}>
                Evaluation Scorecard JSON Schema
              </h3>
              <p style={{ fontSize: "0.82rem", color: "var(--text-muted)", marginBottom: "1rem" }}>
                Exact structured JSON response from Gemini API evaluation (temperature: 0.0)
              </p>
              <pre
                style={{
                  background: "#0f172a",
                  color: "#38bdf8",
                  padding: "1.25rem",
                  borderRadius: "10px",
                  fontFamily: "var(--font-mono)",
                  fontSize: "0.82rem",
                  lineHeight: 1.5,
                  overflowX: "auto",
                  maxHeight: "550px",
                  border: "1px solid #1e293b"
                }}
              >
                {JSON.stringify(activeScorecard, null, 2)}
              </pre>
            </div>
          ) : (
            <div>
              {/* Header Scorecard Banner */}
              <div className="scorecard-banner">
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "1rem" }}>
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.3rem" }}>
                      <User size={18} style={{ color: "var(--blue)" }} />
                      <h2 style={{ fontSize: "1.5rem", fontWeight: 800 }}>
                        {activeScorecard.student_name}
                      </h2>
                      <span style={{ fontSize: "0.85rem", background: "var(--bg-secondary)", padding: "0.2rem 0.6rem", borderRadius: "6px", border: "1px solid var(--border-color)", fontWeight: 700 }}>
                        Roll #{activeScorecard.roll_number}
                      </span>
                    </div>
                    <p style={{ color: "var(--text-muted)", fontSize: "0.88rem" }}>
                      Examination: <strong>{activeExam?.title || "Academic Examination"}</strong> • Evaluated on {new Date(activeScorecard.created_at).toLocaleString()}
                    </p>
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: "1.25rem" }}>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontSize: "0.8rem", textTransform: "uppercase", fontWeight: 700, color: "var(--text-muted)" }}>
                        Total Score
                      </div>
                      <div style={{ fontSize: "2.2rem", fontWeight: 800, lineHeight: 1.1, color: "var(--text-primary)" }}>
                        {activeScorecard.total_score} <span style={{ fontSize: "1.2rem", color: "var(--text-muted)" }}>/ {activeScorecard.max_score}</span>
                      </div>
                      <div style={{ fontSize: "0.85rem", fontWeight: 700, color: "var(--blue)" }}>
                        {activeScorecard.percentage}% Aggregate
                      </div>
                    </div>

                    <div className="grade-pill-large grade-pill-a">
                      {activeScorecard.grade}
                    </div>
                  </div>
                </div>

                {/* Professor Feedback */}
                {activeScorecard.teacher_feedback && (
                  <div style={{ marginTop: "1.25rem", padding: "1rem", background: "var(--bg-secondary)", borderRadius: "10px", border: "1px solid var(--border-color)" }}>
                    <div style={{ fontSize: "0.8rem", fontWeight: 700, textTransform: "uppercase", color: "var(--text-secondary)", marginBottom: "0.25rem" }}>
                      Professor's Audit Feedback
                    </div>
                    <div style={{ fontSize: "0.9rem", color: "var(--text-primary)", lineHeight: 1.5 }}>
                      {activeScorecard.teacher_feedback}
                    </div>
                  </div>
                )}
              </div>

              {/* Granular Question Breakdown */}
              <h3 style={{ fontSize: "1.25rem", fontWeight: 800, marginBottom: "1rem" }}>
                Granular Question-by-Question Marking Breakdown
              </h3>

              <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                {activeScorecard.breakdown.map((item, idx) => {
                  const matchedQ = activeExam?.questions.find((q) => q.q_no === item.q_no);
                  return (
                    <div key={idx} className="eval-breakdown-card">
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "0.75rem" }}>
                        <div>
                          <span style={{ fontSize: "1rem", fontWeight: 800, color: "var(--text-primary)" }}>
                            {item.q_no}
                          </span>
                          {matchedQ && (
                            <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", marginTop: "0.2rem" }}>
                              {matchedQ.text}
                            </p>
                          )}
                        </div>

                        <div style={{ textAlign: "right", minWidth: "100px" }}>
                          <div style={{ fontSize: "1.25rem", fontWeight: 800, color: item.awarded_marks >= item.max_marks * 0.9 ? "var(--green)" : item.awarded_marks >= item.max_marks * 0.5 ? "var(--amber)" : "var(--red)" }}>
                            {item.awarded_marks} / {item.max_marks} pts
                          </div>
                          <span style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>
                            Professor Marks
                          </span>
                        </div>
                      </div>

                      {/* Rubric Checks Table */}
                      {item.rubric_checks && item.rubric_checks.length > 0 && (
                        <div style={{ background: "var(--bg-secondary)", borderRadius: "8px", padding: "0.75rem", marginBottom: "0.75rem" }}>
                          <div style={{ fontSize: "0.75rem", fontWeight: 700, textTransform: "uppercase", color: "var(--text-muted)", marginBottom: "0.4rem" }}>
                            Criteria Checks Verified
                          </div>
                          <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem" }}>
                            {item.rubric_checks.map((rc, rIdx) => (
                              <div key={rIdx} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "0.82rem" }}>
                                <span>{rc.criterion}</span>
                                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                                  <span style={{ fontWeight: 600 }}>{rc.awarded}/{rc.max}</span>
                                  <span className={`rubric-status-pill ${rc.status === "MET" ? "status-met" : rc.status === "PARTIAL" ? "status-partial" : "status-unmet"}`}>
                                    {rc.status}
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Evidence Quote */}
                      {item.evidence_quote && (
                        <div className="evidence-quote-box">
                          <div style={{ fontWeight: 700, fontSize: "0.75rem", textTransform: "uppercase", marginBottom: "0.15rem", color: "var(--blue)" }}>
                            Proof Extracted from Student Answer Sheet:
                          </div>
                          "{item.evidence_quote}"
                        </div>
                      )}

                      {/* Deduction Reason */}
                      {item.deduction_reason && item.deduction_reason !== "None. Full credit." && (
                        <div className="deduction-box">
                          <strong>Deduction Explanation:</strong> {item.deduction_reason}
                        </div>
                      )}

                      {/* Feedback */}
                      {item.feedback && (
                        <div style={{ fontSize: "0.82rem", color: "var(--text-secondary)", marginTop: "0.5rem" }}>
                          💡 <em>{item.feedback}</em>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
