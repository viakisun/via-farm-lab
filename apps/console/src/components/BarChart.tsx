import { C, FONT_MONO, FONT_UI } from '../data/derive';

export interface Bar {
  readonly label: string;
  readonly val: string;
  readonly h: string; // CSS height, e.g. "84%"
  readonly color: string;
  readonly sub?: string; // optional caption under the label (e.g. count)
}

/** Vertical bar chart used by the Dashboard and Analytics modules. */
export function BarChart({ bars, gap = 28 }: { readonly bars: Bar[]; readonly gap?: number }) {
  return (
    <div
      style={{ flex: 1, display: 'flex', alignItems: 'flex-end', gap, padding: '24px 12px 8px' }}
    >
      {bars.map((b) => (
        <div
          key={b.label}
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 9,
            height: '100%',
            justifyContent: 'flex-end',
          }}
        >
          <div style={{ font: `700 14px ${FONT_UI}`, color: b.color }}>{b.val}</div>
          <div
            style={{ width: '100%', borderRadius: '8px 8px 0 0', background: b.color, height: b.h }}
          />
          <div style={{ font: `700 14px ${FONT_UI}`, color: C.ink }}>{b.label}</div>
          {b.sub !== undefined && (
            <div style={{ font: `400 11px ${FONT_MONO}`, color: C.faint }}>{b.sub}</div>
          )}
        </div>
      ))}
    </div>
  );
}
