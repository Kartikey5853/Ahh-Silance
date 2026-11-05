/**
 * Document File Upload and Drag-and-Drop Dropzone Component.
 * 
 * Provides an accessible file drop area supporting images (PNG, JPG, JPEG) and
 * PDF question papers. Displays active file details, size formatting, and reset actions.
 */

import React, { useRef, useState } from "react";
import { UploadCloud, File, Trash2, Camera } from "lucide-react";

interface FileUploadDropzoneProps {
  /** Label indicating what document is being uploaded */
  label: string;
  /** Subtitle or requirement notes */
  description: string;
  /** Currently selected file, or null */
  selectedFile: File | null;
  /** Callback fired when a file is selected or dropped */
  onFileSelect: (file: File | null) => void;
  /** Callback fired when user opts to click a picture instead */
  onTriggerCamera: () => void;
  /** Accepted file MIME types or extensions */
  accept?: string;
}

export const FileUploadDropzone: React.FC<FileUploadDropzoneProps> = ({
  label,
  description,
  selectedFile,
  onFileSelect,
  onTriggerCamera,
  accept = "image/*,.pdf,.json"
}) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  /**
   * Handles drag enter event to display active drop border.
   */
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  /**
   * Handles drag leave event to restore default border styling.
   */
  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  /**
   * Extracts dropped file and updates parent state.
   */
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      onFileSelect(e.dataTransfer.files[0]);
    }
  };

  /**
   * Handles standard file picker input change.
   */
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onFileSelect(e.target.files[0]);
    }
  };

  /**
   * Formats raw byte count into human-readable KB/MB strings.
   */
  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  return (
    <div style={{ marginBottom: "1.25rem" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "0.35rem" }}>
        <label className="form-label" style={{ marginBottom: 0 }}>
          {label}
        </label>
        <span style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>{description}</span>
      </div>

      {!selectedFile ? (
        <div
          className={`dropzone ${isDragOver ? "active" : ""}`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
        >
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept={accept}
            style={{ display: "none" }}
          />

          <UploadCloud size={32} className="dropzone-icon" />
          <p className="dropzone-title">Click to upload from computer or drag file here</p>
          <p className="dropzone-desc">Supports PNG, JPG, JPEG, and PDF documents</p>

          <div style={{ marginTop: "1rem" }} onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={onTriggerCamera}
              style={{ fontSize: "0.82rem", padding: "0.4rem 0.85rem" }}
            >
              <Camera size={14} />
              Or Take Photo with Camera
            </button>
          </div>
        </div>
      ) : (
        <div
          style={{
            border: "1px solid var(--border-color)",
            borderRadius: "8px",
            padding: "0.85rem 1rem",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            backgroundColor: "var(--bg-secondary)"
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
            <div
              style={{
                width: "36px",
                height: "36px",
                borderRadius: "6px",
                background: "#ffffff",
                border: "1px solid var(--border-color)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "var(--blue)"
              }}
            >
              <File size={20} />
            </div>
            <div>
              <p style={{ fontSize: "0.88rem", fontWeight: 600, color: "var(--text-primary)" }}>
                {selectedFile.name}
              </p>
              <p style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                {formatFileSize(selectedFile.size)} • {selectedFile.type || "Document"}
              </p>
            </div>
          </div>

          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => onFileSelect(null)}
            title="Remove file"
            style={{ padding: "0.4rem", color: "var(--red)" }}
          >
            <Trash2 size={16} />
          </button>
        </div>
      )}
    </div>
  );
};
