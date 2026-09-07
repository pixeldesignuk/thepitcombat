import { z } from 'zod';
import { contactEmailSchema, contactNameSchema, contactPhoneSchema, legacyProgramme, programmeSchema, programmeSelectionSchema, visitorCommentSchema, type InterestStore } from './interest.js';

export const registrationSchema = z.object({
  submissionId: z.string().uuid(),
  name: contactNameSchema,
  email: contactEmailSchema,
  phone: contactPhoneSchema,
  programme: programmeSchema.optional(),
  programmes: programmeSelectionSchema.optional(),
  comment: visitorCommentSchema.optional().default(''),
  consent: z.literal('opening-updates-email-phone'),
  website: z.string().max(200).optional().default(''),
}).refine(value => value.programmes !== undefined || value.programme !== undefined, {
  message: 'Choose at least one training group', path: ['programmes'],
}).transform(value => {
  const selected = value.programmes ?? [value.programme!];
  return { ...value, programmes: selected, programme: legacyProgramme(selected) };
});
export type Registration = z.infer<typeof registrationSchema>;
export interface RegistrationStore extends InterestStore {
  save(input: Registration): Promise<'created' | 'existing' | 'conflict'>;
  healthy(): Promise<void>;
}
