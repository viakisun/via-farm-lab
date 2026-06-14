import { Chip } from '../components/Chip';
import { cardStyle, PageHeader } from '../components/Page';
import { C, CHIP, FONT_MONO, FONT_UI } from '../data/derive';

interface MarketRow {
  readonly item: string;
  readonly grade: string;
  readonly unit: string;
  readonly price: string;
  readonly date: string;
  readonly conf: string;
  readonly kind: keyof typeof CHIP;
}

const ROWS: MarketRow[] = [
  {
    item: 'Sydney Markets · Butterhead',
    grade: 'Premium',
    unit: 'kg',
    price: 'A$6.80',
    date: '13/06',
    conf: 'Matched',
    kind: 'measured',
  },
  {
    item: 'Wholesale AU · Red Oak',
    grade: 'Standard',
    unit: 'kg',
    price: 'A$5.40',
    date: '13/06',
    conf: 'Approx',
    kind: 'estimated',
  },
  {
    item: 'Sydney Markets · Cos',
    grade: 'Premium',
    unit: 'box (4kg)',
    price: 'A$6.10',
    date: '12/06',
    conf: 'Matched',
    kind: 'measured',
  },
  {
    item: 'Sydney Markets · Green Coral',
    grade: 'Extra',
    unit: 'kg',
    price: 'A$7.30',
    date: '13/06',
    conf: 'Matched',
    kind: 'measured',
  },
  {
    item: 'Direct buyer',
    grade: '—',
    unit: 'pack',
    price: 'A$7.20',
    date: '10/06',
    conf: 'Manual',
    kind: 'manual',
  },
];

const btn = (accent: boolean) =>
  ({
    padding: accent ? '8px 16px' : '8px 15px',
    borderRadius: 9,
    background: accent ? C.lime : 'rgba(255,255,255,.05)',
    font: `${accent ? 700 : 600} 13px ${FONT_UI}`,
    color: accent ? C.bg : C.ink2,
    cursor: 'pointer',
    whiteSpace: 'nowrap',
  }) as const;

export function Market() {
  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', gap: 16 }}>
      <PageHeader
        title="Market Feed"
        subtitle="Map wholesale prices by item, grade and unit, and manage scenarios."
        right={
          <div style={{ display: 'flex', gap: 9 }}>
            <div style={btn(false)}>Sources</div>
            <div style={btn(true)}>Update now</div>
          </div>
        }
      />
      <div style={{ display: 'flex', gap: 16 }}>
        <div
          style={{
            flex: 1,
            ...cardStyle,
            padding: '18px 22px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div>
            <div style={{ font: `400 12px ${FONT_MONO}`, color: C.muted2 }}>
              Benchmark · Sydney Markets butterhead premium
            </div>
            <div style={{ font: `800 32px ${FONT_UI}`, marginTop: 4 }}>
              A$6.80 <span style={{ fontSize: 14, color: C.muted2 }}>/kg</span>
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ font: `700 18px ${FONT_UI}`, color: C.lime }}>▲ 4.2%</div>
            <div style={{ font: `400 11px ${FONT_MONO}`, color: C.faint }}>vs yesterday</div>
          </div>
        </div>
        <div style={{ flex: 1.3, ...cardStyle, padding: '18px 22px' }}>
          <div style={{ font: `400 12px ${FONT_MONO}`, color: C.muted2 }}>14-day trend · A$/kg</div>
          <svg
            viewBox="0 0 420 56"
            style={{ width: '100%', height: 52, marginTop: 6 }}
            preserveAspectRatio="none"
          >
            <polyline
              points="0,42 32,38 64,44 96,40 128,32 160,36 192,28 224,30 256,22 288,26 320,20 352,24 384,16 420,14"
              fill="none"
              stroke={C.lime}
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <circle cx="420" cy="14" r="3.5" fill={C.lime} />
          </svg>
        </div>
      </div>
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
          <div style={{ flex: 1.4 }}>Market · item</div>
          <div style={{ flex: 1 }}>Grade</div>
          <div style={{ flex: 1 }}>Unit</div>
          <div style={{ flex: 1 }}>A$/kg</div>
          <div style={{ flex: 1 }}>Date</div>
          <div style={{ width: 110, textAlign: 'right' }}>Confidence</div>
        </div>
        {ROWS.map((r) => (
          <div
            key={r.item}
            style={{
              display: 'flex',
              alignItems: 'center',
              padding: '14px 24px',
              borderBottom: `1px solid ${C.line2}`,
              flex: 1,
            }}
          >
            <div style={{ flex: 1.4, font: `600 14px ${FONT_UI}` }}>{r.item}</div>
            <div style={{ flex: 1, font: `500 13px ${FONT_UI}`, color: C.muted }}>{r.grade}</div>
            <div style={{ flex: 1, font: `500 13px ${FONT_UI}`, color: C.muted }}>{r.unit}</div>
            <div style={{ flex: 1, font: `700 15px ${FONT_UI}` }}>{r.price}</div>
            <div style={{ flex: 1, font: `400 13px ${FONT_MONO}`, color: C.muted }}>{r.date}</div>
            <div style={{ width: 110, textAlign: 'right' }}>
              <Chip chip={CHIP[r.kind]}>{r.conf}</Chip>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
