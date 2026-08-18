export interface NamedPerson {
  firstName: string;
  lastName: string;
}

export function formatPersonName(person: NamedPerson): string {
  return `${person.firstName} ${person.lastName}`.trim();
}

export function formatDateLabel(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(date);
}

export function formatExpiry(iso: string): string {
  return formatDateLabel(iso);
}
