"use client";

import { useTranslations } from "next-intl";
import { LabTrendChart } from "./LabTrendChart";
import type { AnalyteSeries } from "@/domain/journey/labs";

export type { AnalyteSeries };

const FLAG_STYLE: Record<string, string> = {
  HIGH: "bg-danger/10 text-danger",
  CRITICAL: "bg-danger/15 text-danger",
  LOW: "bg-warning/10 text-warning",
  NORMAL: "bg-success/10 text-success",
};

export function LabResultsView({ series }: { series: AnalyteSeries[] }) {
  const t = useTranslations("labs");

  if (series.length === 0) {
    return <p className="text-sm text-muted-foreground">{t("noData")}</p>;
  }

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {series.map((s) => (
        <div key={s.analyte} className="rounded-2xl border border-border bg-card p-4 shadow-sm">
          <div className="mb-2 flex items-start justify-between gap-2">
            <div>
              <h3 className="font-semibold leading-tight">{s.analyte}</h3>
              <p className="text-xs text-muted-foreground">{s.panel}</p>
            </div>
            <div className="text-end">
              <div className="flex items-center gap-1.5">
                <span className="text-lg font-bold">
                  {s.latestValue ?? "—"}
                  <span className="ms-1 text-xs font-normal text-muted-foreground">
                    {s.unit}
                  </span>
                </span>
                <span
                  className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                    FLAG_STYLE[s.latestFlag] ?? "bg-muted text-muted-foreground"
                  }`}
                >
                  {s.latestFlag}
                </span>
              </div>
              {s.refLow != null && s.refHigh != null && (
                <div className="text-[11px] text-muted-foreground">
                  {t("referenceRange")}: {s.refLow}–{s.refHigh}
                </div>
              )}
            </div>
          </div>

          {s.points.length >= 2 ? (
            <LabTrendChart
              points={s.points}
              refLow={s.refLow}
              refHigh={s.refHigh}
              unit={s.unit}
            />
          ) : (
            <p className="py-6 text-center text-xs text-muted-foreground">
              1 {t("measurements")}
            </p>
          )}
        </div>
      ))}
    </div>
  );
}
