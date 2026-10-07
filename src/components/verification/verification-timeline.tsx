import type { ComponentPropsWithoutRef } from "react";
import { CheckCircle2, Clock, XCircle } from "lucide-react";

import { cn } from "@/lib/utils";
import type { CuratorVerificationRecord } from "@/lib/api";
import { VerificationStatusBadge } from "./verification-status-badge";

const statusIcons = {
  pending: Clock,
  approved: CheckCircle2,
  rejected: XCircle,
} as const;

const statusIconTone = {
  pending: "border-amber-500 bg-amber-500 text-white",
  approved: "border-emerald-600 bg-emerald-600 text-white",
  rejected: "border-rose-600 bg-rose-600 text-white",
} as const;

function formatDateTime(value?: string): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

export interface VerificationTimelineProps
  extends ComponentPropsWithoutRef<"ol"> {
  /** Submissions to render, newest first. */
  records: CuratorVerificationRecord[];
}

/**
 * Vertical timeline of a curator's verification submissions. Each entry shows
 * its state, when it was submitted/reviewed and — for rejected submissions —
 * the reasons recorded by the reviewer.
 */
export function VerificationTimeline({
  records,
  className,
  ...props
}: VerificationTimelineProps) {
  return (
    <ol className={cn("space-y-0", className)} {...props}>
      {records.map((record, index) => {
        const Icon = statusIcons[record.status];
        const isLatest = index === 0;

        return (
          <li
            key={record.id}
            className="relative grid grid-cols-[2rem_1fr] gap-3 pb-6 last:pb-0"
            aria-current={isLatest ? "step" : undefined}
          >
            {index < records.length - 1 && (
              <span
                className="absolute left-4 top-8 h-[calc(100%-2rem)] w-px -translate-x-1/2 bg-gray-200"
                aria-hidden="true"
              />
            )}

            <span
              className={cn(
                "z-10 flex h-8 w-8 items-center justify-center rounded-full border",
                statusIconTone[record.status]
              )}
            >
              <Icon className="h-4 w-4" aria-hidden="true" />
            </span>

            <div
              className={cn(
                "min-w-0 rounded-md border bg-white px-3 py-3",
                isLatest ? "border-[#605DEC] shadow-sm" : "border-gray-200"
              )}
            >
              <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
                <VerificationStatusBadge status={record.status} size="sm" />
                <time
                  className="text-xs font-medium text-gray-500"
                  dateTime={record.submittedAt}
                >
                  Submitted {formatDateTime(record.submittedAt)}
                </time>
              </div>

              {record.specialization && (
                <p className="mt-2 text-sm text-gray-700">
                  Specialization:{" "}
                  <span className="font-medium">{record.specialization}</span>
                </p>
              )}

              <p className="mt-1 text-xs text-gray-500">
                {record.reviewedAt
                  ? `Reviewed ${formatDateTime(record.reviewedAt)}`
                  : "Awaiting review"}
              </p>

              {record.rejectionReasons && record.rejectionReasons.length > 0 && (
                <div className="mt-3 rounded-md border border-rose-200 bg-rose-50 px-3 py-2">
                  <p className="text-xs font-semibold uppercase tracking-wide text-rose-700">
                    Rejection reasons
                  </p>
                  <ul className="mt-1 list-disc space-y-1 pl-4 text-sm text-rose-700">
                    {record.rejectionReasons.map((reason) => (
                      <li key={reason}>{reason}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
