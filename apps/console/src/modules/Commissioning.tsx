import { useEffect, useRef, useState } from 'react';

import { Chip } from '../components/Chip';
import { Clickable } from '../components/Clickable';
import { cardStyle, insetStyle, PageHeader } from '../components/Page';
import { C, CHIP, type ChipKind, FONT_MONO, FONT_UI } from '../data/derive';
import { type Rig, type Signal, useCommissioning, type Verdict } from '@via-farm-lab/data';

const RIG_ID = 'pilot.syd.a';
const SIGNAL_CHIP: Record<Signal, ChipKind> = {
  Measured: 'measured',
  Estimated: 'estimated',
  Pending: 'pending',
};

function Stepper({
  label,
  value,
  unit,
  onDec,
  onInc,
}: {
  readonly label: string;
  readonly value: string;
  readonly unit?: string;
  readonly onDec: () => void;
  readonly onInc: () => void;
}) {
  const btn = (accent: boolean) =>
    ({
      width: 40,
      height: 40,
      borderRadius: 11,
      background: accent ? 'rgba(166,226,107,0.14)' : 'rgba(255,255,255,0.06)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      font: `800 22px ${FONT_UI}`,
      color: accent ? C.lime : C.ink,
    }) as const;
  return (
    <div
      style={{
        ...insetStyle,
        padding: '12px 14px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 10,
      }}
    >
      <div>
        <div style={{ font: `400 11px ${FONT_MONO}`, color: C.muted2 }}>{label}</div>
        <div style={{ font: `800 22px ${FONT_UI}`, marginTop: 2 }}>
          {value}
          {unit && <span style={{ fontSize: 12, color: C.muted2 }}> {unit}</span>}
        </div>
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <Clickable onClick={onDec} ariaLabel={`decrease ${label}`} style={btn(false)}>
          −
        </Clickable>
        <Clickable onClick={onInc} ariaLabel={`increase ${label}`} style={btn(true)}>
          +
        </Clickable>
      </div>
    </div>
  );
}

function VerdictRow({ v }: { v: Verdict }) {
  const unit =
    v.metric === 'EC'
      ? ' mS/cm'
      : v.metric === 'flow'
        ? ' L/min'
        : v.metric === 'power'
          ? ' W'
          : '';
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '11px 0',
        borderBottom: `1px solid ${C.line2}`,
      }}
    >
      <div style={{ width: 64, font: `700 14px ${FONT_UI}` }}>{v.metric}</div>
      <div style={{ flex: 1, font: `400 12px ${FONT_MONO}`, color: C.muted }}>
        cmd {v.target.toFixed(2)} → act{' '}
        <b style={{ color: v.withinTol ? C.lime : C.amber }}>{v.actual.toFixed(2)}</b>
        {unit}
      </div>
      <div
        style={{
          width: 64,
          textAlign: 'right',
          font: `400 12px ${FONT_MONO}`,
          color: Math.abs(v.variance) <= v.tolerance ? C.muted : C.amber,
        }}
      >
        Δ {v.variance >= 0 ? '+' : ''}
        {v.variance.toFixed(2)}
      </div>
      <div style={{ width: 96, textAlign: 'right' }}>
        <Chip chip={CHIP[SIGNAL_CHIP[v.signal]]} style={{ padding: '4px 10px', fontSize: 11 }}>
          {v.signal}
        </Chip>
      </div>
    </div>
  );
}

function clamp(x: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, +x.toFixed(2)));
}

