export const NotificationType = {
  MEDICATION_DUE: 'MEDICATION_DUE',
  REPORT_PROCESSED: 'REPORT_PROCESSED',
  REPORT_FAILED: 'REPORT_FAILED',
  METRIC_ALERT: 'METRIC_ALERT',
  CARE_CONNECTION: 'CARE_CONNECTION',
} as const;
export type NotificationType = (typeof NotificationType)[keyof typeof NotificationType];
export const NOTIFICATION_TYPE_VALUES = Object.values(NotificationType) as [
  NotificationType,
  ...NotificationType[],
];

export const NotificationSeverity = {
  INFO: 'INFO',
  WARNING: 'WARNING',
  SUCCESS: 'SUCCESS',
  CRITICAL: 'CRITICAL',
} as const;
export type NotificationSeverity = (typeof NotificationSeverity)[keyof typeof NotificationSeverity];
export const NOTIFICATION_SEVERITY_VALUES = Object.values(NotificationSeverity) as [
  NotificationSeverity,
  ...NotificationSeverity[],
];

export const NOTIFICATION_TYPE_LABELS: Record<NotificationType, string> = {
  MEDICATION_DUE: 'Medication due',
  REPORT_PROCESSED: 'Report processed',
  REPORT_FAILED: 'Report processing failed',
  METRIC_ALERT: 'Health alert',
  CARE_CONNECTION: 'Care connection',
};

export const NOTIFICATION_SEVERITY_LABELS: Record<NotificationSeverity, string> = {
  INFO: 'Info',
  WARNING: 'Warning',
  SUCCESS: 'Success',
  CRITICAL: 'Critical',
};

export interface AppNotification {
  id: string;
  type: NotificationType;
  severity: NotificationSeverity;
  title: string;
  body: string;
  metadata: unknown | null;
  readAt: string | null;
  createdAt: string;
}

export interface NotificationListResult {
  items: AppNotification[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface NotificationUnreadCount {
  unread: number;
}
