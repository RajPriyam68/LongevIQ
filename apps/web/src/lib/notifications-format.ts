import type { NotificationSeverity, NotificationType } from '@longeviq/shared';
import { NOTIFICATION_SEVERITY_LABELS, NOTIFICATION_TYPE_LABELS } from '@longeviq/shared';

export function notificationTypeLabel(type: NotificationType): string {
  return NOTIFICATION_TYPE_LABELS[type];
}

export function notificationSeverityLabel(severity: NotificationSeverity): string {
  return NOTIFICATION_SEVERITY_LABELS[severity];
}

export function notificationSeverityBadgeClass(severity: NotificationSeverity): string {
  switch (severity) {
    case 'SUCCESS':
      return 'border-transparent bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-200';
    case 'CRITICAL':
      return 'border-transparent bg-destructive text-white';
    case 'WARNING':
      return 'border-transparent bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-200';
    default:
      return 'bg-secondary text-secondary-foreground';
  }
}

export function formatNotificationDateTime(iso: string | null): string {
  if (!iso) return '—';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(date);
}

export function formatNotificationRelativeTime(iso: string | null): string {
  if (!iso) return '—';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '—';
  const diffMs = Date.now() - date.getTime();
  const minutes = Math.floor(diffMs / 60_000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return formatNotificationDateTime(iso);
}

export function notificationBellCountClass(count: number): string {
  const base =
    'inline-flex h-4 items-center justify-center rounded-full px-1 text-[10px] font-semibold';
  return `${base} ${count > 9 ? 'min-w-5' : 'w-4'}`;
}
