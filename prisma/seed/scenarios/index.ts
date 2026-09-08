import { addDays, daysAgo, daysFromNow, type Rng } from "../rng";
import { ANALYTES, type SpecialtyCode } from "../catalogs";
import type { GenDoctor } from "../generators/doctors";
import type { LabFlag, PatientBundle } from "../types";

/** Scenario-scoped id generator. Each injector passes a distinct `tag` so ids
 * never collide with the base generator OR with other injectors applied to the
 * same patient (e.g. the hero, which composes several). */
function makeNid(bundle: PatientBundle, tag: string) {
  const counters: Record<string, number> = {};
  return (kind: string) => {
    counters[kind] = (counters[kind] ?? 0) + 1;
    return `${bundle.ref}-${tag}-${kind}-${String(counters[kind]).padStart(3, "0")}`;
  };
}

function flagFor(v: number, lo: number, hi: number): LabFlag {
  if (v > hi * 1.4) return "CRITICAL";
  if (v > hi) return "HIGH";
  if (v < lo) return "LOW";
  return "NORMAL";
}

function ensureDoctor(
  bundle: PatientBundle,
  code: SpecialtyCode,
  bySpecialty: Map<SpecialtyCode, GenDoctor[]>,
  rng: Rng,
): string | null {
  const pool = bySpecialty.get(code) ?? [];
  const linked = pool.find((d) => bundle.doctorIds.includes(d.id));
  if (linked) return linked.id;
  if (pool.length) {
    const d = rng.pick(pool);
    bundle.doctorIds.push(d.id);
    return d.id;
  }
  return bundle.doctorIds[0] ?? null;
}

/** Pattern 1 — a past recommendation/referral requiring follow-up, with an
 * OPEN, overdue follow-up and no resolving encounter afterward. */
export function injectUnresolvedFollowUp(
  bundle: PatientBundle,
  rng: Rng,
  bySpecialty: Map<SpecialtyCode, GenDoctor[]>,
) {
  const nid = makeNid(bundle, "ufu");
  const doctorId = ensureDoctor(bundle, "CARD", bySpecialty, rng);
  const encDate = daysAgo(rng.int(210, 400));
  const encId = nid("enc");
  bundle.encounters.push({
    id: encId,
    doctorId,
    specialtyId: "CARD",
    date: encDate,
    type: "OUTPATIENT",
    reason: "Cardiology consult — elevated blood pressure",
    summary:
      "Advised repeat ambulatory BP monitoring and follow-up in 3 months to reassess therapy.",
  });
  const fuId = nid("fu");
  bundle.followUps.push({
    id: fuId,
    encounterId: encId,
    sourceType: "ENCOUNTER",
    sourceId: encId,
    dueBy: daysAgo(rng.int(60, 150)),
    status: "OPEN",
    note: "Repeat ambulatory BP monitoring and reassess in 3 months.",
    resolvedAt: null,
    resolvedByRecordType: null,
    resolvedByRecordId: null,
  });
  bundle.groundTruth.push({
    id: nid("gt"),
    patternType: "UNRESOLVED_FOLLOW_UP",
    description:
      "Cardiology recommended a 3-month follow-up that is overdue with no subsequent visit.",
    expectedRecordIds: [encId, fuId],
  });
}

/** Pattern 2 — the same symptom recurring across several encounters over time. */
export function injectRepeatedPattern(
  bundle: PatientBundle,
  rng: Rng,
  symptom = { code: "HEADACHE", label: "Headache" },
) {
  const nid = makeNid(bundle, "rep");
  const doctorId = bundle.doctorIds[0] ?? null;
  const symptomIds: string[] = [];
  const offsets = [rng.int(420, 540), rng.int(240, 360), rng.int(60, 150)];
  for (const off of offsets) {
    const date = daysAgo(off);
    const encId = nid("enc");
    bundle.encounters.push({
      id: encId,
      doctorId,
      specialtyId: "FM",
      date,
      type: "OUTPATIENT",
      reason: symptom.label,
      summary: `Recurrent ${symptom.label.toLowerCase()}; symptomatic management advised.`,
    });
    const symId = nid("sym");
    bundle.symptoms.push({
      id: symId,
      encounterId: encId,
      code: symptom.code,
      label: symptom.label,
      severity: rng.pick(["MILD", "MODERATE", "SEVERE"] as const),
      onsetDate: addDays(date, -rng.int(1, 10)),
      note: null,
    });
    symptomIds.push(symId);
  }
  bundle.groundTruth.push({
    id: nid("gt"),
    patternType: "REPEATED_PATTERN",
    description: `${symptom.label} recurred across ${offsets.length} encounters over more than a year.`,
    expectedRecordIds: symptomIds,
  });
}

