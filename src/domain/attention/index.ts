/**
 * Attention derivation — a PRESENTATION layer over Clinical Threads (the single
 * authoritative source). Alerts and Recommendations are derived deterministically
 * from open threads; nothing new is persisted and no competing intelligence
 * source is created. The LLM is never involved in deriving these facts.
 */

export type ThreadType =
  | "UNRESOLVED_FOLLOW_UP"
  | "REPEATED_PATTERN"
  | "CHANGE_DETECTION"
  | "MISSING_THREAD"
  | "PREVENTIVE_RECOMMENDATION";
export type ThreadSeverity = "LOW" | "MEDIUM" | "HIGH";
export type ThreadStatus = "OPEN" | "ACKNOWLEDGED" | "DISMISSED" | "RESOLVED";

export interface AttentionThread {
  id: string;
  type: ThreadType;
  severity: ThreadSeverity;
  title: string;
  summary: string;
  recommendation: string | null;
  evidence: { recordId: string; recordType: string; date: string }[];
  status: ThreadStatus;
  lastDetectedISO: string;
}

const SEV_RANK: Record<ThreadSeverity, number> = { HIGH: 0, MEDIUM: 1, LOW: 2 };

/** Alerts = still-open threads (OPEN or ACKNOWLEDGED), most severe first. */
export function openAttention(threads: AttentionThread[]): AttentionThread[] {
  return threads
    .filter((t) => t.status === "OPEN" || t.status === "ACKNOWLEDGED")
    .sort(
      (a, b) =>
        SEV_RANK[a.severity] - SEV_RANK[b.severity] ||
        b.lastDetectedISO.localeCompare(a.lastDetectedISO),
    );
}

/** Recommendations = open threads that carry a deterministic recommendation. */
export function attentionRecommendations(threads: AttentionThread[]): AttentionThread[] {
  return openAttention(threads).filter((t) => !!t.recommendation);
}

/** Deep-link target most relevant to a thread type. */
export function threadDeepLink(type: ThreadType): string {
  switch (type) {
    case "UNRESOLVED_FOLLOW_UP":
      return "/patient/appointments";
    case "REPEATED_PATTERN":
      return "/patient/timeline";
    case "CHANGE_DETECTION":
    case "MISSING_THREAD":
    case "PREVENTIVE_RECOMMENDATION":
      return "/patient/labs";
  }
}
