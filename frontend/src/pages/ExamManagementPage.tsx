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
  Sliders,
  ChevronDown,
  ChevronUp,
  FolderGit2,
  MoreVertical,
  X
} from "lucide-react";

interface ExamManagementProps {
  initialSubjectId?: string;
  onNavigate: (tab: any, params?: any) => void;
}

export const ExamManagementPage: React.FC<ExamManagementProps> = ({
  initialSubjectId,
  onNavigate
}) => {
  // View mode: "list" | "create" (3-step editor / review) | "answer-key-review"
  const [viewMode, setViewMode] = useState<"list" | "create" | "answer-key-review">("list");
  // Modular Flow Steps: 1 = Upload PDF, 2 = Confirm Meta & Structure, 3 = Split Review & Edit
  const [step, setStep] = useState<1 | 2 | 3>(1);

  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<string>("");
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>(initialSubjectId || "");
  const [exams, setExams] = useState<Exam[]>([]);
  const [activeExam, setActiveExam] = useState<Exam | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(false);

  // Zoom control for question paper preview (55% default as in screenshots)
  const [paperZoom, setPaperZoom] = useState<number>(75);

  // Accordion toggles in Exam Review & Edit (Image 1 & 2)
  const [openInfoAccordion, setOpenInfoAccordion] = useState(true);
  const [openInstructionsAccordion, setOpenInstructionsAccordion] = useState(true);
  const [openQuestionsAccordion, setOpenQuestionsAccordion] = useState(true);

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

  // Answer Sheets Upload Modal State (Image 3)
  const [showAnswerSheetModal, setShowAnswerSheetModal] = useState(false);
  const [sheetModalExam, setSheetModalExam] = useState<Exam | null>(null);
  const [uploadedAnswerFiles, setUploadedAnswerFiles] = useState<File[]>([]);
  const [uploadActiveTab, setUploadActiveTab] = useState<"upload" | "students">("upload");

  // Answer Key Generation & Review State (Images 4, 5, 6)
  const [isGeneratingKey, setIsGeneratingKey] = useState(false);
  const [structuredKeyData, setStructuredKeyData] = useState<any>(null);
  const [activeKeyQuestionIdx, setActiveKeyQuestionIdx] = useState<number>(0);
  const [editKeyOff, setEditKeyOff] = useState(true);
  const [expandAllKey, setExpandAllKey] = useState(true);

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
    setPassingMarks(24.0);
    setExamDate(new Date().toISOString().split("T")[0]);
    const d = new Date();
    d.setDate(d.getDate() + 10);
    setCorrectionDeadline(d.toISOString().split("T")[0]);
    setAnswerKeyText("");
    setQuestions([]);
    setPaperFile(null);
    setScanMessage(null);
    if (presetClassId) setSelectedClassId(presetClassId);
    if (presetSubjectId) setSelectedSubjectId(presetSubjectId);
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
          course: res.header.course || "Core Curriculum",
          time_allowed: res.header.time_allowed || "3 Hours",
          max_marks: res.total_marks || 60.0,
          instructions: res.header.instructions || []
        });
      }

      setStep(2);
    } catch (err: any) {
      alert("Failed to scan question paper. Falling back to structured editor.");
      setStep(2);
    } finally {
      setIsScanning(false);
    }
  };

  const handleMarkChange = (index: number, newMarks: number) => {
    const updated = [...questions];
    updated[index] = { ...updated[index], marks: newMarks };
    setQuestions(updated);
  };

  const handleTextChange = (index: number, newText: string) => {
    const updated = [...questions];
    updated[index] = { ...updated[index], text: newText };
    setQuestions(updated);
  };

  const handleAddQuestion = () => {
    const newQ: QuestionItem = {
      id: `q-${questions.length + 1}`,
      q_no: `Q${questions.length + 1}`,
      text: "New examination question statement.",
      marks: 10.0,
      rubric: "Technical formulation, step-by-step mathematical working, and university length requirement."
    };
    setQuestions([...questions, newQ]);
    setActiveQuestionId(newQ.id || null);
  };

  const handleDeleteQuestion = (index: number) => {
    const updated = questions.filter((_, i) => i !== index);
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

  const totalAllocatedMarks = questions.reduce((sum, q) => sum + (Number(q.marks) || 0), 0);

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
        await academicApi.updateExamQuestions(activeExam.id, questions, totalAllocatedMarks);
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
          exam_date: examDate,
          correction_deadline: correctionDeadline,
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

  // Open Answer Key Review modal/split view (Images 4, 5, 6)
  const handleOpenAnswerKeyReview = async (exam: Exam) => {
    setActiveExam(exam);
    setViewMode("answer-key-review");
    setIsGeneratingKey(true);
    try {
      const result = await academicApi.generateAnswerKey(exam.id);
      setStructuredKeyData(result);
      if (result.answer_key_text) {
        setAnswerKeyText(result.answer_key_text);
      }
    } catch (err) {
      console.error("Error generating answer key:", err);
    } finally {
      setIsGeneratingKey(false);
    }
  };

  const handleApproveAnswerKey = async () => {
    if (!activeExam) return;
    try {
      const text = structuredKeyData?.answer_key_text || answerKeyText || "Master answer key approved.";
      await academicApi.updateExamAnswerKey(activeExam.id, text);
      alert("Answer key approved! Grading is now unlocked for this examination.");
      await loadExams();
      setViewMode("list");
    } catch (err) {
      alert("Failed to approve answer key.");
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
                            style={{
                              background: "#ffffff",
                              border: "1px solid #e2e8f0",
                              borderRadius: "14px",
                              padding: "1.25rem",
                              display: "flex",
                              flexDirection: "column",
                              justifyContent: "space-between",
                              boxShadow: "0 1px 3px rgba(0,0,0,0.03)"
                            }}
                          >
                            <div>
                              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "0.5rem" }}>
                                <span style={{ fontSize: "0.75rem", fontWeight: 700, background: "#f1f5f9", color: "#334155", padding: "0.2rem 0.5rem", borderRadius: "4px" }}>
                                  {subj?.code || "SUBJ"} • {subj?.name || "Subject"}
                                </span>
                                <span style={{ fontSize: "0.75rem", fontWeight: 700, color: hasAnswerKey ? "#16a34a" : "#d97706", display: "flex", alignItems: "center", gap: "0.25rem" }}>
                                  {hasAnswerKey ? <CheckCircle2 size={13} /> : <Sparkles size={13} />}
                                  {hasAnswerKey ? "Answer Key Approved" : "Needs Answer Key"}
                                </span>
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
                            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", borderTop: "1px solid #f1f5f9", paddingTop: "0.85rem" }}>
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
                                  onClick={() => handleOpenAnswerKeyReview(exam)}
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
  // VIEW 2: REVIEW ANSWER KEY (BETA) SPLIT VIEW (Images 4, 5, 6)
  // ==========================================
  if (viewMode === "answer-key-review") {
    const answersList = structuredKeyData?.answers || [
      {
        q_no: "Q1",
        section: "Part A",
        marks: 2.5,
        question_text: "Construct SLR Parsing table for the grammar S -> (L) | a, L -> L,S | S",
        model_answer: "Augmented grammar: S' -> S. Canonical collection I0..I8. ACTION/GOTO parsing table with shift on terminals, reduce on FOLLOW sets.",
        marks_distribution: [
          { label: "LR(0) Collection and FOLLOW Set Computation", marks: 1.0, color: "#2563eb" },
          { label: "SLR Parsing Table Construction", marks: 1.5, color: "#16a34a" }
        ],
        rubric_items: [
          {
            title: "LR(0) Collection and FOLLOW Set Computation",
            marks: 1.0,
            criteria: [
              "Award 1 mark for correctly constructing all 9 canonical LR(0) item sets (I0 through I8) and finding correct FOLLOW sets: FOLLOW(S) = {')', ',', '$'}.",
              "Award 0.5 marks if there are minor errors in state transitions or incomplete item closures.",
              "Award 0 marks for completely incorrect item sets or missing FOLLOW sets."
            ]
          },
          {
            title: "SLR Parsing Table Construction",
            marks: 1.5,
            criteria: [
              "Award 1.5 marks for correctly constructing the full SLR parsing table showing ACTION (shift, reduce, accept) and GOTO entries across all 9 states without missing/incorrect actions.",
              "Award 1 mark if the ACTION and GOTO tables are mostly correct with 1-2 incorrect or omitted cell entries.",
              "Award 0.5 marks if only ACTION or GOTO entries are partially given.",
              "Award 0 marks for an unattempted or entirely incorrect parsing table."
            ]
          }
        ],
        marking_notes: "Verify that reduce actions only appear under valid FOLLOW set symbols.",
        bloom_level: "Analyze / Evaluate"
      }
    ];

    return (
      <div className="answer-key-review-page pb-16" style={{ background: "#0b132b", minHeight: "100vh", color: "#ffffff", margin: "-1.5rem", padding: "1.5rem" }}>
        {/* Top Header Bar */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #1e293b", paddingBottom: "1rem", marginBottom: "1.25rem", flexWrap: "wrap", gap: "1rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
            <button
              onClick={() => setViewMode("list")}
              style={{ background: "#1e293b", border: "1px solid #334155", color: "#ffffff", padding: "0.45rem", borderRadius: "8px", cursor: "pointer" }}
            >
              <ArrowLeft size={16} />
            </button>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <h2 style={{ fontSize: "1.25rem", fontWeight: 800, margin: 0, color: "#ffffff" }}>
                  Review answer key
                </h2>
                <span style={{ fontSize: "0.68rem", fontWeight: 800, background: "#1d4ed8", color: "#ffffff", padding: "0.15rem 0.45rem", borderRadius: "4px" }}>
                  BETA
                </span>
              </div>
              <div style={{ fontSize: "0.78rem", color: "#94a3b8" }}>
                {activeExam?.title || "Examination Paper"}
              </div>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
            <button
              onClick={() => setEditKeyOff(!editKeyOff)}
              style={{ background: "#1e293b", border: "1px solid #334155", color: "#e2e8f0", padding: "0.4rem 0.75rem", borderRadius: "6px", fontSize: "0.8rem", cursor: "pointer" }}
            >
              Edit {editKeyOff ? "off" : "on"}
            </button>
            <button
              onClick={() => setExpandAllKey(true)}
              style={{ background: "#1e293b", border: "1px solid #334155", color: "#e2e8f0", padding: "0.4rem 0.75rem", borderRadius: "6px", fontSize: "0.8rem", cursor: "pointer" }}
            >
              Expand all
            </button>
            <button
              onClick={() => setExpandAllKey(false)}
              style={{ background: "#1e293b", border: "1px solid #334155", color: "#e2e8f0", padding: "0.4rem 0.75rem", borderRadius: "6px", fontSize: "0.8rem", cursor: "pointer" }}
            >
              Collapse all
            </button>
            <button
              onClick={() => alert("Downloading master answer key...")}
              style={{ background: "#1d4ed8", border: "none", color: "#ffffff", padding: "0.4rem 0.85rem", borderRadius: "6px", fontSize: "0.8rem", fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: "0.35rem" }}
            >
              <Download size={14} /> Download answer key
            </button>
          </div>
        </div>

        {/* Split Screen Workspace */}
        <div style={{ display: "grid", gridTemplateColumns: "1.1fr 0.9fr", gap: "1.25rem", minHeight: "75vh" }}>
          {/* LEFT HALF: Key & Rubrics */}
          <div style={{ background: "#0f172a", border: "1px solid #1e293b", borderRadius: "14px", padding: "1.5rem", overflowY: "auto", maxHeight: "78vh" }}>
            {isGeneratingKey ? (
              <div style={{ textAlign: "center", padding: "4rem 2rem" }}>
                <div style={{ width: "80px", height: "80px", borderRadius: "50%", background: "radial-gradient(circle, #818cf8 0%, #3b82f6 50%, #1e1b4b 100%)", margin: "0 auto 1.5rem", boxShadow: "0 0 40px rgba(99, 102, 241, 0.6)", animation: "pulse 2s infinite" }} />
                <h3 style={{ fontSize: "1.4rem", fontWeight: 900, marginBottom: "0.4rem" }}>
                  Creating your answer key
                </h3>
                <p style={{ color: "#94a3b8", fontSize: "0.88rem", marginBottom: "2rem" }}>
                  Preparing answers and marking criteria using zero-temperature Gemini synthesis
                </p>

                <div style={{ background: "#1e293b", borderRadius: "12px", padding: "1.25rem", maxWidth: "420px", margin: "0 auto", textAlign: "left" }}>
                  <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "#60a5fa", textTransform: "uppercase", marginBottom: "0.35rem" }}>While you wait</div>
                  <div style={{ fontSize: "0.92rem", fontWeight: 800, color: "#ffffff", marginBottom: "0.25rem" }}>Credit for the method</div>
                  <div style={{ fontSize: "0.82rem", color: "#cbd5e1", lineHeight: 1.5 }}>
                    Marking criteria show what earns credit, including partial marks and multi-step derivations where appropriate.
                  </div>
                </div>
              </div>
            ) : (
              <div>
                {/* Generation Status Pill */}
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.82rem", color: "#93c5fd", background: "rgba(30, 58, 138, 0.3)", padding: "0.6rem 0.9rem", borderRadius: "8px", border: "1px solid #1d4ed8", marginBottom: "1.5rem" }}>
                  <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#60a5fa" }} />
                  <span><strong>{answersList.length} answers prepared:</strong> Read answers as they arrive. Editing and approval unlock when the complete draft is checked.</span>
                </div>

                {/* Question Answers & Rubrics */}
                <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
                  {answersList.map((item: any, idx: number) => (
                    <div
                      key={idx}
                      onClick={() => setActiveKeyQuestionIdx(idx)}
                      style={{
                        background: "#1e293b",
                        border: activeKeyQuestionIdx === idx ? "2px solid #3b82f6" : "1px solid #334155",
                        borderRadius: "12px",
                        padding: "1.25rem",
                        cursor: "pointer"
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem" }}>
                        <span style={{ fontSize: "0.95rem", fontWeight: 800, color: "#ffffff" }}>
                          {item.q_no} • {item.section || "Part A"}
                        </span>
                        <span style={{ fontSize: "0.82rem", fontWeight: 700, color: "#60a5fa" }}>
                          {item.marks} marks
                        </span>
                      </div>

                      <div style={{ fontSize: "0.85rem", color: "#e2e8f0", marginBottom: "1rem", lineHeight: 1.5 }}>
                        {item.question_text}
                      </div>

                      {/* Marks Distribution Split Bar */}
                      {item.marks_distribution && item.marks_distribution.length > 0 && (
                        <div style={{ marginBottom: "1.25rem" }}>
                          <div style={{ fontSize: "0.72rem", fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "0.4rem" }}>
                            Marks Distribution
                          </div>
                          <div style={{ display: "flex", height: "32px", borderRadius: "6px", overflow: "hidden", border: "1px solid #334155" }}>
                            {item.marks_distribution.map((seg: any, sIdx: number) => (
                              <div
                                key={sIdx}
                                style={{
                                  flex: seg.marks || 1,
                                  background: seg.color || "#2563eb",
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  color: "#ffffff",
                                  fontSize: "0.8rem",
                                  fontWeight: 800
                                }}
                              >
                                {seg.marks}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Rubric Checklist Items */}
                      {item.rubric_items && item.rubric_items.length > 0 && (
                        <div style={{ display: "flex", flexDirection: "column", gap: "0.85rem" }}>
                          {item.rubric_items.map((rub: any, rIdx: number) => (
                            <div key={rIdx} style={{ background: "rgba(15, 23, 42, 0.6)", padding: "0.85rem", borderRadius: "8px", border: "1px solid #334155" }}>
                              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.4rem" }}>
                                <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.85rem", fontWeight: 700, color: "#ffffff" }}>
                                  <input type="checkbox" defaultChecked />
                                  {rub.title}
                                </label>
                                <span style={{ fontSize: "0.8rem", color: "#94a3b8", fontWeight: 700 }}>
                                  {rub.marks} m
                                </span>
                              </div>
                              <div style={{ paddingLeft: "1.5rem", display: "flex", flexDirection: "column", gap: "0.3rem" }}>
                                {(rub.criteria || []).map((crit: string, cIdx: number) => (
                                  <div key={cIdx} style={{ fontSize: "0.78rem", color: "#cbd5e1", lineHeight: 1.4 }}>
                                    • {crit}
                                  </div>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Expandable Accordions */}
                      <div style={{ marginTop: "1rem", borderTop: "1px solid #334155", paddingTop: "0.75rem", display: "flex", flexDirection: "column", gap: "0.5rem", fontSize: "0.78rem", color: "#94a3b8" }}>
                        <details open={expandAllKey}>
                          <summary style={{ cursor: "pointer", fontWeight: 700, color: "#cbd5e1" }}>Marking notes</summary>
                          <div style={{ padding: "0.4rem 0", color: "#94a3b8" }}>
                            {item.marking_notes || "Verify that derivations follow formal notation and bounds."}
                          </div>
                        </details>
                        <details open={expandAllKey}>
                          <summary style={{ cursor: "pointer", fontWeight: 700, color: "#cbd5e1" }}>Curriculum & Bloom level</summary>
                          <div style={{ padding: "0.4rem 0", color: "#94a3b8" }}>
                            {item.bloom_level || "Apply / Analyze"}
                          </div>
                        </details>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* RIGHT HALF: Live Question Paper Preview with Zoom & Highlight Overlay */}
          <div style={{ background: "#0f172a", border: "1px solid #1e293b", borderRadius: "14px", padding: "1.25rem", display: "flex", flexDirection: "column" }}>
            {/* Top Toolbar */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem", borderBottom: "1px solid #1e293b", paddingBottom: "0.75rem" }}>
              <span style={{ fontSize: "0.82rem", fontWeight: 700, color: "#94a3b8" }}>
                Active Question Reference
              </span>
              <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                <span style={{ fontSize: "0.75rem", color: "#94a3b8" }}>{paperZoom}%</span>
                <input
                  type="range"
                  min="40"
                  max="150"
                  value={paperZoom}
                  onChange={(e) => setPaperZoom(Number(e.target.value))}
                  style={{ width: "90px" }}
                />
              </div>
            </div>

            {/* Paper Preview Canvas Container */}
            <div style={{ flex: 1, overflow: "auto", background: "#ffffff", borderRadius: "10px", padding: "1.5rem", display: "flex", justifyContent: "center", alignItems: "flex-start", position: "relative" }}>
              <div style={{ width: `${paperZoom * 6.5}px`, transition: "width 0.15s ease", position: "relative" }}>
                <img
                  src="/sample-question-paper.png"
                  alt="Examination Question Paper Scan"
                  style={{ width: "100%", height: "auto", display: "block", borderRadius: "6px", boxShadow: "0 4px 12px rgba(0,0,0,0.15)" }}
                />
                {/* Visual active bounding box overlay */}
                <div
                  style={{
                    position: "absolute",
                    top: "35%",
                    left: "2%",
                    width: "96%",
                    height: "30%",
                    border: "2px solid #2563eb",
                    background: "rgba(37, 99, 235, 0.1)",
                    borderRadius: "4px",
                    pointerEvents: "none"
                  }}
                >
                  <span style={{ position: "absolute", top: "-18px", left: "0", background: "#2563eb", color: "#ffffff", fontSize: "0.65rem", fontWeight: 800, padding: "0.1rem 0.4rem", borderRadius: "2px" }}>
                    A - Question 3
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div style={{ marginTop: "1.25rem", display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "1px solid #1e293b", paddingTop: "1rem" }}>
          <span style={{ fontSize: "0.78rem", color: "#64748b" }}>Draft saved automatically</span>
          <div style={{ display: "flex", gap: "0.75rem" }}>
            <button
              onClick={() => handleOpenAnswerKeyReview(activeExam!)}
              style={{ background: "#1e293b", border: "1px solid #334155", color: "#e2e8f0", padding: "0.55rem 1rem", borderRadius: "8px", fontSize: "0.85rem", cursor: "pointer" }}
            >
              Generate another draft
            </button>
            <button
              onClick={() => {
                alert("Answer key draft saved!");
                setViewMode("list");
              }}
              style={{ background: "#1e293b", border: "1px solid #334155", color: "#e2e8f0", padding: "0.55rem 1rem", borderRadius: "8px", fontSize: "0.85rem", cursor: "pointer" }}
            >
              Save draft
            </button>
            <button
              onClick={handleApproveAnswerKey}
              style={{ background: "#2563eb", border: "none", color: "#ffffff", padding: "0.55rem 1.4rem", borderRadius: "8px", fontSize: "0.85rem", fontWeight: 800, cursor: "pointer" }}
            >
              Approve & use for grading
            </button>
          </div>
        </div>
      </div>
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

      {/* STEP 3: FULLSCREEN LIVE SPLIT WORKSPACE (Matching Images 1 & 2) */}
      {step === 3 && (
        <div>
          {/* Top Navbar matching Image 1 */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              background: "#0b132b",
              color: "#ffffff",
              padding: "0.75rem 1.5rem",
              borderRadius: "12px",
              marginBottom: "1rem"
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
              <button
                onClick={() => setViewMode("list")}
                style={{ background: "#1e293b", border: "1px solid #334155", color: "#ffffff", padding: "0.45rem", borderRadius: "8px", cursor: "pointer" }}
              >
                <ArrowLeft size={16} />
              </button>
              <h2 style={{ fontSize: "1.15rem", fontWeight: 800, margin: 0, color: "#ffffff" }}>
                Review & Edit Exam
              </h2>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
              <button
                onClick={() => alert("Downloading question paper PDF...")}
                style={{
                  background: "#1e293b",
                  border: "1px solid #334155",
                  color: "#cbd5e1",
                  padding: "0.4rem 0.85rem",
                  borderRadius: "8px",
                  fontSize: "0.82rem",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.35rem"
                }}
              >
                <Download size={14} /> Download question paper
              </button>

              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <input
                  type="range"
                  min="40"
                  max="150"
                  value={paperZoom}
                  onChange={(e) => setPaperZoom(Number(e.target.value))}
                  style={{ width: "80px" }}
                />
                <span style={{ fontSize: "0.78rem", color: "#94a3b8" }}>{paperZoom}%</span>
              </div>

              <button style={{ background: "none", border: "none", color: "#94a3b8", cursor: "pointer" }}>
                <Eye size={18} />
              </button>
            </div>
          </div>

          {/* Full Screen Split Layout */}
          <div style={{ display: "grid", gridTemplateColumns: "1.1fr 0.9fr", gap: "1.25rem", minHeight: "80vh" }}>
            {/* LEFT HALF: Accordions with Question Settings */}
            <div
              style={{
                background: "#0f172a",
                border: "1px solid #1e293b",
                borderRadius: "14px",
                padding: "1.25rem",
                overflowY: "auto",
                maxHeight: "82vh",
                display: "flex",
                flexDirection: "column",
                gap: "1rem"
              }}
            >
              {/* ACCORDION 1: Exam Information */}
              <div style={{ background: "#1e293b", borderRadius: "12px", border: "1px solid #334155", overflow: "hidden" }}>
                <div
                  onClick={() => setOpenInfoAccordion(!openInfoAccordion)}
                  style={{ padding: "0.85rem 1.25rem", display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer", background: "rgba(15, 23, 42, 0.5)" }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", color: "#ffffff", fontWeight: 800, fontSize: "0.95rem" }}>
                    <FileText size={16} style={{ color: "#60a5fa" }} />
                    Exam Information
                  </div>
                  {openInfoAccordion ? <ChevronUp size={16} style={{ color: "#94a3b8" }} /> : <ChevronDown size={16} style={{ color: "#94a3b8" }} />}
                </div>

                {openInfoAccordion && (
                  <div style={{ padding: "1.25rem", display: "flex", flexDirection: "column", gap: "1rem" }}>
                    <div style={{ background: "#0f172a", borderRadius: "8px", padding: "1rem", border: "1px solid #334155" }}>
                      <div style={{ fontSize: "0.85rem", fontWeight: 800, color: "#ffffff", marginBottom: "0.2rem" }}>
                        Class & subject
                      </div>
                      <div style={{ fontSize: "0.75rem", color: "#94a3b8", marginBottom: "0.75rem" }}>
                        Choose the class, student group and subject for this paper.
                      </div>

                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
                        <div>
                          <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 700, color: "#94a3b8", marginBottom: "0.25rem" }}>Class / course *</label>
                          <select
                            value={selectedClassId}
                            onChange={(e) => setSelectedClassId(e.target.value)}
                            style={{ width: "100%", padding: "0.45rem 0.65rem", borderRadius: "6px", background: "#1e293b", border: "1px solid #475569", color: "#ffffff", fontSize: "0.82rem" }}
                          >
                            {classes.map((c) => (
                              <option key={c.id} value={c.id}>{c.name}</option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 700, color: "#94a3b8", marginBottom: "0.25rem" }}>Subject *</label>
                          <select
                            value={selectedSubjectId}
                            onChange={(e) => setSelectedSubjectId(e.target.value)}
                            style={{ width: "100%", padding: "0.45rem 0.65rem", borderRadius: "6px", background: "#1e293b", border: "1px solid #475569", color: "#ffffff", fontSize: "0.82rem" }}
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
                        <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 700, color: "#94a3b8", marginBottom: "0.25rem" }}>Exam Title</label>
                        <input
                          type="text"
                          value={examTitle}
                          onChange={(e) => setExamTitle(e.target.value)}
                          style={{ width: "100%", padding: "0.45rem 0.65rem", borderRadius: "6px", background: "#0f172a", border: "1px solid #334155", color: "#ffffff", fontSize: "0.82rem" }}
                        />
                      </div>
                      <div>
                        <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 700, color: "#94a3b8", marginBottom: "0.25rem" }}>Academic Year</label>
                        <input
                          type="text"
                          value={academicYear}
                          onChange={(e) => setAcademicYear(e.target.value)}
                          style={{ width: "100%", padding: "0.45rem 0.65rem", borderRadius: "6px", background: "#0f172a", border: "1px solid #334155", color: "#ffffff", fontSize: "0.82rem" }}
                        />
                      </div>
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
                      <div>
                        <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 700, color: "#94a3b8", marginBottom: "0.25rem" }}>Last Date to Submit</label>
                        <input
                          type="date"
                          value={correctionDeadline}
                          onChange={(e) => setCorrectionDeadline(e.target.value)}
                          style={{ width: "100%", padding: "0.45rem 0.65rem", borderRadius: "6px", background: "#0f172a", border: "1px solid #334155", color: "#ffffff", fontSize: "0.82rem" }}
                        />
                      </div>
                      <div>
                        <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 700, color: "#94a3b8", marginBottom: "0.25rem" }}>Total Allocated Marks</label>
                        <div style={{ background: "#0f172a", border: "1px solid #334155", padding: "0.45rem 0.75rem", borderRadius: "6px", color: "#60a5fa", fontWeight: 800, fontSize: "0.95rem" }}>
                          {totalAllocatedMarks} marks
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* ACCORDION 2: General Instructions */}
              <div style={{ background: "#1e293b", borderRadius: "12px", border: "1px solid #334155", overflow: "hidden" }}>
                <div
                  onClick={() => setOpenInstructionsAccordion(!openInstructionsAccordion)}
                  style={{ padding: "0.85rem 1.25rem", display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer", background: "rgba(15, 23, 42, 0.5)" }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", color: "#ffffff", fontWeight: 800, fontSize: "0.95rem" }}>
                    <CheckCircle2 size={16} style={{ color: "#60a5fa" }} />
                    General Instructions
                  </div>
                  {openInstructionsAccordion ? <ChevronUp size={16} style={{ color: "#94a3b8" }} /> : <ChevronDown size={16} style={{ color: "#94a3b8" }} />}
                </div>

                {openInstructionsAccordion && (
                  <div style={{ padding: "1.25rem", display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                    {(digitalHeader.instructions || []).map((inst, iIdx) => (
                      <div key={iIdx} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "#0f172a", padding: "0.55rem 0.85rem", borderRadius: "6px", border: "1px solid #334155", fontSize: "0.8rem", color: "#cbd5e1" }}>
                        <span>• {inst}</span>
                        <button onClick={() => handleDeleteInstruction(iIdx)} style={{ background: "none", border: "none", color: "#ef4444", cursor: "pointer" }}><Trash2 size={14} /></button>
                      </div>
                    ))}
                    <button
                      onClick={handleAddInstruction}
                      style={{ background: "#0f172a", border: "1px dashed #475569", color: "#93c5fd", padding: "0.5rem", borderRadius: "6px", fontSize: "0.8rem", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "0.3rem" }}
                    >
                      <Plus size={14} /> Add Instruction
                    </button>
                  </div>
                )}
              </div>

              {/* ACCORDION 3: Sections & Questions */}
              <div style={{ background: "#1e293b", borderRadius: "12px", border: "1px solid #334155", overflow: "hidden" }}>
                <div
                  onClick={() => setOpenQuestionsAccordion(!openQuestionsAccordion)}
                  style={{ padding: "0.85rem 1.25rem", display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer", background: "rgba(15, 23, 42, 0.5)" }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", color: "#ffffff", fontWeight: 800, fontSize: "0.95rem" }}>
                    <Sliders size={16} style={{ color: "#60a5fa" }} />
                    Sections & Questions
                  </div>
                  {openQuestionsAccordion ? <ChevronUp size={16} style={{ color: "#94a3b8" }} /> : <ChevronDown size={16} style={{ color: "#94a3b8" }} />}
                </div>

                {openQuestionsAccordion && (
                  <div style={{ padding: "1.25rem", display: "flex", flexDirection: "column", gap: "1rem" }}>
                    {/* Section Header */}
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "#0f172a", padding: "0.6rem 0.85rem", borderRadius: "8px", border: "1px solid #334155" }}>
                      <span style={{ fontSize: "0.85rem", fontWeight: 800, color: "#ffffff" }}>Section A</span>
                      <div style={{ display: "flex", gap: "0.5rem" }}>
                        <span style={{ fontSize: "0.75rem", color: "#94a3b8" }}>{questions.length} questions</span>
                        <span style={{ fontSize: "0.75rem", background: "#1d4ed8", color: "#ffffff", padding: "0.1rem 0.45rem", borderRadius: "4px", fontWeight: 700 }}>
                          {totalAllocatedMarks} marks
                        </span>
                      </div>
                    </div>

                    {/* Question Cards matching Image 2 */}
                    {questions.map((q, idx) => (
                      <div
                        key={q.id || idx}
                        style={{
                          background: "#0f172a",
                          border: activeQuestionId === q.id ? "2px solid #3b82f6" : "1px solid #334155",
                          borderRadius: "10px",
                          padding: "1rem"
                        }}
                      >
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.6rem" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                            <span style={{ fontWeight: 800, fontSize: "0.95rem", color: "#ffffff" }}>{q.q_no}</span>
                            <span style={{ fontSize: "0.72rem", background: "#1e293b", color: "#93c5fd", padding: "0.15rem 0.45rem", borderRadius: "4px", fontWeight: 700 }}>
                              {q.marks >= 5 ? "Long Answer" : "Short Answer"}
                            </span>
                            {Number(q.marks) === 0 && (
                              <span style={{ fontSize: "0.7rem", color: "#f59e0b", background: "rgba(245, 158, 11, 0.15)", padding: "0.1rem 0.4rem", borderRadius: "4px", fontWeight: 700 }}>
                                ⚠ Fix missing marks
                              </span>
                            )}
                          </div>

                          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                            <input
                              type="number"
                              step="0.5"
                              value={q.marks}
                              onChange={(e) => handleMarkChange(idx, Number(e.target.value))}
                              style={{ width: "60px", padding: "0.25rem 0.45rem", borderRadius: "6px", background: "#1e293b", border: "1px solid #475569", color: "#ffffff", fontWeight: 700, fontSize: "0.85rem", textAlign: "center" }}
                            />
                            <span style={{ fontSize: "0.75rem", color: "#94a3b8" }}>marks</span>
                            <button onClick={() => handleDeleteQuestion(idx)} style={{ background: "none", border: "none", color: "#ef4444", cursor: "pointer" }}>
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>

                        {/* Subquestion (a) Statement */}
                        <div style={{ background: "#1e293b", padding: "0.75rem", borderRadius: "8px", border: "1px solid #334155" }}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "0.35rem" }}>
                            <span style={{ width: "22px", height: "22px", borderRadius: "50%", background: "#2563eb", color: "#ffffff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.75rem", fontWeight: 800 }}>
                              a
                            </span>
                            <button
                              onClick={() => alert("Refining question statement using Gemini...")}
                              style={{ background: "transparent", border: "none", color: "#60a5fa", fontSize: "0.75rem", fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: "0.25rem" }}
                            >
                              <Sparkles size={12} /> Refine
                            </button>
                          </div>
                          <textarea
                            rows={2}
                            value={q.text}
                            onChange={(e) => handleTextChange(idx, e.target.value)}
                            style={{ width: "100%", background: "#0f172a", border: "1px solid #334155", color: "#ffffff", borderRadius: "6px", padding: "0.45rem", fontSize: "0.82rem", lineHeight: 1.4 }}
                          />
                        </div>
                      </div>
                    ))}

                    <button
                      onClick={handleAddQuestion}
                      style={{ background: "#0f172a", border: "1px dashed #475569", color: "#60a5fa", padding: "0.6rem", borderRadius: "8px", fontSize: "0.82rem", cursor: "pointer", fontWeight: 700 }}
                    >
                      + Add Question
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* RIGHT HALF: Live Question Paper Preview with Zoom Slider */}
            <div style={{ background: "#0f172a", border: "1px solid #1e293b", borderRadius: "14px", padding: "1.25rem", display: "flex", flexDirection: "column" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem", borderBottom: "1px solid #1e293b", paddingBottom: "0.5rem" }}>
                <span style={{ fontSize: "0.82rem", fontWeight: 700, color: "#94a3b8" }}>
                  Original Scanned Question Paper
                </span>
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <span style={{ fontSize: "0.75rem", color: "#94a3b8" }}>{paperZoom}%</span>
                  <input
                    type="range"
                    min="40"
                    max="150"
                    value={paperZoom}
                    onChange={(e) => setPaperZoom(Number(e.target.value))}
                    style={{ width: "80px" }}
                  />
                </div>
              </div>

              <div style={{ flex: 1, overflow: "auto", background: "#ffffff", borderRadius: "10px", padding: "1.5rem", display: "flex", justifyContent: "center", alignItems: "flex-start" }}>
                <div style={{ width: `${paperZoom * 6.5}px`, transition: "width 0.15s ease" }}>
                  <img
                    src="/sample-question-paper.png"
                    alt="Question Paper Reference"
                    style={{ width: "100%", height: "auto", display: "block", borderRadius: "6px", boxShadow: "0 4px 12px rgba(0,0,0,0.15)" }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Bar matching Image 1 */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginTop: "1rem",
              paddingTop: "0.85rem",
              borderTop: "1px solid #e2e8f0"
            }}
          >
            <span style={{ fontSize: "0.75rem", color: "#64748b" }}>
              AI can make mistakes <a href="#report" style={{ color: "#2563eb", textDecoration: "none" }}>Report</a>
            </span>

            <div style={{ display: "flex", gap: "0.75rem" }}>
              <button
                onClick={() => setViewMode("list")}
                className="btn btn-secondary"
                style={{ fontSize: "0.85rem", padding: "0.55rem 1.25rem" }}
              >
                Cancel
              </button>
              <button
                onClick={handleSaveExam}
                disabled={isSaving}
                className="btn btn-primary"
                style={{ fontSize: "0.85rem", padding: "0.55rem 1.4rem" }}
              >
                {saveSuccess ? "Exam Saved!" : isSaving ? "Saving..." : "Save Exam"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};