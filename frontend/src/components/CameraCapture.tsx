/**
 * Live Camera and Document Photo Capture Modal Component.
 * 
 * Streams webcam video from user's camera, provides a document alignment guide,
 * captures high-resolution photo snapshots to canvas, and converts them into
 * standard File objects for pipeline evaluation.
 */

import React, { useRef, useState, useEffect } from "react";
import { Camera, RefreshCw, Check, X, AlertCircle } from "lucide-react";

interface CameraCaptureProps {
  /** Callback returning the captured snapshot as a standard File object */
  onCapture: (file: File) => void;
  /** Callback to close the modal */
  onClose: () => void;
  /** Label indicating whether capturing OMR or Answer Key */
  documentLabel?: string;
}

export const CameraCapture: React.FC<CameraCaptureProps> = ({
  onCapture,
  onClose,
  documentLabel = "Document"
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);

  /**
   * Initializes webcam video stream on component mount.
   */
  useEffect(() => {
    let activeStream: MediaStream | null = null;

    async function startCamera() {
      try {
        const constraints: MediaStreamConstraints = {
          video: {
            facingMode: { ideal: "environment" },
            width: { ideal: 1920 },
            height: { ideal: 1080 }
          }
        };
        const mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
        activeStream = mediaStream;
        setStream(mediaStream);
        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream;
        }
      } catch (err) {
        console.warn("Could not access camera with environment facingMode, trying basic fallback:", err);
        try {
          const fallbackStream = await navigator.mediaDevices.getUserMedia({ video: true });
          activeStream = fallbackStream;
          setStream(fallbackStream);
          if (videoRef.current) {
            videoRef.current.srcObject = fallbackStream;
          }
        } catch (fallbackErr) {
          setCameraError("Camera permission denied or camera device not available.");
        }
      }
    }

    startCamera();

    return () => {
      if (activeStream) {
        activeStream.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  /**
   * Snaps a freeze frame from the active video feed onto a hidden canvas.
   */
  const handleSnap = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL("image/jpeg", 0.92);
    setCapturedImage(dataUrl);
  };

  /**
   * Discards captured frame and resumes live video stream.
   */
  const handleRetake = () => {
    setCapturedImage(null);
  };

  /**
   * Converts dataUrl to File and passes to parent.
   */
  const handleConfirm = () => {
    if (!capturedImage) return;

    // Convert dataURL to Blob
    const arr = capturedImage.split(",");
    const mime = arr[0].match(/:(.*?);/)![1];
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) {
      u8arr[n] = bstr.charCodeAt(n);
    }
    const blob = new Blob([u8arr], { type: mime });
    const file = new File([blob], `camera_${Date.now()}.jpg`, { type: "image/jpeg" });

    // Stop streams
    if (stream) {
      stream.getTracks().forEach((t) => t.stop());
    }

    onCapture(file);
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
          <div>
            <h3 style={{ fontSize: "1.1rem", fontWeight: 700 }}>Capture {documentLabel}</h3>
            <p style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
              Align document inside the viewfinder and hold steady.
            </p>
          </div>
          <button type="button" onClick={onClose} className="btn btn-secondary" style={{ padding: "0.4rem" }}>
            <X size={18} />
          </button>
        </div>

        {cameraError ? (
          <div style={{ padding: "1.5rem", background: "var(--red-bg)", border: "1px solid var(--red)", borderRadius: "8px", textAlign: "center" }}>
            <AlertCircle size={32} color="var(--red)" style={{ margin: "0 auto 0.5rem auto" }} />
            <p style={{ fontWeight: 600, color: "var(--red)" }}>{cameraError}</p>
            <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", marginTop: "0.5rem" }}>
              Please allow camera permissions or upload the photo file directly from your computer.
            </p>
          </div>
        ) : (
          <div style={{ position: "relative", width: "100%", background: "#000", borderRadius: "8px", overflow: "hidden", minHeight: "360px", display: "flex", alignItems: "center", justifyContent: "center" }}>
            {!capturedImage ? (
              <>
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  style={{ width: "100%", height: "auto", display: "block", maxHeight: "450px", objectFit: "contain" }}
                />
                {/* Visual alignment frame */}
                <div
                  style={{
                    position: "absolute",
                    inset: "15px",
                    border: "2px dashed rgba(255, 255, 255, 0.7)",
                    borderRadius: "8px",
                    pointerEvents: "none"
                  }}
                />
              </>
            ) : (
              <img
                src={capturedImage}
                alt="Captured Snapshot"
                style={{ width: "100%", height: "auto", display: "block", maxHeight: "450px", objectFit: "contain" }}
              />
            )}
            <canvas ref={canvasRef} style={{ display: "none" }} />
          </div>
        )}

        <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.75rem", marginTop: "1.25rem" }}>
          {!capturedImage ? (
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleSnap}
              disabled={!!cameraError}
              style={{ width: "100%" }}
            >
              <Camera size={18} />
              Take Picture
            </button>
          ) : (
            <>
              <button type="button" className="btn btn-secondary" onClick={handleRetake}>
                <RefreshCw size={16} />
                Retake
              </button>
              <button type="button" className="btn btn-primary" onClick={handleConfirm}>
                <Check size={16} />
                Use Photo
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
