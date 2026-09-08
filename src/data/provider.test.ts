import { describe, it, expect } from "vitest";
import { PrismaHealthDataProvider } from "./prisma-provider";
import { AuthorizationError, type Actor } from "./authz/policy";

/**
 * Patient isolation at the data layer: a patient accessing ANOTHER patient's
 * data is rejected before any query runs (the guard short-circuits on the
 * patient self-check, so no DB is needed here).
 */
const provider = new PrismaHealthDataProvider();
const patient = (id: string): Actor => ({
  userId: `user-${id}`,
  role: "PATIENT",
  patientId: id,
  doctorId: null,
});

describe("patient isolation (HealthDataProvider)", () => {
  const p04 = patient("p04");

  const methods = [
    "getPatientProfile",
    "getRecordBundle",
    "getMedications",
    "getReports",
    "getAppointments",
    "getDoctorsForPatient",
    "getVitals",
    "getLabResults",
  ] as const;

  it.each(methods)("blocks %s against another patient", async (method) => {
    await expect(
      (provider[method] as (a: Actor, id: string) => Promise<unknown>)(p04, "p05"),
    ).rejects.toBeInstanceOf(AuthorizationError);
  });

  it("blocks the record bundle even for a null patientId", async () => {
    const noPatient: Actor = { userId: "x", role: "PATIENT", patientId: null, doctorId: null };
    await expect(provider.getRecordBundle(noPatient, "p04")).rejects.toBeInstanceOf(
      AuthorizationError,
    );
  });
});
