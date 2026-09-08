import { describe, it, expect } from "vitest";
import type { PatientRecordBundle } from "@/data/provider";
import { AIService } from "./ai-service";
import { MockAIProvider } from "./adapters/mock";
import { insightSchema, type InsightPayload } from "./schemas/insight";
import type { AIContext, AIProvider, ChatTurn } from "./provider";

const NOW = new Date("2026-09-07T00:00:00Z");

/** Minimal authorized bundle with one overdue open follow-up. */
function bundleWithOverdueFollowUp(): PatientRecordBundle {
  return {
    profile: {
      id: "p04",
      dob: new Date("1969-01-01"),
      gender: "FEMALE",
      city: "الرياض",
    },
    encounters: [],
    symptoms: [],
    vitals: [],
    labResults: [],
    medications: [],
    reports: [],
    referrals: [],
    appointments: [],
    followUps: [
      {
        id: "fu1",
        sourceType: "ENCOUNTER",
        sourceId: "enc1",
        dueBy: new Date("2026-05-01"),
        status: "OPEN",
        note: "Repeat BP monitoring",
      },
    ],
  } as unknown as PatientRecordBundle;
}

async function collect(stream: AsyncIterable<string>): Promise<string> {
  let s = "";
  for await (const c of stream) s += c;
  return s;
}

describe("insight schema", () => {
  it("rejects an invalid severity", () => {
    const bad = { type: "CHANGE_DETECTION", severity: "urgent", title: "x", summary: "y", recommendation: null, evidence: [] };
    expect(insightSchema.safeParse(bad).success).toBe(false);
  });
});

describe("MockAIProvider via AIService", () => {
  it("turns detected patterns into evidence-linked insights", async () => {
    const svc = new AIService(new MockAIProvider());
    const insights = await svc.generateInsights(bundleWithOverdueFollowUp(), "PATIENT", { now: NOW });
    expect(insights.length).toBeGreaterThan(0);
    const fu = insights.find((i) => i.type === "UNRESOLVED_FOLLOW_UP");
    expect(fu).toBeDefined();
    expect(fu!.evidence.map((e) => e.recordId)).toContain("fu1");
  });

  it("streams a grounded, non-diagnostic chat reply", async () => {
    const svc = new AIService(new MockAIProvider());
    const { stream } = svc.streamChat(bundleWithOverdueFollowUp(), "PATIENT", [
      { role: "user", content: "ماذا يعني هذا؟" },
    ]);
    const text = await collect(stream);
    expect(text.length).toBeGreaterThan(10);
    expect(text).toContain("تشخيص"); // includes the "not a diagnosis" disclaimer
  });
});

describe("AIService server-side validation & evidence scrubbing", () => {
  it("drops insights whose evidence is fabricated or empty", async () => {
    const valid: InsightPayload = {
      type: "UNRESOLVED_FOLLOW_UP",
      severity: "MEDIUM",
      title: "Overdue follow-up",
      summary: "…",
      recommendation: null,
      evidence: [{ recordId: "fu1", recordType: "FollowUp", date: NOW.toISOString() }],
    };
    const fabricated: InsightPayload = {
      ...valid,
      title: "Ghost",
      evidence: [{ recordId: "ghost", recordType: "FollowUp", date: NOW.toISOString() }],
    };
    const empty: InsightPayload = { ...valid, title: "No evidence", evidence: [] };

    const fake: AIProvider = {
      name: "fake",
      async generateInsights(_c: AIContext) {
        return { insights: [valid, fabricated, empty] };
      },
      async generatePreVisit() {
        return {};
      },
      async *chat() {
        yield "";
      },
    };

    const svc = new AIService(fake);
    const insights = await svc.generateInsights(bundleWithOverdueFollowUp(), "DOCTOR", { now: NOW });
    expect(insights).toHaveLength(1);
    expect(insights[0].title).toBe("Overdue follow-up");
  });

  it("returns [] when the provider output fails schema validation", async () => {
    const fake: AIProvider = {
      name: "bad",
      async generateInsights() {
        return { insights: [{ type: "NONSENSE" }] };
      },
      async generatePreVisit() {
        return {};
      },
      async *chat() {
        yield "";
      },
    };
    const svc = new AIService(fake);
    const insights = await svc.generateInsights(bundleWithOverdueFollowUp(), "PATIENT", { now: NOW });
    expect(insights).toEqual([]);
  });
});

describe("Doctor pre-visit summary", () => {
  it("builds a grounded briefing from detections (mock)", async () => {
    const svc = new AIService(new MockAIProvider());
    const s = await svc.generatePreVisitSummary(bundleWithOverdueFollowUp(), {
      now: NOW,
      locale: "en",
    });
    expect(s).not.toBeNull();
    expect(s!.journeySummary.length).toBeGreaterThan(0);
    const thread = s!.unresolvedThreads.find((t) =>
      t.evidence.some((e) => e.recordId === "fu1"),
    );
    expect(thread).toBeDefined();
  });

  it("scrubs fabricated evidence and drops unsupported claims", async () => {
    const ev = (id: string) => [{ recordId: id, recordType: "X", date: NOW.toISOString() }];
    const fake: AIProvider = {
      name: "fakePV",
      async generateInsights() {
        return { insights: [] };
      },
      async generatePreVisit() {
        return {
          journeySummary: "ok",
          keyChanges: [
            { title: "real", detail: "d", evidence: ev("fu1") },
            { title: "ghost", detail: "d", evidence: ev("ghost") },
          ],
          unresolvedThreads: [],
          reviewToday: [{ item: "review meds", evidence: ev("ghost") }],
        };
      },
      async *chat() {
        yield "";
      },
    };
    const svc = new AIService(fake);
    const s = await svc.generatePreVisitSummary(bundleWithOverdueFollowUp(), { now: NOW });
    expect(s).not.toBeNull();
    expect(s!.keyChanges).toHaveLength(1);
    expect(s!.keyChanges[0].title).toBe("real");
    // Prioritization item kept, but its fabricated evidence is stripped.
    expect(s!.reviewToday).toHaveLength(1);
    expect(s!.reviewToday[0].evidence).toHaveLength(0);
  });

  it("falls back to the deterministic briefing on invalid provider output", async () => {
    const fake: AIProvider = {
      name: "badPV",
      async generateInsights() {
        return { insights: [] };
      },
      async generatePreVisit() {
        return { journeySummary: 123 }; // invalid → triggers fallback
      },
      async *chat() {
        yield "";
      },
    };
    const svc = new AIService(fake);
    const s = await svc.generatePreVisitSummary(bundleWithOverdueFollowUp(), { now: NOW });
    // Fallback is grounded in the detections, never null.
    expect(s).not.toBeNull();
    expect(s!.journeySummary.length).toBeGreaterThan(0);
    const thread = s!.unresolvedThreads.find((t) =>
      t.evidence.some((e) => e.recordId === "fu1"),
    );
    expect(thread).toBeDefined();
  });
});
