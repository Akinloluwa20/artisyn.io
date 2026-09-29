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
