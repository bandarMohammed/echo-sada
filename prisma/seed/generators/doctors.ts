import type { Rng } from "../rng";
import {
  SPECIALTIES,
  MALE_NAMES,
  FEMALE_NAMES,
  FAMILY_NAMES,
  type SpecialtyCode,
} from "../catalogs";

export interface GenDoctor {
  id: string;
  nameEn: string;
  nameAr: string;
  gender: "MALE" | "FEMALE";
  licenseNo: string;
  titleEn: string;
  specialtyCodes: SpecialtyCode[];
}

const TITLES = ["Consultant", "Specialist", "Senior Registrar", "Registrar"];

/** Generate `count` doctors across specialties; specialties are shared. */
export function generateDoctors(rng: Rng, count: number): GenDoctor[] {
  const doctors: GenDoctor[] = [];
  for (let i = 0; i < count; i++) {
    const gender = rng.chance(0.6) ? "MALE" : "FEMALE";
    const first = rng.pick(gender === "MALE" ? MALE_NAMES : FEMALE_NAMES);
    const family = rng.pick(FAMILY_NAMES);
    const primary = rng.pick(SPECIALTIES).code;
    // ~30% of doctors carry a second specialty.
    const codes: SpecialtyCode[] = [primary];
    if (rng.chance(0.3)) {
      const second = rng.pick(SPECIALTIES).code;
      if (second !== primary) codes.push(second);
    }
    const id = `doc-${String(i + 1).padStart(2, "0")}`;
    doctors.push({
      id,
      nameEn: `Dr. ${first.en} ${family.en}`,
      nameAr: `د. ${first.ar} ${family.ar}`,
      gender,
      licenseNo: `SCFHS-${100000 + i}`,
      titleEn: rng.pick(TITLES),
      specialtyCodes: codes,
    });
  }
  return doctors;
}

/** Index doctors by specialty code for condition-aware patient linking. */
export function indexDoctorsBySpecialty(
  doctors: GenDoctor[],
): Map<SpecialtyCode, GenDoctor[]> {
  const map = new Map<SpecialtyCode, GenDoctor[]>();
  for (const d of doctors) {
    for (const c of d.specialtyCodes) {
      const arr = map.get(c) ?? [];
      arr.push(d);
      map.set(c, arr);
    }
  }
  return map;
}
