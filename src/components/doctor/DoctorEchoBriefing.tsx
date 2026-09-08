import { getTranslations } from "next-intl/server";
import { Sparkles, TrendingUp, GitBranch, ListChecks } from "lucide-react";
import { aiService } from "@/ai";
import type { EvidenceRefPayload } from "@/ai";
import type { PatientRecordBundle } from "@/data/provider";

function EvidenceChips({
  evidence,
  label,
}: {
  evidence: EvidenceRefPayload[];
  label: string;
}) {
  if (evidence.length === 0) return null;
  return (
    <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
      <span className="text-[10px] font-medium text-muted-foreground">{label}:</span>
      {evidence.map((e) => (
        <span
          key={e.recordId}
          title={`${e.recordType} · ${e.date.slice(0, 10)}`}
          className="rounded-md border border-border bg-background px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground"
        >
          {e.recordType}
        </span>
      ))}
    </div>
  );
}

/**
 * Doctor ECHO pre-visit briefing. Async server component — generation and
 * evidence-scrubbing happen server-side; wrap in <Suspense> so the rest of the
 * page streams while the model works. Degrades gracefully on failure.
 */
export async function DoctorEchoBriefing({
  bundle,
  locale,
}: {
  bundle: PatientRecordBundle;
  locale: string;
}) {
  const t = await getTranslations("previsit");

  let summary = null;
  try {
    summary = await aiService.generatePreVisitSummary(bundle, {
      locale,
      now: new Date(),
    });
  } catch (err) {
    console.error("previsit_failed", (err as Error).message);
  }

  return (
    <section className="mb-8 overflow-hidden rounded-2xl border border-accent/30 bg-gradient-to-br from-accent/[0.07] to-primary/[0.03] shadow-sm">
      <div className="border-b border-accent/20 px-5 py-4">
        <div className="flex items-center gap-2.5">
          <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-accent/15 text-accent">
            <Sparkles className="h-[18px] w-[18px]" />
          </span>
          <div>
            <h2 className="text-base font-bold leading-tight">{t("title")}</h2>
            <p className="text-xs text-muted-foreground">{t("subtitle")}</p>
          </div>
        </div>
      </div>

      {!summary ? (
        <div className="px-5 py-6 text-sm text-muted-foreground">{t("unavailable")}</div>
      ) : (
        <div className="space-y-5 px-5 py-5">
          {/* Journey summary */}
          <div>
            <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-accent">
              {t("journeySummary")}
            </h3>
            <p className="text-sm leading-relaxed">{summary.journeySummary}</p>
          </div>

          {/* Key changes */}
          {summary.keyChanges.length > 0 && (
            <div>
              <h3 className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-accent">
                <TrendingUp className="h-3.5 w-3.5" />
                {t("keyChanges")}
              </h3>
              <ul className="space-y-2.5">
                {summary.keyChanges.map((c, i) => (
                  <li key={i} className="rounded-xl bg-card/70 p-3">
                    <div className="text-sm font-semibold">{c.title}</div>
                    <div className="text-sm text-muted-foreground">{c.detail}</div>
                    <EvidenceChips evidence={c.evidence} label={t("evidence")} />
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Unresolved threads */}
          {summary.unresolvedThreads.length > 0 && (
            <div>
              <h3 className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-accent">
                <GitBranch className="h-3.5 w-3.5" />
                {t("unresolvedThreads")}
              </h3>
              <ul className="space-y-2.5">
                {summary.unresolvedThreads.map((th, i) => (
                  <li key={i} className="rounded-xl bg-card/70 p-3">
                    <div className="text-sm font-semibold">{th.title}</div>
                    <div className="text-sm text-muted-foreground">{th.why}</div>
                    <EvidenceChips evidence={th.evidence} label={t("evidence")} />
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Review today (prioritized) */}
          {summary.reviewToday.length > 0 && (
            <div>
              <h3 className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-accent">
                <ListChecks className="h-3.5 w-3.5" />
                {t("reviewToday")}
              </h3>
              <ol className="space-y-2">
                {summary.reviewToday.map((r, i) => (
                  <li key={i} className="flex gap-2.5 text-sm">
                    <span className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-accent/15 text-[11px] font-bold text-accent">
                      {i + 1}
                    </span>
                    <div className="min-w-0">
                      <span>{r.item}</span>
                      <EvidenceChips evidence={r.evidence} label={t("evidence")} />
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          )}

          <p className="pt-1 text-[11px] text-muted-foreground">{t("notADiagnosis")}</p>
        </div>
      )}
    </section>
  );
}
