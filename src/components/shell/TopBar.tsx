"use client";

import { useTransition } from "react";
import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { switchIdentity } from "@/app/actions/demo";
import type { Locale } from "@/config/app";
import type { DemoDoctorOption, DemoPatientOption } from "@/lib/demo";

export function TopBar({
  patients,
  doctors,
  current,
  locale,
  featuredDoctorId,
}: {
  patients: DemoPatientOption[];
  doctors: DemoDoctorOption[];
  current: { role: "PATIENT" | "DOCTOR"; id: string };
  locale: Locale;
  featuredDoctorId: string;
}) {
  const t = useTranslations();
  const [pending, start] = useTransition();
  const pathname = usePathname();
  const otherLocale: Locale = locale === "ar" ? "en" : "ar";

  const defaultPatient = patients.find((p) => p.id === "p04")?.id ?? patients[0]?.id;
  const defaultDoctor = featuredDoctorId ?? doctors[0]?.id;
  const isPatient = current.role === "PATIENT";

  const go = (role: "PATIENT" | "DOCTOR", id: string) =>
    start(async () => {
      await switchIdentity(role, id, locale);
    });

  return (
    <header className="sticky top-0 z-20 flex h-16 items-center gap-4 border-b border-border bg-card/80 px-4 backdrop-blur">
      <Link href="/" className="flex items-center gap-2">
        <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-sm font-bold text-primary-foreground">
          {t("app.name")}
        </span>
        <span className="hidden text-sm font-semibold sm:inline">ECHO</span>
      </Link>

      {/* Role toggle */}
      <div className="flex items-center rounded-xl border border-border bg-background p-0.5">
        <button
          onClick={() => defaultPatient && go("PATIENT", defaultPatient)}
          disabled={pending}
          aria-pressed={isPatient}
          className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
            isPatient ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
          }`}
        >
          {t("roles.patient")}
        </button>
        <button
          onClick={() => defaultDoctor && go("DOCTOR", defaultDoctor)}
          disabled={pending}
          aria-pressed={!isPatient}
          className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
            !isPatient ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
          }`}
        >
          {t("roles.doctor")}
        </button>
      </div>

      {/* Identity picker */}
      <select
        value={current.id}
        disabled={pending}
        onChange={(e) => go(current.role, e.target.value)}
        aria-label={isPatient ? t("roles.selectPatient") : t("roles.selectDoctor")}
        className="max-w-[240px] flex-1 truncate rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
      >
        {isPatient
          ? patients.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} · {p.mrn}
              </option>
            ))
          : doctors.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
                {d.specialties[0] ? ` · ${d.specialties[0]}` : ""}
              </option>
            ))}
      </select>

      <div className="ms-auto flex items-center gap-2">
        <Link
          href={pathname}
          locale={otherLocale}
          className="rounded-lg border border-border px-3 py-1.5 text-xs font-semibold text-muted-foreground transition hover:text-foreground"
        >
          {otherLocale === "ar" ? "العربية" : "EN"}
        </Link>
      </div>
    </header>
  );
}
