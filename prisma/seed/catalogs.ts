/**
 * Clinically plausible catalogs (bilingual, Saudi context) used by the
 * synthetic data generator. Values are realistic — reference ranges, units,
 * and condition-driven relationships — never random garbage.
 */

export const SPECIALTIES = [
  { code: "IM", nameEn: "Internal Medicine", nameAr: "الباطنة" },
  { code: "CARD", nameEn: "Cardiology", nameAr: "القلب" },
  { code: "ENDO", nameEn: "Endocrinology", nameAr: "الغدد الصماء" },
  { code: "FM", nameEn: "Family Medicine", nameAr: "طب الأسرة" },
  { code: "ORTHO", nameEn: "Orthopedics", nameAr: "العظام" },
  { code: "DERM", nameEn: "Dermatology", nameAr: "الجلدية" },
  { code: "OPHTH", nameEn: "Ophthalmology", nameAr: "العيون" },
  { code: "ENT", nameEn: "ENT", nameAr: "الأنف والأذن والحنجرة" },
  { code: "NEURO", nameEn: "Neurology", nameAr: "المخ والأعصاب" },
  { code: "NEPH", nameEn: "Nephrology", nameAr: "الكلى" },
  { code: "PULM", nameEn: "Pulmonology", nameAr: "الصدرية" },
  { code: "GI", nameEn: "Gastroenterology", nameAr: "الجهاز الهضمي" },
  { code: "RHEUM", nameEn: "Rheumatology", nameAr: "الروماتيزم" },
  { code: "PSYCH", nameEn: "Psychiatry", nameAr: "الطب النفسي" },
] as const;

export type SpecialtyCode = (typeof SPECIALTIES)[number]["code"];

export interface LocalizedName {
  en: string;
  ar: string;
}

export const CITIES: LocalizedName[] = [
  { en: "Riyadh", ar: "الرياض" },
  { en: "Jeddah", ar: "جدة" },
  { en: "Makkah", ar: "مكة المكرمة" },
  { en: "Madinah", ar: "المدينة المنورة" },
  { en: "Dammam", ar: "الدمام" },
  { en: "Taif", ar: "الطائف" },
  { en: "Abha", ar: "أبها" },
  { en: "Tabuk", ar: "تبوك" },
  { en: "Buraidah", ar: "بريدة" },
  { en: "Khobar", ar: "الخبر" },
];

export const MALE_NAMES = [
  { en: "Abdullah", ar: "عبدالله" },
  { en: "Mohammed", ar: "محمد" },
  { en: "Faisal", ar: "فيصل" },
  { en: "Khalid", ar: "خالد" },
  { en: "Sultan", ar: "سلطان" },
  { en: "Nasser", ar: "ناصر" },
  { en: "Turki", ar: "تركي" },
  { en: "Yousef", ar: "يوسف" },
  { en: "Omar", ar: "عمر" },
  { en: "Saud", ar: "سعود" },
];

export const FEMALE_NAMES = [
  { en: "Sara", ar: "سارة" },
  { en: "Noura", ar: "نورة" },
  { en: "Reem", ar: "ريم" },
  { en: "Hind", ar: "هند" },
  { en: "Latifa", ar: "لطيفة" },
  { en: "Maha", ar: "مها" },
  { en: "Amal", ar: "أمل" },
  { en: "Jawaher", ar: "جواهر" },
  { en: "Aisha", ar: "عائشة" },
  { en: "Danah", ar: "دانة" },
];

export const FAMILY_NAMES = [
  { en: "Al-Qahtani", ar: "القحطاني" },
  { en: "Al-Ghamdi", ar: "الغامدي" },
  { en: "Al-Otaibi", ar: "العتيبي" },
  { en: "Al-Shehri", ar: "الشهري" },
  { en: "Al-Dossari", ar: "الدوسري" },
  { en: "Al-Harbi", ar: "الحربي" },
  { en: "Al-Zahrani", ar: "الزهراني" },
  { en: "Al-Malki", ar: "المالكي" },
  { en: "Al-Mutairi", ar: "المطيري" },
  { en: "Al-Subaie", ar: "السبيعي" },
];

/** Chronic conditions that drive coherent labs, meds, vitals, and symptoms. */
export type ConditionKey =
  | "T2DM"
  | "HTN"
  | "DYSLIPIDEMIA"
  | "HYPOTHYROID"
  | "GERD"
  | "ASTHMA"
  | "OBESITY";

export const CONDITIONS: Record<
  ConditionKey,
  { nameEn: string; nameAr: string; specialty: SpecialtyCode }
> = {
  T2DM: { nameEn: "Type 2 Diabetes", nameAr: "السكري من النوع الثاني", specialty: "ENDO" },
  HTN: { nameEn: "Hypertension", nameAr: "ارتفاع ضغط الدم", specialty: "CARD" },
  DYSLIPIDEMIA: { nameEn: "Dyslipidemia", nameAr: "اضطراب الدهون", specialty: "CARD" },
  HYPOTHYROID: { nameEn: "Hypothyroidism", nameAr: "قصور الغدة الدرقية", specialty: "ENDO" },
  GERD: { nameEn: "GERD", nameAr: "ارتجاع المريء", specialty: "GI" },
  ASTHMA: { nameEn: "Asthma", nameAr: "الربو", specialty: "PULM" },
  OBESITY: { nameEn: "Obesity", nameAr: "السمنة", specialty: "IM" },
};

/** Lab analyte definitions with reference ranges and units. */
export interface AnalyteDef {
  panel: string;
  analyte: string;
  loinc: string;
  unit: string;
  refLow: number;
  refHigh: number;
  /** typical healthy value used as a baseline */
  normal: number;
}

