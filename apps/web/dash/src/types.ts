export const PROGRAMMES = ['Kids', 'Teens', 'Adults', 'More than one / not sure yet'] as const;
export const INTEREST_STATUSES = ['new', 'contacted', 'follow_up', 'closed'] as const;

export type Programme = (typeof PROGRAMMES)[number];
export type InterestStatus = (typeof INTEREST_STATUSES)[number];
export type StaffRole = 'admin' | 'staff';

export type SessionUser = {
  id: string;
  name: string;
  email: string;
  role: StaffRole;
  active: boolean;
};

export type Interest = {
  id: string;
  name: string;
  email: string;
  phone: string;
  programme: Programme;
  programmes: Programme[];
  comment: string;
  createdAt: string;
  updatedAt: string;
  emailStatus: string | null;
  status: InterestStatus;
  staffNote: string;
};

export type StaffUser = SessionUser & {
  createdAt: string;
  updatedAt: string;
};

export type InterestDraft = Pick<Interest, 'name' | 'email' | 'phone' | 'programmes' | 'status' | 'staffNote'>;
