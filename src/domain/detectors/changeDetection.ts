import type { Detection, DetectorInput, DILab, EvidenceRef } from "../types";
import { iso } from "../types";
import { CHANGE_RULES, DAY_MS, WEIGHT_CHANGE_FRACTION } from "./thresholds";

/** Pattern 3 — a meaningful worsening in a lab marker or weight over time. */
export function detectChanges(input: DetectorInput): Detection[] {
  const out: Detection[] = [];

  // --- Lab analytes ---
  const byAnalyte = new Map<string, DILab[]>();
  for (const l of input.labs) {
    if (l.valueNum == null) continue;
    const arr = byAnalyte.get(l.analyte) ?? [];
    arr.push(l);
    byAnalyte.set(l.analyte, arr);
  }

  for (const [analyte, labs] of byAnalyte) {
    const rule = CHANGE_RULES[analyte];
    if (!rule || labs.length < 2) continue;
    const sorted = [...labs].sort((a, b) => a.takenAt.getTime() - b.takenAt.getTime());
    const first = sorted[0];
    const last = sorted[sorted.length - 1];
    const spanDays = (last.takenAt.getTime() - first.takenAt.getTime()) / DAY_MS;
    if (spanDays < 30) continue;

    const delta = (last.valueNum as number) - (first.valueNum as number);
    const worsened =
      rule.worseDirection === "up" ? delta >= rule.delta : -delta >= rule.delta;
    if (!worsened) continue;

    const magnitude = Math.abs(delta);
    const severity: Detection["severity"] =
      last.flag === "CRITICAL" || magnitude >= rule.delta * 1.5 ? "HIGH" : "MEDIUM";
    const dir = rule.worseDirection === "up" ? "increased" : "decreased";
    const unit = last.unit ?? "";

    const evidence: EvidenceRef[] = [
      { recordId: first.id, recordType: "LabResult", date: iso(first.takenAt) },
      { recordId: last.id, recordType: "LabResult", date: iso(last.takenAt) },
    ];

    out.push({
      type: "CHANGE_DETECTION",
      severity,
      title: `${analyte} ${dir}`,
      summary: `${analyte} ${dir} from ${first.valueNum} to ${last.valueNum} ${unit} over ${Math.round(spanDays / 30)} months.`,
      recommendation: `Discuss the change in ${analyte} with the treating physician.`,
      evidence,
    });
  }

  // --- Weight (from vitals) ---
  const weights = input.vitals
    .filter((v) => v.type === "WEIGHT")
    .sort((a, b) => a.measuredAt.getTime() - b.measuredAt.getTime());
  if (weights.length >= 2) {
    const first = weights[0];
    const last = weights[weights.length - 1];
    const change = last.valueNum - first.valueNum;
    if (Math.abs(change) >= first.valueNum * WEIGHT_CHANGE_FRACTION) {
      out.push({
        type: "CHANGE_DETECTION",
        severity: "MEDIUM",
        title: change > 0 ? "Weight increased" : "Weight decreased",
        summary: `Weight ${change > 0 ? "increased" : "decreased"} from ${first.valueNum} to ${last.valueNum} kg.`,
        recommendation: "Review weight trend and lifestyle factors with the physician.",
        evidence: [
          { recordId: first.id, recordType: "Vital", date: iso(first.measuredAt) },
          { recordId: last.id, recordType: "Vital", date: iso(last.measuredAt) },
        ],
      });
    }
  }

  return out;
}
