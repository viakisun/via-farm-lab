import { Clickable } from '../components/Clickable';
import { Pill } from '../components/Pill';
import { RingGauge } from '../components/RingGauge';
import { TREATMENT_ORDER, TREATMENTS, type TreatmentId } from '../data';
import { audAmt, audRate, C, FONT_MONO, FONT_UI } from '../theme';

const card = { background: C.card, border: `1px solid ${C.line}`, borderRadius: 22 } as const;
const monoLabel = {
  font: `400 12px ${FONT_MONO}`,
  color: C.muted2,
  letterSpacing: '.5px',
} as const;
const tile = {
  background: 'rgba(8,16,12,.4)',
  border: `1px solid ${C.line2}`,
  borderRadius: 16,
  padding: '14px 18px',
} as const;

const COST_STACK: [string, number, string][] = [
  ['Power', 38, C.amber],
  ['Labour', 22, C.lime],
  ['Nutrient', 18, C.sky],
  ['Seed', 9, C.coral],
  ['Water', 6, C.teal],
  ['Other', 7, C.faint],
];

const IMPROVE: [string, string, string][] = [
  ['vs Control 16h', '▲ 12.4%', C.lime],
  ['vs previous season', '▲ 7.1%', C.lime],
  ['vs Target', '▼ 2.0%', C.amber],
];

