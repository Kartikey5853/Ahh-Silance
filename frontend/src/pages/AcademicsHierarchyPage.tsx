import React, { useState, useEffect } from "react";
import { academicApi } from "../api/academicApi";
import type { Subject } from "../types/academic";
import {
  Building2,
  School,
  Trophy,
  Plus,
  ChevronRight
} from "lucide-react";

interface AcademicsHierarchyProps {
  onNavigate: (tab: any, params?: any) => void;
}

export const AcademicsHierarchyPage: React.FC<AcademicsHierarchyProps> = ({ onNavigate }) => {
  const [activeTier, setActiveTier] = useState<"college" | "school" | "competitive">("college");
  const [subjects, setSubjects] = useState<Subject[]>([]);

  // Add Subject Form State
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [semesterOrGrade, setSemesterOrGrade] = useState("Sem 6");
  const [credits, setCredits] = useState(4);
  const [academicYear, setAcademicYear] = useState("2026-2027");
  const [chaptersText, setChaptersText] = useState("");

  useEffect(() => {
    loadSubjects();
  }, [activeTier]);

  const loadSubjects = async () => {
    try {
      const data = await academicApi.listSubjects();
      setSubjects(data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleCreateSubject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !code) return;

    try {
      const chaptersList = chaptersText
        .split("\n")
        .map((c) => c.trim())
        .filter(Boolean);

      const targetInstId =
        activeTier === "college"
          ? "inst-college-1"
          : activeTier === "school"
          ? "inst-school-1"
          : "inst-jee-1";

      await academicApi.createSubject({
        name,
        code,
        institution_id: targetInstId,
        institution_type: activeTier,
        semester_or_grade: semesterOrGrade,
        credits: Number(credits),
        academic_year: academicYear,
        chapters:
          chaptersList.length > 0
            ? chaptersList
            : [
                "Ch 1: Core Fundamentals & Principles",
                "Ch 2: Analytical Formulations",
                "Ch 3: Practical Implementation & Evaluation"
              ]
      });

      setShowForm(false);
      setName("");
      setCode("");
      setChaptersText("");
      loadSubjects();
    } catch (err) {
      alert("Error adding subject.");
    }
  };

  const filteredSubjects = subjects.filter((s) => s.institution_type === activeTier);

  return (
    <div className="academics-hierarchy-page pb-24">
      {/* Header */}
      <div style={{ marginBottom: "1.5rem" }}>
        <h1 style={{ fontSize: "1.75rem", fontWeight: 800, letterSpacing: "-0.03em" }}>
          Academic Structure & Institution Hierarchy
        </h1>
        <p style={{ color: "var(--text-muted)", fontSize: "0.9rem" }}>
          Dynamic tier rules: Colleges require Credits & Semesters; Schools require Assessment terms; Competitive requires Mock rules.
        </p>
      </div>

      {/* Tier Switcher Pills */}
      <div className="institution-switch-container">
        <button
          onClick={() => {
            setActiveTier("college");
            setSemesterOrGrade("Sem 6");
          }}
          className={`institution-pill-btn ${activeTier === "college" ? "active" : ""}`}
        >
          <Building2 size={16} style={{ color: activeTier === "college" ? "#2563eb" : "inherit" }} />
          College / University (Credits & Sems)
        </button>

        <button
          onClick={() => {
            setActiveTier("school");
            setSemesterOrGrade("Class 12");
          }}
          className={`institution-pill-btn ${activeTier === "school" ? "active" : ""}`}
        >
          <School size={16} style={{ color: activeTier === "school" ? "#db2777" : "inherit" }} />
          School Board (Half-Yearly & Assessments)
        </button>

        <button
          onClick={() => {
            setActiveTier("competitive");
            setSemesterOrGrade("Target 2026");
          }}
          className={`institution-pill-btn ${activeTier === "competitive" ? "active" : ""}`}
        >
          <Trophy size={16} style={{ color: activeTier === "competitive" ? "#16a34a" : "inherit" }} />
          Competitive / JEE Mains (Mock Tests)
        </button>
      </div>

      {/* Dynamic Tier Specs Box */}
      <div className="card" style={{ padding: "1.25rem 1.5rem", marginBottom: "1.75rem", background: "var(--bg-secondary)" }}>
        {activeTier === "college" && (
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.4rem" }}>
              <span className="subject-badge badge-college" style={{ fontSize: "0.8rem" }}>College Mode Active</span>
              <strong style={{ fontSize: "0.95rem" }}>ABC Institute of Technology & Engineering</strong>
            </div>
            <p style={{ fontSize: "0.82rem", color: "var(--text-secondary)", lineHeight: 1.5 }}>
              Under College mode, subjects are grouped by <strong>Semester</strong> (Sem 1 to Sem 8) and carry <strong>Credits (e.g. 4 Credits)</strong>. 
              Exams are structured into <strong>Mid-Sem Examinations</strong> and <strong>End-Sem Examinations</strong>.
            </p>
          </div>
        )}

        {activeTier === "school" && (
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.4rem" }}>
              <span className="subject-badge badge-school" style={{ fontSize: "0.8rem" }}>School Mode Active</span>
              <strong style={{ fontSize: "0.95rem" }}>Delhi Public School, R.K. Puram</strong>
            </div>
            <p style={{ fontSize: "0.82rem", color: "var(--text-secondary)", lineHeight: 1.5 }}>
              Under School mode, subjects are linked to <strong>Class / Grade (e.g. Class 10th or 12th)</strong> without credit hours. 
              Exams are structured into <strong>Assessment 1 (Unit Test)</strong>, <strong>Half-Yearly Examination</strong>, <strong>Assessment 2</strong>, and <strong>Annual Final Exam</strong>.
            </p>
          </div>
        )}

        {activeTier === "competitive" && (
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.4rem" }}>
              <span className="subject-badge badge-jee" style={{ fontSize: "0.8rem" }}>Competitive / JEE Mode Active</span>
              <strong style={{ fontSize: "0.95rem" }}>Apex National Competitive Academy</strong>
            </div>
            <p style={{ fontSize: "0.82rem", color: "var(--text-secondary)", lineHeight: 1.5 }}>
              Under Competitive mode, papers are classified as <strong>Full Mock Tests</strong> or <strong>Subject Speed Drills</strong>. 
              Enforces NTA Section A (+4 / -1 negative marking) and Section B (Attempt any 5 out of 10) rules.
            </p>
          </div>
        )}
      </div>

      {/* Header and Add Button */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem" }}>
        <h3 style={{ fontSize: "1.25rem", fontWeight: 800 }}>
          {activeTier === "college" ? "College Courses & Chapters" : activeTier === "school" ? "School Subjects" : "Competitive Mock Modules"} ({filteredSubjects.length})
        </h3>
        <button
          onClick={() => setShowForm(!showForm)}
          className="btn btn-secondary"
          style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}
        >
          <Plus size={16} />
          {showForm ? "Close Form" : `Add ${activeTier === "college" ? "College Course" : "Subject"}`}
        </button>
      </div>

      {/* Add Subject Inline Form */}
      {showForm && (
        <div className="card" style={{ padding: "1.5rem", marginBottom: "1.75rem", border: "2px solid var(--blue)" }}>
          <h4 style={{ fontWeight: 800, fontSize: "1.1rem", marginBottom: "0.4rem" }}>
            Add New {activeTier.toUpperCase()} Subject
          </h4>
          <form onSubmit={handleCreateSubject}>
            <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "1rem", marginBottom: "1rem" }}>
              <div>
                <label style={{ display: "block", fontSize: "0.78rem", fontWeight: 700, marginBottom: "0.25rem" }}>
                  Subject Name
                </label>
                <input
                  type="text"
                  required
                  placeholder={activeTier === "college" ? "Natural Language Processing (NLP)" : "Physics Class 12"}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  style={{ width: "100%", padding: "0.5rem 0.75rem", borderRadius: "6px", border: "1px solid var(--border-color)" }}
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: "0.78rem", fontWeight: 700, marginBottom: "0.25rem" }}>
                  Subject Code
                </label>
                <input
                  type="text"
                  required
                  placeholder="CS-702"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  style={{ width: "100%", padding: "0.5rem 0.75rem", borderRadius: "6px", border: "1px solid var(--border-color)" }}
                />
              </div>
            </div>

            {/* Dynamic Fields */}
            {activeTier === "college" && (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "1rem", marginBottom: "1rem" }}>
                <div>
                  <label style={{ display: "block", fontSize: "0.78rem", fontWeight: 700, marginBottom: "0.25rem" }}>
                    Semester
                  </label>
                  <select
                    value={semesterOrGrade}
                    onChange={(e) => setSemesterOrGrade(e.target.value)}
                    style={{ width: "100%", padding: "0.5rem 0.75rem", borderRadius: "6px", border: "1px solid var(--border-color)" }}
                  >
                    {["Sem 1", "Sem 2", "Sem 3", "Sem 4", "Sem 5", "Sem 6", "Sem 7", "Sem 8"].map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={{ display: "block", fontSize: "0.78rem", fontWeight: 700, marginBottom: "0.25rem" }}>
                    Credits
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={8}
                    value={credits}
                    onChange={(e) => setCredits(Number(e.target.value))}
                    style={{ width: "100%", padding: "0.5rem 0.75rem", borderRadius: "6px", border: "1px solid var(--border-color)" }}
                  />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: "0.78rem", fontWeight: 700, marginBottom: "0.25rem" }}>
                    Academic Year
                  </label>
                  <input
                    type="text"
                    value={academicYear}
                    onChange={(e) => setAcademicYear(e.target.value)}
                    style={{ width: "100%", padding: "0.5rem 0.75rem", borderRadius: "6px", border: "1px solid var(--border-color)" }}
                  />
                </div>
              </div>
            )}

            {activeTier === "school" && (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "1rem" }}>
                <div>
                  <label style={{ display: "block", fontSize: "0.78rem", fontWeight: 700, marginBottom: "0.25rem" }}>
                    Class / Grade
                  </label>
                  <select
                    value={semesterOrGrade}
                    onChange={(e) => setSemesterOrGrade(e.target.value)}
                    style={{ width: "100%", padding: "0.5rem 0.75rem", borderRadius: "6px", border: "1px solid var(--border-color)" }}
                  >
                    {["Class 9", "Class 10", "Class 11", "Class 12"].map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={{ display: "block", fontSize: "0.78rem", fontWeight: 700, marginBottom: "0.25rem" }}>
                    Academic Year
                  </label>
                  <input
                    type="text"
                    value={academicYear}
                    onChange={(e) => setAcademicYear(e.target.value)}
                    style={{ width: "100%", padding: "0.5rem 0.75rem", borderRadius: "6px", border: "1px solid var(--border-color)" }}
                  />
                </div>
              </div>
            )}

            <div style={{ marginBottom: "1rem" }}>
              <label style={{ display: "block", fontSize: "0.78rem", fontWeight: 700, marginBottom: "0.25rem" }}>
                Syllabus Chapters (One per line)
              </label>
              <textarea
                rows={3}
                placeholder="Ch 1: Introduction&#10;Ch 2: Core Concepts&#10;Ch 3: Practical Projects"
                value={chaptersText}
                onChange={(e) => setChaptersText(e.target.value)}
                style={{ width: "100%", padding: "0.5rem 0.75rem", borderRadius: "6px", border: "1px solid var(--border-color)", fontSize: "0.85rem" }}
              />
            </div>

            <button type="submit" className="btn btn-primary">
              Save {activeTier === "college" ? "Course" : "Subject"}
            </button>
          </form>
        </div>
      )}

      {/* Subjects List */}
      <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
        {filteredSubjects.length === 0 ? (
          <div className="card" style={{ padding: "2.5rem", textAlign: "center", color: "var(--text-muted)" }}>
            No subjects created yet for {activeTier.toUpperCase()} mode. Click "Add Subject" above to create one.
          </div>
        ) : (
          filteredSubjects.map((s) => (
            <div key={s.id} className="subject-card">
              <div className="subject-card-header">
                <div>
                  <div className="subject-title">{s.name}</div>
                  <div style={{ fontSize: "0.85rem", color: "var(--text-muted)", marginTop: "0.2rem" }}>
                    Code: <strong>{s.code}</strong> • {s.semester_or_grade} {s.credits ? `• ${s.credits} Credits` : ""} • Year: {s.academic_year}
                  </div>
                </div>

                <div style={{ display: "flex", gap: "0.5rem" }}>
                  <button
                    onClick={() => onNavigate("students", { subjectId: s.id })}
                    className="btn btn-secondary"
                    style={{ fontSize: "0.8rem", padding: "0.4rem 0.75rem" }}
                  >
                    {s.enrolled_students || 0} Students
                  </button>
                  <button
                    onClick={() => onNavigate("exams", { subjectId: s.id })}
                    className="btn btn-primary"
                    style={{ fontSize: "0.8rem", padding: "0.4rem 0.75rem" }}
                  >
                    Exams ({s.exams_count || 0})
                  </button>
                </div>
              </div>

              {s.chapters && s.chapters.length > 0 && (
                <div className="chapters-accordion">
                  <div style={{ fontSize: "0.8rem", fontWeight: 700, color: "var(--text-secondary)" }}>
                    Syllabus Chapters ({s.chapters.length})
                  </div>
                  <ul className="chapters-list">
                    {s.chapters.map((ch, idx) => (
                      <li key={idx} className="chapter-item">
                        <ChevronRight size={13} style={{ color: "var(--blue)" }} />
                        <span>{ch}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};
