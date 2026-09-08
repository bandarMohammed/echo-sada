import { getTranslations } from "next-intl/server";
import { Users } from "lucide-react";
import { getActor } from "@/lib/session";
import { healthData } from "@/data";
import { recordAudit } from "@/lib/audit";
import { PatientListCard } from "@/components/doctor/PatientListCard";

export default async function DoctorDashboard() {
  const actor = await getActor();
  if (actor.role !== "DOCTOR" || !actor.doctorId) return null;
  await recordAudit(actor, "VIEW_PATIENT", { resourceType: "doctor_dashboard" });

  const patients = await healthData.listAuthorizedPatients(actor);
  const t = await getTranslations("nav");
  const tr = await getTranslations("roles");

  return (
    <div className="mx-auto max-w-4xl px-5 py-8">
      <header className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t("patients")}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {patients.length} {t("patients").toLowerCase()}
          </p>
        </div>
        <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <Users className="h-5 w-5" />
        </span>
      </header>

      {patients.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
          —
        </p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {patients.map((p) => (
            <PatientListCard key={p.id} patient={p} primaryLabel={tr("patient")} />
          ))}
        </div>
      )}
    </div>
  );
}
