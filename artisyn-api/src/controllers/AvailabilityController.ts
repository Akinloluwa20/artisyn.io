import { Request, Response } from "express";
import { PrismaClient, AvailabilityDayOfWeek } from "@prisma/client";

const WEAKDAYS: AvailabilityDayOfWeek[] = [
  AvailabilityDayOfWeek.MONDAY,
  AvailabilityDayOfWeek.TUESDAY,
  AvailabilityDayOfWeek.WEDNESDAY,
  AvailabilityDayOfWeek.THURSDAY,
  AvailabilityDayOfWeek.FRIDAY,
  AvailabilityDayOfWeek.SATURDAY,
  AvailabilityDayOfWeek.SUNDAY,
];

const TIME_REGEXP = /^([01]\d|2[0-3]):[0-5]\d$/;

type IntervalInput = {
  dayOfWeek: string;
  enabled?: boolean;
  start?: string;
  end?: string;
};

type UpsertPayload = {
  timezone?: string;
  intervals?: IntervalInput[];
};

type ValidatedInterval = {
  dayOfWeek: AvailabilityDayOfWeek;
  startTime: string;
  endTime: string;
};

export class AvailabilityValidationError extends Error {
  status = 400;
  details: Record<string, string>;

  constructor(details: Record<string, string>) {
    super("Availability payload is invalid");
    this.name = "AvailabilityValidationError";
    this.details = details;
  }
}

function isValidTimezone(timezone: string): boolean {
  if (!timezone || timezone.length > 64) {
    return false;
  }
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: timezone });
    return true;
  } catch {
    return false;
  }
}

function minutesOfDay(time: string): number {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
}

function validatePayload(payload: UpsertPayload): {
  timezone: string;
  intervals: ValidatedInterval[];
} {
  const details: Record<string, string> = {};
  const timezone = typeof payload.timezone === "string" ? payload.timezone.trim() : "";

  if (!timezone) {
    details.timezone = "Timezone is required";
  } else if (!isValidTimezone(timezone)) {
    details.timezone = "Timezone must be a valid IANA timezone identifier";
  }

  if (!Array.isArray(payload.intervals)) {
    details.intervals = "Intervals must be an array";
    throw new AvailabilityValidationError(details);
  }

  const seenDays = new Set<string>();
  const validatedIntervals: ValidatedInterval[] = [];

  payload.intervals.forEach((interval, index) => {
    const prefix = `intervals[${index}]`;
    const day = typeof interval.dayOfWeek === "string" ? interval.dayOfWeek.toUpperCase() : "";

    if (!WEAKDAYS.includes(day as AvailabilityDayOfWeek)) {
      details[`${prefix}.dayOfWeek`] = "Day of week is invalid";
      return;
    }

    if (seenDays.has(day)) {
      details[`${prefix}.dayOfWeek`] = "Duplicate day of week";
      return;
    }
    seenDays.add(day);

    if (interval.enabled === false) {
      return;
    }

    const start = typeof interval.start === "string" ? interval.start.trim() : "";
    const end = typeof interval.end === "string" ? interval.end.trim() : "";

    if (!TIME_REGEXP.test(start)) {
      details[`${prefix}.start`] = "Start time must use HH:MM format";
    }
    if (!TIME_REGEXP.test(end)) {
      details[`${prefix}.end`] = "End time must use HH:MM format";
    }
    if (TIME_REGEXP.test(start) && TIME_REGEXP.test(end)) {
      if (minutesOfDay(end) <= minutesOfDay(start)) {
        details[`${prefix}.end`] = "End time must be after start time";
      }
    }

    if (!details[`${prefix}.start`] && !details[`${prefix}.end`]) {
      validatedIntervals.push({
        dayOfWeek: day as AvailabilityDayOfWeek,
        startTime: start,
        endTime: end,
      });
    }
  });

  if (Object.keys(details).length > 0) {
    throw new AvailabilityValidationError(details);
  }

  return { timezone, intervals: validatedIntervals };
}

export class AvailabilityController {
  constructor(private readonly prisma: PrismaClient) {}