/** Pattern 3 — a meaningful worsening in a lab marker between two periods. */
export function injectChangeDetection(
  bundle: PatientBundle,
  rng: Rng,
  analyteKey: keyof typeof ANALYTES = "HBA1C",
  from = 6.3,
  to = 8.2,
) {
  const nid = makeNid(bundle, "chg");
  const a = ANALYTES[analyteKey];
  const earlyDate = daysAgo(rng.int(400, 520));
  const recentDate = daysAgo(rng.int(30, 90));
  const earlyId = nid("lab");
  const recentId = nid("lab");
  bundle.labResults.push({
    id: earlyId,
    encounterId: null,
    panel: a.panel,
    analyte: a.analyte,
    loinc: a.loinc,
    valueNum: from,
    valueText: null,
    unit: a.unit,
    refLow: a.refLow,
    refHigh: a.refHigh,
    flag: flagFor(from, a.refLow, a.refHigh),
    takenAt: earlyDate,
  });
  bundle.labResults.push({
    id: recentId,
    encounterId: null,
    panel: a.panel,
    analyte: a.analyte,
    loinc: a.loinc,
    valueNum: to,
    valueText: null,
    unit: a.unit,
    refLow: a.refLow,
    refHigh: a.refHigh,
    flag: flagFor(to, a.refLow, a.refHigh),
    takenAt: recentDate,
  });
  bundle.groundTruth.push({
    id: nid("gt"),
    patternType: "CHANGE_DETECTION",
    description: `${a.analyte} rose from ${from} to ${to} ${a.unit} between the two most recent periods.`,
    expectedRecordIds: [earlyId, recentId],
  });
}

/** Pattern 4 — a recent abnormal result with no downstream action (incomplete thread). */
export function injectMissingThread(
  bundle: PatientBundle,
  rng: Rng,
  analyteKey: keyof typeof ANALYTES = "CREATININE",
  value = 1.9,
) {
  const nid = makeNid(bundle, "mis");
  const a = ANALYTES[analyteKey];
  const date = daysAgo(rng.int(40, 110));
  const labId = nid("lab");
  bundle.labResults.push({
    id: labId,
    encounterId: null,
    panel: a.panel,
    analyte: a.analyte,
    loinc: a.loinc,
    valueNum: value,
    valueText: null,
    unit: a.unit,
    refLow: a.refLow,
    refHigh: a.refHigh,
    flag: flagFor(value, a.refLow, a.refHigh),
    takenAt: date,
  });
  bundle.groundTruth.push({
    id: nid("gt"),
    patternType: "MISSING_THREAD",
    description: `Abnormal ${a.analyte} (${value} ${a.unit}) has no follow-up encounter, repeat test, or referral.`,
    expectedRecordIds: [labId],
  });
}

/** Pattern 5 — data indicates benefit from a preventive action (e.g. an
 * at-risk patient with borderline-high LDL and no statin on the list). */
export function injectPreventiveRecommendation(bundle: PatientBundle, rng: Rng) {
  const nid = makeNid(bundle, "prev");
  // Remove any active statin so the gap is real.
  bundle.medications = bundle.medications.filter((m) => m.name !== "Atorvastatin");
  const a = ANALYTES.LDL;
  const ldl = rng.range(150, 180, 0);
  const date = daysAgo(rng.int(30, 120));
  const labId = nid("lab");
  bundle.labResults.push({
    id: labId,
    encounterId: null,
    panel: a.panel,
    analyte: a.analyte,
    loinc: a.loinc,
    valueNum: ldl,
    valueText: null,
    unit: a.unit,
    refLow: a.refLow,
    refHigh: a.refHigh,
    flag: flagFor(ldl, a.refLow, a.refHigh),
    takenAt: date,
  });
  bundle.groundTruth.push({
    id: nid("gt"),
    patternType: "PREVENTIVE_RECOMMENDATION",
    description:
      "Elevated LDL with no lipid-lowering therapy on record — candidate to discuss preventive statin with the physician.",
    expectedRecordIds: [labId],
  });
}

