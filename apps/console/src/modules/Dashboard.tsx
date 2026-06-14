import { BarChart, type Bar } from '../components/BarChart';
import { cardStyle } from '../components/Page';
import { DATASET } from '../data/dataset';
import { audK, audRate, C, FONT_MONO, FONT_UI, portfolio } from '../data/derive';

const pf = portfolio(DATASET);

const bars: Bar[] = pf.byPeriod.map((b) => ({
  label: b.p + 'h',
  val: audRate(b.ppbd),
  sub: b.count + ' exps',
  h: Math.round((b.ppbd / pf.maxBarPpbd) * 100) + '%',
  color: b.p === 20 ? C.lime : 'rgba(166,226,107,0.35)',
}));

interface Activity {
  readonly dot: string;
  readonly text: string;
  readonly time: string;
}
const activity: Activity[] = [
  { dot: C.lime, text: 'VF-103 (A-2 20h) confirmed as recommended recipe', time: '09:42' },
  { dot: C.amber, text: 'M3 Photoperiod A-2 · EC spike recovered', time: '07:10' },
  { dot: C.sky, text: 'Market feed updated (Sydney Markets +4.2%)', time: '09:40' },
  { dot: C.lime, text: 'VF-118 Cos season marked complete', time: '12/06' },
  { dot: C.muted2, text: 'Power meter still Pending · estimated mode', time: '12/06' },
  { dot: C.sky, text: 'Nutrient recipe Lettuce Std v1.2 published', time: '11/06' },
];

const kpiLabel = { font: `400 12px ${FONT_MONO}`, color: C.muted2 } as const;

export function Dashboard() {
  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* KPI row */}
      <div style={{ display: 'flex', gap: 16 }}>
        <div
          style={{
            flex: 1,
            background: 'linear-gradient(140deg,#172A20,#10201A)',
            border: '1px solid rgba(166,226,107,.22)',
            borderRadius: 16,
            padding: '18px 20px',
          }}
        >
          <div style={kpiLabel}>Recommended recipe</div>
          <div style={{ font: `800 22px ${FONT_UI}`, marginTop: 6 }}>
            {pf.recExp.bed} · {pf.recExp.p}h photoperiod
          </div>
          <div style={{ font: `600 13px ${FONT_UI}`, color: C.lime, marginTop: 3 }}>
            Profit/Bed-Day {audRate(pf.recExp.ppbd)}
          </div>
        </div>
        <div style={{ flex: 1, ...cardStyle, padding: '18px 20px' }}>
          <div style={kpiLabel}>Avg Profit/Bed-Day</div>
          <div style={{ font: `800 28px ${FONT_UI}`, marginTop: 6 }}>{audRate(pf.avgPpbd)}</div>
          <div style={{ font: `600 13px ${FONT_UI}`, color: C.lime, marginTop: 3 }}>
            across 20 completed
          </div>
        </div>
        <div style={{ flex: 1, ...cardStyle, padding: '18px 20px' }}>
          <div style={kpiLabel}>Cumulative profit (completed)</div>
          <div style={{ font: `800 28px ${FONT_UI}`, marginTop: 6 }}>{audK(pf.totalProfit)}</div>
          <div style={{ font: `600 13px ${FONT_UI}`, color: C.muted, marginTop: 3 }}>
            Avg cost {audRate(pf.avgCostKg)}/kg
          </div>
        </div>
        <div
          style={{
            flex: 1,
            ...cardStyle,
            padding: '18px 20px',
            display: 'flex',
            alignItems: 'center',
            gap: 16,
          }}
        >
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: '50%',
              background: 'conic-gradient(#A6E26B 288deg, rgba(255,255,255,.08) 0)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <div
              style={{
                width: 46,
                height: 46,
                borderRadius: '50%',
                background: C.card,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                font: `800 16px ${FONT_UI}`,
              }}
            >
              25
            </div>
          </div>
          <div>
            <div style={{ font: `600 14px ${FONT_UI}`, color: C.lime }}>Completed 20</div>
            <div style={{ font: `600 14px ${FONT_UI}`, color: C.amber, marginTop: 2 }}>
              Running 5
            </div>
          </div>
        </div>
      </div>

      {/* Lower row */}
      <div style={{ flex: 1, display: 'flex', gap: 16, minHeight: 0 }}>
        <div
          style={{
            flex: 1.3,
            ...cardStyle,
            padding: '20px 22px',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <div style={{ font: `700 16px ${FONT_UI}` }}>Profit/Bed-Day by photoperiod</div>
          <BarChart bars={bars} />
        </div>
        <div
          style={{
            flex: 1,
            ...cardStyle,
            padding: '20px 22px',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <div style={{ font: `700 16px ${FONT_UI}` }}>Recent activity</div>
          <div style={{ display: 'flex', flexDirection: 'column', marginTop: 12, flex: 1 }}>
            {activity.map((a, i) => (
              <div
                key={i}
                style={{
                  display: 'flex',
                  gap: 13,
                  padding: '11px 0',
                  borderBottom: `1px solid rgba(255,255,255,.05)`,
                  alignItems: 'center',
                }}
              >
                <span
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    flexShrink: 0,
                    background: a.dot,
                  }}
                />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      font: `600 13px ${FONT_UI}`,
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    {a.text}
                  </div>
                </div>
                <span style={{ font: `400 11px ${FONT_MONO}`, color: C.faint, flexShrink: 0 }}>
                  {a.time}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
