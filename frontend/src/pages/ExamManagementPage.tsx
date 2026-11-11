import React, { useState, useEffect, useRef } from "react";
import { academicApi } from "../api/academicApi";
import { resolveApiUrl } from "../api/client";
import { MarkdownQuestionView } from "../components/MarkdownQuestionView";
import { ExamDetailWorkspace } from "../components/ExamDetailWorkspace";
import { AnswerKeyFullscreenWorkspace } from "../components/AnswerKeyFullscreenWorkspace";
import type {
  Subject,
  Exam,
  ExamDetailsResponse,
  AnswerKeyStructuredItem,
  QuestionItem,
  ClassItem,
  DigitalPaperHeader,
  RefineQuestionSuggestion
} from "../types/academic";
import {
  UploadCloud,
  ArrowRight,
  ArrowLeft,
  FileText,
  Plus,
  Trash2,
  Check,
  Search,
  RefreshCw,
  Clock,
  Calendar,
  Sparkles,
  CheckCircle2,
  FileSpreadsheet,
  Download,
  Eye,
  EyeOff,
  Sliders,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  FolderGit2,
  MoreVertical,
  Edit3,
  Wand2,
  X,
  Minimize2,
  Maximize2
} from "lucide-react";

interface ExamManagementProps {
  initialSubjectId?: string;
  onNavigate: (tab: any, params?: any) => void;
}

