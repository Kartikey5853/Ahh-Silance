import React, { useEffect, useState } from "react";
import { resolveApiUrl } from "../api/client";
import { DoubleTapMarkdownEditor } from "./DoubleTapMarkdownEditor";
import { MarkdownQuestionView } from "./MarkdownQuestionView";
import type { AnswerKeyStructuredItem, Exam, Subject } from "../types/academic";
import {
  ArrowLeft,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Download,
  Edit3,
  Eye,
  FileText,
  Maximize2,
  Minimize2,
  RefreshCw,
  Save,
  Sparkles,
  UploadCloud
} from "lucide-react";

interface AnswerKeyFullscreenWorkspaceProps {
  exam: Exam;
  subject?: Subject;
  answerKeyText: string;
  onChangeAnswerKeyText: (text: string) => void;
  structuredAnswers: AnswerKeyStructuredItem[];
  onChangeStructuredAnswers: (items: AnswerKeyStructuredItem[]) => void;
  bgJobStatus: "idle" | "running" | "completed" | "failed";
  bgJobError?: string | null;
  bgWarning?: string | null;
  onStartBackgroundGeneration: () => void;
  onSaveAnswerKey: (approveAndExit?: boolean) => Promise<void>;
  isSaving: boolean;
  onClose: () => void;
}

const DEFAULT_SEGMENTS = (marks: number) => [
  { label: "Core Concept / Setup", marks: Number((marks * 0.4).toFixed(1)), color: "#2563eb" },
  { label: "Working / Explanation", marks: Number((marks * 0.6).toFixed(1)), color: "#16a34a" }
];

const scaffoldFromQuestions = (exam: Exam): AnswerKeyStructuredItem[] => {
  return (exam.questions || []).map((q, idx) => ({
    q_no: q.q_no || `Q${idx + 1}`,
    marks: Number(q.marks) || 5,
    model_answer: q.ideal_answer || "",
    marks_distribution: DEFAULT_SEGMENTS(Number(q.marks) || 5),
    rubric_items: [
      {
        title: "Concept & Technical Accuracy",
        marks: Number(q.marks) || 5,
        criteria: [q.rubric || `Award up to ${Number(q.marks) || 5} marks for complete, accurate solution steps.`]
      }
    ],
    marking_notes: "",
    bloom_level: "Apply / Analyze"
  }));
};

