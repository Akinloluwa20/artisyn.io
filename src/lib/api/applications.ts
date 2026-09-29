import { apiClient } from "./client";

export type ApplicationStatus = "pending" | "accepted" | "rejected";

export interface Application {
  id: string;
  jobTitle: string;
  applicant: string;
  payload: unknown;
  createdAt: string;
  status?: ApplicationStatus;
  [key: string]: unknown;
}

export interface CreateApplicationPayload {
  jobTitle: string;
  applicant: string;
  [key: string]: unknown;
}

export async function getApplications(): Promise<Application[]> {
  return apiClient.get<Application[]>("/api/applications");
}

export async function createApplication(
  payload: CreateApplicationPayload
): Promise<Application> {
  return apiClient.post<Application>("/api/applications", payload);
}

export async function updateApplicationStatus(
  id: string,
  status: ApplicationStatus
): Promise<Application> {
  return apiClient.patch<Application>("/api/applications", { id, status });
}
