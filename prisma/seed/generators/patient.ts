import { addDays, daysAgo, daysFromNow, NOW, type Rng } from "../rng";
import {
  ANALYTES,
  BLOOD_TYPES,
  CITIES,
  CONDITIONS,
  FAMILY_NAMES,
  FEMALE_NAMES,
  MALE_NAMES,
  MEDICATIONS,
  SYMPTOMS,
  type ConditionKey,
} from "../catalogs";
import type {
  GenAppointment,
  GenEncounter,
  GenLabResult,
  GenMedication,
  GenReport,
  GenSymptom,
  GenVital,
  LabFlag,
  PatientBundle,
} from "../types";
import type { GenDoctor } from "./doctors";
import type { SpecialtyCode } from "../catalogs";

function labFlag(v: number, lo: number, hi: number): LabFlag {
  if (v > hi * 1.4) return "CRITICAL";
  if (v > hi) return "HIGH";
  if (v < lo) return "LOW";
  return "NORMAL";
}

/**
 * Build one coherent longitudinal patient journey (1–10 years). Chronic
 * conditions drive labs, medications, vitals, and symptoms consistently.
 * Baseline journeys are mostly "controlled / closed"; scenario injectors
 * (see scenarios/) add the intentionally designed patterns on top.
 */
export function generatePatient(
  rng: Rng,
  index: number,
  allDoctors: GenDoctor[],
  bySpecialty: Map<SpecialtyCode, GenDoctor[]>,
): PatientBundle {
  const ref = `p${String(index + 1).padStart(2, "0")}`;
  const counters: Record<string, number> = {};
  const nid = (kind: string) => {
    counters[kind] = (counters[kind] ?? 0) + 1;
    return `${ref}-${kind}-${String(counters[kind]).padStart(4, "0")}`;
  };

  // --- Demographics ---
  const gender = rng.chance(0.5) ? "MALE" : "FEMALE";
  const age = rng.int(24, 74);
  const dob = daysAgo(age * 365 + rng.int(0, 364));
  const first = rng.pick(gender === "MALE" ? MALE_NAMES : FEMALE_NAMES);
  const family = rng.pick(FAMILY_NAMES);
  const city = rng.pick(CITIES);
  const heightCm =
    gender === "MALE" ? rng.range(165, 186, 0) : rng.range(150, 171, 0);
  const bloodType = rng.pick(BLOOD_TYPES);

  const years = rng.int(1, 10);
  const historyStart = daysAgo(years * 365 + rng.int(0, 180));
  const totalDays = Math.max(365, (NOW.getTime() - historyStart.getTime()) / 86400000);

  // --- Conditions (age-weighted) ---
  const conditions: ConditionKey[] = [];
  const ageFactor = (age - 25) / 50; // 0..1
  const maybe = (k: ConditionKey, p: number) => {
    if (rng.chance(p)) conditions.push(k);
  };
  maybe("T2DM", 0.12 + 0.33 * ageFactor);
  maybe("HTN", 0.12 + 0.4 * ageFactor);
  maybe("DYSLIPIDEMIA", 0.15 + 0.3 * ageFactor);
  maybe("HYPOTHYROID", 0.08);
  maybe("GERD", 0.12);
  maybe("ASTHMA", 0.07);

  // --- Linked doctors (M:N) ---
  const doctorIds: string[] = [];
  const addDoc = (codes: SpecialtyCode[]) => {
    const pool = codes.flatMap((c) => bySpecialty.get(c) ?? []);
    if (pool.length) {
      const d = rng.pick(pool);
      if (!doctorIds.includes(d.id)) doctorIds.push(d.id);
    }
  };
  addDoc(["FM", "IM"]);
  for (const c of conditions) addDoc([CONDITIONS[c].specialty]);
  if (doctorIds.length === 0) doctorIds.push(rng.pick(allDoctors).id);
  const primaryDoctorId = doctorIds[0];

  // --- Marker baselines (evolve with treatment over time) ---
  let weight =
    (gender === "MALE" ? rng.range(70, 95, 1) : rng.range(58, 82, 1)) +
    (conditions.includes("T2DM") || conditions.includes("DYSLIPIDEMIA") ? 8 : 0);
  let a1c = conditions.includes("T2DM") ? rng.range(7.2, 8.6, 1) : rng.range(5.0, 5.6, 1);
  let ldl = conditions.includes("DYSLIPIDEMIA") ? rng.range(130, 175, 0) : rng.range(80, 112, 0);
  let sbp = conditions.includes("HTN") ? rng.range(140, 158, 0) : rng.range(112, 128, 0);

  const encounters: GenEncounter[] = [];
  const symptoms: GenSymptom[] = [];
  const vitals: GenVital[] = [];
  const labResults: GenLabResult[] = [];
  const medications: GenMedication[] = [];
  const reports: GenReport[] = [];
  const appointments: GenAppointment[] = [];

  // Height recorded once, early.
  vitals.push({
    id: nid("vit"),
    type: "HEIGHT",
    valueNum: heightCm,
    unit: "cm",
    measuredAt: addDays(historyStart, rng.int(0, 30)),
    source: "clinic",
  });

  // Chronic medications, started near diagnosis (history start).
  for (const c of conditions) {
    const medDef = MEDICATIONS.find((m) => m.condition === c);
    if (!medDef) continue;
    medications.push({
      id: nid("med"),
      prescribedById: primaryDoctorId,
      name: medDef.name,
      dose: medDef.dose,
      frequency: medDef.frequency,
      route: medDef.route,
      status: "ACTIVE",
      startDate: addDays(historyStart, rng.int(0, 120)),
      endDate: null,
      reason: medDef.reasonEn,
    });
  }

  // --- Encounters across the timeline ---
  const perYear = rng.int(2, 4);
  const numEnc = Math.min(30, Math.max(2, Math.round((totalDays / 365) * perYear)));

  const conditionSymptomCodes: Record<string, string[]> = {
    T2DM: ["FATIGUE", "POLYURIA", "BLURRED_VISION"],
    HTN: ["HEADACHE", "DIZZINESS"],
    DYSLIPIDEMIA: ["FATIGUE"],
    GERD: ["ABDO_PAIN"],
    ASTHMA: ["COUGH", "SOB"],
    HYPOTHYROID: ["FATIGUE"],
  };
  const symptomPool = conditions.flatMap((c) => conditionSymptomCodes[c] ?? []);

  for (let i = 0; i < numEnc; i++) {
    const progress = (i + 0.5) / numEnc;
    const jitter = rng.int(-10, 10);
    const date = addDays(historyStart, Math.round(totalDays * progress) + jitter);
    if (date >= NOW) continue;

    // Treatment gradually improves markers.
    a1c = Math.max(5.0, a1c - rng.range(0, 0.25, 2));
    ldl = Math.max(70, ldl - rng.range(0, 6, 0));
    sbp = Math.max(115, sbp - rng.range(0, 3, 0));
    weight = weight + rng.gaussian(0, 0.6);

    const useSpecialty = rng.chance(0.3) && conditions.length > 0;
    const specCode: SpecialtyCode = useSpecialty
      ? CONDITIONS[rng.pick(conditions)].specialty
      : rng.chance(0.5)
        ? "FM"
        : "IM";
    const specPool = bySpecialty.get(specCode) ?? [];
    const linked = specPool.filter((d) => doctorIds.includes(d.id));
    const doctorId = (linked[0] ?? specPool[0])?.id ?? primaryDoctorId;

    const hasSymptom = symptomPool.length > 0 && rng.chance(0.4);
    const symDef = hasSymptom
      ? SYMPTOMS.find((s) => s.code === rng.pick(symptomPool))
      : undefined;

    const encounter: GenEncounter = {
      id: nid("enc"),
      doctorId,
      specialtyId: specCode,
      date,
      type: i === 0 ? "OUTPATIENT" : rng.chance(0.15) ? "TELEHEALTH" : "FOLLOW_UP",
      reason: symDef ? symDef.labelEn : "Routine chronic-disease follow-up",
      summary: symDef
        ? `Patient reports ${symDef.labelEn.toLowerCase()}. Reviewed medications and adherence.`
        : "Stable on current therapy. Continue plan and monitor.",
    };
    encounters.push(encounter);

    if (symDef) {
      symptoms.push({
        id: nid("sym"),
        encounterId: encounter.id,
        code: symDef.code,
        label: symDef.labelEn,
        severity: rng.pick(["MILD", "MODERATE", "SEVERE"] as const),
        onsetDate: addDays(date, -rng.int(1, 14)),
        note: null,
      });
    }

    // Vitals at clinical encounters.
    vitals.push({
      id: nid("vit"),
      type: "WEIGHT",
      valueNum: Math.round(weight * 10) / 10,
      unit: "kg",
      measuredAt: date,
      source: rng.chance(0.2) ? "home" : "clinic",
    });
    vitals.push({
      id: nid("vit"),
      type: "BLOOD_PRESSURE_SYSTOLIC",
      valueNum: Math.round(sbp),
      unit: "mmHg",
      measuredAt: date,
      source: "clinic",
    });
    vitals.push({
      id: nid("vit"),
      type: "BLOOD_PRESSURE_DIASTOLIC",
      valueNum: Math.round(sbp - rng.range(38, 52, 0)),
      unit: "mmHg",
      measuredAt: date,
      source: "clinic",
    });
    vitals.push({
      id: nid("vit"),
      type: "HEART_RATE",
      valueNum: rng.int(62, 88),
      unit: "bpm",
      measuredAt: date,
      source: "clinic",
    });

    // Labs (condition-driven + occasional routine).
    const addLab = (key: keyof typeof ANALYTES, value: number) => {
      const a = ANALYTES[key];
      labResults.push({
        id: nid("lab"),
        encounterId: encounter.id,
        panel: a.panel,
        analyte: a.analyte,
        loinc: a.loinc,
        valueNum: Math.round(value * 100) / 100,
        valueText: null,
        unit: a.unit,
        refLow: a.refLow,
        refHigh: a.refHigh,
        flag: labFlag(value, a.refLow, a.refHigh),
        takenAt: date,
      });
    };
    if (conditions.includes("T2DM") && rng.chance(0.7)) {
      addLab("HBA1C", a1c);
      addLab("FASTING_GLUCOSE", 90 + (a1c - 5.4) * 25 + rng.gaussian(0, 8));
    }
    if (conditions.includes("DYSLIPIDEMIA") && rng.chance(0.6)) {
      addLab("LDL", ldl);
      addLab("HDL", rng.range(38, 60, 0));
      addLab("TRIGLYCERIDES", rng.range(110, 190, 0));
    }
    if (conditions.includes("HYPOTHYROID") && rng.chance(0.5)) {
      addLab("TSH", rng.range(1.0, 4.5, 2));
    }
    if (rng.chance(0.2)) addLab("VITAMIN_D", rng.range(15, 45, 0));
    if (rng.chance(0.15)) addLab("HEMOGLOBIN", rng.range(12.5, 16, 1));

    // Occasional report.
    if (rng.chance(0.2)) {
      reports.push({
        id: nid("rep"),
        encounterId: encounter.id,
        authorDoctorId: doctorId,
        type: "PROGRESS_NOTE",
        title: `Progress note — ${encounter.reason}`,
        body: encounter.summary ?? "Progress note.",
        issuedAt: date,
      });
    }
  }

  // --- Appointments (past completed + upcoming scheduled) ---
  if (rng.chance(0.85)) {
    appointments.push({
      id: nid("apt"),
      doctorId: primaryDoctorId,
      specialtyId: null,
      scheduledFor: daysFromNow(rng.int(7, 120)),
      status: "SCHEDULED",
      reason: "Routine follow-up",
    });
  }

  const displayNameEn = `${first.en} ${family.en}`;
  const displayNameAr = `${first.ar} ${family.ar}`;

  return {
    ref,
    index,
    mrn: `MRN-${100000 + index}`,
    displayNameEn,
    displayNameAr,
    gender,
    dob,
    heightCm,
    bloodType,
    cityEn: city.en,
    cityAr: city.ar,
    historyStart,
    conditions,
    doctorIds,
    encounters,
    symptoms,
    vitals,
    labResults,
    medications,
    reports,
    referrals: [],
    appointments,
    followUps: [],
    groundTruth: [],
  };
}
