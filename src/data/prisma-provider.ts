import { prisma } from "@/lib/prisma";
import type { VitalType } from "@prisma/client";
import { prismaAuthzDeps } from "./authz/prisma-deps";
import { assertCanAccessPatient, type Actor } from "./authz/policy";
import type {
  DoctorLink,
  HealthDataProvider,
  PatientRecordBundle,
  PatientSummary,
} from "./provider";

/** Prisma-backed provider over synthetic data. Authorizes every access. */
export class PrismaHealthDataProvider implements HealthDataProvider {
  private async guard(actor: Actor, patientId: string) {
    await assertCanAccessPatient(actor, patientId, prismaAuthzDeps);
  }

  async listAuthorizedPatients(actor: Actor): Promise<PatientSummary[]> {
    if (actor.role === "PATIENT") {
      if (!actor.patientId) return [];
      const p = await prisma.patientProfile.findUnique({
        where: { id: actor.patientId },
        include: { user: { select: { displayName: true } } },
      });
      return p
        ? [
            {
              id: p.id,
              mrn: p.mrn,
              displayName: p.user.displayName,
              gender: p.gender,
              dob: p.dob,
              city: p.city,
              isPrimaryLink: true,
            },
          ]
        : [];
    }

    // Doctor: patients linked via an ACTIVE relationship.
    if (!actor.doctorId) return [];
    const links = await prisma.patientDoctorRelationship.findMany({
      where: { doctorId: actor.doctorId, status: "ACTIVE" },
      include: { patient: { include: { user: true } } },
      orderBy: { since: "asc" },
    });
    return links.map((l) => ({
      id: l.patient.id,
      mrn: l.patient.mrn,
      displayName: l.patient.user.displayName,
      gender: l.patient.gender,
      dob: l.patient.dob,
      city: l.patient.city,
      isPrimaryLink: l.isPrimary,
    }));
  }

  async getPatientProfile(actor: Actor, patientId: string) {
    await this.guard(actor, patientId);
    return prisma.patientProfile.findUnique({ where: { id: patientId } });
  }

  async getRecordBundle(actor: Actor, patientId: string): Promise<PatientRecordBundle> {
    await this.guard(actor, patientId);
    const [
      profile,
      encounters,
      symptoms,
      vitals,
      labResults,
      medications,
      reports,
      referrals,
      appointments,
      followUps,
    ] = await Promise.all([
      prisma.patientProfile.findUniqueOrThrow({ where: { id: patientId } }),
      prisma.encounter.findMany({ where: { patientId }, orderBy: { date: "asc" } }),
      prisma.symptom.findMany({ where: { patientId }, orderBy: { onsetDate: "asc" } }),
      prisma.vital.findMany({ where: { patientId }, orderBy: { measuredAt: "asc" } }),
      prisma.labResult.findMany({ where: { patientId }, orderBy: { takenAt: "asc" } }),
      prisma.medication.findMany({ where: { patientId }, orderBy: { startDate: "asc" } }),
      prisma.medicalReport.findMany({ where: { patientId }, orderBy: { issuedAt: "asc" } }),
      prisma.referral.findMany({ where: { patientId }, orderBy: { createdAt: "asc" } }),
      prisma.appointment.findMany({ where: { patientId }, orderBy: { scheduledFor: "asc" } }),
      prisma.followUp.findMany({ where: { patientId } }),
    ]);
    return {
      profile,
      encounters,
      symptoms,
      vitals,
      labResults,
      medications,
      reports,
      referrals,
      appointments,
      followUps,
    };
  }

  async getEncounters(actor: Actor, patientId: string) {
    await this.guard(actor, patientId);
    return prisma.encounter.findMany({ where: { patientId }, orderBy: { date: "desc" } });
  }

  async getLabResults(actor: Actor, patientId: string) {
    await this.guard(actor, patientId);
    return prisma.labResult.findMany({ where: { patientId }, orderBy: { takenAt: "desc" } });
  }

  async getVitals(actor: Actor, patientId: string, type?: VitalType) {
    await this.guard(actor, patientId);
    return prisma.vital.findMany({
      where: { patientId, ...(type ? { type } : {}) },
      orderBy: { measuredAt: "desc" },
    });
  }

  async getMedications(actor: Actor, patientId: string) {
    await this.guard(actor, patientId);
    return prisma.medication.findMany({ where: { patientId }, orderBy: { startDate: "desc" } });
  }

  async getReports(actor: Actor, patientId: string) {
    await this.guard(actor, patientId);
    return prisma.medicalReport.findMany({ where: { patientId }, orderBy: { issuedAt: "desc" } });
  }

  async getReferrals(actor: Actor, patientId: string) {
    await this.guard(actor, patientId);
    return prisma.referral.findMany({ where: { patientId }, orderBy: { createdAt: "desc" } });
  }

  async getAppointments(actor: Actor, patientId: string) {
    await this.guard(actor, patientId);
    return prisma.appointment.findMany({
      where: { patientId },
      orderBy: { scheduledFor: "asc" },
    });
  }

  async getFollowUps(actor: Actor, patientId: string) {
    await this.guard(actor, patientId);
    return prisma.followUp.findMany({ where: { patientId } });
  }

  async getSymptoms(actor: Actor, patientId: string) {
    await this.guard(actor, patientId);
    return prisma.symptom.findMany({ where: { patientId }, orderBy: { onsetDate: "desc" } });
  }

  async getDoctorsForPatient(actor: Actor, patientId: string): Promise<DoctorLink[]> {
    await this.guard(actor, patientId);
    const links = await prisma.patientDoctorRelationship.findMany({
      where: { patientId, status: "ACTIVE" },
      include: {
        doctor: {
          include: {
            user: { select: { displayName: true } },
            specialties: { include: { specialty: true } },
          },
        },
      },
      orderBy: { isPrimary: "desc" },
    });
    return links.map((l) => ({
      doctor: l.doctor,
      specialties: l.doctor.specialties.map((s) => s.specialty),
      isPrimary: l.isPrimary,
      since: l.since,
    }));
  }

  async getAlerts(actor: Actor, patientId: string) {
    await this.guard(actor, patientId);
    return prisma.alert.findMany({ where: { patientId }, orderBy: { createdAt: "desc" } });
  }

  async getRecommendations(actor: Actor, patientId: string) {
    await this.guard(actor, patientId);
    return prisma.recommendation.findMany({
      where: { patientId },
      orderBy: { createdAt: "desc" },
    });
  }
}

/** Default provider instance used across the app. */
export const healthData: HealthDataProvider = new PrismaHealthDataProvider();
