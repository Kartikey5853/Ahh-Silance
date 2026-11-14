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
  Camera,
  CheckCircle2,
  RefreshCw,
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

  // Scanned Register State
  const [isScanningRegister, setIsScanningRegister] = useState(false);
  const [showRegisterScanModal, setShowRegisterScanModal] = useState(false);
  const [isImportingScanned, setIsImportingScanned] = useState(false);
  const [scannedRegisterData, setScannedRegisterData] = useState<{
    register_title: string;
    filename: string;
    preview_url: string;
    total_detected: number;
    students: Array<{
      roll_number: string;
      name: string;
      section?: string;
      parent_name?: string;
      parent_phone?: string;
      detected_marks?: string;
    }>;
  } | null>(null);

  const handleScanRegisterFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsScanningRegister(true);
    try {
      const res = await academicApi.scanRegister(file, subjects[0]?.id, classes[0]?.id);
      setScannedRegisterData(res);
      setShowRegisterScanModal(true);
    } catch (err: any) {
      alert("Register scan error: " + (err?.response?.data?.detail || err?.message || "Failed to scan physical register"));
    } finally {
      setIsScanningRegister(false);
      if (e.target) e.target.value = "";
    }
  };

  const handleImportScannedStudents = async () => {
    if (!scannedRegisterData || scannedRegisterData.students.length === 0) return;
    setIsImportingScanned(true);
    try {
      const res = await academicApi.batchImportStudents({
        subject_id: subjects[0]?.id,
        class_id: classes[0]?.id,
        students: scannedRegisterData.students
      });
      alert(`Successfully enrolled ${res.imported_count} students from scanned register!`);
      setShowRegisterScanModal(false);
      await loadInitialData();
    } catch (err: any) {
      alert("Batch import error: " + (err?.message || "Failed to import students"));
    } finally {
      setIsImportingScanned(false);
    }
  };

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
      let newStudent: Student;
      if (modalClassId) {
        newStudent = await academicApi.addStudentToClass(modalClassId, {
          name: studentName.trim(),
          roll_number: rollNumber.trim().toUpperCase(),
          section: section.trim() || "A",
          subject_id: targetSubjectId || undefined,
          attendance_percentage: 85.0,
          cgpa_or_percentage: 0.0
        });
      } else {
        newStudent = await academicApi.addStudent(targetSubjectId, {
          name: studentName.trim(),
          roll_number: rollNumber.trim().toUpperCase(),
          section: section.trim() || "A",
          class_id: modalClassId || undefined,
          attendance_percentage: 85.0,
          cgpa_or_percentage: 0.0
        });
      }
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

          <label
            style={{
              background: "#16a34a",
              color: "#ffffff",
              border: "none",
              borderRadius: "8px",
              padding: "0.5rem 0.95rem",
              fontSize: "0.82rem",
              fontWeight: 700,
              cursor: isScanningRegister ? "not-allowed" : "pointer",
              display: "flex",
              alignItems: "center",
              gap: "0.4rem",
              boxShadow: "0 2px 6px rgba(22,163,74,0.25)"
            }}
            title="Upload photo or scan of a physical student register sheet to extract and enroll all students"
          >
            {isScanningRegister ? (
              <RefreshCw size={14} className="spin" />
            ) : (
              <Camera size={15} />
            )}
            <span>{isScanningRegister ? "Scanning Register Image..." : "Scan Register Image"}</span>
            <input
              type="file"
              accept="image/*,application/pdf"
              disabled={isScanningRegister}
              onChange={handleScanRegisterFile}
              style={{ display: "none" }}
            />
          </label>
        </div>
      </div>

      {/* Scanned Register Banner */}
      {scannedRegisterData && (
        <div
          style={{
            background: "#f0fdf4",
            border: "1px solid #bbf7d0",
            borderRadius: "12px",
            padding: "0.85rem 1.25rem",
            marginBottom: "1rem",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: "0.75rem"
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "0.65rem" }}>
            <div style={{ width: "32px", height: "32px", borderRadius: "8px", background: "#dcfce7", color: "#16a34a", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Camera size={16} />
            </div>
            <div>
              <div style={{ fontSize: "0.88rem", fontWeight: 700, color: "#166534" }}>
                Scanned Register: {scannedRegisterData.register_title}
              </div>
              <div style={{ fontSize: "0.75rem", color: "#15803d" }}>
                {scannedRegisterData.students.length} students detected from {scannedRegisterData.filename}
              </div>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <button
              type="button"
              onClick={() => setShowRegisterScanModal(true)}
              style={{
                background: "#ffffff",
                border: "1px solid #86efac",
                color: "#166534",
                borderRadius: "6px",
                padding: "0.35rem 0.75rem",
                fontSize: "0.78rem",
                fontWeight: 700,
                cursor: "pointer"
              }}
            >
              View Scanned Register ({scannedRegisterData.students.length})
            </button>
            <button
              type="button"
              onClick={handleImportScannedStudents}
              disabled={isImportingScanned}
              style={{
                background: "#16a34a",
                color: "#ffffff",
                border: "none",
                borderRadius: "6px",
                padding: "0.35rem 0.85rem",
                fontSize: "0.78rem",
                fontWeight: 700,
                cursor: "pointer"
              }}
            >
              {isImportingScanned ? "Importing..." : "+ Import to Roster"}
            </button>
          </div>
        </div>
      )}

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

      {/* Scanned Register Inspector Modal */}
      {showRegisterScanModal && scannedRegisterData && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(15, 23, 42, 0.65)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
            padding: "1.5rem"
          }}
        >
          <div
            style={{
              background: "#ffffff",
              borderRadius: "16px",
              maxWidth: "960px",
              width: "100%",
              maxHeight: "90vh",
              display: "flex",
              flexDirection: "column",
              boxShadow: "0 25px 50px -12px rgba(15, 23, 42, 0.3)",
              overflow: "hidden"
            }}
          >
            {/* Modal Header */}
            <div
              style={{
                padding: "1.25rem 1.5rem",
                borderBottom: "1px solid #e2e8f0",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between"
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
                <div style={{ width: "36px", height: "36px", borderRadius: "8px", background: "#f0fdf4", color: "#16a34a", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Camera size={18} />
                </div>
                <div>
                  <h3 style={{ fontSize: "1.15rem", fontWeight: 800, color: "#0f172a", margin: 0 }}>
                    {scannedRegisterData.register_title}
                  </h3>
                  <div style={{ fontSize: "0.78rem", color: "#64748b" }}>
                    Scanned from {scannedRegisterData.filename} • {scannedRegisterData.students.length} students detected
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowRegisterScanModal(false)}
                style={{ background: "#f1f5f9", border: "none", borderRadius: "8px", padding: "0.4rem", cursor: "pointer", color: "#64748b" }}
              >
                <X size={16} />
              </button>
            </div>

            {/* Modal Body: Scanned Students Table */}
            <div style={{ padding: "1.25rem 1.5rem", overflowY: "auto", flex: 1 }}>
              {scannedRegisterData.preview_url && (
                <div style={{ marginBottom: "1rem", padding: "0.75rem", background: "#f8fafc", borderRadius: "10px", border: "1px solid #e2e8f0", display: "flex", alignItems: "center", gap: "0.75rem" }}>
                  <img
                    src={scannedRegisterData.preview_url}
                    alt="Scanned Register"
                    style={{ width: "70px", height: "70px", objectFit: "cover", borderRadius: "6px", border: "1px solid #cbd5e1" }}
                  />
                  <div>
                    <div style={{ fontSize: "0.82rem", fontWeight: 700, color: "#0f172a" }}>
                      Physical Register Sheet Preview
                    </div>
                    <div style={{ fontSize: "0.74rem", color: "#64748b" }}>
                      Gemini OCR parsed tabular columns, roll numbers, names, and recorded scores.
                    </div>
                  </div>
                </div>
              )}

              <div style={{ border: "1px solid #e2e8f0", borderRadius: "10px", overflow: "hidden" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.82rem", textAlign: "left" }}>
                  <thead>
                    <tr style={{ background: "#f8fafc", borderBottom: "1px solid #e2e8f0" }}>
                      <th style={{ padding: "0.6rem 0.85rem", color: "#64748b", fontWeight: 700 }}>Roll No</th>
                      <th style={{ padding: "0.6rem 0.85rem", color: "#64748b", fontWeight: 700 }}>Student Name</th>
                      <th style={{ padding: "0.6rem 0.85rem", color: "#64748b", fontWeight: 700 }}>Section</th>
                      <th style={{ padding: "0.6rem 0.85rem", color: "#64748b", fontWeight: 700 }}>Parent Details</th>
                      <th style={{ padding: "0.6rem 0.85rem", color: "#64748b", fontWeight: 700 }}>Detected Marks / Attendance</th>
                    </tr>
                  </thead>
                  <tbody>
                    {scannedRegisterData.students.map((st, sIdx) => (
                      <tr key={sIdx} style={{ borderBottom: "1px solid #f1f5f9" }}>
                        <td style={{ padding: "0.65rem 0.85rem" }}>
                          <input
                            type="text"
                            value={st.roll_number}
                            onChange={(e) => {
                              const val = e.target.value;
                              setScannedRegisterData((prev) => {
                                if (!prev) return null;
                                const next = [...prev.students];
                                next[sIdx] = { ...next[sIdx], roll_number: val };
                                return { ...prev, students: next };
                              });
                            }}
                            style={{
                              fontFamily: "monospace",
                              fontWeight: 700,
                              background: "#f1f5f9",
                              border: "1px solid #cbd5e1",
                              padding: "0.2rem 0.45rem",
                              borderRadius: "4px",
                              fontSize: "0.78rem",
                              width: "80px"
                            }}
                          />
                        </td>
                        <td style={{ padding: "0.65rem 0.85rem" }}>
                          <input
                            type="text"
                            value={st.name}
                            onChange={(e) => {
                              const val = e.target.value;
                              setScannedRegisterData((prev) => {
                                if (!prev) return null;
                                const next = [...prev.students];
                                next[sIdx] = { ...next[sIdx], name: val };
                                return { ...prev, students: next };
                              });
                            }}
                            style={{
                              fontWeight: 700,
                              color: "#0f172a",
                              border: "1px solid #cbd5e1",
                              borderRadius: "4px",
                              padding: "0.2rem 0.45rem",
                              fontSize: "0.82rem",
                              width: "100%",
                              maxWidth: "200px"
                            }}
                          />
                        </td>
                        <td style={{ padding: "0.65rem 0.85rem" }}>
                          <span style={{ background: "#eff6ff", color: "#1d4ed8", padding: "0.15rem 0.45rem", borderRadius: "4px", fontWeight: 700, fontSize: "0.74rem" }}>
                            Section {st.section || "A"}
                          </span>
                        </td>
                        <td style={{ padding: "0.65rem 0.85rem", color: "#64748b", fontSize: "0.76rem" }}>
                          {st.parent_name ? `${st.parent_name} (${st.parent_phone || "No phone"})` : (st.parent_phone || "—")}
                        </td>
                        <td style={{ padding: "0.65rem 0.85rem" }}>
                          {st.detected_marks ? (
                            <span style={{ background: "#f0fdf4", color: "#166534", padding: "0.15rem 0.5rem", borderRadius: "4px", fontWeight: 700, fontSize: "0.76rem" }}>
                              {st.detected_marks}
                            </span>
                          ) : (
                            <span style={{ color: "#94a3b8", fontSize: "0.76rem" }}>—</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Modal Footer */}
            <div
              style={{
                padding: "1rem 1.5rem",
                borderTop: "1px solid #e2e8f0",
                background: "#f8fafc",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between"
              }}
            >
              <div style={{ fontSize: "0.8rem", color: "#64748b" }}>
                Verify names and roll numbers, then click import to enroll into roster.
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <button
                  type="button"
                  onClick={() => setShowRegisterScanModal(false)}
                  style={{ background: "#ffffff", border: "1px solid #cbd5e1", borderRadius: "8px", padding: "0.45rem 0.95rem", fontSize: "0.82rem", fontWeight: 600, cursor: "pointer", color: "#334155" }}
                >
                  Close
                </button>
                <button
                  type="button"
                  onClick={handleImportScannedStudents}
                  disabled={isImportingScanned}
                  style={{ background: "#16a34a", color: "#ffffff", border: "none", borderRadius: "8px", padding: "0.45rem 1.15rem", fontSize: "0.82rem", fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: "0.35rem", boxShadow: "0 2px 6px rgba(22,163,74,0.25)" }}
                >
                  <CheckCircle2 size={15} />
                  <span>{isImportingScanned ? "Enrolling..." : `Import All ${scannedRegisterData.students.length} Students`}</span>
                </button>
              </div>
            </div>
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
