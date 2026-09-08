import { describe, it, expect } from "vitest";
import {
  attentionRecommendations,
  openAttention,
  threadDeepLink,
  type AttentionThread,
} from "./index";

const th = (over: Partial<AttentionThread>): AttentionThread => ({
  id: "t",
  type: "CHANGE_DETECTION",
  severity: "MEDIUM",
  title: "t",
  summary: "s",
  recommendation: "do x",
  evidence: [{ recordId: "l1", recordType: "LabResult", date: "2026-01-01" }],
  status: "OPEN",
  lastDetectedISO: "2026-01-01T00:00:00Z",
  ...over,
});

describe("openAttention", () => {
  it("keeps only open/acknowledged threads and sorts by severity", () => {
    const out = openAttention([
      th({ id: "low", severity: "LOW" }),
      th({ id: "high", severity: "HIGH" }),
      th({ id: "resolved", status: "RESOLVED" }),
      th({ id: "med", severity: "MEDIUM" }),
      th({ id: "ack", severity: "HIGH", status: "ACKNOWLEDGED" }),
    ]);
    expect(out.map((t) => t.id)).not.toContain("resolved");
    expect(out[0].severity).toBe("HIGH");
    expect(out[out.length - 1].severity).toBe("LOW");
  });

  it("does not duplicate items", () => {
    const items = [th({ id: "a" }), th({ id: "b" })];
    const out = openAttention(items);
    expect(new Set(out.map((t) => t.id)).size).toBe(out.length);
  });
});

describe("attentionRecommendations", () => {
  it("returns only open threads that carry a recommendation", () => {
    const out = attentionRecommendations([
      th({ id: "withRec", recommendation: "review it" }),
      th({ id: "noRec", recommendation: null }),
      th({ id: "resolvedRec", recommendation: "x", status: "RESOLVED" }),
    ]);
    expect(out.map((t) => t.id)).toEqual(["withRec"]);
  });
});

describe("threadDeepLink", () => {
  it("maps each type to a relevant patient route", () => {
    expect(threadDeepLink("UNRESOLVED_FOLLOW_UP")).toBe("/patient/appointments");
    expect(threadDeepLink("REPEATED_PATTERN")).toBe("/patient/timeline");
    expect(threadDeepLink("CHANGE_DETECTION")).toBe("/patient/labs");
  });
});
