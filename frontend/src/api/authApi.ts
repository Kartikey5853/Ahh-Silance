/**
 * Authentication and User Account API Service.
 * 
 * Provides methods for user login, session validation, registration,
 * and fetching historical evaluation records from the backend.
 */

import { apiClient } from "./client";
import type { LoginCredentials, RegisterPayload, AuthResponse, UserProfile, EvaluationHistoryItem } from "../types/auth";

export const authApi = {
  /**
   * Submits user credentials to obtain a signed JWT Bearer access token.
   */
  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    const response = await apiClient.post<AuthResponse>("/auth/login", credentials);
    return response.data;
  },

  /**
   * Registers a brand new account and returns a signed JWT Bearer access token.
   */
  async register(data: RegisterPayload): Promise<AuthResponse> {
    const response = await apiClient.post<AuthResponse>("/auth/register", data);
    return response.data;
  },

  /**
   * Fetches the current authenticated user profile using the stored Bearer token.
   */
  async getCurrentUser(): Promise<UserProfile> {
    const response = await apiClient.get<UserProfile>("/auth/me");
    return response.data;
  },

  /**
   * Retrieves past scorecards computed by the currently logged-in user.
   */
  async getEvaluationHistory(): Promise<EvaluationHistoryItem[]> {
    const response = await apiClient.get<EvaluationHistoryItem[]>("/auth/history");
    return response.data;
  },

  /**
   * Clears active authentication tokens from localStorage.
   */
  logout(): void {
    localStorage.removeItem("auth_token");
    localStorage.removeItem("auth_user");
  }
};