export const ANALYTES: Record<string, AnalyteDef> = {
  HBA1C: { panel: "Diabetes", analyte: "HbA1c", loinc: "4548-4", unit: "%", refLow: 4.0, refHigh: 5.6, normal: 5.2 },
  FASTING_GLUCOSE: { panel: "Diabetes", analyte: "Fasting Glucose", loinc: "1558-6", unit: "mg/dL", refLow: 70, refHigh: 99, normal: 90 },
  LDL: { panel: "Lipid Panel", analyte: "LDL Cholesterol", loinc: "13457-7", unit: "mg/dL", refLow: 0, refHigh: 100, normal: 90 },
  HDL: { panel: "Lipid Panel", analyte: "HDL Cholesterol", loinc: "2085-9", unit: "mg/dL", refLow: 40, refHigh: 90, normal: 55 },
  TOTAL_CHOL: { panel: "Lipid Panel", analyte: "Total Cholesterol", loinc: "2093-3", unit: "mg/dL", refLow: 0, refHigh: 200, normal: 180 },
  TRIGLYCERIDES: { panel: "Lipid Panel", analyte: "Triglycerides", loinc: "2571-8", unit: "mg/dL", refLow: 0, refHigh: 150, normal: 120 },
  CREATININE: { panel: "Renal", analyte: "Creatinine", loinc: "2160-0", unit: "mg/dL", refLow: 0.6, refHigh: 1.3, normal: 0.9 },
  EGFR: { panel: "Renal", analyte: "eGFR", loinc: "33914-3", unit: "mL/min", refLow: 90, refHigh: 120, normal: 100 },
  TSH: { panel: "Thyroid", analyte: "TSH", loinc: "3016-3", unit: "mIU/L", refLow: 0.4, refHigh: 4.0, normal: 2.0 },
  HEMOGLOBIN: { panel: "CBC", analyte: "Hemoglobin", loinc: "718-7", unit: "g/dL", refLow: 12, refHigh: 17, normal: 14 },
  VITAMIN_D: { panel: "Vitamins", analyte: "Vitamin D (25-OH)", loinc: "1989-3", unit: "ng/mL", refLow: 30, refHigh: 100, normal: 40 },
  ALT: { panel: "Liver", analyte: "ALT", loinc: "1742-6", unit: "U/L", refLow: 7, refHigh: 55, normal: 25 },
};

export interface MedicationDef {
  name: string;
  dose: string;
  frequency: string;
  route: string;
  condition: ConditionKey;
  reasonEn: string;
  reasonAr: string;
}

export const MEDICATIONS: MedicationDef[] = [
  { name: "Metformin", dose: "500 mg", frequency: "BID", route: "PO", condition: "T2DM", reasonEn: "Type 2 Diabetes", reasonAr: "السكري" },
  { name: "Empagliflozin", dose: "10 mg", frequency: "OD", route: "PO", condition: "T2DM", reasonEn: "Type 2 Diabetes", reasonAr: "السكري" },
  { name: "Lisinopril", dose: "10 mg", frequency: "OD", route: "PO", condition: "HTN", reasonEn: "Hypertension", reasonAr: "ضغط الدم" },
  { name: "Amlodipine", dose: "5 mg", frequency: "OD", route: "PO", condition: "HTN", reasonEn: "Hypertension", reasonAr: "ضغط الدم" },
  { name: "Atorvastatin", dose: "20 mg", frequency: "OD", route: "PO", condition: "DYSLIPIDEMIA", reasonEn: "Dyslipidemia", reasonAr: "الدهون" },
  { name: "Levothyroxine", dose: "50 mcg", frequency: "OD", route: "PO", condition: "HYPOTHYROID", reasonEn: "Hypothyroidism", reasonAr: "الغدة الدرقية" },
  { name: "Omeprazole", dose: "20 mg", frequency: "OD", route: "PO", condition: "GERD", reasonEn: "GERD", reasonAr: "ارتجاع المريء" },
  { name: "Salbutamol Inhaler", dose: "100 mcg", frequency: "PRN", route: "INH", condition: "ASTHMA", reasonEn: "Asthma", reasonAr: "الربو" },
];

export interface SymptomDef {
  code: string;
  labelEn: string;
  labelAr: string;
}

export const SYMPTOMS: SymptomDef[] = [
  { code: "HEADACHE", labelEn: "Headache", labelAr: "صداع" },
  { code: "FATIGUE", labelEn: "Fatigue", labelAr: "إرهاق" },
  { code: "CHEST_PAIN", labelEn: "Chest discomfort", labelAr: "ألم في الصدر" },
  { code: "PALPITATIONS", labelEn: "Palpitations", labelAr: "خفقان" },
  { code: "COUGH", labelEn: "Cough", labelAr: "سعال" },
  { code: "SOB", labelEn: "Shortness of breath", labelAr: "ضيق في التنفس" },
  { code: "DIZZINESS", labelEn: "Dizziness", labelAr: "دوخة" },
  { code: "JOINT_PAIN", labelEn: "Joint pain", labelAr: "ألم في المفاصل" },
  { code: "BACK_PAIN", labelEn: "Back pain", labelAr: "ألم في الظهر" },
  { code: "ABDO_PAIN", labelEn: "Abdominal pain", labelAr: "ألم في البطن" },
  { code: "POLYURIA", labelEn: "Frequent urination", labelAr: "كثرة التبول" },
  { code: "BLURRED_VISION", labelEn: "Blurred vision", labelAr: "تشوش الرؤية" },
];

export const BLOOD_TYPES = ["O+", "A+", "B+", "AB+", "O-", "A-"] as const;
