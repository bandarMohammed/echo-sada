import { Prisma, PrismaClient } from "@prisma/client";
import { createRng } from "./rng";
import { SPECIALTIES } from "./catalogs";
import { demoDoctorCount, demoPatientCount, SEED } from "./config";
import { generateDoctors, indexDoctorsBySpecialty } from "./generators/doctors";
import { generatePatient } from "./generators/patient";
import { applyScenarios } from "./scenarios";
import type { PatientBundle } from "./types";

const prisma = new PrismaClient();

function specialtyId(code: string) {
  return `spec-${code}`;
}

async function clear() {
  // Delete in FK-safe order so re-seeding is idempotent.
  await prisma.groundTruth.deleteMany();
  await prisma.aIMessage.deleteMany();
  await prisma.echoThread.deleteMany();
  await prisma.aIInsight.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.followUp.deleteMany();
  await prisma.appointment.deleteMany();
  await prisma.referral.deleteMany();
  await prisma.medicalReport.deleteMany();
  await prisma.medication.deleteMany();
  await prisma.labResult.deleteMany();
  await prisma.vital.deleteMany();
  await prisma.symptom.deleteMany();
  await prisma.encounter.deleteMany();
  await prisma.alert.deleteMany();
  await prisma.recommendation.deleteMany();
  await prisma.patientDoctorRelationship.deleteMany();
  await prisma.doctorSpecialty.deleteMany();
  await prisma.patientProfile.deleteMany();
  await prisma.doctorProfile.deleteMany();
  await prisma.specialty.deleteMany();
  await prisma.user.deleteMany();
}

async function main() {
  const rng = createRng(SEED);
  console.log("🌱 Seeding ECHO synthetic data (seed=%d)…", SEED);

  await clear();

  // --- Specialties ---
  await prisma.specialty.createMany({
    data: SPECIALTIES.map((s) => ({
      id: specialtyId(s.code),
      code: s.code,
      nameAr: s.nameAr,
      nameEn: s.nameEn,
    })),
  });

  // --- Doctors ---
  const doctors = generateDoctors(rng, demoDoctorCount);
  const bySpecialty = indexDoctorsBySpecialty(doctors);

  await prisma.user.createMany({
    data: doctors.map((d) => ({
      id: `user-${d.id}`,
      role: "DOCTOR" as const,
      locale: "ar",
      displayName: d.nameEn,
    })),
  });
  await prisma.doctorProfile.createMany({
    data: doctors.map((d) => ({
      id: d.id,
      userId: `user-${d.id}`,
      licenseNo: d.licenseNo,
      title: d.titleEn,
      bio: `${d.titleEn} — ${d.nameEn}`,
    })),
  });
  await prisma.doctorSpecialty.createMany({
    data: doctors.flatMap((d) =>
      d.specialtyCodes.map((c) => ({ doctorId: d.id, specialtyId: specialtyId(c) })),
    ),
    skipDuplicates: true,
  });

  // --- Patients (generate + inject scenarios) ---
  const patients: PatientBundle[] = [];
  for (let i = 0; i < demoPatientCount; i++) {
    patients.push(generatePatient(rng, i, doctors, bySpecialty));
  }
  applyScenarios(patients, rng, bySpecialty);

  await prisma.user.createMany({
    data: patients.map((p) => ({
      id: `user-${p.ref}`,
      role: "PATIENT" as const,
      locale: "ar",
      displayName: p.displayNameAr,
    })),
  });
  await prisma.patientProfile.createMany({
    data: patients.map((p) => ({
      id: p.ref,
      userId: `user-${p.ref}`,
      mrn: p.mrn,
      dob: p.dob,
      gender: p.gender,
      heightCm: p.heightCm,
      bloodType: p.bloodType,
      city: p.cityAr,
    })),
  });

  // --- Relationships (M:N; first linked doctor is primary) ---
  await prisma.patientDoctorRelationship.createMany({
    data: patients.flatMap((p) =>
      p.doctorIds.map((doctorId, idx) => ({
        patientId: p.ref,
        doctorId,
        status: "ACTIVE" as const,
        isPrimary: idx === 0,
        since: p.historyStart,
      })),
    ),
    skipDuplicates: true,
  });

  // --- Clinical records (bulk, patientId injected) ---
  const withPid = <T extends object>(arr: T[], patientId: string) =>
    arr.map((r) => ({ ...r, patientId }));

  const encounters = patients.flatMap((p) => withPid(p.encounters, p.ref));
  const symptoms = patients.flatMap((p) => withPid(p.symptoms, p.ref));
  const vitals = patients.flatMap((p) => withPid(p.vitals, p.ref));
  const labResults = patients.flatMap((p) => withPid(p.labResults, p.ref));
  const medications = patients.flatMap((p) => withPid(p.medications, p.ref));
  const reports = patients.flatMap((p) => withPid(p.reports, p.ref));
  const referrals = patients.flatMap((p) => withPid(p.referrals, p.ref));
  const appointments = patients.flatMap((p) => withPid(p.appointments, p.ref));
  const followUps = patients.flatMap((p) => withPid(p.followUps, p.ref));
  const groundTruth = patients.flatMap((p) =>
    p.groundTruth.map((g) => ({
      id: g.id,
      patientId: p.ref,
      patternType: g.patternType,
      description: g.description,
      expectedRecordIds: g.expectedRecordIds as Prisma.InputJsonValue,
    })),
  );

  await prisma.encounter.createMany({ data: encounters as Prisma.EncounterCreateManyInput[] });
  await prisma.symptom.createMany({ data: symptoms as Prisma.SymptomCreateManyInput[] });
  await prisma.vital.createMany({ data: vitals as Prisma.VitalCreateManyInput[] });
  await prisma.labResult.createMany({ data: labResults as Prisma.LabResultCreateManyInput[] });
  await prisma.medication.createMany({ data: medications as Prisma.MedicationCreateManyInput[] });
  await prisma.medicalReport.createMany({ data: reports as Prisma.MedicalReportCreateManyInput[] });
  await prisma.referral.createMany({ data: referrals as Prisma.ReferralCreateManyInput[] });
  await prisma.appointment.createMany({ data: appointments as Prisma.AppointmentCreateManyInput[] });
  await prisma.followUp.createMany({ data: followUps as Prisma.FollowUpCreateManyInput[] });
  await prisma.groundTruth.createMany({ data: groundTruth });

  // --- Summary ---
  const gtByType = groundTruth.reduce<Record<string, number>>((acc, g) => {
    acc[g.patternType] = (acc[g.patternType] ?? 0) + 1;
    return acc;
  }, {});
  console.log("✅ Seed complete:");
  console.log("   specialties: %d", SPECIALTIES.length);
  console.log("   doctors:     %d", doctors.length);
  console.log("   patients:    %d", patients.length);
  console.log("   encounters:  %d", encounters.length);
  console.log("   labResults:  %d", labResults.length);
  console.log("   vitals:      %d", vitals.length);
  console.log("   followUps:   %d", followUps.length);
  console.log("   groundTruth: %o", gtByType);
  for (const p of patients) {
    console.log(
      "   • %s %s — conditions=[%s] threads=%d",
      p.ref,
      p.displayNameEn,
      p.conditions.join(", "),
      p.groundTruth.length,
    );
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
