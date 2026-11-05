/**
 * Examination Evaluation Result and Scorecard Page.
 * 
 * Displays aggregated candidate performance metrics, total marks out of 300,
 * subject-wise distribution (Physics, Chemistry, Mathematics), Section B First-5
 * rule audit flags, and the complete interactive 90-question response matrix.
 */

import React from "react";
import type { EvaluationScorecard } from "../types/evaluation";
import { QuestionMatrix } from "../components/QuestionMatrix";
import { ArrowLeft, Printer, ShieldCheck } from "lucide-react";

interface ResultPageProps {
  /** The generated scorecard object to visualize */
  scorecard: EvaluationScorecard;
  /** Callback to return to the evaluation hub */
  onBackToDashboard: () => void;
}

export const ResultPage: React.FC<ResultPageProps> = ({ scorecard, onBackToDashboard }) => {
  const { candidate, scoring, analytics, audit_flags, processed_in_milliseconds } = scorecard;

  /**
   * Invokes native browser print dialog for paper scorecard generation.
   */
  const handlePrint = () => {
    window.print();
  };

  return (
    <div>
      {/* Top Action Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
        <button
          type="button"
          className="btn btn-secondary"
          onClick={onBackToDashboard}
        >
          <ArrowLeft size={16} />
          Evaluate Another Sheet
        </button>

        <button
          type="button"
          className="btn btn-secondary"
          onClick={handlePrint}
        >
          <Printer size={16} />
          Print Scorecard
        </button>
      </div>

      {/* Main Scorecard Header Card */}
      <div className="card" style={{ padding: "2rem", marginBottom: "1.5rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "1rem" }}>
          <div>
            <span className="brand-badge" style={{ marginBottom: "0.5rem", display: "inline-block" }}>
              Official Evaluation Result
            </span>
            <h1 style={{ fontSize: "1.75rem", fontWeight: 800, color: "var(--text-primary)" }}>
              {candidate.candidate_name}
            </h1>
            <p style={{ fontSize: "0.9rem", color: "var(--text-secondary)", marginTop: "0.2rem" }}>
              Roll Number: <strong>{candidate.roll_number}</strong> • Booklet: <strong>{candidate.booklet_code}</strong> • {candidate.exam_title}
            </p>
          </div>

          {/* Big Score Display */}
          <div style={{ textAlign: "right" }}>
            <p style={{ fontSize: "0.8rem", fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase" }}>
              Total Scaled Score
            </p>
            <div style={{ fontSize: "2.75rem", fontWeight: 900, letterSpacing: "-0.04em", color: scoring.total_score >= 0 ? "var(--text-primary)" : "var(--red)" }}>
              {scoring.total_score}
              <span style={{ fontSize: "1.25rem", fontWeight: 600, color: "var(--text-muted)" }}>
                / {scoring.max_possible_score}
              </span>
            </div>
            <p style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>
              Processed in {processed_in_milliseconds} ms on CPU
            </p>
          </div>
        </div>

        {/* Aggregate Stats Badges */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))",
            gap: "1rem",
            marginTop: "1.5rem",
            paddingTop: "1.5rem",
            borderTop: "1px solid var(--border-color)"
          }}
        >
          <div style={{ background: "var(--bg-secondary)", padding: "0.85rem", borderRadius: "6px", textAlign: "center" }}>
            <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", display: "block" }}>Accuracy</span>
            <strong style={{ fontSize: "1.25rem", color: "var(--blue)" }}>{analytics.accuracy_percentage}%</strong>
          </div>

          <div style={{ background: "var(--bg-secondary)", padding: "0.85rem", borderRadius: "6px", textAlign: "center" }}>
            <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", display: "block" }}>Correct (+4)</span>
            <strong style={{ fontSize: "1.25rem", color: "var(--green)" }}>{scoring.correct_count}</strong>
          </div>

          <div style={{ background: "var(--bg-secondary)", padding: "0.85rem", borderRadius: "6px", textAlign: "center" }}>
            <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", display: "block" }}>Incorrect (-1)</span>
            <strong style={{ fontSize: "1.25rem", color: "var(--red)" }}>{scoring.incorrect_count}</strong>
          </div>

          <div style={{ background: "var(--bg-secondary)", padding: "0.85rem", borderRadius: "6px", textAlign: "center" }}>
            <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", display: "block" }}>Skipped</span>
            <strong style={{ fontSize: "1.25rem", color: "var(--text-muted)" }}>{scoring.unattempted_count}</strong>
          </div>

          <div style={{ background: "var(--bg-secondary)", padding: "0.85rem", borderRadius: "6px", textAlign: "center" }}>
            <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", display: "block" }}>Section B Discarded</span>
            <strong style={{ fontSize: "1.25rem", color: "var(--amber)" }}>{scoring.overflow_ignored_count}</strong>
          </div>
        </div>
      </div>

      {/* Subject-Wise Performance Cards */}
      <h2 style={{ fontSize: "1.15rem", fontWeight: 700, marginBottom: "0.75rem" }}>
        Subject-Wise Performance Distribution
      </h2>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "1rem", marginBottom: "1.5rem" }}>
        {Object.entries(analytics.subject_breakdowns).map(([subjKey, data]) => (
          <div key={subjKey} className="card">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "0.75rem" }}>
              <h3 style={{ fontSize: "1.1rem", fontWeight: 700 }}>{data.subject}</h3>
              <div style={{ fontSize: "1.35rem", fontWeight: 800 }}>
                {data.score} <span style={{ fontSize: "0.85rem", color: "var(--text-muted)", fontWeight: 500 }}>/ {data.max_marks}</span>
              </div>
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.82rem", color: "var(--text-secondary)", borderTop: "1px solid var(--border-color)", paddingTop: "0.75rem" }}>
              <span>Correct: <strong style={{ color: "var(--green)" }}>{data.correct}</strong></span>
              <span>Incorrect: <strong style={{ color: "var(--red)" }}>{data.incorrect}</strong></span>
              <span>Skipped: <strong>{data.unattempted}</strong></span>
            </div>

            {data.overflow_ignored > 0 && (
              <div style={{ marginTop: "0.6rem", padding: "0.35rem 0.5rem", background: "var(--amber-bg)", borderRadius: "4px", fontSize: "0.75rem", color: "var(--amber)" }}>
                First-5 Rule: {data.overflow_ignored} excess numerical attempts discarded
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Quality Control & Audit Flags Banner */}
      <div className="card" style={{ background: "var(--bg-secondary)", marginBottom: "1.5rem" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.5rem" }}>
          <ShieldCheck size={18} color="var(--blue)" />
          <h3 style={{ fontSize: "0.95rem", fontWeight: 700 }}>Quality Control & NTA Integrity Audit</h3>
        </div>

        <div style={{ display: "flex", flexWrap: "wrap", gap: "1.25rem", fontSize: "0.82rem" }}>
          <span>
            Double Bubbling: {audit_flags.has_double_marks ? (
              <strong style={{ color: "var(--red)" }}>Detected & Penalized</strong>
            ) : (
              <strong style={{ color: "var(--green)" }}>None Detected</strong>
            )}
          </span>

          <span>
            Digit-Bubble Mismatch: {audit_flags.has_digit_bubble_mismatches ? (
              <strong style={{ color: "var(--red)" }}>Detected & Penalized</strong>
            ) : (
              <strong style={{ color: "var(--green)" }}>Zero Discrepancies</strong>
            )}
          </span>

          <span>
            Section B Overflow: {audit_flags.has_section_b_overflow ? (
              <strong style={{ color: "var(--amber)" }}>First 5 Evaluated (Strict Rule)</strong>
            ) : (
              <strong style={{ color: "var(--green)" }}>Under 5 Attempt Limit</strong>
            )}
          </span>
        </div>
      </div>

      {/* Mount 90-Question Detailed Grid */}
      <QuestionMatrix questions={scoring.question_scores} />
    </div>
  );
};
