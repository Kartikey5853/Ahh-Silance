/**
 * Interactive 90-Question JEE Examination Score Grid Component.
 * 
 * Organizes the candidate's responses into Physics, Chemistry, and Mathematics subjects.
 * Visually distinguishes Section A (MCQs) and Section B (Numerical), clearly marking
 * correct (+4), incorrect (-1), unattempted (0), and First-5 rule discarded overflows.
 */

import React, { useState } from "react";
import type { QuestionScoreItem } from "../types/evaluation";
import { CheckCircle2, XCircle, MinusCircle, AlertTriangle } from "lucide-react";

interface QuestionMatrixProps {
  /** Array of 90 evaluated question score objects */
  questions: QuestionScoreItem[];
}

export const QuestionMatrix: React.FC<QuestionMatrixProps> = ({ questions }) => {
  const [selectedSubject, setSelectedSubject] = useState<"ALL" | "PHY" | "CHEM" | "MATH">("ALL");

  /**
   * Filters the 90 questions based on the active subject tab.
   */
  const filteredQuestions = questions.filter((q) => {
    if (selectedSubject === "PHY") return q.question_no >= 1 && q.question_no <= 30;
    if (selectedSubject === "CHEM") return q.question_no >= 31 && q.question_no <= 60;
    if (selectedSubject === "MATH") return q.question_no >= 61 && q.question_no <= 90;
    return true;
  });

  /**
   * Returns a subject name based on question number.
   */
  const getSubjectName = (qNo: number): string => {
    if (qNo <= 30) return "Physics";
    if (qNo <= 60) return "Chemistry";
    return "Mathematics";
  };

  /**
   * Returns section category based on question number.
   */
  const getSectionName = (qNo: number): string => {
    const mod = qNo % 30;
    if (mod >= 1 && mod <= 20) return "Section A (MCQ)";
    return "Section B (Numerical)";
  };

  /**
   * Renders the 4 standard OMR bubble circles (A, B, C, D)
   * highlighting the candidate's marked bubble.
   */
  const renderBubbles = (markedOpt: string | null, isCorrect: boolean, isIncorrect: boolean) => {
    const options = ["A", "B", "C", "D"];
    return (
      <div style={{ display: "inline-flex", alignItems: "center", gap: "5px" }}>
        {options.map((opt) => {
          const isChosen = markedOpt === opt;
          let bg = "transparent";
          let color = "var(--text-muted)";
          let border = "1px solid var(--border-color)";

          if (isChosen) {
            bg = isCorrect ? "var(--green)" : isIncorrect ? "var(--red)" : "var(--primary)";
            color = "#ffffff";
            border = isCorrect ? "1px solid var(--green)" : isIncorrect ? "1px solid var(--red)" : "1px solid var(--primary)";
          }

          return (
            <span
              key={opt}
              style={{
                width: "22px",
                height: "22px",
                borderRadius: "50%",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "0.74rem",
                fontWeight: isChosen ? 700 : 500,
                backgroundColor: bg,
                color: color,
                border: border,
                boxShadow: isChosen ? "0 1px 3px rgba(0,0,0,0.18)" : "none"
              }}
            >
              {opt}
            </span>
          );
        })}
        {markedOpt && (
          <span style={{ marginLeft: "6px", fontWeight: 700, fontSize: "0.85rem", color: isCorrect ? "var(--green)" : isIncorrect ? "var(--red)" : "var(--text-primary)" }}>
            Option {markedOpt}
          </span>
        )}
      </div>
    );
  };

  return (
    <div className="card" style={{ marginTop: "1.5rem" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "0.75rem", marginBottom: "1rem" }}>
        <div>
          <h3 className="card-title">Question-by-Question Evaluation Grid</h3>
          <p className="card-subtitle">
            Complete 90-question response audit showing candidate response, master key, and marks awarded.
          </p>
        </div>

        {/* Subject Filter Tabs */}
        <div style={{ display: "flex", gap: "0.5rem" }}>
          {(["ALL", "PHY", "CHEM", "MATH"] as const).map((tab) => (
            <button
              key={tab}
              type="button"
              className={`btn btn-secondary ${selectedSubject === tab ? "active" : ""}`}
              onClick={() => setSelectedSubject(tab)}
              style={{
                padding: "0.35rem 0.75rem",
                fontSize: "0.82rem",
                fontWeight: selectedSubject === tab ? 700 : 500,
                backgroundColor: selectedSubject === tab ? "var(--primary)" : "#ffffff",
                color: selectedSubject === tab ? "#ffffff" : "var(--text-primary)"
              }}
            >
              {tab === "ALL" && "All Questions (90)"}
              {tab === "PHY" && "Physics (1-30)"}
              {tab === "CHEM" && "Chemistry (31-60)"}
              {tab === "MATH" && "Mathematics (61-90)"}
            </button>
          ))}
        </div>
      </div>

      {/* Legend */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: "1rem", padding: "0.6rem 0.85rem", background: "var(--bg-secondary)", borderRadius: "6px", fontSize: "0.78rem" }}>
        <span style={{ display: "flex", alignItems: "center", gap: "0.3rem" }}>
          <span style={{ width: "10px", height: "10px", borderRadius: "50%", background: "var(--green)" }} />
          <strong>Correct (+4)</strong>
        </span>
        <span style={{ display: "flex", alignItems: "center", gap: "0.3rem" }}>
          <span style={{ width: "10px", height: "10px", borderRadius: "50%", background: "var(--red)" }} />
          <strong>Incorrect (-1)</strong>
        </span>
        <span style={{ display: "flex", alignItems: "center", gap: "0.3rem" }}>
          <span style={{ width: "10px", height: "10px", borderRadius: "50%", background: "var(--text-muted)" }} />
          <strong>Unattempted (0)</strong>
        </span>
        <span style={{ display: "flex", alignItems: "center", gap: "0.3rem" }}>
          <span style={{ width: "10px", height: "10px", borderRadius: "50%", background: "var(--amber)" }} />
          <strong>Section B Discarded (First-5 Rule)</strong>
        </span>
      </div>

      {/* Question Table */}
      <div style={{ overflowX: "auto", marginTop: "1rem" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.85rem" }}>
          <thead>
            <tr style={{ borderBottom: "2px solid var(--border-color)", textAlign: "left", background: "var(--bg-secondary)" }}>
              <th style={{ padding: "0.6rem 0.75rem" }}>Q#</th>
              <th style={{ padding: "0.6rem 0.75rem" }}>Subject & Section</th>
              <th style={{ padding: "0.6rem 0.75rem" }}>Type</th>
              <th style={{ padding: "0.6rem 0.75rem" }}>Your Response</th>
              <th style={{ padding: "0.6rem 0.75rem" }}>Master Key</th>
              <th style={{ padding: "0.6rem 0.75rem" }}>Marks</th>
              <th style={{ padding: "0.6rem 0.75rem" }}>Status</th>
            </tr>
          </thead>
          <tbody>
            {filteredQuestions.map((q) => {
              const verdictStr = String(q.verdict || q.status || "");
              const isCorrect = verdictStr === "CORRECT" || verdictStr === "DROPPED_BONUS";
              const isIncorrect = verdictStr === "INCORRECT";
              const isOverflow = verdictStr === "OVERFLOW_IGNORED" || verdictStr === "IGNORED_BY_FIRST_5_RULE";

              let badgeClass = "badge-unattempted";
              let statusText = "Skipped";
              let Icon = MinusCircle;

              if (isCorrect) {
                badgeClass = "badge-correct";
                statusText = "Correct (+4)";
                Icon = CheckCircle2;
              } else if (isIncorrect) {
                badgeClass = "badge-incorrect";
                statusText = "Incorrect (-1)";
                Icon = XCircle;
              } else if (isOverflow) {
                badgeClass = "badge-overflow";
                statusText = "Discarded (First 5 Rule)";
                Icon = AlertTriangle;
              }

              const candResp = q.student_answer ?? q.candidate_response ?? (q as any).student_marked ?? (q as any).written_value ?? null;
              const correctKey = q.correct_answer ?? (q as any).correct_options?.join(", ") ?? (q as any).numerical_exact ?? "—";
              const qType = q.question_type || ((q.question_no % 30 >= 1 && q.question_no % 30 <= 20) ? "MCQ" : "NUMERICAL");

              return (
                <tr
                  key={q.question_no}
                  style={{
                    borderBottom: "1px solid var(--border-color)",
                    backgroundColor: isOverflow ? "var(--amber-bg)" : "transparent"
                  }}
                >
                  <td style={{ padding: "0.6rem 0.75rem", fontWeight: 700 }}>
                    Q{q.question_no}
                  </td>
                  <td style={{ padding: "0.6rem 0.75rem", color: "var(--text-secondary)" }}>
                    {getSubjectName(q.question_no)} • {getSectionName(q.question_no)}
                  </td>
                  <td style={{ padding: "0.6rem 0.75rem" }}>
                    <span style={{ fontSize: "0.75rem", padding: "0.15rem 0.4rem", background: "var(--bg-tertiary)", borderRadius: "4px" }}>
                      {qType}
                    </span>
                  </td>
                  <td style={{ padding: "0.6rem 0.75rem" }}>
                    {qType === "MCQ" ? (
                      candResp === "MULTIPLE_BUBBLES" ? (
                        <span className="badge badge-incorrect" style={{ fontSize: "0.75rem" }}>
                          Multiple Bubbles Marked
                        </span>
                      ) : candResp ? (
                        renderBubbles(candResp, isCorrect, isIncorrect)
                      ) : (
                        <span style={{ color: "var(--text-muted)", fontStyle: "italic", fontSize: "0.82rem" }}>
                          Unattempted
                        </span>
                      )
                    ) : (
                      candResp ? (
                        <span style={{
                          padding: "0.2rem 0.55rem",
                          background: isCorrect ? "rgba(16, 185, 129, 0.1)" : isIncorrect ? "rgba(239, 68, 68, 0.1)" : "var(--bg-tertiary)",
                          border: `1px solid ${isCorrect ? "var(--green)" : isIncorrect ? "var(--red)" : "var(--border-color)"}`,
                          borderRadius: "4px",
                          fontWeight: 700,
                          fontFamily: "var(--font-mono)",
                          fontSize: "0.85rem",
                          color: isCorrect ? "var(--green)" : isIncorrect ? "var(--red)" : "var(--text-primary)"
                        }}>
                          Written: {candResp}
                        </span>
                      ) : (
                        <span style={{ color: "var(--text-muted)", fontStyle: "italic", fontSize: "0.82rem" }}>
                          Unattempted
                        </span>
                      )
                    )}
                  </td>
                  <td style={{ padding: "0.6rem 0.75rem", fontFamily: "var(--font-mono)", color: "var(--text-primary)" }}>
                    <span style={{
                      fontWeight: 600,
                      padding: "0.15rem 0.5rem",
                      borderRadius: "4px",
                      backgroundColor: "var(--bg-secondary)",
                      border: "1px solid var(--border-color)"
                    }}>
                      {correctKey}
                    </span>
                  </td>
                  <td style={{ padding: "0.6rem 0.75rem", fontWeight: 700, color: isCorrect ? "var(--green)" : isIncorrect ? "var(--red)" : "var(--text-muted)" }}>
                    {q.marks_awarded > 0 ? `+${q.marks_awarded}` : q.marks_awarded}
                  </td>
                  <td style={{ padding: "0.6rem 0.75rem" }}>
                    <span className={`badge ${badgeClass}`} style={{ display: "inline-flex", gap: "0.25rem" }}>
                      <Icon size={12} />
                      {statusText}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
