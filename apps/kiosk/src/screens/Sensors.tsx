import type { ReactNode } from 'react';

import { C, FONT_MONO, FONT_UI } from '../theme';

const card = {
  background: C.card,
  border: `1px solid ${C.line}`,
  borderRadius: 22,
  padding: 22,
  display: 'flex',
  flexDirection: 'column',
} as const;

interface Status {
  text: string;
  color: string;
  bg: string;
  border: string;
}
const ST = {
  normal: {
    text: 'Normal',
    color: C.lime,
    bg: 'rgba(166,226,107,.10)',
    border: '1px solid rgba(166,226,107,.3)',
  },
  fanIdle: {
    text: 'Fan idle',
    color: C.amber,
    bg: 'rgba(233,196,92,.12)',
    border: '1px solid rgba(233,196,92,.3)',
  },
  clear: {
    text: 'All clear',
    color: C.lime,
    bg: 'rgba(166,226,107,.10)',
    border: '1px solid rgba(166,226,107,.3)',
  },
  estimated: {
    text: 'Estimated',
    color: C.amber,
    bg: 'transparent',
    border: '1px dashed rgba(233,196,92,.55)',
  },
  pending: {
    text: 'Pending',
    color: C.muted2,
    bg: 'transparent',
    border: '1px dashed rgba(94,116,104,.6)',
  },
} satisfies Record<string, Status>;

function Head({ title, sub, st }: { title: string; sub: string; st: Status }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
      <div>
        <div style={{ font: `700 17px ${FONT_UI}` }}>{title}</div>
        <div style={{ font: `400 12px ${FONT_MONO}`, color: C.muted2, marginTop: 3 }}>{sub}</div>
      </div>
      <span
        style={{
          flexShrink: 0,
          whiteSpace: 'nowrap',
          padding: '5px 11px',
          borderRadius: 999,
          background: st.bg,
          border: st.border,
          font: `600 12px ${FONT_UI}`,
          color: st.color,
        }}
      >
        {st.text}
      </span>
    </div>
  );
}

function Tiles({ items }: { items: readonly (readonly [string, string, string?])[] }) {
  return (
    <div style={{ display: 'flex', gap: 10, marginTop: 'auto', paddingTop: 16 }}>
      {items.map(([k, v, col]) => (
        <div
          key={k}
          style={{
            flex: 1,
            background: 'rgba(8,16,12,.4)',
            borderRadius: 10,
            padding: '10px 12px',
          }}
        >
          <div style={{ font: `400 11px ${FONT_MONO}`, color: C.muted2 }}>{k}</div>
          <div style={{ font: `700 17px ${FONT_UI}`, color: col ?? C.ink }}>{v}</div>
        </div>
      ))}
    </div>
  );
}

const Big = ({
  value,
  label,
  color,
}: {
  value: string;
  label: string;
  color?: string;
}): ReactNode => (
  <div>
    <div style={{ font: `800 34px/1 ${FONT_UI}`, color }}>{value}</div>
    <div style={{ font: `500 12px ${FONT_MONO}`, color: C.muted2, marginTop: 4 }}>{label}</div>
  </div>
);

export function Sensors() {
  return (
    <div
      style={{
        flex: 1,
        display: 'grid',
        gridTemplateColumns: '1fr 1fr 1fr',
        gridTemplateRows: '1fr 1fr',
        gap: 16,
        width: '100%',
        minHeight: 0,
      }}
    >
      <div style={card}>
        <Head title="Light" sub="SEN0641 · LED MX20" st={ST.normal} />
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, marginTop: 18 }}>
          <div style={{ font: `800 44px/1 ${FONT_UI}` }}>181</div>
          <div style={{ font: `600 15px ${FONT_UI}`, color: C.muted2, marginBottom: 5 }}>
            μmol · target 180 ✓
          </div>
        </div>
        <Tiles
          items={[
            ['DLI', '12.96', C.lime],
            ['Photoperiod', '20 h'],
          ]}
        />
      </div>

      <div style={card}>
        <Head title="Nutrient" sub="EC/pH RS485 · TL-136" st={ST.normal} />
        <div style={{ display: 'flex', gap: 18, marginTop: 18 }}>
          <Big value="1.52" label="EC · target 1.5" />
          <Big value="6.03" label="pH · target 6.0" />
        </div>
        <Tiles
          items={[
            ['Tank level', '78%', C.lime],
            ['Pump', '4/4 OK', C.lime],
          ]}
        />
      </div>

      <div style={card}>
        <Head title="Climate" sub="SHT40 · SCD41 · KEEP AC" st={ST.fanIdle} />
        <div style={{ display: 'flex', gap: 16, marginTop: 18 }}>
          <Big value="22.1°" label="Temp" />
          <Big value="64%" label="Humidity" />
          <Big value="720" label="CO₂ ppm" />
        </div>
        <Tiles
          items={[
            ['HVAC', 'Running', C.lime],
            ['Circ. fan', 'pending', C.muted2],
          ]}
        />
      </div>

      <div style={card}>
        <Head title="Safety" sub="YL-83 leak · TL-136" st={ST.clear} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 18 }}>
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: 14,
              background: 'rgba(166,226,107,.12)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path
                d="M20 6L9 17l-5-5"
                stroke={C.lime}
                strokeWidth="2.4"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          <div>
            <div style={{ font: `700 22px ${FONT_UI}`, whiteSpace: 'nowrap' }}>
              No leak detected
            </div>
            <div style={{ font: `500 13px ${FONT_UI}`, color: C.muted2 }}>A·B zones all normal</div>
          </div>
        </div>
        <Tiles
          items={[
            ['Tank', 'Normal', C.lime],
            ['Pump status', 'Normal', C.lime],
          ]}
        />
      </div>

      <div style={card}>
        <Head title="Energy" sub="Power sensor · pending" st={ST.estimated} />
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, marginTop: 18 }}>
          <div style={{ font: `800 40px/1 ${FONT_UI}`, color: C.amber }}>22.1</div>
          <div style={{ font: `600 15px ${FONT_UI}`, color: C.muted2, marginBottom: 5 }}>
            kWh · estimated total
          </div>
        </div>
        <div
          style={{
            marginTop: 14,
            padding: '11px 14px',
            borderRadius: 12,
            border: '1px dashed rgba(233,196,92,.4)',
            font: `500 12px ${FONT_MONO}`,
            color: C.amber,
          }}
        >
          Moves to Measured once per-circuit meters installed
        </div>
        <div style={{ marginTop: 'auto' }} />
      </div>

      <div style={card}>
        <Head title="Flow / Actuators" sub="Flow sensor · pending" st={ST.pending} />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 9, marginTop: 16 }}>
          {[
            ['Feed/nutrient/circ./drain pumps', 'Running OK', C.lime],
            ['LED dimming', '100%', C.ink],
            ['Flow metering', 'unlinked · est.', C.muted2],
          ].map(([k, v, col]) => (
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
              <b style={{ color: col }}>{v}</b>
            </div>
          ))}
        </div>
        <div
          style={{
            marginTop: 'auto',
            paddingTop: 14,
            font: `400 12px ${FONT_MONO}`,
            color: C.faint,
          }}
        >
          Flow sensor is a planned integration
        </div>
      </div>
    </div>
  );
}
