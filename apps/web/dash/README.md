# The Pit registration inbox

Private React/TypeScript inbox, served by Vite on port 5173. This is the first admin surface, limited to viewing interest registrations.

Set `VITE_API_URL` before building to the public API origin. It defaults to `http://localhost:3001` for development. No access key belongs in the environment or build output: enter it in the password field when opening the inbox. The key and fetched registrations stay in page memory and are cleared on lock or reload; no local/session storage is used.

The inbox reads `GET /v1/admin/registrations` using `Authorization: Bearer <access key>` and expects `{ registrations: [{ id, name, email, phone, programme, createdAt, emailStatus }] }`. The API supplies the latest 200 records, newest first. The filter searches only these loaded records. Received times are displayed in Europe/London time.

Copy this app's `.env.example` to `apps/web/dash/.env` and configure only `VITE_API_URL`. Vite reads that app-local file; it does not load root or backend environment files. Injected Railway build variables take precedence. Run through the root pnpm/Turborepo workspace scripts: `pnpm --filter @pit/dash dev`, `pnpm --filter @pit/dash check` and `pnpm --filter @pit/dash build` target this app. `dist/` is the static production output; the included Node static server serves it for Railway. The real-stack browser suite lives in `apps/web/site/tests/browser` and covers protected access, filtering, refresh, mobile overflow and clearing the inbox.

Fonts and logo are copied from the existing approved academy website assets; no new logo or font artwork is introduced.
