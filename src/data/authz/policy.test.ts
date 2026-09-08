import { describe, it, expect } from "vitest";
import {
  AuthorizationError,
  assertCanAccessPatient,
  canAccessPatient,
  type Actor,
  type AuthzDeps,
} from "./policy";

const patient = (patientId: string): Actor => ({
  userId: `user-${patientId}`,
  role: "PATIENT",
  patientId,
  doctorId: null,
});

const doctor = (doctorId: string): Actor => ({
  userId: `user-${doctorId}`,
  role: "DOCTOR",
  patientId: null,
  doctorId,
});

/** Deps where the given "doctorId:patientId" pairs are linked. */
const depsWith = (...pairs: string[]): AuthzDeps => {
  const set = new Set(pairs);
  return { isDoctorLinked: async (d, p) => set.has(`${d}:${p}`) };
};

describe("canAccessPatient", () => {
  it("lets a patient access their own record", async () => {
    expect(await canAccessPatient(patient("p04"), "p04", depsWith())).toBe(true);
  });

  it("blocks a patient from accessing another patient", async () => {
    expect(await canAccessPatient(patient("p04"), "p05", depsWith())).toBe(false);
  });

  it("lets a doctor access a linked patient", async () => {
    expect(
      await canAccessPatient(doctor("doc-01"), "p04", depsWith("doc-01:p04")),
    ).toBe(true);
  });

  it("blocks a doctor from an unlinked patient", async () => {
    expect(
      await canAccessPatient(doctor("doc-01"), "p05", depsWith("doc-01:p04")),
    ).toBe(false);
  });

  it("blocks a doctor with no doctorId", async () => {
    const bad: Actor = { userId: "u", role: "DOCTOR", patientId: null, doctorId: null };
    expect(await canAccessPatient(bad, "p04", depsWith("x:p04"))).toBe(false);
  });

  it("blocks an empty patientId", async () => {
    expect(await canAccessPatient(patient("p04"), "", depsWith())).toBe(false);
  });
});

describe("assertCanAccessPatient", () => {
  it("resolves when allowed", async () => {
    await expect(
      assertCanAccessPatient(patient("p04"), "p04", depsWith()),
    ).resolves.toBeUndefined();
  });

  it("throws AuthorizationError when denied", async () => {
    await expect(
      assertCanAccessPatient(patient("p04"), "p05", depsWith()),
    ).rejects.toBeInstanceOf(AuthorizationError);
  });
});
