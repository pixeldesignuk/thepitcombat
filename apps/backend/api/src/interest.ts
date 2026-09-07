import { z } from 'zod';

export const programmes = ['Kids', 'Teens', 'Adults', 'More than one / not sure yet'] as const;
export const interestStatuses = ['new', 'contacted', 'follow_up', 'closed'] as const;

export const programmeSchema = z.enum(programmes);
export const interestStatusSchema = z.enum(interestStatuses);

export const contactNameSchema = z.string().trim().min(2).max(120);
export const contactEmailSchema = z.string().trim().toLowerCase().email().max(254);
export const contactPhoneSchema = z.string().trim().max(40)
  .transform(value => value.replace(/[\s().-]/g, ''))
  .refine(value => /^\+?[0-9]{8,15}$/.test(value), 'Enter a valid phone number');

export const interestListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).max(100000).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
  q: z.string().trim().max(120).default(''),
  programme: programmeSchema.optional(),
  status: interestStatusSchema.optional(),
});

export const interestUpdateSchema = z.object({
  name: contactNameSchema.optional(),
  email: contactEmailSchema.optional(),
  phone: contactPhoneSchema.optional(),
  programme: programmeSchema.optional(),
  status: interestStatusSchema.optional(),
  staffNote: z.string().trim().max(5000).optional(),
}).strict().refine(value => Object.keys(value).length > 0, 'Include at least one change');

export type InterestListQuery = z.infer<typeof interestListQuerySchema>;
export type InterestUpdate = z.infer<typeof interestUpdateSchema>;
export type InterestRecord = {
  id: string;
  name: string;
  email: string;
  phone: string;
  programme: typeof programmes[number];
  createdAt: string;
  updatedAt: string;
  emailStatus: string | null;
  status: typeof interestStatuses[number];
  staffNote: string;
};

export interface InterestStore {
  listInterest(query: InterestListQuery): Promise<{ items: InterestRecord[]; total: number }>;
  getInterest(id: string): Promise<InterestRecord | undefined>;
  updateInterest(id: string, update: InterestUpdate, updatedBy: string): Promise<InterestRecord | undefined>;
}
