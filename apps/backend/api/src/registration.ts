import { z } from 'zod';

export const registrationSchema = z.object({
  submissionId: z.string().uuid(),
  name: z.string().trim().min(2).max(120),
  email: z.string().trim().toLowerCase().email().max(254),
  phone: z.string().trim().max(40).transform(value => value.replace(/[\s().-]/g, '')).refine(value => /^\+?[0-9]{8,15}$/.test(value), 'Enter a valid phone number'),
  programme: z.enum(['Kids', 'Teens', 'Adults', 'More than one / not sure yet']),
  consent: z.literal('opening-updates-email-phone'),
  website: z.string().max(200).optional().default(''),
});
export type Registration = z.infer<typeof registrationSchema>;
export interface RegistrationStore {
  save(input: Registration): Promise<'created' | 'existing' | 'conflict'>;
  list(): Promise<unknown[]>;
  healthy(): Promise<void>;
}
