import type { CSSProperties } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";

export const GOOD = "#2bd576";
export const WARN = "#f0b429";
export const POOR = "#f2555a";
export const ACCENT = "#5b8cff";

function statusColor(status?: string | null): string {
  if (status === "good") return GOOD;
  if (status === "needs-improvement") return WARN;
  if (status === "poor") return POOR;
  return "#3c465a";
}

/* ---------- Hand-rolled lightweight widgets ---------- */

export function Sparkline({ points, color = ACCENT }: { points: number[]; color?: string }) {
  if (points.length < 2) return null;
  const w = 120;
  const h = 32;
  const min = Math.min(...points);
  const max = Math.max(...points);
  const span = max - min || 1;
  const coords = points.map((v, i) => ({
    x: (i / (points.length - 1)) * w,
    y: h - 3 - ((v - min) / span) * (h - 6)
  }));
  const last = coords[coords.length - 1]!;
  return (
    <svg className="sparkline" viewBox={`0 0 ${w} ${h}`} aria-hidden="true">
      <polyline
        points={coords.map((c) => `${c.x.toFixed(1)},${c.y.toFixed(1)}`).join(" ")}
        fill="none"
        stroke={color}
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx={last.x} cy={last.y} r="2.5" fill={color} />
    </svg>
  );
}

export function ScoreGauge({ value }: { value: number | null }) {
  const score = value === null ? 0 : Math.max(0, Math.min(100, Math.round(value)));
  const color = score >= 90 ? GOOD : score >= 50 ? WARN : POOR;
  const r = 44;
  const cx = 56;
  const cy = 54;
  const angle = -180 + (score / 100) * 180;
  const rad = (angle * Math.PI) / 180;
  const x = cx + r * Math.cos(rad);
  const y = cy + r * Math.sin(rad);

  return (
    <div className="gauge" role="img" aria-label={`Performance ${score}/100`}>
      <svg viewBox="0 0 112 60" className="gauge__svg">
        <path d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`} className="gauge__track" />
        <path d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${x} ${y}`} className="gauge__fill" style={{ stroke: color }} />
        <text x={cx} y={cy - 4} textAnchor="middle" className="gauge__value">{score}</text>
        <text x={cx} y={cy + 10} textAnchor="middle" className="gauge__label">/ 100</text>
      </svg>
    </div>
  );
}

/* ---------- Recharts widgets ---------- */

interface TooltipEntry {
  payload?: Array<{ name?: string; value?: number | string }>;
  label?: string;
}

function ChartTooltip({ active, payload, label }: { active?: boolean; payload?: unknown[]; label?: string }) {
  if (!active || !payload?.length) return null;
  const items = payload as Array<{ name?: string; value?: number | string }>;
  return (
    <div className="chart-tooltip">
      <strong>{label}</strong>
      {items.map((p, i) => {
        if (!p) return null;
        return (
          <div key={i}>
            <span>{p.name}:</span> <b>{String(p.value ?? "—")}</b>
          </div>
        );
      })}
    </div>
  );
}

export interface TrendPoint {
  label: string;
  [key: string]: unknown;
}

