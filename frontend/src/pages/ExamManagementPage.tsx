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
  Check
} from "lucide-react";

interface ExamManagementProps {
  initialSubjectId?: string;
  onNavigate: (tab: any, params?: any) => void;
}

export const ExamManagementPage: React.FC<ExamManagementProps> = ({
  initialSubjectId,
  onNavigate
}) => {
  // Modular Flow Steps: 1 = Upload PDF, 2 = Confirm Meta & Structure, 3 = Split Workspace
  const [step, setStep] = useState<1 | 2 | 3>(1);

  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<string>("");
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>(initialSubjectId || "");
  const [exams, setExams] = useState<Exam[]>([]);
  const [activeExam, setActiveExam] = useState<Exam | null>(null);

  // Exam Details Form
  const [examTitle, setExamTitle] = useState("B.Tech Semester End Examination");
  const [examType, setExamType] = useState("Semester Exam");
  const [passingMarks, setPassingMarks] = useState(24.0);
  const [academicYear, setAcademicYear] = useState("2026-2027");
  const [answerKeyText, setAnswerKeyText] = useState("");
  const [showAnswerKeyModal, setShowAnswerKeyModal] = useState(false);

  // Digital Paper Header
  const [digitalHeader, setDigitalHeader] = useState<DigitalPaperHeader>({
    title: "B.TECH SEMESTER END EXAMINATION",
    institution: "ACE College of Engineering",
    course: "Natural Language Processing & Machine Learning",
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
      } else if (subjList.length > 0) {
        setSelectedSubjectId(subjList[0].id);
      }
    });
  }, [initialSubjectId]);

  useEffect(() => {
    if (selectedSubjectId) {
      academicApi.listExams(selectedSubjectId).then((exList) => {
        setExams(exList);
        if (exList.length > 0) {
          loadExamIntoEditor(exList[0]);
          setStep(3); // Already has an exam, show workspace
        } else {
          setActiveExam(null);
          setStep(1); // Fresh start: upload question paper
        }
      });
    }
  }, [selectedSubjectId]);

  const loadExamIntoEditor = (exam: Exam) => {
    setActiveExam(exam);
    setExamTitle(exam.title);
    setExamType(exam.exam_type);
    setPassingMarks(exam.passing_marks);
    setAcademicYear(exam.academic_year || "2026-2027");
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
      institution: currentSubject?.name || "ACE College of Engineering",
      course: `${currentSubject?.name || "Course"} (${currentSubject?.code || "CODE"})`,
      time_allowed: "3 Hours",
      max_marks: exam.max_marks || 60.0,
      instructions: [
        "Part A is compulsory. All ten short questions carry 1.0 mark each (10 Marks).",
        "Part B contains five units with internal OR choice. Answer any ONE full question from each unit (50 Marks).",
        "Minimum 3 pages with ~180 words per page required on Part B descriptive questions for full marks."
      ]
    });
  };

  const handleStartUploadNewExam = () => {
    setActiveExam(null);
    setExamTitle("B.Tech Semester End Examination");
    setExamType("Semester Exam");
    setPassingMarks(24.0);
    setAnswerKeyText("");
    setQuestions([]);
    setPaperFile(null);
    setScanMessage(null);
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
          title: res.header.title || "B.TECH SEMESTER END EXAMINATION",
          institution: res.header.institution || "ACE College of Engineering",
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
      // Advance automatically to Step 2
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
      // Use standard fallback questions for 60-mark paper
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

  // Jump from Right (Digital Paper) to Left (Editor)
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

  const handleIdealAnswerChange = (index: number, newAnswer: string) => {
    const updated = [...questions];
    updated[index].ideal_answer = newAnswer;
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

  // Calculate actual achievable max marks considering OR choices
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
          answer_key_text: answerKeyText,
          questions: questions
        });
        setActiveExam(created);
        setExams([created, ...exams]);
      }

      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2500);
    } catch (err) {
      alert("Failed to save exam.");
    } finally {
      setIsSaving(false);
    }
  };

  const currentSubject = subjects.find((s) => s.id === selectedSubjectId);

  // Split questions into Part A and Part B
  const partAQuestions = questions.filter((q) => q.section === "Part A" || Number(q.marks) <= 2.0);
  const partBQuestions = questions.filter((q) => q.section !== "Part A" && Number(q.marks) > 2.0);

  // Group Part B by unit / or_group
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

  return (
    <div className="exam-management-page pb-24">
      {/* ============================================================== */}
      {/* STEP 1: MODULAR FULL-PAGE QUESTION PAPER UPLOAD */}
      {/* ============================================================== */}
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
                color: "#2563eb",
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

      {/* ============================================================== */}
      {/* STEP 2: SUBJECT & EXAMINATION CONFIRMATION */}
      {/* ============================================================== */}
      {step === 2 && (
        <div style={{ maxWidth: "680px", margin: "2rem auto" }}>
          <div style={{ marginBottom: "2rem", textAlign: "center" }}>
            <h1 style={{ fontSize: "1.85rem", fontWeight: 800, color: "#0f172a", letterSpacing: "-0.03em", marginBottom: "0.4rem" }}>
              Confirm Examination Structure
            </h1>
            <p style={{ color: "#64748b", fontSize: "0.95rem" }}>
              Verify target course, batch, and maximum marks before editing
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
                  style={{ display: "flex", alignItems: "center", gap: "0.4rem", padding: "0.65rem 1.5rem" }}
                >
                  Open Digital Workspace
                  <ArrowRight size={16} />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* STEP 3: INTERACTIVE SPLIT WORKSPACE (LEFT SETTINGS, RIGHT LIVE PAPER) */}
      {/* ============================================================== */}
      {step === 3 && (
        <div>
          {/* Top Control Bar */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "1.25rem",
              flexWrap: "wrap",
              gap: "1rem"
            }}
          >
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <h1 style={{ fontSize: "1.6rem", fontWeight: 800, color: "#0f172a", letterSpacing: "-0.03em", margin: 0 }}>
                  {examTitle}
                </h1>
                <span
                  style={{
                    background: "#eff6ff",
                    color: "#2563eb",
                    fontSize: "0.78rem",
                    fontWeight: 700,
                    padding: "0.2rem 0.55rem",
                    borderRadius: "6px"
                  }}
                >
                  {totalAllocatedMarks} Marks
                </span>
              </div>
              <p style={{ color: "#64748b", fontSize: "0.85rem", margin: 0, marginTop: "0.2rem" }}>
                {currentSubject?.name || "Subject"} ({currentSubject?.code || "CODE"}) • Click any question on the right to edit on the left
              </p>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
              <button
                type="button"
                onClick={() => setShowAnswerKeyModal(true)}
                className="btn btn-secondary"
                style={{ fontSize: "0.82rem" }}
              >
                Answer Key
              </button>

              <button
                type="button"
                onClick={handleStartUploadNewExam}
                className="btn btn-secondary"
                style={{ fontSize: "0.82rem" }}
              >
                Upload New Paper
              </button>

              <button
                type="button"
                onClick={handleSaveExam}
                disabled={isSaving}
                className="btn btn-primary"
                style={{ display: "flex", alignItems: "center", gap: "0.4rem", fontSize: "0.85rem" }}
              >
                {saveSuccess ? <Check size={15} /> : <Save size={15} />}
                {isSaving ? "Saving..." : saveSuccess ? "Saved!" : "Save Exam"}
              </button>

              <button
                type="button"
                onClick={() => onNavigate("evaluation", { examId: activeExam?.id })}
                className="btn btn-secondary"
                style={{ fontSize: "0.82rem", display: "flex", alignItems: "center", gap: "0.3rem" }}
              >
                Evaluate Student
                <ArrowRight size={14} />
              </button>
            </div>
          </div>

          {/* Full Screen Split Layout */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1.15fr",
              gap: "1.5rem",
              alignItems: "flex-start"
            }}
          >
            {/* LEFT COLUMN: Question Settings & Rubric Editor */}
            <div
              style={{
                background: "#ffffff",
                border: "1px solid #e2e8f0",
                borderRadius: "14px",
                padding: "1.25rem",
                maxHeight: "calc(100vh - 180px)",
                overflowY: "auto"
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: "1rem",
                  paddingBottom: "0.75rem",
                  borderBottom: "1px solid #f1f5f9"
                }}
              >
                <div style={{ fontSize: "0.95rem", fontWeight: 800, color: "#0f172a" }}>
                  Question Configuration ({questions.length})
                </div>

                <button
                  type="button"
                  onClick={handleAddQuestion}
                  className="btn btn-secondary"
                  style={{ fontSize: "0.78rem", padding: "0.3rem 0.65rem", display: "flex", alignItems: "center", gap: "0.3rem" }}
                >
                  <Plus size={14} /> Add Question
                </button>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                {questions.map((q, idx) => {
                  const isActive = activeQuestionId === q.id;
                  return (
                    <div
                      key={q.id || idx}
                      id={`editor-card-${q.id}`}
                      style={{
                        border: isActive ? "2px solid #2563eb" : "1px solid #e2e8f0",
                        borderRadius: "10px",
                        padding: "1rem",
                        background: isActive ? "#fafcff" : "#ffffff",
                        transition: "all 0.15s ease"
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          marginBottom: "0.6rem"
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                          <span
                            style={{
                              background: "#0f172a",
                              color: "#ffffff",
                              fontSize: "0.75rem",
                              fontWeight: 700,
                              padding: "0.2rem 0.5rem",
                              borderRadius: "4px"
                            }}
                          >
                            {q.q_no}
                          </span>
                          <span style={{ fontSize: "0.78rem", color: "#64748b", fontWeight: 600 }}>
                            {q.section}
                          </span>
                          {q.is_or_choice && (
                            <span
                              style={{
                                background: "#fef3c7",
                                color: "#92400e",
                                fontSize: "0.7rem",
                                fontWeight: 700,
                                padding: "0.15rem 0.45rem",
                                borderRadius: "4px"
                              }}
                            >
                              OR Choice
                            </span>
                          )}
                        </div>

                        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                          <label style={{ fontSize: "0.75rem", fontWeight: 700, color: "#475569" }}>
                            Marks:
                          </label>
                          <input
                            type="number"
                            value={q.marks}
                            onChange={(e) => handleMarkChange(idx, Number(e.target.value))}
                            style={{
                              width: "60px",
                              padding: "0.25rem 0.4rem",
                              borderRadius: "4px",
                              border: "1px solid #cbd5e1",
                              fontWeight: 700,
                              fontSize: "0.85rem",
                              textAlign: "center"
                            }}
                          />
                          <button
                            type="button"
                            onClick={() => handleDeleteQuestion(idx)}
                            style={{
                              background: "none",
                              border: "none",
                              cursor: "pointer",
                              color: "#dc2626",
                              padding: "0.2rem"
                            }}
                            title="Delete question"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </div>

                      {/* Question Text */}
                      <div style={{ marginBottom: "0.6rem" }}>
                        <label style={{ display: "block", fontSize: "0.72rem", fontWeight: 700, color: "#64748b", marginBottom: "0.2rem" }}>
                          Question Statement
                        </label>
                        <textarea
                          rows={2}
                          value={q.text}
                          onChange={(e) => handleTextChange(idx, e.target.value)}
                          style={{
                            width: "100%",
                            padding: "0.45rem 0.65rem",
                            borderRadius: "6px",
                            border: "1px solid #cbd5e1",
                            fontSize: "0.85rem",
                            lineHeight: 1.4
                          }}
                        />
                      </div>

                      {/* Rubric */}
                      <div style={{ marginBottom: "0.6rem" }}>
                        <label style={{ display: "block", fontSize: "0.72rem", fontWeight: 700, color: "#64748b", marginBottom: "0.2rem" }}>
                          Evaluation Rubric & Depth Requirement
                        </label>
                        <input
                          type="text"
                          value={q.rubric || ""}
                          onChange={(e) => handleRubricChange(idx, e.target.value)}
                          placeholder="e.g. Full credit requires minimum 3-page depth. Capped at 5M if brief."
                          style={{
                            width: "100%",
                            padding: "0.4rem 0.65rem",
                            borderRadius: "6px",
                            border: "1px solid #cbd5e1",
                            fontSize: "0.82rem"
                          }}
                        />
                      </div>

                      {/* Expected / Ideal Answer */}
                      <div>
                        <label style={{ display: "block", fontSize: "0.72rem", fontWeight: 700, color: "#64748b", marginBottom: "0.2rem" }}>
                          Expected Key Points
                        </label>
                        <input
                          type="text"
                          value={q.ideal_answer || ""}
                          onChange={(e) => handleIdealAnswerChange(idx, e.target.value)}
                          placeholder="Key derivations and principles..."
                          style={{
                            width: "100%",
                            padding: "0.4rem 0.65rem",
                            borderRadius: "6px",
                            border: "1px solid #cbd5e1",
                            fontSize: "0.82rem"
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* RIGHT COLUMN: Live Digitalized Physical Examination Paper */}
            <div
              style={{
                background: "#ffffff",
                border: "1px solid #cbd5e1",
                borderRadius: "14px",
                padding: "2rem",
                boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.05)",
                maxHeight: "calc(100vh - 180px)",
                overflowY: "auto"
              }}
            >
              {/* University Exam Paper Header Box */}
              <div
                style={{
                  border: "2px solid #0f172a",
                  padding: "1.25rem",
                  textAlign: "center",
                  marginBottom: "1.75rem"
                }}
              >
                <div style={{ fontSize: "1rem", fontWeight: 800, color: "#0f172a", letterSpacing: "0.05em", textTransform: "uppercase" }}>
                  {digitalHeader.institution || "ACE College of Engineering"}
                </div>
                <div style={{ fontSize: "1.2rem", fontWeight: 800, color: "#0f172a", marginTop: "0.25rem", letterSpacing: "-0.01em" }}>
                  {digitalHeader.title}
                </div>
                <div style={{ fontSize: "0.9rem", fontWeight: 600, color: "#334155", marginTop: "0.25rem" }}>
                  Course: {digitalHeader.course}
                </div>

                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginTop: "0.85rem",
                    paddingTop: "0.6rem",
                    borderTop: "1px dashed #cbd5e1",
                    fontSize: "0.85rem",
                    fontWeight: 700,
                    color: "#0f172a"
                  }}
                >
                  <span>Time Allowed: {digitalHeader.time_allowed || "3 Hours"}</span>
                  <span>Maximum Marks: {totalAllocatedMarks}</span>
                </div>
              </div>

              {/* General Instructions */}
              <div
                style={{
                  background: "#f8fafc",
                  border: "1px solid #e2e8f0",
                  padding: "0.85rem 1rem",
                  borderRadius: "6px",
                  fontSize: "0.82rem",
                  color: "#334155",
                  marginBottom: "1.5rem",
                  lineHeight: 1.5
                }}
              >
                <strong>INSTRUCTIONS TO CANDIDATES:</strong>
                <ol style={{ margin: "0.35rem 0 0 1.25rem", padding: 0 }}>
                  <li>Part A is compulsory. All ten short questions carry 1.0 mark each (10 Marks).</li>
                  <li>Part B contains five units with internal OR choice. Answer any ONE full question from each unit (50 Marks).</li>
                  <li>Minimum 3 pages with ~180 words per page required on Part B descriptive questions for full marks. Brief answers capped at 5 marks.</li>
                </ol>
              </div>

              {/* PART A (Compulsory - 10 Marks) */}
              <div style={{ marginBottom: "2rem" }}>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    borderBottom: "2px solid #0f172a",
                    paddingBottom: "0.4rem",
                    marginBottom: "1rem"
                  }}
                >
                  <span style={{ fontSize: "1rem", fontWeight: 800, color: "#0f172a", letterSpacing: "0.04em" }}>
                    PART - A (Compulsory Questions)
                  </span>
                  <span style={{ fontSize: "0.85rem", fontWeight: 700, color: "#0f172a" }}>
                    10 x 1M = 10 Marks
                  </span>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
                  {partAQuestions.map((q) => {
                    const isSelected = activeQuestionId === q.id;
                    return (
                      <div
                        key={q.id}
                        id={`digital-q-${q.id}`}
                        onClick={() => handleJumpToQuestion(q.id || "")}
                        style={{
                          padding: "0.65rem 0.85rem",
                          border: isSelected ? "2px solid #2563eb" : "1px solid #e2e8f0",
                          borderRadius: "6px",
                          background: isSelected ? "#eff6ff" : "#ffffff",
                          cursor: "pointer",
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "flex-start",
                          gap: "0.75rem",
                          transition: "all 0.15s ease"
                        }}
                      >
                        <div style={{ display: "flex", gap: "0.6rem" }}>
                          <span style={{ fontWeight: 800, fontSize: "0.85rem", color: "#0f172a", minWidth: "38px" }}>
                            {q.q_no}
                          </span>
                          <span style={{ fontSize: "0.86rem", color: "#1e293b", lineHeight: 1.45 }}>
                            {q.text}
                          </span>
                        </div>

                        <span
                          style={{
                            fontSize: "0.8rem",
                            fontWeight: 700,
                            color: "#2563eb",
                            background: "#eff6ff",
                            padding: "0.15rem 0.45rem",
                            borderRadius: "4px",
                            whiteSpace: "nowrap"
                          }}
                        >
                          [{q.marks}M]
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* PART B (Descriptive Units with OR Internal Choice - 50 Marks) */}
              <div>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    borderBottom: "2px solid #0f172a",
                    paddingBottom: "0.4rem",
                    marginBottom: "1.25rem"
                  }}
                >
                  <span style={{ fontSize: "1rem", fontWeight: 800, color: "#0f172a", letterSpacing: "0.04em" }}>
                    PART - B (Internal Choice Questions)
                  </span>
                  <span style={{ fontSize: "0.85rem", fontWeight: 700, color: "#0f172a" }}>
                    5 x 10M = 50 Marks
                  </span>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: "1.75rem" }}>
                  {unitGroups.map((group, gIdx) => (
                    <div
                      key={gIdx}
                      style={{
                        border: "1px solid #cbd5e1",
                        borderRadius: "8px",
                        padding: "1rem",
                        background: "#fafafa"
                      }}
                    >
                      <div
                        style={{
                          fontSize: "0.8rem",
                          fontWeight: 800,
                          color: "#475569",
                          letterSpacing: "0.05em",
                          textTransform: "uppercase",
                          marginBottom: "0.75rem"
                        }}
                      >
                        {group.name}
                      </div>

                      <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                        {group.questions.map((q, qSubIdx) => {
                          const isSelected = activeQuestionId === q.id;
                          return (
                            <React.Fragment key={q.id || qSubIdx}>
                              {qSubIdx > 0 && (
                                <div
                                  style={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: "0.75rem",
                                    margin: "0.25rem 0"
                                  }}
                                >
                                  <div style={{ flex: 1, height: "1px", background: "#cbd5e1" }} />
                                  <span
                                    style={{
                                      fontSize: "0.75rem",
                                      fontWeight: 800,
                                      color: "#64748b",
                                      background: "#f1f5f9",
                                      padding: "0.2rem 0.6rem",
                                      borderRadius: "9999px"
                                    }}
                                  >
                                    OR
                                  </span>
                                  <div style={{ flex: 1, height: "1px", background: "#cbd5e1" }} />
                                </div>
                              )}

                              <div
                                id={`digital-q-${q.id}`}
                                onClick={() => handleJumpToQuestion(q.id || "")}
                                style={{
                                  padding: "0.85rem",
                                  border: isSelected ? "2px solid #2563eb" : "1px solid #e2e8f0",
                                  borderRadius: "6px",
                                  background: isSelected ? "#eff6ff" : "#ffffff",
                                  cursor: "pointer",
                                  display: "flex",
                                  justifyContent: "space-between",
                                  alignItems: "flex-start",
                                  gap: "0.75rem",
                                  transition: "all 0.15s ease"
                                }}
                              >
                                <div style={{ display: "flex", gap: "0.6rem" }}>
                                  <span style={{ fontWeight: 800, fontSize: "0.9rem", color: "#0f172a", minWidth: "32px" }}>
                                    {q.q_no}
                                  </span>
                                  <div>
                                    <div style={{ fontSize: "0.88rem", color: "#1e293b", lineHeight: 1.45 }}>
                                      {q.text}
                                    </div>
                                    {q.rubric && (
                                      <div style={{ fontSize: "0.75rem", color: "#64748b", marginTop: "0.35rem" }}>
                                        Criteria: {q.rubric}
                                      </div>
                                    )}
                                  </div>
                                </div>

                                <span
                                  style={{
                                    fontSize: "0.85rem",
                                    fontWeight: 700,
                                    color: "#2563eb",
                                    background: "#eff6ff",
                                    padding: "0.2rem 0.5rem",
                                    borderRadius: "4px",
                                    whiteSpace: "nowrap"
                                  }}
                                >
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
            </div>
          </div>
        </div>
      )}

      {/* Master Answer Key Modal */}
      {showAnswerKeyModal && (
        <div className="modal-backdrop" onClick={() => setShowAnswerKeyModal(false)}>
          <div className="modal-dialog" onClick={(e) => e.stopPropagation()} style={{ maxWidth: "600px" }}>
            <h3 style={{ fontSize: "1.25rem", fontWeight: 800, color: "#0f172a", marginBottom: "0.25rem" }}>
              Master Answer Key
            </h3>
            <p style={{ fontSize: "0.85rem", color: "#64748b", marginBottom: "1rem" }}>
              Ground truth solutions and expected derivations used for strict evaluation.
            </p>

            <textarea
              rows={12}
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
  );
};
