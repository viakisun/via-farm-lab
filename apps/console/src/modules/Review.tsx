import { Chip } from '../components/Chip';
import { cardStyle, FilterPill, PageHeader } from '../components/Page';
import { DATASET } from '../data/dataset';
import { C, CHIP, FONT_MONO, FONT_UI, measKindColor } from '../data/derive';
import type { ReviewFilter } from '../types';

interface ReviewProps {
  readonly filter: ReviewFilter;
  readonly onFilter: (f: ReviewFilter) => void;
}

const statTile = (label: string, value: string, color: string) => (
  <div key={label} style={{ flex: 1, ...cardStyle, borderRadius: 14, padding: '14px 18px' }}>
    <div style={{ font: `400 11px ${FONT_MONO}`, color: C.muted2 }}>{label}</div>
    <div style={{ font: `800 24px ${FONT_UI}`, color, marginTop: 3 }}>{value}</div>
  </div>
);

export function Review({ filter, onFilter }: ReviewProps) {
  const all = DATASET.meas;
  const outliers = all.filter((m) => m.kind === 'outlier').length;
  const invalid = all.filter((m) => m.kind === 'invalid').length;
  const validRate = Math.round(((all.length - invalid) / all.length) * 100) + '%';
  const rows = all.filter((m) =>
    filter === 'all' ? true : m.kind === 'outlier' || m.kind === 'invalid',
  );

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', gap: 14 }}>
      <PageHeader
        title="Data Review"
        subtitle="M3 Photoperiod · A-2 running — review measurements, outliers and drift; exclude Invalid from analysis."
        alignEnd={false}
        right={
          <div style={{ display: 'flex', gap: 8 }}>
            <FilterPill label="All" active={filter === 'all'} onClick={() => onFilter('all')} />
            <FilterPill
              label="Flagged only"
              active={filter === 'flagged'}
              onClick={() => onFilter('flagged')}
            />
          </div>
        }
      />
      <div style={{ display: 'flex', gap: 14 }}>
        {statTile('Total measurements', String(all.length), C.ink)}
        {statTile('Outliers', String(outliers), C.amber)}
        {statTile('Excluded (Invalid)', String(invalid), C.coral)}
        {statTile('Valid rate', validRate, C.lime)}
      </div>
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
          <div style={{ width: 80 }}>Date</div>
          <div style={{ width: 80 }}>Sample</div>
          <div style={{ flex: 1 }}>Metric</div>
          <div style={{ flex: 1 }}>Value</div>
          <div style={{ flex: 1 }}>Method</div>
          <div style={{ width: 110, textAlign: 'right' }}>Status</div>
        </div>
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {rows.map((m, i) => {
            const flagged = m.kind === 'invalid' || m.kind === 'outlier';
            return (
              <div
                key={i}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  padding: '11px 24px',
                  borderBottom: `1px solid ${C.line2}`,
                  background: flagged ? 'rgba(233,196,92,0.04)' : 'transparent',
                }}
              >
                <div style={{ width: 80, font: `400 13px ${FONT_MONO}`, color: C.muted }}>
                  {m.date}
                </div>
                <div style={{ width: 80, font: `600 13px ${FONT_UI}` }}>{m.sample}</div>
                <div style={{ flex: 1, font: `500 14px ${FONT_UI}` }}>{m.metric}</div>
                <div style={{ flex: 1, font: `700 14px ${FONT_UI}`, color: measKindColor(m.kind) }}>
                  {m.value}
                </div>
                <div style={{ flex: 1, font: `400 13px ${FONT_MONO}`, color: C.muted2 }}>
                  {m.method}
                </div>
                <div style={{ width: 110, textAlign: 'right' }}>
                  <Chip chip={CHIP[m.kind]}>{m.status}</Chip>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
