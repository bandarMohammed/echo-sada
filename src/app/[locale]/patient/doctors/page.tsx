import { getLocale, getTranslations } from "next-intl/server";
import { Stethoscope } from "lucide-react";
import { getActor } from "@/lib/session";
import { healthData } from "@/data";
import { recordAudit } from "@/lib/audit";

const fmt = (d: Date) => new Intl.DateTimeFormat("en-CA").format(d);

export default async function PatientDoctorsPage() {
  const actor = await getActor();
  if (actor.role !== "PATIENT" || !actor.patientId) return null;

  await recordAudit(actor, "VIEW_RECORD", {
    subjectPatientId: actor.patientId,
    resourceType: "doctors",
  });

  // Only doctors with an ACTIVE authorized relationship are returned.
  const links = await healthData.getDoctorsForPatient(actor, actor.patientId);
  const locale = await getLocale();

  const t = await getTranslations("nav");
  const tc = await getTranslations("careTeam");

  return (
    <div className="mx-auto max-w-3xl px-5 py-8">
      <header className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">{t("doctors")}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{tc("subtitle")}</p>
      </header>

      {links.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
          {tc("none")}
        </p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {links.map((l) => {
            const specs = l.specialties
              .map((s) => (locale === "ar" ? s.nameAr : s.nameEn))
              .join(" · ");
            return (
              <div key={l.doctor.id} className="rounded-2xl border border-border bg-card p-4 shadow-sm">
                <div className="flex items-start gap-3">
                  <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <Stethoscope className="h-5 w-5" />
                  </span>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="truncate font-semibold">{l.doctor.user.displayName}</span>
                      {l.isPrimary && (
                        <span className="rounded-full bg-accent/10 px-2 py-0.5 text-[10px] font-semibold text-accent">
                          {tc("primary")}
                        </span>
                      )}
                    </div>
                    {specs && <div className="text-xs text-muted-foreground">{specs}</div>}
                    <div className="mt-1 text-[11px] text-muted-foreground">
                      {tc("since")} {fmt(l.since)}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
