"use client";

import { useEffect, useState } from "react";
import { Check, Clock, Save } from "lucide-react";
import { cn } from "@/lib/utils";
import { fetchAvailability, saveAvailability } from "@/lib/api/availability";

// ─── Types ────────────────────────────────────────────────────────────────────

export type DayKey =
  | "monday"
  | "tuesday"
  | "wednesday"
  | "thursday"
  | "friday"
  | "saturday"
  | "sunday";

export type DaySchedule = {
  enabled: boolean;
  start: string; // "HH:MM" 24-hour
  end: string;   // "HH:MM" 24-hour
};

export type AvailabilitySchedule = Record<DayKey, DaySchedule>;

// ─── Constants ────────────────────────────────────────────────────────────────

const DAYS: { key: DayKey; label: string; short: string }[] = [
  { key: "monday",    label: "Monday",    short: "Mon" },
  { key: "tuesday",   label: "Tuesday",   short: "Tue" },
  { key: "wednesday", label: "Wednesday", short: "Wed" },
  { key: "thursday",  label: "Thursday",  short: "Thu" },
  { key: "friday",    label: "Friday",    short: "Fri" },
  { key: "saturday",  label: "Saturday",  short: "Sat" },
  { key: "sunday",    label: "Sunday",    short: "Sun" },
];

