// Sprint 12: patient-initiated doctor access sharing. A patient generates a
// one-time share code; a doctor redeems it to form a persistent connection.
export const CARE_GRANT_TTL_DAYS = 7;

// Unambiguous alphabet (no 0/O/1/I) used for the random share code.
export const CARE_CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

// Share codes look like LV-ABCD-WXYZ-2345. The character class mirrors
// CARE_CODE_ALPHABET so only generator-produced codes validate.
export const CARE_CODE_REGEX =
  /^LV-[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{4}-[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{4}-[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{4}$/;
