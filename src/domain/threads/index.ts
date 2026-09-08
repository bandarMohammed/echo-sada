import type { Detection, DetectionType, EvidenceRef, Severity } from "../types";

/**
 * Pure clinical-thread domain logic (no DB). Threads are derived
 * deterministically from detector findings; the LLM never creates them.
 */

export interface ThreadDraft {
  fingerprint: string;
  type: DetectionType;
  severity: Severity;
  title: string;
  summary: string;
  recommendation: string | null;
  evidence: EvidenceRef[];
}

export type ThreadLifecycleStatus = "OPEN" | "ACKNOWLEDGED" | "DISMISSED" | "RESOLVED";

/**
 * Stable identity: finding type + its source record ids (order-independent).
 * The same finding therefore maps to the same thread across every sync, so no
 * duplicates are created. Never uses random ids.
 */
export function threadFingerprint(type: DetectionType, evidence: EvidenceRef[]): string {
  const ids = evidence
    .map((e) => e.recordId)
    .filter(Boolean)
    .sort();
  return `${type}::${ids.join("|")}`;
}

/** Map a detector finding to a thread draft (evidence kept as-is: authoritative). */
export function buildThreadDraft(detection: Detection): ThreadDraft {
  return {
    fingerprint: threadFingerprint(detection.type, detection.evidence),
    type: detection.type,
    severity: detection.severity,
    title: detection.title,
    summary: detection.summary,
    recommendation: detection.recommendation,
    evidence: detection.evidence,
  };
}

/** Collapse drafts sharing a fingerprint (defensive against duplicate findings). */
export function dedupeDrafts(drafts: ThreadDraft[]): ThreadDraft[] {
  const byFp = new Map<string, ThreadDraft>();
  for (const d of drafts) if (!byFp.has(d.fingerprint)) byFp.set(d.fingerprint, d);
  return [...byFp.values()];
}

export interface ReconcileResult {
  creates: ThreadDraft[];
  updates: ThreadDraft[];
}

/**
 * Split drafts into creates (new fingerprints) and updates (already present).
 * Status/history are intentionally NOT part of updates — a resolved thread that
 * is re-detected stays resolved (viewing/re-sync never reopens it).
 */
export function reconcile(
  existingFingerprints: Set<string>,
  drafts: ThreadDraft[],
): ReconcileResult {
  const deduped = dedupeDrafts(drafts);
  return {
    creates: deduped.filter((d) => !existingFingerprints.has(d.fingerprint)),
    updates: deduped.filter((d) => existingFingerprints.has(d.fingerprint)),
  };
}

export interface StatusPatch {
  status: ThreadLifecycleStatus;
  acknowledgedAt?: Date | null;
  resolvedAt?: Date | null;
}

/** Timestamp bookkeeping for an explicit status change (a real state change,
 * never triggered by merely viewing a thread). */
export function statusPatch(status: ThreadLifecycleStatus, now: Date): StatusPatch {
  switch (status) {
    case "ACKNOWLEDGED":
      return { status, acknowledgedAt: now };
    case "RESOLVED":
      return { status, resolvedAt: now };
    case "DISMISSED":
      return { status, resolvedAt: now };
    case "OPEN":
      return { status, acknowledgedAt: null, resolvedAt: null };
  }
}

/** Convenience: build drafts from detections that carry evidence. */
export function draftsFromDetections(detections: Detection[]): ThreadDraft[] {
  return detections.filter((d) => d.evidence.length > 0).map(buildThreadDraft);
}
