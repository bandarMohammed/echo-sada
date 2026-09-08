import type { PatientRecordBundle } from "@/data/provider";
import { fromPrismaBundle, runAllDetectors } from "@/domain/detectors";
import { staleMeasurements } from "@/domain/freshness";
import { assembleTimeline } from "@/domain/journey/timeline";
import { ageFrom } from "@/domain/types";
import type { AIContext, AIPersona, EvidenceIndexEntry } from "../provider";

function buildEvidenceIndex(
  bundle: PatientRecordBundle,
): Record<string, EvidenceIndexEntry> {
  const idx: Record<string, EvidenceIndexEntry> = {};
  const put = (id: string, recordType: string, date: Date) => {
    idx[id] = { recordType, date: date.toISOString() };
  };
  bundle.encounters.forEach((e) => put(e.id, "Encounter", e.date));
  bundle.labResults.forEach((l) => put(l.id, "LabResult", l.takenAt));
  bundle.vitals.forEach((v) => put(v.id, "Vital", v.measuredAt));
  bundle.medications.forEach((m) => put(m.id, "Medication", m.startDate));
  bundle.reports.forEach((r) => put(r.id, "MedicalReport", r.issuedAt));
  bundle.referrals.forEach((r) => put(r.id, "Referral", r.createdAt));
  bundle.appointments.forEach((a) => put(a.id, "Appointment", a.scheduledFor));
  bundle.followUps.forEach((f) => put(f.id, "FollowUp", f.dueBy ?? new Date()));
  bundle.symptoms.forEach((s) => put(s.id, "Symptom", s.onsetDate));
  return idx;
}

function summarize(bundle: PatientRecordBundle, persona: AIPersona): string {
  const lines: string[] = [];
  const activeMeds = bundle.medications.filter((m) => m.status === "ACTIVE");
  lines.push(
    `Records: ${bundle.encounters.length} encounters, ${bundle.labResults.length} labs, ${bundle.medications.length} medications.`,
  );
  if (activeMeds.length) {
    lines.push(
      `Active medications: ${activeMeds.map((m) => `${m.name} ${m.dose}`).join("; ")}.`,
    );
  }

  // Most recent value per analyte (a handful).
  const latestByAnalyte = new Map<string, (typeof bundle.labResults)[number]>();
  for (const l of bundle.labResults) {
    const prev = latestByAnalyte.get(l.analyte);
    if (!prev || l.takenAt > prev.takenAt) latestByAnalyte.set(l.analyte, l);
  }
  const labLine = [...latestByAnalyte.values()]
    .slice(0, persona === "DOCTOR" ? 10 : 6)
    .map((l) => `${l.analyte} ${l.valueNum ?? l.valueText ?? "—"}${l.flag !== "NORMAL" ? ` (${l.flag})` : ""}`)
    .join("; ");
  if (labLine) lines.push(`Latest labs: ${labLine}.`);

  const openFu = bundle.followUps.filter((f) => f.status === "OPEN");
  if (openFu.length) lines.push(`Open follow-ups: ${openFu.length}.`);

  const upcoming = bundle.appointments.filter(
    (a) => a.status === "SCHEDULED" && a.scheduledFor > new Date(),
  );
  if (upcoming.length) {
    lines.push(
      `Upcoming appointments: ${upcoming
        .map((a) => a.scheduledFor.toISOString().slice(0, 10))
        .join(", ")}.`,
    );
  }
  return lines.join("\n");
}

/** Build the bounded AI context from ONE authorized record bundle. */
export function buildContext(
  bundle: PatientRecordBundle,
  persona: AIPersona,
  opts: { now?: Date; locale?: string } = {},
): AIContext {
  const now = opts.now ?? new Date();
  const input = fromPrismaBundle(bundle, now);
  const detections = runAllDetectors(input);
  const stale = staleMeasurements(input.vitals, now);
  const timeline = assembleTimeline(bundle, "desc").slice(
    0,
    persona === "DOCTOR" ? 25 : 12,
  );

  const timelineDigest = timeline
    .map(
      (e) =>
        `${e.date.toISOString().slice(0, 10)} [${e.kind}] ${e.title}${e.attention ? " *" : ""} (${e.recordId})`,
    )
    .join("\n");

  const freshness = stale.map((s) =>
    s.lastMeasuredAt
      ? `${s.vitalType} last measured ${s.ageDays} days ago (threshold ${s.thresholdDays}).`
      : `${s.vitalType} has never been recorded.`,
  );

  return {
    patientId: bundle.profile.id,
    persona,
    locale: opts.locale ?? "ar",
    profile: {
      ageYears: ageFrom(bundle.profile.dob, now),
      gender: bundle.profile.gender,
      city: bundle.profile.city,
    },
    summary: summarize(bundle, persona),
    detections,
    timelineDigest,
    freshness,
    evidenceIndex: buildEvidenceIndex(bundle),
  };
}

export const buildPatientContext = (
  b: PatientRecordBundle,
  opts?: { now?: Date; locale?: string },
) => buildContext(b, "PATIENT", opts);

export const buildDoctorContext = (
  b: PatientRecordBundle,
  opts?: { now?: Date; locale?: string },
) => buildContext(b, "DOCTOR", opts);
