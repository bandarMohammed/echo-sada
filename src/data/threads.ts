import type { ClinicalThread, Prisma, PrismaClient } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { recordAudit } from "@/lib/audit";
import { fromPrismaBundle, runAllDetectors } from "@/domain/detectors";
import {
  draftsFromDetections,
  reconcile,
  statusPatch,
  type ThreadLifecycleStatus,
} from "@/domain/threads";
import { assertCanAccessPatient, type Actor, type AuthzDeps } from "./authz/policy";
import { prismaAuthzDeps } from "./authz/prisma-deps";
import { healthData } from "./prisma-provider";
import type { HealthDataProvider } from "./provider";

interface ThreadServiceDeps {
  db?: PrismaClient;
  authz?: AuthzDeps;
  audit?: typeof recordAudit;
  data?: HealthDataProvider;
}

/**
 * ClinicalThreadService — the single, deterministic source of truth for care
 * threads. Sync derives threads from the detection engine; the same rows serve
 * both patient and doctor. Every method authorizes through the existing policy.
 */
export class ClinicalThreadService {
  private db: PrismaClient;
  private authz: AuthzDeps;
  private audit: typeof recordAudit;
  private data: HealthDataProvider;

  constructor(deps: ThreadServiceDeps = {}) {
    this.db = deps.db ?? prisma;
    this.authz = deps.authz ?? prismaAuthzDeps;
    this.audit = deps.audit ?? recordAudit;
    this.data = deps.data ?? healthData;
  }

  /**
   * Reconcile threads for a patient against current detector findings, then
   * return the full thread list. Authorization is enforced by getRecordBundle.
   * Idempotent: re-running creates no duplicates and never reopens resolved
   * threads.
   */
  async syncPatientThreads(actor: Actor, patientId: string): Promise<ClinicalThread[]> {
    const bundle = await this.data.getRecordBundle(actor, patientId); // authorizes
    const now = new Date();
    const detections = runAllDetectors(fromPrismaBundle(bundle, now));
    const drafts = draftsFromDetections(detections);

    const existing = await this.db.clinicalThread.findMany({
      where: { patientId },
      select: { fingerprint: true },
    });
    const existingFps = new Set(existing.map((e) => e.fingerprint));
    const { creates, updates } = reconcile(existingFps, drafts);

    for (const d of creates) {
      await this.db.clinicalThread.create({
        data: {
          patientId,
          fingerprint: d.fingerprint,
          type: d.type,
          severity: d.severity,
          title: d.title,
          summary: d.summary,
          recommendation: d.recommendation,
          evidence: d.evidence as unknown as Prisma.InputJsonValue,
          status: "OPEN",
          firstDetectedAt: now,
          lastDetectedAt: now,
        },
      });
    }
    for (const d of updates) {
      // Refresh derived fields + lastDetectedAt; status/history untouched.
      await this.db.clinicalThread.update({
        where: { patientId_fingerprint: { patientId, fingerprint: d.fingerprint } },
        data: {
          lastDetectedAt: now,
          severity: d.severity,
          title: d.title,
          summary: d.summary,
          recommendation: d.recommendation,
          evidence: d.evidence as unknown as Prisma.InputJsonValue,
        },
      });
    }

    return this.listThreadsRaw(patientId);
  }

  /** List a patient's threads (authorized). Read-only; never mutates status. */
  async listThreads(actor: Actor, patientId: string): Promise<ClinicalThread[]> {
    await assertCanAccessPatient(actor, patientId, this.authz);
    return this.listThreadsRaw(patientId);
  }

  private listThreadsRaw(patientId: string): Promise<ClinicalThread[]> {
    return this.db.clinicalThread.findMany({
      where: { patientId },
      // OPEN before ACKNOWLEDGED/DISMISSED/RESOLVED (enum definition order),
      // then most recently detected first.
      orderBy: [{ status: "asc" }, { lastDetectedAt: "desc" }],
    });
  }

  /**
   * Explicit lifecycle change (acknowledge / resolve / reopen). Authorized, and
   * audited. Viewing a thread never calls this — resolution is a real action.
   */
  async setThreadStatus(
    actor: Actor,
    threadId: string,
    status: ThreadLifecycleStatus,
  ): Promise<ClinicalThread> {
    const thread = await this.db.clinicalThread.findUnique({ where: { id: threadId } });
    if (!thread) throw new Error("thread_not_found");
    await assertCanAccessPatient(actor, thread.patientId, this.authz);

    const updated = await this.db.clinicalThread.update({
      where: { id: threadId },
      data: statusPatch(status, new Date()),
    });
    await this.audit(actor, "THREAD_UPDATE", {
      subjectPatientId: thread.patientId,
      resourceType: "clinical_thread",
      resourceId: threadId,
      meta: { status },
    });
    return updated;
  }
}

export const clinicalThreads = new ClinicalThreadService();
