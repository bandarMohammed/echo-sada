import type { AIContext } from "./provider";
import type { PreVisitSummary } from "./schemas/previsit";

/**
 * Deterministic pre-visit briefing derived purely from the detected patterns
 * (the source of truth). Used by the mock adapter AND as the AIService fallback
 * when a real provider returns output that fails validation — guaranteeing a
 * grounded briefing that never invents facts, values, dates, or events.
 */
export function deterministicPreVisit(context: AIContext): PreVisitSummary {
  const dets = context.detections;
  const changes = dets.filter((d) => d.type === "CHANGE_DETECTION");
  const threads = dets.filter(
    (d) => d.type === "UNRESOLVED_FOLLOW_UP" || d.type === "MISSING_THREAD",
  );
  const top = dets.slice(0, 3);
  const p = context.profile;
  const isAr = context.locale === "ar";

  const firstSummaryLine = context.summary.split("\n")[0] ?? "";
  const journeySummary = isAr
    ? `المريض ${p.gender === "FEMALE" ? "أنثى" : "ذكر"} بعمر ${p.ageYears} عاماً. ${firstSummaryLine} ${dets.length ? `أبرز ما رُصد: ${dets[0].title}.` : "لا توجد أنماط مهمة مرصودة."}`
    : `${p.gender}, age ${p.ageYears}. ${firstSummaryLine} ${dets.length ? `Most notable: ${dets[0].title}.` : "No notable patterns detected."}`;

  return {
    journeySummary,
    keyChanges: changes.map((d) => ({
      title: d.title,
      detail: d.summary,
      evidence: d.evidence,
    })),
    unresolvedThreads: threads.map((d) => ({
      title: d.title,
      why: d.summary,
      evidence: d.evidence,
    })),
    reviewToday: top.map((d) => ({
      item: d.recommendation ?? d.title,
      evidence: d.evidence,
    })),
  };
}