export function Commissioning() {
  const { rigs, connected, command, reset } = useCommissioning();
  const rig: Rig | undefined = rigs.find((r) => r.id === RIG_ID) ?? rigs[0];

  const [ec, setEc] = useState(1.8);
  const [ph, setPh] = useState(5.8);
  const [ratio, setRatio] = useState(1);

  // Rolling history of actual EC for the ramp sparkline; reset on each command.
  const [history, setHistory] = useState<number[]>([]);
  const lastCmdRef = useRef<number | null>(null);
  useEffect(() => {
    if (!rig) return;
    if (rig.lastCommandMs !== lastCmdRef.current) {
      lastCmdRef.current = rig.lastCommandMs ?? null;
      setHistory(rig.lastCommandMs ? [rig.EC] : []);
      return;
    }
    setHistory((h) => (h.length && h[h.length - 1] === rig.EC ? h : [...h, rig.EC].slice(-80)));
  }, [rig]);

  const spark = (() => {
    if (history.length < 2) return '';
    const lo = Math.min(...history) - 0.05;
    const hi = Math.max(...history) + 0.05;
    const span = hi - lo || 1;
    return history
      .map((v, i) => `${(i / (history.length - 1)) * 280},${56 - ((v - lo) / span) * 52}`)
      .join(' ');
  })();

  const ecV = rig?.verdicts.find((v) => v.metric === 'EC');
  const phV = rig?.verdicts.find((v) => v.metric === 'pH');

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', gap: 14 }}>
      <PageHeader
        title="Commissioning · SIT"
        subtitle="Command a nutrient recipe and verify the twin actually realises it (commanded vs actual)."
        alignEnd={false}
        right={
          <Chip chip={connected ? CHIP.measured : CHIP.pending} style={{ padding: '7px 13px' }}>
            {connected ? '● Twin connected' : '○ Connecting…'}
          </Chip>
        }
      />
      <div style={{ flex: 1, display: 'flex', gap: 16, minHeight: 0 }}>
        {/* COMMAND */}
        <div
          style={{
            width: 360,
            flexShrink: 0,
            ...cardStyle,
            padding: 22,
            display: 'flex',
            flexDirection: 'column',
            gap: 12,
          }}
        >
          <div style={{ font: `700 15px ${FONT_UI}` }}>Recipe command</div>
          <div style={{ font: `500 13px ${FONT_UI}`, color: C.muted2 }}>
            {rig?.label ?? 'reservoir'} · {rig?.volumeL ?? 2.5} L
          </div>
          <Stepper
            label="Target EC"
            value={ec.toFixed(2)}
            unit="mS/cm"
            onDec={() => setEc(clamp(ec - 0.1, 0.5, 3.0))}
            onInc={() => setEc(clamp(ec + 0.1, 0.5, 3.0))}
          />
          <Stepper
            label="Target pH"
            value={ph.toFixed(2)}
            onDec={() => setPh(clamp(ph - 0.1, 4.5, 7.0))}
            onInc={() => setPh(clamp(ph + 0.1, 4.5, 7.0))}
          />
          <Stepper
            label="Solution A : B"
            value={`${ratio.toFixed(1)} : 1`}
            onDec={() => setRatio(clamp(ratio - 0.5, 0.5, 3))}
            onInc={() => setRatio(clamp(ratio + 0.5, 0.5, 3))}
          />
          <Clickable
            onClick={() => void command(RIG_ID, { targetEC: ec, targetPH: ph, abRatio: ratio })}
            style={{
              marginTop: 6,
              width: '100%',
              padding: 14,
              borderRadius: 11,
              background: C.lime,
              textAlign: 'center',
              font: `700 14px ${FONT_UI}`,
              color: C.bg,
            }}
          >
            ▶ Run dose
          </Clickable>
          <Clickable
            onClick={() => void reset(RIG_ID)}
            style={{
              width: '100%',
              padding: 12,
              borderRadius: 11,
              background: 'rgba(255,255,255,.05)',
              textAlign: 'center',
              font: `600 13px ${FONT_UI}`,
              color: C.ink2,
            }}
          >
            Reset to baseline
          </Clickable>
        </div>

        {/* VERIFY */}
        <div
          style={{
            flex: 1,
            ...cardStyle,
            padding: 22,
            display: 'flex',
            flexDirection: 'column',
            gap: 16,
            minWidth: 0,
          }}
        >
          <div style={{ display: 'flex', gap: 16 }}>
            <div style={{ flex: 1, ...insetStyle, padding: '14px 16px' }}>
              <div style={{ font: `400 11px ${FONT_MONO}`, color: C.muted2 }}>
                EC — commanded → actual
              </div>
              <div style={{ font: `800 26px ${FONT_UI}`, marginTop: 4 }}>
                {rig?.target ? rig.target.EC.toFixed(2) : '—'}{' '}
                <span style={{ color: C.muted2 }}>→</span>{' '}
                <span style={{ color: ecV?.withinTol ? C.lime : C.amber }}>
                  {rig?.EC.toFixed(2) ?? '—'}
                </span>
              </div>
            </div>
            <div style={{ flex: 1, ...insetStyle, padding: '14px 16px' }}>
              <div style={{ font: `400 11px ${FONT_MONO}`, color: C.muted2 }}>
                pH — commanded → actual
              </div>
              <div style={{ font: `800 26px ${FONT_UI}`, marginTop: 4 }}>
                {rig?.target ? rig.target.pH.toFixed(2) : '—'}{' '}
                <span style={{ color: C.muted2 }}>→</span>{' '}
                <span style={{ color: phV?.withinTol ? C.lime : C.amber }}>
                  {rig?.pH.toFixed(2) ?? '—'}
                </span>
              </div>
            </div>
            <div style={{ flex: 1, ...insetStyle, padding: '14px 16px' }}>
              <div style={{ font: `400 11px ${FONT_MONO}`, color: C.muted2 }}>Delivery</div>
              <div style={{ font: `800 18px ${FONT_UI}`, marginTop: 6 }}>
                {rig?.flowLmin.toFixed(1) ?? '0.0'}{' '}
                <span style={{ fontSize: 11, color: C.muted2 }}>L/min</span>
              </div>
              <div
                style={{
                  font: `600 13px ${FONT_UI}`,
                  color: rig?.inFlight ? C.amber : C.muted,
                  marginTop: 2,
                }}
              >
                {rig?.powerW.toFixed(1) ?? '0.0'} W ·{' '}
                {rig?.inFlight ? 'delivering' : rig?.settled ? 'settled' : 'idle'}
              </div>
            </div>
          </div>

          <div>
            <div style={{ font: `700 14px ${FONT_UI}`, marginBottom: 6 }}>Actual EC ramp</div>
            <div style={{ ...insetStyle, padding: 14 }}>
              <svg
                viewBox="0 0 280 56"
                style={{ width: '100%', height: 60 }}
                preserveAspectRatio="none"
              >
                {spark && (
                  <polyline
                    points={spark}
                    fill="none"
                    stroke={C.lime}
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                )}
              </svg>
            </div>
          </div>

          <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
            <div style={{ font: `700 14px ${FONT_UI}`, marginBottom: 4 }}>
              Verification — commanded vs actual
            </div>
            {rig?.verdicts.map((v) => (
              <VerdictRow key={v.metric} v={v} />
            ))}
            <div
              style={{
                marginTop: 'auto',
                paddingTop: 12,
                font: `400 12px ${FONT_MONO}`,
                color: C.faint,
              }}
            >
              Pending = not commissioned · Estimated = delivering / not settled · Measured = settled
              within tolerance
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
