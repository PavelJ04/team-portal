import { describe, expect, it } from 'vitest';
import { initials } from './player';

describe('player helpers', () => {
  it('should use first and last name initials', () => {
    expect(initials('Pavel Jurák')).toBe('PJ');
    expect(initials('  jan  karel  novák ')).toBe('JN');
  });

  it('should handle a single name and empty input', () => {
    expect(initials('Pavel')).toBe('P');
    expect(initials('')).toBe('?');
  });
});
