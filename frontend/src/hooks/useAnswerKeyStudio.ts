import { useCallback, useEffect, useRef, useState } from "react";
import { academicApi } from "../api/academicApi";
import type { AnswerKeyStructuredItem, Exam, Subject } from "../types/academic";

export function compileStructuredAnswerKey(items: AnswerKeyStructuredItem[]): string {
  return items
    .map((item) => {
      const rubrics = (item.rubric_items || [])
        .map((r) => `  - ${r.title} (${r.marks}M): ${(r.criteria || []).join("; ")}`)
        .join("\n");
      return `### [${item.q_no}] (${item.marks} Marks)\n${item.model_answer || ""}\n${
        rubrics ? `**Rubric:**\n${rubrics}` : ""
      }`.trim();
    })
    .join("\n\n---\n\n");
}

interface UseAnswerKeyStudioOptions {
  onExamUpdated?: (updatedExam: Exam) => void;
}

export function useAnswerKeyStudio(options?: UseAnswerKeyStudioOptions) {
  const [studioExam, setStudioExam] = useState<Exam | null>(null);
  const [studioSubject, setStudioSubject] = useState<Subject | undefined>(undefined);
  const [answerKeyText, setAnswerKeyText] = useState<string>("");
  const [structuredAnswers, setStructuredAnswers] = useState<AnswerKeyStructuredItem[]>([]);
  const [bgJobStatus, setBgJobStatus] = useState<"idle" | "running" | "completed" | "failed">("idle");
  const [bgJobError, setBgJobError] = useState<string | null>(null);
  const [bgWarning, setBgWarning] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState<boolean>(false);

  const pollTimerRef = useRef<number | null>(null);
  const onExamUpdatedRef = useRef(options?.onExamUpdated);
  onExamUpdatedRef.current = options?.onExamUpdated;

  const stopPolling = useCallback(() => {
    if (pollTimerRef.current !== null) {
      window.clearInterval(pollTimerRef.current);
      pollTimerRef.current = null;
    }
  }, []);

  useEffect(() => () => stopPolling(), [stopPolling]);

  const openStudio = useCallback(
    async (exam: Exam, subject?: Subject) => {
      stopPolling();
      setStudioExam(exam);
      setStudioSubject(subject);
      setAnswerKeyText(exam.answer_key_text || "");
      setStructuredAnswers(exam.answer_key_structured || []);
      setBgJobStatus("idle");
      setBgJobError(null);
      setBgWarning(null);

      // Hydrate latest exam record in background so Exam page & Evaluation page never drift
      try {
        const fresh = await academicApi.getExam(exam.id);
        setStudioExam(fresh);
        setAnswerKeyText(fresh.answer_key_text || "");
        setStructuredAnswers(fresh.answer_key_structured || []);
        onExamUpdatedRef.current?.(fresh);
      } catch {
        // Keep passed snapshot if offline
      }
    },
    [stopPolling]
  );

  const closeStudio = useCallback(() => {
    stopPolling();
    setStudioExam(null);
  }, [stopPolling]);

  const startBackgroundGeneration = useCallback(async () => {
    if (!studioExam) return;
    stopPolling();
    setBgJobStatus("running");
    setBgJobError(null);
    setBgWarning(null);

    try {
      const accepted = await academicApi.generateAnswerKeyAsync(studioExam.id);
      const jobId = accepted.job_id;
      const targetExamId = studioExam.id;

      const pollOnce = async () => {
        try {
          const job = await academicApi.getJobStatus(jobId);
          if (job.status === "completed") {
            stopPolling();
            const res = job.result || {};
            const nextText = res.answer_key_text || "";
            const nextStructured: AnswerKeyStructuredItem[] = res.answers || [];
            setAnswerKeyText(nextText);
            if (nextStructured.length > 0) {
              setStructuredAnswers(nextStructured);
            }
            if (res.api_warning) {
              setBgWarning(String(res.api_warning));
            }
            setBgJobStatus("completed");
            try {
              const refreshed = await academicApi.getExam(targetExamId);
              setStudioExam(refreshed);
              onExamUpdatedRef.current?.(refreshed);
            } catch {
              setStudioExam((prev) =>
                prev
                  ? {
                      ...prev,
                      answer_key_text: nextText || prev.answer_key_text,
                      answer_key_structured: nextStructured.length > 0 ? nextStructured : prev.answer_key_structured,
                    }
                  : prev
              );
            }
          } else if (job.status === "failed") {
            stopPolling();
            setBgJobStatus("failed");
            setBgJobError(job.error || "Background Answer Key generation failed.");
          }
        } catch (err: any) {
          stopPolling();
          setBgJobStatus("failed");
          setBgJobError(err?.response?.data?.detail || err?.message || "Failed to poll Answer Key job.");
        }
      };

      void pollOnce();
      pollTimerRef.current = window.setInterval(() => {
        void pollOnce();
      }, 1500);
    } catch (err: any) {
      setBgJobStatus("failed");
      setBgJobError(err?.response?.data?.detail || err?.message || "Failed to start Answer Key generation.");
    }
  }, [studioExam, stopPolling]);

  const saveAnswerKey = useCallback(
    async (approveAndExit = false) => {
      if (!studioExam) return;
      setIsSaving(true);
      setBgJobError(null);
      try {
        const compiledText =
          answerKeyText.trim() ||
          (structuredAnswers.length > 0 ? compileStructuredAnswerKey(structuredAnswers) : "");
        const res = await academicApi.updateExamAnswerKey(
          studioExam.id,
          compiledText,
          structuredAnswers
        );
        setAnswerKeyText(res.exam.answer_key_text || compiledText);
        setStudioExam(res.exam);
        onExamUpdatedRef.current?.(res.exam);
        if (approveAndExit) {
          stopPolling();
          setStudioExam(null);
        }
      } catch (err: any) {
        setBgJobError(err?.response?.data?.detail || err?.message || "Failed to save Answer Key.");
      } finally {
        setIsSaving(false);
      }
    },
    [studioExam, answerKeyText, structuredAnswers, stopPolling]
  );

  return {
    studioExam,
    studioSubject,
    answerKeyText,
    setAnswerKeyText,
    structuredAnswers,
    setStructuredAnswers,
    bgJobStatus,
    bgJobError,
    bgWarning,
    isSaving,
    openStudio,
    closeStudio,
    startBackgroundGeneration,
    saveAnswerKey,
  };
}
