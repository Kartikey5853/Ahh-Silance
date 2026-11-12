import React, { useEffect, useRef, useState } from "react";
import { Check, Edit3, X } from "lucide-react";
import { MarkdownQuestionView } from "./MarkdownQuestionView";

interface DoubleTapMarkdownEditorProps {
  value: string;
  onChange: (nextValue: string) => void;
  onCommit?: (nextValue: string) => void | Promise<void>;
  compact?: boolean;
  minRows?: number;
  maxRows?: number;
  placeholder?: string;
  emptyHint?: string;
  disabled?: boolean;
  style?: React.CSSProperties;
}

/**
 * Displays rich LLM-formatted Markdown by default with zero raw input clutter.
 * Switches cleanly into a focused textarea editor only when the user double-clicks
 * or double-taps, saving on Done / Ctrl+Enter / blur and restoring cleanly on Esc / Cancel.
 */
export const DoubleTapMarkdownEditor: React.FC<DoubleTapMarkdownEditorProps> = ({
  value,
  onChange,
  onCommit,
  compact = false,
  minRows = 3,
  maxRows = 14,
  placeholder = "Type Markdown or LaTeX expressions...",
  emptyHint = "Double-tap to write content...",
  disabled = false,
  style,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const lastTapRef = useRef<number>(0);

  useEffect(() => {
    if (!isEditing) {
      setDraft(value);
    }
  }, [value, isEditing]);

  useEffect(() => {
    if (isEditing && textareaRef.current) {
      const el = textareaRef.current;
      el.focus();
      const len = el.value.length;
      el.setSelectionRange(len, len);
    }
  }, [isEditing]);

  const enterEdit = () => {
    if (disabled) return;
    setDraft(value);
    setIsEditing(true);
  };

  const commitEdit = async (nextVal: string = draft) => {
    setIsEditing(false);
    if (nextVal !== value) {
      onChange(nextVal);
    }
    if (onCommit && nextVal !== value) {
      await onCommit(nextVal);
    }
  };

  const cancelEdit = () => {
    setDraft(value);
    setIsEditing(false);
  };

  const handleTouchEnd = (e: React.TouchEvent<HTMLDivElement>) => {
    if (disabled || isEditing) return;
    const now = Date.now();
    if (now - lastTapRef.current < 320) {
      e.preventDefault();
      enterEdit();
      lastTapRef.current = 0;
    } else {
      lastTapRef.current = now;
    }
  };

  if (isEditing) {
    const lineCount = Math.max(minRows, Math.min(maxRows, (draft || "").split("\n").length + 1));
    return (
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "#ffffff",
          border: "1.5px solid #2563eb",
          borderRadius: "10px",
          padding: "0.55rem",
          boxShadow: "0 4px 14px rgba(37, 99, 235, 0.10)",
          ...style,
        }}
      >
        <textarea
          ref={textareaRef}
          rows={lineCount}
          value={draft}
          placeholder={placeholder}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Escape") {
              e.preventDefault();
              cancelEdit();
            } else if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
              e.preventDefault();
              void commitEdit(draft);
            }
          }}
          style={{
            width: "100%",
            border: "none",
            outline: "none",
            resize: "vertical",
            background: "transparent",
            color: "#0f172a",
            fontFamily: "inherit",
            fontSize: compact ? "0.84rem" : "0.9rem",
            lineHeight: 1.55,
          }}
        />
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            borderTop: "1px solid #f1f5f9",
            paddingTop: "0.4rem",
            marginTop: "0.35rem",
          }}
        >
          <span style={{ fontSize: "0.7rem", color: "#64748b" }}>
            Markdown &amp; tables supported · Ctrl+Enter to save · Esc to cancel
          </span>
          <div style={{ display: "flex", gap: "0.35rem" }}>
            <button
              type="button"
              onClick={cancelEdit}
              style={{
                background: "#ffffff",
                border: "1px solid #cbd5e1",
                color: "#475569",
                padding: "0.24rem 0.55rem",
                borderRadius: "6px",
                fontSize: "0.73rem",
                fontWeight: 700,
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: "0.2rem",
              }}
            >
              <X size={12} /> Cancel
            </button>
            <button
              type="button"
              onClick={() => void commitEdit(draft)}
              style={{
                background: "#2563eb",
                border: "none",
                color: "#ffffff",
                padding: "0.24rem 0.65rem",
                borderRadius: "6px",
                fontSize: "0.73rem",
                fontWeight: 700,
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: "0.2rem",
              }}
            >
              <Check size={12} /> Done
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      onDoubleClick={(e) => {
        e.stopPropagation();
        enterEdit();
      }}
      onTouchEnd={handleTouchEnd}
      title={disabled ? undefined : "Double-tap or double-click to edit"}
      style={{
        position: "relative",
        borderRadius: "10px",
        padding: compact ? "0.45rem 0.65rem" : "0.65rem 0.85rem",
        background: "#ffffff",
        border: "1px solid #e2e8f0",
        cursor: disabled ? "default" : "text",
        transition: "border-color 0.15s ease, box-shadow 0.15s ease",
        ...style,
      }}
    >
      <MarkdownQuestionView text={value} compact={compact} emptyHint={emptyHint} />
      {!disabled && (
        <span
          style={{
            position: "absolute",
            top: "0.4rem",
            right: "0.5rem",
            display: "inline-flex",
            alignItems: "center",
            gap: "0.2rem",
            fontSize: "0.66rem",
            fontWeight: 700,
            color: "#94a3b8",
            pointerEvents: "none",
          }}
        >
          <Edit3 size={10} /> 2× tap
        </span>
      )}
    </div>
  );
};
