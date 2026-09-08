/**
 * Configurable freshness periods (in days) for time-sensitive data.
 *
 * The domain freshness engine reads these instead of hardcoding business
 * logic. When a measurement is older than its threshold, ECHO surfaces a
 * "your information may be outdated" nudge to improve analysis quality.
 */

export type FreshnessKey =
  | "WEIGHT"
  | "HEIGHT"
  | "BLOOD_PRESSURE"
  | "HEART_RATE"
  | "TEMPERATURE"
  | "PROFILE_BASICS";

export const freshnessDays: Record<FreshnessKey, number> = {
  WEIGHT: 180, // ~6 months (per product brief example)
  HEIGHT: 3650, // adults: effectively static
  BLOOD_PRESSURE: 120,
  HEART_RATE: 120,
  TEMPERATURE: 120,
  PROFILE_BASICS: 3650,
};

/** Convenience: milliseconds for a freshness key. */
export function freshnessMs(key: FreshnessKey): number {
  return freshnessDays[key] * 24 * 60 * 60 * 1000;
}
