# BuildMart — folder structure & asset pipeline

See the companion phase plan. This repo follows:

- `frontend/` — Expo React Native app
- `backend/` — Express API (custom endpoints beyond Supabase)
- `shared/` — types & constants
- `scripts/` — seed / import tooling
- Product images live in Supabase Storage, not the app bundle

## Image policy (short)

Use manufacturer media kits, vendor uploads, your own photos, or licensed stock (Unsplash/Pexels) for decorative assets. Do not scrape competitor catalogs.

## Workspaces

- `frontend/` — Expo React Native app (`npm run dev:frontend`)
- `backend/` — Express API (`npm run dev:backend`)
- `shared/` — types & constants
- `admin-web/` — Vite ops admin (`npm run dev:admin`)
