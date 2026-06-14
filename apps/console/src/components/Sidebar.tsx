import { C, FONT_MONO, FONT_UI } from '../data/derive';
import type { ModuleId } from '../types';
import { Clickable } from './Clickable';
import { NAV_BOTTOM, NAV_TOP, type NavItem } from './nav';

interface SidebarProps {
  readonly active: ModuleId;
  readonly onSelect: (id: ModuleId) => void;
}

function NavRow({
  item,
  active,
  showTag,
  onSelect,
}: {
  readonly item: NavItem;
  readonly active: boolean;
  readonly showTag: boolean;
  readonly onSelect: (id: ModuleId) => void;
}) {
  return (
    <Clickable
      onClick={() => onSelect(item.id)}
      style={{
        display: 'flex',
        width: '100%',
        alignItems: 'center',
        gap: 11,
        padding: '10px 12px',
        borderRadius: 10,
        background: active ? 'rgba(166,226,107,0.10)' : 'transparent',
        marginBottom: 2,
      }}
    >
      <span
        style={{
          width: 7,
          height: 7,
          borderRadius: 2,
          flexShrink: 0,
          background: active ? C.lime : C.faint2,
        }}
      />
      <span
        style={{
          whiteSpace: 'nowrap',
          font: `600 14px ${FONT_UI}`,
          color: active ? C.ink : C.muted2,
        }}
      >
        {item.label}
      </span>
      {showTag && item.tag !== undefined && (
        <span style={{ marginLeft: 'auto', font: `600 11px ${FONT_MONO}`, color: C.faint }}>
          {item.tag}
        </span>
      )}
    </Clickable>
  );
}

export function Sidebar({ active, onSelect }: SidebarProps) {
  return (
    <aside
      style={{
        width: 248,
        flexShrink: 0,
        background: C.sidebar,
        borderRight: `1px solid ${C.line}`,
        display: 'flex',
        flexDirection: 'column',
        padding: '20px 14px',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '6px 8px 18px' }}>
        <div
          style={{
            width: 34,
            height: 34,
            borderRadius: 10,
            background: C.lime,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            font: `800 17px ${FONT_UI}`,
            color: C.bg,
          }}
        >
          V
        </div>
        <div>
          <div style={{ font: `800 16px ${FONT_UI}`, letterSpacing: '-.2px' }}>VIA Console</div>
          <div style={{ font: `400 10px ${FONT_MONO}`, color: C.faint, letterSpacing: 1 }}>
            FARM INTELLIGENCE
          </div>
        </div>
      </div>

      <div
        style={{
          font: `400 11px ${FONT_MONO}`,
          color: C.faint,
          letterSpacing: 1,
          padding: '8px 10px 5px',
        }}
      >
        OPERATIONS
      </div>
      {NAV_TOP.map((n) => (
        <NavRow key={n.id} item={n} active={active === n.id} showTag onSelect={onSelect} />
      ))}

      <div
        style={{
          font: `400 11px ${FONT_MONO}`,
          color: C.faint,
          letterSpacing: 1,
          padding: '16px 10px 5px',
        }}
      >
        DESIGN · DATA
      </div>
      {NAV_BOTTOM.map((n) => (
        <NavRow key={n.id} item={n} active={active === n.id} showTag={false} onSelect={onSelect} />
      ))}

      <div
        style={{
          marginTop: 'auto',
          display: 'flex',
          alignItems: 'center',
          gap: 11,
          padding: 10,
          borderRadius: 12,
          background: 'rgba(8,16,12,.5)',
        }}
      >
        <div
          style={{
            width: 32,
            height: 32,
            borderRadius: '50%',
            background: C.raised,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            font: `700 13px ${FONT_UI}`,
            color: C.lime,
          }}
        >
          M
        </div>
        <div>
          <div style={{ font: `600 13px ${FONT_UI}` }}>M. Reid · Researcher</div>
          <div style={{ font: `400 11px ${FONT_MONO}`, color: C.faint }}>Glasshouse A · M2/M3</div>
        </div>
      </div>
    </aside>
  );
}
