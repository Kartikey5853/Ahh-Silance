import React, { useState, useEffect } from "react";
import { academicApi } from "../api/academicApi";
import type { Subject, Student } from "../types/academic";
import {
  UserPlus,
  Trash2,
  Search,
  Users
} from "lucide-react";

interface StudentsRosterProps {
  initialSubjectId?: string;
  onNavigate: (tab: any, params?: any) => void;
}

export const StudentsRosterPage: React.FC<StudentsRosterProps> = ({
  initialSubjectId,
  onNavigate
}) => {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>(initialSubjectId || "");
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // One-by-one add student form state
  const [studentName, setStudentName] = useState("");
  const [rollNumber, setRollNumber] = useState("");
  const [section, setSection] = useState("A");
  const [isAdding, setIsAdding] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    academicApi.listSubjects().then((subjs) => {
      setSubjects(subjs);
      if (initialSubjectId && subjs.some((s) => s.id === initialSubjectId)) {
        setSelectedSubjectId(initialSubjectId);
      } else if (subjs.length > 0) {
        setSelectedSubjectId(subjs[0].id);
      }
    });
  }, [initialSubjectId]);

  useEffect(() => {
    if (selectedSubjectId) {
      loadStudents(selectedSubjectId);
    } else {
      setStudents([]);
    }
  }, [selectedSubjectId]);

  const loadStudents = async (subjId: string) => {
    setLoading(true);
    try {
      const data = await academicApi.listStudents(subjId);
      setStudents(data);
    } catch (err) {
      console.error("Failed to load students from SQLite:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentName.trim() || !rollNumber.trim()) {
      alert("Please provide both student name and roll number.");
      return;
    }
    if (!selectedSubjectId) {
      alert("Please select a subject first.");
      return;
    }

    setIsAdding(true);
    setSuccessMessage(null);

    try {
      // Real backend API call to SQLite
      const newStudent = await academicApi.addStudent(selectedSubjectId, {
        name: studentName.trim(),
        roll_number: rollNumber.trim().toUpperCase(),
        email: `${studentName.trim().toLowerCase()}@ace.edu`,
        section: section
      });

      setStudents([...students, newStudent]);
      setSuccessMessage(`✓ Student ${newStudent.name} (${newStudent.roll_number}) saved to database!`);
      setStudentName("");
      setRollNumber("");
      setTimeout(() => setSuccessMessage(null), 3500);
    } catch (err) {
      alert("Error adding student. Please check backend connection.");
    } finally {
      setIsAdding(false);
    }
  };

  const handleDelete = async (studentId: string, name: string) => {
    if (!confirm(`Are you sure you want to delete ${name}?`)) return;
    try {
      await academicApi.deleteStudent(studentId);
      setStudents(students.filter((s) => s.id !== studentId));
    } catch (err) {
      alert("Failed to delete student.");
    }
  };

  // Quick preset helper for the 3 students requested: Ram, Sham, Gyan
  const handleQuickPreset = (presetName: string, presetRoll: string) => {
    setStudentName(presetName);
    setRollNumber(presetRoll);
  };

  const currentSubject = subjects.find((s) => s.id === selectedSubjectId);
  const filteredStudents = students.filter(
    (s) =>
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.roll_number.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="students-roster-page pb-24">
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1.5rem", flexWrap: "wrap", gap: "1rem" }}>
        <div>
          <h1 style={{ fontSize: "1.75rem", fontWeight: 800, color: "#0f172a", letterSpacing: "-0.03em" }}>
            Student Enrollment Roster
          </h1>
          <p style={{ color: "#64748b", fontSize: "0.9rem" }}>
            Real-time SQLite database: enroll students one-by-one per subject
          </p>
        </div>

        {/* Subject Dropdown */}
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <label style={{ fontSize: "0.85rem", fontWeight: 700, color: "#334155" }}>
            Subject:
          </label>
          {subjects.length === 0 ? (
            <button
              onClick={() => onNavigate("dashboard")}
              className="btn btn-primary"
              style={{ fontSize: "0.82rem", padding: "0.4rem 0.8rem" }}
            >
              + Create Subject First
            </button>
          ) : (
            <select
              value={selectedSubjectId}
              onChange={(e) => setSelectedSubjectId(e.target.value)}
              style={{
                padding: "0.5rem 0.85rem",
                borderRadius: "8px",
                border: "1px solid #cbd5e1",
                fontWeight: 600,
                fontSize: "0.9rem"
              }}
            >
              {subjects.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.code}) - {s.semester_or_grade}
                </option>
              ))}
            </select>
          )}
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: "1.5rem" }}>
        {/* LEFT COLUMN: Add Student One-By-One Form */}
        <div
          style={{
            background: "#ffffff",
            border: "1px solid #e2e8f0",
            borderRadius: "12px",
            padding: "1.5rem",
            height: "fit-content"
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.35rem" }}>
            <UserPlus size={18} style={{ color: "#2563eb" }} />
            <h3 style={{ fontSize: "1.15rem", fontWeight: 800, color: "#0f172a" }}>Add Student</h3>
          </div>
          <p style={{ fontSize: "0.82rem", color: "#64748b", marginBottom: "1rem" }}>
            Target Course: <strong>{currentSubject?.name || "Select Subject"}</strong>
          </p>

          {/* Quick preset buttons for Ram, Sham, Gyan */}
          <div style={{ background: "#f8fafc", borderRadius: "8px", padding: "0.6rem 0.75rem", marginBottom: "1rem", border: "1px solid #e2e8f0" }}>
            <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "#475569", marginBottom: "0.35rem" }}>
              Quick Fill:
            </div>
            <div style={{ display: "flex", gap: "0.4rem" }}>
              <button
                type="button"
                onClick={() => handleQuickPreset("Ram", "ACE-101")}
                style={{ padding: "0.25rem 0.6rem", background: "#ffffff", border: "1px solid #cbd5e1", borderRadius: "6px", fontSize: "0.78rem", fontWeight: 600, cursor: "pointer" }}
              >
                Ram
              </button>
              <button
                type="button"
                onClick={() => handleQuickPreset("Sham", "ACE-102")}
                style={{ padding: "0.25rem 0.6rem", background: "#ffffff", border: "1px solid #cbd5e1", borderRadius: "6px", fontSize: "0.78rem", fontWeight: 600, cursor: "pointer" }}
              >
                Sham
              </button>
              <button
                type="button"
                onClick={() => handleQuickPreset("Gyan", "ACE-103")}
                style={{ padding: "0.25rem 0.6rem", background: "#ffffff", border: "1px solid #cbd5e1", borderRadius: "6px", fontSize: "0.78rem", fontWeight: 600, cursor: "pointer" }}
              >
                Gyan
              </button>
            </div>
          </div>

          <form onSubmit={handleAddStudent}>
            <div style={{ marginBottom: "0.85rem" }}>
              <label style={{ display: "block", fontSize: "0.78rem", fontWeight: 700, marginBottom: "0.3rem" }}>
                Student Name *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Ram"
                value={studentName}
                onChange={(e) => setStudentName(e.target.value)}
                style={{ width: "100%", padding: "0.5rem 0.75rem", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "0.88rem" }}
              />
            </div>

            <div style={{ marginBottom: "0.85rem" }}>
              <label style={{ display: "block", fontSize: "0.78rem", fontWeight: 700, marginBottom: "0.3rem" }}>
                Roll Number *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. ACE-101"
                value={rollNumber}
                onChange={(e) => setRollNumber(e.target.value)}
                style={{ width: "100%", padding: "0.5rem 0.75rem", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "0.88rem" }}
              />
            </div>

            <div style={{ marginBottom: "1.25rem" }}>
              <label style={{ display: "block", fontSize: "0.78rem", fontWeight: 700, marginBottom: "0.3rem" }}>
                Section
              </label>
              <select
                value={section}
                onChange={(e) => setSection(e.target.value)}
                style={{ width: "100%", padding: "0.5rem 0.75rem", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "0.88rem" }}
              >
                <option value="A">Section A</option>
                <option value="B">Section B</option>
                <option value="C">Section C</option>
              </select>
            </div>

            <button
              type="submit"
              disabled={isAdding || !selectedSubjectId}
              className="btn btn-primary"
              style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: "0.4rem" }}
            >
              <UserPlus size={16} />
              {isAdding ? "Saving to Database..." : "Add Student"}
            </button>

            {successMessage && (
              <div style={{ marginTop: "0.85rem", padding: "0.6rem 0.75rem", background: "#f0fdf4", border: "1px solid #bbf7d0", color: "#166534", borderRadius: "6px", fontSize: "0.82rem" }}>
                {successMessage}
              </div>
            )}
          </form>
        </div>

        {/* RIGHT COLUMN: Real Enrolled Students List */}
        <div
          style={{
            background: "#ffffff",
            border: "1px solid #e2e8f0",
            borderRadius: "12px",
            padding: "1.5rem"
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem", flexWrap: "wrap", gap: "0.75rem" }}>
            <div>
              <h3 style={{ fontSize: "1.2rem", fontWeight: 800, color: "#0f172a" }}>
                Enrolled Students ({students.length})
              </h3>
              <p style={{ fontSize: "0.82rem", color: "#64748b" }}>
                Stored in SQLite `students` table
              </p>
            </div>

            {students.length > 0 && (
              <div style={{ position: "relative", minWidth: "200px" }}>
                <Search size={15} style={{ position: "absolute", left: "10px", top: "50%", transform: "translateY(-50%)", color: "#94a3b8" }} />
                <input
                  type="text"
                  placeholder="Filter name or roll #..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "0.45rem 0.65rem 0.45rem 2rem",
                    borderRadius: "6px",
                    border: "1px solid #cbd5e1",
                    fontSize: "0.85rem"
                  }}
                />
              </div>
            )}
          </div>

          {loading ? (
            <div style={{ textAlign: "center", padding: "2.5rem", color: "#64748b" }}>
              Loading students from SQLite database...
            </div>
          ) : filteredStudents.length === 0 ? (
            <div style={{ textAlign: "center", padding: "3rem 1.5rem", color: "#64748b" }}>
              <Users size={36} style={{ color: "#cbd5e1", margin: "0 auto 0.75rem" }} />
              <div style={{ fontWeight: 600, color: "#334155" }}>
                {students.length === 0
                  ? "No students enrolled in this subject yet."
                  : "No students matching your search."}
              </div>
              <p style={{ fontSize: "0.85rem", color: "#64748b", marginTop: "0.25rem" }}>
                Use the form on the left to add <strong>Ram</strong>, <strong>Sham</strong>, and <strong>Gyan</strong>.
              </p>
            </div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.88rem" }}>
                <thead>
                  <tr style={{ borderBottom: "2px solid #e2e8f0", textAlign: "left" }}>
                    <th style={{ padding: "0.6rem 0.75rem", color: "#64748b", fontSize: "0.78rem" }}>ROLL NUMBER</th>
                    <th style={{ padding: "0.6rem 0.75rem", color: "#64748b", fontSize: "0.78rem" }}>CANDIDATE NAME</th>
                    <th style={{ padding: "0.6rem 0.75rem", color: "#64748b", fontSize: "0.78rem" }}>SECTION</th>
                    <th style={{ padding: "0.6rem 0.75rem", textAlign: "right", color: "#64748b", fontSize: "0.78rem" }}>ACTION</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredStudents.map((st) => (
                    <tr key={st.id} style={{ borderBottom: "1px solid #e2e8f0" }}>
                      <td style={{ padding: "0.75rem", fontWeight: 700, color: "#0f172a" }}>
                        {st.roll_number}
                      </td>
                      <td style={{ padding: "0.75rem", fontWeight: 600, color: "#1e293b" }}>
                        {st.name}
                      </td>
                      <td style={{ padding: "0.75rem" }}>
                        <span style={{ background: "#f1f5f9", padding: "0.2rem 0.5rem", borderRadius: "4px", fontSize: "0.78rem" }}>
                          {st.section || "A"}
                        </span>
                      </td>
                      <td style={{ padding: "0.75rem", textAlign: "right" }}>
                        <button
                          onClick={() => handleDelete(st.id, st.name)}
                          style={{ background: "none", border: "none", color: "#dc2626", cursor: "pointer", padding: "0.25rem" }}
                          title="Remove student from database"
                        >
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
