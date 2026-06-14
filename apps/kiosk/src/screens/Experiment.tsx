import { C, FONT_MONO, FONT_UI } from '../theme';

const card = { background: C.card, border: `1px solid ${C.line}`, borderRadius: 22 } as const;

const DLI_BARS = ['B-1 · 12h × 300', 'A-1 · 16h × 225', 'A-2 · 20h × 180', 'B-2 · 24h × 150'];
const CONTROLS: [string, string, string][] = [
  ['EC · target 1.5', '1.52', 'mS/cm'],
  ['pH · target 6.0', '6.03', ''],
  ['Temp · target 22', '22.1', '°C'],
  ['Humidity · target 65', '64', '%RH'],
];
const SCHEDULE = [
  '3×/week · Mon·Wed·Fri',
  '10:30 fixed',
  '5 plants/treatment',
  'Non-destructive → destructive',
];
const GOALS: [string, boolean][] = [
  ['DLI equivalence held (4× 12.96)', true],
  ['PPFD within ±5% of target', true],
  ['EC/pH within target range', true],
  ['Temp/humidity controlled', true],
  ['Log time·cause·recovery on deviation (in progress)', false],
];

export function Experiment() {
  return (
    <div
      style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        gap: 16,
        width: '100%',
        minHeight: 0,
      }}
    >
      <div
        style={{
          background: 'linear-gradient(140deg,#172A20,#10201A)',
          border: '1px solid rgba(166,226,107,.20)',
          borderRadius: 22,
          padding: '20px 26px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div>
          <div style={{ font: `700 12px ${FONT_MONO}`, letterSpacing: '1.5px', color: C.lime }}>
            NORTH STAR METRIC
          </div>
          <div style={{ font: `700 22px ${FONT_UI}`, marginTop: 6 }}>
            Market-Adjusted Gross Profit per Bed-Day
          </div>
        </div>
        <div
          style={{
            font: `500 17px ${FONT_MONO}`,
            color: C.ink2,
            background: 'rgba(8,16,12,.45)',
            padding: '14px 20px',
            borderRadius: 14,
          }}
        >
          ( sellable yield × wholesale price − variable input cost ) ÷ Bed-Days
        </div>
      </div>

      <div style={{ flex: 1, display: 'flex', gap: 16, minHeight: 0 }}>
        <div style={{ flex: 1.35, display: 'flex', flexDirection: 'column', gap: 16, minWidth: 0 }}>
          <div style={{ ...card, padding: '24px 26px' }}>
            <div style={{ font: `700 13px ${FONT_MONO}`, letterSpacing: '1px', color: C.muted2 }}>
              HYPOTHESIS
            </div>
            <div style={{ font: `600 26px/1.4 ${FONT_UI}`, marginTop: 12, color: C.ink }}>
              Holding DLI fixed at <b style={{ color: C.lime }}>12.96 mol·m⁻²·d⁻¹</b> and varying
              only photoperiod across <b style={{ color: C.lime }}>12·16·20·24h</b>, find the
              photoperiod that delivers the highest{' '}
              <b style={{ color: C.lime }}>profitability (Profit/Bed-Day)</b>.
            </div>
          </div>
          <div style={{ ...card, padding: '22px 26px', flex: 1 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ font: `700 15px ${FONT_UI}`, color: C.ink2 }}>
                DLI Equality · light-dose verification
              </div>
              <div style={{ font: `400 12px ${FONT_MONO}`, color: C.faint }}>
                DLI = PPFD × hours × 3600 ÷ 1,000,000
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginTop: 20 }}>
              {DLI_BARS.map((label) => (
                <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                  <div style={{ width: 150, font: `600 15px ${FONT_UI}`, color: C.ink }}>
                    {label}
                  </div>
                  <div
                    style={{
                      flex: 1,
                      height: 14,
                      borderRadius: 7,
                      background: 'rgba(255,255,255,.06)',
                      overflow: 'hidden',
                    }}
                  >
                    <div
                      style={{
                        width: '100%',
                        height: '100%',
                        background: 'linear-gradient(90deg,#6FB7E8,#A6E26B)',
                      }}
                    />
                  </div>
                  <div
                    style={{
                      width: 130,
                      textAlign: 'right',
                      font: `700 15px ${FONT_MONO}`,
                      color: C.lime,
                    }}
                  >
                    12.96 ✓
                  </div>
                </div>
              ))}
            </div>
            <div
              style={{
                marginTop: 20,
                padding: '12px 16px',
                borderRadius: 12,
                background: 'rgba(166,226,107,.08)',
                font: `500 14px ${FONT_UI}`,
                color: C.lime,
              }}
            >
              All four treatments hold the same DLI — photoperiod is the only independent variable.
            </div>
          </div>
        </div>

        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 16, minWidth: 0 }}>
          <div style={{ ...card, padding: '20px 22px' }}>
            <div style={{ font: `700 15px ${FONT_UI}`, color: C.ink2 }}>Controlled Variables</div>
            <div
              style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 14 }}
            >
              {CONTROLS.map(([k, v, u]) => (
                <div
                  key={k}
                  style={{ background: 'rgba(8,16,12,.4)', borderRadius: 12, padding: '12px 14px' }}
                >
                  <div style={{ font: `400 11px ${FONT_MONO}`, color: C.muted2 }}>{k}</div>
                  <div style={{ font: `700 22px ${FONT_UI}`, color: C.lime }}>
                    {v} {u && <span style={{ fontSize: 12, color: C.muted2 }}>{u}</span>}
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div style={{ ...card, padding: '20px 22px' }}>
            <div style={{ font: `700 15px ${FONT_UI}`, color: C.ink2 }}>Survey Schedule</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 14 }}>
              {SCHEDULE.map((s) => (
                <span
                  key={s}
                  style={{
                    padding: '8px 14px',
                    borderRadius: 999,
                    background: 'rgba(8,16,12,.5)',
                    font: `600 13px ${FONT_UI}`,
                    color: C.ink2,
                  }}
                >
                  {s}
                </span>
              ))}
            </div>
          </div>
          <div style={{ ...card, padding: '20px 22px', flex: 1 }}>
            <div style={{ font: `700 15px ${FONT_UI}`, color: C.ink2 }}>Validation Goals</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 11, marginTop: 14 }}>
              {GOALS.map(([label, done]) => (
                <div
                  key={label}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    font: `500 14px ${FONT_UI}`,
                    color: done ? C.ink2 : C.muted,
                  }}
                >
                  <span
                    style={{
                      width: 20,
                      height: 20,
                      borderRadius: 6,
                      background: done ? 'rgba(166,226,107,.18)' : 'rgba(233,196,92,.18)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: done ? C.lime : C.amber,
                      fontSize: 13,
                    }}
                  >
                    {done ? '✓' : '…'}
                  </span>
                  {label}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