const DEFAULT_SCHEDULE: AvailabilitySchedule = {
  monday:    { enabled: true,  start: "09:00", end: "17:00" },
  tuesday:   { enabled: true,  start: "09:00", end: "17:00" },
  wednesday: { enabled: true,  start: "09:00", end: "17:00" },
  thursday:  { enabled: true,  start: "09:00", end: "17:00" },
  friday:    { enabled: true,  start: "09:00", end: "17:00" },
  saturday:  { enabled: false, start: "10:00", end: "14:00" },
  sunday:    { enabled: false, start: "10:00", end: "14:00" },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** "09:00" → "9:00 AM" */
function formatTime(t: string): string {
  const [h, m] = t.split(":").map(Number);
  const ampm = h >= 12 ? "PM" : "AM";
  const hour = h % 12 === 0 ? 12 : h % 12;
  return `${hour}:${String(m).padStart(2, "0")} ${ampm}`;
}

/** Compare two "HH:MM" strings — returns true when end is after start */
function isEndAfterStart(start: string, end: string): boolean {
  return end > start;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function AvailabilityEditor() {
  // Lazy initialisers run once on mount — no useEffect needed,
  // which avoids the react-hooks/set-state-in-effect lint error.
  const [schedule, setSchedule] = useState<AvailabilitySchedule>(DEFAULT_SCHEDULE);
  const [errors, setErrors] = useState<Partial<Record<DayKey, string>>>({});
  const [saved, setSaved] = useState<boolean>(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setLoadError(null);
      try {
        const remote = await fetchAvailability();
        if (cancelled) return;
        if (remote) {
          setSchedule({ ...DEFAULT_SCHEDULE, ...remote });
          setSaved(true);
        }
      } catch {
        if (!cancelled) setLoadError("Could not load your availability. Please retry.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  // ── Handlers ──

  function toggleDay(day: DayKey) {
    setSchedule((prev) => ({
      ...prev,
      [day]: { ...prev[day], enabled: !prev[day].enabled },
    }));
    setErrors((prev) => {
      const next = { ...prev };
      delete next[day];
      return next;
    });
    setDirty(true);
  }

  function updateTime(day: DayKey, field: "start" | "end", value: string) {
    setSchedule((prev) => ({
      ...prev,
      [day]: { ...prev[day], [field]: value },
    }));
    setErrors((prev) => {
      const next = { ...prev };
      delete next[day];
      return next;
    });
    setDirty(true);
  }

  function validate(): boolean {
    const newErrors: Partial<Record<DayKey, string>> = {};
    for (const { key } of DAYS) {
      const { enabled, start, end } = schedule[key];
      if (enabled && !isEndAfterStart(start, end)) {
        newErrors[key] = "End time must be after start time.";
      }
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  async function handleSave() {
    if (!validate()) return;
    setSaving(true);
    setSaveError(null);
    try {
      await saveAvailability(schedule);
      setSaved(true);
      setDirty(false);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2500);
    } catch {
      setSaveError("Could not save your availability. Please retry.");
    } finally {
      setSaving(false);
    }
  }

  // ── Summary ──

  const enabledDays = DAYS.filter(({ key }) => schedule[key].enabled);

  if (loading) {
    return (
      <div className="space-y-6">
        <p className="text-sm text-gray-500" role="status">
          Loading your availability…
        </p>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="space-y-6">
        <p className="text-sm text-red-500" role="alert">
          {loadError}
        </p>
      </div>
    );
  }

  // ── Render ──

  return (
    <div className="space-y-6">
      {/* Day Rows */}
      <div className="space-y-3">
        {DAYS.map(({ key, label }) => {
          const { enabled, start, end } = schedule[key];
          const error = errors[key];

          return (
            <div key={key} className="space-y-1">
              <div
                className={cn(
                  "flex flex-col sm:flex-row sm:items-center gap-3 p-4 rounded-xl border transition-colors duration-150",
                  enabled
                    ? "bg-[#F4F3FE] border-[#605DEC]/30"
                    : "bg-gray-50 border-gray-200"
                )}
              >
                {/* Toggle + Label */}
                <div className="flex items-center gap-3 sm:w-36 shrink-0">
                  <button
                    type="button"
                    onClick={() => toggleDay(key)}
                    aria-pressed={enabled}
                    aria-label={`Toggle ${label}`}
                    className={cn(
                      "relative w-10 h-5 rounded-full transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#605DEC] focus-visible:ring-offset-2 shrink-0",
                      enabled ? "bg-[#605DEC]" : "bg-gray-300"
                    )}
                  >
                    <span
                      className={cn(
                        "absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform duration-200",
                        enabled ? "translate-x-5" : "translate-x-0"
                      )}
                    />
                  </button>
                  <span
                    className={cn(
                      "text-sm font-medium w-24",
                      enabled ? "text-gray-900" : "text-gray-400"
                    )}
                  >
                    {label}
                  </span>
                </div>

                {/* Time Inputs */}
                {enabled ? (
                  <div className="flex items-center gap-2 flex-1">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <Clock className="w-4 h-4 text-[#605DEC] shrink-0" />
                      <input
                        type="time"
                        value={start}
                        onChange={(e) => updateTime(key, "start", e.target.value)}
                        aria-label={`${label} start time`}
                        className={cn(
                          "flex-1 min-w-0 text-sm rounded-lg border px-3 py-1.5 bg-white text-gray-900",
                          "focus:outline-none focus:ring-2 focus:ring-[#605DEC] focus:border-transparent",
                          "transition-shadow duration-150",
                          error ? "border-red-400" : "border-gray-200"
                        )}
                      />
                    </div>

                    <span className="text-gray-400 text-sm shrink-0">to</span>

                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <input
                        type="time"
                        value={end}
                        onChange={(e) => updateTime(key, "end", e.target.value)}
                        aria-label={`${label} end time`}
                        className={cn(
                          "flex-1 min-w-0 text-sm rounded-lg border px-3 py-1.5 bg-white text-gray-900",
                          "focus:outline-none focus:ring-2 focus:ring-[#605DEC] focus:border-transparent",
                          "transition-shadow duration-150",
                          error ? "border-red-400" : "border-gray-200"
                        )}
                      />
                    </div>
                  </div>
                ) : (
                  <span className="text-sm text-gray-400 italic">Unavailable</span>
                )}
              </div>

              {/* Inline validation error */}
              {error && (
                <p className="text-xs text-red-500 pl-4" role="alert">
                  {error}
                </p>
              )}
            </div>
          );
        })}
      </div>

      {/* Save Button */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className={cn(
            "inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium transition-all duration-200",
            "bg-[#605DEC] text-white hover:bg-[#4f4cdb] active:scale-95",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#605DEC] focus-visible:ring-offset-2"
          )}
        >
          {saveSuccess ? (
            <>
              <Check className="w-4 h-4" />
              Saved!
            </>
          ) : (
            <>
              <Save className="w-4 h-4" />
              Save Schedule
            </>
          )}
        </button>

        {dirty && !saving && (
          <p className="text-sm text-amber-600 font-medium">Unsaved changes</p>
        )}

        {saveError && (
          <p className="text-sm text-red-500 font-medium" role="alert">
            {saveError}
          </p>
        )}

        {saveSuccess && (
          <p className="text-sm text-green-600 font-medium animate-in fade-in duration-300">
            Your availability has been updated.
          </p>
        )}
      </div>

      {/* Summary */}
      {saved && (
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <h3 className="text-sm font-semibold text-gray-700 mb-3 uppercase tracking-wide">
            Your Availability Summary
          </h3>

          {enabledDays.length === 0 ? (
            <p className="text-sm text-gray-400 italic">
              No availability set — clients will see you as unavailable.
            </p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {enabledDays.map(({ key, short }) => (
                <div
                  key={key}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#F4F3FE] border border-[#605DEC]/20 text-sm"
                >
                  <span className="font-semibold text-[#605DEC]">{short}</span>
                  <span className="text-gray-500">
                    {formatTime(schedule[key].start)} – {formatTime(schedule[key].end)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
