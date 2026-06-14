import type { CSSProperties, ReactNode } from 'react';

import { C, FONT_UI } from '../theme';

interface PillProps {
  readonly children: ReactNode;
  readonly color?: string;
  readonly bg?: string;
  readonly border?: string;
  readonly dot?: boolean | string;
  readonly pulse?: boolean;
  readonly size?: number;
  readonly style?: CSSProperties;
}

/** Rounded status chip with an optional leading dot (and optional pulse). */
export function Pill({
  children,
  color = C.ink2,
  bg = C.card,
  border,
  dot,
  pulse,
  size = 13,
  style,
}: PillProps) {
  const dotColor = typeof dot === 'string' ? dot : color;
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 7,
        padding: '7px 13px',
        borderRadius: 999,
        background: bg,
        border: border ?? `1px solid ${C.line}`,
        font: `600 ${size}px ${FONT_UI}`,
        color,
        whiteSpace: 'nowrap',
        ...style,
      }}
    >
      {dot && (
        <span
          style={{
            width: 6,
            height: 6,
            borderRadius: '50%',
            background: dotColor,
            flexShrink: 0,
            animation: pulse ? 'vfpulse 2s infinite' : undefined,
          }}
        />
      )}
      {children}
    </span>
  );
}
