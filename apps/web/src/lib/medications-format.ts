import {
  MEDICATION_ADHERENCE_STATUS_LABELS,
  MEDICATION_FORM_LABELS,
  type MedicationAdherenceStatus,
  type MedicationForm,
} from '@longeviq/shared';

export function medicationFormLabel(form: MedicationForm): string {
  return MEDICATION_FORM_LABELS[form];
}

export function medicationStatusLabel(status: MedicationAdherenceStatus): string {
  return MEDICATION_ADHERENCE_STATUS_LABELS[status];
}

// '08:00' -> '8:00 AM'
export function formatTime12h(time: string): string {
  const match = /^([01]?\d|2[0-3]):([0-5]\d)$/.exec(time);
  if (!match) {
    return time;
  }
  let hours = Number(match[1]);
  const minutes = match[2];
  const meridiem = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  if (hours === 0) {
    hours = 12;
  }
  return `${hours}:${minutes} ${meridiem}`;
}

// Sorts the times and joins them as a compact summary, e.g. '08:00, 20:00'.
export function formatReminderTimes(times: string[]): string {
  return [...times].sort().join(', ');
}

// Describes the daily frequency, e.g. '3 doses daily'.
export function formatDailyFrequency(times: string[]): string {
  const count = times.length;
  return `${count} ${count === 1 ? 'dose' : 'doses'} daily`;
}

// '2026-08-15' -> 'Sat, Aug 15, 2026'
export function formatScheduleDate(date: string): string {
  const parsed = new Date(`${date}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime())) {
    return date;
  }
  return parsed.toLocaleDateString([], {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

// Returns a 'YYYY-MM-DD' string offset by a number of days from the input.
export function shiftDate(date: string, days: number): string {
  const parsed = new Date(`${date}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime())) {
    return date;
  }
  parsed.setUTCDate(parsed.getUTCDate() + days);
  return parsed.toISOString().slice(0, 10);
}

export function todayDateString(): string {
  return new Date().toISOString().slice(0, 10);
}
