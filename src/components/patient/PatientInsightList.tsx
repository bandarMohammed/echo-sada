import { getTranslations } from "next-intl/server";
import { aiService } from "@/ai";
import { InsightCard } from "./InsightCard";
import type { PatientRecordBundle } from "@/data/provider";

/**
 * Streamed ECHO insights. This is the ONLY slow part of the dashboard (a live
 * AI call), so it is rendered inside <Suspense> — the dashboard shell (stats,
 * freshness, timeline) is sent immediately while these stream in. Degrades to
 * the deterministic detector output if the model is unavailable.
 */
export async function PatientInsightList({ bundle }: { bundle: PatientRecordBundle }) {
  const insights = await aiService.generateInsights(bundle, "PATIENT");

  const t = await getTranslations("dashboard");
  const tType = await getTranslations("insightType");
  const tSev = await getTranslations("severity");
  const tc = await getTranslations("common");

  if (insights.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
        {t("noInsights")}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {insights.map((insight, i) => (
        <InsightCard
          key={i}
          insight={insight}
          typeLabel={tType(insight.type)}
          severityLabel={tSev(insight.severity)}
          recommendationLabel={t("recommendation")}
          evidenceLabel={t("evidence")}
        />
      ))}
      <p className="pt-1 text-center text-[11px] text-muted-foreground">
        {tc("notADiagnosis")}
      </p>
    </div>
  );
}

/** Pulsing placeholder shown while insights stream in. */
export function InsightsSkeleton() {
  return (
    <div className="space-y-3" aria-hidden>
      {[0, 1, 2].map((i) => (
        <div key={i} className="h-28 animate-pulse rounded-2xl border border-border bg-card" />
      ))}
    </div>
  );
}
