/**
 * Examination Evaluation and Scorecard Data Contracts.
 * 
 * Defines TypeScript interfaces matching the NTA JEE scoring output schema,
 * question-level marks, subject breakdowns, and quality assurance audit flags.
 */

export interface CandidateInfo {
  /** Full candidate display name */
  candidate_name: string;
  /** 10-digit detected or transcribed roll number */
  roll_number: string;
  /** Booklet test version (e.g. SET A) */
  booklet_code: string;
  /** Official exam title string */
  exam_title: string;
}

export type QuestionStatus = "CORRECT" | "INCORRECT" | "UNATTEMPTED" | "OVERFLOW_IGNORED";

export interface QuestionScoreItem {
  /** Question sequence number (1 to 90) */
  question_no: number;
  /** MCQ or NUMERICAL */
  question_type: string;
  /** Candidate bubble or written value */
  candidate_response: string | null;
  /** Master answer key correct answer */
  correct_answer: string;
  /** Marks awarded (+4, -1, 0) */
  marks_awarded: number;
  /** Evaluation status tag */
  status: QuestionStatus;
  /** Explanation if discarded by Section B First-5 rule */
  audit_note?: string | null;
}

export interface SubjectBreakdown {
  /** Subject name (Physics, Chemistry, Mathematics) */
  subject: string;
  /** Net marks scored in this subject */
  score: number;
  /** Max marks per subject (100) */
  max_marks: number;
  /** Count of correct questions */
  correct: number;
  /** Count of incorrect questions */
  incorrect: number;
  /** Count of unattempted questions */
  unattempted: number;
  /** Discarded Section B overflow attempts */
  overflow_ignored: number;
}

export interface ScoringSummary {
  /** Net aggregated score across all subjects */
  total_score: number;
  /** Maximum possible test marks (300) */
  max_possible_score: number;
  /** Total questions answered correctly */
  correct_count: number;
  /** Total questions answered incorrectly */
  incorrect_count: number;
  /** Total questions skipped */
  unattempted_count: number;
  /** Total extra Section B questions discarded by First-5 rule */
  overflow_ignored_count: number;
  /** Detailed 90-question array of question scores */
  question_scores: QuestionScoreItem[];
}

export interface ExamAnalytics {
  /** Subject-level score distributions */
  subject_breakdowns: Record<string, SubjectBreakdown>;
  /** Overall attempt accuracy percentage */
  accuracy_percentage: number;
  /** Overall test question attempt rate */
  attempt_rate_percentage: number;
  /** Estimated percentile bucket */
  estimated_percentile?: number;
}

export interface AuditVerificationFlags {
  /** True if double-bubbling was flagged */
  has_double_marks: boolean;
  /** True if written digits diverged from bubbled matrix */
  has_digit_bubble_mismatches: boolean;
  /** True if faint pencil strokes were observed */
  has_faint_marks: boolean;
  /** True if Section B had >5 attempts requiring First-5 pruning */
  has_section_b_overflow: boolean;
}

export interface EvaluationScorecard {
  /** Unique evaluation UUID string */
  evaluation_id: string;
  /** Candidate identity and metadata */
  candidate: CandidateInfo;
  /** Score tallies and question results */
  scoring: ScoringSummary;
  /** Subject metrics and accuracy percentages */
  analytics: ExamAnalytics;
  /** Quality control audit warnings */
  audit_flags: AuditVerificationFlags;
  /** Server-side pipeline processing duration in ms */
  processed_in_milliseconds: number;
}
