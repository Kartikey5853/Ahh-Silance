/**
 * Authentication and User Session Data Contracts.
 * 
 * Defines TypeScript interfaces for login credentials, API token responses,
 * authenticated user profile state, and evaluation history entries.
 */

export interface LoginCredentials {
  /** User login handle / username */
  username: string;
  /** Plaintext password string */
  password: string;
}

export interface AuthResponse {
  /** Signed JSON Web Token issued by the backend */
  access_token: string;
  /** Bearer token protocol identifier */
  token_type: string;
  /** Authenticated user handle */
  username: string;
  /** Database primary key identifier */
  user_id: number;
}

export interface UserProfile {
  /** Database user identifier */
  id: number;
  /** Unique username string */
  username: string;
  /** Account creation timestamp string */
  created_at: string;
}

export interface EvaluationHistoryItem {
  /** Unique evaluation UUID string */
  evaluation_id: string;
  /** Exam reference title or code */
  exam_id: string;
  /** Evaluation mode (omr or marked_paper) */
  mode: string;
  /** Detected candidate roll number */
  roll_number: string;
  /** Total score achieved */
  total_score: number;
  /** Maximum possible score (standard 300) */
  max_score: number;
  /** Timestamp when evaluation completed */
  created_at: string;
}
