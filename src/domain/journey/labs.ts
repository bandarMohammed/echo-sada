/**
 * Lab time-series assembly. Shared by the patient Labs screen and the doctor
 * patient view so the grouping/sorting logic lives in exactly one place.
 */

export interface LabRecordLike {
  analyte: string;
  panel: string;
  unit: string | null;
  refLow: number | null;
  refHigh: number | null;
  valueNum: number | null;
  flag: string;
  takenAt: Date;
}

export interface AnalyteSeriesPoint {
  date: string; // ISO
  value: number;
}

export interface AnalyteSeries {
  analyte: string;
  panel: string;
  unit: string | null;
  refLow: number | null;
  refHigh: number | null;
  latestValue: number | null;
  latestFlag: string;
  latestDate: string;
  points: AnalyteSeriesPoint[];
}

/** Group labs by analyte into time series, abnormal-latest first. */
export function buildAnalyteSeries(labs: LabRecordLike[]): AnalyteSeries[] {
  const byAnalyte = new Map<string, LabRecordLike[]>();
  for (const l of labs) {
    const arr = byAnalyte.get(l.analyte) ?? [];
    arr.push(l);
    byAnalyte.set(l.analyte, arr);
  }

  const series: AnalyteSeries[] = [...byAnalyte.entries()].map(([analyte, rows]) => {
    const sorted = [...rows].sort((a, b) => a.takenAt.getTime() - b.takenAt.getTime());
    const latest = sorted[sorted.length - 1];
    const ref = sorted.find((r) => r.refLow != null && r.refHigh != null) ?? latest;
    return {
      analyte,
      panel: latest.panel,
      unit: latest.unit,
      refLow: ref.refLow,
      refHigh: ref.refHigh,
      latestValue: latest.valueNum,
      latestFlag: latest.flag,
      latestDate: latest.takenAt.toISOString(),
      points: sorted
        .filter((r) => r.valueNum != null)
        .map((r) => ({ date: r.takenAt.toISOString(), value: r.valueNum as number })),
    };
  });

  series.sort((a, b) => {
    const abn = (s: AnalyteSeries) => (s.latestFlag !== "NORMAL" ? 0 : 1);
    if (abn(a) !== abn(b)) return abn(a) - abn(b);
    if (b.points.length !== a.points.length) return b.points.length - a.points.length;
    return a.analyte.localeCompare(b.analyte);
  });

  return series;
}
