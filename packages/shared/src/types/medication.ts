export const MedicationForm = {
  PILL: 'PILL',
  CAPSULE: 'CAPSULE',
  LIQUID: 'LIQUID',
  INHALER: 'INHALER',
  INJECTION: 'INJECTION',
  CREAM: 'CREAM',
  OINTMENT: 'OINTMENT',
  DROPS: 'DROPS',
  OTHER: 'OTHER',
} as const;
export type MedicationForm = (typeof MedicationForm)[keyof typeof MedicationForm];
export const MEDICATION_FORM_VALUES = Object.values(MedicationForm) as [
  MedicationForm,
  ...MedicationForm[],
];

export const MEDICATION_FORM_LABELS: Record<MedicationForm, string> = {
  PILL: 'Pill',
  CAPSULE: 'Capsule',
  LIQUID: 'Liquid',
  INHALER: 'Inhaler',
  INJECTION: 'Injection',
  CREAM: 'Cream',
  OINTMENT: 'Ointment',
  DROPS: 'Drops',
  OTHER: 'Other',
};

export const MedicationAdherenceStatus = {
  PENDING: 'PENDING',
  TAKEN: 'TAKEN',
  SKIPPED: 'SKIPPED',
} as const;
export type MedicationAdherenceStatus =
  (typeof MedicationAdherenceStatus)[keyof typeof MedicationAdherenceStatus];
export const MEDICATION_ADHERENCE_STATUS_VALUES = Object.values(MedicationAdherenceStatus) as [
  MedicationAdherenceStatus,
  ...MedicationAdherenceStatus[],
];

export const MEDICATION_ADHERENCE_STATUS_LABELS: Record<MedicationAdherenceStatus, string> = {
  PENDING: 'Pending',
  TAKEN: 'Taken',
  SKIPPED: 'Skipped',
};

export interface Medication {
  id: string;
  name: string;
  dosage: string;
  form: MedicationForm;
  reminderTimes: string[];
  instructions: string | null;
  notes: string | null;
  startDate: string;
  endDate: string | null;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface MedicationListItem extends Medication {
  doseCount: number;
}

export interface MedicationScheduleDose {
  medicationId: string;
  medicationName: string;
  dosage: string;
  form: MedicationForm;
  time: string;
  status: MedicationAdherenceStatus;
  takenAt: string | null;
  adherenceId: string | null;
}

export interface MedicationSchedule {
  date: string;
  doses: MedicationScheduleDose[];
}

export interface MedicationListResult {
  items: MedicationListItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}
