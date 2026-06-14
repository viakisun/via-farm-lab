import type { CSSProperties, ReactNode } from 'react';

interface ClickableProps {
  readonly onClick: () => void;
  readonly style?: CSSProperties;
  readonly children: ReactNode;
  readonly ariaLabel?: string;
}

/** Native <button> with chrome reset — keeps touch targets keyboard-accessible. */
export function Clickable({ onClick, style, children, ariaLabel }: ClickableProps) {
  return (
    <button
      type="button"
      onClick={onClick}
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
