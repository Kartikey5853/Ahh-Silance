import React, { useState, useEffect } from "react";
import { academicApi } from "../api/academicApi";
import type { Student, Exam, AcademicEvaluation, SemesterRecord, StudentFullProfile } from "../types/academic";
import {
  X,
  Save,
  Calendar,
  Clock,
  ChevronDown,
  ChevronUp,
  FileCheck2,
  Plus,
  Trash2,
  BookOpen,
  Award
} from "lucide-react";

interface StudentProfileModalProps {
  student: Student | null;
  onClose: () => void;
  onNavigateToEvaluation?: (evalId: string) => void;
  onStudentUpdated?: (updated: Student) => void;
}

export const StudentProfileModal: React.FC<StudentProfileModalProps> = ({
  student,
  onClose,
  onNavigateToEvaluation,
  onStudentUpdated
}) => {
  const [activeTab, setActiveTab] = useState<"overview" | "history" | "upcoming">("overview");
  const [fullData, setFullData] = useState<StudentFullProfile | null>(null);
  const [loading, setLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Editable Student Fields
  const [name, setName] = useState("");
  const [rollNumber, setRollNumber] = useState("");
  const [email, setEmail] = useState("");
  const [section, setSection] = useState("A");
  const [phone, setPhone] = useState("");
  const [parentName, setParentName] = useState("");
  const [parentPhone, setParentPhone] = useState("");
  const [dob, setDob] = useState("");
  const [bloodGroup, setBloodGroup] = useState("");
  const [attendance, setAttendance] = useState(85.0);
  const [cgpa, setCgpa] = useState(0.0);
  const [admissionYear, setAdmissionYear] = useState("2024");
  const [status, setStatus] = useState("Active");
  const [notes, setNotes] = useState("");
  const [semesterRecords, setSemesterRecords] = useState<SemesterRecord[]>([]);

  const [expandedEvalId, setExpandedEvalId] = useState<string | null>(null);

  useEffect(() => {
    if (!student) return;

    // Initialize local edit state from student prop
    setName(student.name || "");
    setRollNumber(student.roll_number || "");
    setEmail(student.email || "");
    setSection(student.section || "A");
    setPhone(student.phone || "");
    setParentName(student.parent_name || "");
    setParentPhone(student.parent_phone || "");
    setDob(student.dob || "");
    setBloodGroup(student.blood_group || "");
    setAttendance(student.attendance_percentage ?? 85.0);
    setCgpa(student.cgpa_or_percentage ?? 0.0);
    setAdmissionYear(student.admission_year || "2024");
    setStatus(student.status || "Active");
    setNotes(student.notes || "");
    setSemesterRecords(Array.isArray(student.semester_records) ? student.semester_records : []);

    setLoading(true);
    academicApi
      .getStudentProfile(student.id)
      .then((data) => {
        setFullData(data);
        const s = data.student;
        if (s) {
          setName(s.name || "");
          setRollNumber(s.roll_number || "");
          setEmail(s.email || "");
          setSection(s.section || "A");
          setPhone(s.phone || "");
          setParentName(s.parent_name || "");
          setParentPhone(s.parent_phone || "");
          setDob(s.dob || "");
          setBloodGroup(s.blood_group || "");
          setAttendance(s.attendance_percentage ?? 85.0);
          setCgpa(s.cgpa_or_percentage ?? 0.0);
          setAdmissionYear(s.admission_year || "2024");
          setStatus(s.status || "Active");
          setNotes(s.notes || "");
          setSemesterRecords(Array.isArray(s.semester_records) ? s.semester_records : []);
        }
        if (data.evaluations?.length > 0) {
          setExpandedEvalId(data.evaluations[0].id);
        }
      })
      .catch((err) => {
        console.error("Failed to load student profile:", err);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [student]);

  if (!student) return null;

  const handleSaveStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSaveSuccess(false);

    const cleanedRecords = semesterRecords
      .map((r) => ({
        semester: (r.semester || "").trim(),
        sgpa: Number(r.sgpa || 0),
        cgpa: Number(r.cgpa || 0),
        credits: r.credits !== undefined ? Number(r.credits) : undefined,
        status: r.status || "Completed"
      }))
      .filter((r) => r.semester.length > 0);

    try {
      const updated = await academicApi.updateStudent(student.id, {
        name: name.trim(),
        roll_number: rollNumber.trim().toUpperCase(),
        email: email.trim(),
        section: section,
        phone: phone.trim(),
        parent_name: parentName.trim(),
        parent_phone: parentPhone.trim(),
        dob: dob,
        blood_group: bloodGroup,
        attendance_percentage: Number(attendance),
        cgpa_or_percentage: Number(cgpa),
        admission_year: admissionYear,
        status: status,
        notes: notes.trim(),
        semester_records: cleanedRecords
      });

      setSaveSuccess(true);
      if (onStudentUpdated) onStudentUpdated(updated);
      setTimeout(() => setSaveSuccess(false), 2500);
    } catch (err) {
      alert("Failed to save student details.");
    } finally {
      setIsSaving(false);
    }
  };

  const enrolledSubjects = fullData?.enrolled_subjects || [];

  const evaluations: AcademicEvaluation[] = fullData?.evaluations || [];
  const upcomingExams: Exam[] = fullData?.upcoming_exams || [];
  const stats = fullData?.stats || {
    total_exams_taken: evaluations.length,
    upcoming_exams_count: upcomingExams.length,
    average_percentage:
      evaluations.length > 0
        ? Math.round(
            evaluations.reduce((acc, curr) => acc + (curr.percentage || 0), 0) /
              evaluations.length
          )
        : 0,
    highest_score: Math.max(...evaluations.map((e) => e.total_score), 0)
  };

  return (
    <div
      className="modal-overlay-16-9"
      onClick={onClose}
    >
      <div
        className="modal-content-16-9"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            padding: "1.25rem 1.75rem",
            borderBottom: "1px solid #e2e8f0",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            background: "#ffffff"
          }}
        >
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
              <h2 style={{ fontSize: "1.35rem", fontWeight: 800, color: "#0f172a", margin: 0 }}>
                {name || student.name}
              </h2>
              <span
                style={{
                  fontFamily: "monospace",
                  background: "#f1f5f9",
                  color: "#1e293b",
                  padding: "0.2rem 0.55rem",
                  borderRadius: "6px",
                  fontSize: "0.82rem",
                  fontWeight: 700
                }}
              >
                {rollNumber || student.roll_number}
              </span>
              <span
                style={{
                  background: status === "Active" ? "#f0fdf4" : "#fef2f2",
                  color: status === "Active" ? "#16a34a" : "#dc2626",
                  padding: "0.15rem 0.5rem",
                  borderRadius: "9999px",
                  fontSize: "0.75rem",
                  fontWeight: 700
                }}
              >
                {status}
              </span>
              {loading && (
                <span style={{ fontSize: "0.75rem", color: "#0284c7", fontWeight: 600 }}>
                  Loading profile...
                </span>
              )}
            </div>
            <p style={{ color: "#64748b", fontSize: "0.82rem", margin: 0, marginTop: "0.25rem" }}>
              Class: {fullData?.class_item?.name || "General"}
              {" • "}
              {enrolledSubjects.length > 0
                ? `${enrolledSubjects.length} Enrolled ${enrolledSubjects.length === 1 ? "Subject" : "Subjects"}`
                : `${fullData?.subject?.name || "Subject"} (${fullData?.subject?.code || "CODE"})`}
              {" • "}
              Section {section}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              color: "#94a3b8",
              padding: "0.4rem",
              borderRadius: "6px"
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Tab Navigation */}
        <div
          style={{
            padding: "0 1.75rem",
            borderBottom: "1px solid #e2e8f0",
            display: "flex",
            gap: "1.5rem",
            background: "#f8fafc"
          }}
        >
          <button
            type="button"
            onClick={() => setActiveTab("overview")}
            style={{
              padding: "0.85rem 0",
              border: "none",
              borderBottom: activeTab === "overview" ? "2px solid #0284c7" : "2px solid transparent",
              background: "none",
              color: activeTab === "overview" ? "#0284c7" : "#64748b",
              fontWeight: 700,
              fontSize: "0.88rem",
              cursor: "pointer"
            }}
          >
            Profile & Edit Info
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("history")}
            style={{
              padding: "0.85rem 0",
              border: "none",
              borderBottom: activeTab === "history" ? "2px solid #0284c7" : "2px solid transparent",
              background: "none",
              color: activeTab === "history" ? "#0284c7" : "#64748b",
              fontWeight: 700,
              fontSize: "0.88rem",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "0.4rem"
            }}
          >
            Past Examinations ({evaluations.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("upcoming")}
            style={{
              padding: "0.85rem 0",
              border: "none",
              borderBottom: activeTab === "upcoming" ? "2px solid #0284c7" : "2px solid transparent",
              background: "none",
              color: activeTab === "upcoming" ? "#0284c7" : "#64748b",
              fontWeight: 700,
              fontSize: "0.88rem",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "0.4rem"
            }}
          >
            Upcoming Exams ({upcomingExams.length})
          </button>
        </div>

        {/* Tab Body */}
        <div style={{ padding: "1.75rem", overflowY: "auto", flex: 1 }}>
          {/* TAB 1: OVERVIEW & EDIT INFO */}
          {activeTab === "overview" && (
            <div>
              {/* Quick Academic Badges */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                  gap: "1rem",
                  marginBottom: "1.25rem"
                }}
              >
                <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "10px", padding: "1rem" }}>
                  <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>
                    Cumulative CGPA / Score
                  </div>
                  <div style={{ fontSize: "1.5rem", fontWeight: 800, color: "#0f172a", marginTop: "0.2rem" }}>
                    {cgpa > 0 ? cgpa.toFixed(2) : "—"}
                  </div>
                  <span style={{ fontSize: "0.75rem", color: "#64748b", fontWeight: 600 }}>
                    {semesterRecords.length > 0
                      ? `${semesterRecords.length} semester record(s) logged`
                      : `Admitted ${admissionYear}`}
                  </span>
                </div>

                <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "10px", padding: "1rem" }}>
                  <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>
                    Average Exam Score
                  </div>
                  <div style={{ fontSize: "1.5rem", fontWeight: 800, color: "#0284c7", marginTop: "0.2rem" }}>
                    {stats.average_percentage}%
                  </div>
                  <span style={{ fontSize: "0.75rem", color: "#64748b" }}>
                    Across {stats.total_exams_taken} evaluated papers
                  </span>
                </div>

                <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "10px", padding: "1rem" }}>
                  <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>
                    Enrolled Subjects
                  </div>
                  <div style={{ fontSize: "1.5rem", fontWeight: 800, color: "#0f172a", marginTop: "0.2rem" }}>
                    {enrolledSubjects.length || 1}
                  </div>
                  <span style={{ fontSize: "0.75rem", color: "#64748b" }}>
                    {fullData?.subject?.semester_or_grade || "Active Cohort"}
                  </span>
                </div>
              </div>

              {/* Enrolled Subjects List */}
              <div style={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: "12px", padding: "1rem 1.25rem", marginBottom: "1.25rem" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.45rem", fontSize: "0.82rem", fontWeight: 800, color: "#0f172a", marginBottom: "0.65rem" }}>
                  <BookOpen size={15} style={{ color: "#2563eb" }} /> Enrolled Subjects in Cohort
                </div>
                {enrolledSubjects.length > 0 ? (
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
                    {enrolledSubjects.map((es) => (
                      <div
                        key={es.subject_id}
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "0.45rem",
                          padding: "0.35rem 0.75rem",
                          borderRadius: "8px",
                          background: "#f8fafc",
                          border: "1px solid #e2e8f0",
                          fontSize: "0.8rem"
                        }}
                      >
                        <span style={{ fontFamily: "monospace", fontWeight: 800, color: "#2563eb" }}>
                          {es.subject_code || "SUB"}
                        </span>
                        <span style={{ fontWeight: 700, color: "#0f172a" }}>{es.subject_name}</span>
                        {es.section && (
                          <span style={{ background: "#e2e8f0", color: "#334155", padding: "0.08rem 0.4rem", borderRadius: "4px", fontSize: "0.7rem", fontWeight: 700 }}>
                            Sec {es.section}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={{ fontSize: "0.82rem", color: "#64748b" }}>
                    {fullData?.subject?.name || "Primary Subject"} ({fullData?.subject?.code || "SUB"}) • Section {section}
                  </div>
                )}
              </div>

              {/* Editable Form */}
              <form onSubmit={handleSaveStudent}>
                <h3 style={{ fontSize: "1.05rem", fontWeight: 800, color: "#0f172a", marginBottom: "1rem" }}>
                  Student Information & Contacts
                </h3>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "1rem" }}>
                  <div>
                    <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 700, marginBottom: "0.3rem" }}>
                      Full Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      style={{ width: "100%", padding: "0.55rem 0.75rem", borderRadius: "8px", border: "1px solid #cbd5e1", fontSize: "0.88rem" }}
                    />
                  </div>

                  <div>
                    <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 700, marginBottom: "0.3rem" }}>
                      Roll / Registration Number *
                    </label>
                    <input
                      type="text"
                      required
                      value={rollNumber}
                      onChange={(e) => setRollNumber(e.target.value)}
                      style={{ width: "100%", padding: "0.55rem 0.75rem", borderRadius: "8px", border: "1px solid #cbd5e1", fontSize: "0.88rem" }}
                    />
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "1rem", marginBottom: "1rem" }}>
                  <div>
                    <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 700, marginBottom: "0.3rem" }}>
                      Email Address
                    </label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      style={{ width: "100%", padding: "0.55rem 0.75rem", borderRadius: "8px", border: "1px solid #cbd5e1", fontSize: "0.88rem" }}
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
                      style={{ width: "100%", padding: "0.55rem 0.75rem", borderRadius: "8px", border: "1px solid #cbd5e1", fontSize: "0.88rem" }}
                    />
                  </div>

                  <div>
                    <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 700, marginBottom: "0.3rem" }}>
                      Student Phone
                    </label>
                    <input
                      type="tel"
                      placeholder="+91 98765 43210"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      style={{ width: "100%", padding: "0.55rem 0.75rem", borderRadius: "8px", border: "1px solid #cbd5e1", fontSize: "0.88rem" }}
                    />
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "1rem", marginBottom: "1rem" }}>
                  <div>
                    <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 700, marginBottom: "0.3rem" }}>
                      Parent / Guardian Name
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Ramesh Sharma"
                      value={parentName}
                      onChange={(e) => setParentName(e.target.value)}
                      style={{ width: "100%", padding: "0.55rem 0.75rem", borderRadius: "8px", border: "1px solid #cbd5e1", fontSize: "0.88rem" }}
                    />
                  </div>

                  <div>
                    <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 700, marginBottom: "0.3rem" }}>
                      Parent Emergency Phone
                    </label>
                    <input
                      type="tel"
                      placeholder="+91 98765 00000"
                      value={parentPhone}
                      onChange={(e) => setParentPhone(e.target.value)}
                      style={{ width: "100%", padding: "0.55rem 0.75rem", borderRadius: "8px", border: "1px solid #cbd5e1", fontSize: "0.88rem" }}
                    />
                  </div>

                  <div>
                    <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 700, marginBottom: "0.3rem" }}>
                      Blood Group
                    </label>
                    <select
                      value={bloodGroup}
                      onChange={(e) => setBloodGroup(e.target.value)}
                      style={{ width: "100%", padding: "0.55rem 0.75rem", borderRadius: "8px", border: "1px solid #cbd5e1", fontSize: "0.88rem" }}
                    >
                      <option value="">Not Specified</option>
                      <option value="A+">A+</option>
                      <option value="A-">A-</option>
                      <option value="B+">B+</option>
                      <option value="B-">B-</option>
                      <option value="O+">O+</option>
                      <option value="O-">O-</option>
                      <option value="AB+">AB+</option>
                      <option value="AB-">AB-</option>
                    </select>
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: "1rem", marginBottom: "1rem" }}>
                  <div>
                    <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 700, marginBottom: "0.3rem" }}>
                      Date of Birth
                    </label>
                    <input
                      type="date"
                      value={dob}
                      onChange={(e) => setDob(e.target.value)}
                      style={{ width: "100%", padding: "0.55rem 0.75rem", borderRadius: "8px", border: "1px solid #cbd5e1", fontSize: "0.88rem" }}
                    />
                  </div>

                  <div>
                    <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 700, marginBottom: "0.3rem" }}>
                      Cumulative CGPA / %
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      max="100"
                      value={cgpa}
                      onChange={(e) => setCgpa(Number(e.target.value))}
                      style={{ width: "100%", padding: "0.55rem 0.75rem", borderRadius: "8px", border: "1px solid #cbd5e1", fontSize: "0.88rem", fontWeight: 700 }}
                    />
                  </div>

                  <div>
                    <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 700, marginBottom: "0.3rem" }}>
                      Admission Year
                    </label>
                    <input
                      type="text"
                      value={admissionYear}
                      onChange={(e) => setAdmissionYear(e.target.value)}
                      style={{ width: "100%", padding: "0.55rem 0.75rem", borderRadius: "8px", border: "1px solid #cbd5e1", fontSize: "0.88rem" }}
                    />
                  </div>

                  <div>
                    <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 700, marginBottom: "0.3rem" }}>
                      Status
                    </label>
                    <select
                      value={status}
                      onChange={(e) => setStatus(e.target.value)}
                      style={{ width: "100%", padding: "0.55rem 0.75rem", borderRadius: "8px", border: "1px solid #cbd5e1", fontSize: "0.88rem" }}
                    >
                      <option value="Active">Active</option>
                      <option value="Suspended">Suspended</option>
                      <option value="Alumni">Alumni</option>
                    </select>
                  </div>
                </div>

                {/* Other Semester SGPAs & Cumulative CGPAs */}
                <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "12px", padding: "1rem 1.25rem", marginBottom: "1.25rem" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "0.5rem", marginBottom: "0.75rem" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.45rem" }}>
                      <Award size={16} style={{ color: "#2563eb" }} />
                      <h4 style={{ fontSize: "0.9rem", fontWeight: 800, color: "#0f172a", margin: 0 }}>
                        Other Semester CGPAs & Academic Records
                      </h4>
                    </div>
                    <div style={{ display: "flex", gap: "0.45rem" }}>
                      {semesterRecords.length > 0 && (
                        <button
                          type="button"
                          onClick={() => {
                            const valid = semesterRecords.filter((r) => Number(r.sgpa || r.cgpa || 0) > 0);
                            if (valid.length > 0) {
                              const avg = valid.reduce((sum, r) => sum + Number(r.sgpa || r.cgpa || 0), 0) / valid.length;
                              setCgpa(Number(avg.toFixed(2)));
                            }
                          }}
                          style={{
                            padding: "0.3rem 0.65rem",
                            fontSize: "0.75rem",
                            fontWeight: 700,
                            borderRadius: "6px",
                            border: "1px solid #bfdbfe",
                            background: "#eff6ff",
                            color: "#1d4ed8",
                            cursor: "pointer"
                          }}
                        >
                          Sync CGPA Avg
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() =>
                          setSemesterRecords((prev) => [
                            ...prev,
                            { semester: `Semester ${prev.length + 1}`, sgpa: 0, cgpa: cgpa || 0, credits: 20, status: "Completed" }
                          ])
                        }
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "0.3rem",
                          padding: "0.3rem 0.65rem",
                          fontSize: "0.75rem",
                          fontWeight: 700,
                          borderRadius: "6px",
                          border: "1px solid #cbd5e1",
                          background: "#ffffff",
                          color: "#0f172a",
                          cursor: "pointer"
                        }}
                      >
                        <Plus size={13} /> Add Semester Record
                      </button>
                    </div>
                  </div>

                  {semesterRecords.length === 0 ? (
                    <div style={{ fontSize: "0.8rem", color: "#64748b", padding: "0.5rem 0" }}>
                      No previous semester SGPA/CGPA records added yet. Click &quot;Add Semester Record&quot; to log historical semesters.
                    </div>
                  ) : (
                    <div style={{ overflowX: "auto" }}>
                      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.8rem" }}>
                        <thead>
                          <tr style={{ borderBottom: "1px solid #cbd5e1", color: "#475569", textAlign: "left" }}>
                            <th style={{ padding: "0.4rem 0.5rem" }}>Semester</th>
                            <th style={{ padding: "0.4rem 0.5rem" }}>SGPA</th>
                            <th style={{ padding: "0.4rem 0.5rem" }}>Cumulative CGPA</th>
                            <th style={{ padding: "0.4rem 0.5rem" }}>Credits</th>
                            <th style={{ padding: "0.4rem 0.5rem" }}>Status</th>
                            <th style={{ padding: "0.4rem 0.5rem", width: "40px" }}></th>
                          </tr>
                        </thead>
                        <tbody>
                          {semesterRecords.map((rec, rIdx) => (
                            <tr key={rIdx} style={{ borderBottom: "1px solid #e2e8f0" }}>
                              <td style={{ padding: "0.4rem 0.4rem" }}>
                                <input
                                  type="text"
                                  value={rec.semester}
                                  placeholder="e.g. Sem 4"
                                  onChange={(e) =>
                                    setSemesterRecords((prev) =>
                                      prev.map((item, i) => (i === rIdx ? { ...item, semester: e.target.value } : item))
                                    )
                                  }
                                  style={{ width: "100%", padding: "0.35rem 0.5rem", borderRadius: "6px", border: "1px solid #cbd5e1", background: "#ffffff", fontSize: "0.8rem" }}
                                />
                              </td>
                              <td style={{ padding: "0.4rem 0.4rem" }}>
                                <input
                                  type="number"
                                  step="0.01"
                                  min="0"
                                  max="10"
                                  value={rec.sgpa ?? ""}
                                  onChange={(e) =>
                                    setSemesterRecords((prev) =>
                                      prev.map((item, i) => (i === rIdx ? { ...item, sgpa: Number(e.target.value) } : item))
                                    )
                                  }
                                  style={{ width: "80px", padding: "0.35rem 0.5rem", borderRadius: "6px", border: "1px solid #cbd5e1", background: "#ffffff", fontSize: "0.8rem" }}
                                />
                              </td>
                              <td style={{ padding: "0.4rem 0.4rem" }}>
                                <input
                                  type="number"
                                  step="0.01"
                                  min="0"
                                  max="10"
                                  value={rec.cgpa ?? ""}
                                  onChange={(e) =>
                                    setSemesterRecords((prev) =>
                                      prev.map((item, i) => (i === rIdx ? { ...item, cgpa: Number(e.target.value) } : item))
                                    )
                                  }
                                  style={{ width: "85px", padding: "0.35rem 0.5rem", borderRadius: "6px", border: "1px solid #cbd5e1", background: "#ffffff", fontSize: "0.8rem" }}
                                />
                              </td>
                              <td style={{ padding: "0.4rem 0.4rem" }}>
                                <input
                                  type="number"
                                  min="0"
                                  value={rec.credits ?? ""}
                                  onChange={(e) =>
                                    setSemesterRecords((prev) =>
                                      prev.map((item, i) => (i === rIdx ? { ...item, credits: Number(e.target.value) } : item))
                                    )
                                  }
                                  style={{ width: "70px", padding: "0.35rem 0.5rem", borderRadius: "6px", border: "1px solid #cbd5e1", background: "#ffffff", fontSize: "0.8rem" }}
                                />
                              </td>
                              <td style={{ padding: "0.4rem 0.4rem" }}>
                                <select
                                  value={rec.status || "Completed"}
                                  onChange={(e) =>
                                    setSemesterRecords((prev) =>
                                      prev.map((item, i) => (i === rIdx ? { ...item, status: e.target.value } : item))
                                    )
                                  }
                                  style={{ padding: "0.35rem 0.5rem", borderRadius: "6px", border: "1px solid #cbd5e1", background: "#ffffff", fontSize: "0.8rem" }}
                                >
                                  <option value="Completed">Completed</option>
                                  <option value="Ongoing">Ongoing</option>
                                  <option value="Backlog Cleared">Backlog Cleared</option>
                                </select>
                              </td>
                              <td style={{ padding: "0.4rem 0.4rem", textAlign: "center" }}>
                                <button
                                  type="button"
                                  onClick={() => setSemesterRecords((prev) => prev.filter((_, i) => i !== rIdx))}
                                  style={{ background: "none", border: "none", color: "#ef4444", cursor: "pointer", padding: "0.2rem" }}
                                  title="Remove record"
                                >
                                  <Trash2 size={14} />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                <div style={{ marginBottom: "1.5rem" }}>
                  <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 700, marginBottom: "0.3rem" }}>
                    Faculty Notes & Observations
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Add confidential notes on student progress, disciplinary records, or recommendations..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    style={{ width: "100%", padding: "0.55rem 0.75rem", borderRadius: "8px", border: "1px solid #cbd5e1", fontSize: "0.88rem" }}
                  />
                </div>

                <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "center", gap: "0.75rem" }}>
                  {saveSuccess && (
                    <span style={{ color: "#16a34a", fontSize: "0.85rem", fontWeight: 700 }}>
                      Student details updated successfully!
                    </span>
                  )}
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="btn btn-primary"
                    style={{ display: "flex", alignItems: "center", gap: "0.45rem", padding: "0.6rem 1.25rem", borderRadius: "8px", fontSize: "0.88rem" }}
                  >
                    <Save size={16} />
                    {isSaving ? "Saving..." : "Save Details"}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* TAB 2: PAST EXAMINATIONS & SCORECARDS */}
          {activeTab === "history" && (
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem" }}>
                <div>
                  <h3 style={{ fontSize: "1.1rem", fontWeight: 800, color: "#0f172a", margin: 0 }}>
                    Evaluated Examinations ({evaluations.length})
                  </h3>
                  <p style={{ fontSize: "0.82rem", color: "#64748b", margin: 0 }}>
                    All answer sheets evaluated at zero temperature against syllabus rubrics
                  </p>
                </div>
              </div>

              {evaluations.length === 0 ? (
                <div style={{ textAlign: "center", padding: "3rem", background: "#f8fafc", borderRadius: "12px", border: "1px dashed #cbd5e1" }}>
                  <FileCheck2 size={36} style={{ color: "#94a3b8", margin: "0 auto 0.75rem" }} />
                  <div style={{ fontWeight: 700, color: "#0f172a", marginBottom: "0.25rem" }}>
                    No Evaluated Papers Yet
                  </div>
                  <p style={{ fontSize: "0.85rem", color: "#64748b", margin: 0 }}>
                    This candidate does not have any completed examination scorecards.
                  </p>
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                  {evaluations.map((ev) => {
                    const isExpanded = expandedEvalId === ev.id;
                    return (
                      <div
                        key={ev.id}
                        style={{
                          border: "1px solid #e2e8f0",
                          borderRadius: "12px",
                          overflow: "hidden",
                          background: "#ffffff"
                        }}
                      >
                        <div
                          onClick={() => setExpandedEvalId(isExpanded ? null : ev.id)}
                          style={{
                            padding: "1rem 1.25rem",
                            background: isExpanded ? "#f8fafc" : "#ffffff",
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            cursor: "pointer"
                          }}
                        >
                          <div>
                            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                              <span style={{ fontWeight: 800, fontSize: "0.95rem", color: "#0f172a" }}>
                                {ev.student_name}
                              </span>
                              <span style={{ fontSize: "0.75rem", background: "#e2e8f0", padding: "0.15rem 0.5rem", borderRadius: "4px", fontWeight: 700 }}>
                                {ev.grade}
                              </span>
                            </div>
                            <div style={{ fontSize: "0.78rem", color: "#64748b", marginTop: "0.2rem" }}>
                              Evaluated on {ev.created_at ? new Date(ev.created_at).toLocaleDateString() : "Recent"}
                            </div>
                          </div>

                          <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
                            <div style={{ textAlign: "right" }}>
                              <div style={{ fontSize: "1.1rem", fontWeight: 800, color: "#0f172a" }}>
                                {ev.total_score} / {ev.max_score}
                              </div>
                              <div style={{ fontSize: "0.78rem", fontWeight: 700, color: "#16a34a" }}>
                                {ev.percentage}%
                              </div>
                            </div>
                            {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                          </div>
                        </div>

                        {/* Expanded Breakdown */}
                        {isExpanded && (
                          <div style={{ padding: "1.25rem", borderTop: "1px solid #e2e8f0", background: "#ffffff" }}>
                            {ev.teacher_feedback && (
                              <div style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", padding: "0.85rem 1rem", borderRadius: "8px", marginBottom: "1rem" }}>
                                <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "#166534", textTransform: "uppercase", marginBottom: "0.25rem" }}>
                                  Teacher Feedback
                                </div>
                                <p style={{ fontSize: "0.85rem", color: "#1e293b", margin: 0 }}>
                                  {ev.teacher_feedback}
                                </p>
                              </div>
                            )}

                            <h4 style={{ fontSize: "0.88rem", fontWeight: 800, color: "#0f172a", marginBottom: "0.6rem" }}>
                              Question-by-Question Rubric Checks
                            </h4>
                            <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
                              {ev.breakdown?.map((qItem: any, qIdx: number) => (
                                <div key={qIdx} style={{ background: "#f8fafc", padding: "0.75rem", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
                                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.3rem" }}>
                                    <span style={{ fontWeight: 800, fontSize: "0.85rem", color: "#0f172a" }}>
                                      {qItem.q_no}
                                    </span>
                                    <span style={{ fontWeight: 800, fontSize: "0.82rem", color: qItem.awarded_marks > 0 ? "#0284c7" : "#ef4444" }}>
                                      {qItem.awarded_marks} / {qItem.max_marks} Marks
                                    </span>
                                  </div>
                                  {qItem.evidence_quote && (
                                    <div style={{ fontSize: "0.78rem", color: "#64748b", fontStyle: "italic", marginBottom: "0.3rem" }}>
                                      "{qItem.evidence_quote}"
                                    </div>
                                  )}
                                  {qItem.deduction_reason && qItem.deduction_reason !== "None" && qItem.deduction_reason !== "None. Full credit." && (
                                    <div style={{ fontSize: "0.75rem", color: "#b91c1c", fontWeight: 600 }}>
                                      • {qItem.deduction_reason}
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: UPCOMING EXAMINATIONS */}
          {activeTab === "upcoming" && (
            <div>
              <div style={{ marginBottom: "1.25rem" }}>
                <h3 style={{ fontSize: "1.1rem", fontWeight: 800, color: "#0f172a", margin: 0 }}>
                  Upcoming Examinations ({upcomingExams.length})
                </h3>
                <p style={{ fontSize: "0.82rem", color: "#64748b", margin: 0 }}>
                  Exams scheduled for this candidate's course and class
                </p>
              </div>

              {upcomingExams.length === 0 ? (
                <div style={{ textAlign: "center", padding: "3rem", background: "#f8fafc", borderRadius: "12px", border: "1px dashed #cbd5e1" }}>
                  <Calendar size={36} style={{ color: "#94a3b8", margin: "0 auto 0.75rem" }} />
                  <div style={{ fontWeight: 700, color: "#0f172a", marginBottom: "0.25rem" }}>
                    No Upcoming Examinations
                  </div>
                  <p style={{ fontSize: "0.85rem", color: "#64748b", margin: 0 }}>
                    All scheduled tests have been evaluated or no new papers are planned.
                  </p>
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                  {upcomingExams.map((ex) => (
                    <div
                      key={ex.id}
                      style={{
                        border: "1px solid #e2e8f0",
                        borderRadius: "12px",
                        padding: "1.25rem",
                        background: "#ffffff",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        flexWrap: "wrap",
                        gap: "1rem"
                      }}
                    >
                      <div>
                        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                          <span style={{ fontWeight: 800, fontSize: "1rem", color: "#0f172a" }}>
                            {ex.title}
                          </span>
                          <span style={{ fontSize: "0.75rem", background: "#f1f5f9", padding: "0.15rem 0.5rem", borderRadius: "4px", fontWeight: 600 }}>
                            {ex.exam_type}
                          </span>
                        </div>
                        <div style={{ fontSize: "0.82rem", color: "#64748b", marginTop: "0.35rem", display: "flex", alignItems: "center", gap: "1rem", flexWrap: "wrap" }}>
                          <span style={{ display: "flex", alignItems: "center", gap: "0.3rem" }}>
                            <Calendar size={13} />
                            Exam Date: {ex.exam_date || "Upcoming"}
                          </span>
                          {ex.correction_deadline && (
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
                              <Clock size={13} style={{ color: "#dc2626" }} />
                              Deadline: {ex.correction_deadline}
                            </span>
                          )}
                        </div>
                      </div>

                      <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
                        <div style={{ textAlign: "right" }}>
                          <div style={{ fontWeight: 800, fontSize: "1rem", color: "#0f172a" }}>
                            {ex.max_marks} Marks
                          </div>
                          <div style={{ fontSize: "0.75rem", color: "#64748b" }}>
                            Passing: {ex.passing_marks} M
                          </div>
                        </div>

                        {onNavigateToEvaluation && (
                          <button
                            type="button"
                            onClick={() => {
                              onClose();
                              onNavigateToEvaluation(ex.id);
                            }}
                            className="btn btn-primary"
                            style={{ padding: "0.45rem 0.95rem", fontSize: "0.82rem", borderRadius: "8px" }}
                          >
                            Grade Paper →
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
