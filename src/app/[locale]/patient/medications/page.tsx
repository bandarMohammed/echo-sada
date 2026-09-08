import { getTranslations } from "next-intl/server";
import { Pill } from "lucide-react";
import { getActor } from "@/lib/session";
import { healthData } from "@/data";
import { recordAudit } from "@/lib/audit";

const fmt = (d: Date) => new Intl.DateTimeFormat("en-CA").format(d);

export default async function MedicationsPage() {
  const actor = await getActor();
  if (actor.role !== "PATIENT" || !actor.patientId) return null;

  await recordAudit(actor, "VIEW_RECORD", {
    subjectPatientId: actor.patientId,
    resourceType: "medications",
  });

  const [meds, doctors] = await Promise.all([
    healthData.getMedications(actor, actor.patientId),
    healthData.getDoctorsForPatient(actor, actor.patientId),
  ]);
  const doctorName = new Map(doctors.map((d) => [d.doctor.id, d.doctor.user.displayName]));

  const sorted = [...meds].sort(
    (a, b) => (a.status === "ACTIVE" ? 0 : 1) - (b.status === "ACTIVE" ? 0 : 1),
  );

  const t = await getTranslations("nav");
  const tm = await getTranslations("meds");
  const ts = await getTranslations("medStatus");

  return (
    <div className="mx-auto max-w-3xl px-5 py-8">
      <header className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">{t("medications")}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{tm("subtitle")}</p>
      </header>

      {sorted.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
          {tm("none")}
        </p>
      ) : (
        <div className="space-y-3">
          {sorted.map((m) => {
            const prescriber = m.prescribedById ? doctorName.get(m.prescribedById) : null;
            return (
              <div key={m.id} className="rounded-2xl border border-border bg-card p-4 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <span className="mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                      <Pill className="h-[18px] w-[18px]" />
                    </span>
                    <div>
                      <div className="font-semibold">
                        {m.name} <span className="text-sm font-normal text-muted-foreground">{m.dose}</span>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {m.frequency}
                        {m.route ? ` · ${m.route}` : ""}
                      </div>
                    </div>
                  </div>
                  <span
                    className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                      m.status === "ACTIVE"
                        ? "bg-success/10 text-success"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {ts(m.status)}
                  </span>
                </div>

                <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                  <span>
                    {tm("since")}: {fmt(m.startDate)}
                    {m.endDate ? ` · ${tm("until")}: ${fmt(m.endDate)}` : ""}
                  </span>
                  {m.reason && (
                    <span>
                      {tm("reason")}: {m.reason}
                    </span>
                  )}
                  {prescriber && (
                    <span>
                      {tm("prescribedBy")}: {prescriber}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
