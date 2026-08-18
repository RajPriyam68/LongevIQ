import { z } from 'zod';
import { CARE_CODE_REGEX } from '../constants/care.js';

export const redeemCodeSchema = z
  .object({
    code: z
      .string()
      .trim()
      .regex(CARE_CODE_REGEX, 'Share code must be in the format LV-XXXX-XXXX-XXXX.'),
  })
  .strict();

export type RedeemConnectionInput = z.infer<typeof redeemCodeSchema>;
