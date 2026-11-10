/**
 * Academic Evaluation API Client.
 * 
 * Handles interaction with /api/v1/academic endpoints for:
 * profile, institutions, subjects, students, question paper scanning with Gemini,
 * and strict student answer sheet evaluation.
 */

import { apiClient } from "./client";
import type {
  UserProfile,
  Institution,
  Subject,
  Student,
  Exam,
  AcademicEvaluation,
  QuestionItem,
  ExamScanResponse
} from "../types/academic";

export const academicApi = {
  // Profile
  getProfile: async (): Promise<UserProfile> => {
    const res = await apiClient.get<UserProfile>("/academic/profile");
    return res.data;
  },

  updateProfile: async (data: Partial<UserProfile & { gemini_api_key?: string }>): Promise<any> => {
    const res = await apiClient.put("/academic/profile", data);
    return res.data;
  },

  // Institutions
  listInstitutions: async (): Promise<Institution[]> => {
    const res = await apiClient.get<Institution[]>("/academic/institutions");
    return res.data;
  },

  createInstitution: async (data: {
    name: string;
    type?: string;
    code?: string;
  }): Promise<Institution> => {
    const res = await apiClient.post<Institution>("/academic/institutions", data);
    return res.data;
  },

  // Classes (Organization -> Class -> Subject)
  listClasses: async (institutionId?: string): Promise<any[]> => {
    const res = await apiClient.get<any[]>("/academic/classes", {
      params: institutionId ? { institution_id: institutionId } : undefined
    });
    return res.data;
  },

  createClass: async (data: {
    name: string;
    code?: string;
    institution_id?: string;
    department?: string;
    academic_year?: string;
    start_date?: string;
    end_date?: string;
  }): Promise<any> => {
    const res = await apiClient.post("/academic/classes", data);
    return res.data;
  },

  deleteClass: async (classId: string): Promise<void> => {
    await apiClient.delete(`/academic/classes/${classId}`);
  },

  // Subjects
  listSubjects: async (institutionId?: string, classId?: string): Promise<Subject[]> => {
    const params: any = {};
    if (institutionId) params.institution_id = institutionId;
    if (classId) params.class_id = classId;
    const res = await apiClient.get<Subject[]>("/academic/subjects", { params });
    return res.data;
  },

  createSubject: async (data: {
    name: string;
    code: string;
    institution_id: string;
    class_id?: string;
    institution_type: string;
    semester_or_grade: string;
    credits: number;
    academic_year: string;
    chapters: string[];
  }): Promise<Subject> => {
    const res = await apiClient.post<Subject>("/academic/subjects", data);
    return res.data;
  },

  getSubject: async (subjectId: string): Promise<Subject> => {
    const res = await apiClient.get<Subject>(`/academic/subjects/${subjectId}`);
    return res.data;
  },

  // Students
  listAllStudents: async (classId?: string, subjectId?: string): Promise<Student[]> => {
    const params: any = {};
    if (classId) params.class_id = classId;
    if (subjectId) params.subject_id = subjectId;
    const res = await apiClient.get<Student[]>("/academic/students", { params });
    return res.data;
  },

  listStudents: async (subjectId: string, classId?: string): Promise<Student[]> => {
    const params: any = {};
    if (classId) params.class_id = classId;
    const res = await apiClient.get<Student[]>(`/academic/subjects/${subjectId}/students`, { params });
    return res.data;
  },

  addStudent: async (subjectId: string, data: {
    name: string;
    roll_number: string;
    email?: string;
    section?: string;
    class_id?: string;
  }): Promise<Student> => {
    const res = await apiClient.post<Student>(`/academic/subjects/${subjectId}/students`, data);
    return res.data;
  },

  deleteStudent: async (studentId: string): Promise<void> => {
    await apiClient.delete(`/academic/students/${studentId}`);
  },

  // Exams
  listExams: async (subjectId?: string): Promise<Exam[]> => {
    const params: any = {};
    if (subjectId) params.subject_id = subjectId;
    const res = await apiClient.get<Exam[]>("/academic/exams", { params });
    return res.data;
  },

  getExam: async (examId: string): Promise<Exam> => {
    const res = await apiClient.get<Exam>(`/academic/exams/${examId}`);
    return res.data;
  },

  deleteExam: async (examId: string): Promise<void> => {
    await apiClient.delete(`/academic/exams/${examId}`);
  },

  scanQuestionPaper: async (file: File, apiKey?: string): Promise<ExamScanResponse> => {
    const formData = new FormData();
    formData.append("file", file);
    if (apiKey) {
      formData.append("gemini_api_key", apiKey);
    }
    const res = await apiClient.post<ExamScanResponse>("/academic/exams/scan-paper", formData, {
      headers: { "Content-Type": "multipart/form-data" }
    });
    return res.data;
  },

  createExam: async (data: {
    subject_id: string;
    title: string;
    exam_type: string;
    max_marks: number;
    passing_marks: number;
    academic_year: string;
    exam_date?: string;
    correction_deadline?: string;
    answer_key_text?: string;
    questions: QuestionItem[];
  }): Promise<Exam> => {
    const res = await apiClient.post<Exam>("/academic/exams", data);
    return res.data;
  },

  updateExamQuestions: async (examId: string, questions: QuestionItem[], maxMarks?: number): Promise<any> => {
    const res = await apiClient.put(`/academic/exams/${examId}/questions`, {
      questions,
      max_marks: maxMarks
    });
    return res.data;
  },

  updateExamAnswerKey: async (examId: string, answerKeyText: string): Promise<any> => {
    const res = await apiClient.put(`/academic/exams/${examId}/answer-key`, {
      answer_key_text: answerKeyText
    });
    return res.data;
  },

  // Strict Evaluation
  evaluateStudent: async (
    examId: string,
    studentId: string,
    file?: File | null,
    text?: string,
    apiKey?: string
  ): Promise<AcademicEvaluation> => {
    const formData = new FormData();
    formData.append("student_id", studentId);
    if (file) {
      formData.append("sheet_file", file);
    }
    if (text) {
      formData.append("sheet_text", text);
    }
    if (apiKey) {
      formData.append("gemini_api_key", apiKey);
    }
    const res = await apiClient.post<AcademicEvaluation>(`/academic/exams/${examId}/evaluate`, formData, {
      headers: { "Content-Type": "multipart/form-data" }
    });
    return res.data;
  },

  evaluateAll: async (examId: string): Promise<{ status: string; evaluated_count: number; evaluations: AcademicEvaluation[] }> => {
    const res = await apiClient.post(`/academic/exams/${examId}/evaluate-all`);
    return res.data;
  },

  listEvaluations: async (examId?: string, studentId?: string): Promise<AcademicEvaluation[]> => {
    const params: any = {};
    if (examId) params.exam_id = examId;
    if (studentId) params.student_id = studentId;
    const res = await apiClient.get<AcademicEvaluation[]>("/academic/evaluations", { params });
    return res.data;
  },

  getEvaluation: async (evalId: string): Promise<AcademicEvaluation> => {
    const res = await apiClient.get<AcademicEvaluation>(`/academic/evaluations/${evalId}`);
    return res.data;
  }
};
