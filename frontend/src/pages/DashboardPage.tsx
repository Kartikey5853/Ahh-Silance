/**
 * Examination Evaluation Submission Dashboard.
 * 
 * Clean, clutter-free interface for uploading candidate response documents
 * (OMR sheet scans or marked question papers) alongside the master answer key.
 * Automatically runs background pre-scanning on upload for instant sub-50ms evaluation.
 */

import React, { useState, useEffect } from "react";
import { FileUploadDropzone } from "../components/FileUploadDropzone";
import { CameraCapture } from "../components/CameraCapture";
import { DocumentViewerModal } from "../components/DocumentViewerModal";
import { evaluateApi } from "../api/evaluateApi";
import { resolveApiUrl } from "../api/client";
import type { EvaluationScorecard } from "../types/evaluation";
import { AlertCircle, ArrowRight, Zap, Sparkles, RefreshCw } from "lucide-react";

interface DashboardPageProps {
  /** Callback fired when evaluation succeeds, passing the resulting scorecard */
  onEvaluationComplete: (scorecard: EvaluationScorecard) => void;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({ onEvaluationComplete }) => {
  // Sheet File & Mandatory Answer Key File
  const [sheetFile, setSheetFile] = useState<File | null>(null);
  const [answerKeyFile, setAnswerKeyFile] = useState<File | null>(null);

  // Background Pre-Scanning States
  const [sheetScanStatus, setSheetScanStatus] = useState<"idle" | "scanning" | "ready" | "error">("idle");
  const [sheetScanMessage, setSheetScanMessage] = useState<string | null>(null);
  const [sheetHash, setSheetHash] = useState<string | null>(null);
  const [sheetOverlayUrl, setSheetOverlayUrl] = useState<string | null>(null);

  const [keyScanStatus, setKeyScanStatus] = useState<"idle" | "scanning" | "ready" | "error">("idle");
  const [keyScanMessage, setKeyScanMessage] = useState<string | null>(null);
  const [keyHash, setKeyHash] = useState<string | null>(null);

  // Auto-detected exam pattern: "JEE_MAIN" | "JEE_ADVANCED" | null
  const [detectedExamType, setDetectedExamType] = useState<string | null>(null);

  // In-App Document Viewer State
  const [viewerFile, setViewerFile] = useState<File | null>(null);
  const [viewerTitle, setViewerTitle] = useState<string>("Document Viewer");
  const [viewerInitialMode, setViewerInitialMode] = useState<"original" | "overlay">("original");

  // Camera Modal State
  const [cameraActiveFor, setCameraActiveFor] = useState<"sheet" | "answerKey" | null>(null);

  // Submission State
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitElapsed, setSubmitElapsed] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let timer: number | null = null;
    if (isSubmitting) {
      timer = window.setInterval(() => {
        setSubmitElapsed((s) => s + 1);
      }, 1000);
    } else {
      setSubmitElapsed(0);
    }
    return () => {
      if (timer !== null) window.clearInterval(timer);
    };
  }, [isSubmitting]);

  /**
   * Handles student sheet file selection and immediately begins background pre-scanning.
   */
  const handleSheetSelect = (file: File | null) => {
    setSheetFile(file);
    setSheetHash(null);
    setSheetOverlayUrl(null);

    if (!file) {
      setSheetScanStatus("idle");
      setSheetScanMessage(null);
      return;
    }

    setSheetScanStatus("scanning");
    setSheetScanMessage("Scanning bubble grid & detecting marks in background...");

    evaluateApi.prescanSheet(file)
      .then((res) => {
        setSheetHash(res.sheet_hash);
        if (res.exam_type) {
          setDetectedExamType(res.exam_type);
        }
        const overlaySource = res.overlay_data || (res.overlay_url ? resolveApiUrl(res.overlay_url) : null);
        if (overlaySource) {
          setSheetOverlayUrl(overlaySource);
        }
        setSheetScanStatus("ready");
        const bubbles = res.detected_bubbles || 0;
        const attempts = res.attempted_count || 0;
        const examName = res.exam_type === "JEE_ADVANCED" ? "JEE Advanced" : "JEE Main";
        const totalQ = res.total_questions || (res.exam_type === "JEE_ADVANCED" ? 51 : 90);
        setSheetScanMessage(`✓ ${examName} OMR: ${bubbles} bubbles verified • Roll #${res.roll_number || "Detected"} • ${attempts}/${totalQ} attempted`);
      })
      .catch((err) => {
        console.warn("Background sheet pre-scan error:", err);
        setSheetScanStatus("error");
        setSheetScanMessage(err.response?.data?.detail || "Could not pre-verify OMR. Evaluation will process upon submission.");
      });
  };

  /**
   * Handles answer key file selection and immediately begins background parsing.
   */
  const handleKeySelect = (file: File | null) => {
    setAnswerKeyFile(file);
    setKeyHash(null);

    if (!file) {
      setKeyScanStatus("idle");
      setKeyScanMessage(null);
      return;
    }

    setKeyScanStatus("scanning");
    setKeyScanMessage("Pre-parsing master answer key in background...");

    evaluateApi.prescanKey(file)
      .then((res) => {
        setKeyHash(res.key_hash);
        if (res.exam_type) {
          setDetectedExamType(res.exam_type);
        }
        setKeyScanStatus("ready");
        const examName = res.exam_type === "JEE_ADVANCED" ? "JEE Advanced" : "JEE Main";
        const totalQ = res.total_questions || (res.exam_type === "JEE_ADVANCED" ? 51 : 90);
        setKeyScanMessage(`✓ ${examName} Key: ${totalQ} questions mapped • Booklet ${res.booklet_code || "SET A"}`);
      })
      .catch((err) => {
        console.warn("Background key pre-parse error:", err);
        setKeyScanStatus("error");
        setKeyScanMessage(err.response?.data?.detail || "Could not parse key structure.");
      });
  };

  /**
   * Handles camera snapshot capture and binds to active file state.
   */
  const handleCameraCapture = (capturedFile: File) => {
    if (cameraActiveFor === "sheet") {
      handleSheetSelect(capturedFile);
    } else if (cameraActiveFor === "answerKey") {
      handleKeySelect(capturedFile);
    }
    setCameraActiveFor(null);
  };

  /**
   * Dispatches evaluation request to backend API.
   * If files were pre-scanned in background, returns scorecard in <50ms.
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
      const isPdf = sheetFile.name.toLowerCase().endsWith(".pdf");
      const scorecard = await evaluateApi.evaluateUpload({
        sheetFile,
        answerKeyFile,
        sheetHash: sheetHash || undefined,
        keyHash: keyHash || undefined,
        mode: isPdf ? "marked_paper" : "omr"
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
    <div style={{ maxWidth: "800px", margin: "0 auto" }}>
      {/* Top Banner / Title */}
      <div style={{ marginBottom: "2rem", textAlign: "left" }}>
        <h1 style={{ fontSize: "1.75rem", fontWeight: 800, letterSpacing: "-0.03em", color: "var(--text-primary)" }}>
          Evaluation
        </h1>
        <p style={{ fontSize: "0.95rem", color: "var(--text-secondary)", marginTop: "0.25rem" }}>
          Upload student response document and master answer key to evaluate scores.
        </p>
      </div>

      {/* Main Upload Form */}
      <form onSubmit={handleSubmit}>
        {detectedExamType && (
          <div
            style={{
              marginBottom: "1.25rem",
              padding: "0.75rem 1.25rem",
              borderRadius: "8px",
              background: detectedExamType === "JEE_ADVANCED" ? "rgba(37, 99, 235, 0.08)" : "rgba(34, 197, 94, 0.08)",
              border: `1px solid ${detectedExamType === "JEE_ADVANCED" ? "rgba(37, 99, 235, 0.25)" : "rgba(34, 197, 94, 0.25)"}`,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              flexWrap: "wrap",
              gap: "0.5rem"
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <Zap size={18} color={detectedExamType === "JEE_ADVANCED" ? "var(--blue)" : "var(--green)"} />
              <span style={{ fontSize: "0.9rem", fontWeight: 700, color: "var(--text-primary)" }}>
                {detectedExamType === "JEE_ADVANCED"
                  ? "JEE Advanced Architecture Auto-Detected"
                  : "JEE Main Architecture Auto-Detected"}
              </span>
            </div>
            <span style={{ fontSize: "0.82rem", color: "var(--text-secondary)", fontWeight: 500 }}>
              {detectedExamType === "JEE_ADVANCED"
                ? "51 Questions • Multi-Correct (+4/-2/Partial) • Bubble Verification Enforced"
                : "90 Questions • Section B First-5 Rule Enforced"}
            </span>
          </div>
        )}

        <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: "1.5rem" }}>
          {/* Card 1: Student Sheet File */}
          <div className="card">
            <div className="card-header">
              <h2 className="card-title">
                1. Student Response Sheet <span style={{ color: "var(--red)" }}>*</span>
              </h2>
              <p className="card-subtitle">
                Upload candidate OMR bubble scan (PNG/JPG) or marked question paper (PDF).
              </p>
            </div>

            <FileUploadDropzone
              label="Student Document"
              description="PNG, JPG, JPEG, or PDF"
              selectedFile={sheetFile}
              onFileSelect={handleSheetSelect}
              onTriggerCamera={() => setCameraActiveFor("sheet")}
              onViewFile={() => {
                setViewerFile(sheetFile);
                setViewerTitle("Student Response Document");
                setViewerInitialMode("original");
              }}
              onViewDetectionMap={() => {
                setViewerFile(sheetFile);
                setViewerTitle("Vision Detection Overlay Map");
                setViewerInitialMode("overlay");
              }}
              scanStatus={sheetScanStatus}
              scanMessage={sheetScanMessage}
            />
          </div>

          {/* Card 2: Master Answer Key File */}
          <div className="card">
            <div className="card-header">
              <h2 className="card-title">
                2. Master Answer Key <span style={{ color: "var(--red)" }}>*</span>
              </h2>
              <p className="card-subtitle">
                Upload master answer key (JSON, CSV, TXT, or scanned key image).
              </p>
            </div>

            <FileUploadDropzone
              label="Master Answer Key"
              description="JSON, CSV, TXT, or Image"
              selectedFile={answerKeyFile}
              onFileSelect={handleKeySelect}
              onTriggerCamera={() => setCameraActiveFor("answerKey")}
              onViewFile={() => {
                setViewerFile(answerKeyFile);
                setViewerTitle("Master Answer Key");
              }}
              scanStatus={keyScanStatus}
              scanMessage={keyScanMessage}
              accept=".json,.csv,.txt,.dat,image/*"
            />
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
              style={{
                width: "100%",
                padding: "0.85rem",
                fontSize: "1rem",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "0.5rem"
              }}
            >
              {isSubmitting ? (
                "Evaluating..."
              ) : (
                <>
                  {sheetScanStatus === "ready" && keyScanStatus === "ready" ? (
                    <>
                      <Zap size={18} fill="#ffffff" />
                      <span>Instant Evaluate & View Result</span>
                    </>
                  ) : (
                    <span>Evaluate Sheet</span>
                  )}
                  <ArrowRight size={18} />
                </>
              )}
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

      {/* Document In-App Viewer Modal */}
      {viewerFile && (
        <DocumentViewerModal
          file={viewerFile}
          title={viewerTitle}
          overlayUrl={viewerFile === sheetFile ? sheetOverlayUrl : null}
          initialMode={viewerInitialMode}
          onClose={() => setViewerFile(null)}
        />
      )}

      {/* Fullscreen High-Thinking Loading Modal */}
      {isSubmitting && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(15, 23, 42, 0.6)",
            backdropFilter: "blur(5px)",
            zIndex: 9999,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "1.5rem"
          }}
        >
          <div
            style={{
              width: "100%",
              maxWidth: "520px",
              background: "#ffffff",
              borderRadius: "18px",
              border: "1px solid #e2e8f0",
              boxShadow: "0 24px 60px rgba(15, 23, 42, 0.25)",
              padding: "2.25rem 2rem",
              textAlign: "center",
              display: "flex",
              flexDirection: "column",
              gap: "1.25rem"
            }}
          >
            <div style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", gap: "0.4rem", alignSelf: "center", background: "#f5f3ff", color: "#6d28d9", border: "1px solid #ddd6fe", padding: "0.28rem 0.75rem", borderRadius: "999px", fontSize: "0.75rem", fontWeight: 800 }}>
              <Sparkles size={13} /> GEMINI 3.8 FLASH • HIGH THINKING
            </div>

            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "0.5rem" }}>
              <div style={{ width: "54px", height: "54px", borderRadius: "50%", background: "#eff6ff", border: "2px solid #bfdbfe", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <RefreshCw size={26} className="spin" style={{ color: "#2563eb" }} />
              </div>
              <h2 style={{ fontSize: "1.3rem", fontWeight: 900, color: "#0f172a", margin: "0.35rem 0 0" }}>
                Evaluating Response Document
              </h2>
              <p style={{ fontSize: "0.85rem", color: "#64748b", margin: 0, lineHeight: 1.5, maxWidth: "420px" }}>
                {submitElapsed < 6
                  ? "Detecting bubble patterns, bounding coordinates, and response alignment..."
                  : submitElapsed < 18
                  ? "🧠 Gemini 3.8 Flash is applying high-depth chain-of-thought OCR to verify answers against the master rubric..."
                  : "Synthesizing vector overlays and finalizing granular marks breakdown..."}
              </p>
            </div>

            <div
              style={{
                background: "#f8fafc",
                border: "1px solid #e2e8f0",
                borderRadius: "12px",
                padding: "0.75rem 1rem",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                fontSize: "0.82rem"
              }}
            >
              <span style={{ color: "#475569", fontWeight: 600 }}>
                Processing elapsed: <strong style={{ color: "#0f172a" }}>{submitElapsed}s</strong>
              </span>
              <span style={{ color: "#2563eb", fontWeight: 700 }}>
                {sheetFile?.name || "Uploaded Document"}
              </span>
            </div>

            {submitElapsed >= 10 && (
              <div style={{ fontSize: "0.75rem", color: "#6d28d9", background: "#faf5ff", border: "1px solid #e9d5ff", padding: "0.45rem 0.75rem", borderRadius: "8px", fontWeight: 600 }}>
                Deep multimodal reasoning is active. Complex or high-resolution pages are examined thoroughly.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
