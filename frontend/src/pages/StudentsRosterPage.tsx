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
  X,
  Filter,
  FolderGit2
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

  const handleOpenAddModal = (presetClassId?: string) => {
    setAddError(null);
    setStudentName("");
    setRollNumber("");
    setSection("A");
    if (presetClassId) {
      setModalClassId(presetClassId);
    } else if (classes.length > 0) {
      setModalClassId(classes[0].id);
    }
    if (subjects.length > 0) {
      setModalSubjectId(subjects[0].id);
    }
    setShowAddModal(true);
  };

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
      await academicApi.addStudent(targetSubjectId, {
        name: studentName.trim(),
        roll_number: rollNumber.trim().toUpperCase(),
        section: section.trim() || "A",
        class_id: modalClassId || selectedClassId || undefined
      });

      setShowAddModal(false);
      setStudentName("");
      setRollNumber("");
      await loadStudents();
    } catch (err: any) {
      setAddError(err?.response?.data?.detail || "Failed to add student. Ensure roll number is unique.");
    } finally {
      setIsAdding(false);
    }
  };

  const handleDelete = async (studentId: string, name: string) => {
    if (!window.confirm(`Are you sure you want to remove ${name} from this roster?`)) return;
    try {
      await academicApi.deleteStudent(studentId);
      await loadStudents();
    } catch (err) {
      alert("Failed to delete student.");
    }
  };

  const filteredStudents = students.filter((s) => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    return (
      s.name.toLowerCase().includes(q) ||
      s.roll_number.toLowerCase().includes(q) ||
      (s.email && s.email.toLowerCase().includes(q))
    );
  });

  // Group students by Class
  const classMap = new Map<string, Student[]>();
  const unassignedStudents: Student[] = [];

  classes.forEach((c) => {
    classMap.set(c.id, []);
  });

  filteredStudents.forEach((stud) => {
    if (stud.class_id && classMap.has(stud.class_id)) {
      classMap.get(stud.class_id)!.push(stud);
    } else {
      unassignedStudents.push(stud);
    }
  });

  return (
    <div className="students-roster-page pb-28">
      {/* Header Bar */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "1rem", marginBottom: "1.5rem" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
            <h1 style={{ fontSize: "1.85rem", fontWeight: 900, color: "#0f172a", letterSpacing: "-0.03em", margin: 0 }}>
              Students & Cohorts
            </h1>
            <span
              style={{
                background: "#e0e7ff",
                color: "#3730a3",
                fontSize: "0.78rem",
                fontWeight: 700,
                padding: "0.25rem 0.65rem",
                borderRadius: "9999px"
              }}
            >
              {filteredStudents.length} Students Total
            </span>
          </div>
          <p style={{ color: "#64748b", fontSize: "0.88rem", marginTop: "0.3rem", margin: 0 }}>
            Students clustered by classes and cohorts. Click any student to review full evaluation performance.
          </p>
        </div>

        <button
          onClick={() => handleOpenAddModal()}
          className="btn btn-primary"
          style={{ display: "flex", alignItems: "center", gap: "0.45rem", padding: "0.6rem 1.1rem", fontSize: "0.88rem", borderRadius: "8px" }}
        >
          <UserPlus size={16} />
          Add Student
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
            <Search
              size={16}
              style={{ position: "absolute", left: "0.75rem", top: "50%", transform: "translateY(-50%)", color: "#94a3b8" }}
            />
            <input
              type="text"
              placeholder="Search student name or roll number..."
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
              <option value="">Class: All Cohorts</option>
              {classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

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
              <option value="">Subject: All Subjects</option>
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

      {/* Class Selector Boxes Grid */}
      {classes.length > 0 && (
        <div style={{ marginBottom: "1.75rem" }}>
          <div style={{ fontSize: "0.82rem", fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "0.75rem" }}>
            Select Class Cohort
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: "1rem" }}>
            {/* "All Classes" Card */}
            <div
              onClick={() => setSelectedClassId("")}
              style={{
                background: selectedClassId === "" ? "#eff6ff" : "#ffffff",
                border: selectedClassId === "" ? "2px solid #2563eb" : "1px solid #e2e8f0",
                borderRadius: "14px",
                padding: "1rem 1.25rem",
                cursor: "pointer",
                transition: "all 0.15s ease",
                boxShadow: selectedClassId === "" ? "0 4px 12px rgba(37, 99, 235, 0.12)" : "0 1px 3px rgba(0, 0, 0, 0.03)"
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.35rem" }}>
                <span style={{ fontSize: "0.95rem", fontWeight: 800, color: selectedClassId === "" ? "#1d4ed8" : "#0f172a" }}>
                  All Classes & Cohorts
                </span>
                <span style={{ fontSize: "0.75rem", fontWeight: 700, background: selectedClassId === "" ? "#dbeafe" : "#f1f5f9", color: selectedClassId === "" ? "#1e40af" : "#475569", padding: "0.15rem 0.5rem", borderRadius: "9999px" }}>
                  {filteredStudents.length}
                </span>
              </div>
              <div style={{ fontSize: "0.78rem", color: "#64748b" }}>
                Overview across all batches
              </div>
            </div>

            {/* Individual Class Cards */}
            {classes.map((cls) => {
              const count = (classMap.get(cls.id) || []).length;
              const isSelected = selectedClassId === cls.id;
              return (
                <div
                  key={cls.id}
                  onClick={() => setSelectedClassId(isSelected ? "" : cls.id)}
                  style={{
                    background: isSelected ? "#eff6ff" : "#ffffff",
                    border: isSelected ? "2px solid #2563eb" : "1px solid #e2e8f0",
                    borderRadius: "14px",
                    padding: "1rem 1.25rem",
                    cursor: "pointer",
                    transition: "all 0.15s ease",
                    boxShadow: isSelected ? "0 4px 12px rgba(37, 99, 235, 0.12)" : "0 1px 3px rgba(0, 0, 0, 0.03)"
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "0.35rem" }}>
                    <div>
                      <div style={{ fontSize: "0.95rem", fontWeight: 800, color: isSelected ? "#1d4ed8" : "#0f172a" }}>
                        {cls.name}
                      </div>
                      <div style={{ fontSize: "0.75rem", fontWeight: 600, color: "#64748b" }}>
                        {cls.department || "General"} • {cls.code || "Cohort"}
                      </div>
                    </div>
                    <span style={{ fontSize: "0.75rem", fontWeight: 700, background: isSelected ? "#dbeafe" : "#f1f5f9", color: isSelected ? "#1e40af" : "#475569", padding: "0.15rem 0.5rem", borderRadius: "9999px" }}>
                      {count} {count === 1 ? "Student" : "Students"}
                    </span>
                  </div>
                  <div style={{ fontSize: "0.72rem", color: "#94a3b8", marginTop: "0.4rem" }}>
                    {cls.academic_year || "2026-2027"}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* CLUSTERED BY CLASS BOXES */}
      {loading ? (
        <div style={{ textAlign: "center", padding: "4rem", color: "#64748b" }}>
          Loading student rosters...
        </div>
      ) : classes.length === 0 && unassignedStudents.length === 0 ? (
        <div style={{ background: "#ffffff", border: "2px dashed #cbd5e1", borderRadius: "16px", padding: "4rem 2rem", textAlign: "center" }}>
          <Users size={48} style={{ color: "#94a3b8", margin: "0 auto 1rem" }} />
          <h3 style={{ fontSize: "1.25rem", fontWeight: 800, color: "#0f172a", marginBottom: "0.4rem" }}>
            No Classes or Students Found
          </h3>
          <p style={{ color: "#64748b", fontSize: "0.9rem", maxWidth: "460px", margin: "0 auto 1.5rem" }}>
            Create your first academic class or batch in Dashboard, then enroll students to track evaluations.
          </p>
          <button onClick={() => onNavigate("dashboard")} className="btn btn-primary">
            Go to Dashboard
          </button>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "1.75rem" }}>
          {/* Loop over each Class and render its container box */}
          {classes.map((cls) => {
            const classStudents = classMap.get(cls.id) || [];
            // If class filter is applied and does not match, skip
            if (selectedClassId && selectedClassId !== cls.id) return null;

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
                {/* Class Box Header */}
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
                          {classStudents.length} {classStudents.length === 1 ? "Student" : "Students"}
                        </span>
                      </div>
                      <div style={{ fontSize: "0.8rem", color: "#64748b", marginTop: "0.2rem" }}>
                        Department: {cls.department || "General"} • Academic Year: {cls.academic_year || "2026-2027"}
                        {cls.start_date ? ` • Sem: ${cls.start_date} to ${cls.end_date || "Upcoming"}` : ""}
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => handleOpenAddModal(cls.id)}
                    className="btn btn-secondary"
                    style={{ fontSize: "0.82rem", display: "flex", alignItems: "center", gap: "0.35rem", padding: "0.45rem 0.85rem" }}
                  >
                    <UserPlus size={14} /> Add Student to this Class
                  </button>
                </div>

                {/* Students List in this Class */}
                {classStudents.length === 0 ? (
                  <div style={{ padding: "2.5rem 1.5rem", textAlign: "center", color: "#64748b", fontSize: "0.88rem" }}>
                    No students enrolled in <strong>{cls.name}</strong> yet.
                  </div>
                ) : (
                  <div style={{ overflowX: "auto" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
                      <thead>
                        <tr style={{ background: "#ffffff", borderBottom: "1px solid #e2e8f0" }}>
                          <th style={{ padding: "0.75rem 1.25rem", fontSize: "0.72rem", fontWeight: 700, color: "#64748b", textTransform: "uppercase", width: "50px" }}>#</th>
                          <th style={{ padding: "0.75rem 1.25rem", fontSize: "0.72rem", fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>Student Name</th>
                          <th style={{ padding: "0.75rem 1.25rem", fontSize: "0.72rem", fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>Roll Number</th>
                          <th style={{ padding: "0.75rem 1.25rem", fontSize: "0.72rem", fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>Section</th>
                          <th style={{ padding: "0.75rem 1.25rem", fontSize: "0.72rem", fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>Subject</th>
                          <th style={{ padding: "0.75rem 1.25rem", fontSize: "0.72rem", fontWeight: 700, color: "#64748b", textTransform: "uppercase", textAlign: "right" }}>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {classStudents.map((stud, idx) => {
                          const subj = subjects.find((s) => s.id === stud.subject_id);
                          return (
                            <tr
                              key={stud.id}
                              style={{ borderBottom: "1px solid #f1f5f9", transition: "background 0.15s ease" }}
                              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#f8fafc")}
                              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "#ffffff")}
                            >
                              <td style={{ padding: "0.85rem 1.25rem", fontSize: "0.82rem", color: "#94a3b8", fontWeight: 600 }}>
                                {idx + 1}
                              </td>
                              <td style={{ padding: "0.85rem 1.25rem" }}>
                                <div
                                  onClick={() => setSelectedStudentForProfile(stud)}
                                  style={{ fontWeight: 700, color: "#0f172a", fontSize: "0.92rem", cursor: "pointer" }}
                                  onMouseEnter={(e) => ((e.target as HTMLElement).style.textDecoration = "underline")}
                                  onMouseLeave={(e) => ((e.target as HTMLElement).style.textDecoration = "none")}
                                >
                                  {stud.name}
                                </div>
                                <div style={{ fontSize: "0.75rem", color: "#64748b" }}>
                                  {stud.email || "No email on record"}
                                </div>
                              </td>
                              <td style={{ padding: "0.85rem 1.25rem" }}>
                                <span style={{ fontFamily: "monospace", fontWeight: 700, color: "#1e293b", fontSize: "0.85rem", background: "#f1f5f9", padding: "0.2rem 0.55rem", borderRadius: "6px" }}>
                                  {stud.roll_number}
                                </span>
                              </td>
                              <td style={{ padding: "0.85rem 1.25rem" }}>
                                <span style={{ background: "#e2e8f0", color: "#334155", padding: "0.15rem 0.5rem", borderRadius: "4px", fontSize: "0.75rem", fontWeight: 600 }}>
                                  Section {stud.section || "A"}
                                </span>
                              </td>
                              <td style={{ padding: "0.85rem 1.25rem" }}>
                                <div style={{ fontSize: "0.85rem", fontWeight: 600, color: "#1e293b" }}>
                                  {subj?.name || "Subject"}
                                </div>
                                <div style={{ fontSize: "0.75rem", color: "#64748b" }}>
                                  {subj?.code || ""}
                                </div>
                              </td>
                              <td style={{ padding: "0.85rem 1.25rem", textAlign: "right" }}>
                                <div style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem" }}>
                                  <button
                                    onClick={() => setSelectedStudentForProfile(stud)}
                                    className="btn btn-secondary"
                                    style={{ fontSize: "0.78rem", padding: "0.35rem 0.75rem" }}
                                  >
                                    View Profile
                                  </button>
                                  <button
                                    onClick={() => handleDelete(stud.id, stud.name)}
                                    title="Delete Student"
                                    style={{ padding: "0.35rem", background: "none", border: "none", color: "#ef4444", cursor: "pointer" }}
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
                )}
              </div>
            );
          })}

          {/* Unassigned Students Box (if any) */}
          {unassignedStudents.length > 0 && !selectedClassId && (
            <div
              style={{
                background: "#ffffff",
                border: "1px solid #e2e8f0",
                borderRadius: "16px",
                overflow: "hidden",
                boxShadow: "0 1px 4px rgba(0, 0, 0, 0.04)"
              }}
            >
              <div style={{ padding: "1.1rem 1.5rem", background: "#f8fafc", borderBottom: "1px solid #e2e8f0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <h2 style={{ fontSize: "1.15rem", fontWeight: 800, color: "#0f172a", margin: 0 }}>
                    Other Enrolled Students
                  </h2>
                  <div style={{ fontSize: "0.8rem", color: "#64748b" }}>
                    Students not linked to an explicit cohort
                  </div>
                </div>
                <span style={{ fontSize: "0.75rem", fontWeight: 700, background: "#e2e8f0", color: "#334155", padding: "0.2rem 0.6rem", borderRadius: "9999px" }}>
                  {unassignedStudents.length} Students
                </span>
              </div>

              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
                  <thead>
                    <tr style={{ background: "#ffffff", borderBottom: "1px solid #e2e8f0" }}>
                      <th style={{ padding: "0.75rem 1.25rem", fontSize: "0.72rem", fontWeight: 700, color: "#64748b", textTransform: "uppercase", width: "50px" }}>#</th>
                      <th style={{ padding: "0.75rem 1.25rem", fontSize: "0.72rem", fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>Student Name</th>
                      <th style={{ padding: "0.75rem 1.25rem", fontSize: "0.72rem", fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>Roll Number</th>
                      <th style={{ padding: "0.75rem 1.25rem", fontSize: "0.72rem", fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>Section</th>
                      <th style={{ padding: "0.75rem 1.25rem", fontSize: "0.72rem", fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>Subject</th>
                      <th style={{ padding: "0.75rem 1.25rem", fontSize: "0.72rem", fontWeight: 700, color: "#64748b", textTransform: "uppercase", textAlign: "right" }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {unassignedStudents.map((stud, idx) => {
                      const subj = subjects.find((s) => s.id === stud.subject_id);
                      return (
                        <tr key={stud.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                          <td style={{ padding: "0.85rem 1.25rem", fontSize: "0.82rem", color: "#94a3b8", fontWeight: 600 }}>{idx + 1}</td>
                          <td style={{ padding: "0.85rem 1.25rem" }}>
                            <div onClick={() => setSelectedStudentForProfile(stud)} style={{ fontWeight: 700, color: "#0f172a", fontSize: "0.92rem", cursor: "pointer" }}>
                              {stud.name}
                            </div>
                          </td>
                          <td style={{ padding: "0.85rem 1.25rem" }}>
                            <span style={{ fontFamily: "monospace", fontWeight: 700, color: "#1e293b", fontSize: "0.85rem", background: "#f1f5f9", padding: "0.2rem 0.55rem", borderRadius: "6px" }}>
                              {stud.roll_number}
                            </span>
                          </td>
                          <td style={{ padding: "0.85rem 1.25rem" }}>Section {stud.section || "A"}</td>
                          <td style={{ padding: "0.85rem 1.25rem" }}>{subj?.name || "Subject"}</td>
                          <td style={{ padding: "0.85rem 1.25rem", textAlign: "right" }}>
                            <button onClick={() => setSelectedStudentForProfile(stud)} className="btn btn-secondary" style={{ fontSize: "0.78rem" }}>
                              View Profile
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 16:9 WIDESCREEN ADD STUDENT MODAL */}
      {showAddModal && (
        <div className="modal-overlay-16-9" onClick={() => setShowAddModal(false)}>
          <div className="modal-content-16-9" onClick={(e) => e.stopPropagation()} style={{ maxWidth: "980px" }}>
            <div style={{ display: "grid", gridTemplateColumns: "320px 1fr", height: "100%", minHeight: "520px" }}>
              {/* Left Brand/Info Panel */}
              <div style={{ background: "#1e1b4b", color: "#ffffff", padding: "2.5rem 2rem", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
                <div>
                  <div style={{ width: "48px", height: "48px", borderRadius: "12px", background: "rgba(255, 255, 255, 0.15)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "1.25rem" }}>
                    <UserPlus size={24} />
                  </div>
                  <h3 style={{ fontSize: "1.4rem", fontWeight: 900, letterSpacing: "-0.02em", marginBottom: "0.5rem" }}>
                    Enroll Student
                  </h3>
                  <p style={{ fontSize: "0.88rem", color: "#cbd5e1", lineHeight: 1.6 }}>
                    Register a student under an academic class and curriculum subject. Once enrolled, you can attach and evaluate their handwritten answer sheets.
                  </p>
                </div>

                <div style={{ background: "rgba(255, 255, 255, 0.08)", padding: "1rem", borderRadius: "10px", fontSize: "0.8rem", color: "#94a3b8" }}>
                  💡 Unique student roll numbers are automatically indexed across evaluations and grade reports.
                </div>
              </div>

              {/* Right Form Fields Panel */}
              <div style={{ padding: "2.5rem", display: "flex", flexDirection: "column", justifyContent: "space-between", overflowY: "auto" }}>
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
                    <h4 style={{ fontSize: "1.15rem", fontWeight: 800, color: "#0f172a", margin: 0 }}>
                      Student Details & Cohort Allocation
                    </h4>
                    <button onClick={() => setShowAddModal(false)} style={{ background: "none", border: "none", color: "#94a3b8", cursor: "pointer" }}>
                      <X size={20} />
                    </button>
                  </div>

                  {addError && (
                    <div style={{ padding: "0.75rem 1rem", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: "8px", color: "#dc2626", fontSize: "0.85rem", marginBottom: "1.25rem" }}>
                      {addError}
                    </div>
                  )}

                  <form onSubmit={handleAddStudent} id="add-student-form">
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "1.25rem" }}>
                      <div>
                        <label style={{ display: "block", fontSize: "0.82rem", fontWeight: 700, color: "#334155", marginBottom: "0.35rem" }}>
                          Full Name *
                        </label>
                        <input
                          type="text"
                          required
                          placeholder="e.g. Ram Sharma"
                          value={studentName}
                          onChange={(e) => setStudentName(e.target.value)}
                          style={{ width: "100%", padding: "0.6rem 0.85rem", borderRadius: "8px", border: "1px solid #cbd5e1", fontSize: "0.9rem" }}
                        />
                      </div>

                      <div>
                        <label style={{ display: "block", fontSize: "0.82rem", fontWeight: 700, color: "#334155", marginBottom: "0.35rem" }}>
                          Roll / Registration Number *
                        </label>
                        <input
                          type="text"
                          required
                          placeholder="e.g. 21CS045"
                          value={rollNumber}
                          onChange={(e) => setRollNumber(e.target.value)}
                          style={{ width: "100%", padding: "0.6rem 0.85rem", borderRadius: "8px", border: "1px solid #cbd5e1", fontSize: "0.9rem", textTransform: "uppercase" }}
                        />
                      </div>
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "1.25rem" }}>
                      <div>
                        <label style={{ display: "block", fontSize: "0.82rem", fontWeight: 700, color: "#334155", marginBottom: "0.35rem" }}>
                          Class / Cohort *
                        </label>
                        <select
                          value={modalClassId}
                          onChange={(e) => setModalClassId(e.target.value)}
                          style={{ width: "100%", padding: "0.6rem 0.85rem", borderRadius: "8px", border: "1px solid #cbd5e1", fontSize: "0.9rem", background: "#ffffff" }}
                        >
                          {classes.map((c) => (
                            <option key={c.id} value={c.id}>{c.name} ({c.code || "SEC"})</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label style={{ display: "block", fontSize: "0.82rem", fontWeight: 700, color: "#334155", marginBottom: "0.35rem" }}>
                          Section / Batch
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. A"
                          value={section}
                          onChange={(e) => setSection(e.target.value)}
                          style={{ width: "100%", padding: "0.6rem 0.85rem", borderRadius: "8px", border: "1px solid #cbd5e1", fontSize: "0.9rem" }}
                        />
                      </div>
                    </div>

                    <div style={{ marginBottom: "1.5rem" }}>
                      <label style={{ display: "block", fontSize: "0.82rem", fontWeight: 700, color: "#334155", marginBottom: "0.35rem" }}>
                        Enroll in Subject *
                      </label>
                      <select
                        value={modalSubjectId}
                        onChange={(e) => setModalSubjectId(e.target.value)}
                        style={{ width: "100%", padding: "0.6rem 0.85rem", borderRadius: "8px", border: "1px solid #cbd5e1", fontSize: "0.9rem", background: "#ffffff" }}
                      >
                        {subjects.map((s) => (
                          <option key={s.id} value={s.id}>{s.name} ({s.code}) - {s.semester_or_grade}</option>
                        ))}
                      </select>
                    </div>
                  </form>
                </div>

                <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.75rem", borderTop: "1px solid #e2e8f0", paddingTop: "1.25rem" }}>
                  <button type="button" onClick={() => setShowAddModal(false)} className="btn btn-secondary">
                    Cancel
                  </button>
                  <button type="submit" form="add-student-form" disabled={isAdding} className="btn btn-primary">
                    {isAdding ? "Adding..." : "Confirm & Enroll"}
                  </button>
                </div>
              </div>
            </div>
          </div>
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
          onStudentUpdated={() => loadStudents()}
        />
      )}
    </div>
  );
};