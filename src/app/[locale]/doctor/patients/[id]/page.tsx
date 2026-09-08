import { Suspense } from "react";
import { getTranslations } from "next-intl/server";
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  CalendarClock,
  HeartPulse,
  Pill,
  Scale,
  ShieldAlert,
  Sparkles,
} from "lucide-react";
import { getActor } from "@/lib/session";
import { healthData, AuthorizationError } from "@/data";
import { clinicalThreads } from "@/data/threads";
import { assembleTimeline } from "@/domain/journey/timeline";
import { buildAnalyteSeries } from "@/domain/journey/labs";
import { staleMeasurements } from "@/domain/freshness";
import { recordAudit } from "@/lib/audit";
import type { FreshnessKey } from "@/config/freshness";
import { Link } from "@/i18n/navigation";
import {
  ClinicalThreadCard,
  type ThreadDTO,
} from "@/components/threads/ClinicalThreadCard";
import { LabResultsView } from "@/components/patient/LabResultsView";
import { TimelineView, type TimelineItem } from "@/components/patient/TimelineView";
import { DoctorEchoBriefing } from "@/components/doctor/DoctorEchoBriefing";
import type { PatientRecordBundle } from "@/data/provider";
import type { ClinicalThread, VitalType } from "@prisma/client";

function threadToDTO(thread: ClinicalThread): ThreadDTO {
  return {
    id: thread.id,
    type: thread.type,
    severity: thread.severity,
    title: thread.title,
    summary: thread.summary,
    recommendation: thread.recommendation,
    evidence: (thread.evidence as ThreadDTO["evidence"]) ?? [],
    status: thread.status,
    lastDetected: thread.lastDetectedAt.toISOString(),
  };
}

function ageFrom(dob: Date): number {
  const now = new Date();
  let a = now.getFullYear() - dob.getFullYear();
  const m = now.getMonth() - dob.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < dob.getDate())) a--;
  return a;
}

function latestVital(bundle: PatientRecordBundle, type: VitalType) {
  return bundle.vitals
    .filter((v) => v.type === type)
    .sort((a, b) => b.measuredAt.getTime() - a.measuredAt.getTime())[0];
}

const fmtDate = (d: Date) => new Intl.DateTimeFormat("en-CA").format(d);

