import type { Detection, DetectorInput, EvidenceRef } from "../types";
import { iso } from "../types";
import { DAY_MS } from "./thresholds";

const SOURCE_TYPE_TO_RECORD: Record<string, string> = {
  ENCOUNTER: "Encounter",
  LAB_RESULT: "LabResult",
  REPORT: "MedicalReport",
  REFERRAL: "Referral",
  RECOMMENDATION: "Recommendation",
};

/** Pattern 1 — a follow-up that is OPEN and past its due date, with no
 * resolving action recorded. */
export function detectUnresolvedFollowUps(input: DetectorInput): Detection[] {
  const out: Detection[] = [];
  for (const fu of input.followUps) {
    if (fu.status !== "OPEN") continue;
    if (!fu.dueBy || fu.dueBy >= input.now) continue;

    const overdueDays = Math.floor((input.now.getTime() - fu.dueBy.getTime()) / DAY_MS);
    const evidence: EvidenceRef[] = [
      { recordId: fu.id, recordType: "FollowUp", date: iso(fu.dueBy) },
    ];
    if (fu.sourceId && SOURCE_TYPE_TO_RECORD[fu.sourceType]) {
      evidence.push({
        recordId: fu.sourceId,
        recordType: SOURCE_TYPE_TO_RECORD[fu.sourceType],
        date: iso(fu.dueBy),
      });
    }

    out.push({
      type: "UNRESOLVED_FOLLOW_UP",
      severity: overdueDays > 90 ? "HIGH" : "MEDIUM",
      title: "Overdue follow-up",
      summary: `A recommended follow-up ("${fu.note}") was due ${overdueDays} days ago and has no recorded action.`,
      recommendation:
        "Review whether this follow-up still applies and schedule it if appropriate.",
      evidence,
    });
  }
  return out;
}
