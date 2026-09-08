/** Analyte-specific "meaningful change" rules for change detection. */
export interface ChangeRule {
  /** Minimum absolute change (in the analyte's unit) to be meaningful. */
  delta: number;
  /** Which direction represents worsening. */
  worseDirection: "up" | "down";
}

export const CHANGE_RULES: Record<string, ChangeRule> = {
  HbA1c: { delta: 1.0, worseDirection: "up" },
  "LDL Cholesterol": { delta: 30, worseDirection: "up" },
  "Fasting Glucose": { delta: 30, worseDirection: "up" },
  Triglycerides: { delta: 60, worseDirection: "up" },
  Creatinine: { delta: 0.3, worseDirection: "up" },
  TSH: { delta: 2.0, worseDirection: "up" },
  Hemoglobin: { delta: 2.0, worseDirection: "down" },
  "HDL Cholesterol": { delta: 12, worseDirection: "down" },
  eGFR: { delta: 15, worseDirection: "down" },
};

/** Weight change considered meaningful, as a fraction of baseline weight. */
export const WEIGHT_CHANGE_FRACTION = 0.07;

/** An abnormal lab is only a "missing thread" once it is at least this old
 * (recent abnormals may simply be awaiting a recheck). */
export const MISSING_THREAD_MIN_AGE_DAYS = 30;

/** Repeated-pattern thresholds. */
export const REPEAT_MIN_COUNT = 3;
export const REPEAT_MIN_SPAN_DAYS = 60;

/** LDL at/above this with no statin on record → preventive discussion. */
export const PREVENTIVE_LDL_THRESHOLD = 130;
export const STATINS = ["Atorvastatin", "Rosuvastatin", "Simvastatin", "Pravastatin"];

export const DAY_MS = 24 * 60 * 60 * 1000;
