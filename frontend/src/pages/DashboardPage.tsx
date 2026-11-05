/**
 * Examination Evaluation Submission Dashboard.
 * 
 * Provides inputs for selecting evaluation mode (OMR Sheet vs Marked Question Paper),
 * uploading student document files from computer or snapping live camera snapshots,
 * uploading the mandatory master answer key (JSON, CSV, or TXT), and triggering pipeline evaluation.
 */

import React, { useState } from "react";
import { FileUploadDropzone } from "../components/FileUploadDropzone";
import { CameraCapture } from "../components/CameraCapture";
import { evaluateApi } from "../api/evaluateApi";
import { apiClient } from "../api/client";
import type { EvaluationScorecard } from "../types/evaluation";
import { FileSpreadsheet, BookOpen, AlertCircle, ArrowRight, Sparkles } from "lucide-react";

interface DashboardPageProps {
  /** Callback fired when evaluation succeeds, passing the resulting scorecard */
  onEvaluationComplete: (scorecard: EvaluationScorecard) => void;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({ onEvaluationComplete }) => {
  // Mode: "omr" or "marked_paper"
  const [evaluationMode, setEvaluationMode] = useState<"omr" | "marked_paper">("omr");

  // Sheet File & Mandatory Answer Key File
  const [sheetFile, setSheetFile] = useState<File | null>(null);
  const [answerKeyFile, setAnswerKeyFile] = useState<File | null>(null);

  // Exam ID & Candidate Details
  const [examId, setExamId] = useState("JEE_Main_2025_Jan_22_Shift1");
  const [candidateName, setCandidateName] = useState("Student Candidate");

  // Camera Modal State
  const [cameraActiveFor, setCameraActiveFor] = useState<"sheet" | "answerKey" | null>(null);

  // Submission & Preset Loading State
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loadingPreset, setLoadingPreset] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  /**
   * Handles camera snapshot capture and binds to active file state.
   */
  const handleCameraCapture = (capturedFile: File) => {
    if (cameraActiveFor === "sheet") {
      setSheetFile(capturedFile);
    } else if (cameraActiveFor === "answerKey") {
      setAnswerKeyFile(capturedFile);
    }
    setCameraActiveFor(null);
  };

  /**
   * Loads both the document and its matching answer key from the external_test dataset.
   */
  const handleLoadExternalPreset = async (presetKey: "omr1" | "omr2" | "pdf10") => {
    setErrorMessage(null);
    setLoadingPreset(presetKey);

    try {
      let sheetName = "omr_sheet_01.png";
      let keyName = "answer_key_01.json";
      let mode: "omr" | "marked_paper" = "omr";

      if (presetKey === "omr2") {
        sheetName = "omr_sheet_02.png";
        keyName = "answer_key_02.csv";
        mode = "omr";
      } else if (presetKey === "pdf10") {
        sheetName = "marked_question_paper_10pages.pdf";
        keyName = "marked_paper_answer_key.json";
        mode = "marked_paper";
      }

      setEvaluationMode(mode);

      // Fetch sheet file blob
      const sheetRes = await apiClient.get(`/evaluate/sample-file?filename=${sheetName}`, { responseType: "blob" });
      const loadedSheet = new File([sheetRes.data], sheetName, { type: sheetRes.data.type || "application/octet-stream" });

      // Fetch answer key file blob
      const keyRes = await apiClient.get(`/evaluate/sample-file?filename=${keyName}`, { responseType: "blob" });
      const loadedKey = new File([keyRes.data], keyName, { type: keyRes.data.type || "application/json" });

      setSheetFile(loadedSheet);
      setAnswerKeyFile(loadedKey);
    } catch (e) {
      console.error("Failed to load preset:", e);
      setErrorMessage("Could not load external test preset files from the server.");
    } finally {
      setLoadingPreset(null);
    }
  };

