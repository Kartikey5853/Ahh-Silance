import React, { useState } from "react";
import { DoubleTapMarkdownEditor } from "./DoubleTapMarkdownEditor";
import { MarkdownQuestionView } from "./MarkdownQuestionView";
import type { Exam, ExamDetailsResponse } from "../types/academic";
import {
  ArrowLeft,
  BookOpen,
  Calendar,
  CheckCircle2,
  Clock,
  Edit3,
  FileCheck2,
  Maximize2,
  RefreshCw,
  Save,
  Sparkles,
  UploadCloud,
  Users
} from "lucide-react";

interface ExamDetailWorkspaceProps {
  details: ExamDetailsResponse | null;
  loading: boolean;
  onBack: () => void;
  onSelectTargetSection: (section: string) => Promise<void>;
  onEditPaperQuestions: (exam: Exam) => void;
  onOpenFullscreenAnswerKey: (exam: Exam) => void;
  onOpenUploadSheets: (exam: Exam) => void;
  onSaveManualAnswerKey: (examId: string, text: string) => Promise<void>;
  onStartBackgroundAnswerKey: (examId: string) => void;
  bgJobStatus: "idle" | "running" | "completed" | "failed";
  bgJobError?: string | null;
  onNavigateEvaluation: (examId: string, evalId?: string | null) => void;
}

