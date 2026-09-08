/**
 * Ground-truth evaluation harness (offline, no DB).
 *
 * Regenerates the deterministic synthetic cohort, runs the detectors over it,
 * and checks whether each intentionally designed pattern is caught (recall)
 * plus how many extra detections fire (precision signal). Run:
 *   npm run eval:groundtruth
 */
import { createRng, NOW } from "./rng";
import { demoDoctorCount, demoPatientCount, SEED } from "./config";
import { generateDoctors, indexDoctorsBySpecialty } from "./generators/doctors";
import { generatePatient } from "./generators/patient";
import { applyScenarios } from "./scenarios";
import type { PatientBundle } from "./types";
import { runAllDetectors } from "../../src/domain/detectors";
import type { DetectorInput } from "../../src/domain/types";

function toInput(p: PatientBundle): DetectorInput {
  return {
    patientId: p.ref,
    now: NOW,
    profile: { dob: p.dob, gender: p.gender },
    encounters: p.encounters.map((e) => ({
      id: e.id,
      date: e.date,
      type: e.type,
      specialtyId: e.specialtyId,
      reason: e.reason,
    })),
    symptoms: p.symptoms.map((s) => ({
      id: s.id,
      encounterId: s.encounterId,
      code: s.code,
      label: s.label,
      onsetDate: s.onsetDate,
    })),
    vitals: p.vitals.map((v) => ({
      id: v.id,
      type: v.type,
      valueNum: v.valueNum,
      unit: v.unit,
      measuredAt: v.measuredAt,
    })),
    labs: p.labResults.map((l) => ({
      id: l.id,
      analyte: l.analyte,
      valueNum: l.valueNum,
      unit: l.unit,
      refLow: l.refLow,
      refHigh: l.refHigh,
      flag: l.flag,
      takenAt: l.takenAt,
    })),
    medications: p.medications.map((m) => ({
      id: m.id,
      name: m.name,
      status: m.status,
      startDate: m.startDate,
      endDate: m.endDate,
    })),
    reports: p.reports.map((r) => ({ id: r.id, type: r.type, title: r.title, issuedAt: r.issuedAt })),
    referrals: p.referrals.map((r) => ({
      id: r.id,
      toSpecialtyId: r.toSpecialtyId,
      reason: r.reason,
      status: r.status,
      createdAt: r.createdAt,
    })),
    appointments: p.appointments.map((a) => ({
      id: a.id,
      scheduledFor: a.scheduledFor,
      status: a.status,
    })),
    followUps: p.followUps.map((f) => ({
      id: f.id,
      sourceType: f.sourceType,
      sourceId: f.sourceId,
      dueBy: f.dueBy,
      status: f.status,
      note: f.note,
    })),
  };
}

function main() {
  const rng = createRng(SEED);
  const doctors = generateDoctors(rng, demoDoctorCount);
  const bySpec = indexDoctorsBySpecialty(doctors);
  const patients: PatientBundle[] = [];
  for (let i = 0; i < demoPatientCount; i++) {
    patients.push(generatePatient(rng, i, doctors, bySpec));
  }
  applyScenarios(patients, rng, bySpec);

  const perType: Record<string, { expected: number; hit: number }> = {};
  let totalExpected = 0;
  let totalHit = 0;
  let totalDetections = 0;
  let totalMatchedDetections = 0;

  console.log("🔎 Ground-truth evaluation (seed=%d)\n", SEED);

  for (const p of patients) {
    const detections = runAllDetectors(toInput(p));
    totalDetections += detections.length;
    const matchedDetectionIdx = new Set<number>();

    const lines: string[] = [];
    for (const gt of p.groundTruth) {
      totalExpected++;
      perType[gt.patternType] ??= { expected: 0, hit: 0 };
      perType[gt.patternType].expected++;

      const expected = new Set(gt.expectedRecordIds);
      let hit = false;
      detections.forEach((d, idx) => {
        if (d.type !== gt.patternType) return;
        if (d.evidence.some((e) => expected.has(e.recordId))) {
          hit = true;
          matchedDetectionIdx.add(idx);
        }
      });
      if (hit) {
        totalHit++;
        perType[gt.patternType].hit++;
      }
      lines.push(`      ${hit ? "✅" : "❌"} ${gt.patternType}`);
    }
    totalMatchedDetections += matchedDetectionIdx.size;

    console.log(
      "  %s %s — detections=%d expected=%d",
      p.ref,
      p.displayNameEn.padEnd(20),
      detections.length,
      p.groundTruth.length,
    );
    for (const l of lines) console.log(l);
  }

  console.log("\n── Recall by pattern ──");
  for (const [type, s] of Object.entries(perType)) {
    const pct = s.expected ? Math.round((100 * s.hit) / s.expected) : 0;
    console.log("  %s  %d/%d  (%d%%)", type.padEnd(26), s.hit, s.expected, pct);
  }

  const recall = totalExpected ? Math.round((100 * totalHit) / totalExpected) : 0;
  const extras = totalDetections - totalMatchedDetections;
  console.log("\n── Totals ──");
  console.log("  recall:            %d/%d (%d%%)", totalHit, totalExpected, recall);
  console.log("  total detections:  %d", totalDetections);
  console.log("  matched to truth:  %d", totalMatchedDetections);
  console.log("  extra detections:  %d (unlabelled findings, not necessarily wrong)", extras);

  if (recall < 100) {
    console.log("\n⚠️  Not all designed patterns were detected — tune detectors or scenarios.");
    process.exit(1);
  }
  console.log("\n✅ All designed ground-truth patterns detected.");
}

main();
