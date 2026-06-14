import type { Dispatch } from 'react';

import { Clickable } from '../components/Clickable';
import { TREATMENT_ORDER } from '../data';
import {
  disorderCount,
  photoCount,
  type DisorderKey,
  type PhotoKey,
  type Severity,
  type SopAction,
  type SopState,
  type SopStep,
} from '../sop';
import { C, FONT_MONO, FONT_UI } from '../theme';

const card = { background: C.card, border: `1px solid ${C.line}`, borderRadius: 22 } as const;

const STEP_DEFS: { n: SopStep; t: string; d: string }[] = [
  { n: 1, t: 'Identify plant', d: 'Confirm treatment & plant no.' },
  { n: 2, t: 'Non-destructive', d: 'Deformity·Tipburn·Bolting·Chlorosis' },
  { n: 3, t: 'Destructive', d: 'Height·Leaves·Fresh weight' },
  { n: 4, t: 'Photos', d: 'Standard-angle shots' },
  { n: 5, t: 'Log & save', d: 'Confirm EC/pH·climate' },
];
const NEXT_LABELS = ['', '② Non-destructive →', '③ Destructive →', '④ Photos →', '⑤ Log & save →'];

const SEV: { v: Severity; t: string; c: string; a: string }[] = [
  { v: 'neg', t: 'Negative', c: C.lime, a: 'rgba(166,226,107,' },
  { v: 'mild', t: 'Mild', c: C.amber, a: 'rgba(233,196,92,' },
  { v: 'sev', t: 'Severe', c: C.coral, a: 'rgba(232,131,107,' },
];
const DZ_META: { k: DisorderKey; label: string }[] = [
  { k: 'deformity', label: 'Deformity' },
  { k: 'tipburn', label: 'Tipburn' },
  { k: 'bolting', label: 'Bolting' },
  { k: 'chlorosis', label: 'Chlorosis' },
];
const PH_META: { k: PhotoKey; t: string }[] = [
  { k: 'top', t: 'Top' },
  { k: 'side', t: 'Side' },
  { k: 'macro', t: 'Macro' },
];

const stepperBtn = {
  flex: 1,
  padding: 14,
  borderRadius: 12,
  textAlign: 'center',
  font: `800 20px ${FONT_UI}`,
} as const;

