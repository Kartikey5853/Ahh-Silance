import React, { useState, useEffect } from "react";
import { academicApi } from "../api/academicApi";
import type { Subject, Student, ClassItem, Exam, AcademicEvaluation } from "../types/academic";
import { StudentProfileModal } from "../components/StudentProfileModal";
import {
  UserPlus,
  Trash2,
  Search,
  Users,
  X,
  Download,
  Printer,
  FileSpreadsheet,
  Award
} from "lucide-react";

interface StudentsRosterProps {
  initialSubjectId?: string;
  onNavigate: (tab: any, params?: any) => void;
}

interface ConsolidatedStudentGroup {
  primary: Student;
  rows: Student[];
  enrolledSubjects: Subject[];
  sections: string[];
}

export const StudentsRosterPage: React.FC<StudentsRosterProps> = ({
  initialSubjectId,
  onNavigate
}) => {
  // Hierarchy Data
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [exams, setExams] = useState<Exam[]>([]);
  const [selectedExamId, setSelectedExamId] = useState<string>("");
  const [evaluations, setEvaluations] = useState<AcademicEvaluation[]>([]);

  // Students Data
  const [students, setStudents] = useState<Student[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStudentForProfile, setSelectedStudentForProfile] = useState<Student | null>(null);

  // Add Student Modal State
  const [showAddModal, setShowAddModal] = useState(false);
  const [studentName, setStudentName] = useState("");
  const [rollNumber, setRollNumber] = useState("");
  const [section, setSection] = useState("A");
  const [modalSubjectId, setModalSubjectId] = useState("");
  const [modalClassId, setModalClassId] = useState("");
  const [isAdding, setIsAdding] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);

  const loadInitialData = async () => {
    try {
      const [classList, subjList, examList, evalList] = await Promise.all([
        academicApi.listClasses().catch(() => []),
        academicApi.listSubjects().catch(() => []),
        academicApi.listExams().catch(() => []),
        academicApi.listEvaluations().catch(() => [])
      ]);

      setClasses(classList || []);
      setSubjects(subjList || []);
      setExams(examList || []);
      setEvaluations(evalList || []);

      if (examList && examList.length > 0) {
        setSelectedExamId(examList[0].id);
      }

      const studList = await academicApi.listAllStudents().catch(() => []);
      setStudents(studList || []);
    } catch (err) {
      console.error("Failed to load register data:", err);
    }
  };

  useEffect(() => {
    loadInitialData();
  }, []);

  const handleOpenAddModal = (presetClassId?: string) => {
    setModalClassId(presetClassId || (classes[0]?.id ?? ""));
    setModalSubjectId(initialSubjectId || (subjects[0]?.id ?? ""));
    setStudentName("");
    setRollNumber("");
    setSection("A");
    setAddError(null);
    setShowAddModal(true);
  };

  const handleAddStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentName.trim() || !rollNumber.trim()) {
      setAddError("Student name and roll number are required.");
      return;
    }
    const targetSubjectId = modalSubjectId || initialSubjectId || (subjects[0]?.id ?? "");
    if (!targetSubjectId) {
      setAddError("Please select an enrolled subject.");
      return;
    }

    try {
      setIsAdding(true);
      setAddError(null);
      const newStudent = await academicApi.addStudent(targetSubjectId, {
        name: studentName.trim(),
        roll_number: rollNumber.trim().toUpperCase(),
        section: section.trim() || "A",
        class_id: modalClassId || undefined,
        attendance_percentage: 85.0,
        cgpa_or_percentage: 0.0
      });
      setStudents((prev) => [newStudent, ...prev]);
      setShowAddModal(false);
    } catch (err: any) {
      setAddError(err?.response?.data?.detail || "Failed to add student.");
    } finally {
      setIsAdding(false);
    }
  };

  const handleDeleteGroup = async (rowsToDelete: Student[], name: string) => {
    if (!confirm(`Remove student ${name}?`)) return;
    try {
      for (const row of rowsToDelete) {
        await academicApi.deleteStudent(row.id);
      }
      const deletedIds = new Set(rowsToDelete.map((r) => r.id));
      setStudents((prev) => prev.filter((s) => !deletedIds.has(s.id)));
    } catch (err) {
      alert("Error removing student.");
    }
  };

  // Consolidate Students by Roll Number
  const consolidateStudents = (rows: Student[]): ConsolidatedStudentGroup[] => {
    const byRoll = new Map<string, ConsolidatedStudentGroup>();
    rows.forEach((stud) => {
      const rollKey = (stud.roll_number || stud.id).trim().toUpperCase();
      const subj = subjects.find((s) => s.id === stud.subject_id);
      const sec = (stud.section || "").trim();
      const existing = byRoll.get(rollKey);
      if (!existing) {
        byRoll.set(rollKey, {
          primary: stud,
          rows: [stud],
          enrolledSubjects: subj ? [subj] : [],
          sections: sec ? [sec] : []
        });
      } else {
        existing.rows.push(stud);
        if (subj && !existing.enrolledSubjects.some((s) => s.id === subj.id)) {
          existing.enrolledSubjects.push(subj);
        }
        if (sec && !existing.sections.includes(sec)) {
          existing.sections.push(sec);
        }
        if (!existing.primary.cgpa_or_percentage && stud.cgpa_or_percentage) {
          existing.primary = stud;
        }
      }
    });
    return Array.from(byRoll.values());
  };

  const consolidatedList = consolidateStudents(students);
  const activeExam = exams.find((e) => e.id === selectedExamId) || exams[0];

  const examEvaluations = evaluations.filter((ev) => ev.exam_id === activeExam?.id);
  const evalByStudentId = new Map<string, AcademicEvaluation>();
  examEvaluations.forEach((ev) => {
    evalByStudentId.set(ev.student_id, ev);
  });

  const filteredConsolidatedList = consolidatedList.filter((g) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    return (
      g.primary.name.toLowerCase().includes(q) ||
      (g.primary.roll_number && g.primary.roll_number.toLowerCase().includes(q))
    );
  });

  // Export to Excel / CSV
  const handleExportCsv = () => {
    if (!activeExam) return;
    const headers = ["Roll No", "Student Name", "Section", "Score", "Max Marks", "Percentage", "Status"];
    const rows = filteredConsolidatedList.map((g) => {
      const ev = evalByStudentId.get(g.primary.id);
      const score = ev ? ev.total_score : 0;
      const pct = ev ? ev.percentage.toFixed(1) : "0.0";
      const status = ev ? (ev.total_score >= activeExam.passing_marks ? "PASS" : "NEEDS IMPROVEMENT") : "PENDING";
      return [g.primary.roll_number, `"${g.primary.name}"`, g.sections.join(",") || "A", score, activeExam.max_marks, `${pct}%`, status];
    });

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Marks_Register_${activeExam.title.replace(/\s+/g, "_")}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="students-roster-page" style={{ maxWidth: "1280px", margin: "0 auto", paddingBottom: "4rem" }}>
      {/* Top Header & Action Controls */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: "1.25rem",
          flexWrap: "wrap",
          gap: "1rem"
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <div
            style={{
              width: "40px",
              height: "40px",
              borderRadius: "10px",
              background: "#eff6ff",
              color: "#2563eb",
              display: "flex",
              alignItems: "center",
              justifyContent: "center"
            }}
          >
            <Award size={22} />
          </div>
          <div>
            <h1 style={{ fontSize: "1.35rem", fontWeight: 800, color: "#0f172a", margin: 0 }}>
              Marks Register &amp; Student Roster
            </h1>
            <div style={{ fontSize: "0.8rem", color: "#64748b", marginTop: "2px" }}>
              Unified student registry with live examination performance ({filteredConsolidatedList.length} students)
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div style={{ display: "flex", alignItems: "center", gap: "0.65rem", flexWrap: "wrap" }}>
          <button
            type="button"
            onClick={() => handleOpenAddModal()}
            style={{
              background: "#2563eb",
              color: "#ffffff",
              border: "none",
              borderRadius: "8px",
              padding: "0.5rem 1rem",
              fontSize: "0.85rem",
              fontWeight: 700,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "0.35rem",
              boxShadow: "0 1px 3px rgba(37,99,235,0.2)"
            }}
          >
            <UserPlus size={15} />
            <span>+ Add Student</span>
          </button>

          <button
            type="button"
            onClick={handleExportCsv}
            style={{
              background: "#16a34a",
              color: "#ffffff",
              border: "none",
              borderRadius: "8px",
              padding: "0.5rem 0.85rem",
              fontSize: "0.82rem",
              fontWeight: 700,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "0.35rem"
            }}
          >
            <Download size={14} />
            <span>Export Excel</span>
          </button>

          <button
            type="button"
            onClick={() => window.print()}
            style={{
              background: "#f1f5f9",
              border: "1px solid #cbd5e1",
              color: "#334155",
              borderRadius: "8px",
              padding: "0.5rem 0.85rem",
              fontSize: "0.82rem",
              fontWeight: 600,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "0.35rem"
            }}
          >
            <Printer size={14} />
            <span>Print</span>
          </button>
        </div>
      </div>

      {/* COMBINED MARKS REGISTER & STUDENT ROSTER */}
      <div
        style={{
          background: "#ffffff",
          border: "1px solid #e2e8f0",
          borderRadius: "14px",
          padding: "1.5rem",
          boxShadow: "0 1px 3px rgba(0,0,0,0.02)"
        }}
      >
        {/* Controls Bar: Exam Selector + Search */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            paddingBottom: "1.25rem",
            borderBottom: "1px solid #e2e8f0",
            marginBottom: "1.25rem",
            flexWrap: "wrap",
            gap: "1rem"
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "0.65rem", flexWrap: "wrap" }}>
            <FileSpreadsheet size={18} style={{ color: "#2563eb" }} />
            <span style={{ fontSize: "0.85rem", fontWeight: 700, color: "#334155" }}>
              Exam Paper:
            </span>
            <select
              value={selectedExamId}
              onChange={(e) => setSelectedExamId(e.target.value)}
              style={{
                padding: "0.45rem 0.85rem",
                borderRadius: "8px",
                border: "1px solid #cbd5e1",
                fontSize: "0.88rem",
                fontWeight: 600,
                background: "#ffffff"
              }}
            >
              {exams.map((ex) => (
                <option key={ex.id} value={ex.id}>
                  {ex.title} (Max: {ex.max_marks} Marks)
                </option>
              ))}
            </select>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "1rem", flexWrap: "wrap" }}>
            {activeExam && (
              <div style={{ display: "flex", alignItems: "center", gap: "1rem", fontSize: "0.82rem", color: "#64748b" }}>
                <span>Max Marks: <strong>{activeExam.max_marks}</strong></span>
                <span>Passing: <strong>{activeExam.passing_marks}</strong></span>
                <span>Evaluated: <strong>{examEvaluations.length} / {consolidatedList.length}</strong></span>
              </div>
            )}

            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.45rem",
                background: "#f8fafc",
                border: "1px solid #cbd5e1",
                borderRadius: "8px",
                padding: "0.42rem 0.75rem",
                minWidth: "220px"
              }}
            >
              <Search size={15} style={{ color: "#94a3b8" }} />
              <input
                type="text"
                placeholder="Search name or roll no..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  border: "none",
                  outline: "none",
                  background: "transparent",
                  fontSize: "0.84rem",
                  width: "100%"
                }}
              />
            </div>
          </div>
        </div>

        {/* Unified Table: Students + Marks */}
        {filteredConsolidatedList.length > 0 ? (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.85rem" }}>
              <thead>
                <tr style={{ background: "#f8fafc", borderBottom: "2px solid #e2e8f0", textAlign: "left" }}>
                  <th style={{ padding: "0.75rem 1rem", fontWeight: 700, color: "#475569", width: "100px" }}>Roll No</th>
                  <th style={{ padding: "0.75rem 1rem", fontWeight: 700, color: "#475569" }}>Student Name</th>
                  <th style={{ padding: "0.75rem 1rem", fontWeight: 700, color: "#475569", width: "90px" }}>Section</th>
                  <th style={{ padding: "0.75rem 1rem", fontWeight: 700, color: "#475569", width: "120px" }}>Total Marks</th>
                  <th style={{ padding: "0.75rem 1rem", fontWeight: 700, color: "#475569", width: "110px" }}>Percentage</th>
                  <th style={{ padding: "0.75rem 1rem", fontWeight: 700, color: "#475569", width: "130px" }}>Result</th>
                  <th style={{ padding: "0.75rem 1rem", fontWeight: 700, color: "#475569", textAlign: "right" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredConsolidatedList.map((g) => {
                  const ev = evalByStudentId.get(g.primary.id);
                  const isEvaluated = Boolean(ev);
                  const score = ev ? ev.total_score : 0;
                  const maxM = activeExam?.max_marks || 50;
                  const passM = activeExam?.passing_marks || 20;
                  const pct = ev ? ev.percentage : 0;
                  const isPass = score >= passM;

                  return (
                    <tr
                      key={g.primary.id}
                      style={{
                        borderBottom: "1px solid #f1f5f9",
                        transition: "background 0.15s ease"
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = "#f8fafc")}
                      onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                    >
                      <td style={{ padding: "0.75rem 1rem", fontWeight: 700, color: "#0f172a" }}>
                        {g.primary.roll_number}
                      </td>
                      <td style={{ padding: "0.75rem 1rem" }}>
                        <div
                          onClick={() => setSelectedStudentForProfile(g.primary)}
                          style={{ fontWeight: 600, color: "#0f172a", cursor: "pointer" }}
                          title="Click to view full student profile & parent scorecard"
                        >
                          {g.primary.name}
                        </div>
                        <div style={{ fontSize: "0.74rem", color: "#64748b" }}>
                          {g.enrolledSubjects.map((s) => s.name).join(", ") || "General"}
                        </div>
                      </td>
                      <td style={{ padding: "0.75rem 1rem", color: "#64748b" }}>
                        {g.sections.join(", ") || "A"}
                      </td>
                      <td style={{ padding: "0.75rem 1rem", fontWeight: 700 }}>
                        {isEvaluated ? (
                          <span style={{ color: "#0f172a" }}>{score} / {maxM}</span>
                        ) : (
                          <span style={{ color: "#94a3b8" }}>-- / {maxM}</span>
                        )}
                      </td>
                      <td style={{ padding: "0.75rem 1rem" }}>
                        {isEvaluated ? (
                          <span style={{ fontWeight: 600, color: "#334155" }}>{pct.toFixed(1)}%</span>
                        ) : (
                          <span style={{ color: "#94a3b8" }}>--</span>
                        )}
                      </td>
                      <td style={{ padding: "0.75rem 1rem" }}>
                        {isEvaluated ? (
                          <span
                            style={{
                              background: isPass ? "#f0fdf4" : "#fef2f2",
                              color: isPass ? "#166534" : "#dc2626",
                              border: `1px solid ${isPass ? "#bbf7d0" : "#fecaca"}`,
                              padding: "0.2rem 0.55rem",
                              borderRadius: "9999px",
                              fontSize: "0.72rem",
                              fontWeight: 700
                            }}
                          >
                            {isPass ? "PASS" : "RETEST"}
                          </span>
                        ) : (
                          <span
                            style={{
                              background: "#f8fafc",
                              color: "#64748b",
                              padding: "0.2rem 0.55rem",
                              borderRadius: "9999px",
                              fontSize: "0.72rem",
                              fontWeight: 600
                            }}
                          >
                            PENDING
                          </span>
                        )}
                      </td>
                      <td style={{ padding: "0.75rem 1rem", textAlign: "right" }}>
                        <div style={{ display: "inline-flex", alignItems: "center", gap: "0.4rem" }}>
                          <button
                            type="button"
                            onClick={() => {
                              if (activeExam) {
                                onNavigate("evaluation", {
                                  examId: activeExam.id,
                                  studentId: g.primary.id,
                                  evalId: ev?.id
                                });
                              }
                            }}
                            style={{
                              background: isEvaluated ? "#eff6ff" : "#2563eb",
                              color: isEvaluated ? "#1d4ed8" : "#ffffff",
                              border: isEvaluated ? "1px solid #bfdbfe" : "none",
                              borderRadius: "6px",
                              padding: "0.35rem 0.75rem",
                              fontSize: "0.78rem",
                              fontWeight: 700,
                              cursor: "pointer"
                            }}
                          >
                            {isEvaluated ? "View Copy" : "Grade Paper"}
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDeleteGroup(g.rows, g.primary.name)}
                            title="Remove student"
                            style={{
                              background: "transparent",
                              border: "none",
                              color: "#94a3b8",
                              cursor: "pointer",
                              padding: "0.35rem",
                              display: "inline-flex",
                              alignItems: "center"
                            }}
                            onMouseEnter={(e) => (e.currentTarget.style.color = "#dc2626")}
                            onMouseLeave={(e) => (e.currentTarget.style.color = "#94a3b8")}
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div style={{ textAlign: "center", padding: "3rem 1rem", color: "#64748b" }}>
            <Users size={36} style={{ color: "#cbd5e1", margin: "0 auto 0.75rem" }} />
            <div style={{ fontWeight: 700, color: "#0f172a" }}>
              {searchQuery.trim() ? "No students matching search query" : "No students enrolled yet"}
            </div>
            <div style={{ fontSize: "0.85rem", marginTop: "0.25rem", marginBottom: "1rem" }}>
              {searchQuery.trim()
                ? "Try searching with a different name or roll number"
                : "Add your first student to this register to track grades and exam performance."}
            </div>
            {!searchQuery.trim() && (
              <button
                type="button"
                onClick={() => handleOpenAddModal()}
                style={{
                  background: "#2563eb",
                  color: "#ffffff",
                  border: "none",
                  borderRadius: "8px",
                  padding: "0.5rem 1rem",
                  fontSize: "0.85rem",
                  fontWeight: 700,
                  cursor: "pointer"
                }}
              >
                + Add Student Now
              </button>
            )}
          </div>
        )}
      </div>

      {/* MODAL: ADD STUDENT */}
      {showAddModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(15, 23, 42, 0.5)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 220,
            padding: "1rem"
          }}
        >
          <div
            style={{
              background: "#ffffff",
              borderRadius: "14px",
              maxWidth: "480px",
              width: "100%",
              padding: "1.75rem",
              boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1)"
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem" }}>
              <h3 style={{ fontSize: "1.2rem", fontWeight: 800, color: "#0f172a", margin: 0 }}>
                Enroll New Student
              </h3>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                style={{ background: "none", border: "none", cursor: "pointer", color: "#64748b" }}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleAddStudent}>
              <div style={{ marginBottom: "0.85rem" }}>
                <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 700, marginBottom: "0.3rem" }}>
                  Student Full Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Rahul Sharma"
                  value={studentName}
                  onChange={(e) => setStudentName(e.target.value)}
                  style={{ width: "100%", padding: "0.5rem 0.75rem", borderRadius: "8px", border: "1px solid #cbd5e1", fontSize: "0.85rem" }}
                />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1.2fr 0.8fr", gap: "0.75rem", marginBottom: "0.85rem" }}>
                <div>
                  <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 700, marginBottom: "0.3rem" }}>
                    Roll Number *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 101, 102"
                    value={rollNumber}
                    onChange={(e) => setRollNumber(e.target.value)}
                    style={{ width: "100%", padding: "0.5rem 0.75rem", borderRadius: "8px", border: "1px solid #cbd5e1", fontSize: "0.85rem" }}
                  />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 700, marginBottom: "0.3rem" }}>
                    Section
                  </label>
                  <input
                    type="text"
                    value={section}
                    onChange={(e) => setSection(e.target.value)}
                    style={{ width: "100%", padding: "0.5rem 0.75rem", borderRadius: "8px", border: "1px solid #cbd5e1", fontSize: "0.85rem" }}
                  />
                </div>
              </div>

              <div style={{ marginBottom: "1.25rem" }}>
                <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 700, marginBottom: "0.3rem" }}>
                  Enrolled Subject *
                </label>
                <select
                  value={modalSubjectId}
                  onChange={(e) => setModalSubjectId(e.target.value)}
                  style={{ width: "100%", padding: "0.5rem 0.75rem", borderRadius: "8px", border: "1px solid #cbd5e1", fontSize: "0.85rem", background: "#ffffff" }}
                >
                  {subjects.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.code || "SUB"})
                    </option>
                  ))}
                </select>
              </div>

              {addError && (
                <div style={{ color: "#dc2626", fontSize: "0.82rem", marginBottom: "1rem" }}>
                  {addError}
                </div>
              )}

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.5rem" }}>
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  style={{ background: "#f1f5f9", border: "1px solid #e2e8f0", padding: "0.5rem 1rem", borderRadius: "8px", fontSize: "0.85rem", fontWeight: 600, cursor: "pointer" }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isAdding}
                  style={{ background: "#2563eb", color: "#ffffff", border: "none", padding: "0.5rem 1.25rem", borderRadius: "8px", fontSize: "0.85rem", fontWeight: 700, cursor: "pointer" }}
                >
                  {isAdding ? "Adding..." : "Enroll Student"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Student Profile Modal */}
      {selectedStudentForProfile && (
        <StudentProfileModal
          student={selectedStudentForProfile}
          onClose={() => setSelectedStudentForProfile(null)}
        />
      )}
    </div>
  );
};
