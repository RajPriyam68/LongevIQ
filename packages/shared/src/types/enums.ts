export const UserRole = {
  USER: 'USER',
  DOCTOR: 'DOCTOR',
  ADMIN: 'ADMIN',
} as const;
export type UserRole = (typeof UserRole)[keyof typeof UserRole];

export const ReportStatus = {
  UPLOADED: 'UPLOADED',
  PROCESSING: 'PROCESSING',
  PARSED: 'PARSED',
  FAILED: 'FAILED',
} as const;
export type ReportStatus = (typeof ReportStatus)[keyof typeof ReportStatus];

export const HealthMetricType = {
  BLOOD_PRESSURE: 'BLOOD_PRESSURE',
  HEART_RATE: 'HEART_RATE',
  WEIGHT: 'WEIGHT',
  BLOOD_GLUCOSE: 'BLOOD_GLUCOSE',
  BMI: 'BMI',
  SLEEP_HOURS: 'SLEEP_HOURS',
  STEPS: 'STEPS',
  BODY_TEMPERATURE: 'BODY_TEMPERATURE',
} as const;
export type HealthMetricType = (typeof HealthMetricType)[keyof typeof HealthMetricType];
export const HEALTH_METRIC_TYPE_VALUES = Object.values(HealthMetricType) as [
  HealthMetricType,
  ...HealthMetricType[],
];