export function Sop({ sop, dispatch }: { sop: SopState; dispatch: Dispatch<SopAction> }) {
  const ctx = `Treatment ${sop.treatment} · plant #${sop.sample}`;
  const stepTitle = STEP_DEFS[sop.step - 1]?.t ?? '';
  const primaryLabel = sop.step < 5 ? NEXT_LABELS[sop.step] : 'Save sample · next plant →';

  return (
    <div style={{ flex: 1, display: 'flex', gap: 18, width: '100%', minHeight: 0 }}>
      {/* STEPPER */}
      <div
        style={{
          width: 520,
          ...card,
          padding: '24px 26px',
          display: 'flex',
          flexDirection: 'column',
          minHeight: 0,
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ font: `700 17px ${FONT_UI}` }}>Today's survey · Guided SOP</div>
          <span
            style={{
              flexShrink: 0,
              padding: '6px 12px',
              borderRadius: 999,
              background: 'rgba(8,16,12,.5)',
              font: `600 12px ${FONT_MONO}`,
              color: C.lime,
            }}
          >
            13/06 10:30
          </span>
        </div>
        <div style={{ font: `500 14px ${FONT_UI}`, color: C.muted2, marginTop: 6 }}>
          5 plants/treatment · non-destructive → destructive · {sop.done.length}/5 plants ·{' '}
          {sop.treatment}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 22, flex: 1 }}>
          {STEP_DEFS.map((sd) => {
            const stt = sop.step === sd.n ? 'active' : sop.step > sd.n ? 'done' : 'future';
            const active = stt === 'active';
            const done = stt === 'done';
            return (
              <Clickable
                key={sd.n}
                onClick={() => dispatch({ type: 'step', step: sd.n })}
                ariaLabel={`Go to step ${sd.n}`}
                style={{
                  display: 'flex',
                  width: '100%',
                  gap: 16,
                  alignItems: 'center',
                  padding: '15px 18px',
                  borderRadius: 16,
                  background: active
                    ? C.raised
                    : done
                      ? 'rgba(166,226,107,0.06)'
                      : 'rgba(8,16,12,0.35)',
                  border: `${active ? 2 : 1}px solid ${active ? C.lime : done ? 'rgba(166,226,107,0.18)' : C.line2}`,
                  opacity: done ? 0.65 : 1,
                }}
              >
                <div
                  style={{
                    width: 34,
                    height: 34,
                    flexShrink: 0,
                    borderRadius: '50%',
                    background: active
                      ? C.lime
                      : done
                        ? 'rgba(166,226,107,0.18)'
                        : 'rgba(255,255,255,0.08)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    font: `800 15px ${FONT_UI}`,
                    color: active ? C.bg : done ? C.lime : C.muted2,
                  }}
                >
                  {done ? '✓' : sd.n}
                </div>
                <div>
                  <div
                    style={{
                      font: `700 16px ${FONT_UI}`,
                      whiteSpace: 'nowrap',
                      color: stt === 'future' ? C.ink2 : C.ink,
                    }}
                  >
                    {sd.t}
                  </div>
                  <div style={{ font: `500 13px ${FONT_UI}`, color: C.muted2 }}>{sd.d}</div>
                </div>
              </Clickable>
            );
          })}
        </div>
      </div>

      {/* PANEL */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 14, minWidth: 0 }}>
        <div
          style={{
            ...card,
            padding: '18px 24px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexShrink: 0,
          }}
        >
          <div>
            <div style={{ font: `400 12px ${FONT_MONO}`, color: C.muted2, letterSpacing: '1px' }}>
              STEP {sop.step} / 5
            </div>
            <div style={{ font: `700 19px ${FONT_UI}`, marginTop: 3 }}>{stepTitle}</div>
          </div>
          <div style={{ font: `600 14px ${FONT_UI}`, color: C.muted }}>{ctx}</div>
        </div>

        <div
          style={{
            flex: 1,
            ...card,
            padding: '24px 26px',
            display: 'flex',
            flexDirection: 'column',
            minHeight: 0,
          }}
        >
          {sop.step === 1 && <StepIdentify sop={sop} dispatch={dispatch} ctx={ctx} />}
          {sop.step === 2 && <StepDisorders sop={sop} dispatch={dispatch} />}
          {sop.step === 3 && <StepMeasure sop={sop} dispatch={dispatch} ctx={ctx} />}
          {sop.step === 4 && <StepPhotos sop={sop} dispatch={dispatch} ctx={ctx} />}
          {sop.step === 5 && <StepLog sop={sop} dispatch={dispatch} ctx={ctx} />}
        </div>

        <div style={{ display: 'flex', gap: 12, flexShrink: 0 }}>
          <Clickable
            onClick={() => dispatch({ type: 'prev' })}
            style={{
              flex: 1,
              width: '100%',
              padding: 16,
              borderRadius: 14,
              background: 'rgba(8,16,12,.45)',
              textAlign: 'center',
              font: `600 15px ${FONT_UI}`,
              color: C.muted,
            }}
          >
            ← Previous
          </Clickable>
          <Clickable
            onClick={() => dispatch({ type: 'next' })}
            style={{
              flex: 2,
              width: '100%',
              padding: 16,
              borderRadius: 14,
              background: C.lime,
              textAlign: 'center',
              font: `700 15px ${FONT_UI}`,
              color: C.bg,
            }}
          >
            {primaryLabel}
          </Clickable>
        </div>
      </div>
    </div>
  );
}

function StepIdentify({
  sop,
  dispatch,
  ctx,
}: {
  sop: SopState;
  dispatch: Dispatch<SopAction>;
  ctx: string;
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
      <div style={{ font: `600 15px ${FONT_UI}`, color: C.ink2 }}>Select treatment</div>
      <div style={{ display: 'flex', gap: 10, marginTop: 12 }}>
        {TREATMENT_ORDER.map((id) => {
          const on = sop.treatment === id;
          return (
            <Clickable
              key={id}
              onClick={() => dispatch({ type: 'treatment', id })}
              style={{
                flex: 1,
                padding: '18px 0',
                borderRadius: 14,
                background: on ? C.raised : 'rgba(8,16,12,0.4)',
                border: `2px solid ${on ? C.lime : C.line2}`,
                textAlign: 'center',
                font: `800 22px ${FONT_UI}`,
                color: on ? C.ink : C.muted,
              }}
            >
              {id}
            </Clickable>
          );
        })}
      </div>
      <div style={{ font: `600 15px ${FONT_UI}`, color: C.ink2, marginTop: 24 }}>
        Plant number{' '}
        <span style={{ fontWeight: 400, color: C.muted2 }}>· exclude guard/buffer plants</span>
      </div>
      <div style={{ display: 'flex', gap: 10, marginTop: 12 }}>
        {[1, 2, 3, 4, 5].map((n) => {
          const stt = sop.done.includes(n) ? 'done' : sop.sample === n ? 'current' : 'wait';
          const label = stt === 'done' ? 'Done' : stt === 'current' ? 'Current' : 'Waiting';
          return (
            <Clickable
              key={n}
              onClick={() => dispatch({ type: 'sample', n })}
              style={{
                flex: 1,
                padding: '18px 0',
                borderRadius: 14,
                background:
                  stt === 'current'
                    ? C.raised
                    : stt === 'done'
                      ? 'rgba(166,226,107,0.12)'
                      : 'rgba(8,16,12,0.4)',
                border: `2px solid ${stt === 'current' ? C.lime : stt === 'done' ? 'rgba(166,226,107,0.3)' : C.line2}`,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 4,
              }}
            >
              <span
                style={{
                  font: `800 22px ${FONT_UI}`,
                  color: stt === 'wait' ? C.muted2 : stt === 'current' ? C.ink : C.lime,
                }}
              >
                #{n}
              </span>
              <span
                style={{ font: `600 11px ${FONT_MONO}`, color: stt === 'wait' ? C.faint : C.lime }}
              >
                {label}
              </span>
            </Clickable>
          );
        })}
      </div>
      <div
        style={{ marginTop: 'auto', paddingTop: 18, font: `500 14px ${FONT_UI}`, color: C.muted2 }}
      >
        Selected · <b style={{ color: C.lime }}>{ctx}</b> — non-destructive survey is next.
      </div>
    </div>
  );
}

