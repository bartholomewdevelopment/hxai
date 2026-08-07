/**
 * Historical dates are stored as ISO strings but must never be rendered through
 * a timezone-aware Date — that shifts an 1809 birthday by a day depending on
 * where the reader sits. These format from the string parts directly.
 */

const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

export function formatHistoricalDate(value: string | null): string | null {
  if (!value) return null;
  const [year, month, day] = value.split('-');
  if (!year) return null;
  if (!month || !day) return year;
  const monthName = MONTHS[Number(month) - 1];
  return monthName ? `${monthName} ${Number(day)}, ${year}` : year;
}

export function formatYear(value: string | null): string | null {
  return value?.split('-')[0] ?? null;
}

/** "1809–1865", or "b. 1809" for a figure with no recorded death date. */
export function formatLifespan(birth: string | null, death: string | null): string {
  const from = formatYear(birth);
  const to = formatYear(death);
  if (from && to) return `${from}–${to}`;
  if (from) return `b. ${from}`;
  if (to) return `d. ${to}`;
  return 'Dates unknown';
}

export function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
}
