import { describe, it, expect } from "vitest";
import type { Detection, EvidenceRef } from "../types";
import {
  buildThreadDraft,
  dedupeDrafts,
  draftsFromDetections,
  reconcile,
  statusPatch,
  threadFingerprint,
} from "./index";

const ev = (id: string, type = "LabResult"): EvidenceRef => ({
  recordId: id,
  recordType: type,
  date: "2026-01-01T00:00:00.000Z",
});

const det = (
  type: Detection["type"],
  evidence: EvidenceRef[],
  over: Partial<Detection> = {},
): Detection => ({
  type,
  severity: "MEDIUM",
  title: `${type} title`,
  summary: `${type} summary`,
  recommendation: null,
  evidence,
  ...over,
});

describe("threadFingerprint", () => {
  it("is stable and order-independent over evidence ids", () => {
    const a = threadFingerprint("CHANGE_DETECTION", [ev("l1"), ev("l2")]);
    const b = threadFingerprint("CHANGE_DETECTION", [ev("l2"), ev("l1")]);
    expect(a).toBe(b);
  });

  it("differs by type and by source records", () => {
    expect(threadFingerprint("CHANGE_DETECTION", [ev("l1")])).not.toBe(
      threadFingerprint("MISSING_THREAD", [ev("l1")]),
    );
    expect(threadFingerprint("CHANGE_DETECTION", [ev("l1")])).not.toBe(
      threadFingerprint("CHANGE_DETECTION", [ev("l2")]),
    );
  });
});

describe("buildThreadDraft", () => {
  it("maps a detection and preserves evidence (integrity)", () => {
    const d = det("CHANGE_DETECTION", [ev("p04-chg-lab-001"), ev("p04-chg-lab-002")]);
    const draft = buildThreadDraft(d);
    expect(draft.type).toBe("CHANGE_DETECTION");
    expect(draft.severity).toBe("MEDIUM");
    expect(draft.evidence.map((e) => e.recordId)).toEqual([
      "p04-chg-lab-001",
      "p04-chg-lab-002",
    ]);
    expect(draft.fingerprint).toBe(threadFingerprint(d.type, d.evidence));
  });
});

describe("dedupeDrafts", () => {
  it("collapses drafts sharing a fingerprint", () => {
    const drafts = draftsFromDetections([
      det("REPEATED_PATTERN", [ev("s1"), ev("s2")]),
      det("REPEATED_PATTERN", [ev("s2"), ev("s1")]), // same fingerprint (order-independent)
    ]);
    expect(dedupeDrafts(drafts)).toHaveLength(1);
  });
});

describe("reconcile", () => {
  it("creates new threads and does not duplicate on repeated sync", () => {
    const drafts = draftsFromDetections([
      det("CHANGE_DETECTION", [ev("l1"), ev("l2")]),
      det("UNRESOLVED_FOLLOW_UP", [ev("fu1", "FollowUp")]),
    ]);

    // First sync: nothing exists yet → both created.
    const first = reconcile(new Set(), drafts);
    expect(first.creates).toHaveLength(2);
    expect(first.updates).toHaveLength(0);

    // Simulate persistence, then sync again with identical findings.
    const persisted = new Set(first.creates.map((d) => d.fingerprint));
    const second = reconcile(persisted, drafts);
    expect(second.creates).toHaveLength(0); // NO duplicates
    expect(second.updates).toHaveLength(2);
  });

  it("ignores findings with no evidence (no untraceable threads)", () => {
    const drafts = draftsFromDetections([det("MISSING_THREAD", [])]);
    expect(drafts).toHaveLength(0);
  });
});

describe("statusPatch (lifecycle transitions)", () => {
  const now = new Date("2026-09-07T00:00:00Z");
  it("acknowledge sets acknowledgedAt", () => {
    expect(statusPatch("ACKNOWLEDGED", now)).toEqual({
      status: "ACKNOWLEDGED",
      acknowledgedAt: now,
    });
  });
  it("resolve sets resolvedAt", () => {
    expect(statusPatch("RESOLVED", now)).toEqual({ status: "RESOLVED", resolvedAt: now });
  });
  it("reopen clears timestamps", () => {
    expect(statusPatch("OPEN", now)).toEqual({
      status: "OPEN",
      acknowledgedAt: null,
      resolvedAt: null,
    });
  });
});

describe("hero Patient 04 thread mapping", () => {
  it("maps the three hero findings to distinct, evidence-linked threads", () => {
    const detections: Detection[] = [
      det("CHANGE_DETECTION", [ev("p04-chg-lab-001"), ev("p04-chg-lab-002")]),
      det("UNRESOLVED_FOLLOW_UP", [ev("p04-hero-fu-001", "FollowUp")]),
      det("REPEATED_PATTERN", [
        ev("p04-rep-sym-001", "Symptom"),
        ev("p04-rep-sym-002", "Symptom"),
        ev("p04-rep-sym-003", "Symptom"),
      ]),
    ];
    const drafts = draftsFromDetections(detections);
    const fps = new Set(drafts.map((d) => d.fingerprint));
    expect(fps.size).toBe(3); // distinct threads
    const types = drafts.map((d) => d.type);
    expect(types).toContain("CHANGE_DETECTION");
    expect(types).toContain("UNRESOLVED_FOLLOW_UP");
    expect(types).toContain("REPEATED_PATTERN");
    // Every thread carries evidence.
    expect(drafts.every((d) => d.evidence.length > 0)).toBe(true);
  });
});
