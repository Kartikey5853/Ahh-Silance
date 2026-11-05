/**
 * Evaluation History Page.
 * 
 * Retrieves and lists previously computed examination scorecards stored in the
 * backend SQLite database for the authenticated user, allowing instantaneous reload.
 */

import React, { useEffect, useState } from "react";
import { authApi } from "../api/authApi";
import { evaluateApi } from "../api/evaluateApi";
import type { EvaluationHistoryItem } from "../types/auth";
import type { EvaluationScorecard } from "../types/evaluation";
import { History, Eye, AlertCircle, RefreshCw } from "lucide-react";

interface HistoryPageProps {
  /** Callback to view a specific loaded scorecard */
  onViewScorecard: (scorecard: EvaluationScorecard) => void;
}

export const HistoryPage: React.FC<HistoryPageProps> = ({ onViewScorecard }) => {
  const [historyItems, setHistoryItems] = useState<EvaluationHistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  /**
   * Fetches saved scorecards from SQLite via authApi.
   */
  const loadHistory = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const records = await authApi.getEvaluationHistory();
      setHistoryItems(records);
    } catch (err: any) {
      setErrorMessage("Could not load evaluation history records.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadHistory();
  }, []);

  /**
   * Loads full scorecard JSON for a selected evaluation record.
   */
  const handleInspect = async (evalId: string) => {
    try {
      const scorecard = await evaluateApi.getScorecard(evalId);
      onViewScorecard(scorecard);
    } catch (e) {
      alert("Failed to load historical scorecard details.");
    }
  };

  /**
   * Formats ISO timestamp string to clean date display.
   */
  const formatDate = (isoStr: string): string => {
    try {
      const d = new Date(isoStr);
      return d.toLocaleString();
    } catch {
      return isoStr;
    }
  };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
        <div>
          <h1 style={{ fontSize: "1.75rem", fontWeight: 800, letterSpacing: "-0.03em" }}>
            Evaluation History
          </h1>
          <p style={{ fontSize: "0.95rem", color: "var(--text-secondary)", marginTop: "0.25rem" }}>
            All candidate scorecards stored in SQLite database.
          </p>
        </div>

        <button type="button" className="btn btn-secondary" onClick={loadHistory} disabled={isLoading}>
          <RefreshCw size={14} className={isLoading ? "spin" : ""} />
          Refresh
        </button>
      </div>

      {errorMessage && (
        <div style={{ backgroundColor: "var(--red-bg)", border: "1px solid var(--red)", padding: "0.85rem", borderRadius: "6px", color: "var(--red)", marginBottom: "1rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <AlertCircle size={16} />
          <span>{errorMessage}</span>
        </div>
      )}

      {isLoading ? (
        <div style={{ textAlign: "center", padding: "3rem", color: "var(--text-muted)" }}>
          Loading evaluation history records from SQLite database...
        </div>
      ) : historyItems.length === 0 ? (
        <div className="card" style={{ textAlign: "center", padding: "3rem" }}>
          <History size={36} color="var(--text-muted)" style={{ margin: "0 auto 0.75rem auto" }} />
          <h3 style={{ fontSize: "1.1rem", fontWeight: 700 }}>No Evaluations Yet</h3>
          <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", marginTop: "0.25rem" }}>
            Evaluate an OMR sheet or marked question paper from the dashboard to save records here.
          </p>
        </div>
      ) : (
        <div className="card" style={{ padding: 0, overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.88rem" }}>
            <thead>
              <tr style={{ background: "var(--bg-secondary)", borderBottom: "1px solid var(--border-color)", textAlign: "left" }}>
                <th style={{ padding: "0.75rem 1rem" }}>Evaluation ID</th>
                <th style={{ padding: "0.75rem 1rem" }}>Roll Number</th>
                <th style={{ padding: "0.75rem 1rem" }}>Mode</th>
                <th style={{ padding: "0.75rem 1rem" }}>Total Score</th>
                <th style={{ padding: "0.75rem 1rem" }}>Timestamp</th>
                <th style={{ padding: "0.75rem 1rem", textAlign: "right" }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {historyItems.map((item) => (
                <tr key={item.evaluation_id} style={{ borderBottom: "1px solid var(--border-color)" }}>
                  <td style={{ padding: "0.75rem 1rem", fontFamily: "var(--font-mono)", fontSize: "0.82rem" }}>
                    {item.evaluation_id}
                  </td>
                  <td style={{ padding: "0.75rem 1rem", fontWeight: 600 }}>
                    {item.roll_number}
                  </td>
                  <td style={{ padding: "0.75rem 1rem", textTransform: "uppercase", fontSize: "0.78rem" }}>
                    <span style={{ padding: "0.2rem 0.5rem", background: "var(--bg-tertiary)", borderRadius: "4px" }}>
                      {item.mode}
                    </span>
                  </td>
                  <td style={{ padding: "0.75rem 1rem", fontWeight: 800, color: item.total_score >= 0 ? "var(--text-primary)" : "var(--red)" }}>
                    {item.total_score} <span style={{ fontSize: "0.78rem", color: "var(--text-muted)", fontWeight: 500 }}>/ {item.max_score}</span>
                  </td>
                  <td style={{ padding: "0.75rem 1rem", color: "var(--text-muted)", fontSize: "0.82rem" }}>
                    {formatDate(item.created_at)}
                  </td>
                  <td style={{ padding: "0.75rem 1rem", textAlign: "right" }}>
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={() => handleInspect(item.evaluation_id)}
                      style={{ padding: "0.35rem 0.65rem", fontSize: "0.8rem" }}
                    >
                      <Eye size={14} />
                      View
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
