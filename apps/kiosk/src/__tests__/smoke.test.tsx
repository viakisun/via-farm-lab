import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import App from '../App';

describe('Kiosk', () => {
  it('renders the shell with the Economic Overview screen by default', () => {
    render(<App />);
    expect(screen.getByText('VIA FARM INTELLIGENCE · KIOSK')).toBeTruthy();
    expect(screen.getByText('Projected Gross Profit · wholesale-adjusted')).toBeTruthy();
  });
});
