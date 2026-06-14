import { Chip } from '../components/Chip';
import { cardStyle, PageHeader } from '../components/Page';
import { DATASET } from '../data/dataset';
import { C, CHIP, FONT_MONO, FONT_UI, SYS_COLOR } from '../data/derive';

export function Devices() {
  const measured = DATASET.devices.filter((d) => d.status === 'Measured').length;
  const pending = DATASET.devices.length - measured;
  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', gap: 16 }}>
      <PageHeader
        title="Device Registry"
        subtitle="Map device models, locations and metrics to dashboard indicators and define alert rules."
        right={
          <div style={{ display: 'flex', gap: 9 }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 7,
                padding: '8px 14px',
                borderRadius: 999,
                background: 'rgba(166,226,107,.10)',
                border: '1px solid rgba(166,226,107,.3)',
                font: `600 12px ${FONT_UI}`,
                color: C.lime,
                whiteSpace: 'nowrap',
              }}
            >
              Measured {measured}
            </div>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 7,
                padding: '8px 14px',
                borderRadius: 999,
                background: 'transparent',
                border: '1px dashed rgba(94,116,104,.6)',
                font: `600 12px ${FONT_UI}`,
                color: C.muted2,
                whiteSpace: 'nowrap',
              }}
            >
              Pending {pending}
            </div>
          </div>
        }
      />
      <div
        style={{
          flex: 1,
          ...cardStyle,
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <div
          style={{
            display: 'flex',
            font: `400 11px ${FONT_MONO}`,
            color: C.faint,
            letterSpacing: '.5px',
            padding: '13px 24px',
            borderBottom: `1px solid ${C.line}`,
          }}
        >
          <div style={{ width: 96 }}>System</div>
          <div style={{ flex: 1.3 }}>Device model</div>
          <div style={{ flex: 1 }}>Location</div>
          <div style={{ flex: 1.2 }}>Metric mapping</div>
          <div style={{ width: 110, textAlign: 'right' }}>Status</div>
        </div>
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {DATASET.devices.map((d, i) => {
            const sc = SYS_COLOR[d.sys];
            const chip = d.status === 'Measured' ? CHIP.measured : CHIP.pending;
            return (
              <div
                key={i}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  padding: '12px 24px',
                  borderBottom: `1px solid ${C.line2}`,
                }}
              >
                <div style={{ width: 96 }}>
                  <span
                    style={{
                      padding: '3px 10px',
                      borderRadius: 7,
                      background: sc[0],
                      font: `600 11px ${FONT_UI}`,
                      color: sc[1],
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {d.sys}
                  </span>
                </div>
                <div style={{ flex: 1.3, font: `600 14px ${FONT_UI}` }}>{d.model}</div>
                <div style={{ flex: 1, font: `500 13px ${FONT_UI}`, color: C.muted }}>{d.loc}</div>
                <div style={{ flex: 1.2, font: `400 13px ${FONT_MONO}`, color: C.muted }}>
                  {d.metric}
                </div>
                <div style={{ width: 110, textAlign: 'right' }}>
                  <Chip chip={chip}>{d.status}</Chip>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
