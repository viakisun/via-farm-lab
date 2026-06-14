import { C, FONT_MONO, FONT_UI } from '../theme';

const R = 46;
const CIRC = 2 * Math.PI * R; // ≈ 289

/** Circular progress ring (matches the design's SVG gauges). pct is 0..1. */
export function RingGauge({
  pct,
  color = C.lime,
  size = 118,
  main,
  sub,
  mainSize = 30,
}: {
  readonly pct: number;
  readonly color?: string;
  readonly size?: number;
  readonly main: string;
  readonly sub: string;
  readonly mainSize?: number;
}) {
  const offset = CIRC * (1 - Math.max(0, Math.min(1, pct)));
  return (
    <svg width={size} height={size} viewBox="0 0 120 120">
      <circle cx="60" cy="60" r={R} fill="none" stroke="rgba(255,255,255,.08)" strokeWidth="11" />
      <circle
        cx="60"
        cy="60"
        r={R}
        fill="none"
        stroke={color}
        strokeWidth="11"
        strokeLinecap="round"
        strokeDasharray={CIRC.toFixed(0)}
        strokeDashoffset={offset.toFixed(1)}
        transform="rotate(-90 60 60)"
      />
      <text
        x="60"
        y={mainSize > 28 ? 58 : 56}
        textAnchor="middle"
        fontFamily={FONT_UI}
        fontWeight="800"
        fontSize={mainSize}
        fill={C.ink}
      >
        {main}
      </text>
      <text
        x="60"
        y={mainSize > 28 ? 78 : 76}
        textAnchor="middle"
        fontFamily={FONT_MONO}
        fontSize="10"
        fill={C.muted2}
      >
        {sub}
      </text>
    </svg>
  );
}
