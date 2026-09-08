import { describe, it, expect, vi } from "vitest";
import type { ClinicalThread, PrismaClient } from "@prisma/client";
import { ClinicalThreadService } from "./threads";
import { AuthorizationError, type Actor, type AuthzDeps } from "./authz/policy";

const thread = { id: "th1", patientId: "p04", status: "OPEN" } as unknown as ClinicalThread;

function fakeDb() {
  return {
    clinicalThread: {
      findUnique: vi.fn(async ({ where }: { where: { id: string } }) =>
        where.id === "th1" ? thread : null,
      ),
      update: vi.fn(async ({ data }: { data: Record<string, unknown> }) => ({
        ...thread,
        ...data,
      })),
      findMany: vi.fn(async () => [thread]),
    },
  } as unknown as PrismaClient;
}

const noopAudit = vi.fn(async () => {});
const patient = (id: string): Actor => ({
  userId: `user-${id}`,
  role: "PATIENT",
  patientId: id,
  doctorId: null,
});
const doctor = (id: string): Actor => ({
  userId: `user-${id}`,
  role: "DOCTOR",
  patientId: null,
  doctorId: id,
});
const linked: AuthzDeps = { isDoctorLinked: async () => true };
const unlinked: AuthzDeps = { isDoctorLinked: async () => false };

describe("ClinicalThreadService authorization", () => {
  it("blocks a patient from another patient's thread", async () => {
    const svc = new ClinicalThreadService({ db: fakeDb(), authz: unlinked, audit: noopAudit });
    await expect(
      svc.setThreadStatus(patient("p99"), "th1", "RESOLVED"),
    ).rejects.toBeInstanceOf(AuthorizationError);
  });

  it("blocks an unlinked doctor from a patient's thread", async () => {
    const svc = new ClinicalThreadService({ db: fakeDb(), authz: unlinked, audit: noopAudit });
    await expect(
      svc.setThreadStatus(doctor("doc-01"), "th1", "RESOLVED"),
    ).rejects.toBeInstanceOf(AuthorizationError);
  });

  it("blocks a patient from listing another patient's threads", async () => {
    const svc = new ClinicalThreadService({ db: fakeDb(), authz: unlinked, audit: noopAudit });
    await expect(svc.listThreads(patient("p99"), "p04")).rejects.toBeInstanceOf(
      AuthorizationError,
    );
  });

  it("allows the owning patient to resolve their thread and audits it", async () => {
    const db = fakeDb();
    const svc = new ClinicalThreadService({ db, authz: unlinked, audit: noopAudit });
    const updated = await svc.setThreadStatus(patient("p04"), "th1", "RESOLVED");
    expect(updated.status).toBe("RESOLVED");
    expect(noopAudit).toHaveBeenCalled();
  });

  it("allows a linked doctor to update a patient's thread", async () => {
    const svc = new ClinicalThreadService({ db: fakeDb(), authz: linked, audit: noopAudit });
    const updated = await svc.setThreadStatus(doctor("doc-33"), "th1", "ACKNOWLEDGED");
    expect(updated.status).toBe("ACKNOWLEDGED");
  });
});
