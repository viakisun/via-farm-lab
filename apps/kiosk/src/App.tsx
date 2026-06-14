import { useReducer, useState, type ReactNode } from 'react';

import { Clickable } from './components/Clickable';
import { Pill } from './components/Pill';
import { NAV_TABS, type ScreenId, type TreatmentId } from './data';
import { Economic } from './screens/Economic';
import { Experiment } from './screens/Experiment';
import { Incident } from './screens/Incident';
import { Inputs } from './screens/Inputs';
import { Sensors } from './screens/Sensors';
import { Sop } from './screens/Sop';
import { INITIAL_SOP, sopReducer } from './sop';
import { C, FONT_MONO, FONT_UI } from './theme';

const NAV_ICON: Record<ScreenId, (c: string) => ReactNode> = {
  overview: (c) => (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      <rect x="3" y="3" width="7" height="7" rx="1.5" stroke={c} strokeWidth="1.8" />
      <rect x="14" y="3" width="7" height="7" rx="1.5" stroke={c} strokeWidth="1.8" />
      <rect x="3" y="14" width="7" height="7" rx="1.5" stroke={c} strokeWidth="1.8" />
      <rect x="14" y="14" width="7" height="7" rx="1.5" stroke={c} strokeWidth="1.8" />
    </svg>
  ),
  experiment: (c) => (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="4" stroke={c} strokeWidth="1.8" />
      <path
        d="M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M19 5l-2 2M7 17l-2 2"
        stroke={c}
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  ),
  inputs: (c) => (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      <path
        d="M12 3v10M8 9l4 4 4-4"
        stroke={c}
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M4 17v3a1 1 0 001 1h14a1 1 0 001-1v-3"
        stroke={c}
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  ),
  sensors: (c) => (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="2" fill={c} />
      <path
        d="M8.5 8.5a5 5 0 000 7M15.5 8.5a5 5 0 010 7M6 6a8 8 0 000 12M18 6a8 8 0 010 12"
        stroke={c}
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  ),
  sop: (c) => (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      <path
        d="M4 6l1.5 1.5L8 5M4 12l1.5 1.5L8 11M4 18l1.5 1.5L8 17"
        stroke={c}
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M11 6h9M11 12h9M11 18h9" stroke={c} strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  ),
  incident: (c) => (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      <path d="M12 4l9 16H3L12 4z" stroke={c} strokeWidth="1.8" strokeLinejoin="round" />
      <path d="M12 10v4M12 17v.5" stroke={c} strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  ),
};

export default function App() {
  const [nav, setNav] = useState<ScreenId>('overview');
  const [selected, setSelected] = useState<TreatmentId>('A-2');
  const [sop, dispatch] = useReducer(sopReducer, INITIAL_SOP);

  const screenTitle = NAV_TABS.find((t) => t.id === nav)?.title ?? '';

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'auto',
        background: C.bg,
      }}
    >
      <div
        data-screen-label={`Kiosk · ${screenTitle}`}
        style={{
          width: 1920,
          height: 1080,
          background: C.bg,
          color: C.ink,
          fontFamily: FONT_UI,
          display: 'flex',
          flexDirection: 'column',
          padding: '26px 30px 22px',
          gap: 16,
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background:
              'radial-gradient(1300px 520px at 72% -12%,rgba(140,190,100,.10),transparent 62%)',
            pointerEvents: 'none',
          }}
        />

        {/* HEADER */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            zIndex: 1,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <div
              style={{
                width: 52,
                height: 52,
                borderRadius: 15,
                background: C.card,
                border: `1px solid rgba(255,255,255,.08)`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                <path
                  d="M15 5l-7 7 7 7"
                  stroke={C.muted}
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
            <div>
              <div
                style={{ font: `700 12px/1 ${FONT_MONO}`, letterSpacing: '2.5px', color: C.faint }}
              >
                VIA FARM INTELLIGENCE · KIOSK
              </div>
              <div
                style={{ font: `800 25px/1.1 ${FONT_UI}`, letterSpacing: '-.3px', marginTop: 5 }}
              >
                Glasshouse A · M2 Photoperiod Response — {screenTitle}
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Pill color={C.ink2} dot={C.lime}>
              DLI fixed 12.96
            </Pill>
            <Pill color={C.ink2}>Photoperiod = variable</Pill>
            <Pill
              color={C.lime}
              bg="rgba(166,226,107,.10)"
              border="1px solid rgba(166,226,107,.30)"
              dot
              pulse
              size={14}
            >
              Verification OK · 6/8 Measured
            </Pill>
            <span
              style={{
                padding: '9px 14px',
                borderRadius: 999,
                background: C.card,
                border: `1px solid ${C.line}`,
                font: `400 14px ${FONT_MONO}`,
                color: C.muted,
              }}
            >
              13/06/2026&nbsp;&nbsp;09:42
            </span>
          </div>
        </div>

        {/* CONTENT */}
        <div style={{ flex: 1, minHeight: 0, display: 'flex', zIndex: 1 }}>
          {nav === 'overview' && <Economic selected={selected} onSelect={setSelected} />}
          {nav === 'experiment' && <Experiment />}
          {nav === 'inputs' && <Inputs />}
          {nav === 'sensors' && <Sensors />}
          {nav === 'sop' && <Sop sop={sop} dispatch={dispatch} />}
          {nav === 'incident' && <Incident />}
        </div>

        {/* BOTTOM NAV */}
        <div
          style={{
            display: 'flex',
            gap: 8,
            background: C.sidebar,
            border: `1px solid rgba(255,255,255,.06)`,
            borderRadius: 20,
            padding: 8,
            zIndex: 1,
          }}
        >
          {NAV_TABS.map((t) => {
            const on = nav === t.id;
            const color = on ? C.ink : C.faint;
            return (
              <Clickable
                key={t.id}
                onClick={() => setNav(t.id)}
                ariaLabel={t.title}
                style={{
                  flex: 1,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 5,
                  padding: '10px 6px 8px',
                  borderRadius: 14,
                  position: 'relative',
                }}
              >
                <div
                  style={{
                    position: 'absolute',
                    top: 0,
                    width: 36,
                    height: 3,
                    borderRadius: 3,
                    background: on ? C.lime : 'transparent',
                  }}
                />
                {NAV_ICON[t.id](color)}
                <span style={{ font: `600 13px ${FONT_UI}`, color }}>{t.label}</span>
              </Clickable>
            );
          })}
        </div>
      </div>
    </div>
  );
}