export const ExamDetailWorkspace: React.FC<ExamDetailWorkspaceProps> = ({
  details,
  loading,
  onBack,
  onSelectTargetSection,
  onEditPaperQuestions,
  onOpenFullscreenAnswerKey,
  onOpenUploadSheets,
  onSaveManualAnswerKey,
  onStartBackgroundAnswerKey,
  bgJobStatus,
  bgJobError,
  onNavigateEvaluation
}) => {
  const [activeTab, setActiveTab] = useState<"students" | "answer_key" | "questions">("students");
  const [savingSection, setSavingSection] = useState(false);
  const [savingManualKey, setSavingManualKey] = useState(false);
  const [manualKeyDraft, setManualKeyDraft] = useState<string>("");
  const [draftSyncedExamId, setDraftSyncedExamId] = useState<string>("");

  const exam = details?.exam;
  if (exam && exam.id !== draftSyncedExamId) {
    setManualKeyDraft(exam.answer_key_text || "");
    setDraftSyncedExamId(exam.id);
  }
  // Keep manual draft synced when background Gemini job updates exam.answer_key_text
  React.useEffect(() => {
    if (exam?.answer_key_text && exam.id === draftSyncedExamId && manualKeyDraft.trim() === "") {
      setManualKeyDraft(exam.answer_key_text);
    }
  }, [exam?.answer_key_text]);

  if (loading && !exam) {
    return (
      <div style={{ padding: "4rem 2rem", textAlign: "center", background: "#ffffff", borderRadius: "16px", border: "1px solid #e2e8f0" }}>
        <RefreshCw size={26} className="spin" style={{ color: "#2563eb", margin: "0 auto 0.75rem" }} />
        <div style={{ fontWeight: 700, color: "#0f172a" }}>Loading Exam Details...</div>
      </div>
    );
  }

  if (!exam || !details) {
    return (
      <div style={{ padding: "3rem", textAlign: "center", background: "#ffffff", borderRadius: "16px", border: "1px solid #e2e8f0" }}>
        <p style={{ color: "#64748b", marginBottom: "1rem" }}>Unable to load exam details.</p>
        <button type="button" onClick={onBack} className="btn btn-secondary">
          Back to Exams
        </button>
      </div>
    );
  }

  const eligible = details.eligible_students || [];
  const evaluatedCount = eligible.filter((s) => s.evaluated).length;
  const availableSections = details.available_sections || [];
  const hasAnswerKey = Boolean(exam.answer_key_text && exam.answer_key_text.trim());

  const handleSectionChange = async (sec: string) => {
    setSavingSection(true);
    try {
      await onSelectTargetSection(sec);
    } finally {
      setSavingSection(false);
    }
  };

  const handleSaveKey = async () => {
    setSavingManualKey(true);
    try {
      await onSaveManualAnswerKey(exam.id, manualKeyDraft);
    } finally {
      setSavingManualKey(false);
    }
  };

  const handleUploadTextKey = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const txt = await file.text();
      setManualKeyDraft(txt);
    } catch {
      alert("Please select a .txt or .md text file for manual answer key upload.");
    } finally {
      e.target.value = "";
    }
  };

  return (
    <div style={{ paddingBottom: "6rem", display: "flex", flexDirection: "column", gap: "1.25rem" }}>
      {/* Top Overview Header Card (Pure White) */}
      <div
        style={{
          background: "#ffffff",
          border: "1px solid #e2e8f0",
          borderRadius: "16px",
          padding: "1.35rem 1.5rem",
          boxShadow: "0 1px 4px rgba(15, 23, 42, 0.04)"
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "1rem", marginBottom: "1rem" }}>
          <div style={{ display: "flex", alignItems: "flex-start", gap: "0.85rem" }}>
            <button
              type="button"
              onClick={onBack}
              style={{
                background: "#f8fafc",
                border: "1px solid #cbd5e1",
                color: "#0f172a",
                padding: "0.48rem 0.7rem",
                borderRadius: "8px",
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: "0.35rem",
                fontSize: "0.82rem",
                fontWeight: 700
              }}
            >
              <ArrowLeft size={15} /> All Exams
            </button>

            <div>
              <div style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: "0.5rem" }}>
                <span style={{ background: "#eff6ff", color: "#1d4ed8", border: "1px solid #bfdbfe", padding: "0.18rem 0.55rem", borderRadius: "6px", fontSize: "0.75rem", fontWeight: 700 }}>
                  {details.subject?.code || "SUB"} · {details.subject?.name || "Subject"}
                </span>
                {details.class_item && (
                  <span style={{ background: "#f1f5f9", color: "#334155", padding: "0.18rem 0.55rem", borderRadius: "6px", fontSize: "0.75rem", fontWeight: 700 }}>
                    {details.class_item.name}
                  </span>
                )}
                <span style={{ background: hasAnswerKey ? "#f0fdf4" : "#fffbeb", color: hasAnswerKey ? "#15803d" : "#b45309", border: `1px solid ${hasAnswerKey ? "#bbf7d0" : "#fde68a"}`, padding: "0.18rem 0.55rem", borderRadius: "6px", fontSize: "0.75rem", fontWeight: 700, display: "inline-flex", alignItems: "center", gap: "0.25rem" }}>
                  {hasAnswerKey ? <CheckCircle2 size={12} /> : <Sparkles size={12} />}
                  {hasAnswerKey ? "Answer Key Ready" : "Answer Key Needed"}
                </span>
              </div>

              <h1 style={{ fontSize: "1.65rem", fontWeight: 900, color: "#0f172a", margin: "0.45rem 0 0.3rem", letterSpacing: "-0.02em" }}>
                {exam.title}
              </h1>

              <div style={{ display: "flex", flexWrap: "wrap", gap: "1rem", fontSize: "0.82rem", color: "#64748b" }}>
                <span><strong>{exam.questions?.length || 0}</strong> Questions</span>
                <span><strong>{exam.max_marks}</strong> Max Marks (Pass: {exam.passing_marks})</span>
                <span style={{ display: "inline-flex", alignItems: "center", gap: "0.28rem" }}>
                  <Calendar size={13} /> Date: {exam.exam_date || "Scheduled"}
                </span>
                <span style={{ display: "inline-flex", alignItems: "center", gap: "0.28rem" }}>
                  <Clock size={13} /> Deadline: {exam.correction_deadline || "Open"}
                </span>
              </div>
            </div>
          </div>

          <div style={{ display: "flex", flexWrap: "wrap", gap: "0.55rem" }}>
            <button
              type="button"
              onClick={() => onEditPaperQuestions(exam)}
              className="btn btn-secondary"
              style={{ display: "inline-flex", alignItems: "center", gap: "0.35rem", fontSize: "0.82rem" }}
            >
              <Edit3 size={14} /> Edit Questions &amp; Paper
            </button>
            <button
              type="button"
              onClick={() => onOpenFullscreenAnswerKey(exam)}
              style={{
                background: "#eff6ff",
                border: "1px solid #bfdbfe",
                color: "#1d4ed8",
                padding: "0.48rem 0.85rem",
                borderRadius: "8px",
                fontSize: "0.82rem",
                fontWeight: 700,
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: "0.35rem"
              }}
            >
              <Maximize2 size={14} /> Answer Key Fullscreen
            </button>
            <button
              type="button"
              onClick={() => onOpenUploadSheets(exam)}
              className="btn btn-secondary"
              style={{ display: "inline-flex", alignItems: "center", gap: "0.35rem", fontSize: "0.82rem" }}
            >
              <UploadCloud size={14} /> Upload Sheets
            </button>
            <button
              type="button"
              onClick={() => onNavigateEvaluation(exam.id)}
              className="btn btn-primary"
              style={{ fontSize: "0.82rem" }}
            >
              Grade Papers →
            </button>
          </div>
        </div>

        {/* Section Target Picker Strip */}
        <div
          style={{
            background: "#f8fafc",
            border: "1px solid #e2e8f0",
            borderRadius: "12px",
            padding: "0.85rem 1.1rem",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "0.85rem"
          }}
        >
          <div>
            <div style={{ fontSize: "0.82rem", fontWeight: 800, color: "#0f172a" }}>
              Target Section Writing This Exam
            </div>
            <div style={{ fontSize: "0.76rem", color: "#64748b" }}>
              Choose whether the entire class cohort writes this exam or restrict it to a specific section (e.g. Section A).
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: "0.45rem" }}>
            {["", ...Array.from(new Set(["A", "B", ...availableSections]))].map((secOpt) => {
              const currentNorm = (exam.target_section || "").trim().toLowerCase().replace("section ", "");
              const optNorm = secOpt.trim().toLowerCase().replace("section ", "");
              const isSelected = currentNorm === optNorm;
              const label = secOpt ? (secOpt.toLowerCase().startsWith("section") ? secOpt : `Section ${secOpt}`) : "All Sections";
              return (
                <button
                  key={label}
                  type="button"
                  disabled={savingSection}
                  onClick={() => handleSectionChange(secOpt)}
                  style={{
                    padding: "0.36rem 0.78rem",
                    borderRadius: "8px",
                    border: isSelected ? "1.5px solid #2563eb" : "1px solid #cbd5e1",
                    background: isSelected ? "#2563eb" : "#ffffff",
                    color: isSelected ? "#ffffff" : "#334155",
                    fontSize: "0.78rem",
                    fontWeight: 700,
                    cursor: savingSection ? "wait" : "pointer"
                  }}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Tabs Container */}
      <div style={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: "16px", overflow: "hidden", boxShadow: "0 1px 4px rgba(15, 23, 42, 0.04)" }}>
        <div style={{ display: "flex", gap: "1.5rem", padding: "0 1.5rem", borderBottom: "1px solid #e2e8f0", background: "#ffffff" }}>
          {[
            { id: "students" as const, label: `People Writing (${eligible.length}) · ${evaluatedCount} Graded`, icon: Users },
            { id: "answer_key" as const, label: "Answer Key & Rubrics", icon: Sparkles },
            { id: "questions" as const, label: `Questions (${exam.questions?.length || 0})`, icon: BookOpen }
          ].map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  if (tab.id === "answer_key") {
                    onOpenFullscreenAnswerKey(exam);
                    return;
                  }
                  setActiveTab(tab.id);
                }}
                style={{
                  padding: "0.9rem 0",
                  border: "none",
                  borderBottom: active ? "2.5px solid #2563eb" : "2.5px solid transparent",
                  background: "none",
                  color: active ? "#2563eb" : "#64748b",
                  fontWeight: 700,
                  fontSize: "0.86rem",
                  cursor: "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "0.4rem"
                }}
              >
                <Icon size={15} /> {tab.label}
              </button>
            );
          })}
        </div>

        <div style={{ padding: "1.35rem 1.5rem" }}>
          {/* TAB 1: STUDENTS WRITING THIS EXAM */}
          {activeTab === "students" && (
            eligible.length === 0 ? (
              <div style={{ textAlign: "center", padding: "3rem", background: "#f8fafc", borderRadius: "12px", border: "1px dashed #cbd5e1", color: "#64748b" }}>
                No students match <strong>{exam.target_section ? `Section ${exam.target_section}` : "this cohort"}</strong> yet. Switch target section above or enroll students under Students &amp; Cohorts.
              </div>
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
                  <thead>
                    <tr style={{ borderBottom: "1px solid #e2e8f0", fontSize: "0.72rem", color: "#64748b", textTransform: "uppercase" }}>
                      <th style={{ padding: "0.65rem 0.9rem" }}>#</th>
                      <th style={{ padding: "0.65rem 0.9rem" }}>Roll No</th>
                      <th style={{ padding: "0.65rem 0.9rem" }}>Student Name</th>
                      <th style={{ padding: "0.65rem 0.9rem" }}>Section</th>
                      <th style={{ padding: "0.65rem 0.9rem" }}>Enrolled Subjects</th>
                      <th style={{ padding: "0.65rem 0.9rem" }}>CGPA</th>
                      <th style={{ padding: "0.65rem 0.9rem" }}>Evaluation Status</th>
                      <th style={{ padding: "0.65rem 0.9rem", textAlign: "right" }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {eligible.map((st, idx) => (
                      <tr key={st.student_id} style={{ borderBottom: "1px solid #f1f5f9", fontSize: "0.85rem" }}>
                        <td style={{ padding: "0.75rem 0.9rem", color: "#94a3b8", fontWeight: 600 }}>{idx + 1}</td>
                        <td style={{ padding: "0.75rem 0.9rem" }}>
                          <span style={{ fontFamily: "monospace", fontWeight: 700, background: "#f1f5f9", padding: "0.18rem 0.5rem", borderRadius: "6px" }}>
                            {st.roll_number}
                          </span>
                        </td>
                        <td style={{ padding: "0.75rem 0.9rem", fontWeight: 700, color: "#0f172a" }}>{st.name}</td>
                        <td style={{ padding: "0.75rem 0.9rem" }}>
                          <span style={{ background: "#e2e8f0", color: "#334155", padding: "0.14rem 0.5rem", borderRadius: "4px", fontSize: "0.75rem", fontWeight: 700 }}>
                            Section {(st.sections && st.sections.join(", ")) || st.section || "A"}
                          </span>
                        </td>
                        <td style={{ padding: "0.75rem 0.9rem" }}>
                          <div style={{ display: "flex", flexWrap: "wrap", gap: "0.3rem" }}>
                            {(st.enrolled_subjects || []).map((tag) => (
                              <span key={tag} style={{ background: "#eff6ff", color: "#1d4ed8", border: "1px solid #bfdbfe", padding: "0.1rem 0.45rem", borderRadius: "999px", fontSize: "0.72rem", fontWeight: 600 }}>
                                {tag}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td style={{ padding: "0.75rem 0.9rem", fontWeight: 700 }}>
                          {st.cgpa_or_percentage && st.cgpa_or_percentage > 0 ? st.cgpa_or_percentage.toFixed(2) : "—"}
                        </td>
                        <td style={{ padding: "0.75rem 0.9rem" }}>
                          {st.evaluated ? (
                            <span style={{ display: "inline-flex", alignItems: "center", gap: "0.3rem", background: "#f0fdf4", color: "#15803d", border: "1px solid #bbf7d0", padding: "0.18rem 0.55rem", borderRadius: "999px", fontSize: "0.75rem", fontWeight: 700 }}>
                              <FileCheck2 size={12} /> {st.total_score}/{st.max_score} ({st.grade})
                            </span>
                          ) : (
                            <span style={{ background: "#f8fafc", color: "#64748b", border: "1px solid #e2e8f0", padding: "0.18rem 0.55rem", borderRadius: "999px", fontSize: "0.75rem", fontWeight: 600 }}>
                              Pending
                            </span>
                          )}
                        </td>
                        <td style={{ padding: "0.75rem 0.9rem", textAlign: "right" }}>
                          <button
                            type="button"
                            onClick={() => onNavigateEvaluation(exam.id, st.evaluation_id)}
                            className="btn btn-secondary"
                            style={{ fontSize: "0.76rem", padding: "0.3rem 0.7rem" }}
                          >
                            {st.evaluated ? "View Scorecard" : "Evaluate"}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          )}

          {/* TAB 2: ANSWER KEY GENERATOR & MANUAL EDITOR */}
          {activeTab === "answer_key" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "0.75rem", background: "#f8fafc", padding: "1rem 1.25rem", borderRadius: "12px", border: "1px solid #e2e8f0" }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: "1rem", fontWeight: 800, color: "#0f172a" }}>
                    Add or Generate Master Answer Key
                  </h3>
                  <div style={{ fontSize: "0.8rem", color: "#64748b", marginTop: "0.15rem" }}>
                    Write/paste your own key manually, upload a `.txt/.md` file, or trigger non-blocking Gemini synthesis in the background.
                  </div>
                </div>

                <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
                  <label style={{ background: "#ffffff", border: "1px solid #cbd5e1", color: "#334155", padding: "0.45rem 0.85rem", borderRadius: "8px", fontSize: "0.8rem", fontWeight: 700, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: "0.35rem" }}>
                    <UploadCloud size={14} /> Load Text File
                    <input type="file" accept=".txt,.md" onChange={handleUploadTextKey} style={{ display: "none" }} />
                  </label>

                  <button
                    type="button"
                    onClick={() => onStartBackgroundAnswerKey(exam.id)}
                    disabled={bgJobStatus === "running"}
                    style={{
                      background: bgJobStatus === "running" ? "#eff6ff" : "#0f172a",
                      border: bgJobStatus === "running" ? "1px solid #93c5fd" : "none",
                      color: bgJobStatus === "running" ? "#1d4ed8" : "#ffffff",
                      padding: "0.45rem 0.95rem",
                      borderRadius: "8px",
                      fontSize: "0.8rem",
                      fontWeight: 700,
                      cursor: bgJobStatus === "running" ? "default" : "pointer",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "0.35rem"
                    }}
                  >
                    {bgJobStatus === "running" ? <RefreshCw size={14} className="spin" /> : <Sparkles size={14} />}
                    {bgJobStatus === "running" ? "Generating in Background..." : "Generate Answer Key (Background)"}
                  </button>

                  <button
                    type="button"
                    onClick={() => onOpenFullscreenAnswerKey(exam)}
                    style={{
                      background: "#2563eb",
                      border: "none",
                      color: "#ffffff",
                      padding: "0.45rem 0.95rem",
                      borderRadius: "8px",
                      fontSize: "0.8rem",
                      fontWeight: 700,
                      cursor: "pointer",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "0.35rem"
                    }}
                  >
                    <Maximize2 size={14} /> Open Fullscreen Studio
                  </button>
                </div>
              </div>

              {bgJobStatus === "running" && (
                <div style={{ padding: "0.75rem 1rem", background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: "10px", fontSize: "0.82rem", color: "#1e40af", fontWeight: 600, display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <RefreshCw size={14} className="spin" />
                  Generating Master Answer Key in background — backend remains responsive and results will auto-save when complete.
                </div>
              )}
              {bgJobError && (
                <div style={{ padding: "0.75rem 1rem", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: "10px", fontSize: "0.82rem", color: "#b91c1c" }}>
                  {bgJobError}
                </div>
              )}

              <DoubleTapMarkdownEditor
                value={manualKeyDraft}
                onChange={setManualKeyDraft}
                minRows={10}
                maxRows={22}
                placeholder="Type or paste the official Master Answer Key & marking rubric here (or click Generate Answer Key above)..."
                emptyHint="No Master Answer Key entered yet — double-tap to write Markdown, or open Fullscreen Answer Key Studio."
              />

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.75rem" }}>
                <button
                  type="button"
                  onClick={handleSaveKey}
                  disabled={savingManualKey}
                  className="btn btn-primary"
                  style={{ display: "inline-flex", alignItems: "center", gap: "0.4rem" }}
                >
                  <Save size={15} /> {savingManualKey ? "Saving Answer Key..." : "Save Master Answer Key"}
                </button>
              </div>
            </div>
          )}

          {/* TAB 3: QUESTIONS PREVIEW */}
          {activeTab === "questions" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
              {(exam.questions || []).map((q, idx) => {
                const nextQ = (exam.questions || [])[idx + 1];
                const sharesOrWithNext = Boolean(
                  q.is_or_choice &&
                  nextQ?.is_or_choice &&
                  q.or_group &&
                  nextQ?.or_group &&
                  q.or_group === nextQ.or_group
                );
                return (
                  <React.Fragment key={q.id || idx}>
                    <div style={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: "10px", padding: "0.85rem 1rem" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.35rem" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "0.45rem" }}>
                          <span style={{ fontWeight: 800, color: "#0f172a" }}>{q.q_no}</span>
                          {q.section && <span style={{ fontSize: "0.72rem", background: "#f1f5f9", color: "#475569", padding: "0.12rem 0.45rem", borderRadius: "4px" }}>{q.section}</span>}
                          {q.is_or_choice && <span style={{ fontSize: "0.7rem", background: "#fef3c7", color: "#92400e", padding: "0.12rem 0.45rem", borderRadius: "4px", fontWeight: 700 }}>OR Choice</span>}
                        </div>
                        <span style={{ fontWeight: 800, fontSize: "0.82rem", color: "#2563eb" }}>{q.marks} Marks</span>
                      </div>
                      <MarkdownQuestionView text={q.text} compact />
                    </div>
                    {sharesOrWithNext && (
                      <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", padding: "0.15rem 0.5rem" }}>
                        <div style={{ flex: 1, height: "1px", background: "#f59e0b" }} />
                        <span style={{ background: "#fffbeb", border: "1px solid #f59e0b", color: "#b45309", padding: "0.12rem 0.65rem", borderRadius: "999px", fontSize: "0.72rem", fontWeight: 900 }}>
                          OR
                        </span>
                        <div style={{ flex: 1, height: "1px", background: "#f59e0b" }} />
                      </div>
                    )}
                  </React.Fragment>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
