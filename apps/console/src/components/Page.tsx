import type { CSSProperties, ReactNode } from 'react';

import { C, FONT_UI } from '../data/derive';
import { Clickable } from './Clickable';

/** Base card surface used across modules. Spread into a style and extend. */
export const cardStyle: CSSProperties = {
  background: C.card,
  border: '1px solid rgba(255,255,255,.07)',
  borderRadius: 16,
};

export const insetStyle: CSSProperties = {
  background: C.inset,
  borderRadius: 12,
  padding: '13px 15px',
};

/** Standard module header: title + subtitle, optional right-aligned actions. */
export function PageHeader({
  title,
  subtitle,
  right,
  alignEnd = true,
}: {
  readonly title: string;
  readonly subtitle: string;
  readonly right?: ReactNode;
  readonly alignEnd?: boolean;
}) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: alignEnd ? 'flex-end' : 'center',
        justifyContent: 'space-between',
      }}
    >
      <div>
        <div style={{ font: `800 23px ${FONT_UI}`, letterSpacing: '-.3px' }}>{title}</div>
        <div style={{ font: `500 13px ${FONT_UI}`, color: C.muted2, marginTop: 3 }}>{subtitle}</div>
      </div>
      {right}
    </div>
  );
}

/** Pill-style filter button row helper. */
export function FilterPill({
  label,
  active,
  onClick,
}: {
  readonly label: string;
  readonly active: boolean;
  readonly onClick: () => void;
}) {
  return (
    <Clickable
      onClick={onClick}
      style={{
        padding: '8px 16px',
        borderRadius: 999,
        background: active ? 'rgba(166,226,107,0.12)' : 'transparent',
        border: `1px solid ${active ? 'rgba(166,226,107,0.3)' : 'rgba(255,255,255,0.08)'}`,
        font: `600 13px ${FONT_UI}`,
        color: active ? C.lime : C.muted,
        whiteSpace: 'nowrap',
      }}
    >
      {label}
    </Clickable>
  );
}
