"use client";

import { useTransition } from "react";
import { useTranslations } from "next-intl";
import {
  AlertTriangle,
  Repeat,
  TrendingUp,
  GitBranch,
  ShieldPlus,
  type LucideIcon,
} from "lucide-react";
import { Link, useRouter } from "@/i18n/navigation";
import { setThreadStatusAction } from "@/app/actions/threads";

export interface ThreadDTO {
  id: string;
  type:
    | "UNRESOLVED_FOLLOW_UP"
    | "REPEATED_PATTERN"
    | "CHANGE_DETECTION"
    | "MISSING_THREAD"
    | "PREVENTIVE_RECOMMENDATION";
  severity: "LOW" | "MEDIUM" | "HIGH";
  title: string;
  summary: string;
  recommendation: string | null;
  evidence: { recordId: string; recordType: string; date: string }[];
  status: "OPEN" | "ACKNOWLEDGED" | "DISMISSED" | "RESOLVED";
  lastDetected: string;
}

const TYPE_ICON: Record<ThreadDTO["type"], LucideIcon> = {
  UNRESOLVED_FOLLOW_UP: AlertTriangle,
  REPEATED_PATTERN: Repeat,
  CHANGE_DETECTION: TrendingUp,
  MISSING_THREAD: GitBranch,
  PREVENTIVE_RECOMMENDATION: ShieldPlus,
};

const STATUS_STYLE: Record<ThreadDTO["status"], string> = {
  OPEN: "bg-warning/10 text-warning border-warning/20",
  ACKNOWLEDGED: "bg-accent/10 text-accent border-accent/20",
  DISMISSED: "bg-muted text-muted-foreground border-border",
  RESOLVED: "bg-success/10 text-success border-success/20",
};

export function ClinicalThreadCard({
  thread,
  persona,
  askEchoBasePath,
}: {
  thread: ThreadDTO;
  persona: "PATIENT" | "DOCTOR";
  askEchoBasePath?: string;
}) {
  const t = useTranslations("threads");
  const tType = useTranslations("insightType");
  const tSev = useTranslations("severity");
  const router = useRouter();
  const [pending, start] = useTransition();

  const Icon = TYPE_ICON[thread.type];
  const isPatient = persona === "PATIENT";
  const resolved = thread.status === "RESOLVED" || thread.status === "DISMISSED";

  const setStatus = (status: ThreadDTO["status"]) =>
    start(async () => {
      await setThreadStatusAction(thread.id, status);
      router.refresh();
    });

  const headline = isPatient ? t(`patientHeadline.${thread.type}`) : thread.title;

  return (
    <article
      className={`rounded-2xl border bg-card p-5 shadow-sm ${resolved ? "border-border opacity-75" : "border-border"}`}
    >
      <div className="flex items-start gap-3">
        <span className="mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <Icon className="h-[18px] w-[18px]" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-medium text-muted-foreground">
              {tType(thread.type)}
            </span>
            <span
              className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold ${STATUS_STYLE[thread.status]}`}
            >
              {t(`status.${thread.status}`)}
            </span>
            {!isPatient && (
              <span className="text-[11px] text-muted-foreground">
                {tSev(thread.severity)}
              </span>
            )}
          </div>

          <h3 className="mt-1 text-base font-semibold leading-snug">{headline}</h3>

          {isPatient ? (
            <>
              <p className="mt-1 text-sm text-foreground">
                {t(`patientGuidance.${thread.type}`)}
              </p>
              <p className="mt-2 rounded-xl bg-muted px-3 py-2 text-sm text-muted-foreground">
                <span className="font-semibold">{t("whatEcho")}: </span>
                {thread.summary}
              </p>
            </>
          ) : (
            <>
              <p className="mt-1 text-sm text-muted-foreground">{thread.summary}</p>
              {thread.recommendation && (
                <p className="mt-2 rounded-xl bg-accent/10 px-3 py-2 text-sm">
                  {thread.recommendation}
                </p>
              )}
            </>
          )}

          {thread.evidence.length > 0 && (
            <div className="mt-3 flex flex-wrap items-center gap-1.5">
              <span className="text-[11px] font-medium text-muted-foreground">
                {t("evidence")}:
              </span>
              {thread.evidence.map((e) => (
                <span
                  key={e.recordId}
                  title={`${e.recordType} · ${e.date.slice(0, 10)}`}
                  className="rounded-md border border-border bg-background px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground"
                >
                  {e.recordType}
                </span>
              ))}
            </div>
          )}

          {/* Actions */}
          <div className="mt-4 flex flex-wrap items-center gap-2">
            {thread.status === "OPEN" && (
              <ActionButton
                onClick={() => setStatus("ACKNOWLEDGED")}
                disabled={pending}
                label={t("actions.acknowledge")}
              />
            )}
            {(thread.status === "OPEN" || thread.status === "ACKNOWLEDGED") && (
              <ActionButton
                onClick={() => setStatus("RESOLVED")}
                disabled={pending}
                label={t("actions.resolve")}
                primary
              />
            )}
            {resolved && (
              <ActionButton
                onClick={() => setStatus("OPEN")}
                disabled={pending}
                label={t("actions.reopen")}
              />
            )}
            {isPatient && askEchoBasePath && (
              <Link
                href={{ pathname: askEchoBasePath, query: { q: thread.title } }}
                className="ms-auto text-xs font-semibold text-primary hover:underline"
              >
                {t("askEcho")} →
              </Link>
            )}
          </div>
        </div>
      </div>
    </article>
  );
}

function ActionButton({
  onClick,
  disabled,
  label,
  primary,
}: {
  onClick: () => void;
  disabled: boolean;
  label: string;
  primary?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition disabled:opacity-40 ${
        primary
          ? "bg-primary text-primary-foreground hover:opacity-90"
          : "border border-border bg-background text-foreground hover:bg-muted"
      }`}
    >
      {label}
    </button>
  );
}
