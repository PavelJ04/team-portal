import { describe, expect, it } from 'vitest';
import { buildSpayd, formatIban, isValidIban, paymentStatus, spaydText, toIban } from './payment';

describe('payment helpers', () => {
  it('should convert a Czech account number to IBAN', () => {
    // Vzorový účet z dokumentace České národní banky.
    expect(toIban('19-2000145399/0800')).toBe('CZ6508000000192000145399');
  });

  it('should accept IBAN with spaces', () => {
    expect(toIban('CZ65 0800 0000 1920 0014 5399')).toBe('CZ6508000000192000145399');
  });

  it('should reject invalid account numbers', () => {
    expect(toIban('19-2000145398/0800')).toBeNull();
    expect(toIban('CZ66 0800 0000 1920 0014 5399')).toBeNull();
    expect(toIban('nesmysl')).toBeNull();
    expect(toIban('')).toBeNull();
  });

  it('should validate IBAN checksum', () => {
    expect(isValidIban('CZ6508000000192000145399')).toBe(true);
    expect(isValidIban('CZ6508000000192000145398')).toBe(false);
  });

  it('should format IBAN in groups of four', () => {
    expect(formatIban('CZ6508000000192000145399')).toBe('CZ65 0800 0000 1920 0014 5399');
  });

  it('should build QR payment text', () => {
    const text = buildSpayd(
      {
        iban: 'CZ6508000000192000145399',
        amount: 500,
        dueDate: '2026-12-06',
        variableSymbol: '2026',
      },
      'Příspěvek Pavel Jurák',
    );

    expect(text).toBe(
      'SPD*1.0*ACC:CZ6508000000192000145399*AM:500.00*CC:CZK*DT:20261206*MSG:Prispevek Pavel Jurak*X-VS:2026',
    );
  });

  it('should omit empty optional QR fields', () => {
    const text = buildSpayd(
      { iban: 'CZ6508000000192000145399', amount: 99.5, dueDate: '2026-12-06', variableSymbol: '' },
      '',
    );

    expect(text).toBe('SPD*1.0*ACC:CZ6508000000192000145399*AM:99.50*CC:CZK*DT:20261206');
  });

  it('should strip diacritics, stars and limit length of QR text', () => {
    expect(spaydText('Žluťoučký * kůň', 60)).toBe('Zlutoucky kun');
    expect(spaydText('a'.repeat(80), 60)).toHaveLength(60);
  });

  it('should compute payment status', () => {
    const payment = { dueDate: '2026-12-06', paid: { anna: { name: 'Anna', paidAt: '' } } };

    expect(paymentStatus(payment, 'anna', '2026-12-10')).toBe('paid');
    expect(paymentStatus(payment, 'bob', '2026-12-06')).toBe('unpaid');
    expect(paymentStatus(payment, 'bob', '2026-12-07')).toBe('overdue');
  });
});
