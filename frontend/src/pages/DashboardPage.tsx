/**
 * Examination Evaluation Submission Dashboard.
 * 
 * Provides inputs for selecting evaluation mode (OMR Sheet vs Marked Question Paper),
 * uploading student document files from computer or snapping live camera snapshots,
 * configuring test booklet codes, and triggering pipeline evaluation.
 */

import React, { useState } from "react";
import { FileUploadDropzone } from "../components/FileUploadDropzone";
import { CameraCapture } from "../components/CameraCapture";
import { evaluateApi } from "../api/evaluateApi";
import type { EvaluationScorecard } from "../types/evaluation";
import { FileSpreadsheet, BookOpen, AlertCircle, ArrowRight, Sparkles } from "lucide-react";

interface DashboardPageProps {
  /** Callback fired when evaluation succeeds, passing the resulting scorecard */
  onEvaluationComplete: (scorecard: EvaluationScorecard) => void;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({ onEvaluationComplete }) => {
  // Mode: "omr" or "marked_paper"
  const [evaluationMode, setEvaluationMode] = useState<"omr" | "marked_paper">("omr");
  
  // Sheet File & Answer Key File
  const [sheetFile, setSheetFile] = useState<File | null>(null);
  const [answerKeyFile, setAnswerKeyFile] = useState<File | null>(null);
  
  // Exam ID & Candidate Details
  const [examId, setExamId] = useState("JEE_Main_2025_Jan_22_Shift1");
  const [candidateName, setCandidateName] = useState("Student Candidate");

  // Camera Modal State
  const [cameraActiveFor, setCameraActiveFor] = useState<"sheet" | "answerKey" | null>(null);

  // Submission State
  const [isSubmitting, setIsSubmitting] = useState(false);
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
   * Loads a synthetic authentic demonstration payload for immediate 1-click evaluation.
   */
  const handleLoadDemoSheet = async (presetType: "authentic_omr" | "full_mark") => {
    setErrorMessage(null);
    try {
      // Create a mock demonstration File object
      const dummyContent = JSON.stringify({
        preset: presetType,
        source: "JEE_Main_Synthetic_Authentic_Dataset"
      });
      const demoFileName = presetType === "authentic_omr" ? "jee_mains_omr_01.json" : "jee_mains_omr_02.json";
      const file = new File([dummyContent], demoFileName, { type: "application/json" });
      setSheetFile(file);
    } catch (e) {
      setErrorMessage("Could not load demonstration preset.");
    }
  };

  /**
   * Dispatches evaluation request to backend API.
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sheetFile) {
      setErrorMessage("Please upload a student sheet or capture a picture first.");
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
          Upload student OMR sheets or marked question booklets to calculate NTA-standard scorecards.
        </p>
      </div>

      {/* Mode Switcher Tabs */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "2rem" }}>
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
                Scanned or photographed test booklet pages with candidate marks.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Upload Form */}
      <form onSubmit={handleSubmit}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: "1.5rem" }}>
          {/* Card: Document Uploads */}
          <div className="card">
            <div className="card-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <h2 className="card-title">
                  1. Provide Student Response Document
                </h2>
                <p className="card-subtitle">
                  Upload an image from your computer or take a real-time photo with your webcam.
                </p>
              </div>

              {/* Preset 1-Click Buttons */}
              <div style={{ display: "flex", gap: "0.5rem" }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => handleLoadDemoSheet("authentic_omr")}
                  style={{ fontSize: "0.78rem", padding: "0.35rem 0.65rem" }}
                  title="Loads authentic 90-question JEE OMR sheet from benchmark dataset"
                >
                  <Sparkles size={13} color="var(--blue)" />
                  Load Sample OMR #1
                </button>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => handleLoadDemoSheet("full_mark")}
                  style={{ fontSize: "0.78rem", padding: "0.35rem 0.65rem" }}
                  title="Loads authentic 90-question JEE OMR sheet #2"
                >
                  <Sparkles size={13} color="var(--blue)" />
                  Load Sample OMR #2
                </button>
              </div>
            </div>

            {/* Document Dropzone */}
            <FileUploadDropzone
              label={evaluationMode === "omr" ? "Candidate OMR Sheet" : "Marked Question Paper"}
              description="PNG, JPG, JPEG, or PDF"
              selectedFile={sheetFile}
              onFileSelect={setSheetFile}
              onTriggerCamera={() => setCameraActiveFor("sheet")}
            />

            {/* Optional Custom Answer Key */}
            <div style={{ marginTop: "1.5rem", borderTop: "1px solid var(--border-color)", paddingTop: "1.5rem" }}>
              <FileUploadDropzone
                label="Master Answer Key (Optional)"
                description="Defaults to official JEE Mains key if omitted"
                selectedFile={answerKeyFile}
                onFileSelect={setAnswerKeyFile}
                onTriggerCamera={() => setCameraActiveFor("answerKey")}
              />
            </div>
          </div>

          {/* Card: Exam Parameters */}
          <div className="card">
            <h2 className="card-title" style={{ marginBottom: "1rem" }}>
              2. Candidate & Exam Details
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
                <select
                  id="examId"
                  className="form-select"
                  value={examId}
                  onChange={(e) => setExamId(e.target.value)}
                >
                  <option value="JEE_Main_2025_Jan_22_Shift1">JEE Main 2025 - Jan 22 (Shift 1)</option>
                  <option value="JEE_Main_2024_Jan_27_Shift1">JEE Main 2024 - Jan 27 (Shift 1)</option>
                  <option value="JEE_Main_2024_Jan_29_Shift2">JEE Main 2024 - Jan 29 (Shift 2)</option>
                  <option value="JEE_Advanced_Paper1">JEE Advanced - Paper 1</option>
                </select>
              </div>
            </div>

            <div style={{ padding: "0.85rem", background: "var(--bg-secondary)", borderRadius: "6px", fontSize: "0.82rem", color: "var(--text-secondary)" }}>
              <strong>NTA Scoring Protocol Applied:</strong> Correct MCQ/Numerical: <code>+4</code> marks; Incorrect: <code>-1</code> mark; Unattempted: <code>0</code> marks. Section B evaluates only the <strong>first 5 attempted numericals</strong> per subject, safely discarding any overflow.
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
              disabled={isSubmitting || !sheetFile}
              className="btn btn-primary"
              style={{ width: "100%", padding: "0.85rem", fontSize: "1rem" }}
            >
              {isSubmitting ? "Running High-Precision Evaluation..." : "Evaluate Sheet & Generate Scorecard"}
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
