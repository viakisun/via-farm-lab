import { BarChart, type Bar } from '../components/BarChart';
import { cardStyle, PageHeader } from '../components/Page';
import { DATASET } from '../data/dataset';
import { audRate, C, FONT_MONO, FONT_UI, portfolio } from '../data/derive';

const pf = portfolio(DATASET);

const bars: Bar[] = pf.byPeriod.map((b) => ({
  label: b.p + 'h',
  val: audRate(b.ppbd),
  h: Math.round((b.ppbd / pf.maxBarPpbd) * 100) + '%',
  color: b.p === 20 ? C.lime : 'rgba(166,226,107,0.35)',
}));

function Kpi({
  label,
  value,
  note,
  gradient = false,
  valueColor,
}: {
  label: string;
  value: string;
  note: string;
  gradient?: boolean;
  valueColor?: string;
}) {
  return (
    <div
      style={{
        flex: 1,
        ...(gradient
          ? {
              background: 'linear-gradient(140deg,#172A20,#10201A)',
              border: '1px solid rgba(166,226,107,.22)',
            }
          : cardStyle),
        borderRadius: 14,
        padding: '16px 18px',
      }}
    >
      <div style={{ font: `400 11px ${FONT_MONO}`, color: C.muted2 }}>{label}</div>
      <div style={{ font: `800 24px ${FONT_UI}`, color: valueColor ?? C.ink, marginTop: 3 }}>
        {value}
      </div>
      <div
        style={{
          font: `600 12px ${FONT_UI}`,
          color: note.includes('best') ? C.lime : C.muted,
          marginTop: 2,
        }}
      >
        {note}
      </div>
    </div>
  );
}

export function Analytics() {
  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', gap: 16 }}>
      <PageHeader
        title="Analytics Lab"
        subtitle="Aggregate 20 completed by photoperiod — compare growth, resource efficiency and economics."
        alignEnd={false}
      />
      <div style={{ display: 'flex', gap: 16 }}>
        <Kpi label="Energy efficiency · g/kWh" value="7.9" note="20h best" />
        <Kpi label="Water efficiency · g/L" value="22.4" note="avg" />
        <Kpi label="Nutrient efficiency · g/L" value="48.1" note="avg" />
        <Kpi
          label="Recommended · Final Score"
          value="A-2 · 87.4"
          note="20h photoperiod"
          gradient
          valueColor={C.lime}
        />
      </div>
      <div style={{ flex: 1, display: 'flex', gap: 16, minHeight: 0 }}>
        <div
          style={{
            flex: 1,
            ...cardStyle,
            padding: '20px 22px',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <div style={{ font: `700 15px ${FONT_UI}` }}>Avg Profit/Bed-Day by photoperiod</div>
          <BarChart bars={bars} gap={24} />
        </div>
        <div
          style={{
            flex: 1.15,
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
              padding: '14px 22px',
              borderBottom: `1px solid ${C.line}`,
            }}
          >
            <div style={{ width: 64 }}>Photo.</div>
            <div style={{ flex: 1, textAlign: 'right' }}>Count</div>
            <div style={{ flex: 1, textAlign: 'right' }}>P/Bed-Day</div>
            <div style={{ flex: 1, textAlign: 'right' }}>FW</div>
            <div style={{ flex: 1, textAlign: 'right' }}>Tipburn</div>
            <div style={{ flex: 1, textAlign: 'right' }}>A$/kg</div>
          </div>
          {pf.byPeriod.map((b) => (
            <div
              key={b.p}
              style={{
                display: 'flex',
                alignItems: 'center',
                padding: '16px 22px',
                borderBottom: `1px solid ${C.line2}`,
                flex: 1,
                background: b.p === 20 ? 'rgba(166,226,107,0.06)' : 'transparent',
              }}
            >
              <div
                style={{
                  width: 64,
                  font: `800 16px ${FONT_UI}`,
                  color: b.p === 20 ? C.lime : C.ink,
                }}
              >
                {b.p}h
              </div>
              <div
                style={{ flex: 1, textAlign: 'right', font: `500 14px ${FONT_UI}`, color: C.muted }}
              >
                {b.count}
              </div>
              <div style={{ flex: 1, textAlign: 'right', font: `700 15px ${FONT_UI}` }}>
                {audRate(b.ppbd)}
              </div>
              <div
                style={{ flex: 1, textAlign: 'right', font: `500 14px ${FONT_UI}`, color: C.muted }}
              >
                {b.fw} g
              </div>
              <div
                style={{
                  flex: 1,
                  textAlign: 'right',
                  font: `500 14px ${FONT_UI}`,
                  color: b.tip > 8 ? C.amber : C.muted,
                }}
              >
                {b.tip}%
              </div>
              <div
                style={{ flex: 1, textAlign: 'right', font: `500 14px ${FONT_UI}`, color: C.muted }}
              >
                {audRate(b.cpk)}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
