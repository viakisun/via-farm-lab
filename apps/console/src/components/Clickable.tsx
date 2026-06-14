import type { CSSProperties, ReactNode } from 'react';

interface ClickableProps {
  readonly onClick: () => void;
  readonly style?: CSSProperties;
  readonly children: ReactNode;
  readonly title?: string;
  readonly ariaLabel?: string;
}

/**
 * A native <button> with all chrome reset, so interactive surfaces stay
 * keyboard-accessible (jsx-a11y) while keeping the design's bespoke styling.
 */
export function Clickable({ onClick, style, children, title, ariaLabel }: ClickableProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      aria-label={ariaLabel}
      style={{
        appearance: 'none',
        background: 'transparent',
        border: 'none',
        margin: 0,
        padding: 0,
        font: 'inherit',
        color: 'inherit',
        textAlign: 'inherit',
        cursor: 'pointer',
        ...style,
      }}
    >
      {children}
    </button>
  );
}
