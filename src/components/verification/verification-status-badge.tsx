import { cva, type VariantProps } from "class-variance-authority";
import type { ComponentPropsWithoutRef } from "react";

import { cn } from "@/lib/utils";

export type VerificationStatus =
  | "not_submitted"
  | "pending"
  | "approved"
  | "rejected";

const statusLabels: Record<VerificationStatus, string> = {
  not_submitted: "Not submitted",
  pending: "Pending review",
  approved: "Approved",
  rejected: "Rejected",
};

const statusStyles: Record<VerificationStatus, string> = {
  not_submitted: "border-gray-200 bg-gray-50 text-gray-600",
  pending: "border-amber-200 bg-amber-50 text-amber-700",
  approved: "border-emerald-200 bg-emerald-50 text-emerald-700",
  rejected: "border-rose-200 bg-rose-50 text-rose-700",
};

const verificationStatusBadgeVariants = cva(
  "inline-flex w-fit shrink-0 items-center justify-center whitespace-nowrap rounded-full border font-medium tracking-normal",
  {
    variants: {
      size: {
        sm: "h-5 px-2 text-[11px]",
        md: "h-6 px-2.5 text-xs",
        lg: "h-7 px-3 text-sm",
      },
    },
    defaultVariants: {
      size: "md",
    },
  }
);

export interface VerificationStatusBadgeProps
  extends ComponentPropsWithoutRef<"span">,
    VariantProps<typeof verificationStatusBadgeVariants> {
  status: VerificationStatus;
}

/** Pill that renders a curator verification state with a consistent tone. */
export function VerificationStatusBadge({
  status,
  size,
  className,
  ...props
}: VerificationStatusBadgeProps) {
  return (
    <span
      className={cn(
        verificationStatusBadgeVariants({ size }),
        statusStyles[status],
        className
      )}
      {...props}
    >
      {statusLabels[status]}
    </span>
  );
}
