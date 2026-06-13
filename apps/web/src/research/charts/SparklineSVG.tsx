// Tiny SVG sparkline — no external deps. Accepts a fixed-domain time series
// and renders a single polyline, optional threshold band, and optional dot
// at the latest point.
import type { JSX } from 'react';

export interface SparklinePoint {
  readonly x: number;
  readonly y: number;
}

export interface SparklineProps {
  readonly points: readonly SparklinePoint[];
  /** Pixel size. */
  readonly width: number;
  readonly height: number;
  /** Y-axis fixed domain (sparklines need stable axes to be readable). */
  readonly yMin: number;
  readonly yMax: number;
  /** Optional ±tolerance band rendered as a semi-opaque rect. */
  readonly band?: { readonly min: number; readonly max: number };
  /** Line stroke colour (CSS). */
  readonly stroke?: string;
  /** Band fill colour (CSS). */
  readonly bandFill?: string;
  /** Show a marker on the last point. */
  readonly showLastDot?: boolean;
}

export function SparklineSVG({
  points,
  width,
  height,
  yMin,
  yMax,
  band,
  stroke = 'var(--color-success-500)',
  bandFill = 'rgba(74, 222, 128, 0.12)',
  showLastDot = true,
}: SparklineProps): JSX.Element {
  if (points.length === 0) {
    return <svg width={width} height={height} aria-hidden="true" />;
  }
  const xs = points.map((p) => p.x);
  const xMin = Math.min(...xs);
  const xMax = Math.max(...xs);
  const xRange = xMax - xMin || 1;
  const yRange = yMax - yMin || 1;

  const px = (x: number): number => ((x - xMin) / xRange) * width;
  const py = (y: number): number => height - ((y - yMin) / yRange) * height;

  const d = points
    .map((p, i) => `${i === 0 ? 'M' : 'L'}${px(p.x).toFixed(2)},${py(p.y).toFixed(2)}`)
    .join(' ');

  const last = points[points.length - 1];

  return (
    <svg width={width} height={height} role="img" aria-label="Sparkline">
      {band && (
        <rect
          x={0}
          y={py(band.max)}
          width={width}
          height={py(band.min) - py(band.max)}
          fill={bandFill}
        />
      )}
      <path d={d} stroke={stroke} strokeWidth={1.4} fill="none" />
      {showLastDot && last && <circle cx={px(last.x)} cy={py(last.y)} r={2.2} fill={stroke} />}
    </svg>
  );
}
