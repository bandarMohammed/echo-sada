"use client";

import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ReferenceArea,
  CartesianGrid,
} from "recharts";

export interface LabPoint {
  date: string; // ISO
  value: number;
}

export function LabTrendChart({
  points,
  refLow,
  refHigh,
  unit,
}: {
  points: LabPoint[];
  refLow: number | null;
  refHigh: number | null;
  unit: string | null;
}) {
  const data = points.map((p) => ({
    d: p.date.slice(0, 7), // YYYY-MM
    value: p.value,
    out:
      (refHigh != null && p.value > refHigh) || (refLow != null && p.value < refLow),
  }));

  return (
    <ResponsiveContainer width="100%" height={170}>
      <LineChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -18 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
        {refLow != null && refHigh != null && (
          <ReferenceArea
            y1={refLow}
            y2={refHigh}
            fill="var(--success)"
            fillOpacity={0.08}
            stroke="none"
          />
        )}
        <XAxis
          dataKey="d"
          tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
          tickLine={false}
          axisLine={{ stroke: "var(--border)" }}
        />
        <YAxis
          tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
          tickLine={false}
          axisLine={false}
          width={38}
          domain={["auto", "auto"]}
        />
        <Tooltip
          contentStyle={{
            background: "var(--card)",
            border: "1px solid var(--border)",
            borderRadius: 12,
            fontSize: 12,
            color: "var(--foreground)",
          }}
          formatter={(v) => [`${v} ${unit ?? ""}`, ""]}
          labelStyle={{ color: "var(--muted-foreground)" }}
        />
        <Line
          type="monotone"
          dataKey="value"
          stroke="var(--primary)"
          strokeWidth={2.25}
          dot={(props: { cx?: number; cy?: number; payload?: { out?: boolean } }) => {
            const { cx, cy, payload } = props;
            if (cx == null || cy == null) return <g />;
            return (
              <circle
                cx={cx}
                cy={cy}
                r={3.5}
                fill={payload?.out ? "var(--danger)" : "var(--primary)"}
                stroke="var(--card)"
                strokeWidth={1.5}
              />
            );
          }}
          activeDot={{ r: 5 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
