import type { Detection, DetectorInput, EvidenceRef } from "../types";
import { iso } from "../types";
import { DAY_MS, REPEAT_MIN_COUNT, REPEAT_MIN_SPAN_DAYS } from "./thresholds";

/** Pattern 2 — the same symptom recurring across time. */
export function detectRepeatedPatterns(input: DetectorInput): Detection[] {
  const byCode = new Map<string, typeof input.symptoms>();
  for (const s of input.symptoms) {
    const arr = byCode.get(s.code) ?? [];
    arr.push(s);
    byCode.set(s.code, arr);
  }

  const out: Detection[] = [];
  for (const [, group] of byCode) {
    if (group.length < REPEAT_MIN_COUNT) continue;
    const sorted = [...group].sort(
      (a, b) => a.onsetDate.getTime() - b.onsetDate.getTime(),
    );
    const spanDays =
      (sorted[sorted.length - 1].onsetDate.getTime() - sorted[0].onsetDate.getTime()) /
      DAY_MS;
    if (spanDays < REPEAT_MIN_SPAN_DAYS) continue;

    const label = sorted[0].label;
    const evidence: EvidenceRef[] = sorted.map((s) => ({
      recordId: s.id,
      recordType: "Symptom",
      date: iso(s.onsetDate),
    }));

    out.push({
      type: "REPEATED_PATTERN",
      severity: sorted.length >= 4 ? "HIGH" : "MEDIUM",
      title: `Recurring ${label.toLowerCase()}`,
      summary: `${label} was recorded ${sorted.length} times over ${Math.round(spanDays / 30)} months.`,
      recommendation: `Consider reviewing the pattern of recurring ${label.toLowerCase()} with the treating physician.`,
      evidence,
    });
  }
  return out;
}
