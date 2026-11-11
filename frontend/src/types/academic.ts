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
  start_date?: string;
  end_date?: string;
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
  grading_system?: string;
  theory_practical_split?: string;
  board_or_program?: string;
  ltp_hours?: string;
  chapters: string[];
  enrolled_students?: number;
  exams_count?: number;
  created_at?: string;
}

export interface SemesterRecord {
  semester: string;
  sgpa?: number;
  cgpa?: number;
  credits?: number;
  status?: string;
}

export interface Student {
  id: string;
  subject_id: string;
  class_id?: string;
  name: string;
  roll_number: string;
  email?: string;
  section?: string;
  phone?: string;
  parent_name?: string;
  parent_phone?: string;
  dob?: string;
  blood_group?: string;
  attendance_percentage?: number;
  cgpa_or_percentage?: number;
  admission_year?: string;
  status?: string;
  notes?: string;
  semester_records?: SemesterRecord[];
  created_at?: string;
}

export interface EnrolledSubjectItem {
  student_row_id: string;
  subject_id: string;
  subject_name: string;
  subject_code: string;
  section?: string;
  credits?: number | null;
  semester_or_grade?: string;
  attendance_percentage?: number;
}

export interface StudentFullProfile {
  student: Student;
  subject?: Subject | null;
  class_item?: ClassItem | null;
  enrolled_subjects?: EnrolledSubjectItem[];
  evaluations: AcademicEvaluation[];
  upcoming_exams: Exam[];
  stats: {
    total_exams_taken: number;
    upcoming_exams_count: number;
    average_percentage: number;
    highest_score: number;
  };
}

export interface QuestionItem {
  id?: string;
  q_no: string;
  section?: string;
  text: string;
  marks: number;
  is_or_choice?: boolean;
  or_group?: string | null;
  page?: number;
  box_2d?: number[];
  rubric: string;
  ideal_answer?: string;
}

export interface RefineQuestionSuggestion {
  title: string;
  difficulty_level: string;
  question_text: string;
  marks: number;
  rubric: string;
  rationale: string;
}

export interface RefineQuestionResponse {
  status: string;
  source?: string;
  model_used?: string;
  topic_detected?: string;
  suggestions: RefineQuestionSuggestion[];
  api_error?: string;
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
  paper_id?: string;
  paper_page_count?: number;
  raw_text?: string;
  header: DigitalPaperHeader;
  sections?: { name: string; description?: string }[];
  questions: QuestionItem[];
  questions_count: number;
  total_marks: number;
  digital_paper_code?: string;
  api_error?: string;
}

export interface AnswerKeyStructuredItem {
  q_no: string;
  marks: number;
  model_answer: string;
  marks_distribution?: { label: string; marks: number; color?: string }[];
  rubric_items?: { title: string; marks: number; criteria: string[] }[];
  marking_notes?: string;
  bloom_level?: string;
}

export interface Exam {
  id: string;
  subject_id: string;
  title: string;
  exam_type: string;
  max_marks: number;
  passing_marks: number;
  academic_year: string;
  target_section?: string;
  exam_date?: string;
  correction_deadline?: string;
  question_paper_filename?: string;
  paper_id?: string;
  paper_page_count?: number;
  answer_key_text?: string;
  answer_key_structured?: AnswerKeyStructuredItem[];
  questions: QuestionItem[];
  evaluations_count?: number;
  created_at?: string;
}

export interface ExamEligibleStudent {
  student_id: string;
  name: string;
  roll_number: string;
  email?: string;
  section?: string;
  sections?: string[];
  status?: string;
  cgpa_or_percentage?: number;
  enrolled_subjects?: string[];
  evaluated: boolean;
  evaluation_id?: string | null;
  total_score?: number | null;
  max_score?: number | null;
  percentage?: number | null;
  grade?: string | null;
}

export interface ExamDetailsResponse {
  exam: Exam;
  subject?: Subject | null;
  class_item?: ClassItem | null;
  available_sections: string[];
  eligible_students: ExamEligibleStudent[];
}

export interface BackgroundJobStatus {
  job_id: string;
  exam_id?: string;
  kind?: string;
  status: "running" | "completed" | "failed";
  started_at?: string;
  completed_at?: string;
  result?: any;
  error?: string | null;
}

export interface RubricCheckItem {
  criterion: string;
  awarded: number;
  max: number;
  status: "MET" | "PARTIAL" | "UNMET";
}

export interface EvaluationBreakdownItem {
  q_no: string;
  page?: number;
  status?: "CORRECT" | "PARTIAL" | "INCORRECT" | "UNATTEMPTED" | string;
  question_text?: string;
  ocr_extracted_text?: string;
  max_marks: number;
  awarded_marks: number;
  rubric_checks: RubricCheckItem[];
  improvement_title?: string;
  improvement_tip?: string;
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
  page_count?: number;
  pages_dir?: string;
  magic_ink?: any;
  structured_transcription?: any;
  breakdown: EvaluationBreakdownItem[];
  teacher_feedback: string;
  created_at: string;
}
