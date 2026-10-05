import { apiClient } from "./client";

/** Weekday keys used by the availability editor. */
export type AvailabilityDayKey =
  | "monday"
  | "tuesday"
  | "wednesday"
  | "thursday"
  | "friday"
  | "saturday"
  | "sunday";

/** One working-hours window for a single weekday. */
export interface AvailabilityDay {
  enabled: boolean;
  /** "HH:MM" 24-hour start time. */
  start: string;
  /** "HH:MM" 24-hour end time. */
  end: string;
}

/** A partial week — only the days the artisan has configured. */
export type AvailabilitySchedule = Partial<Record<AvailabilityDayKey, AvailabilityDay>>;

/** Canonical weekday order, matching the backend's `AvailabilityDayOfWeek`. */
export const AVAILABILITY_DAYS: AvailabilityDayKey[] = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
];

const DEFAULT_START = "09:00";
const DEFAULT_END = "17:00";

/** Response/request shape used by `AvailabilityController`. */
interface AvailabilityIntervalDto {
  dayOfWeek?: string;
  enabled?: boolean;
  start?: string;
  /** Persisted column name, accepted as a fallback for `start`. */
  startTime?: string;
  end?: string;
  /** Persisted column name, accepted as a fallback for `end`. */
  endTime?: string;
}

interface AvailabilityResponse {
  timezone?: string;
  intervals?: AvailabilityIntervalDto[];
}

const DAY_KEYS = new Set<string>(AVAILABILITY_DAYS);

function normaliseDay(day: AvailabilityIntervalDto): AvailabilityDay {
  return {
    enabled: day.enabled !== false,
    start: day.start ?? day.startTime ?? DEFAULT_START,
    end: day.end ?? day.endTime ?? DEFAULT_END,
  };
}

/**
 * Flattens the backend's interval list (`[{ dayOfWeek: "MONDAY", … }]`) into
 * the day-keyed schedule the editor renders.
 *
 * Returns `null` when the artisan has nothing saved yet, so callers can keep
 * their own defaults instead of showing an all-disabled week.
 */
function toSchedule(
  payload: AvailabilityResponse | null | undefined
): AvailabilitySchedule | null {
  const intervals = payload?.intervals;
  if (!Array.isArray(intervals) || intervals.length === 0) {
    return null;
  }

  const schedule: AvailabilitySchedule = {};
  for (const interval of intervals) {
    const key = String(interval.dayOfWeek ?? "").toLowerCase();
    if (!DAY_KEYS.has(key)) continue;
    schedule[key as AvailabilityDayKey] = normaliseDay(interval);
  }

  return Object.keys(schedule).length > 0 ? schedule : null;
}

/**
 * Loads the signed-in artisan's weekly availability.
 *
 * Talks to the same-origin `/api/availability` route, which proxies
 * `AvailabilityController.getAvailability`.
 */
export async function fetchAvailability(): Promise<AvailabilitySchedule | null> {
  const payload = await apiClient.get<AvailabilityResponse | null>(
    "/api/availability",
    { cache: "no-store" }
  );

  return toSchedule(payload);
}

/**
 * Persists the artisan's weekly availability.
 *
 * Mirrors `AvailabilityController`: one `timezone` plus an interval per day.
 * Disabled days are still sent (with `enabled: false`) so the backend clears a
 * window the artisan switched off, rather than leaving the previous one saved.
 */
export async function saveAvailability(
  schedule: AvailabilitySchedule
): Promise<AvailabilitySchedule | null> {
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";

  const intervals = AVAILABILITY_DAYS.map((dayOfWeek) => {
    const day = schedule[dayOfWeek];
    return {
      dayOfWeek,
      enabled: day?.enabled ?? false,
      start: day?.start ?? DEFAULT_START,
      end: day?.end ?? DEFAULT_END,
    };
  });

  const payload = await apiClient.put<AvailabilityResponse | null>(
    "/api/availability",
    { timezone, intervals }
  );

  return toSchedule(payload);
}
