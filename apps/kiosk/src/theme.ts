// Palette + money formatting for the kiosk (self-contained; mirrors the design).

export const C = {
  bg: '#0A130E',
  sidebar: '#0E1A14',
  card: '#13211A',
  raised: '#182C22',
  lime: '#A6E26B',
  sky: '#6FB7E8',
  amber: '#E9C45C',
  coral: '#E8836B',
  teal: '#5FAE9E',
  ink: '#ECF3ED',
  ink2: '#C7D6CC',
  muted: '#9DB3A4',
  muted2: '#7C9387',
  faint: '#5E7468',
  line: 'rgba(255,255,255,0.07)',
  line2: 'rgba(255,255,255,0.05)',
  inset: 'rgba(8,16,12,0.4)',
} as const;

export const FONT_UI = "'Hanken Grotesk', system-ui, sans-serif";
export const FONT_MONO = "'Space Mono', monospace";

// The design carries won-scale figures; en-AU presents A$ at 1/1000 of that
// scale, landing every value in a realistic Australian wholesale-lettuce range.
export const audRate = (won: number): string => 'A$' + (won / 1000).toFixed(2);
export const audAmt = (won: number): string =>
  'A$' + Math.round(won / 1000).toLocaleString('en-AU');
