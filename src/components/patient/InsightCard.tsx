import { AlertTriangle, Repeat, TrendingUp, GitBranch, ShieldPlus } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { InsightPayload } from "@/ai/schemas/insight";

const TYPE_ICON: Record<InsightPayload["type"], LucideIcon> = {
  UNRESOLVED_FOLLOW_UP: AlertTriangle,
  REPEATED_PATTERN: Repeat,
  CHANGE_DETECTION: TrendingUp,
  MISSING_THREAD: GitBranch,
  PREVENTIVE_RECOMMENDATION: ShieldPlus,
};

const SEVERITY_STYLE: Record<InsightPayload["severity"], string> = {
  HIGH: "bg-danger/10 text-danger border-danger/20",
  MEDIUM: "bg-warning/10 text-warning border-warning/20",
  LOW: "bg-muted text-muted-foreground border-border",
};

export interface InsightCardProps {
  insight: InsightPayload;
  typeLabel: string;
  severityLabel: string;
  recommendationLabel: string;
  evidenceLabel: string;
}

export function InsightCard({
  insight,
  typeLabel,
  severityLabel,
  recommendationLabel,
  evidenceLabel,
}: InsightCardProps) {
  const Icon = TYPE_ICON[insight.type];
  return (
    <article className="rounded-2xl border border-border bg-card p-5 shadow-sm transition hover:shadow-md">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <Icon className="h-[18px] w-[18px]" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-medium text-muted-foreground">{typeLabel}</span>
            <span
              className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold ${SEVERITY_STYLE[insight.severity]}`}
            >
              {severityLabel}
            </span>
          </div>
          <h3 className="mt-1 text-base font-semibold leading-snug">{insight.title}</h3>
          <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{insight.summary}</p>

          {insight.recommendation && (
            <p className="mt-3 rounded-xl bg-accent/10 px-3 py-2 text-sm text-foreground">
              <span className="font-semibold text-accent">{recommendationLabel}: </span>
              {insight.recommendation}
            </p>
          )}

          {insight.evidence.length > 0 && (
            <div className="mt-3 flex flex-wrap items-center gap-1.5">
              <span className="text-[11px] font-medium text-muted-foreground">
                {evidenceLabel}:
              </span>
              {insight.evidence.map((e) => (
                <span
                  key={e.recordId}
                  title={`${e.recordType} · ${e.date.slice(0, 10)}`}
                  className="rounded-md border border-border bg-muted px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground"
                >
                  {e.recordType}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </article>
  );
}
