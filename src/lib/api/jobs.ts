import { apiClient } from "./client";

export interface Job {
  id: string;
  title: string;
  category: string;
  budget: string;
  location: string;
  shortDescription: string;
  urgency: "low" | "medium" | "high";
  icon?: string;
  status: "available" | "active" | "applied" | "completed";
  [key: string]: unknown;
}

export interface JobsListResponse<T = Job> {
  jobs: T[];
  total: number;
  page: number;
  totalPages: number;
}

export interface ListJobsParams {
  page?: number;
  limit?: number;
  [key: string]: string | number | undefined;
}

export async function listJobs<T = Job>(
  params: ListJobsParams = {}
): Promise<JobsListResponse<T>> {
  return apiClient.get<JobsListResponse<T>>("/api/jobs", { query: params });
}
