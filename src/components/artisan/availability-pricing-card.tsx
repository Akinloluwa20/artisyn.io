import React from "react";

type AvailabilityStatus = "available" | "unavailable" | "busy";

export type Weekday =
  | "monday"
  | "tuesday"
  | "wednesday"
  | "thursday"
  | "friday"
  | "saturday"
  | "sunday";

export interface AvailabilityInterval {
  enabled: boolean;
  start: string;
  end: string;
}

export type AvailabilitySchedule = Record<Weekday, AvailabilityInterval>;

export interface AvailabilityPricingCardProps {
  status?: AvailabilityStatus;
  serviceRadius?: string;
  basePrice?: string;
  availability?: AvailabilitySchedule | null;
  timezone?: string;
  isLoading?: boolean;
  error?: string | null;
  onRetry?: () => void;
}

const statusConfig = {
  available: { label: "Available", color: "#22c55e" },
  unavailable: { label: "Unavailable", color: "#ef4444" },
  busy: { label: "Busy", color: "#f97316" },
};

const WEEKDAYS: Weekday[] = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
];

const formatWeekday = (weekday: Weekday) =>
  weekday.charAt(0).toUpperCase() + weekday.slice(1);

export const AvailabilityPricingCard = ({
  status,
  serviceRadius,
  basePrice,
  availability,
  timezone,
  isLoading,
  error,
  onRetry,
}: AvailabilityPricingCardProps) => {
  const currentStatus = status ? statusConfig[status] : null;
  const enabledDays = availability
    ? WEEKDAYS.filter((day) => availability[day]?.enabled)
    : [];

  if (isLoading) {
    return (
      <div className="rounded-xl border p-4 shadow-sm space-3">
        <h3 className="font-semibold text-lg">Availability &amp; Pricing</h3>
        <p className="text-gray-400 text-sm">Loading availability…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border p-4 shadow-sm space-3">
        <h3 className="font-semibold text-lg">Availability &amp; Pricing</h3>
        <p className="text-red-600 text-sm" role="alert">
          {error}
        </p>
        {onRetry ? (
          <button
            type="button"
            onClick={onRetry}
            className="text-sm font-medium text-blue-600 hover:underline"
          >
            Retry
          </button>
        ) : null}
      </div>
    );
  }

  return (
    <div className="rounded-xl border p-4 shadow-sm space-3">
      <h3 className="font-semibold text-lg">Availability &amp; Pricing</h3>

      {currentStatus ? (
        <div className="flex items-center gap-2">
          <span
            style={{ backgroundColor: currentStatus.color }}
            className="w-3 h-3 rounded-full inline-block"
          />
          <span>{currentStatus.label}</span>
        </div>
      ) : (
        <p className="text-gray-400 text-sm">Availability not set</p>
      )}

      {availability ? (
        <div className="space-1">
          <p className="text-sm font-medium">Weekly schedule</p>
          {enabledDays.length > 0 ? (
            <ul className="text-sm text-gray-600 space-0.5">
              {enabledDays.map((day) => (
                <li key={day}>
                  <span className="font-medium">{formatWeekday(day)}</span>: {availability[day].start} – {availability[day].end}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-gray-400">No available days</p>
          )}
          {timezone ? (
            <p className="text-xs text-gray-400">Timezone: {timezone}</p>
          ) : null}
        </div>
      ) : null}

      <p className="text-sm text-gray-600">
        Service area: {serviceRadius ?? "Not specified"}
      </p>

      <p className="text-sm font-medium">
        {basePrice ? `From ${basePrice}` : "Contact for pricing"}
      </p>
    </div>
  );
};

export default AvailabilityPricingCard;
