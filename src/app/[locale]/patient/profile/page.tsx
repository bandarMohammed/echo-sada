import { getTranslations } from "next-intl/server";
import { AlertTriangle } from "lucide-react";
import { getActor } from "@/lib/session";
import { healthData } from "@/data";
import { staleMeasurements } from "@/domain/freshness";
import { recordAudit } from "@/lib/audit";
import type { FreshnessKey } from "@/config/freshness";
import type { Gender } from "@prisma/client";

const fmt = (d: Date) => new Intl.DateTimeFormat("en-CA").format(d);

function ageFrom(dob: Date): number {
  const now = new Date();
  let a = now.getFullYear() - dob.getFullYear();
  const m = now.getMonth() - dob.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < dob.getDate())) a--;
  return a;
}

export default async function ProfilePage() {
  const actor = await getActor();
  if (actor.role !== "PATIENT" || !actor.patientId) return null;

  await recordAudit(actor, "VIEW_RECORD", {
    subjectPatientId: actor.patientId,
    resourceType: "profile",
  });

  const [profile, [summary], vitals] = await Promise.all([
    healthData.getPatientProfile(actor, actor.patientId),
    healthData.listAuthorizedPatients(actor),
    healthData.getVitals(actor, actor.patientId),
  ]);
  if (!profile) return null;

  const weight = vitals
    .filter((v) => v.type === "WEIGHT")
    .sort((a, b) => b.measuredAt.getTime() - a.measuredAt.getTime())[0];

  const stale = staleMeasurements(
    vitals.map((v) => ({
      id: v.id,
      type: v.type,
      valueNum: v.valueNum,
      unit: v.unit,
      measuredAt: v.measuredAt,
    })),
  );

  const bmi =
    weight && profile.heightCm
      ? Math.round((weight.valueNum / (profile.heightCm / 100) ** 2) * 10) / 10
      : null;

  const t = await getTranslations("nav");
  const tp = await getTranslations("profile");
  const tg = await getTranslations("gender");
  const tf = await getTranslations("freshness");

  const na = tp("notRecorded");
  const rows: { label: string; value: string }[] = [
    { label: tp("mrn"), value: profile.mrn },
    { label: tp("dob"), value: `${fmt(profile.dob)} · ${ageFrom(profile.dob)} ${tp("years")}` },
    { label: tp("gender"), value: tg(profile.gender as Gender) },
    { label: tp("height"), value: profile.heightCm ? `${profile.heightCm} cm` : na },
    {
      label: tp("weight"),
      value: weight ? `${weight.valueNum} kg · ${tp("lastMeasured")} ${fmt(weight.measuredAt)}` : na,
    },
    { label: tp("bmi"), value: bmi ? String(bmi) : na },
    { label: tp("bloodType"), value: profile.bloodType ?? na },
    { label: tp("city"), value: profile.city ?? na },
  ];

  return (
    <div className="mx-auto max-w-2xl px-5 py-8">
      <header className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">
          {summary?.displayName ?? t("profile")}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">{tp("subtitle")}</p>
      </header>

      {stale.length > 0 && (
        <div className="mb-6 space-y-2">
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
      )}

      <dl className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card">
        {rows.map((r) => (
          <div key={r.label} className="flex items-center justify-between gap-4 px-4 py-3">
            <dt className="text-sm text-muted-foreground">{r.label}</dt>
            <dd className="text-sm font-medium">{r.value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
