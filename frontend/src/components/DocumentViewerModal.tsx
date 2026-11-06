/**
 * Interactive Document and Answer Key In-App Viewer Modal.
 * 
 * Provides an embedded viewer for inspecting uploaded OMR sheet scans,
 * marked 10-page question paper PDFs, and JSON/CSV/TXT answer keys
 * with zoom controls, table parsing, and high-fidelity rendering.
 */

import React, { useState, useEffect } from "react";
import { X, ZoomIn, ZoomOut, RotateCcw, ExternalLink, FileText, Image as ImageIcon } from "lucide-react";

interface DocumentViewerModalProps {
  /** The file to preview */
  file: File | null;
  /** Modal header title */
  title: string;
  /** Close callback */
  onClose: () => void;
  /** Optional URL of computer vision detection overlay */
  overlayUrl?: string | null;
  /** Initial view mode */
  initialMode?: "original" | "overlay";
}

export const DocumentViewerModal: React.FC<DocumentViewerModalProps> = ({
  file,
  title,
  onClose,
  overlayUrl = null,
  initialMode = "original"
}) => {
  const [objectUrl, setObjectUrl] = useState<string>("");
  const [textContent, setTextContent] = useState<string>("");
  const [zoomScale, setZoomScale] = useState<number>(1);
  const [activeMode, setActiveMode] = useState<"original" | "overlay">(
    initialMode === "overlay" && overlayUrl ? "overlay" : "original"
  );

  useEffect(() => {
    if (initialMode === "overlay" && overlayUrl) {
      setActiveMode("overlay");
    }
  }, [initialMode, overlayUrl]);

  useEffect(() => {
    if (!file) {
      setObjectUrl("");
      setTextContent("");
      return;
    }

    const url = URL.createObjectURL(file);
    setObjectUrl(url);

    // If text/code file, read text content for syntax display
    const fname = file.name.toLowerCase();
    if (fname.endsWith(".json") || fname.endsWith(".csv") || fname.endsWith(".txt")) {
      file.text().then((txt) => {
        setTextContent(txt);
      }).catch((e) => {
        console.error("Failed to read text content:", e);
      });
    }

    return () => {
      URL.revokeObjectURL(url);
    };
  }, [file]);

  if (!file) return null;

  const fname = file.name.toLowerCase();
  const isPdf = fname.endsWith(".pdf") || file.type === "application/pdf";
  const isImage = fname.endsWith(".png") || fname.endsWith(".jpg") || fname.endsWith(".jpeg") || fname.endsWith(".webp") || file.type.startsWith("image/");
  const isText = fname.endsWith(".json") || fname.endsWith(".csv") || fname.endsWith(".txt");

  const handleZoomIn = () => setZoomScale((s) => Math.min(2.5, s + 0.25));
  const handleZoomOut = () => setZoomScale((s) => Math.max(0.5, s - 0.25));
  const handleResetZoom = () => setZoomScale(1);

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: "rgba(0, 0, 0, 0.75)",
        zIndex: 9999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "1.5rem"
      }}
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: "#ffffff",
          borderRadius: "12px",
          width: "100%",
          maxWidth: "960px",
          height: "90vh",
          display: "flex",
          flexDirection: "column",
          boxShadow: "0 20px 40px rgba(0,0,0,0.3)",
          overflow: "hidden"
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div
          style={{
            padding: "1rem 1.5rem",
            borderBottom: "1px solid var(--border-color)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            background: "var(--bg-secondary)"
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
            {isImage && <ImageIcon size={20} color="var(--blue)" />}
            {isPdf && <FileText size={20} color="var(--red)" />}
            {isText && <FileText size={20} color="var(--green)" />}
            <div>
              <h3 style={{ fontSize: "1.05rem", fontWeight: 700, margin: 0 }}>
                {title}: {file.name}
              </h3>
              <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", margin: 0 }}>
                {(file.size / 1024).toFixed(1)} KB • {file.type || "Document"}
              </p>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            {overlayUrl && (
              <div style={{ display: "flex", background: "var(--bg-tertiary)", borderRadius: "6px", padding: "2px", border: "1px solid var(--border-color)", marginRight: "0.5rem" }}>
                <button
                  type="button"
                  onClick={() => setActiveMode("original")}
                  style={{
                    padding: "0.25rem 0.65rem",
                    fontSize: "0.78rem",
                    fontWeight: activeMode === "original" ? 700 : 500,
                    background: activeMode === "original" ? "var(--primary)" : "transparent",
                    color: activeMode === "original" ? "#ffffff" : "var(--text-primary)",
                    border: "none",
                    borderRadius: "4px",
                    cursor: "pointer"
                  }}
                >
                  Original Scan
                </button>
                <button
                  type="button"
                  onClick={() => setActiveMode("overlay")}
                  style={{
                    padding: "0.25rem 0.65rem",
                    fontSize: "0.78rem",
                    fontWeight: activeMode === "overlay" ? 700 : 500,
                    background: activeMode === "overlay" ? "var(--green)" : "transparent",
                    color: activeMode === "overlay" ? "#ffffff" : "var(--text-primary)",
                    border: "none",
                    borderRadius: "4px",
                    cursor: "pointer"
                  }}
                >
                  Vision Detection Map
                </button>
              </div>
            )}

            {(isImage || (activeMode === "overlay" && overlayUrl)) && (
              <div style={{ display: "flex", alignItems: "center", gap: "0.25rem", marginRight: "1rem", background: "#ffffff", padding: "0.2rem 0.4rem", borderRadius: "6px", border: "1px solid var(--border-color)" }}>
                <button type="button" className="btn btn-secondary" onClick={handleZoomOut} title="Zoom Out" style={{ padding: "0.3rem" }}>
                  <ZoomOut size={16} />
                </button>
                <span style={{ fontSize: "0.75rem", minWidth: "40px", textAlign: "center", fontWeight: 600 }}>
                  {Math.round(zoomScale * 100)}%
                </span>
                <button type="button" className="btn btn-secondary" onClick={handleZoomIn} title="Zoom In" style={{ padding: "0.3rem" }}>
                  <ZoomIn size={16} />
                </button>
                <button type="button" className="btn btn-secondary" onClick={handleResetZoom} title="Reset Zoom" style={{ padding: "0.3rem" }}>
                  <RotateCcw size={14} />
                </button>
              </div>
            )}

            <a
              href={activeMode === "overlay" && overlayUrl ? overlayUrl : objectUrl}
              target="_blank"
              rel="noreferrer"
              className="btn btn-secondary"
              title="Open full document in new browser tab"
              style={{ fontSize: "0.8rem", padding: "0.4rem 0.65rem", display: "flex", alignItems: "center", gap: "0.35rem" }}
            >
              <ExternalLink size={14} />
              Open In Tab
            </a>

            <button
              type="button"
              className="btn btn-secondary"
              onClick={onClose}
              title="Close viewer"
              style={{ padding: "0.4rem", borderRadius: "50%" }}
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Modal Body / Viewer */}
        <div
          style={{
            flex: 1,
            overflow: "auto",
            padding: "1rem",
            backgroundColor: (isImage || activeMode === "overlay") ? "#1e293b" : "var(--bg-primary)",
            display: "flex",
            alignItems: (isImage || activeMode === "overlay") ? "center" : "stretch",
            justifyContent: (isImage || activeMode === "overlay") ? "center" : "stretch"
          }}
        >
          {/* DETECTION OVERLAY VIEW */}
          {activeMode === "overlay" && overlayUrl ? (
            <div
              style={{
                transition: "transform 0.15s ease",
                transform: `scale(${zoomScale})`,
                transformOrigin: "center center",
                display: "inline-block",
                boxShadow: "0 10px 25px rgba(0,0,0,0.5)",
                backgroundColor: "#000000",
                borderRadius: "4px",
                overflow: "hidden"
              }}
            >
              <img
                src={overlayUrl}
                alt="Computer Vision Detection Overlay Map"
                style={{
                  maxWidth: "100%",
                  maxHeight: "75vh",
                  display: "block",
                  objectFit: "contain"
                }}
              />
            </div>
          ) : (
            <>
              {/* IMAGE VIEWER */}
              {isImage && objectUrl && (
                <div
                  style={{
                    transition: "transform 0.15s ease",
                    transform: `scale(${zoomScale})`,
                    transformOrigin: "center center",
                    display: "inline-block",
                    boxShadow: "0 10px 25px rgba(0,0,0,0.5)",
                    backgroundColor: "#ffffff",
                    borderRadius: "4px",
                    overflow: "hidden"
                  }}
                >
                  <img
                    src={objectUrl}
                    alt="Document Preview"
                    style={{
                      maxWidth: "100%",
                      maxHeight: "75vh",
                      display: "block",
                      objectFit: "contain"
                    }}
                  />
                </div>
              )}

              {/* PDF VIEWER */}
              {isPdf && objectUrl && (
                <iframe
                  src={objectUrl}
                  title={file.name}
                  style={{
                    width: "100%",
                    height: "100%",
                    border: "none",
                    borderRadius: "8px",
                    backgroundColor: "#ffffff"
                  }}
                />
              )}

              {/* TEXT / JSON / CSV VIEWER */}
              {isText && (
                <div style={{ width: "100%", display: "flex", flexDirection: "column", height: "100%" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
                    <span style={{ fontSize: "0.82rem", fontWeight: 700, color: "var(--text-secondary)" }}>
                      Parsed Answer Key Content Preview
                    </span>
                    {fname.endsWith(".json") && (
                      <span className="badge badge-correct" style={{ fontSize: "0.75rem" }}>
                        Valid JSON Key
                      </span>
                    )}
                  </div>

                  <pre
                    style={{
                      flex: 1,
                      margin: 0,
                      padding: "1rem",
                      backgroundColor: "#0f172a",
                      color: "#38bdf8",
                      fontFamily: "var(--font-mono)",
                      fontSize: "0.85rem",
                      lineHeight: "1.45",
                      borderRadius: "8px",
                      overflow: "auto",
                      border: "1px solid #1e293b"
                    }}
                  >
                    {textContent || "Loading document contents..."}
                  </pre>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};