function StepDisorders({ sop, dispatch }: { sop: SopState; dispatch: Dispatch<SopAction> }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
      <div style={{ font: `600 15px ${FONT_UI}`, color: C.ink2 }}>
        Observe disorders · Negative if none
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 16 }}>
        {DZ_META.map((d) => (
          <div
            key={d.k}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 16,
              padding: '14px 18px',
              borderRadius: 14,
              background: 'rgba(8,16,12,.4)',
              border: `1px solid ${C.line2}`,
            }}
          >
            <span style={{ font: `600 16px ${FONT_UI}`, color: C.ink2, width: 180, flexShrink: 0 }}>
              {d.label}
            </span>
            <div style={{ display: 'flex', gap: 8, flex: 1 }}>
              {SEV.map((o) => {
                const on = sop.dz[d.k] === o.v;
                return (
                  <Clickable
                    key={o.v}
                    onClick={() => dispatch({ type: 'dz', key: d.k, value: o.v })}
                    style={{
                      flex: 1,
                      padding: 12,
                      borderRadius: 10,
                      textAlign: 'center',
                      background: on ? o.a + '0.18)' : 'rgba(8,16,12,0.4)',
                      border: `1px solid ${on ? o.a + '0.45)' : C.line2}`,
                      color: on ? o.c : C.muted2,
                      font: `700 14px ${FONT_UI}`,
                    }}
                  >
                    {o.t}
                  </Clickable>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function StepMeasure({
  sop,
  dispatch,
  ctx,
}: {
  sop: SopState;
  dispatch: Dispatch<SopAction>;
  ctx: string;
}) {
  const tiles: {
    label: string;
    value: string;
    type: 'height' | 'leaves' | 'weight';
    step: number;
  }[] = [
    { label: 'Height · Height (cm)', value: sop.meas.height.toFixed(1), type: 'height', step: 0.5 },
    { label: 'Leaves · Leaf Count', value: String(sop.meas.leaves), type: 'leaves', step: 1 },
    { label: 'Weight · Fresh Weight (g)', value: String(sop.meas.weight), type: 'weight', step: 1 },
  ];
  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
      <div style={{ font: `600 15px ${FONT_UI}`, color: C.ink2 }}>
        Destructive measurement · {ctx}
      </div>
      <div style={{ display: 'flex', gap: 14, marginTop: 18, flex: 1 }}>
        {tiles.map((t) => (
          <div
            key={t.type}
            style={{
              flex: 1,
              background: 'rgba(8,16,12,.4)',
              border: `1px solid ${C.line2}`,
              borderRadius: 16,
              padding: 22,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 16,
            }}
          >
            <div style={{ font: `400 13px ${FONT_MONO}`, color: C.muted2 }}>{t.label}</div>
            <div style={{ font: `800 44px ${FONT_UI}` }}>{t.value}</div>
            <div style={{ display: 'flex', gap: 12, width: '100%' }}>
              <Clickable
                onClick={() => dispatch({ type: t.type, delta: -t.step })}
                ariaLabel={`decrease ${t.type}`}
                style={{ ...stepperBtn, background: 'rgba(255,255,255,.06)', color: C.ink }}
              >
                −
              </Clickable>
              <Clickable
                onClick={() => dispatch({ type: t.type, delta: t.step })}
                ariaLabel={`increase ${t.type}`}
                style={{ ...stepperBtn, background: 'rgba(166,226,107,.14)', color: C.lime }}
              >
                +
              </Clickable>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function StepPhotos({
  sop,
  dispatch,
  ctx,
}: {
  sop: SopState;
  dispatch: Dispatch<SopAction>;
  ctx: string;
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ font: `600 15px ${FONT_UI}`, color: C.ink2 }}>
          Standard-angle shots · {ctx}
        </div>
        <div style={{ font: `400 12px ${FONT_MONO}`, color: C.muted2 }}>
          {photoCount(sop.photos)} / 3 done
        </div>
      </div>
      <div style={{ display: 'flex', gap: 14, marginTop: 18, flex: 1 }}>
        {PH_META.map((p) => {
          const on = sop.photos[p.k];
          const color = on ? C.lime : C.muted2;
          return (
            <Clickable
              key={p.k}
              onClick={() => dispatch({ type: 'photo', key: p.k })}
              style={{
                flex: 1,
                borderRadius: 16,
                background: on ? 'rgba(166,226,107,0.10)' : 'rgba(8,16,12,0.4)',
                border: `2px solid ${on ? 'rgba(166,226,107,0.4)' : C.line}`,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 14,
              }}
            >
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none">
                <path
                  d="M3 8a2 2 0 012-2h2l1.5-2h7L18 6h1a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V8z"
                  stroke={color}
                  strokeWidth="1.6"
                  strokeLinejoin="round"
                />
                <circle cx="12" cy="12.5" r="3.2" stroke={color} strokeWidth="1.6" />
              </svg>
              <div style={{ font: `700 16px ${FONT_UI}`, color: C.ink }}>{p.t}</div>
              <div
                style={{
                  padding: '8px 16px',
                  borderRadius: 999,
                  background: 'rgba(8,16,12,.4)',
                  font: `600 13px ${FONT_UI}`,
                  color,
                }}
              >
                {on ? 'Captured ✓' : 'Capture'}
              </div>
            </Clickable>
          );
        })}
      </div>
    </div>
  );
}

function StepLog({
  sop,
  dispatch,
  ctx,
}: {
  sop: SopState;
  dispatch: Dispatch<SopAction>;
  ctx: string;
}) {
  const dz = disorderCount(sop.dz);
  const summary: [string, string][] = [
    ['Fresh weight', sop.meas.weight + ' g'],
    ['Height', sop.meas.height.toFixed(1) + ' cm'],
    ['Leaves', sop.meas.leaves + ''],
    ['Disorders', dz === 0 ? 'None' : `${dz} observed`],
    ['Photos', photoCount(sop.photos) + ' / 3'],
  ];
  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
      <div style={{ font: `600 15px ${FONT_UI}`, color: C.ink2 }}>
        Confirm climate readings · {ctx}
      </div>
      <div style={{ display: 'flex', gap: 16, marginTop: 16, flex: 1 }}>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            {[
              ['EC · mS/cm', '1.52'],
              ['pH', '6.03'],
              ['Temp · °C', '22.1'],
              ['Humidity · %RH', '64'],
            ].map(([k, v]) => (
              <div
                key={k}
                style={{ background: 'rgba(8,16,12,.4)', borderRadius: 12, padding: '14px 16px' }}
              >
                <div style={{ font: `400 11px ${FONT_MONO}`, color: C.muted2 }}>{k}</div>
                <div style={{ font: `700 22px ${FONT_UI}`, color: C.lime }}>{v}</div>
              </div>
            ))}
          </div>
          <Clickable
            onClick={() => dispatch({ type: 'env' })}
            style={{
              marginTop: 'auto',
              width: '100%',
              padding: '15px 18px',
              borderRadius: 12,
              background: sop.env ? 'rgba(166,226,107,0.12)' : 'rgba(8,16,12,0.4)',
              border: `1px solid ${sop.env ? C.lime : C.line}`,
              display: 'flex',
              alignItems: 'center',
              gap: 12,
            }}
          >
            <span
              style={{
                flexShrink: 0,
                width: 24,
                height: 24,
                borderRadius: 7,
                border: `2px solid ${sop.env ? C.lime : C.line}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                font: `800 14px ${FONT_UI}`,
                color: C.lime,
              }}
            >
              {sop.env ? '✓' : ''}
            </span>
            <span style={{ font: `600 15px ${FONT_UI}`, color: sop.env ? C.lime : C.muted }}>
              Include current climate readings in this sample
            </span>
          </Clickable>
        </div>
        <div
          style={{
            flex: 1,
            background: 'rgba(8,16,12,.4)',
            borderRadius: 16,
            padding: '20px 22px',
            display: 'flex',
            flexDirection: 'column',
            gap: 12,
          }}
        >
          <div style={{ font: `700 15px ${FONT_UI}` }}>Sample summary · {ctx}</div>
          {summary.map(([k, v]) => (
            <div
              key={k}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                font: `500 14px ${FONT_UI}`,
                color: C.muted,
              }}
            >
              <span>{k}</span>
              <b style={{ color: C.ink }}>{v}</b>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
