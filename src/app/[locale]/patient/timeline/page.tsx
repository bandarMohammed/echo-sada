import { getTranslations } from "next-intl/server";
import { getActor } from "@/lib/session";
import { healthData } from "@/data";
import { assembleTimeline } from "@/domain/journey/timeline";
import { recordAudit } from "@/lib/audit";
import { TimelineView, type TimelineItem } from "@/components/patient/TimelineView";

export default async function TimelinePage() {
  const actor = await getActor();
  if (actor.role !== "PATIENT" || !actor.patientId) return null;

  await recordAudit(actor, "VIEW_RECORD", {
    subjectPatientId: actor.patientId,
    resourceType: "timeline",
  });

  const bundle = await healthData.getRecordBundle(actor, actor.patientId);
  const events: TimelineItem[] = assembleTimeline(bundle, "desc").map((e) => ({
    id: e.id,
    kind: e.kind,
    dateISO: e.date.toISOString(),
    title: e.title,
    subtitle: e.subtitle,
    recordType: e.recordType,
    recordId: e.recordId,
    attention: !!e.attention,
  }));

  const t = await getTranslations("nav");
  const tt = await getTranslations("timeline");

  return (
    <div className="mx-auto max-w-3xl px-5 py-8">
      <header className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">{t("timeline")}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{tt("subtitle")}</p>
      </header>
      <TimelineView events={events} />
    </div>
  );
}
