import { Chip } from '../components/Chip';
import { Clickable } from '../components/Clickable';
import { cardStyle, FilterPill, insetStyle, PageHeader } from '../components/Page';
import { DATASET } from '../data/dataset';
import { audAmt, audRate, C, FONT_MONO, FONT_UI } from '../data/derive';
import type { ExpFilter } from '../types';

interface ExperimentsProps {
  readonly filter: ExpFilter;
  readonly onFilter: (f: ExpFilter) => void;
  readonly selectedId: string | null;
  readonly onSelect: (id: string) => void;
  readonly onOpenReport: () => void;
}

const headCell = { font: `400 11px ${FONT_MONO}`, color: C.faint, letterSpacing: '.5px' } as const;
const detailRow = {
  display: 'flex',
  justifyContent: 'space-between',
  font: `500 13px ${FONT_UI}`,
  color: C.muted,
} as const;

export function Experiments({
  filter,
  onFilter,
  selectedId,
  onSelect,
  onOpenReport,
}: ExperimentsProps) {
  const filtered = DATASET.exps.filter((e) =>
    filter === 'all' ? true : filter === 'done' ? e.done : !e.done,
  );
  const selId = selectedId ?? DATASET.recId;
  const se =
    DATASET.exps.find((e) => e.id === selId) ?? DATASET.exps.find((e) => e.id === DATASET.recId);
  if (!se) return null;

  const statusChip = (done: boolean) =>
    done
      ? { bg: 'rgba(166,226,107,0.12)', border: 'none', color: C.lime }
      : { bg: 'rgba(233,196,92,0.14)', border: 'none', color: C.amber };

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', gap: 14 }}>
      <PageHeader
        title="Experiments"
        subtitle="20 completed · 5 running — select a row for detailed economics."
        alignEnd={false}
        right={
          <div style={{ display: 'flex', gap: 8 }}>
            <FilterPill label="All 25" active={filter === 'all'} onClick={() => onFilter('all')} />
            <FilterPill
              label="Completed 20"
              active={filter === 'done'}
              onClick={() => onFilter('done')}
            />
            <FilterPill
              label="Running 5"
              active={filter === 'running'}
              onClick={() => onFilter('running')}
            />
          </div>
        }
      />
      <div style={{ flex: 1, display: 'flex', gap: 16, minHeight: 0 }}>
        {/* LIST */}
        <div
          style={{
            flex: 1.5,
            ...cardStyle,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            minWidth: 0,
          }}
        >
          <div
            style={{
              display: 'flex',
              ...headCell,
              padding: '13px 20px',
              borderBottom: `1px solid ${C.line}`,
              flexShrink: 0,
            }}
          >
            <div style={{ width: 74 }}>ID</div>
            <div style={{ flex: 1.4 }}>Experiment · crop</div>
            <div style={{ width: 60, textAlign: 'center' }}>Photo.</div>
            <div style={{ flex: 1, textAlign: 'right' }}>P/Bed-Day</div>
            <div style={{ width: 70, textAlign: 'right' }}>Sellable</div>
            <div style={{ width: 78, textAlign: 'right' }}>Status</div>
          </div>
          <div style={{ flex: 1, overflowY: 'auto' }}>
            {filtered.map((e) => {
              const on = selId === e.id;
              return (
                <Clickable
                  key={e.id}
                  onClick={() => onSelect(e.id)}
                  style={{
                    display: 'flex',
                    width: '100%',
                    alignItems: 'center',
                    padding: '12px 20px',
                    borderBottom: `1px solid ${C.line2}`,
                    background: on ? 'rgba(166,226,107,0.07)' : 'transparent',
                    borderLeft: `2px solid ${on ? C.lime : 'transparent'}`,
                  }}
                >
                  <div style={{ width: 74, font: `700 13px ${FONT_MONO}`, color: C.ink2 }}>
                    {e.id}
                  </div>
                  <div style={{ flex: 1.4, minWidth: 0 }}>
                    <div
                      style={{
                        font: `600 14px ${FONT_UI}`,
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                    >
                      {e.recommended ? '★ ' : ''}
                      {e.trial}
                    </div>
                    <div style={{ font: `400 11px ${FONT_MONO}`, color: C.muted2 }}>
                      {e.crop} · {e.bed}
                    </div>
                  </div>
                  <div style={{ width: 60, textAlign: 'center', font: `700 14px ${FONT_UI}` }}>
                    {e.p}h
                  </div>
                  <div style={{ flex: 1, textAlign: 'right', font: `700 14px ${FONT_UI}` }}>
                    {audRate(e.ppbd)}
                  </div>
                  <div
                    style={{
                      width: 70,
                      textAlign: 'right',
                      font: `500 13px ${FONT_UI}`,
                      color: C.muted,
                    }}
                  >
                    {e.sellable}%
                  </div>
                  <div style={{ width: 78, textAlign: 'right' }}>
                    <Chip chip={statusChip(e.done)} style={{ padding: '4px 10px', fontSize: 11 }}>
                      {e.status}
                    </Chip>
                  </div>
                </Clickable>
              );
            })}
          </div>
        </div>

        {/* DETAIL */}
        <div
          style={{
            width: 392,
            flexShrink: 0,
            ...cardStyle,
            padding: 22,
            display: 'flex',
            flexDirection: 'column',
            gap: 16,
            overflowY: 'auto',
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ font: `700 13px ${FONT_MONO}`, color: C.muted2 }}>{se.id}</span>
              <Chip chip={statusChip(se.done)} style={{ padding: '4px 10px', fontSize: 11 }}>
                {se.status}
              </Chip>
              <Chip
                chip={
                  se.recommended
                    ? { bg: C.lime, border: 'none', color: C.bg }
                    : { bg: 'rgba(111,183,232,0.14)', border: 'none', color: C.sky }
                }
                style={{ padding: '4px 10px', fontSize: 11 }}
              >
                {se.recommended ? 'Recommended' : 'Candidate'}
              </Chip>
            </div>
            <div style={{ font: `800 24px ${FONT_UI}`, marginTop: 10 }}>{se.trial}</div>
            <div style={{ font: `500 13px ${FONT_UI}`, color: C.muted, marginTop: 3 }}>
              {se.crop} {se.cv} · {se.bed} · {se.p}h · PPFD {se.ppfd} · DLI {se.dli.toFixed(2)}
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div style={insetStyle}>
              <div style={{ font: `400 11px ${FONT_MONO}`, color: C.muted2 }}>Profit / Bed-Day</div>
              <div style={{ font: `800 22px ${FONT_UI}`, color: C.lime, marginTop: 3 }}>
                {audRate(se.ppbd)}
              </div>
            </div>
            <div style={insetStyle}>
              <div style={{ font: `400 11px ${FONT_MONO}`, color: C.muted2 }}>
                Est. total profit
              </div>
              <div style={{ font: `800 22px ${FONT_UI}`, marginTop: 3 }}>{audAmt(se.profit)}</div>
            </div>
            <div style={insetStyle}>
              <div style={{ font: `400 11px ${FONT_MONO}`, color: C.muted2 }}>Cost / kg</div>
              <div style={{ font: `700 19px ${FONT_UI}`, marginTop: 3 }}>{audRate(se.costKg)}</div>
            </div>
            <div style={insetStyle}>
              <div style={{ font: `400 11px ${FONT_MONO}`, color: C.muted2 }}>vs Control 16h</div>
              <div
                style={{
                  font: `700 19px ${FONT_UI}`,
                  color: se.improvement >= 0 ? C.lime : C.coral,
                  marginTop: 3,
                }}
              >
                {(se.improvement >= 0 ? '▲ ' : '▼ ') + Math.abs(se.improvement) + '%'}
              </div>
            </div>
          </div>

          <div>
            <div style={{ font: `700 14px ${FONT_UI}`, marginBottom: 8 }}>Growth · quality</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
              <div style={detailRow}>
                <span>Fresh weight</span>
                <b style={{ color: C.ink }}>{se.fw} g</b>
              </div>
              <div style={detailRow}>
                <span>Sellable</span>
                <b style={{ color: C.ink }}>{se.sellable}%</b>
              </div>
              <div style={detailRow}>
                <span>Tipburn</span>
                <b style={{ color: se.tipburn > 8 ? C.amber : C.ink }}>{se.tipburn}%</b>
              </div>
            </div>
          </div>

          <div>
            <div style={{ font: `700 14px ${FONT_UI}`, marginBottom: 8 }}>Resources · schedule</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
              <div style={detailRow}>
                <span>Power / Water / Nutrient</span>
                <b style={{ color: C.ink }}>
                  {se.energy} kWh · {se.waterL} L · {se.nutrientL} L
                </b>
              </div>
              <div style={detailRow}>
                <span>{se.done ? 'Grow period' : 'DAT · progress'}</span>
                <b style={{ color: C.ink }}>
                  {se.done ? `${se.start} → ${se.end}` : `${se.dat}d (D-${se.bedDays - se.dat})`}
                </b>
              </div>
              <div style={detailRow}>
                <span>Validation</span>
                <b style={{ color: C.lime }}>{se.validation} / 100</b>
              </div>
            </div>
          </div>

          <Clickable
            onClick={onOpenReport}
            style={{
              marginTop: 'auto',
              width: '100%',
              padding: 13,
              borderRadius: 11,
              background: 'rgba(166,226,107,.10)',
              border: '1px solid rgba(166,226,107,.28)',
              textAlign: 'center',
              font: `700 14px ${FONT_UI}`,
              color: C.lime,
            }}
          >
            Open in Report Builder →
          </Clickable>
        </div>
      </div>
    </div>
  );
}
