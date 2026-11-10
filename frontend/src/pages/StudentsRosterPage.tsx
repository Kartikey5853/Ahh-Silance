import React, { useState, useEffect } from "react";
import { academicApi } from "../api/academicApi";
import type { Subject, Student, ClassItem } from "../types/academic";
import { StudentProfileModal } from "../components/StudentProfileModal";
import {
  UserPlus,
  Trash2,
  Search,
  Users,
  RefreshCw,
  ExternalLink,
  X,
  Filter
} from "lucide-react";

interface StudentsRosterProps {
  initialSubjectId?: string;
  onNavigate: (tab: any, params?: any) => void;
}

export const StudentsRosterPage: React.FC<StudentsRosterProps> = ({
  initialSubjectId,
  onNavigate
}) => {
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<string>("");
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>(initialSubjectId || "");
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(false);
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
      const [classList, subjList] = await Promise.all([
        academicApi.listClasses(),
        academicApi.listSubjects()
      ]);
      setClasses(classList);
      setSubjects(subjList);

      if (classList.length > 0) {
        setModalClassId(classList[0].id);
      }
      if (subjList.length > 0) {
        setModalSubjectId(subjList[0].id);
        if (initialSubjectId && subjList.some((s) => s.id === initialSubjectId)) {
          setSelectedSubjectId(initialSubjectId);
        }
      }
    } catch (err) {
      console.error("Failed to load classes and subjects:", err);
    }
  };

  useEffect(() => {
    loadInitialData();
  }, [initialSubjectId]);

  const loadStudents = async () => {
    setLoading(true);
    try {
      const data = await academicApi.listAllStudents(
        selectedClassId || undefined,
        selectedSubjectId || undefined
      );
      setStudents(data);
    } catch (err) {
      console.error("Failed to load students:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStudents();
  }, [selectedClassId, selectedSubjectId]);

  const handleAddStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentName.trim() || !rollNumber.trim()) {
      setAddError("Please provide both student name and roll number.");
      return;
    }
    const targetSubjectId = modalSubjectId || selectedSubjectId;
    if (!targetSubjectId) {
      setAddError("Please select a subject to enroll the student.");
      return;
    }

    setIsAdding(true);
    setAddError(null);

    try {
      const newStudent = await academicApi.addStudent(targetSubjectId, {
        name: studentName.trim(),
        roll_number: rollNumber.trim().toUpperCase(),
        email: `${studentName.trim().toLowerCase().replace(/\s+/g, ".")}@institution.edu`,
        section: section,
        class_id: modalClassId || selectedClassId || undefined
      });

      setStudents((prev) => [newStudent, ...prev]);
      setShowAddModal(false);
      setStudentName("");
      setRollNumber("");
      setSection("A");
    } catch (err) {
      setAddError("Failed to add student. Please verify backend connection.");
    } finally {
      setIsAdding(false);
    }
  };

  const handleDelete = async (studentId: string, name: string) => {
    if (!confirm(`Are you sure you want to delete ${name}?`)) return;
    try {
      await academicApi.deleteStudent(studentId);
      setStudents((prev) => prev.filter((s) => s.id !== studentId));
    } catch (err) {
      alert("Failed to delete student.");
    }
  };

  const filteredStudents = students.filter(
    (s) =>
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.roll_number.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="students-roster-page pb-24" style={{ maxWidth: "1280px", margin: "0 auto", padding: "0 1rem" }}>
      {/* Top Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1.5rem", flexWrap: "wrap", gap: "1rem" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
            <h1 style={{ fontSize: "1.75rem", fontWeight: 800, color: "#0f172a", letterSpacing: "-0.03em", margin: 0 }}>
              Student Roster
            </h1>
            <span
              style={{
                background: "#e0f2fe",
                color: "#0369a1",
                fontSize: "0.75rem",
                fontWeight: 700,
                padding: "0.2rem 0.65rem",
                borderRadius: "9999px"
              }}
            >
              {filteredStudents.length} {filteredStudents.length === 1 ? "student" : "students"}
            </span>
          </div>
          <p style={{ color: "#64748b", fontSize: "0.88rem", marginTop: "0.25rem", margin: 0 }}>
            Master list of enrolled students, cohort allocations, and evaluation profiles
          </p>
        </div>

        <button
          onClick={() => {
            setAddError(null);
            setShowAddModal(true);
          }}
          className="btn btn-primary"
          style={{ display: "flex", alignItems: "center", gap: "0.45rem", padding: "0.6rem 1.1rem", fontSize: "0.88rem", borderRadius: "8px" }}
        >
          <UserPlus size={16} />
          Add Student
        </button>
      </div>

      {/* Vantis-Style Filters & Search Bar */}
      <div
        style={{
          background: "#ffffff",
          border: "1px solid #e2e8f0",
          borderRadius: "12px",
          padding: "0.75rem 1rem",
          marginBottom: "1.25rem",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: "0.75rem",
          boxShadow: "0 1px 3px rgba(0, 0, 0, 0.04)"
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", flex: 1, minWidth: "260px" }}>
          <div style={{ position: "relative", width: "100%", maxWidth: "340px" }}>
            <Search
              size={16}
              style={{ position: "absolute", left: "0.75rem", top: "50%", transform: "translateY(-50%)", color: "#94a3b8" }}
            />
            <input
              type="text"
              placeholder="Search by student name or roll number..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
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

          {/* Filter by Class */}
          <div style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}>
            <Filter size={14} style={{ color: "#64748b" }} />
            <select
              value={selectedClassId}
              onChange={(e) => setSelectedClassId(e.target.value)}
              style={{
                padding: "0.5rem 0.75rem",
                borderRadius: "8px",
                border: "1px solid #cbd5e1",
                fontSize: "0.85rem",
                background: "#ffffff",
                color: "#1e293b",
                fontWeight: 500
              }}
            >
              <option value="">Class: All</option>
              {classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.code || "SEC"})
                </option>
              ))}
            </select>
          </div>

          {/* Filter by Subject */}
          <div>
            <select
              value={selectedSubjectId}
              onChange={(e) => setSelectedSubjectId(e.target.value)}
              style={{
                padding: "0.5rem 0.75rem",
                borderRadius: "8px",
                border: "1px solid #cbd5e1",
                fontSize: "0.85rem",
                background: "#ffffff",
                color: "#1e293b",
                fontWeight: 500
              }}
            >
              <option value="">Subject: All</option>
              {subjects.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.code})
                </option>
              ))}
            </select>
          </div>
        </div>

        <button
          onClick={loadStudents}
          title="Refresh List"
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.35rem",
            padding: "0.5rem 0.75rem",
            background: "#f8fafc",
            border: "1px solid #cbd5e1",
            borderRadius: "8px",
            color: "#475569",
            fontSize: "0.85rem",
            cursor: "pointer",
            fontWeight: 500
          }}
        >
          <RefreshCw size={14} className={loading ? "spin" : ""} />
          Refresh
        </button>
      </div>

      {/* Vantis Data Table */}
      <div
        style={{
          background: "#ffffff",
          border: "1px solid #e2e8f0",
          borderRadius: "14px",
          overflow: "hidden",
          boxShadow: "0 1px 4px rgba(0, 0, 0, 0.04)"
        }}
      >
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
            <thead>
              <tr style={{ background: "#f8fafc", borderBottom: "1px solid #e2e8f0" }}>
                <th style={{ padding: "0.85rem 1rem", fontSize: "0.75rem", fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em", width: "50px" }}>
                  #
                </th>
                <th style={{ padding: "0.85rem 1rem", fontSize: "0.75rem", fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                  Student
                </th>
                <th style={{ padding: "0.85rem 1rem", fontSize: "0.75rem", fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                  Roll Number
                </th>
                <th style={{ padding: "0.85rem 1rem", fontSize: "0.75rem", fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                  Section
                </th>
                <th style={{ padding: "0.85rem 1rem", fontSize: "0.75rem", fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                  Subject
                </th>
                <th style={{ padding: "0.85rem 1rem", fontSize: "0.75rem", fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em", textAlign: "right" }}>
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ padding: "3rem 1.5rem", textAlign: "center", color: "#64748b" }}>
                    <div style={{ display: "inline-flex", padding: "1rem", background: "#f1f5f9", borderRadius: "50%", color: "#94a3b8", marginBottom: "0.75rem" }}>
                      <Users size={32} />
                    </div>
                    <div style={{ fontSize: "1rem", fontWeight: 700, color: "#0f172a", marginBottom: "0.25rem" }}>
                      No Students Found
                    </div>
                    <p style={{ fontSize: "0.85rem", color: "#64748b", margin: 0, marginBottom: "1rem" }}>
                      {searchQuery ? "No enrolled students matched your search." : "Begin by enrolling students into your subject or class."}
                    </p>
                    <button
                      onClick={() => setShowAddModal(true)}
                      className="btn btn-primary"
                      style={{ fontSize: "0.85rem", padding: "0.5rem 1rem" }}
                    >
                      + Add First Student
                    </button>
                  </td>
                </tr>
              ) : (
                filteredStudents.map((stud, idx) => {
                  const subj = subjects.find((s) => s.id === stud.subject_id);

                  return (
                    <tr
                      key={stud.id}
                      style={{
                        borderBottom: "1px solid #f1f5f9",
                        transition: "background 0.15s ease"
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#f8fafc")}
                      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "#ffffff")}
                    >
                      <td style={{ padding: "0.85rem 1rem", fontSize: "0.85rem", color: "#94a3b8", fontWeight: 600 }}>
                        {idx + 1}
                      </td>
                      <td style={{ padding: "0.85rem 1rem" }}>
                        <div>
                          <div
                            onClick={() => setSelectedStudentForProfile(stud)}
                            style={{
                              fontWeight: 700,
                              color: "#0f172a",
                              fontSize: "0.9rem",
                              cursor: "pointer",
                              textDecoration: "none"
                            }}
                            onMouseEnter={(e) => ((e.target as HTMLElement).style.textDecoration = "underline")}
                            onMouseLeave={(e) => ((e.target as HTMLElement).style.textDecoration = "none")}
                          >
                            {stud.name}
                          </div>
                          <div style={{ fontSize: "0.75rem", color: "#64748b" }}>
                            {stud.email || "No email"}
                          </div>
                        </div>
                      </td>
                      <td style={{ padding: "0.85rem 1rem" }}>
                        <span
                          style={{
                            fontFamily: "monospace",
                            fontWeight: 700,
                            color: "#1e293b",
                            fontSize: "0.85rem",
                            background: "#f1f5f9",
                            padding: "0.2rem 0.5rem",
                            borderRadius: "6px"
                          }}
                        >
                          {stud.roll_number}
                        </span>
                      </td>
                      <td style={{ padding: "0.85rem 1rem" }}>
                        <span
                          style={{
                            background: "#e2e8f0",
                            color: "#334155",
                            padding: "0.2rem 0.55rem",
                            borderRadius: "6px",
                            fontSize: "0.75rem",
                            fontWeight: 600
                          }}
                        >
                          Section {stud.section || "A"}
                        </span>
                      </td>
                      <td style={{ padding: "0.85rem 1rem" }}>
                        <div style={{ fontSize: "0.85rem", fontWeight: 600, color: "#1e293b" }}>
                          {subj?.name || "Subject"}
                        </div>
                        <div style={{ fontSize: "0.75rem", color: "#64748b" }}>
                          {subj?.code || ""}
                        </div>
                      </td>
                      <td style={{ padding: "0.85rem 1rem", textAlign: "right" }}>
                        <div style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem" }}>
                          <button
                            onClick={() => setSelectedStudentForProfile(stud)}
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "0.3rem",
                              padding: "0.35rem 0.75rem",
                              background: "#f8fafc",
                              border: "1px solid #cbd5e1",
                              borderRadius: "6px",
                              color: "#0369a1",
                              fontSize: "0.78rem",
                              fontWeight: 600,
                              cursor: "pointer"
                            }}
                          >
                            <ExternalLink size={13} />
                            Scorecards
                          </button>
                          <button
                            onClick={() => handleDelete(stud.id, stud.name)}
                            title="Delete Student"
                            style={{
                              padding: "0.35rem",
                              background: "transparent",
                              border: "none",
                              color: "#ef4444",
                              cursor: "pointer",
                              borderRadius: "4px"
                            }}
                          >
                            <Trash2 size={16} />
                          </button>
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

      {/* Add Student Modal */}
      {showAddModal && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(15, 23, 42, 0.6)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1050,
            padding: "1rem"
          }}
        >
          <div
            style={{
              background: "#ffffff",
              borderRadius: "16px",
              padding: "2rem",
              width: "100%",
              maxWidth: "500px",
              boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.2)"
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <div style={{ padding: "0.45rem", background: "#e0f2fe", color: "#0284c7", borderRadius: "8px" }}>
                  <UserPlus size={18} />
                </div>
                <div>
                  <h3 style={{ fontSize: "1.15rem", fontWeight: 800, color: "#0f172a", margin: 0 }}>
                    Add Student
                  </h3>
                  <p style={{ fontSize: "0.8rem", color: "#64748b", margin: 0 }}>
                    Enroll student into class cohort and subject roster
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                style={{ background: "transparent", border: "none", color: "#64748b", cursor: "pointer" }}
              >
                <X size={18} />
              </button>
            </div>

            {addError && (
              <div style={{ marginBottom: "1rem", padding: "0.6rem 0.75rem", background: "#fef2f2", border: "1px solid #fecaca", color: "#dc2626", borderRadius: "8px", fontSize: "0.82rem" }}>
                {addError}
              </div>
            )}

            <form onSubmit={handleAddStudent}>
              <div style={{ marginBottom: "1rem" }}>
                <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 700, marginBottom: "0.3rem" }}>
                  Student Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Maya Sharma"
                  value={studentName}
                  onChange={(e) => setStudentName(e.target.value)}
                  style={{ width: "100%", padding: "0.55rem 0.75rem", borderRadius: "8px", border: "1px solid #cbd5e1", fontSize: "0.9rem" }}
                />
              </div>

              <div style={{ marginBottom: "1rem" }}>
                <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 700, marginBottom: "0.3rem" }}>
                  Roll Number *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 21BCE1042"
                  value={rollNumber}
                  onChange={(e) => setRollNumber(e.target.value)}
                  style={{ width: "100%", padding: "0.55rem 0.75rem", borderRadius: "8px", border: "1px solid #cbd5e1", fontSize: "0.9rem" }}
                />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "1rem" }}>
                <div>
                  <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 700, marginBottom: "0.3rem" }}>
                    Section
                  </label>
                  <select
                    value={section}
                    onChange={(e) => setSection(e.target.value)}
                    style={{ width: "100%", padding: "0.55rem 0.75rem", borderRadius: "8px", border: "1px solid #cbd5e1", fontSize: "0.88rem" }}
                  >
                    <option value="A">Section A</option>
                    <option value="B">Section B</option>
                    <option value="C">Section C</option>
                    <option value="D">Section D</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 700, marginBottom: "0.3rem" }}>
                    Class / Cohort
                  </label>
                  <select
                    value={modalClassId}
                    onChange={(e) => setModalClassId(e.target.value)}
                    style={{ width: "100%", padding: "0.55rem 0.75rem", borderRadius: "8px", border: "1px solid #cbd5e1", fontSize: "0.88rem" }}
                  >
                    <option value="">No Class</option>
                    {classes.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div style={{ marginBottom: "1.5rem" }}>
                <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 700, marginBottom: "0.3rem" }}>
                  Subject *
                </label>
                {subjects.length === 0 ? (
                  <p style={{ fontSize: "0.82rem", color: "#ef4444" }}>
                    Please create a subject first before enrolling students.
                  </p>
                ) : (
                  <select
                    value={modalSubjectId}
                    onChange={(e) => setModalSubjectId(e.target.value)}
                    style={{ width: "100%", padding: "0.55rem 0.75rem", borderRadius: "8px", border: "1px solid #cbd5e1", fontSize: "0.88rem" }}
                  >
                    {subjects.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({s.code}) - {s.semester_or_grade}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.75rem" }}>
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  style={{
                    padding: "0.55rem 1rem",
                    borderRadius: "8px",
                    border: "1px solid #cbd5e1",
                    background: "#f8fafc",
                    color: "#475569",
                    fontWeight: 600,
                    fontSize: "0.88rem",
                    cursor: "pointer"
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isAdding || subjects.length === 0}
                  className="btn btn-primary"
                  style={{ padding: "0.55rem 1.25rem", borderRadius: "8px", fontSize: "0.88rem" }}
                >
                  {isAdding ? "Saving..." : "Enroll Student"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Student Profile & Scorecard Modal */}
      {selectedStudentForProfile && (
        <StudentProfileModal
          student={selectedStudentForProfile}
          onClose={() => setSelectedStudentForProfile(null)}
          onStudentUpdated={() => loadStudents()}
          onNavigateToEvaluation={(evalId) => onNavigate("evaluation", { initialEvalId: evalId })}
        />
      )}
    </div>
  );
};
