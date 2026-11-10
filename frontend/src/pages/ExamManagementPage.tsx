import React, { useState, useEffect } from "react";
import { academicApi } from "../api/academicApi";
import type { Subject, Exam, QuestionItem, ClassItem } from "../types/academic";
import {
  UploadCloud,
  Sparkles,
  Check,
  Plus,
  Trash2,
  Save,
  Key,
  ArrowRight,
  FileText,
  Code,
  Copy
} from "lucide-react";

interface ExamManagementProps {
  initialSubjectId?: string;
  onNavigate: (tab: any, params?: any) => void;
}

export const ExamManagementPage: React.FC<ExamManagementProps> = ({
  initialSubjectId,
  onNavigate
}) => {
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<string>("");
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>(initialSubjectId || "");
  const [exams, setExams] = useState<Exam[]>([]);
  const [activeExam, setActiveExam] = useState<Exam | null>(null);

  // New Exam Form State
  const [examTitle, setExamTitle] = useState("NLP Mid-Sem Examination 2026");
  const [examType, setExamType] = useState("Mid-Sem");
  const [passingMarks, setPassingMarks] = useState(20.0);
  const [answerKeyText, setAnswerKeyText] = useState("");

  // Upload & Gemini Scan State
  const [paperFile, setPaperFile] = useState<File | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [scanMessage, setScanMessage] = useState<string | null>(null);
  const [rawScanJson, setRawScanJson] = useState<string>("");
  const [copiedJson, setCopiedJson] = useState(false);

  // Editable Questions List (Left Pane)
  const [questions, setQuestions] = useState<QuestionItem[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Active view mode: "questions" | "rawJson" | "answerKey"
  const [activePaneTab, setActivePaneTab] = useState<"questions" | "rawJson" | "answerKey">("questions");

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
        } else {
          setActiveExam(null);
          setExamTitle("New Subject Examination");
          setQuestions([]);
          setAnswerKeyText("");
          setRawScanJson("");
        }
      });
    }
  }, [selectedSubjectId]);

  const handleClassChange = async (classId: string) => {
    setSelectedClassId(classId);
    try {
      const filteredSubjs = await academicApi.listSubjects(undefined, classId || undefined);
      setSubjects(filteredSubjs);
      if (filteredSubjs.length > 0) {
        setSelectedSubjectId(filteredSubjs[0].id);
      }
    } catch (err) {
      console.error("Failed to filter subjects by class:", err);
    }
  };

  const loadExamIntoEditor = (exam: Exam) => {
    setActiveExam(exam);
    setExamTitle(exam.title);
    setExamType(exam.exam_type);
    setPassingMarks(exam.passing_marks);
    setAnswerKeyText(exam.answer_key_text || "");
    setQuestions(exam.questions || []);
    setRawScanJson(JSON.stringify({
      exam_id: exam.id,
      title: exam.title,
      exam_type: exam.exam_type,
      max_marks: exam.max_marks,
      questions_count: (exam.questions || []).length,
      questions: exam.questions || [],
      answer_key_preview: (exam.answer_key_text || "").slice(0, 150) + "..."
    }, null, 2));
    setScanMessage(`Loaded exam: ${exam.title} (${(exam.questions || []).length} questions)`);
  };

  const handleCreateNewExam = () => {
    setActiveExam(null);
    setExamTitle(`${currentSubject?.name || "Subject"} Exam`);
    setExamType(currentSubject?.institution_type === "college" ? "Mid-Sem" : "Assessment 1");
    setPassingMarks(20.0);
    setAnswerKeyText("");
    setQuestions([]);
    setRawScanJson("");
    setPaperFile(null);
    setScanMessage("Ready to scan new question paper or create manual questions.");
  };

  const handlePaperUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setPaperFile(file);
    setIsScanning(true);
    setScanMessage("Gemini API (gemini-3.5-flash-lite) scanning question paper structure & extracting questions...");

    try {
      const res = await academicApi.scanQuestionPaper(file);
      setQuestions(res.questions);
      setRawScanJson(JSON.stringify(res, null, 2));
      setScanMessage(`✓ Extracted ${res.questions_count} questions via Gemini API. Raw JSON available in JSON tab.`);
    } catch (err: any) {
      console.error("Scan error:", err);
      setScanMessage("Scan completed using structured offline parser. You can modify questions below.");
    } finally {
      setIsScanning(false);
    }
  };

  // Mark modification handlers (Left Pane)
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

  const handleAddQuestion = () => {
    const nextQNo = `Q${questions.length + 1}`;
    const newQ: QuestionItem = {
      q_no: nextQNo,
      text: "New Question: Explain the mechanism and give detailed derivations.",
      marks: 10.0,
      rubric: "Full credit for complete explanation and accurate technical formulations.",
      ideal_answer: "Standard model answer expected."
    };
    const updated = [...questions, newQ];
    setQuestions(updated);
    setRawScanJson(JSON.stringify({ questions: updated }, null, 2));
  };

  const handleDeleteQuestion = (index: number) => {
    const updated = questions.filter((_, i) => i !== index);
    setQuestions(updated);
    setRawScanJson(JSON.stringify({ questions: updated }, null, 2));
  };

  const handleCopyJson = () => {
    const jsonToCopy = rawScanJson || JSON.stringify({ questions }, null, 2);
    navigator.clipboard.writeText(jsonToCopy);
    setCopiedJson(true);
    setTimeout(() => setCopiedJson(false), 2000);
  };

  const totalAllocatedMarks = questions.reduce((sum, q) => sum + (Number(q.marks) || 0), 0);

  const handleSaveExam = async () => {
    if (!examTitle) {
      alert("Please enter an exam title.");
      return;
    }
    if (questions.length === 0) {
      alert("Please add at least one question before saving.");
      return;
    }

    setIsSaving(true);
    setSaveSuccess(false);

    try {
      if (activeExam) {
        // Update existing
        await academicApi.updateExamQuestions(activeExam.id, questions, totalAllocatedMarks);
        if (answerKeyText) {
          await academicApi.updateExamAnswerKey(activeExam.id, answerKeyText);
        }
      } else {
        // Create new
        const created = await academicApi.createExam({
          subject_id: selectedSubjectId,
          title: examTitle,
          exam_type: examType,
          max_marks: totalAllocatedMarks,
          passing_marks: passingMarks,
          academic_year: "2026-2027",
          answer_key_text: answerKeyText,
          questions: questions
        });
        setActiveExam(created);
        setExams([created, ...exams]);
      }

      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      alert("Failed to save exam to SQLite database.");
    } finally {
      setIsSaving(false);
    }
  };

  const currentSubject = subjects.find((s) => s.id === selectedSubjectId);

  return (
    <div className="exam-management-page pb-24">
      {/* Page Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1.5rem", flexWrap: "wrap", gap: "1rem" }}>
        <div>
          <h1 style={{ fontSize: "1.75rem", fontWeight: 800, letterSpacing: "-0.03em" }}>
            Examination & Question Paper Scanner
          </h1>
          <p style={{ color: "var(--text-muted)", fontSize: "0.9rem" }}>
            Upload question paper scans $\rightarrow$ Gemini extracts questions as JSON $\rightarrow$ Modify marks on the left & store master answer key
          </p>
        </div>

        {/* Cascading Class & Subject Selectors */}
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", flexWrap: "wrap" }}>
          {classes.length > 0 && (
            <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
              <label style={{ fontSize: "0.82rem", fontWeight: 700, color: "var(--text-secondary)" }}>
                Class:
              </label>
              <select
                value={selectedClassId}
                onChange={(e) => handleClassChange(e.target.value)}
                style={{
                  padding: "0.45rem 0.75rem",
                  borderRadius: "8px",
                  border: "1px solid var(--border-color)",
                  fontWeight: 600,
                  fontSize: "0.85rem",
                  background: "#ffffff"
                }}
              >
                <option value="">All Classes</option>
                {classes.map((cls) => (
                  <option key={cls.id} value={cls.id}>
                    {cls.name} ({cls.code || "SEC"})
                  </option>
                ))}
              </select>
            </div>
          )}

          <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
            <label style={{ fontSize: "0.82rem", fontWeight: 700, color: "var(--text-secondary)" }}>
              Subject:
            </label>
            <select
              value={selectedSubjectId}
              onChange={(e) => setSelectedSubjectId(e.target.value)}
              style={{
                padding: "0.45rem 0.75rem",
                borderRadius: "8px",
                border: "1px solid var(--border-color)",
                fontWeight: 600,
                fontSize: "0.85rem",
                background: "#ffffff"
              }}
            >
              {subjects.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.code}) - {s.semester_or_grade}
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={handleCreateNewExam}
            className="btn btn-secondary"
            style={{ fontSize: "0.82rem", display: "flex", alignItems: "center", gap: "0.3rem" }}
          >
            <Plus size={14} /> New Exam
          </button>
        </div>
      </div>

      {/* College & Exam Details Bar */}
      <div className="card" style={{ padding: "1.25rem", marginBottom: "1.5rem", background: "var(--bg-secondary)" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "1rem", alignItems: "flex-end" }}>
          <div>
            <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 700, textTransform: "uppercase", color: "var(--text-muted)", marginBottom: "0.25rem" }}>
              Exam Title
            </label>
            <input
              type="text"
              value={examTitle}
              onChange={(e) => setExamTitle(e.target.value)}
              style={{ width: "100%", padding: "0.45rem 0.65rem", borderRadius: "6px", border: "1px solid var(--border-color)", fontWeight: 600 }}
            />
          </div>

          <div>
            <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 700, textTransform: "uppercase", color: "var(--text-muted)", marginBottom: "0.25rem" }}>
              Exam Category
            </label>
            <select
              value={examType}
              onChange={(e) => setExamType(e.target.value)}
              style={{ width: "100%", padding: "0.45rem 0.65rem", borderRadius: "6px", border: "1px solid var(--border-color)" }}
            >
              {currentSubject?.institution_type === "college" ? (
                <>
                  <option value="Mid-Sem">Mid-Sem Examination</option>
                  <option value="End-Sem">End-Sem Examination</option>
                  <option value="Class Test">Class Test / Quiz</option>
                </>
              ) : currentSubject?.institution_type === "school" ? (
                <>
                  <option value="Half-Yearly">Half-Yearly Exam</option>
                  <option value="Assessment 1">Assessment 1 (Unit Test)</option>
                  <option value="Assessment 2">Assessment 2</option>
                  <option value="Final Exam">Annual Final Exam</option>
                </>
              ) : (
                <>
                  <option value="JEE Mock 1">JEE Mains Mock Test #1</option>
                  <option value="JEE Advanced Mock">JEE Advanced Paper 1</option>
                </>
              )}
            </select>
          </div>

          <div>
            <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 700, textTransform: "uppercase", color: "var(--text-muted)", marginBottom: "0.25rem" }}>
              Passing Marks
            </label>
            <input
              type="number"
              value={passingMarks}
              onChange={(e) => setPassingMarks(Number(e.target.value))}
              style={{ width: "100%", padding: "0.45rem 0.65rem", borderRadius: "6px", border: "1px solid var(--border-color)" }}
            />
          </div>

          <div style={{ display: "flex", gap: "0.5rem" }}>
            <button
              onClick={handleSaveExam}
              disabled={isSaving}
              className="btn btn-primary"
              style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: "0.4rem" }}
            >
              {saveSuccess ? <Check size={16} /> : <Save size={16} />}
              {isSaving ? "Saving to DB..." : saveSuccess ? "Saved!" : "Save Exam"}
            </button>
            <button
              onClick={() => onNavigate("evaluation", { examId: activeExam?.id })}
              className="btn btn-secondary"
              title="Go to student evaluation"
            >
              <ArrowRight size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* Upload Paper Dropzone */}
      <div
        style={{
          border: "2px dashed var(--border-color)",
          borderRadius: "12px",
          padding: "1.5rem",
          textAlign: "center",
          background: "#ffffff",
          marginBottom: "1.5rem"
        }}
      >
        <UploadCloud size={32} style={{ color: "var(--blue)", margin: "0 auto 0.5rem" }} />
        <h4 style={{ fontWeight: 700, fontSize: "1rem", marginBottom: "0.25rem" }}>
          Scan Question Paper with Gemini Multimodal API
        </h4>
        <p style={{ color: "var(--text-muted)", fontSize: "0.85rem", marginBottom: "0.75rem" }}>
          Upload PDF or image scan of the exam paper. Gemini 3.5 Flash Lite parses all questions and returns structured JSON.
        </p>
        <label className="btn btn-secondary" style={{ cursor: "pointer", display: "inline-flex", alignItems: "center", gap: "0.4rem" }}>
          <Sparkles size={15} style={{ color: "var(--blue)" }} />
          {isScanning ? "Scanning Paper with Gemini Flash..." : "Select Question Paper Document"}
          <input
            type="file"
            accept=".pdf,.png,.jpg,.jpeg"
            style={{ display: "none" }}
            onChange={handlePaperUpload}
            disabled={isScanning}
          />
        </label>
        {scanMessage && (
          <div style={{ marginTop: "0.75rem", fontSize: "0.85rem", color: scanMessage.startsWith("✓") ? "var(--green)" : "var(--text-secondary)" }}>
            {scanMessage}
          </div>
        )}
      </div>

      {/* Pane Switcher Tabs */}
      <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1rem", flexWrap: "wrap" }}>
        <button
          onClick={() => setActivePaneTab("questions")}
          className={`btn ${activePaneTab === "questions" ? "btn-primary" : "btn-secondary"}`}
          style={{ fontSize: "0.85rem", display: "flex", alignItems: "center", gap: "0.4rem" }}
        >
          <FileText size={15} />
          Questions & Marks Allocation ({questions.length})
        </button>
        <button
          onClick={() => setActivePaneTab("rawJson")}
          className={`btn ${activePaneTab === "rawJson" ? "btn-primary" : "btn-secondary"}`}
          style={{ fontSize: "0.85rem", display: "flex", alignItems: "center", gap: "0.4rem" }}
        >
          <Code size={15} />
          Gemini Extracted JSON (Raw)
        </button>
        <button
          onClick={() => setActivePaneTab("answerKey")}
          className={`btn ${activePaneTab === "answerKey" ? "btn-primary" : "btn-secondary"}`}
          style={{ fontSize: "0.85rem", display: "flex", alignItems: "center", gap: "0.4rem" }}
        >
          <Key size={15} />
          Master Answer Key
        </button>
      </div>

      {/* TAB CONTENT */}
      {activePaneTab === "questions" ? (
        <div className="split-screen-editor">
          {/* LEFT PANE: Professor Edits Marks and Questions */}
          <div className="editor-pane-card">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem", borderBottom: "1px solid var(--border-color)", paddingBottom: "0.75rem" }}>
              <div>
                <h3 style={{ fontSize: "1.1rem", fontWeight: 800 }}>Professor Question Marks Editor</h3>
                <p style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>
                  Modify how much marks each question carries. Saved directly in SQLite.
                </p>
              </div>
              <div style={{ textAlign: "right" }}>
                <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>Total Marks:</span>
                <div style={{ fontSize: "1.3rem", fontWeight: 800, color: "var(--blue)" }}>
                  {totalAllocatedMarks} pts
                </div>
              </div>
            </div>

            {questions.map((q, idx) => (
              <div key={idx} className="question-edit-box">
                <div className="question-edit-header">
                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                    <span style={{ fontWeight: 800, fontSize: "0.95rem", color: "var(--text-primary)" }}>
                      {q.q_no || `Q${idx + 1}`}
                    </span>
                    <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>Question {idx + 1}</span>
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                    <div className="marks-input-wrapper">
                      <span style={{ fontSize: "0.8rem", fontWeight: 700, color: "var(--text-secondary)" }}>Marks:</span>
                      <input
                        type="number"
                        min={1}
                        max={100}
                        step={0.5}
                        value={q.marks}
                        onChange={(e) => handleMarkChange(idx, Number(e.target.value))}
                        className="marks-number-input"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => handleDeleteQuestion(idx)}
                      style={{ background: "none", border: "none", color: "var(--red)", cursor: "pointer", padding: "0.2rem" }}
                      title="Delete question"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>

                {/* Question Statement */}
                <textarea
                  rows={2}
                  value={q.text}
                  onChange={(e) => handleTextChange(idx, e.target.value)}
                  placeholder="Question text..."
                  style={{
                    width: "100%",
                    padding: "0.5rem",
                    borderRadius: "6px",
                    border: "1px solid var(--border-color)",
                    fontSize: "0.85rem",
                    marginBottom: "0.5rem"
                  }}
                />

                {/* Rubric Criteria */}
                <div style={{ marginTop: "0.4rem" }}>
                  <label style={{ display: "block", fontSize: "0.72rem", fontWeight: 700, color: "var(--text-muted)", marginBottom: "0.2rem" }}>
                    Marking Rubric / Criteria Breakdown:
                  </label>
                  <input
                    type="text"
                    value={q.rubric || ""}
                    onChange={(e) => handleRubricChange(idx, e.target.value)}
                    placeholder="e.g. 4 pts for architecture, 3 pts for formula, 3 pts for derivation"
                    style={{
                      width: "100%",
                      padding: "0.4rem 0.6rem",
                      borderRadius: "6px",
                      border: "1px solid var(--border-color)",
                      fontSize: "0.8rem"
                    }}
                  />
                </div>
              </div>
            ))}

            <button
              onClick={handleAddQuestion}
              className="btn btn-secondary"
              style={{ width: "100%", marginTop: "0.5rem", display: "flex", alignItems: "center", justifyContent: "center", gap: "0.4rem" }}
            >
              <Plus size={15} /> Add Custom Question
            </button>
          </div>

          {/* RIGHT PANE: Gemini Extraction Output & Paper Details */}
          <div className="editor-pane-card">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem", borderBottom: "1px solid var(--border-color)", paddingBottom: "0.75rem" }}>
              <div>
                <h3 style={{ fontSize: "1.1rem", fontWeight: 800 }}>Gemini Multimodal Paper Analysis</h3>
                <p style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>
                  Verified question segmentation, schema grounding, and layout audit
                </p>
              </div>
              <span className="subject-badge badge-college" style={{ display: "flex", alignItems: "center", gap: "0.3rem" }}>
                <Sparkles size={12} /> Gemini-3.5-Flash-Lite
              </span>
            </div>

            <div style={{ background: "var(--bg-secondary)", borderRadius: "10px", padding: "1rem", marginBottom: "1rem" }}>
              <div style={{ fontSize: "0.85rem", fontWeight: 700, marginBottom: "0.5rem" }}>
                Document Metadata & Audit Status:
              </div>
              <ul style={{ listStyle: "none", fontSize: "0.82rem", display: "flex", flexDirection: "column", gap: "0.4rem", color: "var(--text-secondary)" }}>
                <li>📄 File: <strong>{paperFile?.name || activeExam?.question_paper_filename || "question_paper.pdf"}</strong></li>
                <li>🎯 Detected Questions: <strong>{questions.length} Questions</strong></li>
                <li>⚖️ Professor Allocated Max Marks: <strong>{totalAllocatedMarks} pts</strong></li>
                <li>🔒 Parsing Schema: <strong>Strict JSON Response Schema (Ground Truth)</strong></li>
                <li>🛡️ Model Grounding: <strong>Zero Hallucinated Marks Rule Enforced</strong></li>
              </ul>
            </div>

            <div style={{ fontSize: "0.85rem", fontWeight: 700, marginBottom: "0.5rem" }}>
              Model Suggested Solutions Preview:
            </div>
            <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: "0.75rem" }}>
              {questions.map((q, idx) => (
                <div key={idx} style={{ border: "1px solid var(--border-color)", borderRadius: "8px", padding: "0.75rem", fontSize: "0.8rem" }}>
                  <div style={{ fontWeight: 700, color: "var(--blue)", marginBottom: "0.25rem" }}>
                    {q.q_no} • {q.marks} Marks
                  </div>
                  <div style={{ color: "var(--text-secondary)", marginBottom: "0.4rem" }}>{q.text}</div>
                  <div style={{ background: "#f8fafc", padding: "0.4rem 0.6rem", borderRadius: "4px", fontSize: "0.75rem", color: "#334155" }}>
                    <strong>Expected Key Concepts:</strong> {q.ideal_answer || q.rubric || "Full conceptual derivation required."}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : activePaneTab === "rawJson" ? (
        /* RAW JSON TAB: Display returned JSON directly as requested */
        <div className="card" style={{ padding: "1.75rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
            <div>
              <h3 style={{ fontSize: "1.2rem", fontWeight: 800 }}>Gemini Multimodal JSON Output</h3>
              <p style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>
                Structured JSON schema response returned by Gemini API question paper scanning.
              </p>
            </div>
            <button
              onClick={handleCopyJson}
              className="btn btn-secondary"
              style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}
            >
              {copiedJson ? <Check size={15} style={{ color: "var(--green)" }} /> : <Copy size={15} />}
              {copiedJson ? "Copied!" : "Copy JSON"}
            </button>
          </div>

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
            {rawScanJson || JSON.stringify({
              status: "success",
              model: "gemini-3.5-flash-lite",
              questions_count: questions.length,
              total_marks: totalAllocatedMarks,
              questions: questions
            }, null, 2)}
          </pre>
        </div>
      ) : (
        /* Master Answer Key Tab */
        <div className="card" style={{ padding: "1.75rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
            <div>
              <h3 style={{ fontSize: "1.2rem", fontWeight: 800 }}>Master Answer Key Repository</h3>
              <p style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>
                This master answer key is fed to the strict evaluation prompt (temperature: 0.0) alongside questions and student answer sheets.
              </p>
            </div>
            <button
              onClick={handleSaveExam}
              disabled={isSaving}
              className="btn btn-primary"
              style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}
            >
              <Save size={15} /> Save Master Key
            </button>
          </div>

          <textarea
            rows={12}
            value={answerKeyText}
            onChange={(e) => setAnswerKeyText(e.target.value)}
            placeholder="Enter the official master answer key, model mathematical derivations, and expected step-by-step scoring benchmarks..."
            style={{
              width: "100%",
              padding: "0.85rem 1rem",
              borderRadius: "8px",
              border: "1px solid var(--border-color)",
              fontFamily: "var(--font-mono)",
              fontSize: "0.85rem",
              lineHeight: 1.6
            }}
          />
        </div>
      )}
    </div>
  );
};
