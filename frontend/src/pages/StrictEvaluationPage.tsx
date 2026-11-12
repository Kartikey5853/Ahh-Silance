import React, { useState, useEffect, useRef } from "react";
import { academicApi } from "../api/academicApi";
import { resolveApiUrl } from "../api/client";
import { AnswerKeyFullscreenWorkspace } from "../components/AnswerKeyFullscreenWorkspace";
import { DoubleTapMarkdownEditor } from "../components/DoubleTapMarkdownEditor";
import { MarkdownQuestionView } from "../components/MarkdownQuestionView";
import { useAnswerKeyStudio } from "../hooks/useAnswerKeyStudio";
import type { Exam, Student, AcademicEvaluation, Subject, ClassItem, AnswerRegionItem } from "../types/academic";
import {
  UploadCloud,
  CheckCircle2,
  Clock,
  Search,
  AlertCircle,
  ArrowLeft,
  Calendar,
  Download,
  ExternalLink,
  Eye,
  Send,
  ChevronLeft,
  ChevronRight,
  Filter,
  Check,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  PenTool,
  CheckSquare,
  Layers,
  RefreshCw,
  ScanLine,
  Sparkles
} from "lucide-react";

interface ScanningJobState {
  jobId: string;
  evalId: string;
  studentId: string;
  studentName: string;
  pageCount: number;
  stage: string;
  message: string;
  activePreviewPage: number;
}

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
  const [sheetZoom, setSheetZoom] = useState(100);
  const [magicInk, setMagicInk] = useState(true);
  const [showBoundaryBoxes, setShowBoundaryBoxes] = useState(true);
  const [sheetViewMode, setSheetViewMode] = useState<"all" | "single">("all");
  const [currentSheetPage, setCurrentSheetPage] = useState(1);
  const [activeQuestionIdx, setActiveQuestionIdx] = useState<number | null>(0);
  const [sheetImageMissing, setSheetImageMissing] = useState<Record<number, boolean>>({});
  const [isReEvaluating, setIsReEvaluating] = useState(false);
  const [isSavingInline, setIsSavingInline] = useState(false);

  // Unified Fullscreen Answer Key & Rubrics Studio (same component & state flow as Exam page)
  const answerKeyStudio = useAnswerKeyStudio({
    onExamUpdated: (updated) => {
      setExams((prev) => prev.map((ex) => (ex.id === updated.id ? updated : ex)));
    }
  });

  // Live non-blocking background evaluation scanner state
  const [evaluatingStudentId, setEvaluatingStudentId] = useState<string | null>(null);
  const [isEvaluatingAll, setIsEvaluatingAll] = useState(false);
  const [isEvaluatingAllMinimized, setIsEvaluatingAllMinimized] = useState(false);
  const [scanElapsed, setScanElapsed] = useState(0);
  const [evalProgressMessage, setEvalProgressMessage] = useState<string | null>(null);
  const [scanningJob, setScanningJob] = useState<ScanningJobState | null>(null);
  const scanPollRef = useRef<number | null>(null);

  useEffect(() => {
    let timer: number | null = null;
    if (scanningJob || isEvaluatingAll) {
      timer = window.setInterval(() => {
        setScanElapsed((s) => s + 1);
      }, 1000);
    } else {
      setScanElapsed(0);
    }
    return () => {
      if (timer !== null) window.clearInterval(timer);
    };
  }, [Boolean(scanningJob), isEvaluatingAll]);

  // Filters for View 2 (Exams Deadlines Overview)
  const [examSearchQuery, setExamSearchQuery] = useState("");
  const [examSubjectFilter, setExamSubjectFilter] = useState("");
  const [examKeyFilter, setExamKeyFilter] = useState<"all" | "approved" | "needed">("all");

  // Filters for Students Grading Table
  const [studentSearchQuery, setStudentSearchQuery] = useState("");
  const [studentClassFilter, setStudentClassFilter] = useState("");
  const [studentStatusFilter, setStudentStatusFilter] = useState<"all" | "evaluated" | "pending">("all");

  useEffect(() => {
    setSheetImageMissing({});
  }, [activeScorecard?.id]);

  useEffect(() => {
    return () => {
      if (scanPollRef.current !== null) {
        window.clearInterval(scanPollRef.current);
      }
    };
  }, []);

  useEffect(() => {
    Promise.all([
      academicApi.listExams(),
      academicApi.listSubjects(),
      academicApi.listClasses()
    ]).then(async ([exList, subjList, clsList]) => {
      setExams(exList);
      setSubjects(subjList);
      setClasses(clsList);
      if (initialExamId && exList.some((e) => e.id === initialExamId)) {
        setSelectedExamId(initialExamId);
      } else if (initialEvalId) {
        try {
          const ev = await academicApi.getEvaluation(initialEvalId);
          if (ev) {
            setSelectedExamId(ev.exam_id);
            setActiveScorecard(ev);
            setCurrentSheetPage(1);
          }
        } catch (err) {
          console.error("Failed to load initial evaluation:", err);
        }
      }
    });
  }, [initialExamId, initialEvalId]);

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
      // listEvaluations is ordered newest-first; keep only latest per student
      evalList.forEach((ev) => {
        if (!evalMap[ev.student_id]) {
          evalMap[ev.student_id] = ev;
        }
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

  const handleOpenAnswerKeyStudio = (examToOpen?: Exam) => {
    const target = examToOpen || activeExam;
    if (!target) return;
    const subj = subjects.find((s) => s.id === target.subject_id);
    void answerKeyStudio.openStudio(target, subj);
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

  const startAsyncStudentEvaluation = async (
    examId: string,
    studentId: string,
    studentName: string,
    file?: File | null,
    text?: string,
    fromReport = false
  ) => {
    if (scanPollRef.current !== null) {
      window.clearInterval(scanPollRef.current);
      scanPollRef.current = null;
    }
    if (fromReport) setIsReEvaluating(true);
    else setEvaluatingStudentId(studentId);
    setEvalProgressMessage(`Uploading & rasterizing sheets for ${studentName}...`);

    try {
      const accepted = await academicApi.evaluateStudentAsync(examId, studentId, file, file ? undefined : text);
      setScanningJob({
        jobId: accepted.job_id,
        evalId: accepted.eval_id,
        studentId,
        studentName,
        pageCount: accepted.page_count || 1,
        stage: "rasterized",
        message: `Rasterized ${accepted.page_count || 1} page(s). Running Prompt 1 spatial OCR...`,
        activePreviewPage: 1
      });

      const pollOnce = async () => {
        try {
          const job = await academicApi.getJobStatus(accepted.job_id);
          if (job.stage || job.message) {
            setScanningJob((prev) =>
              prev && prev.jobId === accepted.job_id
                ? { ...prev, stage: job.stage || prev.stage, message: job.message || prev.message }
                : prev
            );
            if (job.message) setEvalProgressMessage(job.message);
          }
          if (job.status === "completed" && job.result) {
            if (scanPollRef.current !== null) {
              window.clearInterval(scanPollRef.current);
              scanPollRef.current = null;
            }
            const scorecard = job.result as AcademicEvaluation;
            setEvaluations((prev) => ({ ...prev, [studentId]: scorecard }));
            setActiveScorecard(scorecard);
            setCurrentSheetPage(1);
            setActiveQuestionIdx(0);
            setSheetImageMissing({});
            setScanningJob(null);
            setEvaluatingStudentId(null);
            setIsReEvaluating(false);
            setEvalProgressMessage(null);
          } else if (job.status === "failed") {
            if (scanPollRef.current !== null) {
              window.clearInterval(scanPollRef.current);
              scanPollRef.current = null;
            }
            setScanningJob(null);
            setEvaluatingStudentId(null);
            setIsReEvaluating(false);
            setEvalProgressMessage(null);
            alert("Evaluation failed: " + (job.error || "Unknown pipeline error."));
          }
        } catch {
          // Keep polling quietly across transient timeouts
        }
      };

      void pollOnce();
      scanPollRef.current = window.setInterval(() => {
        void pollOnce();
      }, 1100);
    } catch (err: any) {
      setScanningJob(null);
      setEvaluatingStudentId(null);
      setIsReEvaluating(false);
      setEvalProgressMessage(null);
      alert("Evaluation failed: " + (err?.response?.data?.detail || err?.message || "Please check connection."));
    }
  };

  const handleEvaluateSingle = async (student: Student) => {
    if (!selectedExamId) return;
    if (!hasAnswerKey) {
      handleOpenAnswerKeyStudio();
      return;
    }

    const sheetData = studentSheets[student.id];
    const file = sheetData?.file || null;
    const text = sheetData?.text || "Candidate submitted examination answer booklet.";
    await startAsyncStudentEvaluation(selectedExamId, student.id, student.name, file, text, false);
  };

  const handleReEvaluateScorecardFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activeScorecard) return;
    e.target.value = "";
    setStudentSheets((prev) => ({
      ...prev,
      [activeScorecard.student_id]: { file, filename: file.name }
    }));
    await startAsyncStudentEvaluation(
      activeScorecard.exam_id,
      activeScorecard.student_id,
      activeScorecard.student_name,
      file,
      undefined,
      true
    );
  };

  const handleSaveScorecardBreakdown = async (qIdx: number, patch: Partial<any>) => {
    if (!activeScorecard) return;
    const updatedBreakdown = (activeScorecard.breakdown || []).map((item, idx) =>
      idx === qIdx ? { ...item, ...patch } : item
    );
    setActiveScorecard((prev) => (prev ? { ...prev, breakdown: updatedBreakdown } : prev));
    setIsSavingInline(true);
    try {
      const saved = await academicApi.updateEvaluation(activeScorecard.id, {
        breakdown: updatedBreakdown,
        teacher_feedback: activeScorecard.teacher_feedback
      });
      setActiveScorecard(saved);
      setEvaluations((prev) => ({ ...prev, [saved.student_id]: saved }));
    } catch (err: any) {
      alert("Failed to save edit: " + (err?.response?.data?.detail || err?.message));
    } finally {
      setIsSavingInline(false);
    }
  };

  const handleSaveTeacherFeedback = async (nextFeedback: string) => {
    if (!activeScorecard) return;
    setActiveScorecard((prev) => (prev ? { ...prev, teacher_feedback: nextFeedback } : prev));
    setIsSavingInline(true);
    try {
      const saved = await academicApi.updateEvaluation(activeScorecard.id, {
        teacher_feedback: nextFeedback
      });
      setActiveScorecard(saved);
      setEvaluations((prev) => ({ ...prev, [saved.student_id]: saved }));
    } catch (err: any) {
      alert("Failed to save feedback: " + (err?.response?.data?.detail || err?.message));
    } finally {
      setIsSavingInline(false);
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
    setActiveQuestionIdx(qIdx);
    const element = document.getElementById(`question-card-${qIdx}`);
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  const scrollToSheetPage = (pageNum: number, qIdx?: number) => {
    if (qIdx !== undefined) setActiveQuestionIdx(qIdx);
    setCurrentSheetPage(pageNum);
    setHideAnswerSheet(false);
    if (sheetViewMode === "all") {
      window.setTimeout(() => {
        const el = document.getElementById(`eval-sheet-page-${pageNum}`);
        if (el) el.scrollIntoView({ behavior: "smooth", block: "nearest" });
      }, 40);
    }
  };

  // ==============================================================
  // VIEW 0A: UNIFIED FULLSCREEN ANSWER KEY STUDIO (SAME AS EXAM PAGE)
  // ==============================================================
  if (answerKeyStudio.studioExam) {
    return (
      <AnswerKeyFullscreenWorkspace
        exam={answerKeyStudio.studioExam}
        subject={answerKeyStudio.studioSubject}
        answerKeyText={answerKeyStudio.answerKeyText}
        onChangeAnswerKeyText={answerKeyStudio.setAnswerKeyText}
        structuredAnswers={answerKeyStudio.structuredAnswers}
        onChangeStructuredAnswers={answerKeyStudio.setStructuredAnswers}
        bgJobStatus={answerKeyStudio.bgJobStatus}
        bgJobError={answerKeyStudio.bgJobError}
        bgWarning={answerKeyStudio.bgWarning}
        onStartBackgroundGeneration={answerKeyStudio.startBackgroundGeneration}
        onSaveAnswerKey={answerKeyStudio.saveAnswerKey}
        isSaving={answerKeyStudio.isSaving}
        onClose={answerKeyStudio.closeStudio}
      />
    );
  }

  // ==============================================================
  // VIEW 0B: LIVE NON-BLOCKING MULTIMODAL PAPER SCANNER OVERLAY
  // ==============================================================
  const renderLiveScannerModal = () => {
    if (!scanningJob) return null;
    const stages = [
      { key: "rasterized", label: "Rasterize PDF / Image Booklet (200 DPI)", done: true },
      {
        key: "prompt1_ocr",
        label: "Prompt 1/2: Extract Handwriting + Real Page & X/Y Regions (Gemini 3.8 Flash)",
        done: ["prompt2_evaluate", "rendering_overlays", "completed"].includes(scanningJob.stage)
      },
      {
        key: "prompt2_evaluate",
        label: "Prompt 2/2: High Thinking Multi-Step Rubric Reasoning & Marks",
        done: ["rendering_overlays", "completed"].includes(scanningJob.stage)
      },
      {
        key: "rendering_overlays",
        label: "Render Start/End Bounding Boxes & MagicInk Score Stamps",
        done: scanningJob.stage === "completed"
      }
    ];
    const previewPage = Math.max(1, Math.min(scanningJob.pageCount, scanningJob.activePreviewPage));

    return (
      <div
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(15, 23, 42, 0.55)",
          backdropFilter: "blur(4px)",
          zIndex: 9999,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "1.5rem"
        }}
      >
        <div
          style={{
            width: "100%",
            maxWidth: "980px",
            maxHeight: "88vh",
            background: "#ffffff",
            borderRadius: "18px",
            border: "1px solid #e2e8f0",
            boxShadow: "0 24px 60px rgba(15, 23, 42, 0.25)",
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            overflow: "hidden"
          }}
        >
          {/* Left: Pipeline Steps */}
          <div style={{ padding: "1.75rem", display: "flex", flexDirection: "column", justifyContent: "space-between", gap: "1.25rem", borderRight: "1px solid #e2e8f0" }}>
            <div>
              <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "0.45rem", marginBottom: "0.75rem" }}>
                <span style={{ display: "inline-flex", alignItems: "center", gap: "0.35rem", background: "#eff6ff", color: "#1d4ed8", border: "1px solid #bfdbfe", padding: "0.25rem 0.65rem", borderRadius: "999px", fontSize: "0.74rem", fontWeight: 800 }}>
                  <ScanLine size={13} /> LIVE 2-PROMPT SCANNER
                </span>
                <span style={{ display: "inline-flex", alignItems: "center", gap: "0.3rem", background: "#f5f3ff", color: "#6d28d9", border: "1px solid #ddd6fe", padding: "0.25rem 0.65rem", borderRadius: "999px", fontSize: "0.72rem", fontWeight: 800 }}>
                  <Sparkles size={12} /> GEMINI 3.8 FLASH • HIGH THINKING
                </span>
              </div>
              <h2 style={{ margin: "0 0 0.35rem", fontSize: "1.35rem", fontWeight: 900, color: "#0f172a" }}>
                Evaluating {scanningJob.studentName}&apos;s Paper
              </h2>
              <p style={{ margin: "0 0 1rem", fontSize: "0.84rem", color: "#475569", lineHeight: 1.5 }}>
                {scanningJob.message}
              </p>

              {/* Live Reasoning Elapsed Feedback */}
              <div
                style={{
                  background: "#f8fafc",
                  border: "1px solid #e2e8f0",
                  borderRadius: "10px",
                  padding: "0.65rem 0.85rem",
                  marginBottom: "1rem",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  fontSize: "0.78rem"
                }}
              >
                <span style={{ color: "#475569", fontWeight: 600 }}>
                  Reasoning elapsed: <strong style={{ color: "#0f172a" }}>{scanElapsed}s</strong>
                </span>
                {scanElapsed >= 8 && (
                  <span style={{ color: "#6d28d9", fontWeight: 700, fontSize: "0.72rem" }}>
                    🧠 Deep chain-of-thought verification in progress...
                  </span>
                )}
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "0.65rem" }}>
                {stages.map((st, sIdx) => {
                  const isActive = !st.done && scanningJob.stage === st.key;
                  return (
                    <div
                      key={st.key}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "0.75rem",
                        padding: "0.7rem 0.9rem",
                        borderRadius: "10px",
                        background: st.done ? "#f0fdf4" : isActive ? "#eff6ff" : "#f8fafc",
                        border: `1px solid ${st.done ? "#bbf7d0" : isActive ? "#93c5fd" : "#e2e8f0"}`
                      }}
                    >
                      {st.done ? (
                        <CheckCircle2 size={17} style={{ color: "#16a34a", flexShrink: 0 }} />
                      ) : isActive ? (
                        <RefreshCw size={16} className="spin" style={{ color: "#2563eb", flexShrink: 0 }} />
                      ) : (
                        <span style={{ width: "16px", height: "16px", borderRadius: "50%", border: "2px solid #cbd5e1", fontSize: "0.65rem", display: "inline-flex", alignItems: "center", justifyContent: "center", color: "#64748b", fontWeight: 800, flexShrink: 0 }}>
                          {sIdx + 1}
                        </span>
                      )}
                      <span style={{ fontSize: "0.82rem", fontWeight: st.done || isActive ? 700 : 500, color: st.done ? "#166534" : isActive ? "#1e3a8a" : "#64748b" }}>
                        {st.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: "0.75rem", borderTop: "1px solid #f1f5f9" }}>
              <span style={{ fontSize: "0.74rem", color: "#64748b" }}>
                {scanningJob.pageCount} Page(s) • Non-blocking background evaluation
              </span>
              <button
                type="button"
                onClick={() => setScanningJob(null)}
                style={{
                  background: "#ffffff",
                  border: "1px solid #cbd5e1",
                  color: "#475569",
                  padding: "0.38rem 0.85rem",
                  borderRadius: "8px",
                  fontSize: "0.78rem",
                  fontWeight: 700,
                  cursor: "pointer"
                }}
              >
                Run in Background
              </button>
            </div>
          </div>

          {/* Right: Live Uploaded Paper Visual Scan */}
          <div style={{ background: "#f8fafc", padding: "1.25rem", display: "flex", flexDirection: "column", minHeight: 0 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem" }}>
              <span style={{ fontSize: "0.8rem", fontWeight: 800, color: "#0f172a" }}>
                Uploaded Sheet Preview · Page {previewPage} / {scanningJob.pageCount}
              </span>
              {scanningJob.pageCount > 1 && (
                <div style={{ display: "flex", gap: "0.35rem" }}>
                  <button
                    type="button"
                    disabled={previewPage <= 1}
                    onClick={() => setScanningJob((j) => (j ? { ...j, activePreviewPage: Math.max(1, previewPage - 1) } : null))}
                    style={{ background: "#ffffff", border: "1px solid #cbd5e1", borderRadius: "6px", padding: "0.15rem 0.45rem", fontSize: "0.72rem", cursor: "pointer" }}
                  >
                    Prev
                  </button>
                  <button
                    type="button"
                    disabled={previewPage >= scanningJob.pageCount}
                    onClick={() => setScanningJob((j) => (j ? { ...j, activePreviewPage: Math.min(scanningJob.pageCount, previewPage + 1) } : null))}
                    style={{ background: "#ffffff", border: "1px solid #cbd5e1", borderRadius: "6px", padding: "0.15rem 0.45rem", fontSize: "0.72rem", cursor: "pointer" }}
                  >
                    Next
                  </button>
                </div>
              )}
            </div>

            <div
              style={{
                flex: 1,
                minHeight: 0,
                background: "#ffffff",
                border: "1px solid #e2e8f0",
                borderRadius: "10px",
                position: "relative",
                overflow: "hidden",
                display: "flex",
                alignItems: "center",
                justifyContent: "center"
              }}
            >
              <img
                src={resolveApiUrl(`/api/v1/academic/evaluations/${scanningJob.evalId}/pages/${previewPage}`)}
                alt={`Student Sheet Preview Page ${previewPage}`}
                onError={(e) => {
                  e.currentTarget.style.display = "none";
                }}
                style={{ width: "100%", height: "100%", objectFit: "contain" }}
              />

              {/* Live Laser Sweep Scan Animation */}
              <div
                style={{
                  position: "absolute",
                  left: 0,
                  right: 0,
                  height: "3px",
                  background: "linear-gradient(90deg, transparent, #2563eb, #9333ea, #2563eb, transparent)",
                  boxShadow: "0 0 12px 2px rgba(37, 99, 235, 0.65)",
                  animation: "laserSweep 2.2s ease-in-out infinite"
                }}
              />
            </div>
          </div>
        </div>
      </div>
    );
  };

  // ==============================================================
  // VIEW 0C: BATCH "EVALUATE ALL" FULL SCREEN LOADING MODAL
  // ==============================================================
  const renderEvaluatingAllModal = () => {
    if (!isEvaluatingAll) return null;

    if (isEvaluatingAllMinimized) {
      return (
        <div
          onClick={() => setIsEvaluatingAllMinimized(false)}
          style={{
            position: "fixed",
            bottom: "1.5rem",
            right: "1.5rem",
            zIndex: 9999,
            background: "#1e293b",
            color: "#ffffff",
            padding: "0.65rem 1rem",
            borderRadius: "999px",
            boxShadow: "0 10px 25px rgba(0, 0, 0, 0.25)",
            display: "flex",
            alignItems: "center",
            gap: "0.6rem",
            cursor: "pointer",
            border: "1px solid #334155"
          }}
        >
          <RefreshCw size={14} className="spin" style={{ color: "#60a5fa" }} />
          <span style={{ fontSize: "0.8rem", fontWeight: 700 }}>
            Evaluating All Students ({scanElapsed}s)
          </span>
          <span style={{ background: "#2563eb", padding: "0.15rem 0.5rem", borderRadius: "999px", fontSize: "0.7rem", fontWeight: 800 }}>
            Click to expand
          </span>
        </div>
      );
    }

    return (
      <div
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(15, 23, 42, 0.6)",
          backdropFilter: "blur(4px)",
          zIndex: 9999,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "1.5rem"
        }}
      >
        <div
          style={{
            width: "100%",
            maxWidth: "540px",
            background: "#ffffff",
            borderRadius: "18px",
            border: "1px solid #e2e8f0",
            boxShadow: "0 24px 60px rgba(15, 23, 42, 0.25)",
            padding: "2rem",
            display: "flex",
            flexDirection: "column",
            gap: "1.25rem",
            textAlign: "center"
          }}
        >
          <div style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", gap: "0.4rem", alignSelf: "center", background: "#f5f3ff", color: "#6d28d9", border: "1px solid #ddd6fe", padding: "0.28rem 0.75rem", borderRadius: "999px", fontSize: "0.75rem", fontWeight: 800 }}>
            <Sparkles size={13} /> GEMINI 3.8 FLASH • HIGH THINKING ACTIVE
          </div>

          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "0.5rem" }}>
            <div style={{ width: "52px", height: "52px", borderRadius: "50%", background: "#eff6ff", border: "2px solid #bfdbfe", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <RefreshCw size={26} className="spin" style={{ color: "#2563eb" }} />
            </div>
            <h2 style={{ fontSize: "1.3rem", fontWeight: 900, color: "#0f172a", margin: "0.35rem 0 0" }}>
              Batch Evaluating All Class Submissions
            </h2>
            <p style={{ fontSize: "0.86rem", color: "#64748b", margin: 0, maxWidth: "420px", lineHeight: 1.5 }}>
              {evalProgressMessage || "Gemini 3.8 Flash is applying high-depth chain-of-thought OCR to detect handwriting, map question boundaries, and award rubric scores."}
            </p>
          </div>

          <div
            style={{
              background: "#f8fafc",
              border: "1px solid #e2e8f0",
              borderRadius: "12px",
              padding: "0.85rem 1rem",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              fontSize: "0.82rem"
            }}
          >
            <span style={{ color: "#475569", fontWeight: 600 }}>
              Elapsed Processing Time: <strong style={{ color: "#0f172a" }}>{scanElapsed}s</strong>
            </span>
            <span style={{ color: "#2563eb", fontWeight: 700 }}>
              Class: {students.length} Student{students.length !== 1 ? "s" : ""}
            </span>
          </div>

          <div style={{ display: "flex", justifyContent: "center", gap: "0.75rem", paddingTop: "0.5rem" }}>
            <button
              type="button"
              onClick={() => setIsEvaluatingAllMinimized(true)}
              style={{
                background: "#f1f5f9",
                border: "1px solid #cbd5e1",
                color: "#334155",
                padding: "0.5rem 1.15rem",
                borderRadius: "8px",
                fontSize: "0.84rem",
                fontWeight: 700,
                cursor: "pointer"
              }}
            >
              Minimize & Run in Background
            </button>
          </div>
        </div>
      </div>
    );
  };

  // ==============================================================
  // VIEW 1: FULLSCREEN SPLIT EVALUATION REPORT (CLEAN WHITE THEME ONLY)
  // ==============================================================
  if (activeScorecard) {
    const totalScore = activeScorecard.total_score || 0;
    const maxScore = activeScorecard.max_score || 20;
    const percentage = activeScorecard.percentage ?? (maxScore > 0 ? Math.round((totalScore / maxScore) * 100) : 0);

    const breakdown = activeScorecard.breakdown || [];
    const correctCount = breakdown.filter((b) => b.awarded_marks >= (b.max_marks || 5) * 0.9 && (b.max_marks || 0) > 0).length;
    const partialCount = breakdown.filter((b) => b.awarded_marks > 0 && b.awarded_marks < (b.max_marks || 5) * 0.9).length;
    const incorrectCount = breakdown.filter((b) => (b.awarded_marks || 0) === 0).length;

    const totalPages = Math.max(1, activeScorecard.page_count || 1);
    const overlaysMap = (activeScorecard.magic_ink?.svg_overlays || {}) as Record<string, string>;
    const apiWarning = activeScorecard.api_warning || activeScorecard.magic_ink?.api_warning;
    const hasRasterPages = Boolean(activeScorecard.pages_dir) || totalPages >= 1;
    const rawFileUrl = resolveApiUrl(`/api/v1/academic/evaluations/${activeScorecard.id}/file`);

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

          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", flexWrap: "wrap" }}>
            {isSavingInline && (
              <span style={{ fontSize: "0.75rem", fontWeight: 700, color: "#2563eb", background: "#eff6ff", padding: "0.3rem 0.65rem", borderRadius: "8px" }}>
                Saving edits...
              </span>
            )}
            {activeExam && (
              <button
                type="button"
                onClick={() => handleOpenAnswerKeyStudio(activeExam)}
                style={{
                  background: "#f8fafc",
                  border: "1px solid #cbd5e1",
                  color: "#0f172a",
                  padding: "0.5rem 0.9rem",
                  borderRadius: "8px",
                  fontSize: "0.82rem",
                  fontWeight: 700,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.35rem"
                }}
              >
                <Sparkles size={14} style={{ color: "#2563eb" }} /> Answer Key &amp; Rubrics
              </button>
            )}
            <label
              style={{
                background: isReEvaluating ? "#f1f5f9" : "#eff6ff",
                border: "1px solid #bfdbfe",
                color: "#1d4ed8",
                padding: "0.5rem 0.95rem",
                borderRadius: "8px",
                fontSize: "0.82rem",
                fontWeight: 700,
                cursor: isReEvaluating ? "wait" : "pointer",
                display: "flex",
                alignItems: "center",
                gap: "0.35rem"
              }}
            >
              <UploadCloud size={14} />
              {isReEvaluating ? "Scanning & Re-Evaluating..." : "Upload & Re-Evaluate"}
              <input
                type="file"
                accept="image/*,application/pdf"
                disabled={isReEvaluating}
                onChange={handleReEvaluateScorecardFile}
                style={{ display: "none" }}
              />
            </label>
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
              <Download size={14} /> Print / PDF
            </button>
          </div>
        </div>

        {renderLiveScannerModal()}

        {apiWarning && (
          <div
            style={{
              background: "#fffbeb",
              border: "1px solid #fcd34d",
              borderRadius: "12px",
              padding: "0.8rem 1.15rem",
              marginBottom: "1rem",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "0.75rem",
              flexWrap: "wrap",
              color: "#92400e",
              fontSize: "0.82rem"
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <AlertCircle size={16} style={{ flexShrink: 0 }} />
              <span>
                <strong>Gemini API Notice:</strong> {apiWarning}
              </span>
            </div>
            <span style={{ fontSize: "0.76rem", fontWeight: 700 }}>
              Double-tap any OCR/feedback card to edit manually or re-upload when quota resets.
            </span>
          </div>
        )}

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
                      onClick={() => {
                        scrollToQuestion(qIdx);
                        const jumpPage = q.start_page ?? q.page;
                        if (jumpPage) scrollToSheetPage(jumpPage, qIdx);
                      }}
                      title={`Jump to Question ${q.q_no || qIdx + 1} (${q.awarded_marks}/${q.max_marks} marks)`}
                      style={{
                        minWidth: "40px",
                        height: "38px",
                        padding: "0 0.45rem",
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

            {/* SCOPE OF IMPROVEMENT & TEACHER REMARKS */}
            {(() => {
              const focusImprovement =
                breakdown.find((b: any) => b.awarded_marks < (b.max_marks || 0) && b.improvement_tip) || breakdown[0];
              const tipText =
                focusImprovement?.improvement_tip ||
                "Review rubric deductions across questions below for step-by-step improvement insights.";
              return (
                <div style={{ display: "flex", flexDirection: "column", gap: "0.85rem" }}>
                  <div style={{ background: "#fffbeb", border: "1px solid #fed7aa", borderRadius: "14px", padding: "1.25rem", boxShadow: "0 1px 3px rgba(0, 0, 0, 0.02)" }}>
                    <div style={{ fontSize: "0.82rem", fontWeight: 800, color: "#9a3412", marginBottom: "0.75rem", textTransform: "uppercase", display: "flex", alignItems: "center", gap: "0.4rem" }}>
                      <AlertCircle size={15} /> Scope of Improvement
                    </div>

                    <div style={{ background: "#ffffff", border: "1px solid #fde68a", borderRadius: "10px", padding: "1rem" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.45rem" }}>
                        <span style={{ width: "22px", height: "22px", borderRadius: "4px", background: "#f59e0b", color: "#ffffff", fontSize: "0.75rem", fontWeight: 900, display: "flex", alignItems: "center", justifyContent: "center" }}>
                          {focusImprovement?.q_no || "1"}
                        </span>
                        <span style={{ fontSize: "0.88rem", fontWeight: 800, color: "#0f172a" }}>
                          {focusImprovement?.improvement_title || "Evaluation Focus & Rubric Feedback"}
                        </span>
                      </div>
                      <MarkdownQuestionView text={tipText} compact />
                    </div>
                  </div>

                  <div style={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: "14px", padding: "1.1rem 1.25rem", boxShadow: "0 1px 3px rgba(0, 0, 0, 0.02)" }}>
                    <div style={{ fontSize: "0.78rem", fontWeight: 800, color: "#475569", marginBottom: "0.5rem", textTransform: "uppercase", letterSpacing: "0.04em", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <span>Overall Teacher Remarks</span>
                      <span style={{ fontSize: "0.7rem", fontWeight: 600, color: "#94a3b8", textTransform: "none" }}>
                        Double-tap to edit
                      </span>
                    </div>
                    <DoubleTapMarkdownEditor
                      value={activeScorecard.teacher_feedback || ""}
                      onChange={(nextVal) =>
                        setActiveScorecard((prev) => (prev ? { ...prev, teacher_feedback: nextVal } : prev))
                      }
                      onCommit={handleSaveTeacherFeedback}
                      compact
                      minRows={2}
                      placeholder="Write overall teacher remarks (Markdown supported)..."
                      emptyHint="Double-tap to add overall teacher remarks..."
                    />
                  </div>
                </div>
              );
            })()}

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
                  const qMax = Number(q.max_marks || 5.0);
                  const qAwarded = Number(q.awarded_marks || 0);
                  const isOmitted = Boolean(q.omitted) || q.status === "OMITTED";
                  const isUnattempted = q.status === "UNATTEMPTED";
                  const isFull = qMax > 0 && qAwarded >= qMax * 0.9;
                  const isPartial = qAwarded > 0 && !isFull;
                  const statusColor = isOmitted ? "#64748b" : isFull ? "#16a34a" : isPartial ? "#d97706" : "#dc2626";
                  const statusBg = isOmitted ? "#f1f5f9" : isFull ? "#dcfce7" : isPartial ? "#fef3c7" : "#fee2e2";
                  const isSelected = activeQuestionIdx === idx;

                  const startPage = q.start_page ?? q.page ?? null;
                  const endPage = q.end_page ?? startPage;
                  const pageLabel =
                    startPage && endPage
                      ? startPage === endPage
                        ? `Page ${startPage}`
                        : `Pages ${startPage}–${endPage}`
                      : isOmitted
                      ? "Omitted OR Choice"
                      : isUnattempted
                      ? "Not Attempted"
                      : "Unlocated";

                  const ocrContent =
                    q.ocr_extracted_text ||
                    q.student_transcription ||
                    activeScorecard.structured_transcription?.find((tx: any) => {
                      const tq = String(tx.q_no || "").trim().toLowerCase();
                      const cq = String(q.q_no || "").trim().toLowerCase();
                      return (
                        tq === cq ||
                        tq.startsWith(cq + ":") ||
                        tq.startsWith(cq + " ") ||
                        tq.startsWith(cq + ".") ||
                        String(tx.written_heading || "").toLowerCase().includes(cq)
                      );
                    })?.structured_text ||
                    q.evidence_quote ||
                    "";

                  const checks =
                    q.rubric_checks && q.rubric_checks.length > 0
                      ? q.rubric_checks
                      : [
                          {
                            criterion: q.feedback || "Overall rubric evaluation",
                            awarded: qAwarded,
                            max: qMax,
                            status: isFull ? "MET" : isPartial ? "PARTIAL" : "MISSED"
                          }
                        ];

                  const totalCheckMax = Math.max(
                    0.1,
                    checks.reduce((acc: number, c: any) => acc + Number(c.max || 0), 0) || qMax
                  );

                  return (
                    <div
                      key={idx}
                      id={`question-card-${idx}`}
                      onClick={() => {
                        setActiveQuestionIdx(idx);
                        if (startPage) scrollToSheetPage(startPage, idx);
                      }}
                      style={{
                        background: "#ffffff",
                        border: isSelected ? "2px solid #2563eb" : "1px solid #e2e8f0",
                        borderRadius: "14px",
                        overflow: "hidden",
                        boxShadow: isSelected
                          ? "0 6px 20px rgba(37, 99, 235, 0.10)"
                          : "0 1px 4px rgba(0, 0, 0, 0.03)",
                        cursor: "pointer"
                      }}
                    >
                      {/* Question Card Header */}
                      <div
                        style={{
                          padding: "0.95rem 1.2rem",
                          background: isSelected ? "#f8faff" : "#f8fafc",
                          borderBottom: "1px solid #e2e8f0",
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "flex-start",
                          flexWrap: "wrap",
                          gap: "0.75rem"
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "flex-start", gap: "0.75rem", flex: 1, minWidth: "240px" }}>
                          <span
                            style={{
                              background: isSelected ? "#2563eb" : "#1e293b",
                              color: "#ffffff",
                              fontSize: "0.82rem",
                              fontWeight: 900,
                              padding: "0.28rem 0.6rem",
                              borderRadius: "8px",
                              fontFamily: "monospace",
                              flexShrink: 0
                            }}
                          >
                            {String(q.q_no || idx + 1).toUpperCase().startsWith("Q") ? q.q_no : `Q${q.q_no || idx + 1}`}
                          </span>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <MarkdownQuestionView
                              text={q.question_text || `Question ${q.q_no || idx + 1}`}
                              compact
                            />
                            <div style={{ fontSize: "0.74rem", color: "#64748b", marginTop: "0.3rem", display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
                              <span
                                style={{
                                  background: startPage ? "#eff6ff" : "#f1f5f9",
                                  color: startPage ? "#1d4ed8" : "#64748b",
                                  border: `1px solid ${startPage ? "#bfdbfe" : "#e2e8f0"}`,
                                  padding: "0.1rem 0.45rem",
                                  borderRadius: "6px",
                                  fontWeight: 700
                                }}
                              >
                                {pageLabel}
                              </span>
                              <span>• Max {qMax} Marks</span>
                              {(q.answer_regions?.length || 0) > 0 && (
                                <span style={{ color: "#0369a1", fontWeight: 600 }}>
                                  • {q.answer_regions.length} PDF region{q.answer_regions.length > 1 ? "s" : ""} mapped
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        <div
                          onClick={(e) => e.stopPropagation()}
                          style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}
                        >
                          <span
                            style={{
                              background: statusBg,
                              color: statusColor,
                              fontSize: "0.75rem",
                              fontWeight: 800,
                              padding: "0.24rem 0.6rem",
                              borderRadius: "9999px"
                            }}
                          >
                            {q.status || (isFull ? "CORRECT" : isPartial ? "PARTIAL" : "INCORRECT")}
                          </span>

                          {/* Quick +/- 0.5 mark adjuster */}
                          <div
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              background: "#ffffff",
                              border: "1px solid #cbd5e1",
                              borderRadius: "8px",
                              overflow: "hidden"
                            }}
                          >
                            <button
                              type="button"
                              title="Decrease 0.5 mark"
                              onClick={() => {
                                const nextM = Math.max(0, Number((qAwarded - 0.5).toFixed(1)));
                                const nextStatus = nextM >= qMax ? "CORRECT" : nextM > 0 ? "PARTIAL" : "INCORRECT";
                                void handleSaveScorecardBreakdown(idx, { awarded_marks: nextM, status: nextStatus });
                              }}
                              style={{ background: "#f8fafc", border: "none", borderRight: "1px solid #e2e8f0", padding: "0.22rem 0.45rem", fontWeight: 800, cursor: "pointer", color: "#475569" }}
                            >
                              −
                            </button>
                            <span style={{ padding: "0.22rem 0.55rem", fontSize: "0.86rem", fontWeight: 900, color: "#0f172a" }}>
                              {qAwarded} / {qMax}
                            </span>
                            <button
                              type="button"
                              title="Increase 0.5 mark"
                              onClick={() => {
                                const nextM = Math.min(qMax, Number((qAwarded + 0.5).toFixed(1)));
                                const nextStatus = nextM >= qMax ? "CORRECT" : nextM > 0 ? "PARTIAL" : "INCORRECT";
                                void handleSaveScorecardBreakdown(idx, { awarded_marks: nextM, status: nextStatus });
                              }}
                              style={{ background: "#f8fafc", border: "none", borderLeft: "1px solid #e2e8f0", padding: "0.22rem 0.45rem", fontWeight: 800, cursor: "pointer", color: "#475569" }}
                            >
                              +
                            </button>
                          </div>

                          {startPage && (
                            <button
                              type="button"
                              onClick={() => scrollToSheetPage(startPage, idx)}
                              style={{
                                background: "#ffffff",
                                border: "1px solid #cbd5e1",
                                color: "#2563eb",
                                fontSize: "0.75rem",
                                fontWeight: 700,
                                padding: "0.28rem 0.6rem",
                                borderRadius: "6px",
                                cursor: "pointer"
                              }}
                              title={`Jump to ${pageLabel} on Uploaded Sheet`}
                            >
                              Locate Pg {startPage} →
                            </button>
                          )}
                        </div>
                      </div>

                      {/* SIDE-BY-SIDE BODY: Student Handwritten OCR (Left) + Rubric Criteria Side Bar (Right) */}
                      <div
                        style={{
                          display: "grid",
                          gridTemplateColumns: "minmax(0, 1.35fr) minmax(240px, 0.95fr)",
                          gap: "1rem",
                          padding: "1.1rem 1.2rem",
                          background: "#ffffff",
                          alignItems: "start"
                        }}
                      >
                        {/* LEFT: Clean LLM Markdown Handwriting OCR + Examiner Note */}
                        <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", minWidth: 0 }}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
                            <span style={{ fontSize: "0.72rem", fontWeight: 800, color: "#15803d", background: "#f0fdf4", border: "1px solid #bbf7d0", padding: "0.18rem 0.55rem", borderRadius: "9999px", display: "inline-flex", alignItems: "center", gap: "0.28rem" }}>
                              <Check size={11} /> Student Handwriting OCR
                            </span>
                            <span style={{ fontSize: "0.71rem", color: "#64748b", fontWeight: 600 }}>
                              {startPage ? `Extracted from ${pageLabel}` : pageLabel} • Double-tap to edit
                            </span>
                          </div>

                          <DoubleTapMarkdownEditor
                            value={ocrContent}
                            onChange={(val) => {
                              const nextBreakdown = (activeScorecard.breakdown || []).map((b, bIdx) =>
                                bIdx === idx ? { ...b, ocr_extracted_text: val } : b
                              );
                              setActiveScorecard((prev) => (prev ? { ...prev, breakdown: nextBreakdown } : prev));
                            }}
                            onCommit={(val) => handleSaveScorecardBreakdown(idx, { ocr_extracted_text: val })}
                            compact
                            minRows={3}
                            maxRows={14}
                            placeholder="Write or refine transcribed handwritten answer in Markdown..."
                            emptyHint="*No handwritten text recorded for this question — double-tap to add notes.*"
                            style={{ background: "#f8fafc" }}
                          />

                          {/* Concise Feedback & Deduction callout below OCR */}
                          <div
                            style={{
                              background:
                                q.deduction_reason && q.deduction_reason !== "None. Full credit." && !isFull
                                  ? "#fef2f2"
                                  : "#f8fafc",
                              border: `1px solid ${
                                q.deduction_reason && q.deduction_reason !== "None. Full credit." && !isFull
                                  ? "#fecaca"
                                  : "#e2e8f0"
                              }`,
                              borderRadius: "10px",
                              padding: "0.65rem 0.8rem"
                            }}
                          >
                            <div style={{ fontSize: "0.71rem", fontWeight: 800, color: "#475569", textTransform: "uppercase", marginBottom: "0.3rem" }}>
                              Examiner Feedback {q.deduction_reason && q.deduction_reason !== "None. Full credit." ? "& Deduction" : ""}
                            </div>
                            <DoubleTapMarkdownEditor
                              value={
                                [
                                  q.deduction_reason && q.deduction_reason !== "None. Full credit."
                                    ? `**Deduction:** ${q.deduction_reason}`
                                    : "",
                                  q.feedback ? q.feedback : ""
                                ]
                                  .filter(Boolean)
                                  .join("\n\n")
                              }
                              onChange={(val) => {
                                const nextBreakdown = (activeScorecard.breakdown || []).map((b, bIdx) =>
                                  bIdx === idx ? { ...b, feedback: val } : b
                                );
                                setActiveScorecard((prev) => (prev ? { ...prev, breakdown: nextBreakdown } : prev));
                              }}
                              onCommit={(val) => handleSaveScorecardBreakdown(idx, { feedback: val })}
                              compact
                              minRows={2}
                              maxRows={6}
                              emptyHint="Full credit awarded — double-tap to add examiner feedback."
                              style={{ background: "#ffffff", padding: "0.45rem 0.6rem" }}
                            />
                          </div>
                        </div>

                        {/* RIGHT SIDE BAR: Rubric Criteria Checks right next to Student Handwritten OCR */}
                        <div
                          style={{
                            background: "#f8fafc",
                            border: "1px solid #e2e8f0",
                            borderRadius: "12px",
                            padding: "0.85rem",
                            display: "flex",
                            flexDirection: "column",
                            gap: "0.65rem"
                          }}
                        >
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <span style={{ fontSize: "0.74rem", fontWeight: 800, color: "#0f172a", textTransform: "uppercase", letterSpacing: "0.03em", display: "inline-flex", alignItems: "center", gap: "0.35rem" }}>
                              <CheckSquare size={13} style={{ color: "#2563eb" }} />
                              Rubric Criteria ({checks.length})
                            </span>
                            <span style={{ fontSize: "0.76rem", fontWeight: 800, color: statusColor }}>
                              {qAwarded}/{qMax} pts
                            </span>
                          </div>

                          {/* Segmented Rubric Achievement Bar */}
                          <div style={{ display: "flex", height: "8px", borderRadius: "999px", overflow: "hidden", background: "#e2e8f0", gap: "1px" }}>
                            {checks.map((rc: any, rcIdx: number) => {
                              const cMax = Number(rc.max || 0);
                              const cAw = Number(rc.awarded || 0);
                              const cMet = rc.status === "MET" || (cMax > 0 && cAw >= cMax);
                              const cPartial = !cMet && cAw > 0;
                              const barColor = cMet ? "#16a34a" : cPartial ? "#f59e0b" : "#cbd5e1";
                              const segWidth = Math.max(8, (cMax / totalCheckMax) * 100);
                              return (
                                <div
                                  key={rcIdx}
                                  title={`${rc.criterion}: ${cAw}/${cMax} pts`}
                                  style={{
                                    width: `${segWidth}%`,
                                    background: barColor,
                                    transition: "background 0.2s ease"
                                  }}
                                />
                              );
                            })}
                          </div>

                          {/* Individual Atomic Criterion Bars */}
                          <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                            {checks.map((rc: any, rcIdx: number) => {
                              const cMax = Number(rc.max || 0);
                              const cAw = Number(rc.awarded || 0);
                              const cMet = rc.status === "MET" || (cMax > 0 && cAw >= cMax);
                              const cPartial = !cMet && cAw > 0;
                              const pctBar = cMax > 0 ? Math.min(100, Math.round((cAw / cMax) * 100)) : cMet ? 100 : 0;
                              const fillHex = cMet ? "#16a34a" : cPartial ? "#d97706" : "#ef4444";

                              return (
                                <div
                                  key={rcIdx}
                                  style={{
                                    background: "#ffffff",
                                    border: `1px solid ${cMet ? "#bbf7d0" : cPartial ? "#fde68a" : "#fecaca"}`,
                                    borderRadius: "8px",
                                    padding: "0.55rem 0.65rem"
                                  }}
                                >
                                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "0.45rem", marginBottom: "0.3rem" }}>
                                    <div style={{ display: "flex", alignItems: "flex-start", gap: "0.38rem", flex: 1, minWidth: 0 }}>
                                      <span style={{ color: fillHex, marginTop: "2px", flexShrink: 0 }}>
                                        {cMet ? <CheckCircle2 size={13} /> : <AlertCircle size={13} />}
                                      </span>
                                      <div style={{ fontSize: "0.78rem", color: "#1e293b", lineHeight: 1.4, fontWeight: 600 }}>
                                        <MarkdownQuestionView text={rc.criterion || "Criterion"} compact />
                                      </div>
                                    </div>
                                    <span style={{ fontSize: "0.74rem", fontWeight: 800, color: fillHex, whiteSpace: "nowrap" }}>
                                      {cAw}/{cMax}
                                    </span>
                                  </div>

                                  <div style={{ height: "5px", borderRadius: "999px", background: "#f1f5f9", overflow: "hidden" }}>
                                    <div
                                      style={{
                                        width: `${pctBar}%`,
                                        height: "100%",
                                        background: fillHex,
                                        borderRadius: "999px"
                                      }}
                                    />
                                  </div>

                                  {rc.evidence && (
                                    <div style={{ marginTop: "0.28rem", fontSize: "0.71rem", color: "#64748b", fontStyle: "italic", lineHeight: 1.35 }}>
                                      &ldquo;{rc.evidence}&rdquo;
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </div>
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
                  gap: "0.45rem"
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", flexWrap: "wrap" }}>
                  {/* MagicInk Toggle */}
                  <button
                    type="button"
                    onClick={() => setMagicInk(!magicInk)}
                    style={{
                      background: magicInk ? "#fef2f2" : "#f8fafc",
                      border: `1.5px solid ${magicInk ? "#dc2626" : "#cbd5e1"}`,
                      color: magicInk ? "#dc2626" : "#64748b",
                      padding: "0.3rem 0.65rem",
                      borderRadius: "8px",
                      fontSize: "0.75rem",
                      fontWeight: 800,
                      cursor: "pointer",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "0.3rem"
                    }}
                  >
                    <PenTool size={12} />
                    {magicInk ? "✓ MagicInk" : "MagicInk"}
                  </button>

                  {/* Start/End Boundary Overlay Boxes Toggle */}
                  <button
                    type="button"
                    onClick={() => setShowBoundaryBoxes((p) => !p)}
                    style={{
                      background: showBoundaryBoxes ? "#eff6ff" : "#f8fafc",
                      border: `1.5px solid ${showBoundaryBoxes ? "#2563eb" : "#cbd5e1"}`,
                      color: showBoundaryBoxes ? "#1d4ed8" : "#64748b",
                      padding: "0.3rem 0.65rem",
                      borderRadius: "8px",
                      fontSize: "0.75rem",
                      fontWeight: 800,
                      cursor: "pointer",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "0.3rem"
                    }}
                  >
                    <Layers size={12} />
                    {showBoundaryBoxes ? "✓ Start/End Bounds" : "Start/End Bounds"}
                  </button>

                  {/* All Pages Scroll vs Single Page Toggle */}
                  <div style={{ display: "inline-flex", background: "#f1f5f9", borderRadius: "8px", padding: "2px", border: "1px solid #cbd5e1" }}>
                    <button
                      type="button"
                      onClick={() => setSheetViewMode("all")}
                      style={{
                        background: sheetViewMode === "all" ? "#ffffff" : "transparent",
                        color: sheetViewMode === "all" ? "#0f172a" : "#64748b",
                        border: "none",
                        borderRadius: "6px",
                        padding: "0.22rem 0.5rem",
                        fontSize: "0.72rem",
                        fontWeight: 700,
                        cursor: "pointer"
                      }}
                    >
                      All Pages ({totalPages})
                    </button>
                    <button
                      type="button"
                      onClick={() => setSheetViewMode("single")}
                      style={{
                        background: sheetViewMode === "single" ? "#ffffff" : "transparent",
                        color: sheetViewMode === "single" ? "#0f172a" : "#64748b",
                        border: "none",
                        borderRadius: "6px",
                        padding: "0.22rem 0.5rem",
                        fontSize: "0.72rem",
                        fontWeight: 700,
                        cursor: "pointer"
                      }}
                    >
                      Single Page
                    </button>
                  </div>
                </div>

                {/* Page Navigation, Zoom & Open Raw PDF */}
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
                  {sheetViewMode === "single" && (
                    <div style={{ display: "flex", alignItems: "center", gap: "0.25rem" }}>
                      <button
                        type="button"
                        disabled={currentSheetPage <= 1}
                        onClick={() => setCurrentSheetPage((p) => Math.max(1, p - 1))}
                        style={{
                          background: "#f1f5f9",
                          border: "1px solid #cbd5e1",
                          borderRadius: "6px",
                          padding: "0.22rem 0.4rem",
                          cursor: currentSheetPage <= 1 ? "not-allowed" : "pointer"
                        }}
                        title="Previous Page"
                      >
                        <ChevronLeft size={13} />
                      </button>
                      <span style={{ fontSize: "0.75rem", color: "#475569", fontWeight: 700 }}>
                        {currentSheetPage} / {totalPages}
                      </span>
                      <button
                        type="button"
                        disabled={currentSheetPage >= totalPages}
                        onClick={() => setCurrentSheetPage((p) => Math.min(totalPages, p + 1))}
                        style={{
                          background: "#f1f5f9",
                          border: "1px solid #cbd5e1",
                          borderRadius: "6px",
                          padding: "0.22rem 0.4rem",
                          cursor: currentSheetPage >= totalPages ? "not-allowed" : "pointer"
                        }}
                        title="Next Page"
                      >
                        <ChevronRight size={13} />
                      </button>
                    </div>
                  )}

                  <div style={{ display: "flex", alignItems: "center", gap: "0.25rem" }}>
                    <button
                      type="button"
                      onClick={() => setSheetZoom((z) => Math.max(60, z - 15))}
                      style={{ background: "#f1f5f9", border: "1px solid #cbd5e1", borderRadius: "6px", padding: "0.24rem", cursor: "pointer" }}
                      title="Zoom Out"
                    >
                      <ZoomOut size={13} />
                    </button>
                    <span style={{ fontSize: "0.73rem", color: "#64748b", fontWeight: 700, minWidth: "34px", textAlign: "center" }}>
                      {sheetZoom}%
                    </span>
                    <button
                      type="button"
                      onClick={() => setSheetZoom((z) => Math.min(180, z + 15))}
                      style={{ background: "#f1f5f9", border: "1px solid #cbd5e1", borderRadius: "6px", padding: "0.24rem", cursor: "pointer" }}
                      title="Zoom In"
                    >
                      <ZoomIn size={13} />
                    </button>
                    <button
                      type="button"
                      onClick={() => setSheetZoom(100)}
                      style={{ background: "#f1f5f9", border: "1px solid #cbd5e1", borderRadius: "6px", padding: "0.24rem", cursor: "pointer" }}
                      title="Reset Zoom"
                    >
                      <RotateCcw size={13} />
                    </button>
                  </div>

                  <a
                    href={rawFileUrl}
                    target="_blank"
                    rel="noreferrer"
                    style={{
                      background: "#ffffff",
                      border: "1px solid #cbd5e1",
                      color: "#334155",
                      borderRadius: "6px",
                      padding: "0.24rem 0.55rem",
                      fontSize: "0.73rem",
                      fontWeight: 700,
                      textDecoration: "none",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "0.25rem"
                    }}
                    title="Open Originally Uploaded File"
                  >
                    <ExternalLink size={12} /> Raw File
                  </a>
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
                  padding: "1rem",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: "1rem",
                  position: "relative",
                  maxHeight: "74vh"
                }}
              >
                {!hasRasterPages ? (
                  <div
                    style={{
                      width: "100%",
                      maxWidth: "460px",
                      background: "#ffffff",
                      border: "1px dashed #cbd5e1",
                      borderRadius: "14px",
                      padding: "2rem 1.5rem",
                      textAlign: "center",
                      margin: "1.5rem auto",
                      boxShadow: "0 2px 10px rgba(0, 0, 0, 0.03)"
                    }}
                  >
                    <div style={{ fontSize: "0.98rem", fontWeight: 800, color: "#0f172a", marginBottom: "0.5rem" }}>
                      Answer Booklet Pages Not Rasterized Yet
                    </div>
                    <p style={{ fontSize: "0.82rem", color: "#64748b", lineHeight: 1.6, marginBottom: "1.25rem" }}>
                      Upload the student&apos;s answer PDF or scan below to generate page overlays, verbatim OCR, and start/end boxes.
                    </p>
                    <label
                      className="btn btn-primary"
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "0.45rem",
                        padding: "0.6rem 1.1rem",
                        fontSize: "0.84rem",
                        cursor: isReEvaluating ? "wait" : "pointer"
                      }}
                    >
                      <UploadCloud size={15} />
                      {isReEvaluating ? "Generating Overlays..." : "Upload Answer Sheet & Scan"}
                      <input
                        type="file"
                        accept="image/*,application/pdf"
                        disabled={isReEvaluating}
                        onChange={handleReEvaluateScorecardFile}
                        style={{ display: "none" }}
                      />
                    </label>
                  </div>
                ) : (
                  (sheetViewMode === "all"
                    ? Array.from({ length: totalPages }, (_, i) => i + 1)
                    : [currentSheetPage]
                  ).map((pageNum) => {
                    const pageSvg = overlaysMap[String(pageNum)] || (overlaysMap as any)[pageNum] || "";
                    const pageImgMissing = Boolean(sheetImageMissing[pageNum]);
                    const pageImgUrl = resolveApiUrl(`/api/v1/academic/evaluations/${activeScorecard.id}/pages/${pageNum}`);

                    // Collect Start/End answer regions present on this page
                    const pageRegions: Array<{
                      qIdx: number;
                      qNo: string;
                      awarded: number;
                      max: number;
                      box_2d: [number, number, number, number];
                      isStart: boolean;
                      isEnd: boolean;
                    }> = [];

                    breakdown.forEach((b: any, bIdx: number) => {
                      const regions: AnswerRegionItem[] = b.answer_regions || [];
                      if (regions.length > 0) {
                        regions.forEach((reg, rIdx) => {
                          if (Number(reg.page) === pageNum && Array.isArray(reg.box_2d) && reg.box_2d.length >= 4) {
                            pageRegions.push({
                              qIdx: bIdx,
                              qNo: String(b.q_no || bIdx + 1),
                              awarded: Number(b.awarded_marks || 0),
                              max: Number(b.max_marks || 5),
                              box_2d: reg.box_2d,
                              isStart: Boolean(reg.is_start ?? rIdx === 0),
                              isEnd: Boolean(reg.is_end ?? rIdx === regions.length - 1),
                            });
                          }
                        });
                      } else if (b.status !== "UNATTEMPTED" && b.status !== "OMITTED" && b.page === pageNum) {
                        const qa = (activeScorecard.magic_ink?.question_annotations || []).find(
                          (a: any) =>
                            Number(a.page) === pageNum &&
                            String(a.q_no || "").toLowerCase() === String(b.q_no || "").toLowerCase()
                        );
                        if (qa?.question_box && Array.isArray(qa.question_box) && qa.question_box.length >= 4) {
                          pageRegions.push({
                            qIdx: bIdx,
                            qNo: String(b.q_no || bIdx + 1),
                            awarded: Number(b.awarded_marks || 0),
                            max: Number(b.max_marks || 5),
                            box_2d: qa.question_box,
                            isStart: true,
                            isEnd: true,
                          });
                        }
                      }
                    });

                    return (
                      <div
                        key={pageNum}
                        id={`eval-sheet-page-${pageNum}`}
                        style={{
                          width: `${sheetZoom * 4.7}px`,
                          maxWidth: "100%",
                          transition: "width 0.15s ease",
                          position: "relative",
                          borderRadius: "10px",
                          overflow: "hidden",
                          background: "#ffffff",
                          border: "1px solid #cbd5e1",
                          boxShadow: "0 4px 18px rgba(15, 23, 42, 0.08)"
                        }}
                      >
                        <div
                          style={{
                            position: "absolute",
                            top: "8px",
                            left: "8px",
                            zIndex: 4,
                            background: "rgba(15, 23, 42, 0.78)",
                            color: "#ffffff",
                            fontSize: "0.7rem",
                            fontWeight: 800,
                            padding: "2px 8px",
                            borderRadius: "999px",
                            pointerEvents: "none"
                          }}
                        >
                          Page {pageNum} of {totalPages}
                        </div>

                        {pageImgMissing ? (
                          <div style={{ padding: "2.5rem 1.5rem", textAlign: "center", color: "#64748b", fontSize: "0.84rem" }}>
                            Page {pageNum} preview could not be loaded. Use{" "}
                            <a href={rawFileUrl} target="_blank" rel="noreferrer" style={{ color: "#2563eb", fontWeight: 700 }}>
                              Open Uploaded Booklet
                            </a>{" "}
                            or re-upload the answer booklet below.
                          </div>
                        ) : (
                          <img
                            src={pageImgUrl}
                            onError={() => setSheetImageMissing((prev) => ({ ...prev, [pageNum]: true }))}
                            alt={`Answer Booklet Page ${pageNum}`}
                            style={{ width: "100%", height: "auto", display: "block" }}
                          />
                        )}

                        {/* Interactive Answer Start & End Bounding Overlays */}
                        {showBoundaryBoxes && !pageImgMissing && pageRegions.length > 0 && (
                          <div style={{ position: "absolute", inset: 0, pointerEvents: "none", zIndex: 2 }}>
                            {pageRegions.map((pr, rIdx) => {
                              const [ymin, xmin, ymax, xmax] = pr.box_2d;
                              const isSel = activeQuestionIdx === pr.qIdx;
                              const accent = isSel ? "#2563eb" : "#0ea5e9";
                              return (
                                <div
                                  key={`${pr.qNo}-${rIdx}`}
                                  onClick={() => scrollToQuestion(pr.qIdx)}
                                  title={`Jump to Q${pr.qNo} (${pr.awarded}/${pr.max})`}
                                  style={{
                                    position: "absolute",
                                    top: `${Math.max(0.5, ymin / 10)}%`,
                                    left: `${Math.max(0.5, xmin / 10)}%`,
                                    height: `${Math.max(3, Math.min(99 - ymin / 10, (ymax - ymin) / 10))}%`,
                                    width: `${Math.max(6, Math.min(99 - xmin / 10, (xmax - xmin) / 10))}%`,
                                    border: isSel ? `2.5px solid ${accent}` : "1.5px dashed rgba(14, 165, 233, 0.72)",
                                    background: isSel ? "rgba(37, 99, 235, 0.10)" : "rgba(14, 165, 233, 0.04)",
                                    borderRadius: "6px",
                                    pointerEvents: "auto",
                                    cursor: "pointer",
                                    zIndex: isSel ? 5 : 1,
                                    transition: "all 0.15s ease"
                                  }}
                                >
                                  <span
                                    style={{
                                      position: "absolute",
                                      top: "-10px",
                                      left: "6px",
                                      background: isSel ? "#1d4ed8" : "#0284c7",
                                      color: "#ffffff",
                                      fontSize: "0.65rem",
                                      fontWeight: 800,
                                      padding: "1px 7px",
                                      borderRadius: "999px",
                                      whiteSpace: "nowrap",
                                      boxShadow: "0 1px 4px rgba(15, 23, 42, 0.22)"
                                    }}
                                  >
                                    {pr.isStart ? `▶ Q${pr.qNo} Starts` : `Q${pr.qNo} Cont.`}
                                  </span>

                                  {pr.isEnd && (
                                    <span
                                      style={{
                                        position: "absolute",
                                        bottom: "-10px",
                                        right: "6px",
                                        background: "#0f172a",
                                        color: "#ffffff",
                                        fontSize: "0.63rem",
                                        fontWeight: 800,
                                        padding: "1px 7px",
                                        borderRadius: "999px",
                                        whiteSpace: "nowrap",
                                        boxShadow: "0 1px 4px rgba(15, 23, 42, 0.22)"
                                      }}
                                    >
                                      ■ Q{pr.qNo} Ends · {pr.awarded}/{pr.max}
                                    </span>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}

                        {/* Real MagicInk Vector SVG Overlay */}
                        {magicInk && !pageImgMissing && pageSvg ? (
                          <div
                            style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", pointerEvents: "none", zIndex: 3 }}
                            dangerouslySetInnerHTML={{ __html: pageSvg }}
                          />
                        ) : null}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </div>
        {renderLiveScannerModal()}
        {renderEvaluatingAllModal()}
      </div>
    );
  }

  // ==============================================================
  // VIEW 2: EXAM SELECTION & STUDENT GRADING TABLE (WITH FULL FILTERS)
  // ==============================================================
  return (
    <div className="strict-evaluation-page pb-24">
      {renderLiveScannerModal()}
      {renderEvaluatingAllModal()}
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

                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1.25fr", gap: "0.5rem" }}>
                      <button
                        type="button"
                        onClick={() => handleOpenAnswerKeyStudio(ex)}
                        style={{
                          background: "#eff6ff",
                          border: "1px solid #bfdbfe",
                          color: "#1d4ed8",
                          borderRadius: "8px",
                          fontSize: "0.8rem",
                          fontWeight: 700,
                          padding: "0.52rem 0.5rem",
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: "0.3rem"
                        }}
                      >
                        <Sparkles size={13} /> Answer Key &amp; Rubrics
                      </button>

                      <button
                        onClick={() => setSelectedExamId(ex.id)}
                        className="btn btn-primary"
                        style={{ width: "100%", fontSize: "0.82rem", padding: "0.52rem", display: "flex", alignItems: "center", justifyContent: "center", gap: "0.35rem" }}
                      >
                        Select &amp; Grade →
                      </button>
                    </div>
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
              <button
                type="button"
                onClick={() => handleOpenAnswerKeyStudio()}
                style={{
                  background: hasAnswerKey ? "#eff6ff" : "#2563eb",
                  border: hasAnswerKey ? "1px solid #bfdbfe" : "none",
                  color: hasAnswerKey ? "#1d4ed8" : "#ffffff",
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
                <Sparkles size={14} /> Answer Key &amp; Rubrics
              </button>

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
                              <>
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
                                <button
                                  onClick={() => handleEvaluateSingle(stud)}
                                  disabled={isEvaluating || !hasAnswerKey}
                                  className="btn btn-secondary"
                                  style={{ fontSize: "0.75rem", padding: "0.4rem 0.7rem", display: "flex", alignItems: "center", gap: "0.3rem" }}
                                  title={sheetData?.file ? `Re-evaluate with ${sheetData.filename}` : "Re-run evaluation"}
                                >
                                  <Sparkles size={12} /> {isEvaluating ? "Grading..." : "Re-Evaluate"}
                                </button>
                              </>
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
