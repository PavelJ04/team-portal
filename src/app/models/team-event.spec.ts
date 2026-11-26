import { describe, expect, it } from 'vitest';
import {
  TeamEvent,
  daysFromToday,
  formatPlace,
  fromLocalInputValue,
  isUpcoming,
  summarize,
  toLocalInputValue,
} from './team-event';

function createEvent(changes: Partial<TeamEvent> = {}): TeamEvent {
  return {
    id: 'event-1',
    type: 'training',
    title: 'Trénink',
    place: 'Hala',
    city: 'Zlín',
    startsAt: '2026-11-20T17:00:00.000Z',
    note: '',
    createdBy: 'coach',
    createdAt: '2026-11-01T10:00:00.000Z',
    responses: {},
    ...changes,
  };
}

describe('team-event helpers', () => {
  it('should count responses by status', () => {
    const event = createEvent({
      responses: {
        a: { status: 'yes', name: 'Anna', updatedAt: '' },
        b: { status: 'yes', name: 'Bob', updatedAt: '' },
        c: { status: 'no', name: 'Cyril', updatedAt: '' },
      },
    });

    expect(summarize(event)).toEqual({ yes: 2, maybe: 0, no: 1 });
  });

  it('should treat a running event as upcoming for two hours', () => {
    const event = createEvent();

    expect(isUpcoming(event, new Date('2026-11-20T18:30:00.000Z'))).toBe(true);
    expect(isUpcoming(event, new Date('2026-11-20T19:30:00.000Z'))).toBe(false);
  });

  it('should convert between ISO and datetime-local values', () => {
    const iso = fromLocalInputValue('2026-11-20T18:00');

    expect(iso).not.toBeNull();
    expect(toLocalInputValue(iso as string)).toBe('2026-11-20T18:00');
    expect(fromLocalInputValue('')).toBeNull();
    expect(fromLocalInputValue('nesmysl')).toBeNull();
  });

  it('should count days from today', () => {
    const today = new Date('2026-11-16T12:00:00');

    expect(daysFromToday('2026-11-16', today)).toBe(0);
    expect(daysFromToday('2026-11-19', today)).toBe(3);
    expect(daysFromToday('2026-11-15', today)).toBe(-1);
  });

  it('should format the place with an optional city', () => {
    expect(formatPlace({ place: 'Hala', city: 'Zlín' })).toBe('Hala, Zlín');
    expect(formatPlace({ place: 'Hala', city: '' })).toBe('Hala');
  });
});
