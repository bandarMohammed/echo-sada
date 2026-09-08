import type { PatientRecordBundle } from "../../data/provider";
import type { Detection, DetectorInput } from "../types";
import { detectUnresolvedFollowUps } from "./unresolvedFollowUp";
import { detectRepeatedPatterns } from "./repeatedPattern";
import { detectChanges } from "./changeDetection";
import { detectMissingThreads } from "./missingThread";
import { detectPreventive } from "./preventive";

export * from "./thresholds";

const SEVERITY_RANK: Record<Detection["severity"], number> = {
  HIGH: 0,
  MEDIUM: 1,
  LOW: 2,
};

/** Run every detector and return findings, most severe first. */
export function runAllDetectors(input: DetectorInput): Detection[] {
  const detections = [
    ...detectUnresolvedFollowUps(input),
    ...detectMissingThreads(input),
    ...detectChanges(input),
    ...detectRepeatedPatterns(input),
    ...detectPreventive(input),
  ];
  return detections.sort((a, b) => SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity]);
}

/** Adapt a Prisma record bundle into the normalized detector input. */
export function fromPrismaBundle(
  bundle: PatientRecordBundle,
  now: Date = new Date(),
): DetectorInput {
  return {
    patientId: bundle.profile.id,
    now,
    profile: { dob: bundle.profile.dob, gender: bundle.profile.gender },
    encounters: bundle.encounters.map((e) => ({
      id: e.id,
      date: e.date,
      type: e.type,
      specialtyId: e.specialtyId,
      reason: e.reason,
    })),
    symptoms: bundle.symptoms.map((s) => ({
      id: s.id,
      encounterId: s.encounterId,
      code: s.code ?? s.label,
      label: s.label,
      onsetDate: s.onsetDate,
    })),
    vitals: bundle.vitals.map((v) => ({
      id: v.id,
      type: v.type,
      valueNum: v.valueNum,
      unit: v.unit,
      measuredAt: v.measuredAt,
    })),
    labs: bundle.labResults.map((l) => ({
      id: l.id,
      analyte: l.analyte,
      valueNum: l.valueNum,
      unit: l.unit,
      refLow: l.refLow,
      refHigh: l.refHigh,
      flag: l.flag,
      takenAt: l.takenAt,
    })),
    medications: bundle.medications.map((m) => ({
      id: m.id,
      name: m.name,
      status: m.status,
      startDate: m.startDate,
      endDate: m.endDate,
    })),
    reports: bundle.reports.map((r) => ({
      id: r.id,
      type: r.type,
      title: r.title,
      issuedAt: r.issuedAt,
    })),
    referrals: bundle.referrals.map((r) => ({
      id: r.id,
      toSpecialtyId: r.toSpecialtyId,
      reason: r.reason,
      status: r.status,
      createdAt: r.createdAt,
    })),
    appointments: bundle.appointments.map((a) => ({
      id: a.id,
      scheduledFor: a.scheduledFor,
      status: a.status,
    })),
    followUps: bundle.followUps.map((f) => ({
      id: f.id,
      sourceType: f.sourceType,
      sourceId: f.sourceId,
      dueBy: f.dueBy,
      status: f.status,
      note: f.note,
    })),
  };
}
