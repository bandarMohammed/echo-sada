import { prisma } from "@/lib/prisma";
import type { Prisma, AuditAction } from "@prisma/client";
import type { Actor } from "@/data/authz/policy";

/**
 * Best-effort audit logging for sensitive access and AI events.
 *
 * IMPORTANT: never put PHI (clinical values, names, report text) in `meta`.
 * Log identifiers and types only. Failures are swallowed so auditing can
 * never break a user request.
 */
export interface AuditOptions {
  subjectPatientId?: string | null;
  resourceType?: string | null;
  resourceId?: string | null;
  /** Non-sensitive metadata only (ids, counts, enum values). */
  meta?: Prisma.InputJsonValue;
}

export async function recordAudit(
  actor: Actor,
  action: AuditAction,
  opts: AuditOptions = {},
): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        actorUserId: actor.userId,
        action,
        subjectPatientId: opts.subjectPatientId ?? null,
        resourceType: opts.resourceType ?? null,
        resourceId: opts.resourceId ?? null,
        meta: opts.meta,
      },
    });
  } catch (err) {
    // Never throw from auditing; log the action name only (no PHI).
    console.error("audit_write_failed", { action, error: (err as Error).message });
  }
}
