export type PlayerRole = 'player' | 'coach';

export interface Player {
  uid: string;
  name: string;
  email: string;
  /** Číslo dresu; null, pokud ho hráč nevyplnil. */
  number: number | null;
  position: string;
  role: PlayerRole;
  createdAt: string;
  /** Profilová fotka jako malý JPEG v data URL; null, pokud ji hráč nenahrál. */
  photo?: string | null;
}

/** Údaje, které si hráč může sám upravit v profilu. */
export type PlayerProfileInput = Pick<Player, 'name' | 'number' | 'position'>;

export const POSITIONS: readonly string[] = [
  'Brankář',
  'Obránce',
  'Záložník',
  'Útočník',
  'Univerzál',
];

export const ROLE_LABELS: Record<PlayerRole, string> = {
  player: 'Hráč',
  coach: 'Trenér',
};

/** Iniciály pro avatar bez fotky, například „PJ“ pro „Pavel Jurák“. */
export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const letters = parts.length > 1 ? [parts[0], parts[parts.length - 1]] : parts;
  return letters.map((part) => part[0].toUpperCase()).join('') || '?';
}
