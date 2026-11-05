/**
 * Examination Evaluation API Service.
 * 
 * Provides methods for dispatching uploaded OMR sheets or marked question papers
 * along with optional answer keys to the backend evaluation pipeline.
 */

import { apiClient } from "./client";
import type { EvaluationScorecard } from "../types/evaluation";

export interface EvaluationUploadParams {
  sheetFile: File;
  answerKeyFile?: File | null;
  examId?: string;
  mode?: "omr" | "marked_paper";
  candidateName?: string;
}

export const evaluateApi = {
  /**
   * Uploads student sheet and answer key files via multipart/form-data for automated evaluation.
   */
  async evaluateUpload(params: EvaluationUploadParams): Promise<EvaluationScorecard> {
    const formData = new FormData();
    formData.append("sheet_file", params.sheetFile);
    if (params.answerKeyFile) {
      formData.append("answer_key_file", params.answerKeyFile);
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
