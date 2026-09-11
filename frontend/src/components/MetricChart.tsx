import { useMemo } from "react";
import { useI18n } from "@/i18n";

export interface ChartPoint {
  label: string;
  value: number | null;
}

export interface MetricChartProps {
  title: string;
  points: ChartPoint[];
  color?: string;
}

const WIDTH = 560;
const HEIGHT = 200;
const PAD_X = 40;
const PAD_Y = 18;
const INNER_W = WIDTH - PAD_X * 2;
const INNER_H = HEIGHT - PAD_Y * 2;

/** Lightweight, dependency-free SVG line chart for metric evolution. */
export function MetricChart({ title, points, color = "#5b8cff" }: MetricChartProps) {
  const { t, number } = useI18n();

  const visible = points.filter((p): p is ChartPoint & { value: number } => p.value !== null);

  const geom = useMemo(() => {
    if (visible.length === 0) {
      return null;
    }
    const values = visible.map((p) => p.value);
    let min = Math.min(...values);
    let max = Math.max(...values);
    if (min === max) {
      min -= 1;
      max += 1;
    }
    const span = max - min || 1;

    const coords = visible.map((p, i) => ({
      x: PAD_X + (i / Math.max(1, visible.length - 1)) * INNER_W,
      y: PAD_Y + (1 - (p.value - min) / span) * INNER_H,
      point: p
    }));

    return {
      coords,
      min,
      max,
      span,
      grid: Array.from({ length: 5 }, (_, i) => ({
        value: max - ((max - min) / 4) * i,
        y: PAD_Y + (i / 4) * INNER_H
      }))
    };
  }, [visible]);

  const summary = useMemo(() => {
    if (visible.length === 0) return t("chart.empty");
    const first = visible[0]!.value;
    const last = visible[visible.length - 1]!.value;
    const dir = last > first ? t("chart.up") : last < first ? t("chart.down") : t("chart.stable");
    return `${t("chart.from")} ${number(first, { maximumFractionDigits: 1 })} ${t("chart.to")} ${number(last, { maximumFractionDigits: 1 })} (${dir})`;
  }, [visible, number, t]);

  if (!geom) {
    return (
      <div className="chart chart--empty">
        <h3 className="chart__title">{title}</h3>
        <p className="chart__empty">{t("chart.empty")}</p>
      </div>
    );
  }

  const line = geom.coords
    .map((c, i) => `${i === 0 ? "M" : "L"}${c.x.toFixed(1)},${c.y.toFixed(1)}`)
    .join(" ");

  return (
    <div className="chart">
      <h3 className="chart__title">{title}</h3>
      <p className="chart__summary">{summary}</p>
      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        role="img"
        aria-label={`${title}: ${summary}`}
        className="chart__svg"
      >
        {geom.grid.map((g, i) => (
          <g key={i}>
            <line x1={PAD_X} x2={WIDTH - PAD_X} y1={g.y} y2={g.y} stroke="#2a3242" strokeDasharray="4 4" />
            <text x={PAD_X - 6} y={g.y + 4} textAnchor="end" fontSize="10" fill="#9aa5b8">
              {number(g.value, { maximumFractionDigits: 1 })}
            </text>
          </g>
        ))}

        <polyline
          points={line}
          fill="none"
          stroke={color}
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {geom.coords.map((c, i) => (
          <circle key={i} cx={c.x} cy={c.y} r="3.5" fill={color}>
            <title>{`${c.point.label}: ${number(c.point.value, { maximumFractionDigits: 1 })}`}</title>
          </circle>
        ))}

        {geom.coords.map((c, i) =>
          i % 2 === 0 || i === geom.coords.length - 1 ? (
            <text key={`l${i}`} x={c.x} y={HEIGHT - 6} textAnchor="middle" fontSize="9" fill="#9aa5b8">
              {c.point.label}
            </text>
          ) : null
        )}
      </svg>
    </div>
  );
}