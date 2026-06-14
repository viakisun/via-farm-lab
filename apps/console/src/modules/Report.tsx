import { cardStyle, PageHeader } from '../components/Page';
import { C, FONT_MONO, FONT_UI } from '../data/derive';

const heading = { font: `700 16px ${FONT_UI}`, color: C.lime } as const;
const body = {
  font: `500 15px/1.7 ${FONT_UI}`,
  color: C.ink2,
  marginTop: 8,
  textWrap: 'pretty',
} as const;

const checklist: [string, boolean][] = [
  ['Recommendation', true],
  ['Economic rationale', true],
  ['Confidence · validation', true],
  ['Appendix · raw data', false],
];

export function Report() {
  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', gap: 14 }}>
      <PageHeader
        title="Report Builder"
        subtitle="Generate a report with the recommended recipe, economic rationale, confidence and appendix."
        right={
          <div style={{ display: 'flex', gap: 9 }}>
            <div
              style={{
                padding: '8px 15px',
                borderRadius: 9,
                background: 'rgba(255,255,255,.05)',
                font: `600 13px ${FONT_UI}`,
                color: C.ink2,
                cursor: 'pointer',
                whiteSpace: 'nowrap',
              }}
            >
              Preview
            </div>
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
              Export PDF
            </div>
          </div>
        }
      />
      <div style={{ flex: 1, display: 'flex', gap: 16, minHeight: 0 }}>
        {/* DOCUMENT */}
        <div
          style={{
            flex: 1.5,
            background: '#0F1C16',
            border: '1px solid rgba(255,255,255,.07)',
            borderRadius: 16,
            padding: '32px 38px',
            overflowY: 'auto',
          }}
        >
          <div style={{ font: `400 12px ${FONT_MONO}`, color: C.muted2, letterSpacing: 1 }}>
            VIA FARM INTELLIGENCE · RECOMMENDATION REPORT
          </div>
          <div style={{ font: `800 28px ${FONT_UI}`, marginTop: 10, letterSpacing: '-.4px' }}>
            M2 Photoperiod Response — Recommended Recipe
          </div>
          <div style={{ font: `500 14px ${FONT_UI}`, color: C.muted, marginTop: 6 }}>
            13/06/2026 · M. Reid · Glasshouse A · Butterhead lettuce
          </div>
          <div style={{ height: 1, background: 'rgba(255,255,255,.08)', margin: '22px 0' }} />

          <div style={heading}>1. Recommendation</div>
          <div style={body}>
            We recommend <b style={{ color: C.ink }}>20h photoperiod (treatment A-2)</b> as the
            standard recipe for next season. Across four treatments holding DLI at 12.96, it ranks
            first at <b style={{ color: C.ink }}>Profit per Bed-Day A$9.80</b> —{' '}
            <b style={{ color: C.lime }}>+12.4%</b> vs the 16h control and{' '}
            <b style={{ color: C.lime }}>+7.1%</b> vs the previous season. 24h produced the largest
            fresh weight but lost points at the Quality Gate with 11% tipburn.
          </div>

          <div style={{ ...heading, marginTop: 22 }}>2. Economic rationale</div>
          <div
            style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginTop: 10 }}
          >
            {[
              ['Est. total profit', 'A$412'],
              ['Cost / kg', 'A$2.34'],
              ['Sellable yield', '18.6 kg'],
            ].map(([k, v]) => (
              <div
                key={k}
                style={{ background: 'rgba(8,16,12,.5)', borderRadius: 12, padding: '14px 16px' }}
              >
                <div style={{ font: `400 11px ${FONT_MONO}`, color: C.muted2 }}>{k}</div>
                <div style={{ font: `800 22px ${FONT_UI}`, marginTop: 3 }}>{v}</div>
              </div>
            ))}
          </div>

          <div style={{ ...heading, marginTop: 22 }}>3. Confidence · validation</div>
          <div style={body}>
            DLI equivalence, PPFD target, EC/pH and temperature/humidity are all verified as
            Measured. Power is Estimated (sensor Pending) and flow is Pending, leaving some
            uncertainty in cost accuracy; both should move to Measured once sensors are installed.
            Validation score <b style={{ color: C.ink }}>94/100</b>.
          </div>

          <div style={{ ...heading, marginTop: 22 }}>4. Appendix · treatment comparison</div>
          <div style={{ font: `400 13px ${FONT_MONO}`, color: C.muted2, marginTop: 8 }}>
            A-2 20h A$9.80 · A-1 16h A$8.72 · B-2 24h A$8.07 · B-1 12h A$7.57 (Profit/Bed-Day)
          </div>
        </div>

        {/* SIDE */}
        <div
          style={{
            width: 300,
            flexShrink: 0,
            ...cardStyle,
            padding: 22,
            display: 'flex',
            flexDirection: 'column',
            gap: 14,
          }}
        >
          <div style={{ font: `700 15px ${FONT_UI}` }}>Report sections</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {checklist.map(([label, on]) => (
              <div
                key={label}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '11px 14px',
                  borderRadius: 11,
                  background: on ? 'rgba(166,226,107,0.08)' : 'rgba(8,16,12,.5)',
                  border: `1px solid ${on ? 'rgba(166,226,107,0.2)' : 'rgba(255,255,255,.06)'}`,
                }}
              >
                <span
                  style={{
                    width: 18,
                    height: 18,
                    borderRadius: 5,
                    background: on ? 'rgba(166,226,107,0.2)' : 'rgba(255,255,255,.08)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    font: `800 11px ${FONT_UI}`,
                    color: C.lime,
                  }}
                >
                  {on ? '✓' : ''}
                </span>
                <span style={{ font: `600 13px ${FONT_UI}`, color: on ? C.ink : C.muted }}>
                  {label}
                </span>
              </div>
            ))}
          </div>
          <div
            style={{
              marginTop: 'auto',
              padding: 14,
              borderRadius: 12,
              background: 'rgba(8,16,12,.5)',
            }}
          >
            <div style={{ font: `400 11px ${FONT_MONO}`, color: C.muted2 }}>Final score</div>
            <div style={{ font: `800 30px ${FONT_UI}`, color: C.lime, marginTop: 2 }}>
              87.4 <span style={{ fontSize: 13, color: C.muted2 }}>/100</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
