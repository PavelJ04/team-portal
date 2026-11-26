export type EventType = 'training' | 'match' | 'other';
export type AttendanceStatus = 'yes' | 'maybe' | 'no';

export interface AttendanceResponse {
  status: AttendanceStatus;
  name: string;
  updatedAt: string;
}

export interface TeamEvent {
  id: string;
  type: EventType;
  title: string;
  place: string;
  city: string;
  /** Začátek akce jako ISO 8601 řetězec (UTC). */
  startsAt: string;
  note: string;
  createdBy: string;
  createdAt: string;
  /** Odpovědi hráčů; klíčem je UID hráče. */
  responses: Record<string, AttendanceResponse>;
}

/** Pole, která vyplňuje trenér ve formuláři akce. */
export type TeamEventInput = Pick<
  TeamEvent,
  'type' | 'title' | 'place' | 'city' | 'startsAt' | 'note'
>;

export interface AttendanceSummary {
  yes: number;
  maybe: number;
  no: number;
}

export const EVENT_TYPE_LABELS: Record<EventType, string> = {
  training: 'Trénink',
  match: 'Zápas',
  other: 'Týmová akce',
};

export const STATUS_LABELS: Record<AttendanceStatus, string> = {
  yes: 'Přijdu',
  maybe: 'Možná',
  no: 'Nepřijdu',
};

/** Jak dlouho po začátku akci ještě počítáme mezi nadcházející. */
const UPCOMING_GRACE_MS = 2 * 60 * 60 * 1000;

export function summarize(event: TeamEvent): AttendanceSummary {
  const summary: AttendanceSummary = { yes: 0, maybe: 0, no: 0 };
  for (const response of Object.values(event.responses)) {
    summary[response.status] += 1;
  }
  return summary;
}

export function isUpcoming(event: TeamEvent, now: Date = new Date()): boolean {
  return new Date(event.startsAt).getTime() + UPCOMING_GRACE_MS >= now.getTime();
}

/** Místo konání včetně města, například „Sportovní hala, Zlín“. */
export function formatPlace(event: Pick<TeamEvent, 'place' | 'city'>): string {
  return event.city ? `${event.place}, ${event.city}` : event.place;
}

function pad(value: number): string {
  return String(value).padStart(2, '0');
}

/** Místní datum ve tvaru YYYY-MM-DD. */
export function localDateIso(value: string | Date): string {
  const date = typeof value === 'string' ? new Date(value) : value;
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** Převod ISO času na hodnotu pro <input type="datetime-local">. */
export function toLocalInputValue(value: string | Date): string {
  const date = typeof value === 'string' ? new Date(value) : value;
  return `${localDateIso(date)}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

/** Převod hodnoty z <input type="datetime-local"> na ISO čas; null při neplatném vstupu. */
export function fromLocalInputValue(value: string): string | null {
  if (!value) {
    return null;
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

const eventDateFormat = new Intl.DateTimeFormat('cs-CZ', {
  weekday: 'short',
  day: 'numeric',
  month: 'numeric',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
});

export function formatEventDate(iso: string): string {
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? '' : eventDateFormat.format(date);
}

/** Počet celých dnů od dneška do zadaného místního data (záporné = minulost). */
export function daysFromToday(dateIso: string, today: Date = new Date()): number {
  const target = new Date(`${dateIso}T00:00:00`);
  const start = new Date(`${localDateIso(today)}T00:00:00`);
  return Math.round((target.getTime() - start.getTime()) / (24 * 60 * 60 * 1000));
}