  /**
   * Dispatches evaluation request to backend API.
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sheetFile) {
      setErrorMessage("Please select or photograph the student document (OMR sheet or marked question paper).");
      return;
    }

    if (!answerKeyFile) {
      setErrorMessage("Answer key is mandatory. There are no default answers in the engine; please upload the master key file.");
      return;
    }

    setErrorMessage(null);
    setIsSubmitting(true);

    try {
      const scorecard = await evaluateApi.evaluateUpload({
        sheetFile,
        answerKeyFile,
        examId,
        mode: evaluationMode,
        candidateName
      });
      onEvaluationComplete(scorecard);
    } catch (err: any) {
      console.error("Evaluation error:", err);
      if (err.response && err.response.data && err.response.data.detail) {
        setErrorMessage(err.response.data.detail);
      } else {
        setErrorMessage("Evaluation failed. Please verify the document format or connection.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div>
      {/* Top Banner / Title */}
      <div style={{ marginBottom: "2rem" }}>
        <h1 style={{ fontSize: "1.75rem", fontWeight: 800, letterSpacing: "-0.03em", color: "var(--text-primary)" }}>
          Examination Evaluation Hub
        </h1>
        <p style={{ fontSize: "0.95rem", color: "var(--text-secondary)", marginTop: "0.25rem" }}>
          Submit student response documents alongside the master answer key to calculate NTA-standard scorecards.
        </p>
      </div>

      {/* Mode Switcher Tabs */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "1.5rem" }}>
        <div
          onClick={() => setEvaluationMode("omr")}
          className="card"
          style={{
            cursor: "pointer",
            border: evaluationMode === "omr" ? "2px solid var(--primary)" : "1px solid var(--border-color)",
            backgroundColor: evaluationMode === "omr" ? "var(--bg-secondary)" : "#ffffff",
            transition: "all 0.15s ease"
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
            <div
              style={{
                width: "40px",
                height: "40px",
                borderRadius: "8px",
                background: evaluationMode === "omr" ? "var(--primary)" : "var(--bg-tertiary)",
                color: evaluationMode === "omr" ? "#ffffff" : "var(--text-primary)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center"
              }}
            >
              <FileSpreadsheet size={22} />
            </div>
            <div>
              <h3 style={{ fontSize: "1rem", fontWeight: 700 }}>OMR Sheet + Answer Key</h3>
              <p style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
                Scanned bubble sheets with MCQ rows and numerical grid boxes.
              </p>
            </div>
          </div>
        </div>

        <div
          onClick={() => setEvaluationMode("marked_paper")}
          className="card"
          style={{
            cursor: "pointer",
            border: evaluationMode === "marked_paper" ? "2px solid var(--primary)" : "1px solid var(--border-color)",
            backgroundColor: evaluationMode === "marked_paper" ? "var(--bg-secondary)" : "#ffffff",
            transition: "all 0.15s ease"
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
            <div
              style={{
                width: "40px",
                height: "40px",
                borderRadius: "8px",
                background: evaluationMode === "marked_paper" ? "var(--primary)" : "var(--bg-tertiary)",
                color: evaluationMode === "marked_paper" ? "#ffffff" : "var(--text-primary)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center"
              }}
            >
              <BookOpen size={22} />
            </div>
            <div>
              <h3 style={{ fontSize: "1rem", fontWeight: 700 }}>Marked Question Paper + Answer Key</h3>
              <p style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
                Scanned 10-page test booklet with circled or checked student responses.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Preset 1-Click Test Loader Box */}
      <div className="card" style={{ background: "var(--bg-secondary)", padding: "1rem 1.25rem", marginBottom: "1.5rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "0.75rem" }}>
          <div>
            <span style={{ fontSize: "0.88rem", fontWeight: 700, color: "var(--text-primary)", display: "flex", alignItems: "center", gap: "0.4rem" }}>
              <Sparkles size={16} color="var(--blue)" />
              External Test Dataset (1-Click Test Presets)
            </span>
            <p style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>
              Loads paired student document and matching answer key from <code>Dataset/external_test</code>:
            </p>
          </div>

          <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => handleLoadExternalPreset("omr1")}
              disabled={!!loadingPreset}
              style={{ fontSize: "0.8rem", padding: "0.4rem 0.75rem" }}
            >
              {loadingPreset === "omr1" ? "Loading..." : "Load External Test #1 (OMR + JSON Key)"}
            </button>

            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => handleLoadExternalPreset("omr2")}
              disabled={!!loadingPreset}
              style={{ fontSize: "0.8rem", padding: "0.4rem 0.75rem" }}
            >
              {loadingPreset === "omr2" ? "Loading..." : "Load External Test #2 (OMR + CSV Key)"}
            </button>

            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => handleLoadExternalPreset("pdf10")}
              disabled={!!loadingPreset}
              style={{ fontSize: "0.8rem", padding: "0.4rem 0.75rem" }}
            >
              {loadingPreset === "pdf10" ? "Loading..." : "Load 10-Page Marked Paper (PDF + Key)"}
            </button>
          </div>
        </div>
      </div>

      {/* Main Upload Form */}
      <form onSubmit={handleSubmit}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: "1.5rem" }}>
          {/* Card 1: Student Sheet File */}
          <div className="card">
            <div className="card-header">
              <h2 className="card-title">
                1. Student Response Document <span style={{ color: "var(--red)" }}>*</span>
              </h2>
              <p className="card-subtitle">
                Upload the candidate's OMR sheet image or 10-page marked question paper PDF.
              </p>
            </div>

            <FileUploadDropzone
              label={evaluationMode === "omr" ? "Candidate OMR Sheet (Required)" : "Marked Question Paper PDF (Required)"}
              description="PNG, JPG, JPEG, or PDF"
              selectedFile={sheetFile}
              onFileSelect={setSheetFile}
              onTriggerCamera={() => setCameraActiveFor("sheet")}
            />
          </div>

          {/* Card 2: Master Answer Key File */}
          <div className="card">
            <div className="card-header">
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <h2 className="card-title">
                  2. Master Answer Key <span style={{ color: "var(--red)" }}>* (Required)</span>
                </h2>
                <span className="badge badge-correct" style={{ fontSize: "0.7rem" }}>No Defaults</span>
              </div>
              <p className="card-subtitle">
                The evaluation evaluates strictly against this file. Supports JSON, CSV, or TXT formats.
              </p>
            </div>

            <FileUploadDropzone
              label="Master Answer Key File (Required)"
              description="Upload JSON (e.g. {'1': 'A'}), CSV ('1,A'), or TXT ('Q1: A')"
              selectedFile={answerKeyFile}
              onFileSelect={setAnswerKeyFile}
              onTriggerCamera={() => setCameraActiveFor("answerKey")}
              accept=".json,.csv,.txt,.dat,image/*"
            />
          </div>

          {/* Card 3: Candidate & Exam Details */}
          <div className="card">
            <h2 className="card-title" style={{ marginBottom: "1rem" }}>
              3. Candidate & Examination Parameters
            </h2>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
              <div className="form-group">
                <label className="form-label" htmlFor="candidateName">
                  Candidate Name
                </label>
                <input
                  id="candidateName"
                  type="text"
                  className="form-input"
                  value={candidateName}
                  onChange={(e) => setCandidateName(e.target.value)}
                  placeholder="e.g. Student Candidate"
                />
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="examId">
                  Examination Session
                </label>
                <input
                  id="examId"
                  type="text"
                  className="form-input"
                  value={examId}
                  onChange={(e) => setExamId(e.target.value)}
                  placeholder="e.g. JEE_Main_2025_Jan_22_Shift1"
                />
              </div>
            </div>

            <div style={{ padding: "0.85rem", background: "var(--bg-secondary)", borderRadius: "6px", fontSize: "0.82rem", color: "var(--text-secondary)" }}>
              <strong>Strict NTA Scoring Engine:</strong> Answers are compared 1-to-1 against your uploaded Answer Key. Section B enforces the <strong>First-5 Attempt Rule</strong>, discarding any surplus numerical attempts.
            </div>
          </div>

          {/* Error Message */}
          {errorMessage && (
            <div
              style={{
                backgroundColor: "var(--red-bg)",
                border: "1px solid var(--red)",
                borderRadius: "6px",
                padding: "0.85rem",
                color: "var(--red)",
                fontSize: "0.88rem",
                display: "flex",
                alignItems: "center",
                gap: "0.5rem"
              }}
            >
              <AlertCircle size={18} style={{ flexShrink: 0 }} />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Action Button */}
          <div>
            <button
              type="submit"
              disabled={isSubmitting || !sheetFile || !answerKeyFile}
              className="btn btn-primary"
              style={{ width: "100%", padding: "0.85rem", fontSize: "1rem" }}
            >
              {isSubmitting ? "Evaluating Against Uploaded Answer Key..." : "Evaluate Sheet & View Final Result"}
              {!isSubmitting && <ArrowRight size={18} />}
            </button>
          </div>
        </div>
      </form>

      {/* Camera Capture Modal */}
      {cameraActiveFor && (
        <CameraCapture
          documentLabel={cameraActiveFor === "sheet" ? "Student Sheet" : "Answer Key"}
          onCapture={handleCameraCapture}
          onClose={() => setCameraActiveFor(null)}
        />
      )}
    </div>
  );
};
