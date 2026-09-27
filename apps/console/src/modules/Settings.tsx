import { type RigConfig, useSettings } from '@via-farm-lab/data';

import { Chip } from '../components/Chip';
import { Clickable } from '../components/Clickable';
import { cardStyle, insetStyle, PageHeader } from '../components/Page';
import { C, CHIP, FONT_MONO, FONT_UI } from '../data/derive';

const SCOPE = 'nutrient:pilot.syd.a';

interface Field {
  readonly key: keyof RigConfig;
  readonly label: string;
  readonly unit: string;
  readonly step: number;
  readonly min: number;
  readonly decimals: number;
}

// The editable subset — the values an operator actually tunes during commissioning.
const FIELDS: Field[] = [
  { key: 'flowRateLmin', label: 'Delivery flow', unit: 'L/min', step: 0.1, min: 0.1, decimals: 1 },
  { key: 'pumpPowerW', label: 'Pump power', unit: 'W', step: 1, min: 1, decimals: 0 },
  { key: 'tauSec', label: 'Transport lag (τ)', unit: 's', step: 10, min: 5, decimals: 0 },
  { key: 'ecK', label: 'EC per stock', unit: 'mS·L/mL', step: 0.05, min: 0.05, decimals: 3 },
  { key: 'ecTol', label: 'EC tolerance', unit: '±mS/cm', step: 0.05, min: 0.05, decimals: 2 },
  { key: 'phTol', label: 'pH tolerance', unit: '±', step: 0.05, min: 0.05, decimals: 2 },
];

export function Settings() {
  const { settings, put } = useSettings();
  const entry = settings.find((s) => s.scope === SCOPE);
  const config = entry?.config;

  const stepBtn = (accent: boolean) =>
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

  const bump = (f: Field, dir: 1 | -1): void => {
    if (!config) return;
    const next = Math.max(f.min, +(config[f.key] + dir * f.step).toFixed(4));
    void put(SCOPE, { [f.key]: next });
  };

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', gap: 14 }}>
      <PageHeader
        title="Nutrient Settings"
        subtitle="Tune the reservoir's nutrient config. Saved to the twin and applied to the next dose live."
        alignEnd={false}
        right={
          <Chip chip={config ? CHIP.measured : CHIP.pending} style={{ padding: '7px 13px' }}>
            {config ? `● ${SCOPE}` : '○ Loading…'}
          </Chip>
        }
      />
      <div style={{ flex: 1, ...cardStyle, padding: 24, display: 'flex', flexDirection: 'column', gap: 12, minHeight: 0 }}>
        <div style={{ font: `700 15px ${FONT_UI}` }}>Reservoir nutrient config</div>
        <div style={{ font: `400 12px ${FONT_MONO}`, color: C.muted2 }}>
          Changes persist on the twin and feed the commissioning physics immediately.
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 6 }}>
          {FIELDS.map((f) => (
            <div key={f.key} style={{ ...insetStyle, padding: '14px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
              <div>
                <div style={{ font: `400 11px ${FONT_MONO}`, color: C.muted2 }}>
                  {f.label} <span style={{ color: C.faint }}>· {f.unit}</span>
                </div>
                <div style={{ font: `800 24px ${FONT_UI}`, marginTop: 2 }}>
                  {config ? config[f.key].toFixed(f.decimals) : '—'}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <Clickable onClick={() => bump(f, -1)} ariaLabel={`decrease ${f.label}`} style={stepBtn(false)}>−</Clickable>
                <Clickable onClick={() => bump(f, 1)} ariaLabel={`increase ${f.label}`} style={stepBtn(true)}>+</Clickable>
              </div>
            </div>
          ))}
        </div>
        <div style={{ marginTop: 'auto', font: `400 12px ${FONT_MONO}`, color: C.faint }}>
          Tip: lower the transport lag (τ) or raise the flow to see the commissioning ramp settle faster.
        </div>
      </div>
    </div>
  );
}
