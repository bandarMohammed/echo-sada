/**
 * Domain-level types. Detectors operate on a normalized `DetectorInput` that
 * BOTH the Prisma provider (runtime) and the synthetic generator (offline eval)
 * can produce, so detection logic is testable without a database.
 */

export type LabFlag = "LOW" | "NORMAL" | "HIGH" | "CRITICAL";
export type Severity = "LOW" | "MEDIUM" | "HIGH";

export type DetectionType =
  | "UNRESOLVED_FOLLOW_UP"
  | "REPEATED_PATTERN"
  | "CHANGE_DETECTION"
  | "MISSING_THREAD"
  | "PREVENTIVE_RECOMMENDATION";

export interface DIEncounter {
  id: string;
  date: Date;
  type: string;
  specialtyId: string | null;
  reason: string;
}
export interface DISymptom {
  id: string;
  encounterId: string | null;
  code: string;
  label: string;
  onsetDate: Date;
}
export interface DIVital {
  id: string;
  type: string;
  valueNum: number;
  unit: string;
  measuredAt: Date;
}
export interface DILab {
  id: string;
  analyte: string;
  valueNum: number | null;
  unit: string | null;
  refLow: number | null;
  refHigh: number | null;
  flag: LabFlag;
  takenAt: Date;
}
export interface DIMedication {
  id: string;
  name: string;
  status: string;
  startDate: Date;
  endDate: Date | null;
}
export interface DIReport {
  id: string;
  type: string;
  title: string;
  issuedAt: Date;
}
export interface DIReferral {
  id: string;
  toSpecialtyId: string;
  reason: string;
  status: string;
  createdAt: Date;
}
export interface DIAppointment {
  id: string;
  scheduledFor: Date;
  status: string;
}
export interface DIFollowUp {
  id: string;
  sourceType: string;
  sourceId: string;
  dueBy: Date | null;
  status: string;
  note: string;
}

export interface DetectorInput {
  patientId: string;
  now: Date;
  profile: { dob: Date; gender: string };
  encounters: DIEncounter[];
  symptoms: DISymptom[];
  vitals: DIVital[];
  labs: DILab[];
  medications: DIMedication[];
  reports: DIReport[];
  referrals: DIReferral[];
  appointments: DIAppointment[];
  followUps: DIFollowUp[];
}

/** One evidence pointer back to a concrete record (traceability). */
export interface EvidenceRef {
  recordId: string;
  recordType: string;
  date: string; // ISO-8601
}

/** A deterministic detection. AI later *explains* these; detectors *find* them. */
export interface Detection {
  type: DetectionType;
  severity: Severity;
  title: string;
  summary: string;
  recommendation: string | null;
  evidence: EvidenceRef[];
}

export function ageFrom(dob: Date, now: Date): number {
  let age = now.getFullYear() - dob.getFullYear();
  const m = now.getMonth() - dob.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < dob.getDate())) age--;
  return age;
}

export function iso(d: Date): string {
  return d.toISOString();
}