export default async function DoctorPatientView({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const actor = await getActor();
  if (actor.role !== "DOCTOR" || !actor.doctorId) return null;
  const { locale, id } = await params;

  const td = await getTranslations("doctorView");
  const tp = await getTranslations("previsit");

  // Authorization: getRecordBundle throws AuthorizationError unless an active
  // care relationship links this doctor to the patient.
  let bundle: PatientRecordBundle;
  try {
    bundle = await healthData.getRecordBundle(actor, id);
  } catch (err) {
    if (err instanceof AuthorizationError) {
      return (
        <div className="mx-auto max-w-md px-5 py-20 text-center">
          <ShieldAlert className="mx-auto mb-4 h-10 w-10 text-danger" />
          <h1 className="text-lg font-semibold">{td("forbidden")}</h1>
          <p className="mt-2 text-sm text-muted-foreground">{td("forbiddenSub")}</p>
          <Link
            href="/doctor/patients"
            className="mt-6 inline-block text-sm font-semibold text-primary hover:underline"
          >
            {td("back")}
          </Link>
        </div>
      );
    }
    throw err;
  }

  await recordAudit(actor, "VIEW_PATIENT", {
    subjectPatientId: id,
    resourceType: "doctor_patient_view",
  });

  // Reuse the existing intelligence — no duplicated logic. Clinical Threads are
  // the persistent, deterministic findings (synced from the detection engine).
  const now = new Date();
  const threads = (await clinicalThreads.syncPatientThreads(actor, id)).map(threadToDTO);
  const stale = staleMeasurements(
    bundle.vitals.map((v) => ({
      id: v.id,
      type: v.type,
      valueNum: v.valueNum,
      unit: v.unit,
      measuredAt: v.measuredAt,
    })),
    now,
  );
  const series = buildAnalyteSeries(bundle.labResults);
  const timeline: TimelineItem[] = assembleTimeline(bundle, "desc").map((e) => ({
    id: e.id,
    kind: e.kind,
    dateISO: e.date.toISOString(),
    title: e.title,
    subtitle: e.subtitle,
    recordType: e.recordType,
    recordId: e.recordId,
    attention: !!e.attention,
  }));

  const [summary] = (await healthData.listAuthorizedPatients(actor)).filter(
    (p) => p.id === id,
  );
  const name = summary?.displayName ?? bundle.profile.mrn;

  const activeMeds = bundle.medications.filter((m) => m.status === "ACTIVE");
  const openFollowUps = bundle.followUps
    .filter((f) => f.status === "OPEN")
    .sort((a, b) => (a.dueBy?.getTime() ?? 0) - (b.dueBy?.getTime() ?? 0));
  const pastEncounters = bundle.encounters
    .filter((e) => e.date <= now)
    .sort((a, b) => b.date.getTime() - a.date.getTime());
  const lastVisit = pastEncounters[0]?.date;

  const weight = latestVital(bundle, "WEIGHT");
  const sys = latestVital(bundle, "BLOOD_PRESSURE_SYSTOLIC");
  const dia = latestVital(bundle, "BLOOD_PRESSURE_DIASTOLIC");
  const hr = latestVital(bundle, "HEART_RATE");
  const hba1c = bundle.labResults
    .filter((l) => l.analyte === "HbA1c" && l.valueNum != null)
    .sort((a, b) => b.takenAt.getTime() - a.takenAt.getTime())[0];

  const t = await getTranslations("nav");
  const tm = await getTranslations("metrics");
  const tth = await getTranslations("threads");
  const tf = await getTranslations("freshness");
  const ta = await getTranslations("alertsPage");

  const metrics = [
    weight && { Icon: Scale, label: tm("weight"), value: `${weight.valueNum} ${weight.unit}` },
    sys &&
      dia && {
        Icon: HeartPulse,
        label: tm("bloodPressure"),
        value: `${sys.valueNum}/${dia.valueNum}`,
      },
    hr && { Icon: Activity, label: tm("heartRate"), value: `${hr.valueNum} ${hr.unit}` },
    hba1c && {
      Icon: Activity,
      label: tm("hba1c"),
      value: `${hba1c.valueNum} %`,
      flag: hba1c.flag,
    },
  ].filter(Boolean) as { Icon: typeof Scale; label: string; value: string; flag?: string }[];

  return (
    <div className="mx-auto max-w-4xl px-5 py-8">
      {/* Header */}
      <Link
        href="/doctor/patients"
        className="mb-4 inline-flex items-center gap-1 text-xs font-semibold text-muted-foreground hover:text-foreground"
      >
        <ArrowRight className="h-3.5 w-3.5 rtl:rotate-0 ltr:rotate-180" />
        {td("back")}
      </Link>

      <header className="mb-6 rounded-2xl border border-border bg-card p-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">{name}</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {bundle.profile.mrn} · {ageFrom(bundle.profile.dob)}y · {bundle.profile.gender}
              {bundle.profile.city ? ` · ${bundle.profile.city}` : ""}
              {bundle.profile.bloodType ? ` · ${bundle.profile.bloodType}` : ""}
            </p>
          </div>
          <div className="flex flex-wrap gap-2 text-xs">
            <Stat label={t("timeline")} value={String(pastEncounters.length)} />
            <Stat label={td("activeMeds")} value={String(activeMeds.length)} />
            <Stat label={td("openFollowUps")} value={String(openFollowUps.length)} />
            {lastVisit && <Stat label={td("lastVisit")} value={fmtDate(lastVisit)} />}
          </div>
        </div>
      </header>

      {/* Doctor ECHO pre-visit briefing (LLM synthesis, streamed) */}
      <Suspense
        fallback={
          <div className="mb-8 animate-pulse rounded-2xl border border-accent/30 bg-accent/[0.05] px-5 py-6">
            <div className="flex items-center gap-2.5">
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-accent/15 text-accent">
                <Sparkles className="h-[18px] w-[18px]" />
              </span>
              <div>
                <div className="text-base font-bold">{tp("title")}</div>
                <div className="text-xs text-muted-foreground">{tp("generating")}</div>
              </div>
            </div>
          </div>
        }
      >
        <DoctorEchoBriefing bundle={bundle} locale={locale} />
      </Suspense>

      {/* Clinical Threads (persistent, deterministic findings with lifecycle) */}
      <section className="mb-8">
        <div className="mb-3">
          <h2 className="flex items-center gap-2 text-lg font-semibold">
            <AlertTriangle className="h-5 w-5 text-warning" />
            {tth("doctorTitle")}
          </h2>
          <p className="text-xs text-muted-foreground">{tth("doctorSubtitle")}</p>
        </div>
        {threads.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
            {tth("empty")}
          </p>
        ) : (
          <div className="space-y-3">
            {threads.map((th) => (
              <ClinicalThreadCard key={th.id} thread={th} persona="DOCTOR" />
            ))}
            <p className="pt-1 text-center text-[11px] text-muted-foreground">
              {tth("notADiagnosis")}
            </p>
          </div>
        )}
      </section>

      {/* Freshness attention (data not in threads) */}
      {stale.length > 0 && (
        <section className="mb-8">
          <h2 className="mb-3 text-sm font-semibold text-muted-foreground">
            {ta("doctorAttention")}
          </h2>
          <div className="space-y-2">
            {stale.map((s) => (
              <div
                key={s.key}
                className="flex items-center gap-3 rounded-xl border border-warning/20 bg-warning/10 px-4 py-2.5 text-sm"
              >
                <AlertTriangle className="h-4 w-4 shrink-0 text-warning" />
                <span>{tf(s.key as FreshnessKey)}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Unresolved follow-ups */}
      <section className="mb-8">
        <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold">
          <CalendarClock className="h-5 w-5 text-primary" />
          {td("unresolvedFollowUps")}
        </h2>
        {openFollowUps.length === 0 ? (
          <p className="text-sm text-muted-foreground">{td("noFollowUps")}</p>
        ) : (
          <ul className="space-y-2">
            {openFollowUps.map((f) => {
              const overdueDays = f.dueBy
                ? Math.floor((now.getTime() - f.dueBy.getTime()) / 86400000)
                : 0;
              return (
                <li
                  key={f.id}
                  className="flex items-start justify-between gap-3 rounded-xl border border-border bg-card px-4 py-3 shadow-sm"
                >
                  <div className="min-w-0">
                    <div className="text-sm font-medium">{f.note}</div>
                    <div className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
                      <span className="rounded border border-border bg-muted px-1.5 py-0.5 font-mono text-[10px]">
                        {f.sourceType}
                      </span>
                      {f.dueBy && (
                        <span>
                          {td("dueBy")}: {fmtDate(f.dueBy)}
                        </span>
                      )}
                    </div>
                  </div>
                  {f.dueBy && overdueDays > 0 && (
                    <span className="shrink-0 rounded-full bg-danger/10 px-2 py-0.5 text-[11px] font-semibold text-danger">
                      {td("overdueBy", { days: overdueDays })}
                    </span>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {/* Key metrics */}
      {metrics.length > 0 && (
        <section className="mb-8">
          <h2 className="mb-3 text-lg font-semibold">{td("keyMetrics")}</h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {metrics.map((m) => (
              <div key={m.label} className="rounded-2xl border border-border bg-card p-4 shadow-sm">
                <m.Icon className="h-5 w-5 text-primary" />
                <div className="mt-2 flex items-center gap-1.5">
                  <span className="text-xl font-bold">{m.value}</span>
                  {m.flag && m.flag !== "NORMAL" && (
                    <span className="rounded-full bg-danger/10 px-1.5 py-0.5 text-[10px] font-semibold text-danger">
                      {m.flag}
                    </span>
                  )}
                </div>
                <div className="text-xs text-muted-foreground">{m.label}</div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Labs & trends */}
      {series.length > 0 && (
        <section className="mb-8">
          <h2 className="mb-3 text-lg font-semibold">{td("labsTrends")}</h2>
          <LabResultsView series={series} />
        </section>
      )}

      {/* Medications */}
      <section className="mb-8">
        <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold">
          <Pill className="h-5 w-5 text-primary" />
          {td("medications")}
        </h2>
        {bundle.medications.length === 0 ? (
          <p className="text-sm text-muted-foreground">{td("noMeds")}</p>
        ) : (
          <div className="grid gap-2 sm:grid-cols-2">
            {[...bundle.medications]
              .sort((a, b) => (a.status === "ACTIVE" ? -1 : 1) - (b.status === "ACTIVE" ? -1 : 1))
              .map((m) => (
                <div
                  key={m.id}
                  className="flex items-center justify-between gap-2 rounded-xl border border-border bg-card px-4 py-2.5 shadow-sm"
                >
                  <div>
                    <div className="text-sm font-medium">
                      {m.name} {m.dose}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {m.frequency}
                      {m.reason ? ` · ${m.reason}` : ""}
                    </div>
                  </div>
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                      m.status === "ACTIVE"
                        ? "bg-success/10 text-success"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {m.status}
                  </span>
                </div>
              ))}
          </div>
        )}
      </section>

      {/* Clinical timeline */}
      <section>
        <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold">
          <Activity className="h-5 w-5 text-primary" />
          {td("timeline")}
        </h2>
        <TimelineView events={timeline} showAskEcho={false} />
      </section>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-background px-3 py-1.5 text-center">
      <div className="text-sm font-bold leading-none">{value}</div>
      <div className="mt-0.5 text-[10px] text-muted-foreground">{label}</div>
    </div>
  );
}
