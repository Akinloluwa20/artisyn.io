import { apiClient } from "./client";

export interface CuratorVerificationSubmission {
  id: string;
  status: "pending";
  submittedAt: string;
}

export const CURATOR_VERIFICATION_SUBMIT_ENDPOINT =
  "/api/curator/verification/submit";

/** Submit a curator verification application as a multipart payload. */
export async function submitCuratorVerification(
  payload: FormData
): Promise<CuratorVerificationSubmission> {
  return apiClient.post<CuratorVerificationSubmission>(
    CURATOR_VERIFICATION_SUBMIT_ENDPOINT,
    payload
  );
}

/** State of a single curator verification submission. */
export type CuratorVerificationState = "pending" | "approved" | "rejected";

/** State of the latest submission, or `not_submitted` before the first one. */
export type CuratorVerificationStatus =
  | CuratorVerificationState
  | "not_submitted";

export interface CuratorVerificationRecord {
  id: string;
  status: CuratorVerificationState;
  submittedAt: string;
  reviewedAt?: string;
  fullName?: string;
  specialization?: string;
  /** Reviewer feedback, present when `status` is `"rejected"`. */
  rejectionReasons?: string[];
}

export interface CuratorVerificationStatusResponse {
  status: CuratorVerificationStatus;
  current: CuratorVerificationRecord | null;
  history: CuratorVerificationRecord[];
}

export const CURATOR_VERIFICATION_STATUS_ENDPOINT =
  "/api/curator/verification/status";

/** Fetch the current verification state and the full submission history. */
export async function getCuratorVerificationStatus(): Promise<CuratorVerificationStatusResponse> {
  return apiClient.get<CuratorVerificationStatusResponse>(
    CURATOR_VERIFICATION_STATUS_ENDPOINT
  );
}
