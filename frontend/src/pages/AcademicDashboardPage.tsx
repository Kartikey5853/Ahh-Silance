import React, { useEffect, useState } from "react";
import { academicApi } from "../api/academicApi";
import type { UserProfile, Subject, Institution, ClassItem } from "../types/academic";
import {
  BookOpen,
  Users,
  Plus,
  FileSpreadsheet,
  Building2,
  FolderGit2,
  GraduationCap,
  ChevronRight
} from "lucide-react";

interface AcademicDashboardProps {
  onNavigate: (tab: any, params?: any) => void;
}

export const AcademicDashboardPage: React.FC<AcademicDashboardProps> = ({ onNavigate }) => {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [institutions, setInstitutions] = useState<Institution[]>([]);
  const [selectedInstId, setSelectedInstId] = useState<string>("inst-ace");
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<string>("");
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal States
  const [showOrgModal, setShowOrgModal] = useState(false);
  const [showClassModal, setShowClassModal] = useState(false);
  const [showSubjModal, setShowSubjModal] = useState(false);

  // New Org Form
  const [newOrgName, setNewOrgName] = useState("");
  const [newOrgCode, setNewOrgCode] = useState("");

  // New Class Form
  const [newClassName, setNewClassName] = useState("Semester 6 - CSE");
  const [newClassCode, setNewClassCode] = useState("CSE-SEM6");
  const [newClassDept, setNewClassDept] = useState("Computer Science & Engineering");
  const [newClassYear, setNewClassYear] = useState("2026-2027");

  // New Subject Form
  const [newSubjName, setNewSubjName] = useState("Natural Language Processing");
  const [newSubjCode, setNewSubjCode] = useState("NLP-701");
  const [newSubjCredits, setNewSubjCredits] = useState(4);
  const [newSubjSem, setNewSubjSem] = useState("Sem 6");

  const loadHierarchy = async () => {
    try {
      setLoading(true);
      const [profData, instData] = await Promise.all([
        academicApi.getProfile(),
        academicApi.listInstitutions()
      ]);
      setProfile(profData);
      setInstitutions(instData);

      const activeInst = profData.institution_id || "inst-ace";
      setSelectedInstId(activeInst);

      const classList = await academicApi.listClasses(activeInst);
      setClasses(classList);

      const activeClass = classList.length > 0 ? classList[0].id : "";
      setSelectedClassId(activeClass);

      const subjList = await academicApi.listSubjects(activeInst, activeClass || undefined);
      setSubjects(subjList);
    } catch (err) {
      console.error("Failed to load hierarchy:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadHierarchy();
  }, []);

  const handleSelectInstitution = async (instId: string) => {
    setSelectedInstId(instId);
    const classList = await academicApi.listClasses(instId);
    setClasses(classList);
    const activeClass = classList.length > 0 ? classList[0].id : "";
    setSelectedClassId(activeClass);
    const subjList = await academicApi.listSubjects(instId, activeClass || undefined);
    setSubjects(subjList);
  };

  const handleSelectClass = async (classId: string) => {
    setSelectedClassId(classId);
    const subjList = await academicApi.listSubjects(selectedInstId, classId || undefined);
    setSubjects(subjList);
  };

  // Create Organization
  const handleCreateOrg = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newOrgName.trim()) return;
    try {
      const created = await academicApi.createInstitution({
        name: newOrgName.trim(),
        code: newOrgCode.trim().toUpperCase() || "ORG",
        type: "college"
      });
      setInstitutions([...institutions, created]);
      setSelectedInstId(created.id);
      setShowOrgModal(false);
      setNewOrgName("");
      setNewOrgCode("");
      await handleSelectInstitution(created.id);
    } catch (err) {
      alert("Error creating organization.");
    }
  };

  // Create Class
  const handleCreateClass = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClassName.trim()) return;
    try {
      const created = await academicApi.createClass({
        name: newClassName.trim(),
        code: newClassCode.trim().toUpperCase(),
        institution_id: selectedInstId,
        department: newClassDept,
        academic_year: newClassYear
      });
      const updatedClasses = [created, ...classes];
      setClasses(updatedClasses);
      setSelectedClassId(created.id);
      setShowClassModal(false);
      await handleSelectClass(created.id);
    } catch (err) {
      alert("Error creating class.");
    }
  };

  // Create Subject
  const handleCreateSubject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSubjName.trim()) return;
    try {
      const created = await academicApi.createSubject({
        name: newSubjName.trim(),
        code: newSubjCode.trim().toUpperCase(),
        institution_id: selectedInstId,
        class_id: selectedClassId,
        institution_type: "college",
        semester_or_grade: newSubjSem,
        credits: Number(newSubjCredits),
        academic_year: newClassYear,
        chapters: [
          "1. Text Preprocessing & Tokenization",
          "2. N-gram Language Modeling & Perplexity",
          "3. Vector Semantics (Word2Vec, GloVe)",
          "4. Transformers, Self-Attention & Multi-Head Attention",
          "5. Pretrained LLMs, LoRA Fine-Tuning & Evaluation"
        ]
      });
      setSubjects([created, ...subjects]);
      setShowSubjModal(false);
    } catch (err) {
      alert("Error creating subject.");
    }
  };

  const currentOrg = institutions.find((i) => i.id === selectedInstId);
  const currentClass = classes.find((c) => c.id === selectedClassId);

  return (
    <div className="academic-dashboard-page pb-32">
      {/* 2026 Minimal Header */}
      <div style={{ marginBottom: "2rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "1rem" }}>
          <div>
            <div style={{ fontSize: "0.8rem", fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "0.25rem" }}>
              Faculty Examination Portal
            </div>
            <h1 style={{ fontSize: "2rem", fontWeight: 800, color: "#0f172a", letterSpacing: "-0.03em" }}>
              {currentOrg?.name || "ACE College of Engineering"}
            </h1>
            <p style={{ color: "#475569", fontSize: "0.95rem", marginTop: "0.2rem" }}>
              Logged in as <strong>{profile?.role || "Professor"}</strong> • {profile?.department || "Computer Science & Engineering"}
            </p>
          </div>

          <div style={{ display: "flex", gap: "0.5rem" }}>
            <button
              onClick={() => setShowClassModal(true)}
              className="btn btn-secondary"
              style={{ display: "flex", alignItems: "center", gap: "0.4rem", padding: "0.55rem 0.9rem", fontSize: "0.85rem" }}
            >
              <FolderGit2 size={15} />
              Set Up Class
            </button>
            <button
              onClick={() => setShowSubjModal(true)}
              className="btn btn-primary"
              style={{ display: "flex", alignItems: "center", gap: "0.4rem", padding: "0.55rem 0.95rem", fontSize: "0.85rem" }}
            >
              <Plus size={15} />
              Add Subject
            </button>
          </div>
        </div>
      </div>

      {/* Modern Hierarchy Navigation Bar (College -> Class -> Subject) */}
      <div
        style={{
          background: "#ffffff",
          border: "1px solid #e2e8f0",
          borderRadius: "12px",
          padding: "1rem 1.25rem",
          marginBottom: "2rem",
          display: "flex",
          alignItems: "center",
          gap: "1rem",
          flexWrap: "wrap",
          boxShadow: "0 1px 2px 0 rgba(0, 0, 0, 0.03)"
        }}
      >
        {/* Organization Dropdown */}
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <Building2 size={16} style={{ color: "#2563eb" }} />
          <span style={{ fontSize: "0.8rem", fontWeight: 700, color: "#64748b" }}>College:</span>
          <select
            value={selectedInstId}
            onChange={(e) => handleSelectInstitution(e.target.value)}
            style={{
              padding: "0.4rem 0.75rem",
              borderRadius: "6px",
              border: "1px solid #cbd5e1",
              fontSize: "0.85rem",
              fontWeight: 600
            }}
          >
            {institutions.map((i) => (
              <option key={i.id} value={i.id}>{i.name}</option>
            ))}
          </select>
          <button
            onClick={() => setShowOrgModal(true)}
            style={{ background: "none", border: "none", color: "#2563eb", cursor: "pointer", fontSize: "0.8rem", fontWeight: 600, padding: "0.2rem" }}
            title="Create new college/organization"
          >
            + New
          </button>
        </div>

        <ChevronRight size={16} style={{ color: "#cbd5e1" }} />

        {/* Class Dropdown */}
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <FolderGit2 size={16} style={{ color: "#16a34a" }} />
          <span style={{ fontSize: "0.8rem", fontWeight: 700, color: "#64748b" }}>Class:</span>
          {classes.length === 0 ? (
            <button
              onClick={() => setShowClassModal(true)}
              style={{ background: "#f1f5f9", border: "1px dashed #cbd5e1", padding: "0.35rem 0.75rem", borderRadius: "6px", fontSize: "0.8rem", cursor: "pointer", color: "#334155" }}
            >
              + Set Up First Class
            </button>
          ) : (
            <select
              value={selectedClassId}
              onChange={(e) => handleSelectClass(e.target.value)}
              style={{
                padding: "0.4rem 0.75rem",
                borderRadius: "6px",
                border: "1px solid #cbd5e1",
                fontSize: "0.85rem",
                fontWeight: 600
              }}
            >
              <option value="">All Classes in {currentOrg?.code || "College"}</option>
              {classes.map((c) => (
                <option key={c.id} value={c.id}>{c.name} ({c.code || "Class"})</option>
              ))}
            </select>
          )}
        </div>

        <ChevronRight size={16} style={{ color: "#cbd5e1" }} />

        {/* Subject Count Indicator */}
        <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", fontSize: "0.85rem", color: "#475569", marginLeft: "auto" }}>
          <BookOpen size={16} style={{ color: "#475569" }} />
          <span><strong>{subjects.length}</strong> Subjects Configured</span>
        </div>
      </div>

      {/* Main Subjects Grid */}
      {loading ? (
        <div style={{ textAlign: "center", padding: "4rem", color: "#64748b" }}>
          Loading curriculum from SQLite database...
        </div>
      ) : subjects.length === 0 ? (
        <div
          style={{
            background: "#ffffff",
            border: "2px dashed #cbd5e1",
            borderRadius: "16px",
            padding: "4rem 2rem",
            textAlign: "center"
          }}
        >
          <GraduationCap size={44} style={{ color: "#94a3b8", margin: "0 auto 1rem" }} />
          <h3 style={{ fontSize: "1.25rem", fontWeight: 700, color: "#0f172a", marginBottom: "0.35rem" }}>
            No Subjects in {currentClass ? currentClass.name : currentOrg?.name || "College"}
          </h3>
          <p style={{ color: "#64748b", fontSize: "0.9rem", maxWidth: "460px", margin: "0 auto 1.5rem" }}>
            Follow the flow: set up your class, create a subject like <strong>Natural Language Processing</strong>, then schedule a test and extract questions via Gemini.
          </p>
          <div style={{ display: "flex", justifyContent: "center", gap: "0.75rem" }}>
            {classes.length === 0 && (
              <button
                onClick={() => setShowClassModal(true)}
                className="btn btn-secondary"
                style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}
              >
                <FolderGit2 size={16} /> 1. Set Up Class
              </button>
            )}
            <button
              onClick={() => setShowSubjModal(true)}
              className="btn btn-primary"
              style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}
            >
              <Plus size={16} /> 2. Add Subject (NLP)
            </button>
          </div>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(360px, 1fr))", gap: "1.25rem" }}>
          {subjects.map((s) => (
            <div
              key={s.id}
              style={{
                background: "#ffffff",
                border: "1px solid #e2e8f0",
                borderRadius: "14px",
                padding: "1.5rem",
                boxShadow: "0 1px 3px 0 rgba(0, 0, 0, 0.03)",
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between"
              }}
            >
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "0.5rem" }}>
                  <span style={{ fontSize: "0.75rem", fontWeight: 700, background: "#f1f5f9", color: "#334155", padding: "0.2rem 0.5rem", borderRadius: "4px" }}>
                    {s.code}
                  </span>
                  <span style={{ fontSize: "0.75rem", color: "#64748b", fontWeight: 600 }}>
                    {s.semester_or_grade} • {s.credits} Credits
                  </span>
                </div>

                <h3 style={{ fontSize: "1.2rem", fontWeight: 800, color: "#0f172a", marginBottom: "0.5rem" }}>
                  {s.name}
                </h3>

                <p style={{ fontSize: "0.82rem", color: "#64748b", marginBottom: "1rem" }}>
                  Academic Year: {s.academic_year} • {s.chapters ? `${s.chapters.length} Syllabus Chapters` : "Configured"}
                </p>
              </div>

              {/* Action Buttons */}
              <div style={{ display: "flex", gap: "0.5rem", paddingTop: "1rem", borderTop: "1px solid #f1f5f9" }}>
                <button
                  onClick={() => onNavigate("exams", { subjectId: s.id })}
                  className="btn btn-primary"
                  style={{ flex: 1, fontSize: "0.82rem", padding: "0.45rem", display: "flex", alignItems: "center", justifyContent: "center", gap: "0.35rem" }}
                >
                  <FileSpreadsheet size={14} />
                  Tests & Questions
                </button>
                <button
                  onClick={() => onNavigate("students", { subjectId: s.id })}
                  className="btn btn-secondary"
                  style={{ flex: 1, fontSize: "0.82rem", padding: "0.45rem", display: "flex", alignItems: "center", justifyContent: "center", gap: "0.35rem" }}
                >
                  <Users size={14} />
                  {s.enrolled_students || 0} Students
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal 1: Create College / Organization */}
      {showOrgModal && (
        <div className="modal-backdrop" onClick={() => setShowOrgModal(false)}>
          <div className="modal-dialog" onClick={(e) => e.stopPropagation()}>
            <h3 style={{ fontSize: "1.25rem", fontWeight: 800, color: "#0f172a", marginBottom: "0.35rem" }}>
              Create Organization / College
            </h3>
            <p style={{ fontSize: "0.85rem", color: "#64748b", marginBottom: "1.25rem" }}>
              Set up a university, college, or school organization.
            </p>
            <form onSubmit={handleCreateOrg}>
              <div style={{ marginBottom: "1rem" }}>
                <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 700, marginBottom: "0.3rem" }}>
                  Organization Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. ACE College of Engineering"
                  value={newOrgName}
                  onChange={(e) => setNewOrgName(e.target.value)}
                  style={{ width: "100%", padding: "0.55rem 0.75rem", borderRadius: "8px", border: "1px solid #cbd5e1" }}
                />
              </div>
              <div style={{ marginBottom: "1.5rem" }}>
                <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 700, marginBottom: "0.3rem" }}>
                  Organization Code
                </label>
                <input
                  type="text"
                  placeholder="ACE"
                  value={newOrgCode}
                  onChange={(e) => setNewOrgCode(e.target.value)}
                  style={{ width: "100%", padding: "0.55rem 0.75rem", borderRadius: "8px", border: "1px solid #cbd5e1" }}
                />
              </div>
              <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.5rem" }}>
                <button type="button" onClick={() => setShowOrgModal(false)} className="btn btn-secondary">
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Save Organization
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 2: Set Up Class */}
      {showClassModal && (
        <div className="modal-backdrop" onClick={() => setShowClassModal(false)}>
          <div className="modal-dialog" onClick={(e) => e.stopPropagation()}>
            <h3 style={{ fontSize: "1.25rem", fontWeight: 800, color: "#0f172a", marginBottom: "0.35rem" }}>
              Set Up Class
            </h3>
            <p style={{ fontSize: "0.85rem", color: "#64748b", marginBottom: "1.25rem" }}>
              Define a cohort or class under <strong>{currentOrg?.name || "College"}</strong>.
            </p>
            <form onSubmit={handleCreateClass}>
              <div style={{ marginBottom: "1rem" }}>
                <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 700, marginBottom: "0.3rem" }}>
                  Class Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Semester 6 - CSE"
                  value={newClassName}
                  onChange={(e) => setNewClassName(e.target.value)}
                  style={{ width: "100%", padding: "0.55rem 0.75rem", borderRadius: "8px", border: "1px solid #cbd5e1" }}
                />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem", marginBottom: "1rem" }}>
                <div>
                  <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 700, marginBottom: "0.3rem" }}>
                    Class Code
                  </label>
                  <input
                    type="text"
                    placeholder="CSE-SEM6"
                    value={newClassCode}
                    onChange={(e) => setNewClassCode(e.target.value)}
                    style={{ width: "100%", padding: "0.55rem 0.75rem", borderRadius: "8px", border: "1px solid #cbd5e1" }}
                  />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 700, marginBottom: "0.3rem" }}>
                    Academic Year
                  </label>
                  <input
                    type="text"
                    value={newClassYear}
                    onChange={(e) => setNewClassYear(e.target.value)}
                    style={{ width: "100%", padding: "0.55rem 0.75rem", borderRadius: "8px", border: "1px solid #cbd5e1" }}
                  />
                </div>
              </div>
              <div style={{ marginBottom: "1.5rem" }}>
                <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 700, marginBottom: "0.3rem" }}>
                  Department
                </label>
                <input
                  type="text"
                  value={newClassDept}
                  onChange={(e) => setNewClassDept(e.target.value)}
                  style={{ width: "100%", padding: "0.55rem 0.75rem", borderRadius: "8px", border: "1px solid #cbd5e1" }}
                />
              </div>
              <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.5rem" }}>
                <button type="button" onClick={() => setShowClassModal(false)} className="btn btn-secondary">
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Save Class
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 3: Create Subject */}
      {showSubjModal && (
        <div className="modal-backdrop" onClick={() => setShowSubjModal(false)}>
          <div className="modal-dialog" onClick={(e) => e.stopPropagation()}>
            <h3 style={{ fontSize: "1.25rem", fontWeight: 800, color: "#0f172a", marginBottom: "0.35rem" }}>
              Add Subject
            </h3>
            <p style={{ fontSize: "0.85rem", color: "#64748b", marginBottom: "1.25rem" }}>
              Assign course under <strong>{currentClass ? currentClass.name : currentOrg?.name || "College"}</strong>.
            </p>
            <form onSubmit={handleCreateSubject}>
              <div style={{ marginBottom: "1rem" }}>
                <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 700, marginBottom: "0.3rem" }}>
                  Subject Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Natural Language Processing"
                  value={newSubjName}
                  onChange={(e) => setNewSubjName(e.target.value)}
                  style={{ width: "100%", padding: "0.55rem 0.75rem", borderRadius: "8px", border: "1px solid #cbd5e1" }}
                />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "0.75rem", marginBottom: "1.5rem" }}>
                <div>
                  <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 700, marginBottom: "0.3rem" }}>
                    Subject Code
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="NLP-701"
                    value={newSubjCode}
                    onChange={(e) => setNewSubjCode(e.target.value)}
                    style={{ width: "100%", padding: "0.55rem 0.75rem", borderRadius: "8px", border: "1px solid #cbd5e1" }}
                  />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 700, marginBottom: "0.3rem" }}>
                    Semester
                  </label>
                  <select
                    value={newSubjSem}
                    onChange={(e) => setNewSubjSem(e.target.value)}
                    style={{ width: "100%", padding: "0.55rem 0.75rem", borderRadius: "8px", border: "1px solid #cbd5e1" }}
                  >
                    {["Sem 1", "Sem 2", "Sem 3", "Sem 4", "Sem 5", "Sem 6", "Sem 7", "Sem 8"].map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 700, marginBottom: "0.3rem" }}>
                    Credits
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={8}
                    value={newSubjCredits}
                    onChange={(e) => setNewSubjCredits(Number(e.target.value))}
                    style={{ width: "100%", padding: "0.55rem 0.75rem", borderRadius: "8px", border: "1px solid #cbd5e1" }}
                  />
                </div>
              </div>
              <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.5rem" }}>
                <button type="button" onClick={() => setShowSubjModal(false)} className="btn btn-secondary">
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Save Subject
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
