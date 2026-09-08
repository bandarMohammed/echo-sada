import { getTranslations } from "next-intl/server";
import { AlertTriangle, Lightbulb, ArrowRight, RefreshCw } from "lucide-react";
import { getActor } from "@/lib/session";
import { healthData } from "@/data";
import { clinicalThreads } from "@/data/threads";
import { staleMeasurements } from "@/domain/freshness";
import {
  attentionRecommendations,
  openAttention,
  threadDeepLink,
  type AttentionThread,
} from "@/domain/attention";
import { recordAudit } from "@/lib/audit";
import { Link } from "@/i18n/navigation";
import type { FreshnessKey } from "@/config/freshness";
import type { ClinicalThread } from "@prisma/client";

const fmt = (iso: string) => iso.slice(0, 10);

const SEV_DOT: Record<AttentionThread["severity"], string> = {
  HIGH: "bg-danger",
  MEDIUM: "bg-warning",
  LOW: "bg-primary/50",
};

function toAttention(t: ClinicalThread): AttentionThread {
  return {
    id: t.id,
    type: t.type,
    severity: t.severity,
    title: t.title,
    summary: t.summary,
    recommendation: t.recommendation,
    evidence: (t.evidence as AttentionThread["evidence"]) ?? [],
    status: t.status,
    lastDetectedISO: t.lastDetectedAt.toISOString(),
  };
}

export default async function PatientAlertsPage() {
  const actor = await getActor();
  if (actor.role !== "PATIENT" || !actor.patientId) return null;

  await recordAudit(actor, "VIEW_RECORD", {
    subjectPatientId: actor.patientId,
    resourceType: "alerts",
  });

  // Clinical Threads are the authoritative source; alerts/recs are derived.
  const [threadsRaw, vitals] = await Promise.all([
    clinicalThreads.syncPatientThreads(actor, actor.patientId),
    healthData.getVitals(actor, actor.patientId),
  ]);
  const threads = threadsRaw.map(toAttention);
  const alerts = openAttention(threads);
  const recs = attentionRecommendations(threads);
  const stale = staleMeasurements(
    vitals.map((v) => ({
      id: v.id,
      type: v.type,
      valueNum: v.valueNum,
      unit: v.unit,
      measuredAt: v.measuredAt,
    })),
  );

  const t = await getTranslations("nav");
  const ta = await getTranslations("alertsPage");
  const tt = await getTranslations("threads");
  const tType = await getTranslations("insightType");
  const tf = await getTranslations("freshness");

  const evidenceChips = (evidence: AttentionThread["evidence"]) =>
    evidence.length > 0 ? (
      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        <span className="text-[10px] font-medium text-muted-foreground">{tt("evidence")}:</span>
        {evidence.map((e) => (
          <span
            key={e.recordId}
            title={`${e.recordType} · ${e.date.slice(0, 10)}`}
            className="rounded-md border border-border bg-background px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground"
          >
            {e.recordType}
          </span>
        ))}
      </div>
    ) : null;

  const hasAlerts = alerts.length > 0 || stale.length > 0;

  return (
    <div className="mx-auto max-w-3xl px-5 py-8">
      <header className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">{t("alerts")}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{ta("subtitle")}</p>
      </header>

      {/* Alerts */}
      <section className="mb-8">
        <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold">
          <AlertTriangle className="h-5 w-5 text-warning" />
          {ta("attention")}
        </h2>

        {!hasAlerts ? (
          <p className="rounded-2xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
            {ta("noAlerts")}
          </p>
        ) : (
          <div className="space-y-3">
            {/* Freshness alerts */}
            {stale.map((s) => (
              <div key={s.key} className="rounded-2xl border border-border bg-card p-4 shadow-sm">
                <div className="flex items-start gap-3">
                  <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-warning" />
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold">{ta("outdated")}</div>
                    <p className="text-sm text-muted-foreground">{tf(s.key as FreshnessKey)}</p>
                    <Link
                      href="/patient/profile"
                      className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
                    >
                      <RefreshCw className="h-3.5 w-3.5" />
                      {ta("updateInfo")}
                    </Link>
                  </div>
                </div>
              </div>
            ))}

            {/* Thread-based alerts */}
            {alerts.map((a) => (
              <div key={a.id} className="rounded-2xl border border-border bg-card p-4 shadow-sm">
                <div className="flex items-start gap-3">
                  <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${SEV_DOT[a.severity]}`} />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-[11px] font-medium text-muted-foreground">
                        {tType(a.type)}
                      </span>
                      <span className="rounded-full border border-border bg-muted px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
                        {tt(`status.${a.status}`)}
                      </span>
                      <span className="text-[11px] text-muted-foreground">
                        {fmt(a.lastDetectedISO)}
                      </span>
                    </div>
                    <div className="mt-0.5 font-semibold">{tt(`patientHeadline.${a.type}`)}</div>
                    <p className="text-sm text-muted-foreground">{a.summary}</p>
                    {evidenceChips(a.evidence)}
                    <div className="mt-3 flex flex-wrap items-center gap-3 text-xs font-semibold">
                      <Link href={threadDeepLink(a.type)} className="text-primary hover:underline">
                        {ta("details")}
                      </Link>
                      <Link href="/patient/threads" className="text-primary hover:underline">
                        {ta("viewThread")}
                      </Link>
                      <Link
                        href={{ pathname: "/patient/chat", query: { q: a.title } }}
                        className="text-primary hover:underline"
                      >
                        {ta("askEcho")} <ArrowRight className="inline h-3 w-3" />
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Recommendations */}
      <section>
        <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold">
          <Lightbulb className="h-5 w-5 text-accent" />
          {ta("recommendations")}
        </h2>

        {recs.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
            {ta("noRecommendations")}
          </p>
        ) : (
          <div className="space-y-3">
            {recs.map((r) => (
              <div key={r.id} className="rounded-2xl border border-border bg-card p-4 shadow-sm">
                <div className="font-semibold">{tt(`patientHeadline.${r.type}`)}</div>
                <p className="mt-1 rounded-xl bg-accent/10 px-3 py-2 text-sm">
                  {tt(`patientGuidance.${r.type}`)}
                </p>
                {evidenceChips(r.evidence)}
                <Link
                  href={{ pathname: "/patient/chat", query: { q: r.title } }}
                  className="mt-2 inline-block text-xs font-semibold text-primary hover:underline"
                >
                  {ta("askEcho")} →
                </Link>
              </div>
            ))}
            <p className="pt-1 text-center text-[11px] text-muted-foreground">
              {tt("notADiagnosis")}
            </p>
          </div>
        )}
      </section>
    </div>
  );
}
