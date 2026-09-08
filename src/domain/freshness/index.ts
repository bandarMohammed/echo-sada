import { freshnessDays, type FreshnessKey } from "../../config/freshness";
import type { DIVital } from "../types";

const DAY_MS = 24 * 60 * 60 * 1000;

/** Maps a vital type to its freshness policy key. */
const VITAL_TO_FRESHNESS: Record<string, FreshnessKey> = {
  WEIGHT: "WEIGHT",
  HEIGHT: "HEIGHT",
  BLOOD_PRESSURE_SYSTOLIC: "BLOOD_PRESSURE",
  BLOOD_PRESSURE_DIASTOLIC: "BLOOD_PRESSURE",
  HEART_RATE: "HEART_RATE",
  TEMPERATURE: "TEMPERATURE",
};

export interface FreshnessStatus {
  key: FreshnessKey;
  vitalType: string;
  lastMeasuredAt: Date | null;
  ageDays: number | null;
  thresholdDays: number;
  stale: boolean;
}

/**
 * Evaluate freshness of time-sensitive vitals against configurable periods.
 * Drives nudges like "Your weight information may be outdated."
 */
export function evaluateFreshness(
  vitals: DIVital[],
  now: Date = new Date(),
): FreshnessStatus[] {
  const latestByType = new Map<string, Date>();
  for (const v of vitals) {
    const prev = latestByType.get(v.type);
    if (!prev || v.measuredAt > prev) latestByType.set(v.type, v.measuredAt);
  }

  const seen = new Set<FreshnessKey>();
  const out: FreshnessStatus[] = [];
  for (const [vitalType, key] of Object.entries(VITAL_TO_FRESHNESS)) {
    if (seen.has(key)) continue; // one status per policy key
    seen.add(key);
    const last = latestByType.get(vitalType) ?? null;
    const thresholdDays = freshnessDays[key];
    const ageDays = last ? Math.floor((now.getTime() - last.getTime()) / DAY_MS) : null;
    out.push({
      key,
      vitalType,
      lastMeasuredAt: last,
      ageDays,
      thresholdDays,
      stale: ageDays == null || ageDays > thresholdDays,
    });
  }
  return out;
}

/** Only the stale statuses (for surfacing nudges). */
export function staleMeasurements(
  vitals: DIVital[],
  now: Date = new Date(),
): FreshnessStatus[] {
  return evaluateFreshness(vitals, now).filter((s) => s.stale);
}
