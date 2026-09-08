import { getTranslations } from "next-intl/server";
import {
  Activity,
  ArrowRight,
  CalendarDays,
  FlaskConical,
  Pill,
  AlertTriangle,
} from "lucide-react";
import { Suspense } from "react";
import { getActor } from "@/lib/session";
import { healthData } from "@/data";
import { fromPrismaBundle } from "@/domain/detectors";
import { staleMeasurements } from "@/domain/freshness";
import { assembleTimeline } from "@/domain/journey/timeline";
import { recordAudit } from "@/lib/audit";
import {
  PatientInsightList,
  InsightsSkeleton,
} from "@/components/patient/PatientInsightList";
import { Link } from "@/i18n/navigation";
import type { FreshnessKey } from "@/config/freshness";

export default async function PatientDashboard() {
  const actor = await getActor();
  // The layout redirects a doctor identity to /doctor; guard the page too so
  // it never runs with a null patientId during that transition.
  if (actor.role !== "PATIENT" || !actor.patientId) return null;
  const patientId = actor.patientId;
  await recordAudit(actor, "VIEW_PATIENT", {
    subjectPatientId: patientId,
    resourceType: "dashboard",
  });

  const [[summary], bundle] = await Promise.all([
    healthData.listAuthorizedPatients(actor),
    healthData.getRecordBundle(actor, patientId),
  ]);
  // NOTE: AI insight generation is intentionally NOT awaited here — it streams
  // via <Suspense> below so the dashboard shell is usable immediately.

  const input = fromPrismaBundle(bundle);
  const stale = staleMeasurements(input.vitals);
  const timeline = assembleTimeline(bundle).slice(0, 6);
  const now = new Date();

  const t = await getTranslations("dashboard");
  const tFresh = await getTranslations("freshness");

  const firstName = summary?.displayName?.split(" ")[0] ?? "";
  const activeMeds = bundle.medications.filter((m) => m.status === "ACTIVE").length;
  const openFollowUps = bundle.followUps.filter((f) => f.status === "OPEN").length;
  const upcoming = bundle.appointments
    .filter((a) => a.status === "SCHEDULED" && a.scheduledFor > now)
    .slice(0, 3);

  const stats = [
    { label: t("statEncounters"), value: bundle.encounters.length, Icon: Activity },
    { label: t("statLabs"), value: bundle.labResults.length, Icon: FlaskConical },
    { label: t("statActiveMeds"), value: activeMeds, Icon: Pill },
    { label: t("statOpenFollowUps"), value: openFollowUps, Icon: AlertTriangle },
  ];

  const fmtDate = (d: Date) =>
    new Intl.DateTimeFormat("en-CA").format(d); // YYYY-MM-DD, locale-neutral

  return (
    <div className="mx-auto max-w-5xl px-5 py-8">
      {/* Greeting */}
      <header className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">
          {t("greeting")}
          {firstName ? ` ${firstName}` : ""}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">{t("subtitle")}</p>
      </header>

      {/* Freshness nudges */}
      {stale.length > 0 && (
        <div className="mb-6 space-y-2">
          {stale.map((s) => (
            <div
              key={s.key}
              className="flex items-center gap-3 rounded-xl border border-warning/20 bg-warning/10 px-4 py-2.5 text-sm text-foreground"
            >
              <AlertTriangle className="h-4 w-4 shrink-0 text-warning" />
              <span>{tFresh(s.key as FreshnessKey)}</span>
            </div>
          ))}
        </div>
      )}

      {/* Stats */}
      <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {stats.map(({ label, value, Icon }) => (
          <div key={label} className="rounded-2xl border border-border bg-card p-4 shadow-sm">
            <Icon className="h-5 w-5 text-primary" />
            <div className="mt-2 text-2xl font-bold">{value}</div>
            <div className="text-xs text-muted-foreground">{label}</div>
          </div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Insights */}
        <section className="lg:col-span-2">
          <div className="mb-3 flex items-baseline justify-between">
            <div>
              <h2 className="text-lg font-semibold">{t("insights")}</h2>
              <p className="text-xs text-muted-foreground">{t("insightsSub")}</p>
            </div>
            <Link
              href="/patient/timeline"
              className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
            >
              {t("viewJourney")} <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          <Suspense fallback={<InsightsSkeleton />}>
            <PatientInsightList bundle={bundle} />
          </Suspense>
        </section>

        {/* Side column */}
        <aside className="space-y-6">
          <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
            <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold">
              <CalendarDays className="h-4 w-4 text-primary" />
              {t("upcoming")}
            </h3>
            {upcoming.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t("noUpcoming")}</p>
            ) : (
              <ul className="space-y-2">
                {upcoming.map((a) => (
                  <li key={a.id} className="rounded-xl bg-muted px-3 py-2 text-sm">
                    <div className="font-medium">{a.reason ?? "Appointment"}</div>
                    <div className="text-xs text-muted-foreground">{fmtDate(a.scheduledFor)}</div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
            <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold">
              <Activity className="h-4 w-4 text-primary" />
              {t("recentActivity")}
            </h3>
            <ul className="space-y-2.5">
              {timeline.map((e) => (
                <li key={e.id} className="flex items-start gap-2 text-sm">
                  <span
                    className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${e.attention ? "bg-warning" : "bg-primary/50"}`}
                  />
                  <div className="min-w-0">
                    <div className="truncate">{e.title}</div>
                    <div className="text-xs text-muted-foreground">{fmtDate(e.date)}</div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </aside>
      </div>
    </div>
  );
}
