/**
 * Type definitions for Academic Evaluation, Institutions, Subjects,
 * Question Paper Extraction, and Strict Grading.
 */

export type InstitutionType = "college" | "school" | "competitive";

export interface Institution {
  id: string;
  name: string;
  type: InstitutionType;
  code?: string;
  config: {
    degree?: string;
    department?: string;
    semesters?: string[];
    exam_types?: string[];
    grading_system?: string;
    requires_credits?: boolean;
    board?: string;
    classes?: string[];
    target?: string;
  };
  created_at?: string;
}

export interface ClassItem {
  id: string;
  institution_id: string;
  name: string;
  code?: string;
  department?: string;
  academic_year?: string;
  subjects_count?: number;
  students_count?: number;
  created_at?: string;
}

export interface UserProfile {
  id: number;
  username: string;
  full_name: string;
  email: string;
  role: string;
  department: string;
  institution_id: string;
  has_custom_api_key: boolean;
  masked_api_key?: string;
}

export interface Subject {
  id: string;
  institution_id: string;
  class_id?: string;
  name: string;
  code: string;
  institution_type: InstitutionType;
  semester_or_grade: string;
  credits: number;
  academic_year: string;
  chapters: string[];
  enrolled_students?: number;
  exams_count?: number;
  created_at?: string;
}

export interface Student {
  id: string;
  subject_id: string;
  class_id?: string;
  name: string;
  roll_number: string;
  email?: string;
  section?: string;
  created_at?: string;
}

export interface QuestionItem {
  id?: string;
  q_no: string;
  section?: string;
  text: string;
  marks: number;
  is_or_choice?: boolean;
  or_group?: string | null;
  rubric: string;
  ideal_answer?: string;
}

export interface DigitalPaperHeader {
  title: string;
  institution?: string;
  course?: string;
  time_allowed?: string;
  max_marks?: number;
  instructions?: string[];
}

export interface ExamScanResponse {
  status: string;
  source: "gemini" | "ocr_parser";
  model_used?: string;
  filename: string;
  raw_text?: string;
  header: DigitalPaperHeader;
  sections?: { name: string; description?: string }[];
  questions: QuestionItem[];
  questions_count: number;
  total_marks: number;
  digital_paper_code?: string;
  api_error?: string;
}

export interface Exam {
  id: string;
  subject_id: string;
  title: string;
  exam_type: string;
  max_marks: number;
  passing_marks: number;
  academic_year: string;
  exam_date?: string;
  question_paper_filename?: string;
  answer_key_text?: string;
  questions: QuestionItem[];
  evaluations_count?: number;
  created_at?: string;
}

export interface RubricCheckItem {
  criterion: string;
  awarded: number;
  max: number;
  status: "MET" | "PARTIAL" | "UNMET";
}

export interface EvaluationBreakdownItem {
  q_no: string;
  max_marks: number;
  awarded_marks: number;
  rubric_checks: RubricCheckItem[];
  evidence_quote: string;
  deduction_reason: string;
  feedback: string;
}

export interface AcademicEvaluation {
  id: string;
  exam_id: string;
  student_id: string;
  roll_number: string;
  student_name: string;
  answer_sheet_filename?: string;
  total_score: number;
  max_score: number;
  percentage: number;
  grade: string;
  breakdown: EvaluationBreakdownItem[];
  teacher_feedback: string;
  created_at: string;
}
