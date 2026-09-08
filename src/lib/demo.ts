import { prisma } from "@/lib/prisma";

/**
 * Demo-only listings for the identity switcher. This is the "account chooser"
 * of demo mode (analogous to a login screen), so it intentionally lists all
 * demo accounts and is NOT patient-authorization-scoped. All ACTUAL data access
 * after switching still goes through the authorization policy.
 */

export interface DemoPatientOption {
  id: string;
  name: string;
  mrn: string;
}

export interface DemoDoctorOption {
  id: string;
  name: string;
  specialties: string[];
}

export async function listDemoPatients(): Promise<DemoPatientOption[]> {
  const patients = await prisma.patientProfile.findMany({
    include: { user: { select: { displayName: true } } },
    orderBy: { id: "asc" },
  });
  return patients.map((p) => ({ id: p.id, name: p.user.displayName, mrn: p.mrn }));
}

/** The demo's default doctor: hero Patient 04's primary physician, so the
 * doctor view opens onto a populated, interesting caseload. */
export async function getFeaturedDoctorId(): Promise<string> {
  const rel = await prisma.patientDoctorRelationship.findFirst({
    where: { patientId: "p04", isPrimary: true, status: "ACTIVE" },
    select: { doctorId: true },
  });
  return rel?.doctorId ?? "doc-01";
}

export interface SpecialtyRef {
  id: string;
  code: string;
  nameAr: string;
  nameEn: string;
}

/** Reference data (not patient-private): specialties keyed by id, for
 * resolving specialty names in appointment/care-team views. */
export async function listSpecialties(): Promise<Map<string, SpecialtyRef>> {
  const rows = await prisma.specialty.findMany();
  return new Map(rows.map((s) => [s.id, s]));
}

export async function listDemoDoctors(): Promise<DemoDoctorOption[]> {
  const doctors = await prisma.doctorProfile.findMany({
    include: {
      user: { select: { displayName: true } },
      specialties: { include: { specialty: true } },
    },
    orderBy: { id: "asc" },
  });
  return doctors.map((d) => ({
    id: d.id,
    name: d.user.displayName,
    specialties: d.specialties.map((s) => s.specialty.code),
  }));
}
