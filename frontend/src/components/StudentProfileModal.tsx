import React, { useState, useEffect } from "react";
import { academicApi } from "../api/academicApi";
import type { Student, AcademicEvaluation } from "../types/academic";
import { X, User, ChevronDown, ChevronUp } from "lucide-react";

interface StudentProfileModalProps {
  student: Student | null;
  onClose: () => void;
  onNavigateToEvaluation?: (evalId: string) => void;
}

export const StudentProfileModal: React.FC<StudentProfileModalProps> = ({
  student,
  onClose,
  onNavigateToEvaluation
}) => {
  const [evaluations, setEvaluations] = useState<AcademicEvaluation[]>([]);
  const [loading, setLoading] = useState(false);
  const [expandedEvalId, setExpandedEvalId] = useState<string | null>(null);

  useEffect(() => {
    if (!student) {
      setEvaluations([]);
      return;
    }
    setLoading(true);
    academicApi
      .listEvaluations(undefined, student.id)
      .then((data) => {
        setEvaluations(data);
        if (data.length > 0) {
          setExpandedEvalId(data[0].id);
        }
      })
      .catch((err) => {
        console.error("Failed to load evaluations for student:", err);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [student]);

  if (!student) return null;

  const totalExams = evaluations.length;
  const avgScore =
    totalExams > 0
      ? Math.round(
          evaluations.reduce((acc, curr) => acc + (curr.percentage || 0), 0) /
            totalExams
        )
      : null;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal-dialog"
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth: "760px",
          width: "100%",
          maxHeight: "90vh",
          display: "flex",
          flexDirection: "column",
          padding: 0,
          overflow: "hidden"
        }}
      >
        {/* Modal Header */}
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
          <div style={{ display: "flex", alignItems: "center", gap: "0.85rem" }}>
            <div
              style={{
                width: "42px",
                height: "42px",
                borderRadius: "50%",
                background: "#eff6ff",
                color: "#2563eb",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontWeight: 700
              }}
            >
              <User size={20} />
            </div>
            <div>
              <h2
                style={{
                  fontSize: "1.25rem",
                  fontWeight: 800,
                  color: "#0f172a",
                  margin: 0
                }}
              >
                {student.name}
              </h2>
              <p
                style={{
                  fontSize: "0.82rem",
                  color: "#64748b",
                  margin: 0,
                  marginTop: "0.15rem"
                }}
              >
                Roll Number: {student.roll_number} • Section {student.section || "A"}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              color: "#94a3b8",
              padding: "0.35rem",
              borderRadius: "6px"
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Modal Body */}
        <div
          style={{
            padding: "1.5rem 1.75rem",
            overflowY: "auto",
            display: "flex",
            flexDirection: "column",
            gap: "1.5rem"
          }}
        >
          {/* Key Metrics */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, 1fr)",
              gap: "1rem"
            }}
          >
            <div
              style={{
                background: "#f8fafc",
                border: "1px solid #e2e8f0",
                padding: "1rem",
                borderRadius: "10px"
              }}
            >
              <div
                style={{
                  fontSize: "0.75rem",
                  color: "#64748b",
                  fontWeight: 600,
                  textTransform: "uppercase"
                }}
              >
                Evaluated Exams
              </div>
              <div
                style={{
                  fontSize: "1.5rem",
                  fontWeight: 800,
                  color: "#0f172a",
                  marginTop: "0.25rem"
                }}
              >
                {totalExams}
              </div>
            </div>

            <div
              style={{
                background: "#f8fafc",
                border: "1px solid #e2e8f0",
                padding: "1rem",
                borderRadius: "10px"
              }}
            >
              <div
                style={{
                  fontSize: "0.75rem",
                  color: "#64748b",
                  fontWeight: 600,
                  textTransform: "uppercase"
                }}
              >
                Average Score
              </div>
              <div
                style={{
                  fontSize: "1.5rem",
                  fontWeight: 800,
                  color: "#0f172a",
                  marginTop: "0.25rem"
                }}
              >
                {avgScore !== null ? `${avgScore}%` : "—"}
              </div>
            </div>

            <div
              style={{
                background: "#f8fafc",
                border: "1px solid #e2e8f0",
                padding: "1rem",
                borderRadius: "10px"
              }}
            >
              <div
                style={{
                  fontSize: "0.75rem",
                  color: "#64748b",
                  fontWeight: 600,
                  textTransform: "uppercase"
                }}
              >
                Status
              </div>
              <div
                style={{
                  fontSize: "1.1rem",
                  fontWeight: 700,
                  color: "#16a34a",
                  marginTop: "0.5rem"
                }}
              >
                Enrolled Active
              </div>
            </div>
          </div>

          {/* Evaluations History List */}
          <div>
            <h3
              style={{
                fontSize: "1rem",
                fontWeight: 700,
                color: "#0f172a",
                marginBottom: "0.25rem"
              }}
            >
              Evaluation Scorecards
            </h3>
            <p
              style={{
                fontSize: "0.82rem",
                color: "#64748b",
                marginBottom: "1rem"
              }}
            >
              Detailed rubrics and question-level breakdowns from completed evaluations.
            </p>

            {loading ? (
              <div
                style={{
                  textAlign: "center",
                  padding: "2rem",
                  color: "#64748b",
                  fontSize: "0.88rem"
                }}
              >
                Loading evaluation history...
              </div>
            ) : evaluations.length === 0 ? (
              <div
                style={{
                  background: "#f8fafc",
                  border: "1px dashed #cbd5e1",
                  borderRadius: "10px",
                  padding: "2rem",
                  textAlign: "center",
                  color: "#64748b",
                  fontSize: "0.88rem"
                }}
              >
                No evaluated answer sheets recorded for this student yet.
              </div>
            ) : (
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "0.85rem"
                }}
              >
                {evaluations.map((ev) => {
                  const isExpanded = expandedEvalId === ev.id;
                  return (
                    <div
                      key={ev.id}
                      style={{
                        background: "#ffffff",
                        border: "1px solid #e2e8f0",
                        borderRadius: "10px",
                        overflow: "hidden"
                      }}
                    >
                      {/* Summary Row */}
                      <div
                        onClick={() =>
                          setExpandedEvalId(isExpanded ? null : ev.id)
                        }
                        style={{
                          padding: "1rem 1.25rem",
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          cursor: "pointer",
                          background: isExpanded ? "#f8fafc" : "#ffffff",
                          transition: "background 0.15s ease"
                        }}
                      >
                        <div>
                          <div
                            style={{
                              fontSize: "0.95rem",
                              fontWeight: 700,
                              color: "#0f172a"
                            }}
                          >
                            Score: {ev.total_score} / {ev.max_score} ({ev.percentage}%)
                          </div>
                          <div
                            style={{
                              fontSize: "0.8rem",
                              color: "#64748b",
                              marginTop: "0.2rem"
                            }}
                          >
                            Grade: {ev.grade || "Passed"} • {ev.created_at || "Recent Evaluation"}
                          </div>
                        </div>

                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "0.75rem"
                          }}
                        >
                          <span
                            style={{
                              background:
                                ev.percentage >= 75 ? "#dcfce7" : "#fef3c7",
                              color:
                                ev.percentage >= 75 ? "#166534" : "#92400e",
                              fontWeight: 700,
                              fontSize: "0.75rem",
                              padding: "0.25rem 0.55rem",
                              borderRadius: "9999px"
                            }}
                          >
                            {ev.grade || "Evaluated"}
                          </span>
                          {isExpanded ? (
                            <ChevronUp size={18} style={{ color: "#64748b" }} />
                          ) : (
                            <ChevronDown size={18} style={{ color: "#64748b" }} />
                          )}
                        </div>
                      </div>

                      {/* Expanded Question Breakdown */}
                      {isExpanded && (
                        <div
                          style={{
                            padding: "1.25rem",
                            borderTop: "1px solid #e2e8f0",
                            background: "#ffffff"
                          }}
                        >
                          <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "0.75rem" }}>
                            {onNavigateToEvaluation && (
                              <button
                                type="button"
                                onClick={() => onNavigateToEvaluation(ev.id)}
                                className="btn btn-secondary"
                                style={{ fontSize: "0.78rem", padding: "0.3rem 0.65rem" }}
                              >
                                View in Evaluation Console
                              </button>
                            )}
                          </div>

                          {ev.teacher_feedback && (
                            <div
                              style={{
                                background: "#f0fdf4",
                                border: "1px solid #bbf7d0",
                                padding: "0.85rem 1rem",
                                borderRadius: "8px",
                                fontSize: "0.85rem",
                                color: "#166534",
                                marginBottom: "1rem"
                              }}
                            >
                              <strong>Evaluation Summary:</strong> {ev.teacher_feedback}
                            </div>
                          )}

                          <div
                            style={{
                              fontSize: "0.8rem",
                              fontWeight: 700,
                              color: "#475569",
                              marginBottom: "0.5rem",
                              textTransform: "uppercase"
                            }}
                          >
                            Question Breakdown
                          </div>

                          <div
                            style={{
                              display: "flex",
                              flexDirection: "column",
                              gap: "0.5rem"
                            }}
                          >
                            {ev.breakdown &&
                              ev.breakdown.map((item, idx) => (
                                <div
                                  key={idx}
                                  style={{
                                    border: "1px solid #f1f5f9",
                                    background: "#f8fafc",
                                    borderRadius: "8px",
                                    padding: "0.75rem 0.9rem"
                                  }}
                                >
                                  <div
                                    style={{
                                      display: "flex",
                                      justifyContent: "space-between",
                                      alignItems: "center",
                                      marginBottom: "0.35rem"
                                    }}
                                  >
                                    <span
                                      style={{
                                        fontWeight: 700,
                                        fontSize: "0.85rem",
                                        color: "#0f172a"
                                      }}
                                    >
                                      {item.q_no}
                                    </span>
                                    <span
                                      style={{
                                        fontSize: "0.85rem",
                                        fontWeight: 700,
                                        color:
                                          item.awarded_marks >= item.max_marks * 0.8
                                            ? "#16a34a"
                                            : item.awarded_marks > 0
                                            ? "#d97706"
                                            : "#dc2626"
                                      }}
                                    >
                                      {item.awarded_marks} / {item.max_marks} Marks
                                    </span>
                                  </div>

                                  {item.evidence_quote && (
                                    <div
                                      style={{
                                        fontSize: "0.78rem",
                                        color: "#475569",
                                        fontStyle: "italic",
                                        marginBottom: "0.25rem"
                                      }}
                                    >
                                      "{item.evidence_quote}"
                                    </div>
                                  )}

                                  {item.deduction_reason && item.deduction_reason !== "None" && (
                                    <div
                                      style={{
                                        fontSize: "0.76rem",
                                        color: "#dc2626"
                                      }}
                                    >
                                      Deduction: {item.deduction_reason}
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
        </div>

        {/* Modal Footer */}
        <div
          style={{
            padding: "1rem 1.75rem",
            borderTop: "1px solid #e2e8f0",
            background: "#f8fafc",
            display: "flex",
            justifyContent: "flex-end"
          }}
        >
          <button
            type="button"
            onClick={onClose}
            className="btn btn-secondary"
            style={{ padding: "0.5rem 1.25rem", fontSize: "0.85rem" }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
