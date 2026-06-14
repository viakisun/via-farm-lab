import { C, FONT_MONO, FONT_UI } from '../theme';

const card = { background: C.card, border: `1px solid ${C.line}`, borderRadius: 20 } as const;

interface Protocol {
  readonly title: string;
  readonly severity: 'Critical' | 'Warning';
  readonly trigger: string;
  readonly steps: readonly string[];
}
const PROTOCOLS: Protocol[] = [
  {
    title: 'Leak',
    severity: 'Critical',
    trigger: 'Trigger · YL-83 leak detected → instant alert',
    steps: [
      '① Stop pumps in the zone',
      '② Locate & isolate the leak',
      '③ Re-check tank level after recovery',
    ],
  },
  {
    title: 'Pump Stop',
    severity: 'Critical',
    trigger: 'Trigger · pump unresponsive / current fault',
    steps: [
      '① Check if nutrient supply stopped',
      '② Switch to backup pump',
      '③ Monitor EC/pH stabilisation',
    ],
  },
  {
    title: 'Sensor Failure',
    severity: 'Warning',
    trigger: 'Trigger · value drift / comms loss',
    steps: [
      '① Flag the metric Invalid',
      '② Substitute with manual reading',
      '③ Request inspection / replacement',
    ],
  },
  {
    title: 'Deviation',
    severity: 'Warning',
    trigger: 'Trigger · climate/EC/pH outside control range',
    steps: [
      '① Record time & cause',
      '② Equipment response (HVAC/corrector)',
      '③ Log recovery time · flag data',
    ],
  },
];

const EVENTS: [string, string, string, string][] = [
  ['09:42', 'Routine check passed', 'All sensors responding', C.lime],
  ['07:10', 'EC spike 1.61', 'Recovered after top-up (12 min)', C.amber],
  ['12/06', 'Power meter still Pending', 'Running in estimated mode', C.muted2],
  ['11/06', 'Nutrient recipe v1.2 applied', 'Published from Web Console', C.lime],
];

export function Incident() {
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
          border: '1px solid rgba(166,226,107,.25)',
          borderRadius: 22,
          padding: '20px 26px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
          <div
            style={{
              width: 54,
              height: 54,
              borderRadius: 16,
              background: 'rgba(166,226,107,.14)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
              <path
                d="M20 6L9 17l-5-5"
                stroke={C.lime}
                strokeWidth="2.6"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          <div>
            <div style={{ font: `800 24px ${FONT_UI}` }}>All Systems Nominal</div>
            <div style={{ font: `500 14px ${FONT_UI}`, color: C.muted }}>
              0 active incidents · last check 09:42 · all safety sensors normal
            </div>
          </div>
        </div>
        <div
          style={{
            padding: '14px 22px',
            borderRadius: 14,
            background: 'rgba(232,131,107,.14)',
            border: '1px solid rgba(232,131,107,.4)',
            font: `700 16px ${FONT_UI}`,
            color: C.coral,
          }}
        >
          Emergency Stop
        </div>
      </div>

      <div style={{ flex: 1, display: 'flex', gap: 16, minHeight: 0 }}>
        <div
          style={{
            flex: 1.5,
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gridTemplateRows: '1fr 1fr',
            gap: 16,
            minWidth: 0,
          }}
        >
          {PROTOCOLS.map((p) => {
            const crit = p.severity === 'Critical';
            const col = crit ? C.coral : C.amber;
            return (
              <div
                key={p.title}
                style={{
                  ...card,
                  padding: '20px 22px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 10,
                }}
              >
                <div
                  style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                >
                  <div style={{ font: `700 16px ${FONT_UI}`, whiteSpace: 'nowrap' }}>{p.title}</div>
                  <span
                    style={{
                      flexShrink: 0,
                      whiteSpace: 'nowrap',
                      padding: '5px 11px',
                      borderRadius: 999,
                      background: `${col}1f`,
                      border: `1px solid ${col}4d`,
                      font: `600 12px ${FONT_UI}`,
                      color: col,
                    }}
                  >
                    {p.severity}
                  </span>
                </div>
                <div style={{ font: `500 13px ${FONT_UI}`, color: C.muted2 }}>{p.trigger}</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 7, marginTop: 4 }}>
                  {p.steps.map((s) => (
                    <div key={s} style={{ font: `500 14px ${FONT_UI}`, color: C.ink2 }}>
                      {s}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        <div
          style={{
            flex: 1,
            ...card,
            padding: '20px 22px',
            display: 'flex',
            flexDirection: 'column',
            minWidth: 0,
          }}
        >
          <div style={{ font: `700 16px ${FONT_UI}`, whiteSpace: 'nowrap' }}>Event Log</div>
          <div style={{ display: 'flex', flexDirection: 'column', marginTop: 16, flex: 1 }}>
            {EVENTS.map(([time, title, sub, col], i) => (
              <div
                key={time}
                style={{
                  display: 'flex',
                  gap: 14,
                  padding: '14px 0',
                  borderBottom: i < EVENTS.length - 1 ? '1px solid rgba(255,255,255,.05)' : 'none',
                }}
              >
                <span style={{ font: `400 12px ${FONT_MONO}`, color: C.muted2, width: 48 }}>
                  {time}
                </span>
                <div>
                  <div style={{ font: `600 14px ${FONT_UI}`, color: col }}>{title}</div>
                  <div style={{ font: `500 12px ${FONT_UI}`, color: C.muted2 }}>{sub}</div>
                </div>
              </div>
            ))}
          </div>
          <div
            style={{
              marginTop: 'auto',
              paddingTop: 16,
              borderTop: '1px solid rgba(255,255,255,.06)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <div style={{ font: `500 13px ${FONT_UI}`, color: C.muted }}>
              On call · M. Reid · 04·· ···
            </div>
            <span
              style={{
                padding: '8px 14px',
                borderRadius: 10,
                background: 'rgba(8,16,12,.5)',
                font: `600 13px ${FONT_UI}`,
                color: C.ink2,
                whiteSpace: 'nowrap',
              }}
            >
              Call supervisor
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
