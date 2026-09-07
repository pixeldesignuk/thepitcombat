import { z } from 'zod';
import { contactEmailSchema, contactNameSchema, contactPhoneSchema, programmeSchema, type InterestStore } from './interest.js';

export const registrationSchema = z.object({
  submissionId: z.string().uuid(),
  name: contactNameSchema,
  email: contactEmailSchema,
  phone: contactPhoneSchema,
  programme: programmeSchema,
  consent: z.literal('opening-updates-email-phone'),
  website: z.string().max(200).optional().default(''),
});
export type Registration = z.infer<typeof registrationSchema>;
export interface RegistrationStore extends InterestStore {
  save(input: Registration): Promise<'created' | 'existing' | 'conflict'>;
  healthy(): Promise<void>;
}
