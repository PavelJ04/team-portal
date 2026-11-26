import { describe, expect, it } from 'vitest';
import { reminderId, reminderTime } from './reminder';

describe('reminder helpers', () => {
  it('should create a stable positive 32-bit id', () => {
    const id = reminderId('3f2b6c1e-8d4a-4b7e-9a51-2c0d9e7f1a23');

    expect(id).toBe(reminderId('3f2b6c1e-8d4a-4b7e-9a51-2c0d9e7f1a23'));
    expect(id).toBeGreaterThan(0);
    expect(id).toBeLessThan(2 ** 31);
    expect(reminderId('jina-akce')).not.toBe(id);
  });

  it('should plan the reminder two hours before the event', () => {
    const now = new Date('2026-11-20T10:00:00.000Z');
    const at = reminderTime('2026-11-20T17:00:00.000Z', now);

    expect(at?.toISOString()).toBe('2026-11-20T15:00:00.000Z');
  });

  it('should skip reminders that would be in the past', () => {
    const now = new Date('2026-11-20T16:00:00.000Z');

    expect(reminderTime('2026-11-20T17:00:00.000Z', now)).toBeNull();
    expect(reminderTime('neplatne-datum', now)).toBeNull();
  });
});
