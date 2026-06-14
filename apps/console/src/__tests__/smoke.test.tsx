import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import App from '../App';

describe('Web Console', () => {
  it('renders the shell with the Dashboard active by default', () => {
    render(<App />);
    expect(screen.getByText('FARM INTELLIGENCE')).toBeTruthy();
    expect(screen.getByText('Recommended recipe')).toBeTruthy();
  });
});