export const ExamManagementPage: React.FC<ExamManagementProps> = ({
  initialSubjectId,
  onNavigate
}) => {
  // View mode: "list" | "detail" | "create" (3-step editor / review) | "answer-key-review"
  const [viewMode, setViewMode] = useState<"list" | "detail" | "create" | "answer-key-review">("list");
  // Modular Flow Steps: 1 = Upload PDF, 2 = Confirm Meta & Structure, 3 = Split Review & Edit
  const [step, setStep] = useState<1 | 2 | 3>(1);

  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<string>("");
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>(initialSubjectId || "");
  const [exams, setExams] = useState<Exam[]>([]);
  const [activeExam, setActiveExam] = useState<Exam | null>(null);
  const [examDetails, setExamDetails] = useState<ExamDetailsResponse | null>(null);
  const [loadingDetails, setLoadingDetails] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(false);

  // Zoom control for question paper preview
  const [paperZoom, setPaperZoom] = useState<number>(75);

  // Accordion & Collapse toggles in Exam Review & Edit
  const [openInfoAccordion, setOpenInfoAccordion] = useState(true);
  const [openInstructionsAccordion, setOpenInstructionsAccordion] = useState(true);
  const [openQuestionsAccordion, setOpenQuestionsAccordion] = useState(true);
  const [collapsedQuestionKeys, setCollapsedQuestionKeys] = useState<Record<string, boolean>>({});
  const [allQuestionsCollapsed, setAllQuestionsCollapsed] = useState<boolean>(false);

  // Exam Details Form
  const [examTitle, setExamTitle] = useState("B.Tech Semester End Examination");
  const [examType, setExamType] = useState("Semester Exam");
  const [targetSection, setTargetSection] = useState("");
  const [passingMarks, setPassingMarks] = useState(24.0);
  const [academicYear, setAcademicYear] = useState("2026-2027");
  const [examDate, setExamDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [correctionDeadline, setCorrectionDeadline] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 10);
    return d.toISOString().split("T")[0];
  });
  const [answerKeyText, setAnswerKeyText] = useState("");
  const [structuredAnswersList, setStructuredAnswersList] = useState<AnswerKeyStructuredItem[]>([]);

  // Non-blocking background Gemini job state keyed by exam_id
  const [bgAnswerKeyJobs, setBgAnswerKeyJobs] = useState<
    Record<
      string,
      {
        jobId: string;
        status: "idle" | "running" | "completed" | "failed";
        error?: string | null;
        warning?: string | null;
      }
    >
  >({});
  const [answerKeyReturnView, setAnswerKeyReturnView] = useState<"list" | "detail">("list");

  // Answer Sheets Upload Modal State
  const [showAnswerSheetModal, setShowAnswerSheetModal] = useState(false);
  const [sheetModalExam, setSheetModalExam] = useState<Exam | null>(null);
  const [uploadedAnswerFiles, setUploadedAnswerFiles] = useState<File[]>([]);
  const [uploadActiveTab, setUploadActiveTab] = useState<"upload" | "students">("upload");

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
  const [, setPaperFile] = useState<File | null>(null);
  const [paperId, setPaperId] = useState<string>("");
  const [paperPageCount, setPaperPageCount] = useState<number>(0);
  const [paperFilename, setPaperFilename] = useState<string>("");
  const [paperLocalFallbackUrl, setPaperLocalFallbackUrl] = useState<string>("");
  const [paperImageError, setPaperImageError] = useState<boolean>(false);
  const [currentPaperPage, setCurrentPaperPage] = useState<number>(1);
  const [showPaperOverlays, setShowPaperOverlays] = useState<boolean>(true);
  const [isScanning, setIsScanning] = useState(false);
  const [scanMessage, setScanMessage] = useState<string | null>(null);
  const step3UploadInputRef = useRef<HTMLInputElement | null>(null);

  // Questions List, Active Focus, Markdown Double-Tap Edit & Card Refs
  const [questions, setQuestions] = useState<QuestionItem[]>([]);
  const [activeQuestionId, setActiveQuestionId] = useState<string | null>(null);
  const [editingQuestionIdx, setEditingQuestionIdx] = useState<number | null>(null);
  const lastTapRef = useRef<Record<number, number>>({});
  const questionCardRefs = useRef<Record<string, HTMLDivElement | null>>({});

  // Refine Question Modal State
  const [refineModalIdx, setRefineModalIdx] = useState<number | null>(null);
  const [refineAction, setRefineAction] = useState<"level_shift" | "auto_generate" | "rephrase" | "practical">("level_shift");
  const [refineTargetLevel, setRefineTargetLevel] = useState<string>("Hard");
  const [refineCustomInstruction, setRefineCustomInstruction] = useState<string>("");
  const [refineLoading, setRefineLoading] = useState<boolean>(false);
  const [refineTopic, setRefineTopic] = useState<string>("");
  const [refineSuggestions, setRefineSuggestions] = useState<RefineQuestionSuggestion[]>([]);
  const [refineError, setRefineError] = useState<string | null>(null);

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

  // Non-blocking background job poller so Gemini synthesis never stalls UI or navigation
  useEffect(() => {
    const runningEntries = Object.entries(bgAnswerKeyJobs).filter(
      ([, info]) => info.status === "running" && info.jobId
    );
    if (runningEntries.length === 0) return;

    const timer = window.setInterval(async () => {
      for (const [examId, info] of runningEntries) {
        try {
          const job = await academicApi.getJobStatus(info.jobId);
          if (job.status === "completed") {
            const res = job.result || {};
            setBgAnswerKeyJobs((prev) => ({
              ...prev,
              [examId]: {
                jobId: info.jobId,
                status: "completed",
                warning: res.api_warning || null,
                error: null
              }
            }));
            if (activeExam?.id === examId) {
              if (res.answer_key_text) setAnswerKeyText(res.answer_key_text);
              if (Array.isArray(res.answers)) setStructuredAnswersList(res.answers);
            }
            if (examDetails?.exam?.id === examId) {
              const refreshed = await academicApi.getExamDetails(examId);
              setExamDetails(refreshed);
              setActiveExam(refreshed.exam);
            }
            await loadExams();
          } else if (job.status === "failed") {
            setBgAnswerKeyJobs((prev) => ({
              ...prev,
              [examId]: {
                jobId: info.jobId,
                status: "failed",
                error: job.error || "Background synthesis failed."
              }
            }));
          }
        } catch {
          // Transient poll failure; keep retrying on next tick
        }
      }
    }, 2500);

    return () => window.clearInterval(timer);
  }, [bgAnswerKeyJobs, activeExam?.id, examDetails?.exam?.id]);

  const selectAndSyncQuestion = (q: QuestionItem) => {
    const qid = q.id || null;
    setActiveQuestionId(qid);
    if (q.page && q.page >= 1) {
      const maxP = Math.max(1, paperPageCount || 1);
      setCurrentPaperPage(Math.min(maxP, q.page));
      setPaperImageError(false);
    }
  };

  const handlePaperOverlaySelect = (q: QuestionItem) => {
    const qid = q.id || null;
    setActiveQuestionId(qid);
    setOpenQuestionsAccordion(true);
    if (qid && questionCardRefs.current[qid]) {
      questionCardRefs.current[qid]?.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  };

  const handleQuestionTouchEnd = (idx: number) => {
    const now = Date.now();
    const prev = lastTapRef.current[idx] || 0;
    if (now - prev > 0 && now - prev < 350) {
      setEditingQuestionIdx(idx);
      lastTapRef.current[idx] = 0;
    } else {
      lastTapRef.current[idx] = now;
    }
  };

  const runRefineRequest = async (
    idx: number,
    action: "level_shift" | "auto_generate" | "rephrase" | "practical",
    targetLevel: string,
    customNote = ""
  ) => {
    const q = questions[idx];
    if (!q) return;
    setRefineAction(action);
    setRefineTargetLevel(targetLevel);
    setRefineLoading(true);
    setRefineError(null);

    const subjObj = subjects.find((s) => s.id === selectedSubjectId);
    try {
      const res = await academicApi.refineQuestion({
        question_text: q.text,
        q_no: q.q_no,
        marks: Number(q.marks) || 5,
        subject_name: subjObj ? `${subjObj.name} (${subjObj.code})` : "",
        exam_title: examTitle,
        action,
        target_level: targetLevel,
        custom_instruction: customNote
      });
      setRefineTopic(res.topic_detected || "");
      setRefineSuggestions(res.suggestions || []);
    } catch (err: any) {
      setRefineError(err?.response?.data?.detail || err?.message || "Failed to generate refined questions.");
    } finally {
      setRefineLoading(false);
    }
  };

  const handleOpenRefineModal = (idx: number) => {
    setEditingQuestionIdx(null);
    setRefineModalIdx(idx);
    setRefineCustomInstruction("");
    setRefineSuggestions([]);
    setRefineTopic("");
    setRefineError(null);
    // Lazy generation: waits for user to click a preset button or enter an instruction
  };

  const handleApplyReplaceQuestion = (suggestion: RefineQuestionSuggestion) => {
    if (refineModalIdx === null) return;
    const updated = [...questions];
    const current = updated[refineModalIdx];
    updated[refineModalIdx] = {
      ...current,
      text: suggestion.question_text,
      rubric: suggestion.rubric || current.rubric,
      marks: Number(current.marks) > 0 ? current.marks : suggestion.marks
    };
    setQuestions(updated);
    setRefineModalIdx(null);
  };

  const handleAddGeneratedAsNewQuestion = (suggestion: RefineQuestionSuggestion) => {
    if (refineModalIdx === null) return;
    const baseQ = questions[refineModalIdx];
    const newId = `q-gen-${Date.now().toString().slice(-5)}`;
    const newQ: QuestionItem = {
      id: newId,
      q_no: `Q${questions.length + 1}`,
      section: baseQ?.section || "Section A",
      text: suggestion.question_text,
      marks: suggestion.marks || baseQ?.marks || 5.0,
      is_or_choice: false,
      or_group: null,
      page: baseQ?.page || currentPaperPage || 1,
      box_2d: baseQ?.box_2d,
      rubric: suggestion.rubric || "Award marks for accurate conceptual explanation and complete working."
    };
    const updated = [
      ...questions.slice(0, refineModalIdx + 1),
      newQ,
      ...questions.slice(refineModalIdx + 1)
    ];
    setQuestions(updated);
    setActiveQuestionId(newId);
    setRefineModalIdx(null);
  };

  const loadExamIntoEditor = (exam: Exam) => {
    setActiveExam(exam);
    setExamTitle(exam.title);
    setExamType(exam.exam_type);
    setTargetSection(exam.target_section || "");
    setPassingMarks(exam.passing_marks);
    setAcademicYear(exam.academic_year || "2026-2027");
    setExamDate(exam.exam_date || new Date().toISOString().split("T")[0]);
    if (exam.correction_deadline) {
      setCorrectionDeadline(exam.correction_deadline);
    }
    if (exam.subject_id) {
      setSelectedSubjectId(exam.subject_id);
      const subjObj = subjects.find((s) => s.id === exam.subject_id);
      if (subjObj?.class_id) setSelectedClassId(subjObj.class_id);
    }
    setAnswerKeyText(exam.answer_key_text || "");
    setPaperId(exam.paper_id || "");
    setPaperPageCount(exam.paper_page_count || 0);
    setPaperFilename(exam.question_paper_filename || "");
    setPaperLocalFallbackUrl("");
    setPaperImageError(false);
    setCurrentPaperPage(1);
    setEditingQuestionIdx(null);
    setRefineModalIdx(null);
    setCollapsedQuestionKeys({});
    setAllQuestionsCollapsed(false);

    const qs = (exam.questions || []).map((q, idx) => ({
      ...q,
      id: q.id || `q-${idx + 1}`
    }));
    setQuestions(qs);
    if (qs.length > 0) {
      setActiveQuestionId(qs[0].id || "q-1a");
    }

    const currentSubj = subjects.find((s) => s.id === exam.subject_id);
    setDigitalHeader({
      title: exam.title.toUpperCase(),
      institution: currentSubj?.name || "Academic Department",
      course: `${currentSubj?.name || "Course"} (${currentSubj?.code || "CODE"})`,
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

  const handleStartUploadNewExam = (presetClassId?: string, presetSubjectId?: string) => {
    setActiveExam(null);
    setExamTitle("B.Tech Semester End Examination");
    setExamType("Semester Exam");
    setTargetSection("");
    setPassingMarks(24.0);
    setCollapsedQuestionKeys({});
    setAllQuestionsCollapsed(false);
    setRefineModalIdx(null);
    setExamDate(new Date().toISOString().split("T")[0]);
    const d = new Date();
    d.setDate(d.getDate() + 10);
    setCorrectionDeadline(d.toISOString().split("T")[0]);
    setAnswerKeyText("");
    setQuestions([]);
    setPaperFile(null);
    setPaperId("");
    setPaperPageCount(0);
    setPaperFilename("");
    setPaperLocalFallbackUrl("");
    setPaperImageError(false);
    setCurrentPaperPage(1);
    setEditingQuestionIdx(null);
    setScanMessage(null);
    if (presetClassId) setSelectedClassId(presetClassId);
    if (presetSubjectId) setSelectedSubjectId(presetSubjectId);
    setViewMode("create");
    setStep(1);
  };

  const handlePaperUpload = async (e: React.ChangeEvent<HTMLInputElement>, stayOnStep3 = false) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    setPaperFile(file);
    setPaperFilename(file.name);
    setPaperImageError(false);
    if (file.type.startsWith("image/")) {
      setPaperLocalFallbackUrl(URL.createObjectURL(file));
    } else {
      setPaperLocalFallbackUrl("");
    }
    setIsScanning(true);
    setScanMessage("Rasterizing pages and extracting questions & spatial overlays with Gemini...");

    try {
      const res = await academicApi.scanQuestionPaper(file);
      const qs = res.questions.map((q, idx) => ({
        ...q,
        id: q.id || `q-${idx + 1}`,
        marks: Number(q.marks) || (q.section === "Part A" ? 1.0 : 10.0)
      }));

      setPaperId(res.paper_id || "");
      setPaperPageCount(res.paper_page_count || 1);
      setCurrentPaperPage(1);
      setEditingQuestionIdx(null);
      setQuestions(qs);
      if (qs.length > 0) {
        setActiveQuestionId(qs[0].id || "q-1a");
      }

      if (res.header) {
        setDigitalHeader({
          title: res.header.title || "EXAMINATION QUESTION PAPER",
          institution: res.header.institution || "Academic Department",
          course: res.header.course || "Core Curriculum",
          time_allowed: res.header.time_allowed || "3 Hours",
          max_marks: res.total_marks || 60.0,
          instructions: res.header.instructions || []
        });
      }

      setStep(stayOnStep3 ? 3 : 2);
    } catch (err: any) {
      alert("Failed to scan question paper. Falling back to structured editor.");
      setStep(stayOnStep3 ? 3 : 2);
    } finally {
      setIsScanning(false);
      setScanMessage(null);
    }
  };

  const handleMarkChange = (index: number, newMarks: number) => {
    const updated = [...questions];
    updated[index] = { ...updated[index], marks: newMarks };
    setQuestions(updated);
  };

  const handleQNoChange = (index: number, newQNo: string) => {
    const updated = [...questions];
    updated[index] = { ...updated[index], q_no: newQNo };
    setQuestions(updated);
  };

  const handleTextChange = (index: number, newText: string) => {
    const updated = [...questions];
    updated[index] = { ...updated[index], text: newText };
    setQuestions(updated);
  };

  const handleAddQuestion = () => {
    const newId = `q-${Date.now().toString().slice(-5)}`;
    const newQ: QuestionItem = {
      id: newId,
      q_no: `Q${questions.length + 1}`,
      section: questions[questions.length - 1]?.section || "Section A",
      text: "New examination question statement.",
      marks: 10.0,
      is_or_choice: false,
      or_group: null,
      page: currentPaperPage || 1,
      rubric: "Technical formulation, step-by-step mathematical working, and university length requirement."
    };
    const nextIdx = questions.length;
    setQuestions([...questions, newQ]);
    setActiveQuestionId(newId);
    setEditingQuestionIdx(nextIdx);
  };

  const handleInsertQuestionBelow = (index: number) => {
    const baseQ = questions[index];
    const newId = `q-${Date.now().toString().slice(-5)}`;
    const newQ: QuestionItem = {
      id: newId,
      q_no: `Q${questions.length + 1}`,
      section: baseQ?.section || "Section A",
      text: "New question statement.",
      marks: Number(baseQ?.marks) || 5.0,
      is_or_choice: false,
      or_group: null,
      page: baseQ?.page || currentPaperPage || 1,
      rubric: baseQ?.rubric || "Award marks for conceptual accuracy and complete working."
    };
    const updated = [...questions.slice(0, index + 1), newQ, ...questions.slice(index + 1)];
    setQuestions(updated);
    setActiveQuestionId(newId);
    setEditingQuestionIdx(index + 1);
  };

  const handleAddOrChoiceBelow = (index: number) => {
    const baseQ = questions[index];
    if (!baseQ) return;
    const groupKey = baseQ.or_group || `or-grp-${Date.now().toString().slice(-5)}`;
    const newId = `q-or-${Date.now().toString().slice(-5)}`;
    const updatedBase: QuestionItem = { ...baseQ, is_or_choice: true, or_group: groupKey };
    const newOrQ: QuestionItem = {
      id: newId,
      q_no: `${baseQ.q_no} (OR)`,
      section: baseQ.section || "Section A",
      text: "Alternative OR question on equivalent syllabus weightage.",
      marks: Number(baseQ.marks) || 5.0,
      is_or_choice: true,
      or_group: groupKey,
      page: baseQ.page || currentPaperPage || 1,
      rubric: baseQ.rubric || "Award marks for accurate conceptual explanation and working."
    };
    const updated = [...questions];
    updated[index] = updatedBase;
    updated.splice(index + 1, 0, newOrQ);
    setQuestions(updated);
    setActiveQuestionId(newId);
    setEditingQuestionIdx(index + 1);
  };

  const handleToggleOrMiddle = (index: number) => {
    if (index < 0 || index >= questions.length - 1) return;
    const curr = questions[index];
    const next = questions[index + 1];
    const updated = [...questions];

    const alreadyPaired = Boolean(
      curr.is_or_choice &&
      next.is_or_choice &&
      curr.or_group &&
      next.or_group &&
      curr.or_group === next.or_group
    );

    if (alreadyPaired) {
      const targetGroup = curr.or_group;
      // Clear OR link on these adjacent questions if no third question depends on them
      updated[index] = { ...curr, is_or_choice: false, or_group: null };
      const stillUsedAfter = updated.slice(index + 2).some((q) => q.or_group === targetGroup);
      if (!stillUsedAfter) {
        updated[index + 1] = { ...next, is_or_choice: false, or_group: null };
      }
    } else {
      const groupKey = curr.or_group || next.or_group || `or-mid-${Date.now().toString().slice(-5)}`;
      updated[index] = { ...curr, is_or_choice: true, or_group: groupKey };
      updated[index + 1] = { ...next, is_or_choice: true, or_group: groupKey };
    }
    setQuestions(updated);
  };

  const toggleAllQuestionsCollapse = () => {
    const nextState = !allQuestionsCollapsed;
    setAllQuestionsCollapsed(nextState);
    const map: Record<string, boolean> = {};
    if (nextState) {
      questions.forEach((q, idx) => {
        map[q.id || `q-${idx + 1}`] = true;
      });
    }
    setCollapsedQuestionKeys(map);
  };

  const toggleSingleQuestionCollapse = (qKey: string) => {
    setCollapsedQuestionKeys((prev) => ({
      ...prev,
      [qKey]: !prev[qKey]
    }));
  };

  const handleDeleteQuestion = (index: number) => {
    const updated = questions.filter((_, i) => i !== index);
    if (editingQuestionIdx === index) setEditingQuestionIdx(null);
    setQuestions(updated);
  };

  const handleAddInstruction = () => {
    const inst = prompt("Enter new general instruction for this examination:");
    if (!inst) return;
    setDigitalHeader({
      ...digitalHeader,
      instructions: [...(digitalHeader.instructions || []), inst.trim()]
    });
  };

  const handleDeleteInstruction = (index: number) => {
    const updated = (digitalHeader.instructions || []).filter((_, i) => i !== index);
    setDigitalHeader({
      ...digitalHeader,
      instructions: updated
    });
  };

  // Sum non-OR questions individually, and count each unique `or_group` once by max option marks
  const totalAllocatedMarks = (() => {
    const orGroupMax: Record<string, number> = {};
    let total = 0;
    questions.forEach((q) => {
      const m = Number(q.marks) || 0;
      const og = (q.or_group || "").trim();
      if (q.is_or_choice && og) {
        orGroupMax[og] = Math.max(orGroupMax[og] || 0, m);
      } else {
        total += m;
      }
    });
    return Math.round((total + Object.values(orGroupMax).reduce((a, b) => a + b, 0)) * 10) / 10;
  })();

  const handleSaveExam = async () => {
    if (!selectedSubjectId && subjects.length > 0) {
      setSelectedSubjectId(subjects[0].id);
    }
    const targetSubjectId = selectedSubjectId || (subjects.length > 0 ? subjects[0].id : "");
    if (!targetSubjectId) {
      alert("Please ensure at least one subject exists before saving.");
      return;
    }

    setIsSaving(true);
    setSaveSuccess(false);

    try {
      if (activeExam) {
        const res = await academicApi.updateExamQuestions(activeExam.id, questions, totalAllocatedMarks, {
          paper_id: paperId || undefined,
          paper_page_count: paperPageCount || undefined,
          question_paper_filename: paperFilename || undefined,
          title: examTitle.trim() || undefined,
          target_section: targetSection,
          correction_deadline: correctionDeadline || undefined
        });
        if (res?.exam) {
          setActiveExam(res.exam);
        }
        if (answerKeyText) {
          await academicApi.updateExamAnswerKey(activeExam.id, answerKeyText);
        }
      } else {
        const created = await academicApi.createExam({
          subject_id: targetSubjectId,
          title: examTitle.trim() || "Academic Examination",
          exam_type: examType,
          max_marks: totalAllocatedMarks || 60.0,
          passing_marks: passingMarks,
          academic_year: academicYear,
          target_section: targetSection,
          exam_date: examDate,
          correction_deadline: correctionDeadline,
          question_paper_filename: paperFilename,
          paper_id: paperId,
          paper_page_count: paperPageCount,
          answer_key_text: answerKeyText,
          questions: questions
        });
        setActiveExam(created);
      }
      setSaveSuccess(true);
      await loadExams();
      setTimeout(() => setSaveSuccess(false), 2000);
    } catch (err: any) {
      alert("Error saving examination: " + (err?.response?.data?.detail || err.message));
    } finally {
      setIsSaving(false);
    }
  };

  // Open Dedicated Exam Details Workspace (People Writing, Target Section, Answer Key, Questions)
  const handleOpenExamDetails = async (exam: Exam) => {
    setActiveExam(exam);
    setAnswerKeyText(exam.answer_key_text || "");
    setStructuredAnswersList(Array.isArray(exam.answer_key_structured) ? exam.answer_key_structured : []);
    setViewMode("detail");
    setLoadingDetails(true);
    try {
      const det = await academicApi.getExamDetails(exam.id);
      setExamDetails(det);
      setActiveExam(det.exam);
      if (det.exam.answer_key_text) setAnswerKeyText(det.exam.answer_key_text);
      if (Array.isArray(det.exam.answer_key_structured)) {
        setStructuredAnswersList(det.exam.answer_key_structured);
      }
    } catch (err) {
      console.error("Failed loading exam details:", err);
    } finally {
      setLoadingDetails(false);
    }
  };

  const handleSelectTargetSectionInDetails = async (sec: string) => {
    if (!activeExam) return;
    await academicApi.updateExamMeta(activeExam.id, { target_section: sec });
    const det = await academicApi.getExamDetails(activeExam.id);
    setExamDetails(det);
    setActiveExam(det.exam);
    await loadExams();
  };

  const handleSaveManualKeyInDetails = async (examId: string, text: string) => {
    setIsSaving(true);
    try {
      const res = await academicApi.updateExamAnswerKey(examId, text);
      setAnswerKeyText(text);
      if (res?.exam) setActiveExam(res.exam);
      const det = await academicApi.getExamDetails(examId);
      setExamDetails(det);
      await loadExams();
    } catch (err: any) {
      alert("Failed to save answer key: " + (err?.response?.data?.detail || err.message));
    } finally {
      setIsSaving(false);
    }
  };

  const handleStartBackgroundAnswerKey = async (examId: string) => {
    try {
      setBgAnswerKeyJobs((prev) => ({
        ...prev,
        [examId]: { jobId: "", status: "running", error: null, warning: null }
      }));
      const res = await academicApi.generateAnswerKeyAsync(examId);
      setBgAnswerKeyJobs((prev) => ({
        ...prev,
        [examId]: { jobId: res.job_id, status: "running", error: null, warning: null }
      }));
    } catch (err: any) {
      setBgAnswerKeyJobs((prev) => ({
        ...prev,
        [examId]: {
          jobId: "",
          status: "failed",
          error: err?.response?.data?.detail || err?.message || "Failed to start background task."
        }
      }));
    }
  };

  // Open Fullscreen Pure-White Answer Key Workspace (non-blocking — never stalls on mount)
  const handleOpenAnswerKeyReview = async (exam: Exam, fromView: "list" | "detail" = "list") => {
    setAnswerKeyReturnView(fromView);
    setActiveExam(exam);
    setPaperId(exam.paper_id || "");
    setPaperPageCount(exam.paper_page_count || 0);
    setAnswerKeyText(exam.answer_key_text || "");
    setStructuredAnswersList(Array.isArray(exam.answer_key_structured) ? exam.answer_key_structured : []);
    setViewMode("answer-key-review");
    try {
      const fresh = await academicApi.getExam(exam.id);
      setActiveExam(fresh);
      if (fresh.answer_key_text) setAnswerKeyText(fresh.answer_key_text);
      if (Array.isArray(fresh.answer_key_structured)) {
        setStructuredAnswersList(fresh.answer_key_structured);
      }
    } catch {
      // Non-fatal
    }
  };

  const handleSaveFullscreenAnswerKey = async (approveAndExit = false) => {
    if (!activeExam) return;
    setIsSaving(true);
    try {
      let textToSave = answerKeyText.trim();
      if (!textToSave && structuredAnswersList.length > 0) {
        textToSave = structuredAnswersList
          .map((it) => `[${it.q_no}] (${it.marks} Marks)\nModel Answer:\n${it.model_answer || ""}`)
          .join("\n\n");
      }
      if (!textToSave) {
        textToSave = "Master answer key saved.";
      }
      const res = await academicApi.updateExamAnswerKey(activeExam.id, textToSave, structuredAnswersList);
      if (res?.exam) setActiveExam(res.exam);
      setAnswerKeyText(textToSave);
      await loadExams();
      if (answerKeyReturnView === "detail") {
        const det = await academicApi.getExamDetails(activeExam.id);
        setExamDetails(det);
      }
      if (approveAndExit) {
        setViewMode(answerKeyReturnView);
      }
    } catch (err: any) {
      alert("Failed to save answer key: " + (err?.response?.data?.detail || err.message));
    } finally {
      setIsSaving(false);
    }
  };

  // Open Answer Sheets Upload Modal (Image 3)
  const handleOpenAnswerSheetsModal = (exam: Exam) => {
    setSheetModalExam(exam);
    setUploadedAnswerFiles([]);
    setUploadActiveTab("upload");
    setShowAnswerSheetModal(true);
  };

  const handleAnswerSheetsSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setUploadedAnswerFiles(Array.from(e.target.files));
    }
  };

  // Group exams by Class for master list
  const examsByClass = new Map<string, Exam[]>();
  const unassignedExams: Exam[] = [];

  classes.forEach((c) => {
    examsByClass.set(c.id, []);
  });

  exams.forEach((ex) => {
    const subj = subjects.find((s) => s.id === ex.subject_id);
    const classId = subj?.class_id;
    if (classId && examsByClass.has(classId)) {
      examsByClass.get(classId)!.push(ex);
    } else {
      unassignedExams.push(ex);
    }
  });

  // ==========================================
  // VIEW 1: MASTER EXAM LIST (CLUSTERED BY CLASS)
  // ==========================================
  if (viewMode === "list") {
    return (
      <div className="exam-management-page pb-28">
        {/* Header Bar */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "1rem", marginBottom: "1.5rem" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
              <h1 style={{ fontSize: "1.85rem", fontWeight: 900, color: "#0f172a", letterSpacing: "-0.03em", margin: 0 }}>
                Examinations & Tests
              </h1>
              <span style={{ background: "#e0e7ff", color: "#3730a3", fontSize: "0.78rem", fontWeight: 700, padding: "0.25rem 0.65rem", borderRadius: "9999px" }}>
                {exams.length} Total Exams
              </span>
            </div>
            <p style={{ color: "#64748b", fontSize: "0.88rem", marginTop: "0.3rem", margin: 0 }}>
              Exams clustered by classes and subjects. Digitize papers with Gemini, approve answer keys, and track grading deadlines.
            </p>
          </div>

          <button
            onClick={() => handleStartUploadNewExam()}
            className="btn btn-primary"
            style={{ display: "flex", alignItems: "center", gap: "0.45rem", padding: "0.6rem 1.1rem", fontSize: "0.88rem", borderRadius: "8px" }}
          >
            <Plus size={16} />
            + Create New Exam
          </button>
        </div>

        {/* Filter and Search Bar */}
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
            <div style={{ position: "relative", width: "100%", maxWidth: "340px" }}>
              <Search size={16} style={{ position: "absolute", left: "0.75rem", top: "50%", transform: "translateY(-50%)", color: "#94a3b8" }} />
              <input
                type="text"
                placeholder="Search examination title..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{ width: "100%", padding: "0.5rem 0.75rem 0.5rem 2.25rem", borderRadius: "8px", border: "1px solid #cbd5e1", fontSize: "0.85rem", outline: "none" }}
              />
            </div>

            <div>
              <select
                value={selectedSubjectId}
                onChange={(e) => setSelectedSubjectId(e.target.value)}
                style={{ padding: "0.5rem 0.75rem", borderRadius: "8px", border: "1px solid #cbd5e1", fontSize: "0.85rem", background: "#ffffff", color: "#1e293b", fontWeight: 500 }}
              >
                <option value="">Subject: All Subjects</option>
                {subjects.map((s) => (
                  <option key={s.id} value={s.id}>{s.name} ({s.code})</option>
                ))}
              </select>
            </div>
          </div>

          <button onClick={loadExams} style={{ display: "flex", alignItems: "center", gap: "0.35rem", padding: "0.5rem 0.75rem", background: "#f8fafc", border: "1px solid #cbd5e1", borderRadius: "8px", color: "#475569", fontSize: "0.85rem", cursor: "pointer", fontWeight: 500 }}>
            <RefreshCw size={14} className={loading ? "spin" : ""} /> Refresh
          </button>
        </div>

        {/* CLUSTERED BY CLASS EXAM BOXES */}
        {loading ? (
          <div style={{ textAlign: "center", padding: "4rem", color: "#64748b" }}>Loading examinations...</div>
        ) : classes.length === 0 && unassignedExams.length === 0 ? (
          <div style={{ background: "#ffffff", border: "2px dashed #cbd5e1", borderRadius: "16px", padding: "4rem 2rem", textAlign: "center" }}>
            <FileSpreadsheet size={48} style={{ color: "#94a3b8", margin: "0 auto 1rem" }} />
            <h3 style={{ fontSize: "1.25rem", fontWeight: 800, color: "#0f172a", marginBottom: "0.4rem" }}>No Examinations Scheduled</h3>
            <p style={{ color: "#64748b", fontSize: "0.9rem", maxWidth: "460px", margin: "0 auto 1.5rem" }}>
              Upload your first question paper to scan with Gemini, create digital rubrics, and evaluate students.
            </p>
            <button onClick={() => handleStartUploadNewExam()} className="btn btn-primary">+ Create First Exam</button>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "1.75rem" }}>
            {classes.map((cls) => {
              const classExams = (examsByClass.get(cls.id) || []).filter((ex) => {
                if (!searchQuery) return true;
                return ex.title.toLowerCase().includes(searchQuery.toLowerCase());
              });

              return (
                <div
                  key={cls.id}
                  style={{
                    background: "#ffffff",
                    border: "1px solid #e2e8f0",
                    borderRadius: "16px",
                    overflow: "hidden",
                    boxShadow: "0 1px 4px rgba(0, 0, 0, 0.04)"
                  }}
                >
                  {/* Class Header */}
                  <div
                    style={{
                      padding: "1.1rem 1.5rem",
                      background: "#f8fafc",
                      borderBottom: "1px solid #e2e8f0",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      flexWrap: "wrap",
                      gap: "0.75rem"
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                      <div style={{ padding: "0.5rem", background: "#1e1b4b", color: "#ffffff", borderRadius: "10px" }}>
                        <FolderGit2 size={18} />
                      </div>
                      <div>
                        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                          <h2 style={{ fontSize: "1.15rem", fontWeight: 800, color: "#0f172a", margin: 0 }}>
                            {cls.name}
                          </h2>
                          {cls.code && (
                            <span style={{ fontSize: "0.75rem", fontWeight: 700, background: "#e2e8f0", color: "#334155", padding: "0.15rem 0.5rem", borderRadius: "4px" }}>
                              {cls.code}
                            </span>
                          )}
                          <span style={{ fontSize: "0.75rem", fontWeight: 700, background: "#e0f2fe", color: "#0369a1", padding: "0.15rem 0.55rem", borderRadius: "9999px" }}>
                            {classExams.length} {classExams.length === 1 ? "Exam" : "Exams"}
                          </span>
                        </div>
                        <div style={{ fontSize: "0.8rem", color: "#64748b", marginTop: "0.2rem" }}>
                          Department: {cls.department || "General"} • Academic Year: {cls.academic_year || "2026-2027"}
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => handleStartUploadNewExam(cls.id)}
                      className="btn btn-secondary"
                      style={{ fontSize: "0.82rem", display: "flex", alignItems: "center", gap: "0.35rem", padding: "0.45rem 0.85rem" }}
                    >
                      <Plus size={14} /> Add Exam for this Class
                    </button>
                  </div>

                  {/* Exams Grid under this Class */}
                  {classExams.length === 0 ? (
                    <div style={{ padding: "2.5rem 1.5rem", textAlign: "center", color: "#64748b", fontSize: "0.88rem" }}>
                      No examinations scheduled under <strong>{cls.name}</strong>.
                    </div>
                  ) : (
                    <div style={{ padding: "1.25rem", display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(360px, 1fr))", gap: "1.25rem" }}>
                      {classExams.map((exam) => {
                        const subj = subjects.find((s) => s.id === exam.subject_id);
                        const hasAnswerKey = Boolean(exam.answer_key_text && exam.answer_key_text.trim());

                        return (
                          <div
                            key={exam.id}
                            onClick={() => handleOpenExamDetails(exam)}
                            style={{
                              background: "#ffffff",
                              border: "1px solid #e2e8f0",
                              borderRadius: "14px",
                              padding: "1.25rem",
                              display: "flex",
                              flexDirection: "column",
                              justifyContent: "space-between",
                              boxShadow: "0 1px 3px rgba(0,0,0,0.03)",
                              cursor: "pointer"
                            }}
                          >
                            <div>
                              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "0.4rem", marginBottom: "0.5rem", flexWrap: "wrap" }}>
                                <div style={{ display: "flex", alignItems: "center", gap: "0.35rem", flexWrap: "wrap" }}>
                                  <span style={{ fontSize: "0.75rem", fontWeight: 700, background: "#f1f5f9", color: "#334155", padding: "0.2rem 0.5rem", borderRadius: "4px" }}>
                                    {subj?.code || "SUBJ"} • {subj?.name || "Subject"}
                                  </span>
                                  {exam.target_section && (
                                    <span style={{ fontSize: "0.72rem", fontWeight: 700, background: "#eff6ff", color: "#1d4ed8", padding: "0.18rem 0.45rem", borderRadius: "4px" }}>
                                      Section {exam.target_section}
                                    </span>
                                  )}
                                </div>
                                {bgAnswerKeyJobs[exam.id]?.status === "running" ? (
                                  <span style={{ fontSize: "0.73rem", fontWeight: 700, color: "#1d4ed8", display: "flex", alignItems: "center", gap: "0.25rem" }}>
                                    <RefreshCw size={12} className="spin" /> Generating Key...
                                  </span>
                                ) : (
                                  <span style={{ fontSize: "0.75rem", fontWeight: 700, color: hasAnswerKey ? "#16a34a" : "#d97706", display: "flex", alignItems: "center", gap: "0.25rem" }}>
                                    {hasAnswerKey ? <CheckCircle2 size={13} /> : <Sparkles size={13} />}
                                    {hasAnswerKey ? "Answer Key Approved" : "Needs Answer Key"}
                                  </span>
                                )}
                              </div>

                              <h3 style={{ fontSize: "1.15rem", fontWeight: 800, color: "#0f172a", marginBottom: "0.4rem" }}>
                                {exam.title}
                              </h3>

                              <div style={{ fontSize: "0.8rem", color: "#64748b", display: "flex", gap: "0.75rem", flexWrap: "wrap", marginBottom: "0.75rem" }}>
                                <span style={{ display: "flex", alignItems: "center", gap: "0.25rem" }}>
                                  <Calendar size={13} /> Date: {exam.exam_date || "Pending"}
                                </span>
                                <span style={{ display: "flex", alignItems: "center", gap: "0.25rem" }}>
                                  <Clock size={13} /> Due: {exam.correction_deadline || "Upcoming"}
                                </span>
                              </div>

                              <div style={{ background: "#f8fafc", borderRadius: "8px", padding: "0.6rem 0.75rem", fontSize: "0.8rem", color: "#475569", marginBottom: "1rem" }}>
                                <strong>{exam.questions?.length || 0}</strong> Questions • <strong>{exam.max_marks || 60}</strong> Max Marks • Pass: {exam.passing_marks || 24} Marks
                              </div>
                            </div>

                            {/* Action Buttons Row */}
                            <div
                              onClick={(e) => e.stopPropagation()}
                              style={{ display: "flex", flexDirection: "column", gap: "0.5rem", borderTop: "1px solid #f1f5f9", paddingTop: "0.85rem" }}
                            >
                              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem" }}>
                                <button
                                  onClick={() => loadExamIntoEditor(exam)}
                                  className="btn btn-secondary"
                                  style={{ fontSize: "0.8rem", padding: "0.45rem", textAlign: "center" }}
                                >
                                  Review & Edit
                                </button>
                                <button
                                  onClick={() => handleOpenAnswerSheetsModal(exam)}
                                  className="btn btn-secondary"
                                  style={{ fontSize: "0.8rem", padding: "0.45rem", textAlign: "center" }}
                                >
                                  Upload Sheets
                                </button>
                              </div>

                              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem" }}>
                                <button
                                  onClick={() => handleOpenAnswerKeyReview(exam, "list")}
                                  style={{
                                    fontSize: "0.8rem",
                                    padding: "0.45rem",
                                    background: "#eff6ff",
                                    border: "1px solid #bfdbfe",
                                    color: "#1d4ed8",
                                    borderRadius: "8px",
                                    fontWeight: 700,
                                    cursor: "pointer",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    gap: "0.3rem"
                                  }}
                                >
                                  <Sparkles size={13} /> Answer Key
                                </button>

                                <button
                                  onClick={() => onNavigate("evaluation", { examId: exam.id })}
                                  className="btn btn-primary"
                                  style={{ fontSize: "0.8rem", padding: "0.45rem", textAlign: "center" }}
                                >
                                  Grade Papers →
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* ANSWER SHEETS MODAL (Matching Image 3) */}
        {showAnswerSheetModal && sheetModalExam && (
          <div className="modal-overlay-16-9" onClick={() => setShowAnswerSheetModal(false)}>
            <div
              className="modal-content-16-9"
              onClick={(e) => e.stopPropagation()}
              style={{
                maxWidth: "1050px",
                minHeight: "580px",
                background: "#0b132b",
                color: "#ffffff",
                border: "1px solid #1e293b"
              }}
            >
              {/* Modal Top Bar */}
              <div style={{ padding: "1.25rem 1.75rem", borderBottom: "1px solid #1e293b", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <h3 style={{ fontSize: "1.25rem", fontWeight: 800, margin: 0, color: "#ffffff" }}>
                    Answer sheets
                  </h3>
                  <div style={{ fontSize: "0.8rem", color: "#94a3b8", marginTop: "0.2rem" }}>
                    {sheetModalExam.title} • Class {sheetModalExam.academic_year || "CSE"} • {subjects.find((s) => s.id === sheetModalExam.subject_id)?.code || "ATCD"}
                  </div>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                  <button style={{ background: "none", border: "none", color: "#94a3b8", cursor: "pointer" }}><Eye size={18} /></button>
                  <button style={{ background: "none", border: "none", color: "#94a3b8", cursor: "pointer" }}><MoreVertical size={18} /></button>
                  <button onClick={() => setShowAnswerSheetModal(false)} style={{ background: "none", border: "none", color: "#94a3b8", cursor: "pointer" }}><X size={20} /></button>
                </div>
              </div>

              {/* Sub-Header Actions & Section Tag */}
              <div style={{ padding: "1rem 1.75rem", display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #1e293b" }}>
                <span style={{ width: "28px", height: "28px", borderRadius: "50%", background: "#1e293b", color: "#60a5fa", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.85rem", fontWeight: 800 }}>
                  b
                </span>

                <div style={{ display: "flex", gap: "0.6rem" }}>
                  <label
                    style={{
                      background: "#1d4ed8",
                      color: "#ffffff",
                      padding: "0.45rem 0.95rem",
                      borderRadius: "8px",
                      fontSize: "0.82rem",
                      fontWeight: 700,
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: "0.35rem"
                    }}
                  >
                    <UploadCloud size={15} /> Upload answer sheets
                    <input type="file" multiple accept=".pdf,.png,.jpg,.jpeg" onChange={handleAnswerSheetsSelected} style={{ display: "none" }} />
                  </label>

                  <button
                    onClick={() => {
                      setShowAnswerSheetModal(false);
                      onNavigate("evaluation", { examId: sheetModalExam.id });
                    }}
                    style={{
                      background: "#1e293b",
                      border: "1px solid #334155",
                      color: "#e2e8f0",
                      padding: "0.45rem 0.95rem",
                      borderRadius: "8px",
                      fontSize: "0.82rem",
                      fontWeight: 700,
                      cursor: "pointer"
                    }}
                  >
                    Evaluate All (1)
                  </button>
                </div>
              </div>

              {/* Status Tabs Row */}
              <div style={{ padding: "0.6rem 1.75rem", display: "flex", gap: "1.25rem", borderBottom: "1px solid #1e293b", fontSize: "0.82rem", color: "#94a3b8" }}>
                <span>Total <strong style={{ color: "#ffffff" }}>1</strong></span>
                <span>Attached <strong style={{ color: "#ffffff" }}>{uploadedAnswerFiles.length || 1}</strong></span>
                <span>Evaluated <strong style={{ color: "#ffffff" }}>0</strong></span>
                <span>Pending <strong style={{ color: "#ffffff" }}>1</strong></span>
                <span>Student Review <strong style={{ color: "#ffffff" }}>0</strong></span>
              </div>

              {/* Banner: Answer Key Status Banner */}
              <div
                style={{
                  margin: "1rem 1.75rem",
                  padding: "0.85rem 1.25rem",
                  borderRadius: "10px",
                  background: "rgba(30, 58, 138, 0.4)",
                  border: "1px solid #1d4ed8",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center"
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                  <div style={{ width: "18px", height: "18px", borderRadius: "50%", border: "2px solid #60a5fa", borderTopColor: "transparent", animation: "spin 1s linear infinite" }} />
                  <div>
                    <div style={{ fontSize: "0.88rem", fontWeight: 700, color: "#ffffff" }}>
                      {sheetModalExam.answer_key_text ? "Answer key ready & approved" : "Preparing the answer key • 0 of 8 answers"}
                    </div>
                    <div style={{ fontSize: "0.78rem", color: "#93c5fd" }}>
                      Upload answer sheets meanwhile. Grading starts once you approve the key.
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => {
                    setShowAnswerSheetModal(false);
                    handleOpenAnswerKeyReview(sheetModalExam);
                  }}
                  style={{
                    background: "transparent",
                    border: "none",
                    color: "#93c5fd",
                    fontSize: "0.82rem",
                    fontWeight: 700,
                    cursor: "pointer",
                    textDecoration: "underline"
                  }}
                >
                  View
                </button>
              </div>

              {/* Tabs: Upload / Students */}
              <div style={{ padding: "0 1.75rem", display: "flex", gap: "1.5rem", borderBottom: "1px solid #1e293b", fontSize: "0.85rem" }}>
                <span
                  onClick={() => setUploadActiveTab("upload")}
                  style={{
                    padding: "0.5rem 0",
                    borderBottom: uploadActiveTab === "upload" ? "2px solid #3b82f6" : "none",
                    color: uploadActiveTab === "upload" ? "#ffffff" : "#94a3b8",
                    fontWeight: 700,
                    cursor: "pointer"
                  }}
                >
                  Upload
                </span>
                <span
                  onClick={() => setUploadActiveTab("students")}
                  style={{
                    padding: "0.5rem 0",
                    borderBottom: uploadActiveTab === "students" ? "2px solid #3b82f6" : "none",
                    color: uploadActiveTab === "students" ? "#ffffff" : "#94a3b8",
                    fontWeight: 700,
                    cursor: "pointer"
                  }}
                >
                  Students (1)
                </span>
              </div>

              {/* Modal Body: Upload Area */}
              <div style={{ padding: "1.5rem 1.75rem", flex: 1, overflowY: "auto" }}>
                <div style={{ marginBottom: "0.85rem" }}>
                  <div style={{ fontSize: "0.95rem", fontWeight: 700, color: "#ffffff" }}>
                    Upload without adding students
                  </div>
                  <div style={{ fontSize: "0.8rem", color: "#94a3b8" }}>
                    Drop answer sheets and we'll read each student's name from the cover page. Confirm the names, then attach - no need to add students first.
                  </div>
                </div>

                {/* Big Drag and Drop Box */}
                <label
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    padding: "3.5rem 2rem",
                    border: "2px dashed #334155",
                    borderRadius: "14px",
                    background: "rgba(15, 23, 42, 0.4)",
                    cursor: "pointer",
                    textAlign: "center"
                  }}
                >
                  <UploadCloud size={36} style={{ color: "#60a5fa", marginBottom: "0.75rem" }} />
                  <div style={{ fontSize: "0.95rem", fontWeight: 700, color: "#ffffff" }}>
                    Drop answer sheets here, or click to browse
                  </div>
                  <div style={{ fontSize: "0.78rem", color: "#94a3b8", marginTop: "0.25rem" }}>
                    PDF, JPG, or PNG - select multiple files
                  </div>
                  {uploadedAnswerFiles.length > 0 && (
                    <div style={{ marginTop: "1rem", fontSize: "0.85rem", color: "#4ade80", fontWeight: 700 }}>
                      ✓ {uploadedAnswerFiles.length} {uploadedAnswerFiles.length === 1 ? "file" : "files"} selected ready to attach
                    </div>
                  )}
                  <input type="file" multiple accept=".pdf,.png,.jpg,.jpeg" onChange={handleAnswerSheetsSelected} style={{ display: "none" }} />
                </label>
              </div>

              {/* Modal Footer */}
              <div style={{ padding: "1rem 1.75rem", borderTop: "1px solid #1e293b", display: "flex", justifyContent: "flex-end", gap: "0.75rem" }}>
                <button
                  onClick={() => setShowAnswerSheetModal(false)}
                  style={{
                    background: "#1e293b",
                    border: "1px solid #334155",
                    color: "#cbd5e1",
                    padding: "0.55rem 1rem",
                    borderRadius: "8px",
                    fontSize: "0.85rem",
                    cursor: "pointer"
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    alert(`Attached ${uploadedAnswerFiles.length || 1} answer sheet(s) successfully!`);
                    setShowAnswerSheetModal(false);
                  }}
                  style={{
                    background: "#2563eb",
                    border: "none",
                    color: "#ffffff",
                    padding: "0.55rem 1.25rem",
                    borderRadius: "8px",
                    fontSize: "0.85rem",
                    fontWeight: 700,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "0.35rem"
                  }}
                >
                  <Check size={16} /> Add & attach ({uploadedAnswerFiles.length})
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ==========================================
  // VIEW 1B: DEDICATED EXAM OVERVIEW & PARTICIPANTS
  // ==========================================
  if (viewMode === "detail") {
    const activeJob = activeExam ? bgAnswerKeyJobs[activeExam.id] : undefined;
    return (
      <ExamDetailWorkspace
        details={examDetails}
        loading={loadingDetails}
        onBack={() => {
          setViewMode("list");
          void loadExams();
        }}
        onSelectTargetSection={handleSelectTargetSectionInDetails}
        onEditPaperQuestions={(ex) => loadExamIntoEditor(ex)}
        onOpenFullscreenAnswerKey={(ex) => handleOpenAnswerKeyReview(ex, "detail")}
        onOpenUploadSheets={(ex) => handleOpenAnswerSheetsModal(ex)}
        onSaveManualAnswerKey={handleSaveManualKeyInDetails}
        onStartBackgroundAnswerKey={(id) => handleStartBackgroundAnswerKey(id)}
        bgJobStatus={activeJob?.status || "idle"}
        bgJobError={activeJob?.error || null}
        onNavigateEvaluation={(examId, evalId) =>
          onNavigate("evaluation", evalId ? { examId, evalId } : { examId })
        }
      />
    );
  }

  // ==========================================
  // VIEW 2: FULLSCREEN PURE-WHITE ANSWER KEY WORKSPACE
  // ==========================================
  if (viewMode === "answer-key-review" && activeExam) {
    const subj = subjects.find((s) => s.id === activeExam.subject_id);
    const activeJob = bgAnswerKeyJobs[activeExam.id];
    return (
      <AnswerKeyFullscreenWorkspace
        exam={activeExam}
        subject={subj}
        answerKeyText={answerKeyText}
        onChangeAnswerKeyText={setAnswerKeyText}
        structuredAnswers={structuredAnswersList}
        onChangeStructuredAnswers={setStructuredAnswersList}
        bgJobStatus={activeJob?.status || "idle"}
        bgJobError={activeJob?.error || null}
        bgWarning={activeJob?.warning || null}
        onStartBackgroundGeneration={() => handleStartBackgroundAnswerKey(activeExam.id)}
        onSaveAnswerKey={handleSaveFullscreenAnswerKey}
        isSaving={isSaving}
        onClose={() => setViewMode(answerKeyReturnView)}
      />
    );
  }

  // ==========================================
  // VIEW 3: CREATE & EDIT SPLIT WORKSPACE (Images 1 & 2)
  // ==========================================
  return (
    <div className="exam-create-page pb-24" style={{ margin: "-1.5rem", padding: "1.5rem" }}>
      {/* STEP 1: UPLOAD INITIAL QUESTION PAPER */}
      {step === 1 && (
        <div style={{ maxWidth: "800px", margin: "2rem auto" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "1.5rem" }}>
            <button onClick={() => setViewMode("list")} className="btn btn-secondary" style={{ padding: "0.45rem" }}>
              <ArrowLeft size={16} />
            </button>
            <div>
              <h1 style={{ fontSize: "1.75rem", fontWeight: 900, color: "#0f172a", margin: 0 }}>
                Upload Examination Paper
              </h1>
              <p style={{ color: "#64748b", fontSize: "0.88rem", marginTop: "0.2rem", margin: 0 }}>
                Upload your PDF question paper. Gemini scans sections, questions, and internal OR choices.
              </p>
            </div>
          </div>

          <div
            style={{
              background: "#ffffff",
              border: "2px dashed #cbd5e1",
              borderRadius: "18px",
              padding: "4rem 2rem",
              textAlign: "center",
              boxShadow: "0 1px 4px rgba(0,0,0,0.03)"
            }}
          >
            <UploadCloud size={54} style={{ color: "#2563eb", margin: "0 auto 1.25rem" }} />
            <h3 style={{ fontSize: "1.25rem", fontWeight: 800, color: "#0f172a", marginBottom: "0.4rem" }}>
              Select Question Paper PDF
            </h3>
            <p style={{ color: "#64748b", fontSize: "0.88rem", maxWidth: "440px", margin: "0 auto 1.75rem" }}>
              Drag and drop your examination question paper here, or click to browse.
            </p>

            {isScanning ? (
              <div style={{ padding: "1.5rem", background: "#eff6ff", borderRadius: "10px", display: "inline-flex", alignItems: "center", gap: "0.75rem", color: "#1d4ed8" }}>
                <RefreshCw size={18} className="spin" />
                <span style={{ fontWeight: 600, fontSize: "0.9rem" }}>{scanMessage || "Processing question paper with Gemini..."}</span>
              </div>
            ) : (
              <label className="btn btn-primary" style={{ padding: "0.75rem 1.75rem", fontSize: "0.95rem", cursor: "pointer", display: "inline-flex", alignItems: "center", gap: "0.5rem" }}>
                Browse PDF File
                <input type="file" accept=".pdf,.png,.jpg,.jpeg" onChange={handlePaperUpload} style={{ display: "none" }} />
              </label>
            )}
          </div>
        </div>
      )}

      {/* STEP 2: CONFIRM METADATA & STRUCTURE */}
      {step === 2 && (
        <div style={{ maxWidth: "750px", margin: "2rem auto" }}>
          <div style={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: "16px", padding: "2rem", boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
            <h2 style={{ fontSize: "1.4rem", fontWeight: 800, color: "#0f172a", marginBottom: "0.4rem" }}>
              Examination Details & Dates
            </h2>
            <p style={{ color: "#64748b", fontSize: "0.88rem", marginBottom: "1.5rem" }}>
              Confirm course allocation, passing criteria, and correction deadline.
            </p>

            <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
              <div>
                <label style={{ display: "block", fontSize: "0.82rem", fontWeight: 700, color: "#334155", marginBottom: "0.35rem" }}>Subject *</label>
                <select
                  value={selectedSubjectId}
                  onChange={(e) => setSelectedSubjectId(e.target.value)}
                  style={{ width: "100%", padding: "0.6rem 0.85rem", borderRadius: "8px", border: "1px solid #cbd5e1", fontSize: "0.9rem", background: "#ffffff" }}
                >
                  {subjects.map((s) => (
                    <option key={s.id} value={s.id}>{s.name} ({s.code}) - {s.semester_or_grade}</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: "block", fontSize: "0.82rem", fontWeight: 700, color: "#334155", marginBottom: "0.35rem" }}>Exam Title *</label>
                <input
                  type="text"
                  value={examTitle}
                  onChange={(e) => setExamTitle(e.target.value)}
                  style={{ width: "100%", padding: "0.6rem 0.85rem", borderRadius: "8px", border: "1px solid #cbd5e1", fontSize: "0.9rem" }}
                />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                <div>
                  <label style={{ display: "block", fontSize: "0.82rem", fontWeight: 700, color: "#334155", marginBottom: "0.35rem" }}>Exam Date</label>
                  <input
                    type="date"
                    value={examDate}
                    onChange={(e) => setExamDate(e.target.value)}
                    style={{ width: "100%", padding: "0.6rem 0.85rem", borderRadius: "8px", border: "1px solid #cbd5e1", fontSize: "0.9rem" }}
                  />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: "0.82rem", fontWeight: 700, color: "#334155", marginBottom: "0.35rem" }}>Correction Deadline</label>
                  <input
                    type="date"
                    value={correctionDeadline}
                    onChange={(e) => setCorrectionDeadline(e.target.value)}
                    style={{ width: "100%", padding: "0.6rem 0.85rem", borderRadius: "8px", border: "1px solid #cbd5e1", fontSize: "0.9rem" }}
                  />
                </div>
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", marginTop: "1rem" }}>
                <button onClick={() => setStep(1)} className="btn btn-secondary">
                  <ArrowLeft size={16} /> Back
                </button>
                <button onClick={() => setStep(3)} className="btn btn-primary">
                  Review in Split Workspace <ArrowRight size={16} />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* STEP 3: PURE WHITE SPLIT WORKSPACE - REVIEW & EDIT EXAM */}
      {step === 3 && (
        <div style={{ paddingBottom: "6.5rem" }}>
          {/* Hidden file input for uploading/replacing the question paper directly inside Review & Edit */}
          <input
            ref={step3UploadInputRef}
            type="file"
            accept=".pdf,.png,.jpg,.jpeg,.webp"
            onChange={(e) => handlePaperUpload(e, true)}
            style={{ display: "none" }}
          />

          {/* Pure White Top Navbar */}
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              justifyContent: "space-between",
              alignItems: "center",
              gap: "0.75rem",
              background: "#ffffff",
              color: "#0f172a",
              padding: "0.85rem 1.25rem",
              borderRadius: "14px",
              border: "1px solid #e2e8f0",
              boxShadow: "0 1px 3px rgba(15, 23, 42, 0.04)",
              marginBottom: "1.25rem"
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
              <button
                onClick={() => setViewMode("list")}
                style={{
                  background: "#f8fafc",
                  border: "1px solid #cbd5e1",
                  color: "#0f172a",
                  padding: "0.45rem 0.55rem",
                  borderRadius: "8px",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center"
                }}
                title="Back to Exams"
              >
                <ArrowLeft size={16} />
              </button>
              <div>
                <h2 style={{ fontSize: "1.12rem", fontWeight: 800, margin: 0, color: "#0f172a" }}>
                  Review & Edit Exam
                </h2>
                <div style={{ fontSize: "0.75rem", color: "#64748b" }}>
                  {questions.length} questions · {totalAllocatedMarks} total marks
                  {paperFilename ? ` · ${paperFilename}` : ""}
                </div>
              </div>
            </div>

            <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "0.65rem" }}>
              <button
                onClick={() => step3UploadInputRef.current?.click()}
                disabled={isScanning}
                style={{
                  background: "#eff6ff",
                  border: "1px solid #bfdbfe",
                  color: "#1d4ed8",
                  padding: "0.45rem 0.9rem",
                  borderRadius: "8px",
                  fontSize: "0.82rem",
                  fontWeight: 700,
                  cursor: isScanning ? "wait" : "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.4rem"
                }}
              >
                <UploadCloud size={15} />
                {isScanning ? "Scanning Paper..." : paperId ? "Upload New Paper" : "Upload Paper"}
              </button>

              <button
                onClick={() => setShowPaperOverlays((prev) => !prev)}
                style={{
                  background: showPaperOverlays ? "#f0fdf4" : "#f8fafc",
                  border: `1px solid ${showPaperOverlays ? "#86efac" : "#cbd5e1"}`,
                  color: showPaperOverlays ? "#15803d" : "#475569",
                  padding: "0.45rem 0.85rem",
                  borderRadius: "8px",
                  fontSize: "0.82rem",
                  fontWeight: 700,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.35rem"
                }}
                title="Toggle spatial question bounding-box overlays"
              >
                {showPaperOverlays ? <Eye size={15} /> : <EyeOff size={15} />}
                {showPaperOverlays ? "Overlays On" : "Overlays Off"}
              </button>

              <button
                onClick={() => {
                  const downloadUrl = paperId
                    ? resolveApiUrl(`/api/v1/academic/papers/${paperId}/pages/${currentPaperPage}`)
                    : "";
                  if (downloadUrl) {
                    const a = document.createElement("a");
                    a.href = downloadUrl;
                    a.download = `${(examTitle || "question-paper").replace(/\s+/g, "_")}_page_${currentPaperPage}.jpg`;
                    a.target = "_blank";
                    a.click();
                  } else {
                    const blob = new Blob([JSON.stringify({ header: digitalHeader, questions }, null, 2)], {
                      type: "application/json"
                    });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement("a");
                    a.href = url;
                    a.download = `${(examTitle || "exam-questions").replace(/\s+/g, "_")}.json`;
                    a.click();
                    URL.revokeObjectURL(url);
                  }
                }}
                style={{
                  background: "#ffffff",
                  border: "1px solid #cbd5e1",
                  color: "#334155",
                  padding: "0.45rem 0.85rem",
                  borderRadius: "8px",
                  fontSize: "0.82rem",
                  fontWeight: 600,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.35rem"
                }}
              >
                <Download size={14} /> Download
              </button>

              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.45rem",
                  background: "#f8fafc",
                  border: "1px solid #e2e8f0",
                  padding: "0.3rem 0.65rem",
                  borderRadius: "8px"
                }}
              >
                <input
                  type="range"
                  min="40"
                  max="150"
                  value={paperZoom}
                  onChange={(e) => setPaperZoom(Number(e.target.value))}
                  style={{ width: "80px", accentColor: "#2563eb" }}
                />
                <span style={{ fontSize: "0.78rem", color: "#334155", fontWeight: 700, minWidth: "36px" }}>
                  {paperZoom}%
                </span>
              </div>
            </div>
          </div>

          {/* Pure White Full-Scrollable Left Column + Sticky Right Scanned Paper Viewer */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1.12fr 0.88fr",
              gap: "1.25rem",
              alignItems: "start"
            }}
          >
            {/* LEFT HALF: Naturally Scrollable Accordions & Markdown Questions */}
            <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              {/* ACCORDION 1: Exam Information */}
              <div
                style={{
                  background: "#ffffff",
                  borderRadius: "14px",
                  border: "1px solid #e2e8f0",
                  boxShadow: "0 1px 3px rgba(15, 23, 42, 0.04)",
                  overflow: "hidden"
                }}
              >
                <div
                  onClick={() => setOpenInfoAccordion(!openInfoAccordion)}
                  style={{
                    padding: "0.9rem 1.25rem",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    cursor: "pointer",
                    background: "#f8fafc",
                    borderBottom: openInfoAccordion ? "1px solid #e2e8f0" : "none"
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", color: "#0f172a", fontWeight: 800, fontSize: "0.95rem" }}>
                    <FileText size={16} style={{ color: "#2563eb" }} />
                    Exam Information
                  </div>
                  {openInfoAccordion ? (
                    <ChevronUp size={16} style={{ color: "#64748b" }} />
                  ) : (
                    <ChevronDown size={16} style={{ color: "#64748b" }} />
                  )}
                </div>

                {openInfoAccordion && (
                  <div style={{ padding: "1.2rem", display: "flex", flexDirection: "column", gap: "1rem", background: "#ffffff" }}>
                    <div style={{ background: "#f8fafc", borderRadius: "10px", padding: "0.95rem", border: "1px solid #e2e8f0" }}>
                      <div style={{ fontSize: "0.85rem", fontWeight: 800, color: "#0f172a", marginBottom: "0.15rem" }}>
                        Class & subject
                      </div>
                      <div style={{ fontSize: "0.76rem", color: "#64748b", marginBottom: "0.75rem" }}>
                        Choose the class, student group and subject for this paper.
                      </div>

                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
                        <div>
                          <label style={{ display: "block", fontSize: "0.74rem", fontWeight: 700, color: "#475569", marginBottom: "0.25rem" }}>
                            Class / course *
                          </label>
                          <select
                            value={selectedClassId}
                            onChange={(e) => setSelectedClassId(e.target.value)}
                            style={{
                              width: "100%",
                              padding: "0.48rem 0.65rem",
                              borderRadius: "8px",
                              background: "#ffffff",
                              border: "1px solid #cbd5e1",
                              color: "#0f172a",
                              fontSize: "0.83rem"
                            }}
                          >
                            {classes.map((c) => (
                              <option key={c.id} value={c.id}>{c.name}</option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label style={{ display: "block", fontSize: "0.74rem", fontWeight: 700, color: "#475569", marginBottom: "0.25rem" }}>
                            Subject *
                          </label>
                          <select
                            value={selectedSubjectId}
                            onChange={(e) => setSelectedSubjectId(e.target.value)}
                            style={{
                              width: "100%",
                              padding: "0.48rem 0.65rem",
                              borderRadius: "8px",
                              background: "#ffffff",
                              border: "1px solid #cbd5e1",
                              color: "#0f172a",
                              fontSize: "0.83rem"
                            }}
                          >
                            {subjects.map((s) => (
                              <option key={s.id} value={s.id}>{s.name} ({s.code})</option>
                            ))}
                          </select>
                        </div>
                      </div>
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
                      <div>
                        <label style={{ display: "block", fontSize: "0.74rem", fontWeight: 700, color: "#475569", marginBottom: "0.25rem" }}>
                          Exam Title
                        </label>
                        <input
                          type="text"
                          value={examTitle}
                          onChange={(e) => setExamTitle(e.target.value)}
                          style={{
                            width: "100%",
                            padding: "0.48rem 0.65rem",
                            borderRadius: "8px",
                            background: "#ffffff",
                            border: "1px solid #cbd5e1",
                            color: "#0f172a",
                            fontSize: "0.83rem"
                          }}
                        />
                      </div>
                      <div>
                        <label style={{ display: "block", fontSize: "0.74rem", fontWeight: 700, color: "#475569", marginBottom: "0.25rem" }}>
                          Academic Year
                        </label>
                        <input
                          type="text"
                          value={academicYear}
                          onChange={(e) => setAcademicYear(e.target.value)}
                          style={{
                            width: "100%",
                            padding: "0.48rem 0.65rem",
                            borderRadius: "8px",
                            background: "#ffffff",
                            border: "1px solid #cbd5e1",
                            color: "#0f172a",
                            fontSize: "0.83rem"
                          }}
                        />
                      </div>
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "0.75rem" }}>
                      <div>
                        <label style={{ display: "block", fontSize: "0.74rem", fontWeight: 700, color: "#475569", marginBottom: "0.25rem" }}>
                          Target Section
                        </label>
                        <select
                          value={targetSection}
                          onChange={(e) => setTargetSection(e.target.value)}
                          style={{
                            width: "100%",
                            padding: "0.48rem 0.65rem",
                            borderRadius: "8px",
                            background: "#ffffff",
                            border: "1px solid #cbd5e1",
                            color: "#0f172a",
                            fontSize: "0.83rem"
                          }}
                        >
                          <option value="">All Sections</option>
                          <option value="A">Section A</option>
                          <option value="B">Section B</option>
                          <option value="C">Section C</option>
                        </select>
                      </div>
                      <div>
                        <label style={{ display: "block", fontSize: "0.74rem", fontWeight: 700, color: "#475569", marginBottom: "0.25rem" }}>
                          Last Date to Submit
                        </label>
                        <input
                          type="date"
                          value={correctionDeadline}
                          onChange={(e) => setCorrectionDeadline(e.target.value)}
                          style={{
                            width: "100%",
                            padding: "0.48rem 0.65rem",
                            borderRadius: "8px",
                            background: "#ffffff",
                            border: "1px solid #cbd5e1",
                            color: "#0f172a",
                            fontSize: "0.83rem"
                          }}
                        />
                      </div>
                      <div>
                        <label style={{ display: "block", fontSize: "0.74rem", fontWeight: 700, color: "#475569", marginBottom: "0.25rem" }}>
                          Total Allocated Marks
                        </label>
                        <div
                          style={{
                            background: "#eff6ff",
                            border: "1px solid #bfdbfe",
                            padding: "0.48rem 0.75rem",
                            borderRadius: "8px",
                            color: "#1d4ed8",
                            fontWeight: 800,
                            fontSize: "0.92rem"
                          }}
                        >
                          {totalAllocatedMarks} marks
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* ACCORDION 2: General Instructions */}
              <div
                style={{
                  background: "#ffffff",
                  borderRadius: "14px",
                  border: "1px solid #e2e8f0",
                  boxShadow: "0 1px 3px rgba(15, 23, 42, 0.04)",
                  overflow: "hidden"
                }}
              >
                <div
                  onClick={() => setOpenInstructionsAccordion(!openInstructionsAccordion)}
                  style={{
                    padding: "0.9rem 1.25rem",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    cursor: "pointer",
                    background: "#f8fafc",
                    borderBottom: openInstructionsAccordion ? "1px solid #e2e8f0" : "none"
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", color: "#0f172a", fontWeight: 800, fontSize: "0.95rem" }}>
                    <CheckCircle2 size={16} style={{ color: "#2563eb" }} />
                    General Instructions
                  </div>
                  {openInstructionsAccordion ? (
                    <ChevronUp size={16} style={{ color: "#64748b" }} />
                  ) : (
                    <ChevronDown size={16} style={{ color: "#64748b" }} />
                  )}
                </div>

                {openInstructionsAccordion && (
                  <div style={{ padding: "1.1rem 1.2rem", display: "flex", flexDirection: "column", gap: "0.65rem", background: "#ffffff" }}>
                    {(digitalHeader.instructions || []).map((inst, iIdx) => (
                      <div
                        key={iIdx}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          gap: "0.75rem",
                          background: "#f8fafc",
                          padding: "0.55rem 0.85rem",
                          borderRadius: "8px",
                          border: "1px solid #e2e8f0",
                          fontSize: "0.82rem",
                          color: "#334155"
                        }}
                      >
                        <span>• {inst}</span>
                        <button
                          onClick={() => handleDeleteInstruction(iIdx)}
                          style={{ background: "none", border: "none", color: "#dc2626", cursor: "pointer" }}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    ))}
                    <button
                      onClick={handleAddInstruction}
                      style={{
                        background: "#ffffff",
                        border: "1px dashed #cbd5e1",
                        color: "#2563eb",
                        padding: "0.52rem",
                        borderRadius: "8px",
                        fontSize: "0.82rem",
                        fontWeight: 700,
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: "0.35rem"
                      }}
                    >
                      <Plus size={14} /> Add Instruction
                    </button>
                  </div>
                )}
              </div>

              {/* ACCORDION 3: Sections & Questions */}
              <div
                style={{
                  background: "#ffffff",
                  borderRadius: "14px",
                  border: "1px solid #e2e8f0",
                  boxShadow: "0 1px 3px rgba(15, 23, 42, 0.04)",
                  overflow: "hidden"
                }}
              >
                <div
                  onClick={() => setOpenQuestionsAccordion(!openQuestionsAccordion)}
                  style={{
                    padding: "0.9rem 1.25rem",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    cursor: "pointer",
                    background: "#f8fafc",
                    borderBottom: openQuestionsAccordion ? "1px solid #e2e8f0" : "none"
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", color: "#0f172a", fontWeight: 800, fontSize: "0.95rem" }}>
                    <Sliders size={16} style={{ color: "#2563eb" }} />
                    Sections & Questions
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.65rem" }}>
                    <span style={{ fontSize: "0.76rem", color: "#64748b", fontWeight: 600 }}>
                      Double-click or double-tap any question to edit
                    </span>
                    {openQuestionsAccordion ? (
                      <ChevronUp size={16} style={{ color: "#64748b" }} />
                    ) : (
                      <ChevronDown size={16} style={{ color: "#64748b" }} />
                    )}
                  </div>
                </div>

                {openQuestionsAccordion && (
                  <div style={{ padding: "1.15rem", display: "flex", flexDirection: "column", gap: "0.85rem", background: "#ffffff" }}>
                    {/* Summary Bar with Collapse All / Expand All List Mode */}
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        flexWrap: "wrap",
                        gap: "0.5rem",
                        background: "#f8fafc",
                        padding: "0.65rem 0.9rem",
                        borderRadius: "10px",
                        border: "1px solid #e2e8f0"
                      }}
                    >
                      <span style={{ fontSize: "0.86rem", fontWeight: 800, color: "#0f172a" }}>All Extracted Questions</span>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                        <button
                          type="button"
                          onClick={toggleAllQuestionsCollapse}
                          style={{
                            background: "#ffffff",
                            border: "1px solid #cbd5e1",
                            color: "#334155",
                            padding: "0.24rem 0.65rem",
                            borderRadius: "6px",
                            fontSize: "0.75rem",
                            fontWeight: 700,
                            cursor: "pointer",
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "0.3rem"
                          }}
                        >
                          {allQuestionsCollapsed ? <Maximize2 size={12} /> : <Minimize2 size={12} />}
                          {allQuestionsCollapsed ? "Expand All" : "Collapse All"}
                        </button>
                        <span style={{ fontSize: "0.78rem", color: "#64748b", fontWeight: 600 }}>
                          {questions.length} questions
                        </span>
                        <span
                          style={{
                            fontSize: "0.76rem",
                            background: "#2563eb",
                            color: "#ffffff",
                            padding: "0.15rem 0.55rem",
                            borderRadius: "6px",
                            fontWeight: 700
                          }}
                        >
                          {totalAllocatedMarks} marks
                        </span>
                      </div>
                    </div>

                    {/* Question Cards + Middle OR Divider Controls */}
                    {questions.map((q, idx) => {
                      const qKey = q.id || `q-${idx + 1}`;
                      const isActive = activeQuestionId === q.id;
                      const isEditing = editingQuestionIdx === idx;
                      const isCollapsed = Boolean(collapsedQuestionKeys[qKey]);
                      const nextQ = questions[idx + 1];
                      const sharesOrWithNext = Boolean(
                        nextQ &&
                        q.is_or_choice &&
                        nextQ.is_or_choice &&
                        q.or_group &&
                        nextQ.or_group &&
                        q.or_group === nextQ.or_group
                      );

                      return (
                        <React.Fragment key={qKey}>
                          <div
                            ref={(el) => {
                              if (q.id) questionCardRefs.current[q.id] = el;
                            }}
                            onClick={() => selectAndSyncQuestion(q)}
                            style={{
                              background: isActive ? "#f8faff" : "#ffffff",
                              border: isActive ? "2px solid #2563eb" : "1px solid #e2e8f0",
                              borderRadius: "12px",
                              padding: isCollapsed ? "0.7rem 0.95rem" : "1rem",
                              boxShadow: isActive
                                ? "0 4px 14px rgba(37, 99, 235, 0.08)"
                                : "0 1px 2px rgba(15, 23, 42, 0.03)",
                              transition: "border-color 0.15s ease, box-shadow 0.15s ease"
                            }}
                          >
                            {/* Question Header */}
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: isCollapsed ? 0 : "0.65rem", gap: "0.5rem", flexWrap: "wrap" }}>
                              <div style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: "0.4rem", flex: 1, minWidth: 0 }} onClick={(e) => e.stopPropagation()}>
                                <input
                                  type="text"
                                  value={q.q_no}
                                  onChange={(e) => handleQNoChange(idx, e.target.value)}
                                  title="Edit question number"
                                  style={{
                                    width: "72px",
                                    padding: "0.18rem 0.45rem",
                                    borderRadius: "6px",
                                    border: "1px solid #cbd5e1",
                                    background: "#f8fafc",
                                    color: "#0f172a",
                                    fontWeight: 800,
                                    fontSize: "0.86rem"
                                  }}
                                />
                                {q.section && (
                                  <span
                                    style={{
                                      fontSize: "0.72rem",
                                      background: "#f1f5f9",
                                      color: "#475569",
                                      padding: "0.15rem 0.45rem",
                                      borderRadius: "5px",
                                      fontWeight: 600
                                    }}
                                  >
                                    {q.section}
                                  </span>
                                )}
                                {q.is_or_choice && (
                                  <span
                                    style={{
                                      fontSize: "0.7rem",
                                      background: "#fffbeb",
                                      color: "#b45309",
                                      border: "1px solid #fde68a",
                                      padding: "0.14rem 0.45rem",
                                      borderRadius: "5px",
                                      fontWeight: 800
                                    }}
                                  >
                                    OR Choice
                                  </span>
                                )}
                                {q.page && paperPageCount > 0 && (
                                  <span
                                    style={{
                                      fontSize: "0.7rem",
                                      background: "#f8fafc",
                                      border: "1px solid #e2e8f0",
                                      color: "#64748b",
                                      padding: "0.1rem 0.45rem",
                                      borderRadius: "5px",
                                      fontWeight: 600
                                    }}
                                  >
                                    P{q.page}
                                  </span>
                                )}
                                {isCollapsed && (
                                  <span
                                    style={{
                                      fontSize: "0.78rem",
                                      color: "#475569",
                                      overflow: "hidden",
                                      textOverflow: "ellipsis",
                                      whiteSpace: "nowrap",
                                      maxWidth: "240px"
                                    }}
                                  >
                                    {(q.text || "").replace(/[*`#>\n]+/g, " ").trim()}
                                  </span>
                                )}
                              </div>

                              <div style={{ display: "flex", alignItems: "center", gap: "0.35rem" }} onClick={(e) => e.stopPropagation()}>
                                <input
                                  type="number"
                                  step="0.5"
                                  value={q.marks}
                                  onChange={(e) => handleMarkChange(idx, Number(e.target.value))}
                                  style={{
                                    width: "56px",
                                    padding: "0.22rem 0.38rem",
                                    borderRadius: "6px",
                                    background: "#ffffff",
                                    border: "1px solid #cbd5e1",
                                    color: "#0f172a",
                                    fontWeight: 700,
                                    fontSize: "0.82rem",
                                    textAlign: "center"
                                  }}
                                />
                                <span style={{ fontSize: "0.74rem", color: "#64748b", fontWeight: 600 }}>M</span>
                                <button
                                  type="button"
                                  onClick={() => handleAddOrChoiceBelow(idx)}
                                  title="Add OR Alternative below this question"
                                  style={{
                                    background: "#fffbeb",
                                    border: "1px solid #fde68a",
                                    color: "#b45309",
                                    padding: "0.2rem 0.45rem",
                                    borderRadius: "6px",
                                    fontSize: "0.7rem",
                                    fontWeight: 700,
                                    cursor: "pointer"
                                  }}
                                >
                                  + OR
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleInsertQuestionBelow(idx)}
                                  title="Insert a new question below"
                                  style={{
                                    background: "#f8fafc",
                                    border: "1px solid #cbd5e1",
                                    color: "#334155",
                                    padding: "0.22rem 0.42rem",
                                    borderRadius: "6px",
                                    fontSize: "0.72rem",
                                    fontWeight: 700,
                                    cursor: "pointer",
                                    display: "inline-flex",
                                    alignItems: "center",
                                    gap: "0.15rem"
                                  }}
                                >
                                  <Plus size={12} />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => toggleSingleQuestionCollapse(qKey)}
                                  title={isCollapsed ? "Expand question" : "Collapse question"}
                                  style={{
                                    background: "#ffffff",
                                    border: "1px solid #e2e8f0",
                                    color: "#64748b",
                                    borderRadius: "6px",
                                    padding: "0.22rem",
                                    cursor: "pointer"
                                  }}
                                >
                                  {isCollapsed ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteQuestion(idx)}
                                  style={{ background: "none", border: "none", color: "#dc2626", cursor: "pointer", padding: "0.2rem" }}
                                  title="Delete question"
                                >
                                  <Trash2 size={14} />
                                </button>
                              </div>
                            </div>

                            {/* Collapsible Body */}
                            {!isCollapsed && (
                              <div
                                onDoubleClick={(e) => {
                                  e.stopPropagation();
                                  setEditingQuestionIdx(idx);
                                }}
                                onTouchEnd={() => handleQuestionTouchEnd(idx)}
                                style={{
                                  background: isEditing ? "#ffffff" : "#f8fafc",
                                  padding: "0.85rem",
                                  borderRadius: "10px",
                                  border: isEditing ? "1.5px solid #2563eb" : "1px solid #e2e8f0",
                                  cursor: isEditing ? "text" : "pointer"
                                }}
                              >
                                <div
                                  style={{
                                    display: "flex",
                                    justifyContent: "space-between",
                                    alignItems: "center",
                                    marginBottom: "0.45rem"
                                  }}
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <div style={{ display: "flex", alignItems: "center", gap: "0.45rem" }}>
                                    <span
                                      style={{
                                        padding: "0.14rem 0.5rem",
                                        borderRadius: "999px",
                                        background: "#2563eb",
                                        color: "#ffffff",
                                        fontSize: "0.72rem",
                                        fontWeight: 700
                                      }}
                                    >
                                      {q.q_no}
                                    </span>
                                    <span style={{ fontSize: "0.72rem", color: "#64748b", display: "inline-flex", alignItems: "center", gap: "0.25rem" }}>
                                      <Edit3 size={11} />
                                      {isEditing ? "Editing Markdown source" : "Double-tap to edit"}
                                    </span>
                                  </div>

                                  <div style={{ display: "flex", alignItems: "center", gap: "0.45rem" }}>
                                    {isEditing && (
                                      <button
                                        onClick={() => setEditingQuestionIdx(null)}
                                        style={{
                                          background: "#eff6ff",
                                          border: "1px solid #bfdbfe",
                                          color: "#1d4ed8",
                                          padding: "0.22rem 0.6rem",
                                          borderRadius: "6px",
                                          fontSize: "0.74rem",
                                          fontWeight: 700,
                                          cursor: "pointer"
                                        }}
                                      >
                                        Done
                                      </button>
                                    )}
                                    <button
                                      onClick={() => handleOpenRefineModal(idx)}
                                      style={{
                                        background: "#ffffff",
                                        border: "1px solid #bfdbfe",
                                        color: "#2563eb",
                                        padding: "0.24rem 0.65rem",
                                        borderRadius: "6px",
                                        fontSize: "0.76rem",
                                        fontWeight: 700,
                                        cursor: "pointer",
                                        display: "flex",
                                        alignItems: "center",
                                        gap: "0.28rem"
                                      }}
                                    >
                                      <Sparkles size={12} /> Refine
                                    </button>
                                  </div>
                                </div>

                                {isEditing ? (
                                  <div>
                                    <textarea
                                      autoFocus
                                      rows={Math.max(3, Math.min(8, q.text.split("\n").length + 1))}
                                      value={q.text}
                                      onClick={(e) => e.stopPropagation()}
                                      onChange={(e) => handleTextChange(idx, e.target.value)}
                                      onKeyDown={(e) => {
                                        if (e.key === "Escape") {
                                          setEditingQuestionIdx(null);
                                        }
                                      }}
                                      onBlur={() => setEditingQuestionIdx(null)}
                                      style={{
                                        width: "100%",
                                        background: "#ffffff",
                                        border: "1px solid #cbd5e1",
                                        color: "#0f172a",
                                        borderRadius: "8px",
                                        padding: "0.55rem 0.65rem",
                                        fontSize: "0.86rem",
                                        lineHeight: 1.55,
                                        fontFamily: "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace",
                                        resize: "vertical"
                                      }}
                                    />
                                    <div style={{ fontSize: "0.71rem", color: "#64748b", marginTop: "0.3rem" }}>
                                      Markdown supported (`**bold**`, `` `code / grammar` ``, `- bullets`). Press Esc or click outside to preview.
                                    </div>
                                  </div>
                                ) : (
                                  <MarkdownQuestionView text={q.text} />
                                )}
                              </div>
                            )}
                          </div>

                          {/* Interactive OR Divider between adjacent questions */}
                          {idx < questions.length - 1 && (
                            <div
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: "0.6rem",
                                padding: sharesOrWithNext ? "0.15rem 0.25rem" : "0"
                              }}
                            >
                              <div style={{ flex: 1, height: "1px", background: sharesOrWithNext ? "#f59e0b" : "#e2e8f0" }} />
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleToggleOrMiddle(idx);
                                }}
                                title={sharesOrWithNext ? "Remove OR link between these two questions" : "Insert OR choice divider between these two existing questions"}
                                style={{
                                  background: sharesOrWithNext ? "#fffbeb" : "#ffffff",
                                  border: sharesOrWithNext ? "1.5px solid #f59e0b" : "1px dashed #cbd5e1",
                                  color: sharesOrWithNext ? "#b45309" : "#64748b",
                                  borderRadius: "999px",
                                  padding: sharesOrWithNext ? "0.16rem 0.85rem" : "0.14rem 0.65rem",
                                  fontSize: "0.7rem",
                                  fontWeight: 800,
                                  cursor: "pointer",
                                  whiteSpace: "nowrap"
                                }}
                              >
                                {sharesOrWithNext ? "— OR — (click to unlink)" : "+ Add OR mark in middle"}
                              </button>
                              <div style={{ flex: 1, height: "1px", background: sharesOrWithNext ? "#f59e0b" : "#e2e8f0" }} />
                            </div>
                          )}
                        </React.Fragment>
                      );
                    })}

                    <button
                      onClick={handleAddQuestion}
                      style={{
                        background: "#ffffff",
                        border: "1px dashed #93c5fd",
                        color: "#2563eb",
                        padding: "0.65rem",
                        borderRadius: "10px",
                        fontSize: "0.84rem",
                        cursor: "pointer",
                        fontWeight: 700
                      }}
                    >
                      + Add Question
                    </button>
                  </div>
                )}
              </div>

              {/* Pure White Bottom Save Bar */}
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  background: "#ffffff",
                  border: "1px solid #e2e8f0",
                  borderRadius: "12px",
                  padding: "0.85rem 1.25rem",
                  boxShadow: "0 1px 3px rgba(15, 23, 42, 0.04)"
                }}
              >
                <span style={{ fontSize: "0.78rem", color: "#64748b" }}>
                  Double-tap any question to edit · AI can make mistakes
                </span>

                <div style={{ display: "flex", gap: "0.75rem" }}>
                  <button
                    onClick={() => setViewMode("list")}
                    style={{
                      background: "#ffffff",
                      border: "1px solid #cbd5e1",
                      color: "#334155",
                      borderRadius: "8px",
                      fontSize: "0.85rem",
                      fontWeight: 600,
                      padding: "0.52rem 1.2rem",
                      cursor: "pointer"
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveExam}
                    disabled={isSaving}
                    style={{
                      background: saveSuccess ? "#16a34a" : "#2563eb",
                      border: "none",
                      color: "#ffffff",
                      borderRadius: "8px",
                      fontSize: "0.85rem",
                      fontWeight: 700,
                      padding: "0.52rem 1.35rem",
                      cursor: isSaving ? "wait" : "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: "0.35rem"
                    }}
                  >
                    <Check size={15} />
                    {saveSuccess ? "Exam Saved!" : isSaving ? "Saving..." : "Save Exam"}
                  </button>
                </div>
              </div>
            </div>

            {/* RIGHT HALF: Sticky Pure-White Scanned Paper Viewer with Interactive Spatial Overlays */}
            <div
              style={{
                position: "sticky",
                top: "1rem",
                height: "calc(100vh - 6.5rem)",
                background: "#ffffff",
                border: "1px solid #e2e8f0",
                borderRadius: "14px",
                padding: "1rem",
                boxShadow: "0 1px 4px rgba(15, 23, 42, 0.05)",
                display: "flex",
                flexDirection: "column"
              }}
            >
              {/* Viewer Toolbar */}
              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: "0.5rem",
                  marginBottom: "0.75rem",
                  paddingBottom: "0.65rem",
                  borderBottom: "1px solid #e2e8f0"
                }}
              >
                <div>
                  <div style={{ fontSize: "0.86rem", fontWeight: 800, color: "#0f172a" }}>
                    Original Scanned Question Paper
                  </div>
                  <div style={{ fontSize: "0.72rem", color: "#64748b" }}>
                    {paperId
                      ? `${questions.filter((q) => (q.page || 1) === currentPaperPage).length} question overlays on Page ${currentPaperPage}`
                      : "Upload a PDF or image to view scanned pages & overlays"}
                  </div>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: "0.45rem" }}>
                  {paperPageCount > 1 && (
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "0.25rem",
                        background: "#f8fafc",
                        border: "1px solid #e2e8f0",
                        borderRadius: "8px",
                        padding: "0.2rem 0.45rem"
                      }}
                    >
                      <button
                        onClick={() => {
                          setCurrentPaperPage((p) => Math.max(1, p - 1));
                          setPaperImageError(false);
                        }}
                        disabled={currentPaperPage <= 1}
                        style={{
                          background: "none",
                          border: "none",
                          color: currentPaperPage <= 1 ? "#cbd5e1" : "#334155",
                          cursor: currentPaperPage <= 1 ? "default" : "pointer",
                          display: "flex"
                        }}
                      >
                        <ChevronLeft size={15} />
                      </button>
                      <span style={{ fontSize: "0.75rem", fontWeight: 700, color: "#0f172a" }}>
                        {currentPaperPage} / {paperPageCount}
                      </span>
                      <button
                        onClick={() => {
                          setCurrentPaperPage((p) => Math.min(paperPageCount, p + 1));
                          setPaperImageError(false);
                        }}
                        disabled={currentPaperPage >= paperPageCount}
                        style={{
                          background: "none",
                          border: "none",
                          color: currentPaperPage >= paperPageCount ? "#cbd5e1" : "#334155",
                          cursor: currentPaperPage >= paperPageCount ? "default" : "pointer",
                          display: "flex"
                        }}
                      >
                        <ChevronRight size={15} />
                      </button>
                    </div>
                  )}

                  <span style={{ fontSize: "0.74rem", fontWeight: 700, color: "#64748b" }}>{paperZoom}%</span>
                </div>
              </div>

              {/* Paper Canvas Area */}
              <div
                style={{
                  position: "relative",
                  flex: 1,
                  overflow: "auto",
                  background: "#f8fafc",
                  border: "1px solid #e2e8f0",
                  borderRadius: "10px",
                  padding: "1rem",
                  display: "flex",
                  justifyContent: "center",
                  alignItems: "flex-start"
                }}
              >
                {isScanning && (
                  <div
                    style={{
                      position: "absolute",
                      inset: 0,
                      zIndex: 20,
                      background: "rgba(255, 255, 255, 0.88)",
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "0.65rem",
                      textAlign: "center",
                      padding: "1.5rem"
                    }}
                  >
                    <RefreshCw size={24} className="spin" style={{ color: "#2563eb" }} />
                    <div style={{ fontWeight: 800, color: "#0f172a", fontSize: "0.95rem" }}>
                      Scanning Paper & Mapping Overlays...
                    </div>
                    <div style={{ fontSize: "0.78rem", color: "#64748b", maxWidth: "300px" }}>
                      {scanMessage || "Processing pages with Gemini"}
                    </div>
                  </div>
                )}

                {(() => {
                  const pageImageUrl =
                    paperId && !paperImageError
                      ? resolveApiUrl(`/api/v1/academic/papers/${paperId}/pages/${currentPaperPage}`)
                      : paperLocalFallbackUrl;

                  if (!pageImageUrl) {
                    return (
                      <div
                        style={{
                          width: "100%",
                          minHeight: "320px",
                          display: "flex",
                          flexDirection: "column",
                          alignItems: "center",
                          justifyContent: "center",
                          textAlign: "center",
                          padding: "2rem",
                          background: "#ffffff",
                          border: "1.5px dashed #cbd5e1",
                          borderRadius: "10px",
                          gap: "0.75rem"
                        }}
                      >
                        <UploadCloud size={32} style={{ color: "#2563eb" }} />
                        <div style={{ fontWeight: 800, fontSize: "0.95rem", color: "#0f172a" }}>
                          No scanned question paper attached yet
                        </div>
                        <div style={{ fontSize: "0.8rem", color: "#64748b", maxWidth: "320px", lineHeight: 1.5 }}>
                          Upload a PDF or photo of the question paper to view every page with clickable question overlays.
                        </div>
                        <button
                          onClick={() => step3UploadInputRef.current?.click()}
                          style={{
                            background: "#2563eb",
                            color: "#ffffff",
                            border: "none",
                            padding: "0.55rem 1.15rem",
                            borderRadius: "8px",
                            fontWeight: 700,
                            fontSize: "0.84rem",
                            cursor: "pointer"
                          }}
                        >
                          Upload Question Paper
                        </button>
                      </div>
                    );
                  }

                  const pageOverlayQuestions = questions.filter(
                    (q) => (q.page || 1) === currentPaperPage && Array.isArray(q.box_2d) && q.box_2d.length === 4
                  );

                  return (
                    <div
                      style={{
                        position: "relative",
                        width: `${paperZoom * 6.5}px`,
                        maxWidth: "none",
                        transition: "width 0.15s ease",
                        background: "#ffffff",
                        borderRadius: "6px",
                        boxShadow: "0 4px 16px rgba(15, 23, 42, 0.08)"
                      }}
                    >
                      <img
                        src={pageImageUrl}
                        alt={`Question Paper Page ${currentPaperPage}`}
                        onError={() => setPaperImageError(true)}
                        style={{ width: "100%", height: "auto", display: "block", borderRadius: "6px" }}
                      />

                      {/* Spatial Question Highlight Overlays */}
                      {showPaperOverlays && pageOverlayQuestions.length > 0 && (
                        <div style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
                          {pageOverlayQuestions.map((oq, oIdx) => {
                            const [ymin, xmin, ymax, xmax] = oq.box_2d as number[];
                            const isSelected = activeQuestionId === oq.id;
                            return (
                              <div
                                key={`${oq.id || oIdx}-ov`}
                                onClick={() => handlePaperOverlaySelect(oq)}
                                title={`${oq.q_no} (${oq.marks} marks) — Click to jump to question`}
                                style={{
                                  position: "absolute",
                                  top: `${ymin / 10}%`,
                                  left: `${xmin / 10}%`,
                                  height: `${Math.max(2.4, (ymax - ymin) / 10)}%`,
                                  width: `${Math.max(4, (xmax - xmin) / 10)}%`,
                                  border: isSelected ? "2px solid #2563eb" : "1.5px dashed rgba(37, 99, 235, 0.55)",
                                  background: isSelected ? "rgba(37, 99, 235, 0.14)" : "rgba(37, 99, 235, 0.04)",
                                  borderRadius: "6px",
                                  pointerEvents: "auto",
                                  cursor: "pointer",
                                  zIndex: isSelected ? 5 : 1,
                                  transition: "all 0.15s ease"
                                }}
                              >
                                <span
                                  style={{
                                    position: "absolute",
                                    top: "-10px",
                                    right: "6px",
                                    background: isSelected ? "#1d4ed8" : "#2563eb",
                                    color: "#ffffff",
                                    fontSize: "0.66rem",
                                    fontWeight: 800,
                                    padding: "1px 6px",
                                    borderRadius: "999px",
                                    whiteSpace: "nowrap",
                                    boxShadow: "0 1px 3px rgba(0, 0, 0, 0.18)"
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
                  );
                })()}
              </div>
            </div>
          </div>

          {/* NON-BLURRING FLOATING REFINE WINDOW (No dim backdrop, lazy on user action) */}
          {refineModalIdx !== null && questions[refineModalIdx] && (
            <div
              onClick={(e) => e.stopPropagation()}
              style={{
                position: "fixed",
                bottom: "20px",
                right: "24px",
                zIndex: 1050,
                width: "min(560px, calc(100vw - 32px))",
                maxHeight: "78vh",
                background: "#ffffff",
                borderRadius: "16px",
                border: "1px solid #cbd5e1",
                boxShadow: "0 18px 48px rgba(15, 23, 42, 0.16)",
                display: "flex",
                flexDirection: "column",
                overflow: "hidden"
              }}
            >
              {/* Floating Window Header */}
              <div
                style={{
                  padding: "0.9rem 1.15rem",
                  borderBottom: "1px solid #e2e8f0",
                  background: "#ffffff",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center"
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "0.55rem" }}>
                  <div
                    style={{
                      width: "32px",
                      height: "32px",
                      borderRadius: "8px",
                      background: "#eff6ff",
                      color: "#2563eb",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center"
                    }}
                  >
                    <Wand2 size={16} />
                  </div>
                  <div>
                    <h3 style={{ margin: 0, fontSize: "0.96rem", fontWeight: 800, color: "#0f172a" }}>
                      Refine &amp; Generate Variants ({questions[refineModalIdx].q_no})
                    </h3>
                    <div style={{ fontSize: "0.73rem", color: "#64748b" }}>
                      {refineTopic
                        ? `Topic: ${refineTopic}`
                        : "Pick a level preset or type a prompt to generate same-topic variants"}
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => setRefineModalIdx(null)}
                  style={{
                    background: "#f8fafc",
                    border: "1px solid #e2e8f0",
                    color: "#475569",
                    borderRadius: "8px",
                    padding: "0.35rem",
                    cursor: "pointer"
                  }}
                >
                  <X size={16} />
                </button>
              </div>

              {/* Floating Window Body */}
              <div style={{ padding: "1rem 1.15rem", overflowY: "auto", display: "flex", flexDirection: "column", gap: "0.9rem", background: "#ffffff" }}>
                {/* Current Question Snapshot */}
                <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "10px", padding: "0.75rem 0.9rem" }}>
                  <div style={{ fontSize: "0.7rem", fontWeight: 800, color: "#64748b", textTransform: "uppercase", marginBottom: "0.25rem" }}>
                    Current Question ({questions[refineModalIdx].marks} marks)
                  </div>
                  <MarkdownQuestionView text={questions[refineModalIdx].text} compact />
                </div>

                {/* Difficulty & Generator Controls */}
                <div style={{ display: "flex", flexDirection: "column", gap: "0.55rem" }}>
                  <div style={{ fontSize: "0.76rem", fontWeight: 800, color: "#0f172a" }}>
                    Click a preset or enter custom prompt below:
                  </div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem" }}>
                    {[
                      { label: "Easier", action: "level_shift" as const, level: "Easy" },
                      { label: "Medium", action: "level_shift" as const, level: "Medium" },
                      { label: "Harder / Analytical", action: "level_shift" as const, level: "Hard" },
                      { label: "Practical Problem", action: "practical" as const, level: "Practical" },
                      { label: "Rephrase", action: "rephrase" as const, level: "Medium" },
                      { label: "Auto-Generate Set", action: "auto_generate" as const, level: "Mixed" }
                    ].map((preset) => {
                      const isSelected = refineAction === preset.action && refineTargetLevel === preset.level && refineSuggestions.length > 0;
                      return (
                        <button
                          key={preset.label}
                          disabled={refineLoading}
                          onClick={() => runRefineRequest(refineModalIdx, preset.action, preset.level, refineCustomInstruction)}
                          style={{
                            background: isSelected ? "#2563eb" : "#ffffff",
                            border: isSelected ? "1px solid #2563eb" : "1px solid #cbd5e1",
                            color: isSelected ? "#ffffff" : "#1e293b",
                            padding: "0.38rem 0.72rem",
                            borderRadius: "8px",
                            fontSize: "0.76rem",
                            fontWeight: 700,
                            cursor: refineLoading ? "wait" : "pointer"
                          }}
                        >
                          {preset.label}
                        </button>
                      );
                    })}
                  </div>

                  <div style={{ display: "flex", gap: "0.45rem" }}>
                    <input
                      type="text"
                      placeholder="Type custom instruction & press Enter..."
                      value={refineCustomInstruction}
                      onChange={(e) => setRefineCustomInstruction(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !refineLoading) {
                          void runRefineRequest(refineModalIdx, refineAction, refineTargetLevel, refineCustomInstruction);
                        }
                      }}
                      style={{
                        flex: 1,
                        padding: "0.45rem 0.7rem",
                        borderRadius: "8px",
                        background: "#ffffff",
                        border: "1px solid #cbd5e1",
                        color: "#0f172a",
                        fontSize: "0.8rem"
                      }}
                    />
                    <button
                      disabled={refineLoading}
                      onClick={() => runRefineRequest(refineModalIdx, refineAction, refineTargetLevel, refineCustomInstruction)}
                      style={{
                        background: "#0f172a",
                        color: "#ffffff",
                        border: "none",
                        padding: "0.45rem 0.9rem",
                        borderRadius: "8px",
                        fontSize: "0.78rem",
                        fontWeight: 700,
                        cursor: refineLoading ? "wait" : "pointer",
                        display: "flex",
                        alignItems: "center",
                        gap: "0.3rem"
                      }}
                    >
                      <Sparkles size={13} /> Generate
                    </button>
                  </div>
                </div>

                {/* Generated Candidates List (Empty prompt hint until user triggers generation) */}
                {refineLoading ? (
                  <div
                    style={{
                      padding: "1.5rem",
                      background: "#f8fafc",
                      border: "1px solid #e2e8f0",
                      borderRadius: "10px",
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      gap: "0.45rem",
                      color: "#334155"
                    }}
                  >
                    <RefreshCw size={20} className="spin" style={{ color: "#2563eb" }} />
                    <span style={{ fontWeight: 700, fontSize: "0.82rem" }}>
                      Generating same-topic options with Gemini...
                    </span>
                  </div>
                ) : refineError ? (
                  <div style={{ padding: "0.85rem", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: "10px", color: "#b91c1c", fontSize: "0.8rem" }}>
                    {refineError}
                  </div>
                ) : refineSuggestions.length === 0 ? (
                  <div style={{ padding: "0.9rem", background: "#f8fafc", border: "1px dashed #cbd5e1", borderRadius: "10px", color: "#64748b", fontSize: "0.78rem", textAlign: "center" }}>
                    Nothing sent yet. Choose a level button above or type an instruction and click <strong>Generate</strong> to preview replacement questions.
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                    {refineSuggestions.map((sug, sIdx) => {
                      const lvlLower = (sug.difficulty_level || "").toLowerCase();
                      const badgeColors =
                        lvlLower.includes("easy")
                          ? { bg: "#ecfdf5", text: "#047857", border: "#a7f3d0" }
                          : lvlLower.includes("hard") || lvlLower.includes("analy")
                            ? { bg: "#fef2f2", text: "#b91c1c", border: "#fecaca" }
                            : lvlLower.includes("pract")
                              ? { bg: "#fffbeb", text: "#b45309", border: "#fde68a" }
                              : { bg: "#eff6ff", text: "#1d4ed8", border: "#bfdbfe" };

                      return (
                        <div
                          key={sIdx}
                          style={{
                            background: "#ffffff",
                            border: "1px solid #e2e8f0",
                            borderRadius: "10px",
                            padding: "0.85rem",
                            display: "flex",
                            flexDirection: "column",
                            gap: "0.45rem"
                          }}
                        >
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "0.5rem" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: "0.45rem" }}>
                              <span
                                style={{
                                  background: badgeColors.bg,
                                  color: badgeColors.text,
                                  border: `1px solid ${badgeColors.border}`,
                                  padding: "0.12rem 0.5rem",
                                  borderRadius: "999px",
                                  fontSize: "0.7rem",
                                  fontWeight: 800
                                }}
                              >
                                {sug.difficulty_level}
                              </span>
                              <span style={{ fontWeight: 800, fontSize: "0.84rem", color: "#0f172a" }}>
                                {sug.title}
                              </span>
                            </div>
                            <span style={{ fontSize: "0.74rem", fontWeight: 700, color: "#475569" }}>
                              {sug.marks} marks
                            </span>
                          </div>

                          <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "8px", padding: "0.65rem 0.8rem" }}>
                            <MarkdownQuestionView text={sug.question_text} compact />
                          </div>

                          <div style={{ fontSize: "0.72rem", color: "#64748b" }}>
                            <strong>Rationale:</strong> {sug.rationale}
                          </div>

                          <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.5rem", marginTop: "0.15rem" }}>
                            <button
                              onClick={() => handleAddGeneratedAsNewQuestion(sug)}
                              style={{
                                background: "#ffffff",
                                border: "1px solid #cbd5e1",
                                color: "#0f172a",
                                padding: "0.36rem 0.72rem",
                                borderRadius: "7px",
                                fontSize: "0.76rem",
                                fontWeight: 700,
                                cursor: "pointer"
                              }}
                            >
                              + Add as New Question
                            </button>
                            <button
                              onClick={() => handleApplyReplaceQuestion(sug)}
                              style={{
                                background: "#2563eb",
                                border: "none",
                                color: "#ffffff",
                                padding: "0.36rem 0.82rem",
                                borderRadius: "7px",
                                fontSize: "0.76rem",
                                fontWeight: 700,
                                cursor: "pointer"
                              }}
                            >
                              Replace Question
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};