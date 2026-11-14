import React, { useState, useEffect } from "react";
import { academicApi } from "../api/academicApi";
import type { Subject, Exam, Student, AcademicEvaluation } from "../types/academic";
import { StudentProfileModal } from "../components/StudentProfileModal";
import {
  ArrowLeft,
  BookOpen,
  Calendar,
  FileSpreadsheet,
  Users,
  CheckCircle2,
  Clock,
  Plus,
  Sparkles,
  TrendingUp
} from "lucide-react";

interface SubjectDetailPageProps {
  subjectId: string;
  onNavigate: (tab: any, params?: any) => void;
  onBack: () => void;
}

export const SubjectDetailPage: React.FC<SubjectDetailPageProps> = ({
  subjectId,
  onNavigate,
  onBack
}) => {
  const [subject, setSubject] = useState<Subject | null>(null);
  const [exams, setExams] = useState<Exam[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [evaluations, setEvaluations] = useState<AcademicEvaluation[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"exams" | "students" | "results" | "syllabus">("exams");
  const [selectedStudentForProfile, setSelectedStudentForProfile] = useState<Student | null>(null);

  useEffect(() => {
    loadData();
  }, [subjectId]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [subjData, examList, studentList, evalList] = await Promise.all([
        academicApi.getSubject(subjectId).catch(() => null),
        academicApi.listExams(subjectId).catch(() => []),
        academicApi.listStudents(subjectId).catch(() => []),
        academicApi.listEvaluations().catch(() => [])
      ]);

      if (subjData) setSubject(subjData);
      setExams(examList || []);
      setStudents(studentList || []);

      // Filter evaluations relevant to exams in this subject
      const subjectExamIds = new Set((examList || []).map((e: Exam) => e.id));
      const relevantEvals = (evalList || []).filter((ev: AcademicEvaluation) => subjectExamIds.has(ev.exam_id));
      setEvaluations(relevantEvals);
    } catch (err) {
      console.error("Failed to load subject detail:", err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={{ textAlign: "center", padding: "5rem", color: "#64748b" }}>
        Loading subject details...
      </div>
    );
  }

  if (!subject) {
    return (
      <div style={{ textAlign: "center", padding: "5rem" }}>
        <h3 style={{ fontSize: "1.25rem", color: "#0f172a" }}>Subject not found</h3>
        <button onClick={onBack} className="btn btn-secondary" style={{ marginTop: "1rem" }}>
          Back to Dashboard
        </button>
      </div>
    );
  }

  const avgScore = evaluations.length > 0
    ? Math.round(evaluations.reduce((sum, e) => sum + (e.percentage || 0), 0) / evaluations.length)
    : 0;
  const highestScore = evaluations.length > 0
    ? Math.max(...evaluations.map((e) => e.total_score || 0))
    : 0;

  return (
    <div className="subject-detail-page" style={{ paddingBottom: "3rem" }}>
      {/* Top Breadcrumb & Action Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "1rem", marginBottom: "1.5rem" }}>
        <div>
          <button
            onClick={onBack}
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
            <ArrowLeft size={14} /> Back to Dashboard
          </button>

          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", flexWrap: "wrap" }}>
            <h1 style={{ fontSize: "1.85rem", fontWeight: 900, color: "#0f172a", letterSpacing: "-0.03em", margin: 0 }}>
              {subject.name}
            </h1>
            <span style={{ fontSize: "0.82rem", fontWeight: 700, background: "#e0e7ff", color: "#3730a3", padding: "0.25rem 0.65rem", borderRadius: "6px" }}>
              {subject.code}
            </span>
            <span style={{ fontSize: "0.82rem", fontWeight: 600, background: "#f1f5f9", color: "#475569", padding: "0.25rem 0.65rem", borderRadius: "6px" }}>
              {subject.semester_or_grade} {subject.credits ? `• ${subject.credits} Credits` : ""}
            </span>
          </div>

          <p style={{ color: "#64748b", fontSize: "0.88rem", marginTop: "0.4rem", margin: 0 }}>
            Academic Year: {subject.academic_year || "2026-2027"} • Grading: {subject.grading_system || "CGPA (10-Point Scale)"}
          </p>
        </div>

        <div style={{ display: "flex", gap: "0.6rem", flexWrap: "wrap" }}>
          <button
            onClick={() => onNavigate("exams", { subjectId: subject.id })}
            className="btn btn-primary"
            style={{ display: "flex", alignItems: "center", gap: "0.45rem", fontSize: "0.85rem", padding: "0.55rem 1rem" }}
          >
            <Plus size={15} /> Add New Exam
          </button>
          <button
            onClick={() => onNavigate("students", { subjectId: subject.id })}
            className="btn btn-secondary"
            style={{ display: "flex", alignItems: "center", gap: "0.45rem", fontSize: "0.85rem", padding: "0.55rem 1rem" }}
          >
            <Users size={15} /> Enrolled Students
          </button>
        </div>
      </div>

      {/* KPI Stats Cards Row (Wide & Balanced) */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "1rem", marginBottom: "2rem" }}>
        <div style={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: "14px", padding: "1.25rem", boxShadow: "0 1px 3px rgba(0,0,0,0.03)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
            <span style={{ fontSize: "0.8rem", fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>Total Examinations</span>
            <div style={{ padding: "0.4rem", background: "#eff6ff", color: "#2563eb", borderRadius: "8px" }}>
              <FileSpreadsheet size={18} />
            </div>
          </div>
          <div style={{ fontSize: "1.8rem", fontWeight: 900, color: "#0f172a" }}>{exams.length}</div>
          <div style={{ fontSize: "0.78rem", color: "#64748b", marginTop: "0.25rem" }}>Mid-Sem, End-Sem & Tests</div>
        </div>

        <div style={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: "14px", padding: "1.25rem", boxShadow: "0 1px 3px rgba(0,0,0,0.03)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
            <span style={{ fontSize: "0.8rem", fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>Enrolled Students</span>
            <div style={{ padding: "0.4rem", background: "#f0fdf4", color: "#16a34a", borderRadius: "8px" }}>
              <Users size={18} />
            </div>
          </div>
          <div style={{ fontSize: "1.8rem", fontWeight: 900, color: "#0f172a" }}>{students.length}</div>
          <div style={{ fontSize: "0.78rem", color: "#64748b", marginTop: "0.25rem" }}>Active cohort members</div>
        </div>

        <div style={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: "14px", padding: "1.25rem", boxShadow: "0 1px 3px rgba(0,0,0,0.03)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
            <span style={{ fontSize: "0.8rem", fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>Average Performance</span>
            <div style={{ padding: "0.4rem", background: "#fef3c7", color: "#d97706", borderRadius: "8px" }}>
              <TrendingUp size={18} />
            </div>
          </div>
          <div style={{ fontSize: "1.8rem", fontWeight: 900, color: "#0f172a" }}>{avgScore}%</div>
          <div style={{ fontSize: "0.78rem", color: "#64748b", marginTop: "0.25rem" }}>Highest: {highestScore} marks</div>
        </div>

        <div style={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: "14px", padding: "1.25rem", boxShadow: "0 1px 3px rgba(0,0,0,0.03)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
            <span style={{ fontSize: "0.8rem", fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>Graded Answer Sheets</span>
            <div style={{ padding: "0.4rem", background: "#e0e7ff", color: "#4f46e5", borderRadius: "8px" }}>
              <CheckCircle2 size={18} />
            </div>
          </div>
          <div style={{ fontSize: "1.8rem", fontWeight: 900, color: "#0f172a" }}>{evaluations.length}</div>
          <div style={{ fontSize: "0.78rem", color: "#64748b", marginTop: "0.25rem" }}>Multi-step evaluated scorecards</div>
        </div>
      </div>

      {/* Tabs Header */}
      <div style={{ borderBottom: "1px solid #e2e8f0", display: "flex", gap: "1rem", marginBottom: "1.5rem" }}>
        <button
          onClick={() => setActiveTab("exams")}
          style={{
            background: "none",
            border: "none",
            padding: "0.75rem 0.5rem",
            fontSize: "0.92rem",
            fontWeight: 700,
            cursor: "pointer",
            color: activeTab === "exams" ? "#1e1b4b" : "#64748b",
            borderBottom: activeTab === "exams" ? "3px solid #1e1b4b" : "3px solid transparent",
            display: "flex",
            alignItems: "center",
            gap: "0.45rem"
          }}
        >
          <FileSpreadsheet size={16} /> Examinations ({exams.length})
        </button>

        <button
          onClick={() => setActiveTab("students")}
          style={{
            background: "none",
            border: "none",
            padding: "0.75rem 0.5rem",
            fontSize: "0.92rem",
            fontWeight: 700,
            cursor: "pointer",
            color: activeTab === "students" ? "#1e1b4b" : "#64748b",
            borderBottom: activeTab === "students" ? "3px solid #1e1b4b" : "3px solid transparent",
            display: "flex",
            alignItems: "center",
            gap: "0.45rem"
          }}
        >
          <Users size={16} /> Students ({students.length})
        </button>

        <button
          onClick={() => setActiveTab("results")}
          style={{
            background: "none",
            border: "none",
            padding: "0.75rem 0.5rem",
            fontSize: "0.92rem",
            fontWeight: 700,
            cursor: "pointer",
            color: activeTab === "results" ? "#1e1b4b" : "#64748b",
            borderBottom: activeTab === "results" ? "3px solid #1e1b4b" : "3px solid transparent",
            display: "flex",
            alignItems: "center",
            gap: "0.45rem"
          }}
        >
          <CheckCircle2 size={16} /> Past Results ({evaluations.length})
        </button>

        <button
          onClick={() => setActiveTab("syllabus")}
          style={{
            background: "none",
            border: "none",
            padding: "0.75rem 0.5rem",
            fontSize: "0.92rem",
            fontWeight: 700,
            cursor: "pointer",
            color: activeTab === "syllabus" ? "#1e1b4b" : "#64748b",
            borderBottom: activeTab === "syllabus" ? "3px solid #1e1b4b" : "3px solid transparent",
            display: "flex",
            alignItems: "center",
            gap: "0.45rem"
          }}
        >
          <BookOpen size={16} /> Syllabus Chapters ({subject.chapters?.length || 0})
        </button>
      </div>

      {/* TAB 1: EXAMS FOR THIS SUBJECT */}
      {activeTab === "exams" && (
        <div>
          {exams.length === 0 ? (
            <div style={{ background: "#ffffff", border: "2px dashed #cbd5e1", borderRadius: "16px", padding: "3rem", textAlign: "center" }}>
              <FileSpreadsheet size={40} style={{ color: "#94a3b8", margin: "0 auto 1rem" }} />
              <h3 style={{ fontSize: "1.15rem", fontWeight: 700, color: "#0f172a" }}>No Exams Scheduled for {subject.name}</h3>
              <p style={{ color: "#64748b", fontSize: "0.88rem", marginTop: "0.25rem", marginBottom: "1.25rem" }}>
                Upload question papers, generate Gemini answer keys, and set correction deadlines.
              </p>
              <button
                onClick={() => onNavigate("exams", { subjectId: subject.id })}
                className="btn btn-primary"
              >
                + Create First Exam
              </button>
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(420px, 1fr))", gap: "1.25rem" }}>
              {exams.map((exam) => {
                const examEvals = evaluations.filter((e) => e.exam_id === exam.id);
                const hasAnswerKey = Boolean(exam.answer_key_text && exam.answer_key_text.trim());
                return (
                  <div
                    key={exam.id}
                    style={{
                      background: "#ffffff",
                      border: "1px solid #e2e8f0",
                      borderRadius: "14px",
                      padding: "1.25rem",
                      boxShadow: "0 1px 3px rgba(0,0,0,0.03)",
                      display: "flex",
                      flexDirection: "column",
                      justifyContent: "space-between"
                    }}
                  >
                    <div>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "0.6rem" }}>
                        <span style={{ fontSize: "0.75rem", fontWeight: 700, background: "#f1f5f9", color: "#334155", padding: "0.2rem 0.5rem", borderRadius: "4px" }}>
                          {exam.exam_type || "Semester Exam"}
                        </span>
                        <span style={{ fontSize: "0.78rem", fontWeight: 700, color: hasAnswerKey ? "#16a34a" : "#d97706", display: "flex", alignItems: "center", gap: "0.25rem" }}>
                          {hasAnswerKey ? <CheckCircle2 size={13} /> : <Sparkles size={13} />}
                          {hasAnswerKey ? "Answer Key Approved" : "Needs Answer Key"}
                        </span>
                      </div>

                      <h3 style={{ fontSize: "1.15rem", fontWeight: 800, color: "#0f172a", marginBottom: "0.4rem" }}>
                        {exam.title}
                      </h3>

                      <div style={{ fontSize: "0.82rem", color: "#64748b", display: "flex", gap: "1rem", flexWrap: "wrap", marginBottom: "0.85rem" }}>
                        <span style={{ display: "flex", alignItems: "center", gap: "0.3rem" }}>
                          <Calendar size={13} /> {exam.exam_date || "Exam Date Pending"}
                        </span>
                        <span
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "0.3rem",
                            color: "#dc2626",
                            background: "#fef2f2",
                            border: "1px solid #fecaca",
                            padding: "0.12rem 0.45rem",
                            borderRadius: "4px",
                            fontWeight: 700
                          }}
                        >
                          <Clock size={13} style={{ color: "#dc2626" }} /> Deadline: {exam.correction_deadline || "Upcoming"}
                        </span>
                      </div>

                      <div style={{ background: "#f8fafc", borderRadius: "8px", padding: "0.65rem 0.85rem", fontSize: "0.8rem", color: "#475569", marginBottom: "1rem" }}>
                        <strong>{exam.questions?.length || 0}</strong> Questions • <strong>{exam.max_marks || 60}</strong> Max Marks • Pass: {exam.passing_marks || 24} Marks • <strong>{examEvals.length}</strong> Evaluated
                      </div>
                    </div>

                    <div style={{ display: "flex", gap: "0.5rem", borderTop: "1px solid #f1f5f9", paddingTop: "0.85rem" }}>
                      <button
                        onClick={() => onNavigate("exams", { subjectId: subject.id, examId: exam.id })}
                        className="btn btn-secondary"
                        style={{ fontSize: "0.82rem", flex: 1 }}
                      >
                        Review Exam
                      </button>
                      <button
                        onClick={() => onNavigate("evaluation", { examId: exam.id })}
                        className="btn btn-primary"
                        style={{ fontSize: "0.82rem", flex: 1 }}
                      >
                        Upload & Grade
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: ENROLLED STUDENTS */}
      {activeTab === "students" && (
        <div style={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: "14px", overflow: "hidden" }}>
          <div style={{ padding: "1rem 1.25rem", borderBottom: "1px solid #e2e8f0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <h3 style={{ fontSize: "1.05rem", fontWeight: 800, color: "#0f172a", margin: 0 }}>
              Students Enrolled in {subject.name}
            </h3>
            <button
              onClick={() => onNavigate("students", { subjectId: subject.id })}
              className="btn btn-secondary"
              style={{ fontSize: "0.82rem" }}
            >
              Manage Roster
            </button>
          </div>

          {students.length === 0 ? (
            <div style={{ padding: "3rem", textAlign: "center", color: "#64748b" }}>
              No students enrolled in this subject yet.
            </div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.88rem" }}>
                <thead>
                  <tr style={{ background: "#f8fafc", borderBottom: "1px solid #e2e8f0", textAlign: "left", color: "#475569" }}>
                    <th style={{ padding: "0.75rem 1rem", fontWeight: 700 }}>Roll Number</th>
                    <th style={{ padding: "0.75rem 1rem", fontWeight: 700 }}>Student Name</th>
                    <th style={{ padding: "0.75rem 1rem", fontWeight: 700 }}>Section</th>
                    <th style={{ padding: "0.75rem 1rem", fontWeight: 700 }}>Attendance</th>
                    <th style={{ padding: "0.75rem 1rem", fontWeight: 700 }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {students.map((student) => (
                    <tr key={student.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                      <td style={{ padding: "0.75rem 1rem", fontWeight: 700, color: "#0f172a" }}>
                        {student.roll_number}
                      </td>
                      <td style={{ padding: "0.75rem 1rem", fontWeight: 600, color: "#1e293b" }}>
                        {student.name}
                      </td>
                      <td style={{ padding: "0.75rem 1rem", color: "#64748b" }}>
                        Section {student.section || "A"}
                      </td>
                      <td style={{ padding: "0.75rem 1rem", color: "#16a34a", fontWeight: 600 }}>
                        {student.attendance_percentage ?? 85}%
                      </td>
                      <td style={{ padding: "0.75rem 1rem" }}>
                        <button
                          onClick={() => setSelectedStudentForProfile(student)}
                          className="btn btn-secondary"
                          style={{ fontSize: "0.78rem", padding: "0.3rem 0.65rem" }}
                        >
                          View Profile
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: PAST EVALUATION RESULTS */}
      {activeTab === "results" && (
        <div style={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: "14px", overflow: "hidden" }}>
          <div style={{ padding: "1rem 1.25rem", borderBottom: "1px solid #e2e8f0" }}>
            <h3 style={{ fontSize: "1.05rem", fontWeight: 800, color: "#0f172a", margin: 0 }}>
              Graded Student Submissions
            </h3>
          </div>

          {evaluations.length === 0 ? (
            <div style={{ padding: "3rem", textAlign: "center", color: "#64748b" }}>
              No graded submissions for this subject yet. Upload student answer sheets to view evaluations.
            </div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.88rem" }}>
                <thead>
                  <tr style={{ background: "#f8fafc", borderBottom: "1px solid #e2e8f0", textAlign: "left", color: "#475569" }}>
                    <th style={{ padding: "0.75rem 1rem", fontWeight: 700 }}>Student Name</th>
                    <th style={{ padding: "0.75rem 1rem", fontWeight: 700 }}>Roll Number</th>
                    <th style={{ padding: "0.75rem 1rem", fontWeight: 700 }}>Score</th>
                    <th style={{ padding: "0.75rem 1rem", fontWeight: 700 }}>Percentage</th>
                    <th style={{ padding: "0.75rem 1rem", fontWeight: 700 }}>Grade</th>
                    <th style={{ padding: "0.75rem 1rem", fontWeight: 700 }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {evaluations.map((ev) => (
                    <tr key={ev.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                      <td style={{ padding: "0.75rem 1rem", fontWeight: 700, color: "#0f172a" }}>
                        {ev.student_name}
                      </td>
                      <td style={{ padding: "0.75rem 1rem", color: "#64748b" }}>
                        {ev.roll_number}
                      </td>
                      <td style={{ padding: "0.75rem 1rem", fontWeight: 800, color: "#2563eb" }}>
                        {ev.total_score} / {ev.max_score}
                      </td>
                      <td style={{ padding: "0.75rem 1rem", fontWeight: 700 }}>
                        {ev.percentage}%
                      </td>
                      <td style={{ padding: "0.75rem 1rem" }}>
                        <span style={{ fontSize: "0.75rem", fontWeight: 700, background: "#ecfdf5", color: "#059669", padding: "0.2rem 0.5rem", borderRadius: "4px" }}>
                          {ev.grade || "Passed"}
                        </span>
                      </td>
                      <td style={{ padding: "0.75rem 1rem" }}>
                        <button
                          onClick={() => onNavigate("evaluation", { evalId: ev.id, examId: ev.exam_id, studentId: ev.student_id })}
                          className="btn btn-secondary"
                          style={{ fontSize: "0.78rem", padding: "0.3rem 0.65rem" }}
                        >
                          View Report
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB 4: SYLLABUS CHAPTERS */}
      {activeTab === "syllabus" && (
        <div style={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: "14px", padding: "1.5rem" }}>
          <h3 style={{ fontSize: "1.1rem", fontWeight: 800, color: "#0f172a", marginBottom: "1rem" }}>
            Curriculum Units & Syllabus Breakdown
          </h3>
          {subject.chapters && subject.chapters.length > 0 ? (
            <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
              {subject.chapters.map((ch, idx) => (
                <div
                  key={idx}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.75rem",
                    padding: "0.85rem 1rem",
                    background: "#f8fafc",
                    borderRadius: "10px",
                    border: "1px solid #e2e8f0"
                  }}
                >
                  <span style={{ width: "28px", height: "28px", borderRadius: "50%", background: "#1e1b4b", color: "#ffffff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.8rem", fontWeight: 700 }}>
                    {idx + 1}
                  </span>
                  <span style={{ fontSize: "0.92rem", fontWeight: 600, color: "#1e293b" }}>{ch}</span>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ color: "#64748b", fontSize: "0.9rem" }}>No syllabus chapters configured yet.</div>
          )}
        </div>
      )}

      {/* 16:9 Student Profile Modal */}
      {selectedStudentForProfile && (
        <StudentProfileModal
          student={selectedStudentForProfile}
          onClose={() => setSelectedStudentForProfile(null)}
          onNavigateToEvaluation={(evalId) => {
            setSelectedStudentForProfile(null);
            onNavigate("evaluation", { evalId });
          }}
        />
      )}
    </div>
  );
};