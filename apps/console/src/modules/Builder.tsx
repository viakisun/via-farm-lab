import type { ReactNode } from 'react';

import { Clickable } from '../components/Clickable';
import { cardStyle, insetStyle } from '../components/Page';
import { C, DLI_TOL, dliOf, FONT_MONO, FONT_UI, PERIODS, requiredPpfd } from '../data/derive';
import type { BuilderRow, BuilderState } from '../types';

interface BuilderProps {
  readonly builder: BuilderState;
  readonly onTarget: (delta: number) => void;
  readonly onRow: (index: number, patch: Partial<BuilderRow>) => void;
  readonly onAutoEqualise: () => void;
}

function StepBtn({
  onClick,
  accent = false,
  big = false,
  label,
  children,
}: {
  readonly onClick: () => void;
  readonly accent?: boolean;
  readonly big?: boolean;
  readonly label: string;
  readonly children: ReactNode;
}) {
  const size = big ? 40 : 28;
  return (
    <Clickable
      onClick={onClick}
      ariaLabel={label}
      style={{
        width: size,
        height: size,
        borderRadius: big ? 11 : 8,
        background: accent ? 'rgba(166,226,107,0.14)' : 'rgba(255,255,255,0.06)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        font: `800 ${big ? 22 : 15}px ${FONT_UI}`,
        color: accent ? C.lime : C.ink,
      }}
    >
      {children}
    </Clickable>
  );
}