export function TrendChart({
  data,
  dataKey,
  color = ACCENT,
  goal,
  unit = ""
}: {
  data: TrendPoint[];
  dataKey: string;
  color?: string;
  goal?: number | null;
  unit?: string;
}) {
  if (data.length === 0) {
    return <div className="chart-empty">Sem dados suficientes para o período.</div>;
  }
  return (
    <ResponsiveContainer width="100%" height={260}>
      <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id={`grad-${dataKey}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.28} />
            <stop offset="100%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
        <XAxis dataKey="label" tick={{ fill: "var(--text-muted)", fontSize: 11 }} axisLine={{ stroke: "var(--border)" }} tickLine={false} interval="preserveStartEnd" />
        <YAxis tick={{ fill: "var(--text-muted)", fontSize: 11 }} axisLine={false} tickLine={false} width={40} />
        {goal !== undefined && goal !== null && (
          <ReferenceLine y={goal} stroke="var(--accent)" strokeDasharray="6 4" label={{ value: "Goal", fill: "var(--accent)", fontSize: 10, position: "insideTopRight" }} />
        )}
        <Area
          type="monotone"
          dataKey={dataKey}
          stroke={color}
          strokeWidth={2.4}
          fill={`url(#grad-${dataKey})`}
          dot={data.length <= 12 ? { r: 3, fill: color, strokeWidth: 0 } : false}
          activeDot={{ r: 5 }}
        />
        <Tooltip content={<ChartTooltip />} cursor={{ stroke: "var(--text-muted)", strokeOpacity: 0.4 }} />
      </AreaChart>
    </ResponsiveContainer>
  );
}

export function GroupedBars({
  data,
  keys,
  colors = [ACCENT, GOOD],
  unit = ""
}: {
  data: Array<Record<string, unknown>>;
  keys: string[];
  colors?: [string, string];
  unit?: string;
}) {
  return (
    <ResponsiveContainer width="100%" height={240}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
        <XAxis dataKey="metric" tick={{ fill: "var(--text-muted)", fontSize: 11 }} axisLine={{ stroke: "var(--border)" }} tickLine={false} />
        <YAxis tick={{ fill: "var(--text-muted)", fontSize: 11 }} axisLine={false} tickLine={false} width={40} unit={unit} />
        <Tooltip content={<ChartTooltip />} cursor={{ fill: "var(--bg-card)" }} />
        {keys.map((k, i) => (
          <Bar key={k} dataKey={k} fill={colors[i] ?? colors[0]} radius={[5, 5, 0, 0]} maxBarSize={44} />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
}

export function HorizontalBars({ data, color = POOR }: { data: Array<{ name: string; value: number; unit?: string }>; color?: string }) {
  return (
    <ResponsiveContainer width="100%" height={Math.max(140, data.length * 34)}>
      <BarChart data={data} layout="vertical" margin={{ top: 0, right: 24, left: 8, bottom: 0 }}>
        <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" horizontal={false} />
        <XAxis type="number" tick={{ fill: "var(--text-muted)", fontSize: 11 }} axisLine={false} tickLine={false} />
        <YAxis type="category" dataKey="name" tick={{ fill: "var(--text)", fontSize: 11 }} axisLine={false} tickLine={false} width={110} />
        <Tooltip content={<ChartTooltip />} cursor={{ fill: "var(--bg-card)" }} />
        <Bar dataKey="value" fill={color} radius={[0, 5, 5, 0]} maxBarSize={18} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function ResourceDonut({ data }: { data: Array<{ name: string; value: number }> }) {
  const COLORS = ["#5b8cff", "#2bd576", "#f0b429", "#f2555a", "#9aa5b8", "#7c5cff"];
  const total = data.reduce((s, d) => s + d.value, 0);
  return (
    <div className="donut">
      <ResponsiveContainer width="100%" height={180}>
        <PieChart>
          <Pie data={data} dataKey="value" nameKey="name" innerRadius={52} outerRadius={78} paddingAngle={2} strokeWidth={0}>
            {data.map((d, i) => (
              <Cell key={d.name} fill={COLORS[i % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip content={<ChartTooltip />} />
        </PieChart>
      </ResponsiveContainer>
      <ul className="donut__legend">
        {data.map((d, i) => (
          <li key={d.name}>
            <span className="donut__dot" style={{ background: COLORS[i % COLORS.length] }} />
            {`${d.name}  ${((d.value / (total || 1)) * 100).toFixed(0)}%`}
          </li>
        ))}
      </ul>
    </div>
  );
}

export function StatusSummaryBar({ counts }: { counts: { good: number; needs: number; poor: number } }) {
  const total = counts.good + counts.needs + counts.poor || 1;
  const style: CSSProperties = {
    width: `${(counts.good / total) * 100}%`
  };
  return (
    <div className="status-summary">
      <div className="status-summary__bar">
        <div className="status-summary__seg status-summary__seg--good" style={style} />
        <div
          className="status-summary__seg status-summary__seg--warn"
          style={{ width: `${(counts.needs / total) * 100}%` }}
        />
        <div
          className="status-summary__seg status-summary__seg--poor"
          style={{ width: `${(counts.poor / total) * 100}%` }}
        />
      </div>
      <div className="status-summary__labels">
        <span className="status-good">● Good <b>{counts.good}</b></span>
        <span className="status-warn">● Needs Improvement <b>{counts.needs}</b></span>
        <span className="status-poor">● Poor <b>{counts.poor}</b></span>
      </div>
    </div>
  );
}

export { statusColor, ChartTooltip };