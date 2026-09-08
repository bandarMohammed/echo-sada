import type { Detection, DetectorInput } from "../types";
import { iso } from "../types";
import { DAY_MS, MISSING_THREAD_MIN_AGE_DAYS } from "./thresholds";

/** Pattern 4 — an abnormal result with no downstream action (never rechecked). */
export function detectMissingThreads(input: DetectorInput): Detection[] {
  const out: Detection[] = [];
  const cutoff = input.now.getTime() - MISSING_THREAD_MIN_AGE_DAYS * DAY_MS;

  for (const lab of input.labs) {
    if (lab.flag === "NORMAL") continue;
    if (lab.takenAt.getTime() > cutoff) continue; // too recent — may be pending recheck

    // "Thread continues" if the same analyte was measured again afterwards.
    const rechecked = input.labs.some(
      (l) => l.analyte === lab.analyte && l.takenAt.getTime() > lab.takenAt.getTime(),
    );
    if (rechecked) continue;

    const severity: Detection["severity"] = lab.flag === "CRITICAL" ? "HIGH" : "MEDIUM";
    out.push({
      type: "MISSING_THREAD",
      severity,
      title: `Abnormal ${lab.analyte} not rechecked`,
      summary: `${lab.analyte} was ${lab.flag.toLowerCase()} (${lab.valueNum ?? "?"} ${lab.unit ?? ""}) and has no follow-up test or visit afterwards.`,
      recommendation: `Consider rechecking ${lab.analyte} or reviewing it with the physician.`,
      evidence: [{ recordId: lab.id, recordType: "LabResult", date: iso(lab.takenAt) }],
    });
  }
  return out;
}
