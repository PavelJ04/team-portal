/** Platba, kterou trenér vypsal všem hráčům (např. členský příspěvek). */
export interface Payment {
  id: string;
  title: string;
  /** Částka v Kč. */
  amount: number;
  /** Datum splatnosti ve tvaru YYYY-MM-DD. */
  dueDate: string;
  /** Číslo účtu příjemce ve formátu IBAN bez mezer. */
  iban: string;
  /** Variabilní symbol; prázdný řetězec, pokud není. */
  variableSymbol: string;
  note: string;
  createdBy: string;
  createdAt: string;
  /** Kdo už zaplatil: klíčem je UID hráče. Označuje trenér. */
  paid: Record<string, { name: string; paidAt: string }>;
}

export type PaymentInput = Pick<
  Payment,
  'title' | 'amount' | 'dueDate' | 'iban' | 'variableSymbol' | 'note'
>;

export type PaymentStatus = 'paid' | 'unpaid' | 'overdue';

export const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
  paid: 'Zaplaceno',
  unpaid: 'Nezaplaceno',
  overdue: 'Po splatnosti',
};

export const PAYMENT_STATUS_COLORS: Record<PaymentStatus, string> = {
  paid: 'success',
  unpaid: 'warning',
  overdue: 'danger',
};

/** Stav platby pro hráče k zadanému dni (YYYY-MM-DD). */
export function paymentStatus(
  payment: Pick<Payment, 'paid' | 'dueDate'>,
  uid: string,
  today: string,
): PaymentStatus {
  if (uid in payment.paid) {
    return 'paid';
  }

  return payment.dueDate < today ? 'overdue' : 'unpaid';
}

const amountFormat = new Intl.NumberFormat('cs-CZ', {
  style: 'currency',
  currency: 'CZK',
  maximumFractionDigits: 2,
});

export function formatAmount(amount: number): string {
  return amountFormat.format(amount);
}

/** Datum YYYY-MM-DD zobrazí česky, například „6. 12. 2026“. */
export function formatDueDate(date: string): string {
  const [year, month, day] = date.split('-').map(Number);
  return year && month && day ? `${day}. ${month}. ${year}` : date;
}

/** Zbytek po dělení 97 pro dlouhé číslo zapsané jako řetězec číslic. */
function mod97(digits: string): number {
  let remainder = 0;
  for (const digit of digits) {
    remainder = (remainder * 10 + Number(digit)) % 97;
  }
  return remainder;
}

/** Převod písmen IBANu na čísla podle normy (A = 10 … Z = 35). */
function lettersToDigits(value: string): string {
  return value.replace(/[A-Z]/g, (letter) => String(letter.charCodeAt(0) - 55));
}

export function isValidIban(value: string): boolean {
  const iban = value.replace(/\s+/g, '').toUpperCase();
  if (!/^[A-Z]{2}\d{2}[A-Z0-9]{10,30}$/.test(iban)) {
    return false;
  }

  const rearranged = iban.slice(4) + iban.slice(0, 4);
  return mod97(lettersToDigits(rearranged)) === 1;
}

const PREFIX_WEIGHTS = [10, 5, 8, 4, 2, 1];
const NUMBER_WEIGHTS = [6, 3, 7, 9, 10, 5, 8, 4, 2, 1];

/** Kontrola českého čísla účtu (vážený součet číslic musí být dělitelný 11). */
function isValidCzechAccountPart(value: string, weights: number[]): boolean {
  const digits = value.padStart(weights.length, '0');
  const sum = [...digits].reduce(
    (total, digit, index) => total + Number(digit) * weights[index],
    0,
  );
  return sum % 11 === 0;
}

/**
 * Převede číslo účtu na IBAN.
 * Přijímá IBAN (s mezerami i bez) nebo české číslo účtu ve tvaru „předčíslí-číslo/kód banky“.
 * Vrací null, pokud vstup není platný.
 */
export function toIban(input: string): string | null {
  const value = input.replace(/\s+/g, '').toUpperCase();

  if (/^[A-Z]{2}/.test(value)) {
    return isValidIban(value) ? value : null;
  }

  const match = /^(?:(\d{1,6})-)?(\d{2,10})\/(\d{4})$/.exec(value);
  if (!match) {
    return null;
  }

  const [, prefix = '', number, bank] = match;
  if (
    !isValidCzechAccountPart(prefix, PREFIX_WEIGHTS) ||
    !isValidCzechAccountPart(number, NUMBER_WEIGHTS)
  ) {
    return null;
  }

  const bban = bank + prefix.padStart(6, '0') + number.padStart(10, '0');
  // CZ = 12 35, kontrolní číslice se počítají z „BBAN + CZ00“.
  const check = 98 - mod97(bban + '123500');
  const iban = `CZ${String(check).padStart(2, '0')}${bban}`;

  return isValidIban(iban) ? iban : null;
}

/** IBAN po čtveřicích pro snadné čtení: „CZ65 0800 0000 …“. */
export function formatIban(iban: string): string {
  return iban.replace(/(.{4})/g, '$1 ').trim();
}

/** Text pro QR platbu: bez diakritiky, hvězdiček a nejvýše o zadané délce. */
export function spaydText(text: string, maxLength: number): string {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\x20-\x7e]/g, ' ')
    .replace(/\*/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxLength);
}

/**
 * Řetězec pro českou QR platbu (formát SPAYD), který umí přečíst bankovní aplikace.
 * Příklad: SPD*1.0*ACC:CZ65…*AM:500.00*CC:CZK*DT:20261206*MSG:PRISPEVEK*X-VS:2026
 */
export function buildSpayd(
  payment: Pick<Payment, 'iban' | 'amount' | 'dueDate' | 'variableSymbol'>,
  message: string,
): string {
  const parts = [
    'SPD',
    '1.0',
    `ACC:${payment.iban}`,
    `AM:${payment.amount.toFixed(2)}`,
    'CC:CZK',
    `DT:${payment.dueDate.replace(/-/g, '')}`,
  ];

  const msg = spaydText(message, 60);
  if (msg) {
    parts.push(`MSG:${msg}`);
  }

  if (payment.variableSymbol) {
    parts.push(`X-VS:${payment.variableSymbol}`);
  }

  return parts.join('*');
}