  private getArtisanId(req: Request): string | null {
    const user = (req as Request & { user?: { id?: string; artisanId?: string } }).user;
    return user?.artisanId ?? user?.id ?? null;
  }

  async getAvailability(req: Request, res: Response): Promise<void> {
    const artisanId = this.getArtisanId(req);
    if (!artisanId) {
      res.status(401).json({ error: "Unauthenticated" });
      return;
    }

    const availability = await this.prisma.artisanAvailability.findUnique({
      where: { artisanId },
      include: { intervals: true },
    });

    if (!availability) {
      res.json({
        timezone: "UTC",
        intervals: WEAKDAYS.map((dayOfWeek) => ({
          dayOfWeek,
          enabled: false,
          start: "09:00",
          end: "17:00",
        })),
      });
      return;
    }

    const intervalByDay = new Map(availability.intervals.map((interval) => [interval.dayOfWeek, interval]));

    res.json({
      timezone: availability.timezone,
      intervals: WEAKDAYS.map((dayOfWeek) => {
        const interval = intervalByDay.get(dayOfWeek);
        return {
          dayOfWeek,
          enabled: Boolean(interval),
          start: interval?.startTime ?? "09:00",
          end: interval?.endTime ?? "17:00",
        };
      }),
    });
  }

  async upsertAvailability(req: Request, res: Response): Promise<void> {
    const artisanId = this.getArtisanId(req);
    if (!artisanId) {
      res.status(401).json({ error: "Unauthenticated" });
      return;
    }

    try {
      const validated = validatePayload(req.body as UpsertPayload);

      const saved = await this.prisma.$transaction(async (tx) => {
        const availability = await tx.artisanAvailability.upsert({
          where: { artisanId },
          create: { artisanId, timezone: validated.timezone },
          update: { timezone: validated.timezone },
        });

        await tx.availabilityInterval.deleteMany({ where: { availabilityId: availability.id } });

        if (validated.intervals.length > 0) {
          await tx.availabilityInterval.createMany({
            data: validated.intervals.map((interval) => ({
              availabilityId: availability.id,
              dayOfWeek: interval.dayOfWeek,
              startTime: interval.startTime,
              endTime: interval.endTime,
            })),
          });
        }

        return tx.artisanAvailability.findUnique({
          where: { id: availability.id },
          include: { intervals: true },
        });
      });

      if (!saved) {
        res.status(500).json({ error: "Unable to save availability" });
        return;
      }

      const intervalByDay = new Map(saved.intervals.map((interval) => [interval.dayOfWeek, interval]));

      res.json({
        timezone: saved.timezone,
        intervals: WEAKDAYS.map((dayOfWeek) => {
          const interval = intervalByDay.get(dayOfWeek);
          return {
            dayOfWeek,
            enabled: Boolean(interval),
            start: interval?.startTime ?? "09:00",
            end: interval?.endTime ?? "17:00",
          };
        }),
      });
    } catch (error) {
      if (error instanceof AvailabilityValidationError) {
        res.status(error.status).json({ error: error.message, details: error.details });
        return;
      }
      res.status(500).json({ error: "Unable to save availability" });
    }
  }

  async getPublicAvailability(req: Request, res: Response): Promise<void> {
    const artisanId = req.params.id;
    if (!artisanId) {
      res.status(400).json({ error: "Artisan id is required" });
      return;
    }

    const artisan = await this.prisma.artisan.findUnique({
      where: { id: artisanId },
      include: { availability: { include: { intervals: true } } },
    });

    if (!artisan || !artisan.availability) {
      res.status(404).json({ error: "Availability not found" });
      return;
    }

    const privacy = (artisan as { profilePrivacy?: string; availabilityVisibility?: string });
    const visibility = privacy.availabilityVisibility ?? privacy.profilePrivacy ?? "public";
    if (visibility !== "public") {
      res.status(403).json({ error: "Availability is not publicly visible" });
      return;
    }

    res.json(({
      timezone: artisan.availability.timezone,
      intervals: artisan.availability.intervals.map((interval) => ({
        dayOfWeek: interval.dayOfWeek,
        start: interval.startTime,
        end: interval.endTime,
      })),
    }));
  }
}
