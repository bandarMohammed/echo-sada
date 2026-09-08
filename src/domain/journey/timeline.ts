import type { PatientRecordBundle } from "../../data/provider";

export type TimelineKind =
  | "ENCOUNTER"
  | "LAB"
  | "MEDICATION"
  | "REPORT"
  | "REFERRAL"
  | "APPOINTMENT"
  | "FOLLOW_UP"
  | "SYMPTOM";

export interface TimelineEvent {
  id: string;
  kind: TimelineKind;
  date: Date;
  title: string;
  subtitle?: string;
  recordType: string;
  recordId: string;
  /** Optional emphasis for abnormal/attention items. */
  attention?: boolean;
}

/**
 * Assemble a unified, date-sorted health journey from a record bundle.
 * Used by the timeline screen and as structured context for the AI layer.
 */
export function assembleTimeline(
  bundle: PatientRecordBundle,
  order: "asc" | "desc" = "desc",
): TimelineEvent[] {
  const events: TimelineEvent[] = [];

  for (const e of bundle.encounters) {
    events.push({
      id: `enc:${e.id}`,
      kind: "ENCOUNTER",
      date: e.date,
      title: e.reason,
      subtitle: e.type,
      recordType: "Encounter",
      recordId: e.id,
    });
  }
  for (const l of bundle.labResults) {
    events.push({
      id: `lab:${l.id}`,
      kind: "LAB",
      date: l.takenAt,
      title: `${l.analyte}: ${l.valueNum ?? l.valueText ?? "—"} ${l.unit ?? ""}`.trim(),
      subtitle: l.panel,
      recordType: "LabResult",
      recordId: l.id,
      attention: l.flag !== "NORMAL",
    });
  }
  for (const m of bundle.medications) {
    events.push({
      id: `med:${m.id}`,
      kind: "MEDICATION",
      date: m.startDate,
      title: `${m.name} ${m.dose}`,
      subtitle: m.frequency,
      recordType: "Medication",
      recordId: m.id,
    });
  }
  for (const r of bundle.reports) {
    events.push({
      id: `rep:${r.id}`,
      kind: "REPORT",
      date: r.issuedAt,
      title: r.title,
      subtitle: r.type,
      recordType: "MedicalReport",
      recordId: r.id,
    });
  }
  for (const r of bundle.referrals) {
    events.push({
      id: `ref:${r.id}`,
      kind: "REFERRAL",
      date: r.createdAt,
      title: `Referral: ${r.reason}`,
      subtitle: r.status,
      recordType: "Referral",
      recordId: r.id,
    });
  }
  for (const a of bundle.appointments) {
    events.push({
      id: `apt:${a.id}`,
      kind: "APPOINTMENT",
      date: a.scheduledFor,
      title: a.reason ?? "Appointment",
      subtitle: a.status,
      recordType: "Appointment",
      recordId: a.id,
    });
  }
  for (const f of bundle.followUps) {
    events.push({
      id: `fu:${f.id}`,
      kind: "FOLLOW_UP",
      date: f.dueBy ?? new Date(),
      title: f.note,
      subtitle: f.status,
      recordType: "FollowUp",
      recordId: f.id,
      attention: f.status === "OPEN",
    });
  }
  for (const s of bundle.symptoms) {
    events.push({
      id: `sym:${s.id}`,
      kind: "SYMPTOM",
      date: s.onsetDate,
      title: s.label,
      subtitle: s.severity ?? undefined,
      recordType: "Symptom",
      recordId: s.id,
    });
  }

  events.sort((a, b) =>
    order === "desc"
      ? b.date.getTime() - a.date.getTime()
      : a.date.getTime() - b.date.getTime(),
  );
  return events;
}
