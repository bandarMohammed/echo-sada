import { getTranslations } from "next-intl/server";
import { FileText } from "lucide-react";
import { getActor } from "@/lib/session";
import { healthData } from "@/data";
import { recordAudit } from "@/lib/audit";

const fmt = (d: Date) => new Intl.DateTimeFormat("en-CA").format(d);

export default async function ReportsPage() {
  const actor = await getActor();
  if (actor.role !== "PATIENT" || !actor.patientId) return null;

  await recordAudit(actor, "VIEW_RECORD", {
    subjectPatientId: actor.patientId,
    resourceType: "reports",
  });

  const [reports, doctors] = await Promise.all([
    healthData.getReports(actor, actor.patientId),
    healthData.getDoctorsForPatient(actor, actor.patientId),
  ]);
  const doctorName = new Map(doctors.map((d) => [d.doctor.id, d.doctor.user.displayName]));

  const t = await getTranslations("nav");
  const tr = await getTranslations("reports");
  const tt = await getTranslations("reportType");

  return (
    <div className="mx-auto max-w-3xl px-5 py-8">
      <header className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">{t("reports")}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{tr("subtitle")}</p>
      </header>

      {reports.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
          {tr("none")}
        </p>
      ) : (
        <div className="space-y-3">
          {reports.map((r) => {
            const author = r.authorDoctorId ? doctorName.get(r.authorDoctorId) : null;
            return (
              <article key={r.id} className="rounded-2xl border border-border bg-card p-4 shadow-sm">
                <div className="flex items-start gap-3">
                  <span className="mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <FileText className="h-[18px] w-[18px]" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-semibold text-muted-foreground">
                        {tt(r.type)}
                      </span>
                      <span className="text-xs text-muted-foreground">{fmt(r.issuedAt)}</span>
                    </div>
                    <h3 className="mt-1 font-semibold leading-snug">{r.title}</h3>
                    <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{r.body}</p>
                    {author && (
                      <p className="mt-2 text-xs text-muted-foreground">
                        {tr("by")}: {author}
                      </p>
                    )}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
