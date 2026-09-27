import { type ScheduleInput, useSchedules } from '@via-farm-lab/data';

import { Chip } from '../components/Chip';
import { Clickable } from '../components/Clickable';
import { cardStyle, PageHeader } from '../components/Page';
import { C, CHIP, FONT_MONO, FONT_UI } from '../data/derive';

const RIG = 'pilot.syd.a';

// Recurring quick-adds (no client sim-clock needed; the BFF schedules from now).
const QUICK: { label: string; input: ScheduleInput }[] = [
  {
    label: '+ Dose → EC 1.8 every 30 min',
    input: { name: 'Dose EC 1.8 (30m)', everySimMs: 30 * 60_000, action: { kind: 'dose', rigId: RIG, target: { EC: 1.8, pH: 5.8, abRatio: 1 } } },
  },
  {
    label: '+ Apply flow 3.0 every 60 min',
    input: { name: 'Flow 3.0 L/min (60m)', everySimMs: 60 * 60_000, action: { kind: 'apply-setting', rigId: RIG, config: { flowRateLmin: 3 } } },
  },
];

const mins = (ms: number): string => `${Math.round(ms / 60_000)}m`;

const pill = (accent: boolean) =>
  ({
    padding: '8px 14px',
    borderRadius: 9,
    background: accent ? C.lime : 'rgba(255,255,255,.05)',
    font: `${accent ? 700 : 600} 13px ${FONT_UI}`,
    color: accent ? C.bg : C.ink2,
  }) as const;

export function Schedule() {
  const { jobs, create, toggle, remove, run } = useSchedules();

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', gap: 14 }}>
      <PageHeader
        title="Schedule"
        subtitle="Sim-time jobs that apply a setting or dose automatically. Runs on the twin clock."
        alignEnd={false}
        right={
          <div style={{ display: 'flex', gap: 8 }}>
            {QUICK.map((q) => (
              <Clickable key={q.label} onClick={() => void create(q.input)} style={pill(true)}>
                {q.label}
              </Clickable>
            ))}
          </div>
        }
      />
      <div style={{ flex: 1, ...cardStyle, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', font: `400 11px ${FONT_MONO}`, color: C.faint, letterSpacing: '.5px', padding: '13px 22px', borderBottom: `1px solid ${C.line}` }}>
          <div style={{ flex: 1.4 }}>Job</div>
          <div style={{ width: 90 }}>Action</div>
          <div style={{ width: 90 }}>Every</div>
          <div style={{ width: 110 }}>Next (sim)</div>
          <div style={{ width: 90 }}>Status</div>
          <div style={{ width: 200, textAlign: 'right' }}>Controls</div>
        </div>
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {jobs.length === 0 && (
            <div style={{ padding: 22, font: `500 14px ${FONT_UI}`, color: C.muted2 }}>
              No jobs yet — add one above, then advance the clock to watch it fire.
            </div>
          )}
          {jobs.map((j) => (
            <div key={j.id} style={{ display: 'flex', alignItems: 'center', padding: '12px 22px', borderBottom: `1px solid ${C.line2}` }}>
              <div style={{ flex: 1.4, font: `600 14px ${FONT_UI}` }}>{j.name}</div>
              <div style={{ width: 90, font: `500 13px ${FONT_UI}`, color: C.muted }}>{j.action.kind}</div>
              <div style={{ width: 90, font: `400 13px ${FONT_MONO}`, color: C.muted }}>
                {j.everySimMs ? mins(j.everySimMs) : 'once'}
              </div>
              <div style={{ width: 110, font: `400 13px ${FONT_MONO}`, color: C.muted2 }}>{mins(j.nextRunMs)}</div>
              <div style={{ width: 90 }}>
                <Chip chip={j.enabled ? CHIP.measured : CHIP.pending} style={{ padding: '4px 10px', fontSize: 11 }}>
                  {j.enabled ? 'active' : 'off'}
                </Chip>
              </div>
              <div style={{ width: 200, display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                <Clickable onClick={() => void run(j.id)} style={pill(false)}>Run</Clickable>
                <Clickable onClick={() => void toggle(j.id, !j.enabled)} style={pill(false)}>
                  {j.enabled ? 'Disable' : 'Enable'}
                </Clickable>
                <Clickable onClick={() => void remove(j.id)} style={{ ...pill(false), color: C.coral }}>Delete</Clickable>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
