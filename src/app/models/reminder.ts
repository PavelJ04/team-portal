/** Kolik minut před začátkem akce přijde připomínka. */
export const REMINDER_MINUTES_BEFORE = 120;

/**
 * Číselné ID notifikace odvozené z ID akce.
 * LocalNotifications vyžaduje kladné 32bitové celé číslo; stejná akce dostane vždy stejné ID.
 */
export function reminderId(eventId: string): number {
  let hash = 0;
  for (let index = 0; index < eventId.length; index++) {
    hash = (hash * 31 + eventId.charCodeAt(index)) | 0;
  }
  return (Math.abs(hash) % 2147483646) + 1;
}

/** Čas připomínky; null, pokud by připomínka byla v minulosti. */
export function reminderTime(startsAt: string, now: Date = new Date()): Date | null {
  const start = new Date(startsAt).getTime();
  if (Number.isNaN(start)) {
    return null;
  }

  const at = new Date(start - REMINDER_MINUTES_BEFORE * 60 * 1000);
  return at.getTime() > now.getTime() ? at : null;
}
