import { getLocale, getTranslations } from "next-intl/server";
import { CalendarDays } from "lucide-react";
import { getActor } from "@/lib/session";
import { healthData } from "@/data";
import { listSpecialties } from "@/lib/demo";
import { recordAudit } from "@/lib/audit";
import type { Appointment } from "@prisma/client";

const fmt = (d: Date) => new Intl.DateTimeFormat("en-CA").format(d);

export default async function AppointmentsPage() {
  const actor = await getActor();
  if (actor.role !== "PATIENT" || !actor.patientId) return null;

  await recordAudit(actor, "VIEW_RECORD", {
    subjectPatientId: actor.patientId,
    resourceType: "appointments",
  });

  const [appts, doctors, specialties] = await Promise.all([
    healthData.getAppointments(actor, actor.patientId),
    healthData.getDoctorsForPatient(actor, actor.patientId),
    listSpecialties(),
  ]);
  const doctorName = new Map(doctors.map((d) => [d.doctor.id, d.doctor.user.displayName]));
  const locale = await getLocale();
  const specName = (id: string | null) => {
    if (!id) return null;
    const s = specialties.get(id);
    return s ? (locale === "ar" ? s.nameAr : s.nameEn) : null;
  };

  const now = new Date();
  const upcoming = appts
    .filter((a) => a.status === "SCHEDULED" && a.scheduledFor > now)
    .sort((a, b) => a.scheduledFor.getTime() - b.scheduledFor.getTime());
  const past = appts
    .filter((a) => !(a.status === "SCHEDULED" && a.scheduledFor > now))
    .sort((a, b) => b.scheduledFor.getTime() - a.scheduledFor.getTime());

  const t = await getTranslations("nav");
  const ta = await getTranslations("appointments");
  const ts = await getTranslations("apptStatus");

  const Row = ({ a }: { a: Appointment }) => {
    const doctor = a.doctorId ? doctorName.get(a.doctorId) : null;
    const spec = specName(a.specialtyId);
    return (
      <div className="flex items-start justify-between gap-3 rounded-2xl border border-border bg-card p-4 shadow-sm">
        <div className="flex items-start gap-3">
          <span className="mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <CalendarDays className="h-[18px] w-[18px]" />
          </span>
          <div>
            <div className="font-semibold">{a.reason ?? spec ?? "—"}</div>
            <div className="text-xs text-muted-foreground">
              {fmt(a.scheduledFor)}
              {doctor ? ` · ${ta("with")} ${doctor}` : ""}
              {spec ? ` · ${spec}` : ""}
            </div>
          </div>
        </div>
        <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-[11px] font-semibold text-muted-foreground">
          {ts(a.status)}
        </span>
      </div>
    );
  };

  return (
    <div className="mx-auto max-w-3xl px-5 py-8">
      <header className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">{t("appointments")}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{ta("subtitle")}</p>
      </header>

      {appts.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
          {ta("none")}
        </p>
      ) : (
        <div className="space-y-6">
          <section>
            <h2 className="mb-2 text-sm font-semibold text-muted-foreground">{ta("upcoming")}</h2>
            {upcoming.length === 0 ? (
              <p className="text-sm text-muted-foreground">—</p>
            ) : (
              <div className="space-y-2">
                {upcoming.map((a) => (
                  <Row key={a.id} a={a} />
                ))}
              </div>
            )}
          </section>
          <section>
            <h2 className="mb-2 text-sm font-semibold text-muted-foreground">{ta("past")}</h2>
            {past.length === 0 ? (
              <p className="text-sm text-muted-foreground">—</p>
            ) : (
              <div className="space-y-2">
                {past.map((a) => (
                  <Row key={a.id} a={a} />
                ))}
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