export function Economic({
  selected,
  onSelect,
}: {
  selected: TreatmentId;
  onSelect: (id: TreatmentId) => void;
}) {
  const t = TREATMENTS[selected];
  return (
    <div style={{ flex: 1, display: 'flex', gap: 20, minHeight: 0, width: '100%' }}>
      {/* LEFT */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 16, minWidth: 0 }}>
        <div
          style={{
            background: 'linear-gradient(140deg,#172A20,#10201A)',
            border: '1px solid rgba(166,226,107,.20)',
            borderRadius: 26,
            padding: '26px 30px',
            display: 'flex',
            flexDirection: 'column',
            gap: 18,
          }}
        >
          <div style={{ display: 'flex', gap: 26 }}>
            <div style={{ flex: 1.5, display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span
                  style={{
                    padding: '6px 13px',
                    borderRadius: 999,
                    font: `700 13px ${FONT_UI}`,
                    color: C.bg,
                    background: t.best ? C.lime : C.sky,
                  }}
                >
                  {t.best ? 'Recommended recipe' : 'Selected candidate'}
                </span>
                <span
                  style={{ font: `400 13px ${FONT_MONO}`, letterSpacing: '.5px', color: C.muted }}
                >
                  Projected Gross Profit · wholesale-adjusted
                </span>
              </div>
              <div
                style={{ font: `800 74px/1 ${FONT_UI}`, letterSpacing: '-1.5px', marginTop: 14 }}
              >
                {audAmt(t.profit)}
              </div>
              <div style={{ font: `500 17px ${FONT_UI}`, color: C.muted, marginTop: 10 }}>
                Candidate <b style={{ color: C.ink }}>{t.id}</b> · photoperiod {t.photo} · PPFD{' '}
                {t.ppfd} μmol
              </div>
              <div style={{ font: `500 15px ${FONT_UI}`, color: C.muted2, marginTop: 4 }}>
                {t.note}
              </div>
            </div>
            <div
              style={{
                width: 316,
                background: 'rgba(8,16,12,.45)',
                border: '1px solid rgba(255,255,255,.05)',
                borderRadius: 18,
                padding: '16px 18px',
                display: 'flex',
                flexDirection: 'column',
              }}
            >
              <div
                style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}
              >
                <span style={{ ...monoLabel }}>PROFIT / BED-DAY TREND</span>
                <span style={{ font: `700 16px ${FONT_UI}`, color: C.lime }}>
                  {audRate(t.ppbd)}
                </span>
              </div>
              <svg
                viewBox="0 0 280 96"
                style={{ width: '100%', height: 96, marginTop: 8 }}
                preserveAspectRatio="none"
              >
                <polyline
                  points="0,72 35,64 70,68 105,52 140,56 175,40 210,44 245,26 280,22"
                  fill="none"
                  stroke={C.lime}
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <polyline
                  points="0,72 35,64 70,68 105,52 140,56 175,40 210,44 245,26 280,22 280,96 0,96"
                  fill="rgba(166,226,107,.10)"
                  stroke="none"
                />
                <circle cx="280" cy="22" r="4" fill={C.lime} />
              </svg>
              <div style={{ font: `400 12px ${FONT_MONO}`, color: C.faint, marginTop: 2 }}>
                Last 9 surveys · A$/bed-day
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 14 }}>
            {[
              ['PROFIT / BED-DAY', audRate(t.ppbd), 'space·time efficiency', C.lime],
              ['INPUT COST / KG', audRate(t.costkg), 'input cost per kg', C.muted],
              ['SELLABLE YIELD', t.yld.toFixed(1) + ' kg', `sellable rate ${t.sellable}%`, C.muted],
              ['DAYS TO HARVEST', 'D-14', 'DAT 28 · bed-days 42', C.muted],
            ].map(([label, val, sub, subColor]) => (
              <div key={label} style={{ flex: 1, ...tile }}>
                <div style={{ ...monoLabel }}>{label}</div>
                <div style={{ font: `700 28px ${FONT_UI}`, marginTop: 6 }}>{val}</div>
                <div style={{ font: `500 13px ${FONT_UI}`, color: subColor, marginTop: 2 }}>
                  {sub}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0 2px',
          }}
        >
          <div style={{ font: `700 15px ${FONT_UI}`, color: C.ink2 }}>
            Treatment Portfolio · profitability by treatment{' '}
            <span style={{ color: C.faint, fontWeight: 400 }}>
              — tap a card to compare candidates
            </span>
          </div>
          <div style={{ font: `400 12px ${FONT_MONO}`, color: C.faint }}>
            Profit Index = Profit/bed-day scaled to 100
          </div>
        </div>

        <div style={{ display: 'flex', gap: 14, flex: 1, minHeight: 0 }}>
          {TREATMENT_ORDER.map((id) => {
            const c = TREATMENTS[id];
            const on = selected === id;
            return (
              <Clickable
                key={id}
                onClick={() => onSelect(id)}
                ariaLabel={`Select treatment ${id}`}
                style={{
                  flex: 1,
                  background: on ? C.raised : C.card,
                  border: `2px solid ${on ? C.lime : C.line}`,
                  borderRadius: 22,
                  padding: 18,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 10,
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    width: '100%',
                  }}
                >
                  <div>
                    <div style={{ font: `800 26px ${FONT_UI}` }}>{c.id}</div>
                    <div style={{ font: `400 12px ${FONT_MONO}`, color: C.muted }}>
                      {c.photo} · PPFD {c.ppfd}
                    </div>
                  </div>
                  {c.badge && (
                    <span
                      style={{
                        padding: '4px 10px',
                        borderRadius: 999,
                        font: `700 11px ${FONT_UI}`,
                        color: c.badge === 'BEST' ? C.bg : c.badgeColor,
                        background: c.badge === 'BEST' ? C.lime : `${c.badgeColor}24`,
                      }}
                    >
                      {c.badge}
                    </span>
                  )}
                </div>
                <div style={{ display: 'flex', justifyContent: 'center' }}>
                  <RingGauge
                    pct={c.score / 100}
                    color={c.ringColor}
                    main={String(c.score)}
                    sub="Profit Index"
                  />
                </div>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    font: `500 13px ${FONT_UI}`,
                    color: C.muted,
                    width: '100%',
                  }}
                >
                  <span>Fresh weight</span>
                  <b style={{ color: c.fwColor ?? C.ink }}>{c.fw} g</b>
                </div>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    font: `500 13px ${FONT_UI}`,
                    color: C.muted,
                    width: '100%',
                  }}
                >
                  <span>Disorder</span>
                  <b style={{ color: c.disorder > 8 ? C.amber : C.ink }}>{c.disorder}%</b>
                </div>
                <div
                  style={{
                    marginTop: 'auto',
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 7,
                    padding: '7px 11px',
                    borderRadius: 10,
                    background: `${c.statusColor}1f`,
                    font: `600 12px ${FONT_UI}`,
                    color: c.statusColor,
                  }}
                >
                  <span
                    style={{ width: 6, height: 6, borderRadius: '50%', background: c.statusColor }}
                  />
                  {c.statusText}
                </div>
              </Clickable>
            );
          })}
        </div>
      </div>

      {/* RIGHT */}
      <div style={{ width: 638, display: 'flex', flexDirection: 'column', gap: 16, minHeight: 0 }}>
        <div style={{ ...card, padding: '20px 22px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ font: `700 15px ${FONT_UI}`, color: C.ink2 }}>Wholesale Price</div>
            <Pill
              color={C.lime}
              bg="rgba(166,226,107,.10)"
              border="1px solid rgba(166,226,107,.28)"
              dot
              size={12}
            >
              Sydney Markets · Measured
            </Pill>
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 16, marginTop: 14 }}>
            <div style={{ font: `800 46px/1 ${FONT_UI}`, letterSpacing: '-1px' }}>
              A$6.80<span style={{ fontSize: 22, color: C.muted2, fontWeight: 600 }}> /kg</span>
            </div>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '6px 12px',
                borderRadius: 999,
                background: 'rgba(166,226,107,.12)',
                font: `700 14px ${FONT_UI}`,
                color: C.lime,
                marginBottom: 6,
              }}
            >
              ▲ 4.2% vs yesterday
            </div>
          </div>
          <div style={{ font: `400 13px ${FONT_MONO}`, color: C.muted2, marginTop: 10 }}>
            Butterhead premium · per-kg · updated 09:40
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
            {[
              ['LOW', 'A$6.10', false],
              ['BASE', 'A$6.80', true],
              ['HIGH', 'A$7.50', false],
            ].map(([k, v, hi]) => (
              <div
                key={k as string}
                style={{
                  flex: 1,
                  background: hi ? 'rgba(166,226,107,.10)' : 'rgba(8,16,12,.4)',
                  border: hi ? '1px solid rgba(166,226,107,.25)' : 'none',
                  borderRadius: 12,
                  padding: '9px 12px',
                }}
              >
                <div style={{ font: `400 11px ${FONT_MONO}`, color: hi ? C.muted2 : C.faint }}>
                  {k}
                </div>
                <div style={{ font: `700 16px ${FONT_UI}`, color: hi ? C.lime : C.muted }}>{v}</div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ display: 'flex', gap: 16 }}>
          <div
            style={{
              flex: 1,
              ...card,
              padding: 20,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
            }}
          >
            <div style={{ font: `700 14px ${FONT_UI}`, color: C.ink2, alignSelf: 'flex-start' }}>
              Cycle Time
            </div>
            <div style={{ margin: '8px 0' }}>
              <RingGauge
                pct={0.67}
                color={C.sky}
                size={128}
                main="D-14"
                sub="to harvest"
                mainSize={28}
              />
            </div>
            <div style={{ font: `500 13px ${FONT_UI}`, color: C.muted, textAlign: 'center' }}>
              28 days after transplant (DAT)
              <br />
              Est. harvest 27/06 · bed-days 42
            </div>
          </div>
          <div
            style={{
              flex: 1,
              ...card,
              padding: 20,
              display: 'flex',
              flexDirection: 'column',
              gap: 12,
            }}
          >
            <div style={{ font: `700 14px ${FONT_UI}`, color: C.ink2 }}>Improvement</div>
            {IMPROVE.map(([k, v, col], i) => (
              <div key={k}>
                {i > 0 && (
                  <div
                    style={{ height: 1, background: 'rgba(255,255,255,.06)', marginBottom: 12 }}
                  />
                )}
                <div
                  style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                >
                  <span style={{ font: `500 14px ${FONT_UI}`, color: C.muted }}>{k}</span>
                  <span style={{ font: `700 20px ${FONT_UI}`, color: col }}>{v}</span>
                </div>
              </div>
            ))}
            <div style={{ font: `400 11px ${FONT_MONO}`, color: C.faint, marginTop: 'auto' }}>
              compared on Profit per Bed-Day
            </div>
          </div>
        </div>

        <div style={{ ...card, padding: '20px 22px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
            <div style={{ font: `700 15px ${FONT_UI}`, color: C.ink2 }}>Input Cost Stack</div>
            <div style={{ font: `700 16px ${FONT_UI}`, color: C.ink }}>
              A$43.50 <span style={{ font: `400 12px ${FONT_MONO}`, color: C.muted2 }}>/bed</span>
            </div>
          </div>
          <div
            style={{
              display: 'flex',
              height: 22,
              borderRadius: 8,
              overflow: 'hidden',
              marginTop: 14,
              gap: 2,
            }}
          >
            {COST_STACK.map(([k, w, col]) => (
              <div key={k} style={{ width: `${w}%`, background: col }} />
            ))}
          </div>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr 1fr',
              gap: '8px 16px',
              marginTop: 14,
            }}
          >
            {COST_STACK.map(([k, w, col]) => (
              <div
                key={k}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  font: `500 13px ${FONT_UI}`,
                  color: C.muted,
                }}
              >
                <span style={{ width: 9, height: 9, borderRadius: 3, background: col }} />
                {k} <b style={{ color: C.ink, marginLeft: 'auto' }}>{w}%</b>
              </div>
            ))}
          </div>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 7,
              marginTop: 14,
              padding: '6px 12px',
              borderRadius: 8,
              border: '1px dashed rgba(233,196,92,.5)',
              font: `500 12px ${FONT_MONO}`,
              color: C.amber,
            }}
          >
            ⚠ Power 38% — partly Estimated (power meter Pending)
          </div>
        </div>

        <div
          style={{
            ...card,
            padding: '18px 22px',
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            gap: 12,
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ font: `700 15px ${FONT_UI}`, color: C.ink2 }}>Verification</div>
            <div style={{ font: `400 11px ${FONT_MONO}`, color: C.faint }}>
              Measured 6 · Estimated 1 · Pending 1
            </div>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {['DLI 12.96 ✓', 'PPFD target ✓', 'EC/pH ✓', 'Climate ✓'].map((x) => (
              <Pill
                key={x}
                color={C.lime}
                bg="rgba(166,226,107,.10)"
                border="1px solid rgba(166,226,107,.30)"
                dot
              >
                {x}
              </Pill>
            ))}
            <Pill color={C.amber} bg="transparent" border="1px dashed rgba(233,196,92,.55)" dot>
              Power Estimated
            </Pill>
            <Pill
              color={C.muted2}
              bg="transparent"
              border="1px dashed rgba(94,116,104,.6)"
              dot={C.faint}
            >
              Flow Pending
            </Pill>
          </div>
          <div
            style={{
              marginTop: 'auto',
              display: 'flex',
              alignItems: 'center',
              gap: 16,
              paddingTop: 10,
              borderTop: '1px solid rgba(255,255,255,.06)',
              font: `400 12px ${FONT_MONO}`,
              color: C.faint,
            }}
          >
            <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ width: 9, height: 9, borderRadius: '50%', background: C.lime }} />
              Measured
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span
                style={{
                  width: 9,
                  height: 9,
                  borderRadius: '50%',
                  border: `1.5px dashed ${C.amber}`,
                }}
              />
              Estimated
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span
                style={{
                  width: 9,
                  height: 9,
                  borderRadius: '50%',
                  border: `1.5px dashed ${C.faint}`,
                }}
              />
              Pending
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
