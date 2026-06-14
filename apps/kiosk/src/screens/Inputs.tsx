import { Pill } from '../components/Pill';
import { C, FONT_MONO, FONT_UI } from '../theme';

type ChipKey = 'manual' | 'verified' | 'measured' | 'flow' | 'estimated';
const CHIP: Record<ChipKey, { text: string; color: string; bg: string; border: string }> = {
  manual: {
    text: 'Manual',
    color: C.sky,
    bg: 'rgba(111,183,232,.12)',
    border: '1px solid rgba(111,183,232,.3)',
  },
  verified: {
    text: 'Verified',
    color: C.lime,
    bg: 'rgba(166,226,107,.10)',
    border: '1px solid rgba(166,226,107,.3)',
  },
  measured: {
    text: 'Measured',
    color: C.lime,
    bg: 'rgba(166,226,107,.10)',
    border: '1px solid rgba(166,226,107,.3)',
  },
  flow: {
    text: 'Flow Pending',
    color: C.muted2,
    bg: 'transparent',
    border: '1px dashed rgba(94,116,104,.6)',
  },
  estimated: {
    text: 'Estimated',
    color: C.amber,
    bg: 'transparent',
    border: '1px dashed rgba(233,196,92,.55)',
  },
};

interface InputCard {
  readonly title: string;
  readonly chip: ChipKey;
  readonly rows: readonly (readonly [string, string, string?])[];
  readonly caption?: string;
}

const CARDS: InputCard[] = [
  {
    title: 'Biological · seed/crop',
    chip: 'manual',
    rows: [
      ['Crop / variety', 'Lettuce · Green Coral'],
      ['Seed lot', 'BH-2406-A'],
      ['Germination', '96%'],
      ['Transplant / plants', '16/05 · 96 plugs'],
      ['Density', '24 plants/m²'],
    ],
  },
  {
    title: 'Light · recipe',
    chip: 'verified',
    rows: [
      ['Photoperiod', '20 h'],
      ['PPFD / DLI', '180 · 12.96'],
      ['LED model', 'MX20 18W'],
      ['Runtime', '20 h/day'],
      ['Schedule', '06:00–02:00'],
    ],
  },
  {
    title: 'Nutrient',
    chip: 'measured',
    rows: [
      ['Recipe', 'Lettuce Std v1.2'],
      ['Solution A : B', '1 : 1 (2 mL/L)'],
      ['Target EC / pH', '1.5 · 6.0'],
      ['Batch volume', '200 L'],
      ['Unit cost', 'A$0.05 /L'],
    ],
  },
  {
    title: 'Water',
    chip: 'flow',
    rows: [
      ['Source water', '42 L'],
      ['Top-up / drain', '18 · 9 L'],
      ['Tank change', 'TL-136 −5%'],
      ['Net use (est.)', '51 L', C.amber],
    ],
    caption: 'Manual/estimated until flow sensor is installed',
  },
  {
    title: 'Energy',
    chip: 'estimated',
    rows: [
      ['LED (treatment)', '14.2 kWh'],
      ['Pump', '1.1 kWh'],
      ['HVAC (shared)', '6.8 kWh'],
      ['Fan', 'pending', C.muted2],
    ],
    caption: 'Allocation-rule estimate until power meter',
  },
  {
    title: 'Labour / Time',
    chip: 'manual',
    rows: [
      ['SOP time', '22 min/visit'],
      ['Survey labour', '3×/week'],
      ['Cycle days', '42 d'],
      ['Bed-days', '42'],
      ['Hourly', 'A$11.00'],
    ],
  },
];

const mono = (s: string) => /^[A-Z]{2}-?\d/.test(s) || s === 'MX20 18W';

export function Inputs() {
  const m = CHIP.measured;
  return (
    <div
      style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        gap: 14,
        width: '100%',
        minHeight: 0,
      }}
    >
      <div
        style={{
          background: C.card,
          border: `1px solid ${C.line}`,
          borderRadius: 20,
          padding: '16px 24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
          <div style={{ font: `700 14px ${FONT_UI}`, color: C.ink2 }}>Market Input · wholesale</div>
          <div style={{ font: `800 28px ${FONT_UI}` }}>
            A$6.80<span style={{ fontSize: 14, color: C.muted2, fontWeight: 600 }}> /kg</span>
          </div>
          <div style={{ font: `500 14px ${FONT_UI}`, color: C.muted }}>
            Sydney Markets · butterhead premium
          </div>
        </div>
        <Pill color={m.color} bg={m.bg} border={m.border} dot>
          Measured · 09:40
        </Pill>
      </div>

      <div
        style={{
          flex: 1,
          display: 'grid',
          gridTemplateColumns: '1fr 1fr 1fr',
          gridTemplateRows: '1fr 1fr',
          gap: 14,
          minHeight: 0,
        }}
      >
        {CARDS.map((c) => {
          const chip = CHIP[c.chip];
          return (
            <div
              key={c.title}
              style={{
                background: C.card,
                border: `1px solid ${C.line}`,
                borderRadius: 20,
                padding: '20px 22px',
                display: 'flex',
                flexDirection: 'column',
                gap: 11,
              }}
            >
              <div
                style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
              >
                <div style={{ font: `700 16px ${FONT_UI}`, whiteSpace: 'nowrap' }}>{c.title}</div>
                <span
                  style={{
                    flexShrink: 0,
                    whiteSpace: 'nowrap',
                    padding: '5px 11px',
                    borderRadius: 999,
                    background: chip.bg,
                    border: chip.border,
                    font: `600 12px ${FONT_UI}`,
                    color: chip.color,
                  }}
                >
                  {chip.text}
                </span>
              </div>
              {c.rows.map(([k, v, col]) => (
                <div
                  key={k}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    gap: 12,
                    whiteSpace: 'nowrap',
                    font: `500 14px ${FONT_UI}`,
                    color: C.muted,
                  }}
                >
                  <span>{k}</span>
                  <b style={{ color: col ?? C.ink, fontFamily: mono(v) ? FONT_MONO : FONT_UI }}>
                    {v}
                  </b>
                </div>
              ))}
              {c.caption && (
                <div style={{ font: `400 12px ${FONT_MONO}`, color: C.faint, marginTop: 'auto' }}>
                  {c.caption}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