export const AnswerKeyFullscreenWorkspace: React.FC<AnswerKeyFullscreenWorkspaceProps> = ({
  exam,
  subject,
  answerKeyText,
  onChangeAnswerKeyText,
  structuredAnswers,
  onChangeStructuredAnswers,
  bgJobStatus,
  bgJobError,
  bgWarning,
  onStartBackgroundGeneration,
  onSaveAnswerKey,
  isSaving,
  onClose
}) => {
  const [editorMode, setEditorMode] = useState<"structured" | "manual">("structured");
  const [isEditingStructured, setIsEditingStructured] = useState<boolean>(false);
  const [expandAll, setExpandAll] = useState<boolean>(true);
  const [activeIdx, setActiveIdx] = useState<number>(0);
  const [paperZoom, setPaperZoom] = useState<number>(85);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [paperLoadError, setPaperLoadError] = useState<boolean>(false);

  const items: AnswerKeyStructuredItem[] =
    structuredAnswers.length > 0 ? structuredAnswers : scaffoldFromQuestions(exam);

  useEffect(() => {
    setCurrentPage(1);
    setPaperLoadError(false);
    setActiveIdx(0);
  }, [exam.id]);

  // Keep selected question synchronized with scanned paper page
  useEffect(() => {
    const selected = items[activeIdx];
    if (!selected) return;
    const matchQ = (exam.questions || []).find(
      (q) => q.q_no?.trim().toLowerCase() === selected.q_no?.trim().toLowerCase()
    ) || (exam.questions || [])[activeIdx];
    if (matchQ?.page && matchQ.page >= 1) {
      setCurrentPage(Math.min(Math.max(1, exam.paper_page_count || 1), matchQ.page));
      setPaperLoadError(false);
    }
  }, [activeIdx, exam.paper_page_count]);

  const handleUpdateItem = (idx: number, patch: Partial<AnswerKeyStructuredItem>) => {
    const next = items.map((item, i) => (i === idx ? { ...item, ...patch } : item));
    onChangeStructuredAnswers(next);
  };

  const handleUploadManualFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const content = await file.text();
      onChangeAnswerKeyText(content);
      setEditorMode("manual");
    } catch {
      alert("Could not read text from the selected file. Please paste text or upload a .txt / .md file.");
    } finally {
      e.target.value = "";
    }
  };

  const handleCompileStructuredToText = () => {
    const lines: string[] = [`=== MASTER ANSWER KEY: ${exam.title} ===`];
    items.forEach((it) => {
      lines.push(`\n[${it.q_no}] (${it.marks} Marks)`);
      lines.push(`Model Answer:\n${it.model_answer || "(Add expected solution steps)"}`);
      if (it.rubric_items && it.rubric_items.length > 0) {
        lines.push("Grading Criteria:");
        it.rubric_items.forEach((r) => {
          lines.push(`- ${r.title} (${r.marks}m): ${(r.criteria || []).join(" | ")}`);
        });
      }
    });
    onChangeAnswerKeyText(lines.join("\n"));
  };

  const handleDownloadKey = () => {
    const text = answerKeyText.trim() || items.map((it) => `[${it.q_no}] (${it.marks}M)\n${it.model_answer}`).join("\n\n");
    const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${(exam.title || "answer-key").replace(/\s+/g, "_")}_answer_key.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const totalPages = Math.max(1, exam.paper_page_count || 1);
  const pageImageUrl =
    exam.paper_id ? resolveApiUrl(`/api/v1/academic/papers/${exam.paper_id}/pages/${currentPage}`) : "";

  const activeQuestionObj =
    (exam.questions || []).find(
      (q) => q.q_no?.trim().toLowerCase() === items[activeIdx]?.q_no?.trim().toLowerCase()
    ) || (exam.questions || [])[activeIdx];

  const pageOverlayQuestions = (exam.questions || []).filter(
    (q) => (q.page || 1) === currentPage && Array.isArray(q.box_2d) && q.box_2d.length === 4
  );

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 1200,
        background: "#ffffff",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        color: "#0f172a"
      }}
    >
      {/* Pure White Fullscreen Top Bar */}
      <div
        style={{
          padding: "0.85rem 1.5rem",
          background: "#ffffff",
          borderBottom: "1px solid #e2e8f0",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "0.75rem",
          boxShadow: "0 1px 3px rgba(15, 23, 42, 0.04)"
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "0.85rem" }}>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: "#f8fafc",
              border: "1px solid #cbd5e1",
              color: "#0f172a",
              padding: "0.45rem 0.7rem",
              borderRadius: "8px",
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: "0.35rem",
              fontSize: "0.82rem",
              fontWeight: 700
            }}
          >
            <ArrowLeft size={15} /> Exit Fullscreen
          </button>

          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <h2 style={{ fontSize: "1.12rem", fontWeight: 900, margin: 0, color: "#0f172a" }}>
                Answer Key & Rubric Studio
              </h2>
              {subject && (
                <span style={{ fontSize: "0.72rem", fontWeight: 700, background: "#eff6ff", color: "#1d4ed8", border: "1px solid #bfdbfe", padding: "0.14rem 0.5rem", borderRadius: "6px" }}>
                  {subject.code}
                </span>
              )}
              {exam.answer_key_text?.trim() && (
                <span style={{ fontSize: "0.72rem", fontWeight: 700, background: "#f0fdf4", color: "#15803d", border: "1px solid #bbf7d0", padding: "0.14rem 0.5rem", borderRadius: "6px", display: "inline-flex", alignItems: "center", gap: "0.25rem" }}>
                  <CheckCircle2 size={12} /> Saved in Exam
                </span>
              )}
            </div>
            <div style={{ fontSize: "0.78rem", color: "#64748b", marginTop: "0.1rem" }}>
              {exam.title} · {items.length} Questions · {exam.max_marks} Max Marks
            </div>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: "0.5rem" }}>
          {/* Mode Switcher */}
          <div style={{ display: "inline-flex", background: "#f1f5f9", padding: "0.2rem", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
            <button
              type="button"
              onClick={() => setEditorMode("structured")}
              style={{
                padding: "0.35rem 0.75rem",
                borderRadius: "6px",
                border: "none",
                background: editorMode === "structured" ? "#ffffff" : "transparent",
                color: editorMode === "structured" ? "#0f172a" : "#64748b",
                fontWeight: 700,
                fontSize: "0.78rem",
                cursor: "pointer",
                boxShadow: editorMode === "structured" ? "0 1px 2px rgba(0,0,0,0.06)" : "none"
              }}
            >
              Per-Question Rubrics
            </button>
            <button
              type="button"
              onClick={() => setEditorMode("manual")}
              style={{
                padding: "0.35rem 0.75rem",
                borderRadius: "6px",
                border: "none",
                background: editorMode === "manual" ? "#ffffff" : "transparent",
                color: editorMode === "manual" ? "#0f172a" : "#64748b",
                fontWeight: 700,
                fontSize: "0.78rem",
                cursor: "pointer",
                boxShadow: editorMode === "manual" ? "0 1px 2px rgba(0,0,0,0.06)" : "none"
              }}
            >
              Manual Text / Paste Key
            </button>
          </div>

          <label
            style={{
              background: "#ffffff",
              border: "1px solid #cbd5e1",
              color: "#334155",
              padding: "0.42rem 0.8rem",
              borderRadius: "8px",
              fontSize: "0.78rem",
              fontWeight: 700,
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: "0.35rem"
            }}
          >
            <UploadCloud size={14} /> Upload Key (.txt/.md)
            <input type="file" accept=".txt,.md" onChange={handleUploadManualFile} style={{ display: "none" }} />
          </label>

          <button
            type="button"
            onClick={onStartBackgroundGeneration}
            disabled={bgJobStatus === "running"}
            style={{
              background: bgJobStatus === "running" ? "#eff6ff" : "#0f172a",
              border: bgJobStatus === "running" ? "1px solid #93c5fd" : "none",
              color: bgJobStatus === "running" ? "#1d4ed8" : "#ffffff",
              padding: "0.44rem 0.9rem",
              borderRadius: "8px",
              fontSize: "0.78rem",
              fontWeight: 700,
              cursor: bgJobStatus === "running" ? "default" : "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: "0.35rem"
            }}
          >
            {bgJobStatus === "running" ? <RefreshCw size={14} className="spin" /> : <Sparkles size={14} />}
            {bgJobStatus === "running" ? "Generating in Background..." : "Generate with Gemini"}
          </button>

          <button
            type="button"
            onClick={handleDownloadKey}
            style={{
              background: "#ffffff",
              border: "1px solid #cbd5e1",
              color: "#334155",
              padding: "0.42rem 0.75rem",
              borderRadius: "8px",
              fontSize: "0.78rem",
              fontWeight: 600,
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: "0.3rem"
            }}
          >
            <Download size={14} /> Export
          </button>

          <button
            type="button"
            onClick={() => onSaveAnswerKey(false)}
            disabled={isSaving}
            style={{
              background: "#ffffff",
              border: "1px solid #cbd5e1",
              color: "#0f172a",
              padding: "0.44rem 0.9rem",
              borderRadius: "8px",
              fontSize: "0.8rem",
              fontWeight: 700,
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: "0.35rem"
            }}
          >
            <Save size={14} /> {isSaving ? "Saving..." : "Save Draft"}
          </button>

          <button
            type="button"
            onClick={() => onSaveAnswerKey(true)}
            disabled={isSaving}
            style={{
              background: "#2563eb",
              border: "none",
              color: "#ffffff",
              padding: "0.46rem 1.05rem",
              borderRadius: "8px",
              fontSize: "0.8rem",
              fontWeight: 800,
              cursor: "pointer"
            }}
          >
            Approve & Use for Grading
          </button>
        </div>
      </div>

      {/* Non-Blocking Status Banner */}
      {(bgJobStatus === "running" || bgJobError || bgWarning) && (
        <div
          style={{
            padding: "0.55rem 1.5rem",
            background: bgJobError ? "#fef2f2" : bgWarning ? "#fffbeb" : "#eff6ff",
            borderBottom: `1px solid ${bgJobError ? "#fecaca" : bgWarning ? "#fde68a" : "#bfdbfe"}`,
            color: bgJobError ? "#b91c1c" : bgWarning ? "#92400e" : "#1e40af",
            fontSize: "0.8rem",
            fontWeight: 600,
            display: "flex",
            alignItems: "center",
            gap: "0.55rem"
          }}
        >
          {bgJobStatus === "running" && <RefreshCw size={14} className="spin" />}
          <span>
            {bgJobStatus === "running"
              ? "Gemini is generating the master answer key asynchronously in the background. You may edit manually or navigate away — results auto-save when complete."
              : bgJobError
                ? `Background synthesis error: ${bgJobError}`
                : `Fallback note: ${bgWarning}`}
          </span>
        </div>
      )}

      {/* Fullscreen Pure-White 2-Column Split Body */}
      <div
        style={{
          flex: 1,
          minHeight: 0,
          display: "grid",
          gridTemplateColumns: "1.08fr 0.92fr",
          background: "#f8fafc"
        }}
      >
        {/* LEFT PANE: Structured Rubric Cards OR Manual Answer Key Editor */}
        <div
          style={{
            overflowY: "auto",
            padding: "1.25rem 1.5rem",
            background: "#ffffff",
            borderRight: "1px solid #e2e8f0",
            display: "flex",
            flexDirection: "column",
            gap: "1rem"
          }}
        >
          {editorMode === "manual" ? (
            <div style={{ display: "flex", flexDirection: "column", height: "100%", gap: "0.75rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: "1rem", fontWeight: 800, color: "#0f172a" }}>
                    Manual Master Answer Key (Markdown / Plain Text)
                  </h3>
                  <div style={{ fontSize: "0.76rem", color: "#64748b" }}>
                    Type or paste your solution guide directly. Evaluations strictly grade against this text.
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleCompileStructuredToText}
                  style={{
                    background: "#f8fafc",
                    border: "1px solid #cbd5e1",
                    color: "#334155",
                    padding: "0.35rem 0.7rem",
                    borderRadius: "7px",
                    fontSize: "0.76rem",
                    fontWeight: 700,
                    cursor: "pointer"
                  }}
                >
                  Sync from Cards
                </button>
              </div>
              <DoubleTapMarkdownEditor
                value={answerKeyText}
                onChange={onChangeAnswerKeyText}
                minRows={16}
                maxRows={32}
                placeholder="Paste or type your complete Master Answer Key here in Markdown/LaTeX, organized by Q1, Q2..."
                emptyHint="No Master Answer Key text entered yet — double-tap anywhere here to type or paste Markdown, or click Sync from Cards."
                style={{
                  flex: 1,
                  minHeight: "420px",
                  overflowY: "auto",
                  padding: "1rem 1.15rem",
                }}
              />
            </div>
          ) : (
            <>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  background: "#f8fafc",
                  padding: "0.65rem 0.9rem",
                  borderRadius: "10px",
                  border: "1px solid #e2e8f0"
                }}
              >
                <span style={{ fontSize: "0.82rem", fontWeight: 700, color: "#334155" }}>
                  {items.length} Questions · Click a card to highlight on the question paper
                </span>
                <div style={{ display: "flex", gap: "0.4rem" }}>
                  <button
                    type="button"
                    onClick={() => setIsEditingStructured((p) => !p)}
                    style={{
                      background: isEditingStructured ? "#eff6ff" : "#ffffff",
                      border: `1px solid ${isEditingStructured ? "#bfdbfe" : "#cbd5e1"}`,
                      color: isEditingStructured ? "#1d4ed8" : "#475569",
                      padding: "0.28rem 0.65rem",
                      borderRadius: "6px",
                      fontSize: "0.75rem",
                      fontWeight: 700,
                      cursor: "pointer",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "0.25rem"
                    }}
                  >
                    <Edit3 size={12} /> {isEditingStructured ? "Bulk Text Edit On" : "Double-Tap Markdown"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setExpandAll((p) => !p)}
                    style={{
                      background: "#ffffff",
                      border: "1px solid #cbd5e1",
                      color: "#334155",
                      padding: "0.28rem 0.65rem",
                      borderRadius: "6px",
                      fontSize: "0.75rem",
                      fontWeight: 700,
                      cursor: "pointer",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "0.25rem"
                    }}
                  >
                    {expandAll ? <Minimize2 size={12} /> : <Maximize2 size={12} />}
                    {expandAll ? "Collapse Notes" : "Expand All"}
                  </button>
                </div>
              </div>

              {items.length === 0 ? (
                <div style={{ textAlign: "center", padding: "3rem", background: "#f8fafc", borderRadius: "12px", border: "1px dashed #cbd5e1", color: "#64748b" }}>
                  No questions extracted on this exam yet. Switch to <strong>Manual Text / Paste Key</strong> above or add questions in Review &amp; Edit.
                </div>
              ) : (
                items.map((item, idx) => {
                  const sourceQ = (exam.questions || [])[idx];
                  const isSelected = activeIdx === idx;
                  return (
                    <div
                      key={`${item.q_no}-${idx}`}
                      onClick={() => setActiveIdx(idx)}
                      style={{
                        background: isSelected ? "#f8faff" : "#ffffff",
                        border: isSelected ? "2px solid #2563eb" : "1px solid #e2e8f0",
                        borderRadius: "12px",
                        padding: "1.1rem",
                        cursor: "pointer",
                        boxShadow: isSelected ? "0 4px 12px rgba(37, 99, 235, 0.08)" : "0 1px 2px rgba(15, 23, 42, 0.03)"
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                          <span style={{ background: "#2563eb", color: "#ffffff", padding: "0.15rem 0.55rem", borderRadius: "999px", fontSize: "0.76rem", fontWeight: 800 }}>
                            {item.q_no}
                          </span>
                          {sourceQ?.section && (
                            <span style={{ fontSize: "0.74rem", fontWeight: 600, color: "#64748b", background: "#f1f5f9", padding: "0.12rem 0.45rem", borderRadius: "5px" }}>
                              {sourceQ.section}
                            </span>
                          )}
                          {item.bloom_level && (
                            <span style={{ fontSize: "0.72rem", fontWeight: 700, color: "#0369a1", background: "#e0f2fe", padding: "0.12rem 0.45rem", borderRadius: "5px" }}>
                              {item.bloom_level}
                            </span>
                          )}
                        </div>
                        <span style={{ fontSize: "0.82rem", fontWeight: 800, color: "#0f172a" }}>
                          {item.marks} Marks
                        </span>
                      </div>

                      {sourceQ?.text && (
                        <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "8px", padding: "0.6rem 0.8rem", marginBottom: "0.75rem" }}>
                          <MarkdownQuestionView text={sourceQ.text} compact />
                        </div>
                      )}

                      {/* Model Answer */}
                      <div style={{ marginBottom: "0.75rem" }} onClick={(e) => e.stopPropagation()}>
                        <label style={{ display: "block", fontSize: "0.74rem", fontWeight: 800, color: "#475569", textTransform: "uppercase", marginBottom: "0.3rem" }}>
                          Expected Model Answer
                        </label>
                        {isEditingStructured ? (
                          <textarea
                            rows={Math.max(3, Math.min(7, (item.model_answer || "").split("\n").length + 1))}
                            value={item.model_answer || ""}
                            placeholder="Write or paste expected model answer for this question..."
                            onChange={(e) => handleUpdateItem(idx, { model_answer: e.target.value })}
                            style={{
                              width: "100%",
                              padding: "0.55rem 0.7rem",
                              borderRadius: "8px",
                              border: "1px solid #cbd5e1",
                              background: "#ffffff",
                              color: "#0f172a",
                              fontSize: "0.84rem",
                              lineHeight: 1.5
                            }}
                          />
                        ) : (
                          <DoubleTapMarkdownEditor
                            value={item.model_answer || ""}
                            onChange={(nextVal) => handleUpdateItem(idx, { model_answer: nextVal })}
                            compact
                            minRows={3}
                            maxRows={14}
                            placeholder="Write expected solution steps in Markdown..."
                            emptyHint="No model answer entered yet — double-tap to write."
                          />
                        )}
                      </div>

                      {/* Marks Distribution Split Bar */}
                      {item.marks_distribution && item.marks_distribution.length > 0 && (
                        <div style={{ marginBottom: "0.65rem" }}>
                          <div style={{ fontSize: "0.7rem", fontWeight: 800, color: "#64748b", textTransform: "uppercase", marginBottom: "0.25rem" }}>
                            Marks Breakdown
                          </div>
                          <div style={{ display: "flex", height: "26px", borderRadius: "6px", overflow: "hidden", border: "1px solid #e2e8f0" }}>
                            {item.marks_distribution.map((seg, sIdx) => (
                              <div
                                key={sIdx}
                                title={`${seg.label}: ${seg.marks}M`}
                                style={{
                                  flex: seg.marks || 1,
                                  background: seg.color || "#2563eb",
                                  color: "#ffffff",
                                  fontSize: "0.72rem",
                                  fontWeight: 700,
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  padding: "0 0.35rem",
                                  overflow: "hidden",
                                  whiteSpace: "nowrap"
                                }}
                              >
                                {seg.label} ({seg.marks}M)
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {expandAll && item.rubric_items && item.rubric_items.length > 0 && (
                        <div style={{ display: "flex", flexDirection: "column", gap: "0.45rem", marginTop: "0.5rem" }}>
                          {item.rubric_items.map((rub, rIdx) => (
                            <div key={rIdx} style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "8px", padding: "0.6rem 0.75rem" }}>
                              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.78rem", fontWeight: 800, color: "#0f172a", marginBottom: "0.2rem" }}>
                                <span>{rub.title}</span>
                                <span style={{ color: "#2563eb" }}>{rub.marks} marks</span>
                              </div>
                              {(rub.criteria || []).map((c, cIdx) => (
                                <div key={cIdx} style={{ fontSize: "0.75rem", color: "#475569", lineHeight: 1.45 }}>
                                  • {c}
                                </div>
                              ))}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </>
          )}
        </div>

        {/* RIGHT PANE: Real Scanned Paper Viewer & Active Question Highlight */}
        <div style={{ display: "flex", flexDirection: "column", minHeight: 0, background: "#f8fafc" }}>
          <div
            style={{
              padding: "0.75rem 1.25rem",
              background: "#ffffff",
              borderBottom: "1px solid #e2e8f0",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: "0.5rem"
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "0.45rem", fontSize: "0.82rem", fontWeight: 800, color: "#0f172a" }}>
              <Eye size={15} style={{ color: "#2563eb" }} />
              {exam.paper_id ? `Scanned Question Paper · Page ${currentPage} of ${totalPages}` : "Question Paper Reference"}
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "0.65rem" }}>
              {exam.paper_id && totalPages > 1 && (
                <div style={{ display: "flex", alignItems: "center", gap: "0.25rem" }}>
                  <button
                    type="button"
                    disabled={currentPage <= 1}
                    onClick={() => { setCurrentPage((p) => Math.max(1, p - 1)); setPaperLoadError(false); }}
                    style={{ background: "#ffffff", border: "1px solid #cbd5e1", borderRadius: "6px", padding: "0.22rem", cursor: currentPage <= 1 ? "not-allowed" : "pointer" }}
                  >
                    <ChevronLeft size={14} />
                  </button>
                  <span style={{ fontSize: "0.76rem", fontWeight: 700, padding: "0 0.25rem" }}>
                    {currentPage}/{totalPages}
                  </span>
                  <button
                    type="button"
                    disabled={currentPage >= totalPages}
                    onClick={() => { setCurrentPage((p) => Math.min(totalPages, p + 1)); setPaperLoadError(false); }}
                    style={{ background: "#ffffff", border: "1px solid #cbd5e1", borderRadius: "6px", padding: "0.22rem", cursor: currentPage >= totalPages ? "not-allowed" : "pointer" }}
                  >
                    <ChevronRight size={14} />
                  </button>
                </div>
              )}

              <div style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}>
                <input
                  type="range"
                  min="45"
                  max="145"
                  value={paperZoom}
                  onChange={(e) => setPaperZoom(Number(e.target.value))}
                  style={{ width: "85px", accentColor: "#2563eb" }}
                />
                <span style={{ fontSize: "0.76rem", fontWeight: 700, color: "#334155", minWidth: "36px" }}>
                  {paperZoom}%
                </span>
              </div>
            </div>
          </div>

          <div style={{ flex: 1, overflow: "auto", padding: "1.25rem", display: "flex", justifyContent: "center", alignItems: "flex-start" }}>
            {pageImageUrl && !paperLoadError ? (
              <div
                style={{
                  position: "relative",
                  width: `${paperZoom * 6.5}px`,
                  maxWidth: "none",
                  background: "#ffffff",
                  borderRadius: "8px",
                  boxShadow: "0 6px 24px rgba(15, 23, 42, 0.09)"
                }}
              >
                <img
                  src={pageImageUrl}
                  alt={`Question Paper Page ${currentPage}`}
                  onError={() => setPaperLoadError(true)}
                  style={{ width: "100%", height: "auto", display: "block", borderRadius: "8px" }}
                />
                {pageOverlayQuestions.length > 0 && (
                  <div style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
                    {pageOverlayQuestions.map((oq, oIdx) => {
                      const [ymin, xmin, ymax, xmax] = oq.box_2d as number[];
                      const isSel = activeQuestionObj?.q_no === oq.q_no && activeQuestionObj?.id === oq.id;
                      return (
                        <div
                          key={`${oq.id || oIdx}-ak-ov`}
                          onClick={() => {
                            const found = items.findIndex(
                              (it) => it.q_no?.trim().toLowerCase() === oq.q_no?.trim().toLowerCase()
                            );
                            if (found >= 0) setActiveIdx(found);
                          }}
                          style={{
                            position: "absolute",
                            top: `${ymin / 10}%`,
                            left: `${xmin / 10}%`,
                            height: `${Math.max(2.4, (ymax - ymin) / 10)}%`,
                            width: `${Math.max(4, (xmax - xmin) / 10)}%`,
                            border: isSel ? "2px solid #2563eb" : "1.5px dashed rgba(37, 99, 235, 0.55)",
                            background: isSel ? "rgba(37, 99, 235, 0.14)" : "rgba(37, 99, 235, 0.04)",
                            borderRadius: "6px",
                            pointerEvents: "auto",
                            cursor: "pointer",
                            zIndex: isSel ? 5 : 1
                          }}
                        >
                          <span
                            style={{
                              position: "absolute",
                              top: "-10px",
                              right: "6px",
                              background: isSel ? "#1d4ed8" : "#2563eb",
                              color: "#ffffff",
                              fontSize: "0.66rem",
                              fontWeight: 800,
                              padding: "1px 6px",
                              borderRadius: "999px",
                              whiteSpace: "nowrap"
                            }}
                          >
                            {oq.q_no} · {oq.marks}M
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            ) : (
              <div style={{ width: "100%", maxWidth: "520px", background: "#ffffff", border: "1px dashed #cbd5e1", borderRadius: "14px", padding: "2rem", textAlign: "center" }}>
                <FileText size={34} style={{ color: "#94a3b8", margin: "0 auto 0.75rem" }} />
                <h4 style={{ margin: "0 0 0.35rem", fontSize: "1rem", fontWeight: 800, color: "#0f172a" }}>
                  No Scanned Paper Image Attached
                </h4>
                <p style={{ margin: 0, fontSize: "0.82rem", color: "#64748b", lineHeight: 1.5 }}>
                  Upload the PDF/image in <strong>Review &amp; Edit Questions</strong> to inspect bounding-box overlays side-by-side here.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
