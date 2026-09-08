import { getTranslations } from "next-intl/server";
import { getActor } from "@/lib/session";
import { healthData } from "@/data";
import { recordAudit } from "@/lib/audit";
import { buildAnalyteSeries } from "@/domain/journey/labs";
import { LabResultsView } from "@/components/patient/LabResultsView";

export default async function LabsPage() {
  const actor = await getActor();
  if (actor.role !== "PATIENT" || !actor.patientId) return null;

  await recordAudit(actor, "VIEW_RECORD", {
    subjectPatientId: actor.patientId,
    resourceType: "labs",
  });

  const labs = await healthData.getLabResults(actor, actor.patientId);
  const series = buildAnalyteSeries(labs);

  const t = await getTranslations("nav");
  const tl = await getTranslations("labs");

  return (
    <div className="mx-auto max-w-4xl px-5 py-8">
      <header className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">{t("labs")}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{tl("subtitle")}</p>
      </header>
      <LabResultsView series={series} />
    </div>
  );
}
