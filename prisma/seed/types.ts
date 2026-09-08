/**
 * Plain-object generation bundle. Every record carries an explicit `id`
 * (e.g. "p04-enc-0003") which is passed straight to Prisma on insert, so
 * cross-references (encounterId, follow-up sourceId, ground-truth evidence)
 * resolve with no id-translation step and read nicely in the demo.
 *
 * String unions mirror the Prisma enums by value.
 */

export type Gender = "MALE" | "FEMALE" | "OTHER" | "UNKNOWN";
export type EncounterType =
  | "OUTPATIENT"
  | "EMERGENCY"
  | "FOLLOW_UP"
  | "TELEHEALTH"
  | "INPATIENT"
  | "LAB_ONLY";
export type SymptomSeverity = "MILD" | "MODERATE" | "SEVERE";
export type VitalType =
  | "WEIGHT"
  | "HEIGHT"
  | "BMI"
  | "BLOOD_PRESSURE_SYSTOLIC"
  | "BLOOD_PRESSURE_DIASTOLIC"
  | "HEART_RATE"
  | "TEMPERATURE"
  | "SPO2"
  | "BLOOD_GLUCOSE"
  | "RESP_RATE";
export type LabFlag = "LOW" | "NORMAL" | "HIGH" | "CRITICAL";
export type MedicationStatus = "ACTIVE" | "STOPPED" | "COMPLETED" | "ON_HOLD";
export type ReportType =
  | "RADIOLOGY"
  | "PATHOLOGY"
  | "DISCHARGE_SUMMARY"
  | "CONSULT_NOTE"
  | "PROCEDURE"
  | "PROGRESS_NOTE";
export type ReferralStatus = "PENDING" | "SCHEDULED" | "COMPLETED" | "CANCELLED";
export type AppointmentStatus = "SCHEDULED" | "COMPLETED" | "CANCELLED" | "NO_SHOW";
export type FollowUpSourceType =
  | "ENCOUNTER"
  | "LAB_RESULT"
  | "REPORT"
  | "REFERRAL"
  | "RECOMMENDATION";
export type FollowUpStatus = "OPEN" | "RESOLVED" | "OVERDUE";
export type InsightType =
  | "UNRESOLVED_FOLLOW_UP"
  | "REPEATED_PATTERN"
  | "CHANGE_DETECTION"
  | "MISSING_THREAD"
  | "PREVENTIVE_RECOMMENDATION";

export interface GenEncounter {
  id: string;
  doctorId: string | null;
  specialtyId: string | null;
  date: Date;
  type: EncounterType;
  reason: string;
  summary: string | null;
}

export interface GenSymptom {
  id: string;
  encounterId: string | null;
  code: string;
  label: string;
  severity: SymptomSeverity | null;
  onsetDate: Date;
  note: string | null;
}

export interface GenVital {
  id: string;
  type: VitalType;
  valueNum: number;
  unit: string;
  measuredAt: Date;
  source: string | null;
}

export interface GenLabResult {
  id: string;
  encounterId: string | null;
  panel: string;
  analyte: string;
  loinc: string | null;
  valueNum: number | null;
  valueText: string | null;
  unit: string | null;
  refLow: number | null;
  refHigh: number | null;
  flag: LabFlag;
  takenAt: Date;
}

export interface GenMedication {
  id: string;
  prescribedById: string | null;
  name: string;
  dose: string;
  frequency: string;
  route: string | null;
  status: MedicationStatus;
  startDate: Date;
  endDate: Date | null;
  reason: string | null;
}

export interface GenReport {
  id: string;
  encounterId: string | null;
  authorDoctorId: string | null;
  type: ReportType;
  title: string;
  body: string;
  issuedAt: Date;
}

export interface GenReferral {
  id: string;
  fromDoctorId: string | null;
  toSpecialtyId: string;
  reason: string;
  status: ReferralStatus;
  createdAt: Date;
}

export interface GenAppointment {
  id: string;
  doctorId: string | null;
  specialtyId: string | null;
  scheduledFor: Date;
  status: AppointmentStatus;
  reason: string | null;
}

export interface GenFollowUp {
  id: string;
  encounterId: string | null;
  sourceType: FollowUpSourceType;
  sourceId: string;
  dueBy: Date | null;
  status: FollowUpStatus;
  note: string;
  resolvedAt: Date | null;
  resolvedByRecordType: string | null;
  resolvedByRecordId: string | null;
}

export interface GenGroundTruth {
  id: string;
  patternType: InsightType;
  description: string;
  expectedRecordIds: string[];
}

export interface PatientBundle {
  /** stable short ref, e.g. "p04" */
  ref: string;
  index: number; // 0-based
  // identity
  mrn: string;
  displayNameEn: string;
  displayNameAr: string;
  gender: Gender;
  dob: Date;
  heightCm: number;
  bloodType: string;
  cityEn: string;
  cityAr: string;
  historyStart: Date;
  conditions: string[]; // ConditionKey[]
  // linked doctors (DoctorProfile ids), first is primary
  doctorIds: string[];
  // records
  encounters: GenEncounter[];
  symptoms: GenSymptom[];
  vitals: GenVital[];
  labResults: GenLabResult[];
  medications: GenMedication[];
  reports: GenReport[];
  referrals: GenReferral[];
  appointments: GenAppointment[];
  followUps: GenFollowUp[];
  groundTruth: GenGroundTruth[];
}
