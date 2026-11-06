/**
 * Examination Evaluation API Service.
 * 
 * Provides methods for dispatching uploaded OMR sheets or marked question papers
 * along with the mandatory user-provided answer key to the backend evaluation pipeline.
 */

import { apiClient } from "./client";
import type { EvaluationScorecard } from "../types/evaluation";

export interface EvaluationUploadParams {
  /** The student document to grade (OMR or marked question paper) */
  sheetFile: File;
  /** Mandatory master answer key file (JSON, CSV, or TXT) */
  answerKeyFile: File;
  /** Optional pre-computed SHA256 hashes from background scanning */
  sheetHash?: string;
  keyHash?: string;
  /** Exam identifier */
  examId?: string;
  /** Evaluation mode */
  mode?: "omr" | "marked_paper";
  /** Candidate name */
  candidateName?: string;
}

export interface PrescanSheetResult {
  status: string;
  sheet_hash: string;
  roll_number?: string;
  detected_bubbles?: number;
  attempted_count?: number;
  document_type?: string;
  has_overlay?: boolean;
  overlay_url?: string | null;
  cached?: boolean;
}

export interface PrescanKeyResult {
  status: string;
  key_hash: string;
  total_questions?: number;
  booklet_code?: string;
  cached?: boolean;
}

export const evaluateApi = {
  /**
   * Pre-scans a student response sheet in the background the moment it is selected.
   */
  async prescanSheet(sheetFile: File): Promise<PrescanSheetResult> {
    const formData = new FormData();
    formData.append("sheet_file", sheetFile);
    const response = await apiClient.post<PrescanSheetResult>("/evaluate/prescan-sheet", formData, {
      headers: { "Content-Type": "multipart/form-data" }
    });
    return response.data;
  },

  /**
   * Pre-parses an answer key in the background the moment it is selected.
   */
  async prescanKey(answerKeyFile: File, examId: string = "JEE_Main_2025_Jan_22_Shift1"): Promise<PrescanKeyResult> {
    const formData = new FormData();
    formData.append("answer_key_file", answerKeyFile);
    formData.append("exam_id", examId);
    const response = await apiClient.post<PrescanKeyResult>("/evaluate/prescan-key", formData, {
      headers: { "Content-Type": "multipart/form-data" }
    });
    return response.data;
  },

  /**
   * Uploads student sheet and master answer key files via multipart/form-data for automated evaluation.
   * If pre-scanned hashes are supplied, evaluation completes near-instantaneously (<10ms).
   */
  async evaluateUpload(params: EvaluationUploadParams): Promise<EvaluationScorecard> {
    const formData = new FormData();
    formData.append("sheet_file", params.sheetFile);
    formData.append("answer_key_file", params.answerKeyFile);
    if (params.sheetHash) {
      formData.append("sheet_hash", params.sheetHash);
    }
    if (params.keyHash) {
      formData.append("key_hash", params.keyHash);
    }
    formData.append("exam_id", params.examId || "JEE_Main_2025_Jan_22_Shift1");
    formData.append("mode", params.mode || "omr");
    formData.append("candidate_name", params.candidateName || "Candidate");

    const response = await apiClient.post<EvaluationScorecard>("/evaluate/upload", formData, {
      headers: {
        "Content-Type": "multipart/form-data"
      }
    });
    return response.data;
  },

  /**
   * Retrieves a previously calculated and persisted scorecard by evaluation UUID.
   */
  async getScorecard(evaluationId: string): Promise<EvaluationScorecard> {
    const response = await apiClient.get<EvaluationScorecard>(`/evaluate/scorecard/${evaluationId}`);
    return response.data;
  }
};
