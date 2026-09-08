import type { Detection, DetectorInput } from "../types";
import { iso } from "../types";
import { PREVENTIVE_LDL_THRESHOLD, STATINS } from "./thresholds";

/** Pattern 5 — data indicates benefit from a preventive action.
 * Rule: elevated LDL with no lipid-lowering therapy on record → discuss a
 * preventive statin. Non-diagnostic; framed as "discuss with your physician". */
export function detectPreventive(input: DetectorInput): Detection[] {
  const out: Detection[] = [];

  const hasStatin = input.medications.some(
    (m) => m.status === "ACTIVE" && STATINS.includes(m.name),
  );
  if (hasStatin) return out;

  const ldl = input.labs
    .filter((l) => l.analyte === "LDL Cholesterol" && l.valueNum != null)
    .sort((a, b) => b.takenAt.getTime() - a.takenAt.getTime())[0];

  if (ldl && (ldl.valueNum as number) >= PREVENTIVE_LDL_THRESHOLD) {
    out.push({
      type: "PREVENTIVE_RECOMMENDATION",
      severity: "MEDIUM",
      title: "Discuss preventive cholesterol therapy",
      summary: `LDL cholesterol is ${ldl.valueNum} ${ldl.unit ?? "mg/dL"} with no lipid-lowering medication on record.`,
      recommendation:
        "Consider discussing preventive statin therapy and lifestyle measures with your physician.",
      evidence: [{ recordId: ldl.id, recordType: "LabResult", date: iso(ldl.takenAt) }],
    });
  }
  return out;
}
