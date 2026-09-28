"use client";

import { cn } from "@/lib/utils";

/**
 * Shared loading placeholders.
 *
 * `Skeleton` is the base pulsing block; `SkeletonCard` and `SkeletonList`
 * compose it into the card and list shapes that most pages need while their
 * data resolves. They are purely presentational, carry no fetching logic, and
 * mark themselves `aria-busy` so assistive technology can announce the
 * pending region.
 *
 * Prefer these over hand-rolled `animate-pulse` markup so that the pulse
 * timing, block colours and card chrome stay consistent across routes.
 */

export interface SkeletonProps {
  className?: string;
}

/** A single pulsing placeholder block. */
export function Skeleton({ className }: SkeletonProps) {
  return (
    <div
      data-slot="skeleton"
      aria-hidden="true"
      className={cn("animate-pulse rounded bg-gray-200", className)}
    />
  );
}

export interface SkeletonCardProps {
  /** Renders a leading media block, e.g. a thumbnail or icon tile. */
  showMedia?: boolean;
  /** Number of text lines reserved under the title. */
  lines?: number;
  /** Renders a trailing block, e.g. a status badge or an amount. */
  showAside?: boolean;
  /** Accessible label announced while the card is a placeholder. */
  label?: string;
  className?: string;
}

/**
 * Placeholder matching the app's card chrome
 * (`bg-white rounded-lg border border-gray-200 ... shadow-sm`).
 */
export function SkeletonCard({
  showMedia = false,
  lines = 2,
  showAside = false,
  label = "Loading",
  className,
}: SkeletonCardProps) {
  return (
    <div
      data-slot="skeleton-card"
      role="status"
      aria-busy="true"
      aria-label={label}
      className={cn(
        "rounded-lg border border-gray-200 bg-white p-4 shadow-sm",
        className,
      )}
    >
      <div className="flex items-start gap-3">
        {showMedia ? <Skeleton className="size-12 shrink-0" /> : null}

        <div className="min-w-0 flex-1 space-y-2">
          <Skeleton className="h-4 w-3/4" />
          {Array.from({ length: Math.max(0, lines) }).map((_, index) => (
            <Skeleton
              key={index}
              className={cn("h-3", index === lines - 1 ? "w-1/2" : "w-full")}
            />
          ))}
        </div>

        {showAside ? <Skeleton className="h-5 w-20 shrink-0" /> : null}
      </div>
    </div>
  );
}
