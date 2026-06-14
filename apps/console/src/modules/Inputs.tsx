import { Chip } from '../components/Chip';
import { cardStyle, PageHeader } from '../components/Page';
import { C, CHIP, FONT_MONO, FONT_UI } from '../data/derive';

interface InputRow {
  readonly group: string;
  readonly fields: string;
  readonly cost: string;
  readonly status: string;
  readonly kind: keyof typeof CHIP;
}

const ROWS: InputRow[] = [
  {
    group: 'Biological · Seed',
    fields: 'Green Coral lettuce · lot BH-2406-A · 96% germ. · 96 plugs',
    cost: 'A$0.32 /plug',
    status: 'Manual',
    kind: 'manual',
  },
  {
    group: 'Light',
    fields: 'Photoperiod 20h · PPFD 180 · DLI 12.96 · MX20 18W',
    cost: 'Metered',
    status: 'Measured',
    kind: 'measured',
  },
  {
    group: 'Nutrient',
    fields: 'Lettuce Std v1.2 · Solution A:B 1:1 · EC 1.5 / pH 6.0',
    cost: 'A$0.05 /L',
    status: 'Measured',
    kind: 'measured',
  },
  {
    group: 'Water',
    fields: 'Source 42 L · top-up 18 L · drain 9 L · net est.',
    cost: 'A$1.20 /kL',
    status: 'Pending',
    kind: 'pending',
  },
  {
    group: 'Energy',
    fields: 'LED 14.2 · pump 1.1 · HVAC 6.8 kWh · allocation rule',
    cost: 'A$0.13 /kWh',
    status: 'Estimated',
    kind: 'estimated',
  },
  {
    group: 'Labour',
    fields: 'SOP 22 min/visit · cycle 42 d · bed-days 42',
    cost: 'A$11.00 /h',
    status: 'Manual',
    kind: 'manual',
  },
  {
    group: 'Market',
    fields: 'Sydney Markets butterhead premium · per-kg · 09:40',
    cost: 'A$6.80 /kg',
    status: 'Measured',
    kind: 'measured',
  },
];

export function Inputs() {
  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', gap: 16 }}>
      <PageHeader
        title="Input Registry"
        subtitle="Register experimental, biological, resource and market inputs and link them to cost."
        right={
          <div
            style={{
              padding: '8px 16px',
              borderRadius: 9,
              background: C.lime,
              font: `700 13px ${FONT_UI}`,
              color: C.bg,
              cursor: 'pointer',
              whiteSpace: 'nowrap',
            }}
          >
            + Add input
          </div>
        }
      />
      <div
        style={{
          flex: 1,
          ...cardStyle,
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <div
          style={{
            display: 'flex',
            font: `400 11px ${FONT_MONO}`,
            color: C.faint,
            letterSpacing: '.5px',
            padding: '14px 24px',
            borderBottom: `1px solid ${C.line}`,
          }}
        >
          <div style={{ width: 190 }}>Group</div>
          <div style={{ flex: 1 }}>Key fields</div>
          <div style={{ width: 140 }}>Unit / cost</div>
          <div style={{ width: 124, textAlign: 'right' }}>Status</div>
        </div>
        {ROWS.map((r) => (
          <div
            key={r.group}
            style={{
              display: 'flex',
              alignItems: 'center',
              padding: '15px 24px',
              borderBottom: `1px solid ${C.line2}`,
              flex: 1,
            }}
          >
            <div style={{ width: 190, font: `700 15px ${FONT_UI}` }}>{r.group}</div>
            <div style={{ flex: 1, font: `500 13px ${FONT_UI}`, color: C.muted }}>{r.fields}</div>
            <div style={{ width: 140, font: `600 14px ${FONT_UI}` }}>{r.cost}</div>
            <div style={{ width: 124, textAlign: 'right' }}>
              <Chip chip={CHIP[r.kind]}>{r.status}</Chip>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
