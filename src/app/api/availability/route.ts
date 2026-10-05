import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

/**
 * Same-origin availability endpoint used by `lib/api/availability.ts`.
 *
 * The shape mirrors `AvailabilityController` in `artisyn-api`: one `timezone`
 * plus an interval per weekday. Persisted in a cookie, following the same
 * convention as the sibling `api/preferences` and `api/account-links` routes.
 */

interface AvailabilityInterval {
  dayOfWeek: string;
  enabled: boolean;
  start: string;
  end: string;
}

interface AvailabilityPayload {
  timezone: string;
  intervals: AvailabilityInterval[];
}

const DAYS = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
] as const;

const COOKIE_NAME = "artisan-availability";

const DEFAULT_START = "09:00";
const DEFAULT_END = "17:00";

/** Weekdays on by default, matching the editor's initial schedule. */
const DEFAULT_ENABLED = new Set<string>([
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
]);

function defaultPayload(): AvailabilityPayload {
  return {
    timezone: "UTC",
    intervals: DAYS.map((dayOfWeek) => ({
      dayOfWeek,
      enabled: DEFAULT_ENABLED.has(dayOfWeek),
      start: DEFAULT_START,
      end: DEFAULT_END,
    })),
  };
}

async function readPayload(): Promise<AvailabilityPayload> {
  const cookieStore = await cookies();
  const raw = cookieStore.get(COOKIE_NAME)?.value;
  if (!raw) {
    return defaultPayload();
  }
  try {
    const parsed = JSON.parse(raw) as AvailabilityPayload;
    if (!Array.isArray(parsed?.intervals)) {
      return defaultPayload();
    }
    return parsed;
  } catch {
    return defaultPayload();
  }
}

async function writePayload(payload: AvailabilityPayload): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, JSON.stringify(payload), {
    path: "/",
    maxAge: 60 * 60 * 24 * 365, // 1 year
    httpOnly: false,
    sameSite: "lax",
  });
}

const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

function toMinutes(time: string): number {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
}

/**
 * Validates an incoming payload the same way the backend controller does:
 * known weekday, unique per request, `HH:MM` times and end after start.
 * Returns an error map keyed by field, or `null` when the payload is valid.
 */
function validate(body: unknown): Record<string, string> | null {
  const details: Record<string, string> = {};
  const payload = (body ?? {}) as Partial<AvailabilityPayload>;

  const timezone = typeof payload.timezone === "string" ? payload.timezone.trim() : "";
  if (!timezone) {
    details.timezone = "Timezone is required";
  }

  if (!Array.isArray(payload.intervals)) {
    details.intervals = "Intervals must be an array";
    return details;
  }

  const seen = new Set<string>();
  payload.intervals.forEach((interval, index) => {
    const prefix = `intervals[${index}]`;
    const day = String(interval?.dayOfWeek ?? "").toLowerCase();

    if (!(DAYS as readonly string[]).includes(day)) {
      details[`${prefix}.dayOfWeek`] = "Day of week is invalid";
      return;
    }
    if (seen.has(day)) {
      details[`${prefix}.dayOfWeek`] = "Duplicate day of week";
      return;
    }
    seen.add(day);

    const start = typeof interval?.start === "string" ? interval.start.trim() : "";
    const end = typeof interval?.end === "string" ? interval.end.trim() : "";

    if (!TIME_PATTERN.test(start)) {
      details[`${prefix}.start`] = "Start time must use HH:MM format";
    }
    if (!TIME_PATTERN.test(end)) {
      details[`${prefix}.end`] = "End time must use HH:MM format";
    }
    if (
      TIME_PATTERN.test(start) &&
      TIME_PATTERN.test(end) &&
      toMinutes(end) <= toMinutes(start)
    ) {
      details[`${prefix}.end`] = "End time must be after start time";
    }
  });

  return Object.keys(details).length > 0 ? details : null;
}

// GET /api/availability
export async function GET() {
  return NextResponse.json(await readPayload());
}

// PUT /api/availability
export async function PUT(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const details = validate(body);
  if (details) {
    return NextResponse.json(
      { error: "Availability payload is invalid", details },
      { status: 400 }
    );
  }

  const payload = body as AvailabilityPayload;
  await writePayload({
    timezone: payload.timezone.trim(),
    intervals: payload.intervals.map((interval) => ({
      dayOfWeek: String(interval.dayOfWeek).toLowerCase(),
      enabled: interval.enabled !== false,
      start: interval.start,
      end: interval.end,
    })),
  });

  return NextResponse.json(await readPayload());
}

// POST /api/availability — kept as an alias of PUT for form submissions.
export async function POST(request: NextRequest) {
  return PUT(request);
}
