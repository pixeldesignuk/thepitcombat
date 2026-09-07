import { getWaitlistConfig } from './waitlist.mjs';

// Server-only runtime configuration, injected by Railway or local .env.
export const waitlistConfig = getWaitlistConfig({
  OPERATOR_NAME: process.env.OPERATOR_NAME ?? import.meta.env.OPERATOR_NAME,
  PRIVACY_EMAIL: process.env.PRIVACY_EMAIL ?? import.meta.env.PRIVACY_EMAIL,
  CORRESPONDENCE_ADDRESS: process.env.CORRESPONDENCE_ADDRESS ?? import.meta.env.CORRESPONDENCE_ADDRESS,
});
