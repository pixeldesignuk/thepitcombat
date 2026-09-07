import type { InterestStatus } from './types';

const dateTimeFormat = new Intl.DateTimeFormat('en-GB', {
  dateStyle: 'medium',
  timeStyle: 'short',
  timeZone: 'Europe/London',
});

const dateFormat = new Intl.DateTimeFormat('en-GB', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
  timeZone: 'Europe/London',
});

export const statusLabels: Record<InterestStatus, string> = {
  new: 'New',
  contacted: 'Contacted',
  follow_up: 'Follow up',
  closed: 'Closed',
};

export function formatDate(value: string, compact = false) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return 'Date unavailable';
  return (compact ? dateFormat : dateTimeFormat).format(parsed);
}

export function humanise(value: string | null) {
  if (!value) return 'Not recorded';
  return value.replaceAll('_', ' ').replace(/^./, character => character.toUpperCase());
}
