import { cookies } from "next/headers";

/**
 * Cookie-backed store for curator verification submissions.
 *
 * The app ships without a database, so — like `account-links` and
 * `preferences` — verification submissions are persisted in a cookie and read
 * back by the mock `/api/curator/verification/*` route handlers.
 */

export const CURATOR_VERIFICATION_COOKIE = "artisan-curator-verification";

export type CuratorVerificationState = "pending" | "approved" | "rejected";

export type CuratorVerificationStatus = CuratorVerificationState | "not_submitted";

export interface CuratorVerificationRecord {
  /** Stable submission id. */
  id: string;
  status: CuratorVerificationState;
  /** ISO timestamp of when the application was submitted. */
  submittedAt: string;
  /** ISO timestamp of when a reviewer approved or rejected the submission. */
  reviewedAt?: string;
  fullName?: string;
  specialization?: string;
  /** Reviewer feedback, present when `status` is `"rejected"`. */
  rejectionReasons?: string[];
}

export interface CuratorVerificationStatusResponse {
  /** State of the most recent submission, or `"not_submitted"` when empty. */
  status: CuratorVerificationStatus;
  /** Most recent submission, or `null` when the curator has never applied. */
  current: CuratorVerificationRecord | null;
  /** Every submission, newest first. */
  history: CuratorVerificationRecord[];
}

/**
 * Placeholder submissions returned until the curator records their own, so the
 * status page renders a meaningful badge, timeline and rejection reasons on a
 * fresh install. Kept deterministic (no `Date.now()`) for stable rendering.
 */
export const DEFAULT_CURATOR_VERIFICATION_SUBMISSIONS: CuratorVerificationRecord[] =
  [
    {
      id: "submission-1",
      status: "rejected",
      submittedAt: "2026-04-02T09:15:00.000Z",
      reviewedAt: "2026-04-06T14:40:00.000Z",
      specialization: "Tailoring",
      rejectionReasons: [
        "Portfolio documents did not clearly show your own work.",
        "The submitted proof of identity document had expired.",
      ],
    },
    {
      id: "submission-2",
      status: "pending",
      submittedAt: "2026-04-28T11:05:00.000Z",
      specialization: "Tailoring",
    },
  ];

/** Reads the stored submissions, falling back to the placeholder list. */
export async function readCuratorVerificationSubmissions(): Promise<
  CuratorVerificationRecord[]
> {
  const cookieStore = await cookies();
  const raw = cookieStore.get(CURATOR_VERIFICATION_COOKIE)?.value;
  if (!raw) {
    return DEFAULT_CURATOR_VERIFICATION_SUBMISSIONS;
  }

  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return DEFAULT_CURATOR_VERIFICATION_SUBMISSIONS;
    }
    return parsed as CuratorVerificationRecord[];
  } catch {
    return DEFAULT_CURATOR_VERIFICATION_SUBMISSIONS;
  }
}

/** Appends a submission to the cookie-backed store and returns the record. */
export async function appendCuratorVerificationSubmission(
  submission: CuratorVerificationRecord
): Promise<CuratorVerificationRecord> {
  const existing = await readCuratorVerificationSubmissions();
  const next = [...existing, submission];

  const cookieStore = await cookies();
  cookieStore.set(CURATOR_VERIFICATION_COOKIE, JSON.stringify(next), {
    path: "/",
    maxAge: 60 * 60 * 24 * 365, // 1 year
    httpOnly: false, // Readable by the client so the status page can refresh.
    sameSite: "lax",
  });

  return submission;
}
