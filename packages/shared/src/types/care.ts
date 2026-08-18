// Sprint 12: doctor portal connection contract. Inputs (RedeemConnectionInput)
// live in validators/care.ts; this file holds the API result shapes.

export interface CareConnectionDoctor {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
}

export interface CareConnection {
  id: string;
  doctor: CareConnectionDoctor;
  connectedAt: string;
}

export interface DoctorConnectionPatient {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
}

export interface DoctorConnection {
  id: string;
  patient: DoctorConnectionPatient;
  connectedAt: string;
}

export interface CareGrantCreated {
  id: string;
  code: string;
  expiresAt: string;
}