export function Builder({ builder, onTarget, onRow, onAutoEqualise }: BuilderProps) {
  const { target, rows } = builder;
  const maxDev = Math.max(...rows.map((r) => Math.abs(dliOf(r.ppfd, r.photoperiod) - target)));
  const allOk = maxDev < DLI_TOL;
  const eqColor = allOk ? C.lime : C.amber;
  const eqBg = allOk ? 'rgba(166,226,107,0.10)' : 'rgba(233,196,92,0.10)';
  const eqBorder = allOk ? 'rgba(166,226,107,0.3)' : 'rgba(233,196,92,0.4)';
  const eqText = allOk ? 'DLI equivalence held' : 'DLI deviation';

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
        <div>
          <div style={{ font: `800 23px ${FONT_UI}`, letterSpacing: '-.3px' }}>
            Experiment Builder
          </div>
          <div style={{ font: `500 13px ${FONT_UI}`, color: C.muted2, marginTop: 3 }}>
            Fix DLI and vary photoperiod per treatment. Changing PPFD recomputes DLI live.
          </div>
        </div>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '9px 15px',
            borderRadius: 999,
            background: eqBg,
            border: `1px solid ${eqBorder}`,
            font: `600 13px ${FONT_UI}`,
            color: eqColor,
            whiteSpace: 'nowrap',
          }}
        >
          <span style={{ width: 7, height: 7, borderRadius: '50%', background: eqColor }} />
          {eqText}
        </div>
      </div>

      <div style={{ flex: 1, display: 'flex', gap: 16, minHeight: 0 }}>
        {/* LEFT */}
        <div style={{ flex: 1.55, display: 'flex', flexDirection: 'column', gap: 16, minWidth: 0 }}>
          <div style={{ ...cardStyle, padding: '20px 22px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ font: `700 15px ${FONT_UI}` }}>DLI Calculator</div>
              <div style={{ font: `400 12px ${FONT_MONO}`, color: C.muted2 }}>
                DLI = PPFD × hours × 3600 ÷ 1,000,000
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 22, marginTop: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <StepBtn onClick={() => onTarget(-0.36)} big label="Decrease target DLI">
                  −
                </StepBtn>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ font: `800 34px/1 ${FONT_UI}`, color: C.lime }}>
                    {target.toFixed(2)}
                  </div>
                  <div style={{ font: `400 11px ${FONT_MONO}`, color: C.muted2, marginTop: 3 }}>
                    Target DLI
                  </div>
                </div>
                <StepBtn onClick={() => onTarget(0.36)} big accent label="Increase target DLI">
                  +
                </StepBtn>
              </div>
              <div style={{ flex: 1, display: 'flex', gap: 9 }}>
                {PERIODS.map((p) => (
                  <div
                    key={p}
                    style={{ flex: 1, ...insetStyle, padding: '10px 13px', borderRadius: 11 }}
                  >
                    <div style={{ font: `400 11px ${FONT_MONO}`, color: C.muted2 }}>
                      {p}h required PPFD
                    </div>
                    <div style={{ font: `700 19px ${FONT_UI}`, marginTop: 2 }}>
                      {requiredPpfd(target, p)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <Clickable
              onClick={onAutoEqualise}
              style={{
                marginTop: 14,
                width: '100%',
                padding: 11,
                borderRadius: 11,
                background: 'rgba(166,226,107,.10)',
                border: '1px solid rgba(166,226,107,.28)',
                textAlign: 'center',
                font: `700 14px ${FONT_UI}`,
                color: C.lime,
              }}
            >
              ⟳ Auto-equalise all treatments to target DLI
            </Clickable>
          </div>

          <div
            style={{
              ...cardStyle,
              padding: '20px 22px',
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              minHeight: 0,
            }}
          >
            <div style={{ font: `700 15px ${FONT_UI}` }}>Treatment matrix</div>
            <div
              style={{
                display: 'flex',
                font: `400 11px ${FONT_MONO}`,
                color: C.faint,
                letterSpacing: '.5px',
                marginTop: 14,
                padding: '0 4px 9px',
                borderBottom: `1px solid ${C.line}`,
              }}
            >
              <div style={{ width: 116 }}>BED · role</div>
              <div style={{ flex: 1, textAlign: 'center' }}>Photoperiod</div>
              <div style={{ flex: 1.3, textAlign: 'center' }}>PPFD</div>
              <div style={{ flex: 1, textAlign: 'center' }}>DLI</div>
              <div style={{ width: 104, textAlign: 'right' }}>Equivalence</div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
              {rows.map((r, i) => {
                const dli = dliOf(r.ppfd, r.photoperiod);
                const dev = dli - target;
                const ok = Math.abs(dev) < DLI_TOL;
                const ctrl = r.role === 'control';
                return (
                  <div
                    key={r.bed}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      padding: '13px 4px',
                      borderBottom: `1px solid ${C.line2}`,
                      flex: 1,
                    }}
                  >
                    <div style={{ width: 116 }}>
                      <div style={{ font: `800 18px ${FONT_UI}` }}>{r.bed}</div>
                      <span
                        style={{
                          display: 'inline-block',
                          marginTop: 2,
                          padding: '2px 9px',
                          borderRadius: 999,
                          background: ctrl ? 'rgba(111,183,232,0.14)' : 'rgba(166,226,107,0.12)',
                          font: `600 11px ${FONT_UI}`,
                          color: ctrl ? C.sky : C.lime,
                        }}
                      >
                        {ctrl ? 'Control' : 'Treatment'}
                      </span>
                    </div>
                    <div
                      style={{
                        flex: 1,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 7,
                      }}
                    >
                      <StepBtn
                        onClick={() => onRow(i, { photoperiod: Math.max(4, r.photoperiod - 4) })}
                        label={`${r.bed} decrease photoperiod`}
                      >
                        −
                      </StepBtn>
                      <div style={{ font: `700 16px ${FONT_UI}`, width: 42, textAlign: 'center' }}>
                        {r.photoperiod}h
                      </div>
                      <StepBtn
                        onClick={() => onRow(i, { photoperiod: Math.min(24, r.photoperiod + 4) })}
                        label={`${r.bed} increase photoperiod`}
                      >
                        +
                      </StepBtn>
                    </div>
                    <div
                      style={{
                        flex: 1.3,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 7,
                      }}
                    >
                      <StepBtn
                        onClick={() => onRow(i, { ppfd: Math.max(0, r.ppfd - 5) })}
                        label={`${r.bed} decrease PPFD`}
                      >
                        −
                      </StepBtn>
                      <div style={{ font: `700 16px ${FONT_UI}`, width: 50, textAlign: 'center' }}>
                        {r.ppfd}
                      </div>
                      <StepBtn
                        onClick={() => onRow(i, { ppfd: r.ppfd + 5 })}
                        accent
                        label={`${r.bed} increase PPFD`}
                      >
                        +
                      </StepBtn>
                    </div>
                    <div
                      style={{
                        flex: 1,
                        textAlign: 'center',
                        font: `800 21px ${FONT_UI}`,
                        color: ok ? C.lime : C.amber,
                      }}
                    >
                      {dli.toFixed(2)}
                    </div>
                    <div style={{ width: 104, textAlign: 'right' }}>
                      <span
                        style={{
                          padding: '5px 10px',
                          borderRadius: 999,
                          background: ok ? 'rgba(166,226,107,0.12)' : 'rgba(233,196,92,0.12)',
                          font: `700 12px ${FONT_UI}`,
                          color: ok ? C.lime : C.amber,
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {ok ? 'Balanced ✓' : dev > 0 ? '+' + dev.toFixed(2) : dev.toFixed(2)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* RIGHT */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 16, minWidth: 0 }}>
          <div style={{ ...cardStyle, padding: '20px 22px' }}>
            <div style={{ font: `700 15px ${FONT_UI}` }}>DLI equivalence status</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginTop: 14 }}>
              <div
                style={{
                  width: 66,
                  height: 66,
                  borderRadius: '50%',
                  background: eqBg,
                  border: `2px solid ${eqBorder}`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  font: `800 18px ${FONT_UI}`,
                  color: eqColor,
                }}
              >
                {allOk ? '✓' : '!'}
              </div>
              <div>
                <div style={{ font: `700 17px ${FONT_UI}`, color: eqColor }}>{eqText}</div>
                <div style={{ font: `500 13px ${FONT_UI}`, color: C.muted2, marginTop: 3 }}>
                  Max deviation {maxDev.toFixed(2)} · tolerance ±0.30
                </div>
              </div>
            </div>
          </div>

          <div style={{ ...cardStyle, padding: '20px 22px' }}>
            <div style={{ font: `700 15px ${FONT_UI}` }}>Control variables</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 9, marginTop: 12 }}>
              {[
                ['EC mS/cm', '1.5'],
                ['pH', '6.0'],
                ['Temp °C', '22'],
                ['Humidity %RH', '65'],
              ].map(([k, v]) => (
                <div key={k} style={{ ...insetStyle, padding: '10px 13px', borderRadius: 11 }}>
                  <div style={{ font: `400 11px ${FONT_MONO}`, color: C.muted2 }}>{k}</div>
                  <div style={{ font: `700 18px ${FONT_UI}` }}>{v}</div>
                </div>
              ))}
            </div>
          </div>

          <div style={{ ...cardStyle, padding: '20px 22px', flex: 1 }}>
            <div style={{ font: `700 15px ${FONT_UI}` }}>Version history</div>
            <div style={{ display: 'flex', flexDirection: 'column', marginTop: 10 }}>
              {[
                {
                  tag: 'v3',
                  color: C.lime,
                  title: 'A-2 PPFD 180 confirmed',
                  meta: '11/06 · M. Reid',
                  divider: true,
                },
                {
                  tag: 'v2',
                  color: C.muted2,
                  title: 'Bed layout changed',
                  meta: '08/06',
                  divider: true,
                },
                {
                  tag: 'v1',
                  color: C.muted2,
                  title: 'Initial design · DLI 12.96',
                  meta: '02/06',
                  divider: false,
                },
              ].map((v) => (
                <div
                  key={v.tag}
                  style={{
                    display: 'flex',
                    gap: 12,
                    padding: '10px 0',
                    borderBottom: v.divider ? `1px solid rgba(255,255,255,.05)` : 'none',
                  }}
                >
                  <span style={{ font: `700 12px ${FONT_MONO}`, color: v.color, width: 28 }}>
                    {v.tag}
                  </span>
                  <div>
                    <div
                      style={{
                        font: `600 13px ${FONT_UI}`,
                        color: v.tag === 'v3' ? C.ink : C.ink2,
                      }}
                    >
                      {v.title}
                    </div>
                    <div style={{ font: `400 11px ${FONT_MONO}`, color: C.faint }}>{v.meta}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
