import React, { useState, useEffect } from "react";
import { academicApi } from "../api/academicApi";
import type { Subject, Institution, ClassItem } from "../types/academic";
import {
  Building2,
  FolderGit2,
  BookOpen,
  Plus,
  ChevronRight,
  FileSpreadsheet,
  Users
} from "lucide-react";

interface AcademicsHierarchyProps {
  onNavigate: (tab: any, params?: any) => void;
}

export const AcademicsHierarchyPage: React.FC<AcademicsHierarchyProps> = ({ onNavigate }) => {
  const [institutions, setInstitutions] = useState<Institution[]>([]);
  const [selectedInstId, setSelectedInstId] = useState<string>("");
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<string>("");
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);

  // Modals
  const [showOrgModal, setShowOrgModal] = useState(false);
  const [showClassModal, setShowClassModal] = useState(false);
  const [showSubjectModal, setShowSubjectModal] = useState(false);

  // Form states
  const [newOrgName, setNewOrgName] = useState("");
  const [newOrgType, setNewOrgType] = useState<"college" | "school" | "competitive">("college");
  const [newOrgCode, setNewOrgCode] = useState("");

  const [newClassName, setNewClassName] = useState("");
  const [newClassCode, setNewClassCode] = useState("");
  const [newClassDept, setNewClassDept] = useState("");

  const [newSubjName, setNewSubjName] = useState("");
  const [newSubjCode, setNewSubjCode] = useState("");
  const [newSubjCredits, setNewSubjCredits] = useState(4);
  const [newSubjSemOrGrade, setNewSubjSemOrGrade] = useState("Sem 1");

  const loadData = async () => {
    try {
      setLoading(true);
      const instList = await academicApi.listInstitutions();
      setInstitutions(instList);

      if (instList.length > 0) {
        const activeInst = selectedInstId && instList.some((i) => i.id === selectedInstId)
          ? selectedInstId
          : instList[0].id;
        setSelectedInstId(activeInst);

        const classList = await academicApi.listClasses(activeInst);
        setClasses(classList);

        const activeClass = selectedClassId && classList.some((c) => c.id === selectedClassId)
          ? selectedClassId
          : classList.length > 0
          ? classList[0].id
          : "";
        setSelectedClassId(activeClass);

        const subjList = await academicApi.listSubjects(activeInst, activeClass || undefined);
        setSubjects(subjList);
      } else {
        setSelectedInstId("");
        setClasses([]);
        setSubjects([]);
      }
    } catch (err) {
      console.error("Failed to load organizations:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSelectInstitution = async (instId: string) => {
    setSelectedInstId(instId);
    try {
      const classList = await academicApi.listClasses(instId);
      setClasses(classList);
      const activeClass = classList.length > 0 ? classList[0].id : "";
      setSelectedClassId(activeClass);
      const subjList = await academicApi.listSubjects(instId, activeClass || undefined);
      setSubjects(subjList);
    } catch (err) {
      console.error(err);
    }
  };

  const handleSelectClass = async (classId: string) => {
    setSelectedClassId(classId);
    try {
      const subjList = await academicApi.listSubjects(selectedInstId, classId || undefined);
      setSubjects(subjList);
    } catch (err) {
      console.error(err);
    }
  };

  const handleCreateOrg = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newOrgName.trim()) return;

    try {
      const created = await academicApi.createInstitution({
        name: newOrgName.trim(),
        type: newOrgType,
        code: newOrgCode.trim().toUpperCase()
      });
      setShowOrgModal(false);
      setNewOrgName("");
      setNewOrgCode("");
      const updated = [...institutions, created];
      setInstitutions(updated);
      await handleSelectInstitution(created.id);
    } catch {
      alert("Failed to create organization.");
    }
  };

  const handleCreateClass = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClassName.trim() || !selectedInstId) return;

    try {
      const created = await academicApi.createClass({
        name: newClassName.trim(),
        code: newClassCode.trim().toUpperCase(),
        department: newClassDept.trim(),
        institution_id: selectedInstId
      });
      setShowClassModal(false);
      setNewClassName("");
      setNewClassCode("");
      setNewClassDept("");
      const updated = [...classes, created];
      setClasses(updated);
      await handleSelectClass(created.id);
    } catch {
      alert("Failed to create class.");
    }
  };

  const handleCreateSubject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSubjName.trim() || !selectedInstId) return;

    try {
      const created = await academicApi.createSubject({
        name: newSubjName.trim(),
        code: newSubjCode.trim().toUpperCase(),
        institution_id: selectedInstId,
        class_id: selectedClassId,
        institution_type: currentOrg?.type || "college",
        semester_or_grade: newSubjSemOrGrade,
        credits: Number(newSubjCredits),
        academic_year: "2026-2027",
        chapters: []
      });
      setShowSubjectModal(false);
      setNewSubjName("");
      setNewSubjCode("");
      setSubjects([...subjects, created]);
    } catch {
      alert("Failed to create subject.");
    }
  };

  const currentOrg = institutions.find((i) => i.id === selectedInstId);
  const currentClass = classes.find((c) => c.id === selectedClassId);

  return (
    <div className="academics-hierarchy-page pb-24">
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1.75rem", flexWrap: "wrap", gap: "1rem" }}>
        <div>
          <h1 style={{ fontSize: "1.85rem", fontWeight: 800, color: "#0f172a", letterSpacing: "-0.03em", margin: 0 }}>
            {currentOrg ? currentOrg.name : "Organizations & Curriculum"}
          </h1>
          <p style={{ color: "#64748b", fontSize: "0.9rem", marginTop: "0.3rem", margin: 0 }}>
            Select an organization, view its classes, and manage enrolled subjects
          </p>
        </div>

        <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
          <button
            onClick={() => setShowOrgModal(true)}
            className="btn btn-secondary"
            style={{ display: "flex", alignItems: "center", gap: "0.4rem", fontSize: "0.85rem", padding: "0.5rem 0.85rem" }}
          >
            <Building2 size={15} />
            Add Organization
          </button>
          {institutions.length > 0 && (
            <button
              onClick={() => setShowClassModal(true)}
              className="btn btn-secondary"
              style={{ display: "flex", alignItems: "center", gap: "0.4rem", fontSize: "0.85rem", padding: "0.5rem 0.85rem" }}
            >
              <FolderGit2 size={15} />
              Add Class
            </button>
          )}
          {classes.length > 0 && (
            <button
              onClick={() => setShowSubjectModal(true)}
              className="btn btn-primary"
              style={{ display: "flex", alignItems: "center", gap: "0.4rem", fontSize: "0.85rem", padding: "0.5rem 0.95rem" }}
            >
              <Plus size={15} />
              Add Subject
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: "center", padding: "4rem", color: "#64748b" }}>
          Loading curriculum...
        </div>
      ) : institutions.length === 0 ? (
        <div
          style={{
            background: "#ffffff",
            border: "2px dashed #cbd5e1",
            borderRadius: "16px",
            padding: "3.5rem 2rem",
            textAlign: "center",
            maxWidth: "600px",
            margin: "2rem auto"
          }}
        >
          <Building2 size={44} style={{ color: "#2563eb", margin: "0 auto 1rem" }} />
          <h2 style={{ fontSize: "1.3rem", fontWeight: 800, color: "#0f172a", marginBottom: "0.4rem" }}>
            No Organizations Added Yet
          </h2>
          <p style={{ color: "#64748b", fontSize: "0.9rem", lineHeight: 1.5, marginBottom: "1.5rem" }}>
            Create your academic institution (College, School, or Competitive Academy) to organize your classes and subjects.
          </p>
          <button
            onClick={() => setShowOrgModal(true)}
            className="btn btn-primary"
            style={{ padding: "0.65rem 1.5rem", fontSize: "0.9rem", fontWeight: 700 }}
          >
            Add Organization
          </button>
        </div>
      ) : (
        <div>
          {/* Navigation Bar: Organization -> Class */}
          <div
            style={{
              background: "#ffffff",
              border: "1px solid #e2e8f0",
              borderRadius: "12px",
              padding: "0.85rem 1.25rem",
              marginBottom: "1.75rem",
              display: "flex",
              alignItems: "center",
              gap: "1rem",
              flexWrap: "wrap"
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <Building2 size={16} style={{ color: "#2563eb" }} />
              <span style={{ fontSize: "0.8rem", fontWeight: 700, color: "#64748b" }}>Organization:</span>
              <select
                value={selectedInstId}
                onChange={(e) => handleSelectInstitution(e.target.value)}
                style={{
                  padding: "0.4rem 0.75rem",
                  borderRadius: "6px",
                  border: "1px solid #cbd5e1",
                  fontSize: "0.85rem",
                  fontWeight: 600,
                  background: "#ffffff"
                }}
              >
                {institutions.map((i) => (
                  <option key={i.id} value={i.id}>
                    {i.name} ({i.type.toUpperCase()})
                  </option>
                ))}
              </select>
            </div>

            <ChevronRight size={16} style={{ color: "#cbd5e1" }} />

            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <FolderGit2 size={16} style={{ color: "#16a34a" }} />
              <span style={{ fontSize: "0.8rem", fontWeight: 700, color: "#64748b" }}>Class / Batch:</span>
              {classes.length === 0 ? (
                <button
                  onClick={() => setShowClassModal(true)}
                  style={{
                    background: "#f1f5f9",
                    border: "1px dashed #cbd5e1",
                    padding: "0.35rem 0.75rem",
                    borderRadius: "6px",
                    fontSize: "0.8rem",
                    cursor: "pointer",
                    color: "#334155"
                  }}
                >
                  + Add First Class
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
                    fontWeight: 600,
                    background: "#ffffff"
                  }}
                >
                  <option value="">All Classes</option>
                  {classes.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              )}
            </div>

            <div style={{ marginLeft: "auto", fontSize: "0.82rem", color: "#64748b", fontWeight: 600 }}>
              <strong>{subjects.length}</strong> Subjects Active
            </div>
          </div>

          {/* Subjects Grid */}
          {subjects.length === 0 ? (
            <div
              style={{
                background: "#ffffff",
                border: "2px dashed #cbd5e1",
                borderRadius: "14px",
                padding: "3rem 1.5rem",
                textAlign: "center"
              }}
            >
              <BookOpen size={40} style={{ color: "#94a3b8", margin: "0 auto 0.75rem" }} />
              <h3 style={{ fontSize: "1.15rem", fontWeight: 700, color: "#0f172a", marginBottom: "0.3rem" }}>
                No Subjects in {currentClass ? currentClass.name : currentOrg?.name}
              </h3>
              <p style={{ color: "#64748b", fontSize: "0.85rem", maxWidth: "420px", margin: "0 auto 1.25rem" }}>
                Add your curriculum subjects to configure exams, upload papers, and manage students.
              </p>
              <button
                onClick={() => setShowSubjectModal(true)}
                className="btn btn-primary"
                style={{ padding: "0.55rem 1.25rem", fontSize: "0.85rem" }}
              >
                Add Subject
              </button>
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))", gap: "1.25rem" }}>
              {subjects.map((s) => (
                <div
                  key={s.id}
                  style={{
                    background: "#ffffff",
                    border: "1px solid #e2e8f0",
                    borderRadius: "12px",
                    padding: "1.35rem",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "space-between"
                  }}
                >
                  <div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
                      <span style={{ fontSize: "0.75rem", fontWeight: 700, background: "#f1f5f9", color: "#334155", padding: "0.2rem 0.5rem", borderRadius: "4px" }}>
                        {s.code}
                      </span>
                      <span style={{ fontSize: "0.75rem", color: "#64748b", fontWeight: 600 }}>
                        {s.semester_or_grade} {s.credits ? `• ${s.credits} Credits` : ""}
                      </span>
                    </div>

                    <h3 style={{ fontSize: "1.15rem", fontWeight: 800, color: "#0f172a", marginBottom: "0.35rem" }}>
                      {s.name}
                    </h3>
                  </div>

                  <div style={{ display: "flex", gap: "0.5rem", marginTop: "1.25rem", paddingTop: "0.85rem", borderTop: "1px solid #f1f5f9" }}>
                    <button
                      onClick={() => onNavigate("exams", { subjectId: s.id })}
                      className="btn btn-primary"
                      style={{ flex: 1, fontSize: "0.8rem", padding: "0.45rem", display: "flex", alignItems: "center", justifyContent: "center", gap: "0.35rem" }}
                    >
                      <FileSpreadsheet size={14} />
                      Exams
                    </button>
                    <button
                      onClick={() => onNavigate("students", { subjectId: s.id })}
                      className="btn btn-secondary"
                      style={{ flex: 1, fontSize: "0.8rem", padding: "0.45rem", display: "flex", alignItems: "center", justifyContent: "center", gap: "0.35rem" }}
                    >
                      <Users size={14} />
                      {s.enrolled_students || 0} Students
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Modal: Add Organization */}
      {showOrgModal && (
        <div className="modal-backdrop" onClick={() => setShowOrgModal(false)}>
          <div className="modal-dialog" onClick={(e) => e.stopPropagation()} style={{ maxWidth: "480px" }}>
            <h3 style={{ fontSize: "1.25rem", fontWeight: 800, color: "#0f172a", marginBottom: "0.25rem" }}>
              Add Academic Organization
            </h3>
            <p style={{ fontSize: "0.82rem", color: "#64748b", marginBottom: "1.25rem" }}>
              Define an institution to group classes and subjects.
            </p>

            <form onSubmit={handleCreateOrg}>
              <div style={{ marginBottom: "1rem" }}>
                <label style={{ display: "block", fontSize: "0.78rem", fontWeight: 700, color: "#334155", marginBottom: "0.35rem" }}>
                  Organization Type
                </label>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "0.5rem" }}>
                  {(["college", "school", "competitive"] as const).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setNewOrgType(t)}
                      style={{
                        padding: "0.5rem",
                        borderRadius: "6px",
                        border: newOrgType === t ? "2px solid #2563eb" : "1px solid #cbd5e1",
                        background: newOrgType === t ? "#eff6ff" : "#ffffff",
                        color: newOrgType === t ? "#2563eb" : "#475569",
                        fontWeight: 700,
                        fontSize: "0.8rem",
                        cursor: "pointer",
                        textTransform: "capitalize"
                      }}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              <div style={{ marginBottom: "1rem" }}>
                <label style={{ display: "block", fontSize: "0.78rem", fontWeight: 700, color: "#334155", marginBottom: "0.35rem" }}>
                  Organization Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Enter organization name"
                  value={newOrgName}
                  onChange={(e) => setNewOrgName(e.target.value)}
                  style={{ width: "100%", padding: "0.55rem 0.75rem", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "0.88rem" }}
                />
              </div>

              <div style={{ marginBottom: "1.25rem" }}>
                <label style={{ display: "block", fontSize: "0.78rem", fontWeight: 700, color: "#334155", marginBottom: "0.35rem" }}>
                  Organization Code / Acronym
                </label>
                <input
                  type="text"
                  placeholder="e.g. UNIV, DEPT"
                  value={newOrgCode}
                  onChange={(e) => setNewOrgCode(e.target.value)}
                  style={{ width: "100%", padding: "0.55rem 0.75rem", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "0.88rem" }}
                />
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.5rem" }}>
                <button type="button" onClick={() => setShowOrgModal(false)} className="btn btn-secondary">
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Create Organization
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Add Class */}
      {showClassModal && (
        <div className="modal-backdrop" onClick={() => setShowClassModal(false)}>
          <div className="modal-dialog" onClick={(e) => e.stopPropagation()} style={{ maxWidth: "480px" }}>
            <h3 style={{ fontSize: "1.25rem", fontWeight: 800, color: "#0f172a", marginBottom: "0.25rem" }}>
              Add Class / Batch
            </h3>
            <p style={{ fontSize: "0.82rem", color: "#64748b", marginBottom: "1.25rem" }}>
              Belongs to: <strong>{currentOrg?.name}</strong>
            </p>

            <form onSubmit={handleCreateClass}>
              <div style={{ marginBottom: "1rem" }}>
                <label style={{ display: "block", fontSize: "0.78rem", fontWeight: 700, color: "#334155", marginBottom: "0.35rem" }}>
                  Class / Batch Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Semester 6 - CSE"
                  value={newClassName}
                  onChange={(e) => setNewClassName(e.target.value)}
                  style={{ width: "100%", padding: "0.55rem 0.75rem", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "0.88rem" }}
                />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem", marginBottom: "1.25rem" }}>
                <div>
                  <label style={{ display: "block", fontSize: "0.78rem", fontWeight: 700, color: "#334155", marginBottom: "0.35rem" }}>
                    Class Code
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. CSE-SEM6"
                    value={newClassCode}
                    onChange={(e) => setNewClassCode(e.target.value)}
                    style={{ width: "100%", padding: "0.55rem 0.75rem", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "0.88rem" }}
                  />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: "0.78rem", fontWeight: 700, color: "#334155", marginBottom: "0.35rem" }}>
                    Department
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Computer Science"
                    value={newClassDept}
                    onChange={(e) => setNewClassDept(e.target.value)}
                    style={{ width: "100%", padding: "0.55rem 0.75rem", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "0.88rem" }}
                  />
                </div>
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

      {/* Modal: Add Subject */}
      {showSubjectModal && (
        <div className="modal-backdrop" onClick={() => setShowSubjectModal(false)}>
          <div className="modal-dialog" onClick={(e) => e.stopPropagation()} style={{ maxWidth: "480px" }}>
            <h3 style={{ fontSize: "1.25rem", fontWeight: 800, color: "#0f172a", marginBottom: "0.25rem" }}>
              Add Subject
            </h3>
            <p style={{ fontSize: "0.82rem", color: "#64748b", marginBottom: "1.25rem" }}>
              Add subject to {currentClass ? currentClass.name : currentOrg?.name}
            </p>

            <form onSubmit={handleCreateSubject}>
              <div style={{ marginBottom: "1rem" }}>
                <label style={{ display: "block", fontSize: "0.78rem", fontWeight: 700, color: "#334155", marginBottom: "0.35rem" }}>
                  Subject Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Natural Language Processing"
                  value={newSubjName}
                  onChange={(e) => setNewSubjName(e.target.value)}
                  style={{ width: "100%", padding: "0.55rem 0.75rem", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "0.88rem" }}
                />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem", marginBottom: "1rem" }}>
                <div>
                  <label style={{ display: "block", fontSize: "0.78rem", fontWeight: 700, color: "#334155", marginBottom: "0.35rem" }}>
                    Subject Code *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. NLP-701"
                    value={newSubjCode}
                    onChange={(e) => setNewSubjCode(e.target.value)}
                    style={{ width: "100%", padding: "0.55rem 0.75rem", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "0.88rem" }}
                  />
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "0.78rem", fontWeight: 700, color: "#334155", marginBottom: "0.35rem" }}>
                    Semester / Grade
                  </label>
                  <input
                    type="text"
                    value={newSubjSemOrGrade}
                    onChange={(e) => setNewSubjSemOrGrade(e.target.value)}
                    style={{ width: "100%", padding: "0.55rem 0.75rem", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "0.88rem" }}
                  />
                </div>
              </div>

              <div style={{ marginBottom: "1.25rem" }}>
                <label style={{ display: "block", fontSize: "0.78rem", fontWeight: 700, color: "#334155", marginBottom: "0.35rem" }}>
                  Credits
                </label>
                <input
                  type="number"
                  min={1}
                  max={10}
                  value={newSubjCredits}
                  onChange={(e) => setNewSubjCredits(Number(e.target.value))}
                  style={{ width: "100%", padding: "0.55rem 0.75rem", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "0.88rem" }}
                />
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.5rem" }}>
                <button type="button" onClick={() => setShowSubjectModal(false)} className="btn btn-secondary">
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
