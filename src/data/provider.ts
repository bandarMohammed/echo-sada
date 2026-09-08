/**
 * HealthDataProvider — the data abstraction the app and domain layers depend
 * on. Today it is backed by Prisma over synthetic data; a future provider can
 * front an authorized external health API without touching product code.
 *
 * EVERY patient-scoped method authorizes the actor before returning data, so
 * the AI layer and UI can never receive unauthorized records.
 */
import type {
  Alert,
  Appointment,
  DoctorProfile,
  Encounter,
  FollowUp,
  LabResult,
  MedicalReport,
  Medication,
  PatientProfile,
  Recommendation,
  Referral,
  Specialty,
  Symptom,
  Vital,
  VitalType,
} from "@prisma/client";
import type { Actor } from "./authz/policy";

export interface PatientSummary {
  id: string;
  mrn: string;
  displayName: string;
  gender: string;
  dob: Date;
  city: string | null;
  isPrimaryLink: boolean;
}

export interface DoctorLink {
  doctor: DoctorProfile & { user: { displayName: string } };
  specialties: Specialty[];
  isPrimary: boolean;
  since: Date;
}

export interface PatientRecordBundle {
  profile: PatientProfile;
  encounters: Encounter[];
  symptoms: Symptom[];
  vitals: Vital[];
  labResults: LabResult[];
  medications: Medication[];
  reports: MedicalReport[];
  referrals: Referral[];
  appointments: Appointment[];
  followUps: FollowUp[];
}

export interface HealthDataProvider {
  /** Patients the actor may access (self for a patient; linked patients for a doctor). */
  listAuthorizedPatients(actor: Actor): Promise<PatientSummary[]>;

  getPatientProfile(actor: Actor, patientId: string): Promise<PatientProfile | null>;

  /** One authorized batch of every record type — used by AI context + timeline. */
  getRecordBundle(actor: Actor, patientId: string): Promise<PatientRecordBundle>;

  getEncounters(actor: Actor, patientId: string): Promise<Encounter[]>;
  getLabResults(actor: Actor, patientId: string): Promise<LabResult[]>;
  getVitals(actor: Actor, patientId: string, type?: VitalType): Promise<Vital[]>;
  getMedications(actor: Actor, patientId: string): Promise<Medication[]>;
  getReports(actor: Actor, patientId: string): Promise<MedicalReport[]>;
  getReferrals(actor: Actor, patientId: string): Promise<Referral[]>;
  getAppointments(actor: Actor, patientId: string): Promise<Appointment[]>;
  getFollowUps(actor: Actor, patientId: string): Promise<FollowUp[]>;
  getSymptoms(actor: Actor, patientId: string): Promise<Symptom[]>;
  getDoctorsForPatient(actor: Actor, patientId: string): Promise<DoctorLink[]>;

  getAlerts(actor: Actor, patientId: string): Promise<Alert[]>;
  getRecommendations(actor: Actor, patientId: string): Promise<Recommendation[]>;
}
