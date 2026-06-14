import type { CSSProperties, ReactNode } from 'react';

import { FONT_UI, type ChipStyle } from '../data/derive';

interface ChipProps {
  readonly chip: ChipStyle;
  readonly children: ReactNode;
  readonly style?: CSSProperties;
}

/** Pill-shaped status chip (Measured / Manual / Estimated / Pending / Outlier / Invalid). */
export function Chip({ chip, children, style }: ChipProps) {
  return (
    <span
      style={{
        padding: '5px 11px',
        borderRadius: 999,
        background: chip.bg,
        border: chip.border,
        font: `600 12px ${FONT_UI}`,
        color: chip.color,
        whiteSpace: 'nowrap',
        ...style,
      }}
    >
      {children}
    </span>
  );
}
