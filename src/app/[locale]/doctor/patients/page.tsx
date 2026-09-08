import { getTranslations } from "next-intl/server";
import { getActor } from "@/lib/session";
import { healthData } from "@/data";
import { PatientListCard } from "@/components/doctor/PatientListCard";

export default async function DoctorPatientsPage() {
  const actor = await getActor();
  if (actor.role !== "DOCTOR" || !actor.doctorId) return null;

  const patients = await healthData.listAuthorizedPatients(actor);
  const t = await getTranslations("nav");
  const tr = await getTranslations("roles");

  return (
    <div className="mx-auto max-w-4xl px-5 py-8">
      <header className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">{t("patients")}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {patients.length} {t("patients").toLowerCase()}
        </p>
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
