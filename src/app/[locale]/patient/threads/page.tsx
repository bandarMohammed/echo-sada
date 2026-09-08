import { getTranslations } from "next-intl/server";
import { getActor } from "@/lib/session";
import { clinicalThreads } from "@/data/threads";
import { recordAudit } from "@/lib/audit";
import {
  ClinicalThreadCard,
  type ThreadDTO,
} from "@/components/threads/ClinicalThreadCard";
import type { ClinicalThread } from "@prisma/client";

function toDTO(thread: ClinicalThread): ThreadDTO {
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

export default async function PatientThreadsPage() {
  const actor = await getActor();
  if (actor.role !== "PATIENT" || !actor.patientId) return null;

  await recordAudit(actor, "VIEW_RECORD", {
    subjectPatientId: actor.patientId,
    resourceType: "clinical_threads",
  });

  // Sync derives/updates threads from the deterministic detections, then lists.
  const threads = await clinicalThreads.syncPatientThreads(actor, actor.patientId);
  const dtos = threads.map(toDTO);

  const t = await getTranslations("threads");

  return (
    <div className="mx-auto max-w-3xl px-5 py-8">
      <header className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">{t("title")}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t("patientSubtitle")}</p>
      </header>

      {dtos.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
          {t("empty")}
        </p>
      ) : (
        <div className="space-y-3">
          {dtos.map((th) => (
            <ClinicalThreadCard
              key={th.id}
              thread={th}
              persona="PATIENT"
              askEchoBasePath="/patient/chat"
            />
          ))}
          <p className="pt-1 text-center text-[11px] text-muted-foreground">
            {t("notADiagnosis")}
          </p>
        </div>
      )}
    </div>
  );
}
