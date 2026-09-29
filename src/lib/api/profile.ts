import { apiClient } from "./client";

/**
 * Persists a profile payload to the backend.
 * Accepts the partial profile shape used across onboarding/setup flows and
 * returns the server's persisted representation.
 */
export type ProfilePayload = Record<string, unknown>;
export type ProfileResponse = Record<string, unknown>;

export interface ProfileCompletionField {
  label: string;
  done: boolean;
}

export interface ProfileCompletionResponse {
  percentage: number;
  fields: ProfileCompletionField[];
}

export async function getProfile(): Promise<ProfileResponse> {
  return apiClient.get<ProfileResponse>("/api/profile", {
    cache: "no-store",
  });
}

export async function saveProfile<T extends object>(
  payload: T
): Promise<ProfileResponse> {
  return apiClient.post<ProfileResponse>("/api/profile", payload);
}

export async function getProfileCompletion(): Promise<ProfileCompletionResponse> {
  return apiClient.get<ProfileCompletionResponse>("/api/profile/completion", {
    cache: "no-store",
  });
}
