import { defineRouting } from "next-intl/routing";
import { locales, defaultLocale } from "@/config/app";

/**
 * Arabic-first routing. Default locale (ar) is served at the root with no
 * prefix; English is served under /en. A language toggle switches between
 * them while preserving the current path.
 */
export const routing = defineRouting({
  locales,
  defaultLocale,
  localePrefix: "as-needed",
});
