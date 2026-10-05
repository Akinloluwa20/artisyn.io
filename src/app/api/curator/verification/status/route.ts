import { NextResponse } from "next/server";

import {
  readCuratorVerificationSubmissions,
  type CuratorVerificationRecord,
  type CuratorVerificationStatusResponse,
} from "@/lib/curator/verification-store";

// GET /api/curator/verification/status
//
// Returns the curator's current verification state together with the full
// submission history (newest first) so the status page can render a badge, a
// timeline and any rejection reasons.
export async function GET() {
  const submissions = await readCuratorVerificationSubmissions();

  const newestFirst: CuratorVerificationRecord[] = [...submissions].sort(
    (a, b) => Date.parse(b.submittedAt) - Date.parse(a.submittedAt)
  );

  const current = newestFirst[0] ?? null;

  const body: CuratorVerificationStatusResponse = {
    status: current?.status ?? "not_submitted",
    current,
    history: newestFirst,
  };

  return NextResponse.json(body);
}