/**
 * Hero — Patient 04. Combines a meaningful HbA1c rise, an unresolved
 * cardiology follow-up, and recurrent chest discomfort across years, with
 * an upcoming cardiology appointment. Rich for both patient and doctor demos.
 */
export function buildHeroPatient(
  bundle: PatientBundle,
  rng: Rng,
  bySpecialty: Map<SpecialtyCode, GenDoctor[]>,
) {
  const nid = makeNid(bundle, "hero");
  if (!bundle.conditions.includes("T2DM")) bundle.conditions.push("T2DM");
  if (!bundle.conditions.includes("DYSLIPIDEMIA")) bundle.conditions.push("DYSLIPIDEMIA");
  const cardId = ensureDoctor(bundle, "CARD", bySpecialty, rng);
  ensureDoctor(bundle, "ENDO", bySpecialty, rng);

  // Meaningful HbA1c rise (change detection).
  injectChangeDetection(bundle, rng, "HBA1C", 6.4, 8.3);

  // Recurrent chest discomfort across years (repeated pattern).
  injectRepeatedPattern(bundle, rng, { code: "CHEST_PAIN", label: "Chest discomfort" });

  // Unresolved cardiology follow-up + supporting report.
  const encDate = daysAgo(rng.int(150, 240));
  const encId = nid("enc");
  bundle.encounters.push({
    id: encId,
    doctorId: cardId,
    specialtyId: "CARD",
    date: encDate,
    type: "OUTPATIENT",
    reason: "Cardiology consult — exertional chest discomfort",
    summary:
      "Atypical chest discomfort on exertion. Ordered stress ECG and advised cardiology follow-up in 6 weeks.",
  });
  const repId = nid("rep");
  bundle.reports.push({
    id: repId,
    encounterId: encId,
    authorDoctorId: cardId,
    type: "PROCEDURE",
    title: "Exercise stress ECG — borderline",
    body: "Borderline changes at peak exercise. Clinical correlation and follow-up recommended.",
    issuedAt: addDays(encDate, 2),
  });
  const fuId = nid("fu");
  bundle.followUps.push({
    id: fuId,
    encounterId: encId,
    sourceType: "REPORT",
    sourceId: repId,
    dueBy: daysAgo(rng.int(50, 100)),
    status: "OPEN",
    note: "Cardiology follow-up to review stress ECG and symptoms (6 weeks).",
    resolvedAt: null,
    resolvedByRecordType: null,
    resolvedByRecordId: null,
  });
  bundle.groundTruth.push({
    id: nid("gt"),
    patternType: "UNRESOLVED_FOLLOW_UP",
    description:
      "Borderline stress ECG with a recommended 6-week cardiology follow-up that is now overdue.",
    expectedRecordIds: [encId, repId, fuId],
  });

  // Upcoming cardiology appointment.
  bundle.appointments.push({
    id: nid("apt"),
    doctorId: cardId,
    specialtyId: "spec-CARD",
    scheduledFor: daysFromNow(rng.int(9, 30)),
    status: "SCHEDULED",
    reason: "Cardiology review — chest discomfort follow-up",
  });
}

/** Assign scenarios across the cohort: variety, some multi-thread patients,
 * and a couple of mostly-normal/closed journeys. */
export function applyScenarios(
  patients: PatientBundle[],
  rng: Rng,
  bySpecialty: Map<SpecialtyCode, GenDoctor[]>,
) {
  const at = (i: number) => patients[i];

  if (at(0)) injectUnresolvedFollowUp(at(0), rng, bySpecialty);
  if (at(1)) injectRepeatedPattern(at(1), rng);
  if (at(2)) injectChangeDetection(at(2), rng, "LDL", 118, 168);
  if (at(3)) buildHeroPatient(at(3), rng, bySpecialty); // Patient 04
  if (at(4)) injectMissingThread(at(4), rng);
  if (at(5)) injectPreventiveRecommendation(at(5), rng);
  if (at(6)) {
    injectUnresolvedFollowUp(at(6), rng, bySpecialty);
    injectRepeatedPattern(at(6), rng, { code: "JOINT_PAIN", label: "Joint pain" });
  }
  if (at(7)) {
    injectChangeDetection(at(7), rng, "HBA1C", 6.1, 7.9);
    injectMissingThread(at(7), rng, "HEMOGLOBIN", 10.4);
  }
  // patients[8] and patients[9] intentionally left mostly normal / closed.
}
