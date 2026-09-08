import { describe, it, expect } from "vitest";
import { runAllDetectors } from "./index";
import type { DetectorInput } from "../types";

const NOW = new Date("2026-09-07T00:00:00Z");
const DAY = 24 * 60 * 60 * 1000;
const daysAgo = (n: number) => new Date(NOW.getTime() - n * DAY);

function baseInput(overrides: Partial<DetectorInput> = {}): DetectorInput {
  return {
    patientId: "pTest",
    now: NOW,
    profile: { dob: new Date("1970-01-01"), gender: "MALE" },
    encounters: [],
    symptoms: [],
    vitals: [],
    labs: [],
    medications: [],
    reports: [],
    referrals: [],
    appointments: [],
    followUps: [],
    ...overrides,
  };
}

describe("detectors", () => {
  it("finds nothing for an empty patient", () => {
    expect(runAllDetectors(baseInput())).toHaveLength(0);
  });

  it("detects an overdue open follow-up", () => {
    const d = runAllDetectors(
      baseInput({
        followUps: [
          {
            id: "fu1",
            sourceType: "ENCOUNTER",
            sourceId: "enc1",
            dueBy: daysAgo(120),
            status: "OPEN",
            note: "Repeat BP monitoring",
          },
        ],
      }),
    );
    const f = d.find((x) => x.type === "UNRESOLVED_FOLLOW_UP");
    expect(f).toBeDefined();
    expect(f!.evidence.map((e) => e.recordId)).toContain("fu1");
  });

  it("does not flag a resolved or future follow-up", () => {
    const d = runAllDetectors(
      baseInput({
        followUps: [
          { id: "a", sourceType: "ENCOUNTER", sourceId: "e", dueBy: daysAgo(1), status: "RESOLVED", note: "x" },
          { id: "b", sourceType: "ENCOUNTER", sourceId: "e", dueBy: new Date(NOW.getTime() + 30 * DAY), status: "OPEN", note: "y" },
        ],
      }),
    );
    expect(d.some((x) => x.type === "UNRESOLVED_FOLLOW_UP")).toBe(false);
  });

  it("detects a repeated symptom across time", () => {
    const mk = (id: string, days: number) => ({
      id,
      encounterId: null,
      code: "HEADACHE",
      label: "Headache",
      onsetDate: daysAgo(days),
    });
    const d = runAllDetectors(
      baseInput({ symptoms: [mk("s1", 400), mk("s2", 220), mk("s3", 60)] }),
    );
    const r = d.find((x) => x.type === "REPEATED_PATTERN");
    expect(r).toBeDefined();
    expect(r!.evidence).toHaveLength(3);
  });

  it("detects a meaningful lab worsening", () => {
    const lab = (id: string, v: number, days: number, flag: "NORMAL" | "HIGH") => ({
      id,
      analyte: "HbA1c",
      valueNum: v,
      unit: "%",
      refLow: 4,
      refHigh: 5.6,
      flag,
      takenAt: daysAgo(days),
    });
    const d = runAllDetectors(
      baseInput({ labs: [lab("l1", 6.4, 400, "HIGH"), lab("l2", 8.3, 40, "HIGH")] }),
    );
    const c = d.find((x) => x.type === "CHANGE_DETECTION");
    expect(c).toBeDefined();
    expect(c!.evidence.map((e) => e.recordId)).toEqual(["l1", "l2"]);
  });

  it("detects an abnormal lab never rechecked (missing thread)", () => {
    const d = runAllDetectors(
      baseInput({
        labs: [
          {
            id: "cr1",
            analyte: "Creatinine",
            valueNum: 1.9,
            unit: "mg/dL",
            refLow: 0.6,
            refHigh: 1.3,
            flag: "HIGH",
            takenAt: daysAgo(70),
          },
        ],
      }),
    );
    const m = d.find((x) => x.type === "MISSING_THREAD");
    expect(m).toBeDefined();
    expect(m!.evidence[0].recordId).toBe("cr1");
  });

  it("recommends preventive statin when LDL is high and none prescribed", () => {
    const d = runAllDetectors(
      baseInput({
        labs: [
          {
            id: "ldl1",
            analyte: "LDL Cholesterol",
            valueNum: 165,
            unit: "mg/dL",
            refLow: 0,
            refHigh: 100,
            flag: "HIGH",
            takenAt: daysAgo(40),
          },
        ],
      }),
    );
    expect(d.some((x) => x.type === "PREVENTIVE_RECOMMENDATION")).toBe(true);
  });

  it("suppresses preventive statin when a statin is active", () => {
    const d = runAllDetectors(
      baseInput({
        labs: [
          {
            id: "ldl1",
            analyte: "LDL Cholesterol",
            valueNum: 165,
            unit: "mg/dL",
            refLow: 0,
            refHigh: 100,
            flag: "HIGH",
            takenAt: daysAgo(40),
          },
        ],
        medications: [
          { id: "m1", name: "Atorvastatin", status: "ACTIVE", startDate: daysAgo(300), endDate: null },
        ],
      }),
    );
    expect(d.some((x) => x.type === "PREVENTIVE_RECOMMENDATION")).toBe(false);
  });
});
