/**
 * Client-safe application constants.
 * No secrets here — this module may be imported by client components.
 */

export const locales = ["ar", "en"] as const;
export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = "ar";

export const localeDirection: Record<Locale, "rtl" | "ltr"> = {
  ar: "rtl",
  en: "ltr",
};

export const localeLabels: Record<Locale, string> = {
  ar: "العربية",
  en: "English",
};

/** Feature flags gate future modules without touching product code. */
export const featureFlags = {
  wearables: false,
  chronicDiseaseModules: false,
  realAuth: false,
  messaging: false,
} as const;

/** Demo-mode scale for synthetic data. */
export const demo = {
  patientCount: 10,
  doctorCount: 50,
} as const;

export const app = {
  name: "ECHO",
  nameAr: "صدى",
  tagline: "The Patient's Second Memory",
  taglineAr: "الذاكرة الثانية للمريض",
} as const;
