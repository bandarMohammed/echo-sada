"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import {
  Activity,
  FlaskConical,
  Pill,
  FileText,
  GitBranch,
  CalendarDays,
  AlertTriangle,
  Stethoscope,
  type LucideIcon,
} from "lucide-react";
import { Link } from "@/i18n/navigation";
import type { TimelineKind } from "@/domain/journey/timeline";

export interface TimelineItem {
  id: string;
  kind: TimelineKind;
  dateISO: string;
  title: string;
  subtitle?: string;
  recordType: string;
  recordId: string;
  attention: boolean;
}

const KIND_ICON: Record<TimelineKind, LucideIcon> = {
  ENCOUNTER: Stethoscope,
  LAB: FlaskConical,
  MEDICATION: Pill,
  REPORT: FileText,
  REFERRAL: GitBranch,
  APPOINTMENT: CalendarDays,
  FOLLOW_UP: AlertTriangle,
  SYMPTOM: Activity,
};

export function TimelineView({
  events,
  showAskEcho = true,
}: {
  events: TimelineItem[];
  showAskEcho?: boolean;
}) {
  const t = useTranslations("timeline");
  const [filter, setFilter] = useState<TimelineKind | "ALL">("ALL");

  const kinds = useMemo(
    () => Array.from(new Set(events.map((e) => e.kind))),
    [events],
  );
  const shown = filter === "ALL" ? events : events.filter((e) => e.kind === filter);

  const fmt = (iso: string) =>
    new Intl.DateTimeFormat("en-CA").format(new Date(iso));

  return (
    <div>
      {/* Filter chips */}
      <div className="mb-5 flex flex-wrap gap-2">
        <Chip active={filter === "ALL"} onClick={() => setFilter("ALL")}>
          {t("all")}
        </Chip>
        {kinds.map((k) => {
          const Icon = KIND_ICON[k];
          return (
            <Chip key={k} active={filter === k} onClick={() => setFilter(k)}>
              <Icon className="h-3.5 w-3.5" />
              {k.toLowerCase().replace("_", " ")}
            </Chip>
          );
        })}
      </div>

      {shown.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t("empty")}</p>
      ) : (
        <ol className="relative ms-3 border-s border-border">
          {shown.map((e) => {
            const Icon = KIND_ICON[e.kind];
            return (
              <li key={e.id} className="mb-5 ms-6">
                <span
                  className={`absolute -start-3 flex h-6 w-6 items-center justify-center rounded-full ring-4 ring-background ${
                    e.attention ? "bg-warning text-white" : "bg-primary/10 text-primary"
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                </span>
                <div className="rounded-xl border border-border bg-card px-4 py-2.5 shadow-sm">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs text-muted-foreground">{fmt(e.dateISO)}</span>
                    {e.attention && (
                      <span className="rounded-full bg-warning/10 px-2 py-0.5 text-[10px] font-semibold text-warning">
                        !
                      </span>
                    )}
                  </div>
                  <div className="mt-0.5 font-medium leading-snug">{e.title}</div>
                  {e.subtitle && (
                    <div className="text-xs capitalize text-muted-foreground">
                      {e.subtitle.toLowerCase().replace(/_/g, " ")}
                    </div>
                  )}
                  {showAskEcho && e.attention && (
                    <Link
                      href={{ pathname: "/patient/chat", query: { q: e.title } }}
                      className="mt-2 inline-block text-xs font-semibold text-primary hover:underline"
                    >
                      {t("askEcho")} →
                    </Link>
                  )}
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium capitalize transition ${
        active
          ? "border-primary bg-primary text-primary-foreground"
          : "border-border bg-card text-muted-foreground hover:text-foreground"
      }`}
    >
      {children}
    </button>
  );
}
