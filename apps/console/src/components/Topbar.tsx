import { C, FONT_MONO, FONT_UI } from '../data/derive';

export function Topbar({ modLabel }: { readonly modLabel: string }) {
  return (
    <div
      style={{
        height: 62,
        flexShrink: 0,
        borderBottom: `1px solid ${C.line}`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 26px',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          font: `400 13px ${FONT_MONO}`,
          color: C.muted2,
        }}
      >
        VIA Console
        <span style={{ color: C.faint2 }}>/</span>
        <span
          style={{
            color: C.ink,
            fontFamily: FONT_UI,
            fontWeight: 600,
            fontSize: 15,
            whiteSpace: 'nowrap',
          }}
        >
          {modLabel}
        </span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '7px 13px',
            borderRadius: 999,
            background: C.card,
            border: `1px solid rgba(255,255,255,.07)`,
            font: `500 13px ${FONT_UI}`,
            color: C.ink2,
            whiteSpace: 'nowrap',
          }}
        >
          Season <b style={{ color: C.ink }}>Spring 2026</b>{' '}
          <span style={{ font: `400 11px ${FONT_MONO}`, color: C.faint }}>25 experiments</span>
        </div>
        <div
          style={{
            padding: '8px 15px',
            borderRadius: 9,
            background: 'rgba(255,255,255,.05)',
            font: `600 13px ${FONT_UI}`,
            color: C.ink2,
            cursor: 'pointer',
            whiteSpace: 'nowrap',
          }}
        >
          Export
        </div>
        <div
          style={{
            padding: '8px 16px',
            borderRadius: 9,
            background: C.lime,
            font: `700 13px ${FONT_UI}`,
            color: C.bg,
            cursor: 'pointer',
            whiteSpace: 'nowrap',
          }}
        >
          + New experiment
        </div>
      </div>
    </div>
  );
}
