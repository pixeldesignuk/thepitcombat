# The Pit Console

The staff console uses the compact navigation and list/detail layout from AgentOS with The Pit’s black, bone and red identity. It currently manages interest submissions and staff accounts. Memberships, attendance, payments and automated enrolment are later work.

## Sign in

Use email and password. Better Auth runs in `apps/backend/auth`; the old admin access key is no longer accepted. Seeded administrator and staff credentials are in the ignored `apps/backend/auth/.env` file. Seeding creates missing accounts and does not reset existing passwords or re-enable accounts.

Administrators can create staff accounts, change roles, deactivate/reactivate users and reset passwords. Staff can manage interest records. Disabling an account, changing its role or resetting its password revokes its sessions. The last active administrator cannot be removed or demoted.

## Local development

From the workspace root:

```sh
pnpm install --frozen-lockfile
pnpm db:up
pnpm db:migrate
pnpm auth:migrate
pnpm auth:seed
pnpm dev
```

Migrations and seeding use each backend service’s configured `DATABASE_URL`. Check the target before running them. Automated integration tests use a separate `TEST_DATABASE_URL` and isolated schemas.

Open http://localhost:5173. The dashboard’s `.env` holds `CONSOLE_URL`, `API_INTERNAL_URL` and `AUTH_INTERNAL_URL`. Vite proxies `/api` to the API’s `/v1` routes and `/auth` to Better Auth. Browser code never receives upstream addresses or auth secrets.

## Production

The Node server provides the same origin proxy alongside the built Vite app. Set `CONSOLE_URL` to its exact public HTTPS origin, `API_INTERNAL_URL` to the private API address, and `AUTH_INTERNAL_URL` to the private auth address. These are runtime settings; no `VITE_API_URL` is needed. Session cookies are HttpOnly, with Secure enabled on HTTPS. API access is checked against the current auth session and role for every request.

The interest workspace supports search, programme/status filters, pagination, contact edits, follow-up state and staff notes. Closing an interest record does not create or cancel a membership. The public interest form remains an expression of interest, not a class booking.

See the root [Railway guide](../../../RAILWAY.md) for the shared infrastructure definition and deployment workflow.
