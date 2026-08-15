# BuildMart App

Construction materials marketplace — Zepto/Amazon-style UX for pipes, cement, wires, paints, tiles, sanitary, and skilled-worker services.

## Monorepo layout

| Package | Path | Stack |
|---|---|---|
| Mobile app | `frontend/` | React Native (Expo) + TypeScript |
| API | `backend/` | Node.js + Express + TypeScript |
| Shared types | `shared/` | TypeScript types & constants |

## Prerequisites

- Node.js 20+
- npm 10+
- Expo Go (for device testing) or an Android/iOS simulator

## Quick start

```bash
# Install all workspaces
npm install

# Copy env templates
cp .env.example .env
cp .env.example frontend/.env
# Prefix public Expo vars as EXPO_PUBLIC_* in frontend/.env (see docs)

# Run the mobile app
npm run dev:frontend

# Run the API (Phase 3+)
npm run dev:backend
```

## Scripts

| Script | Description |
|---|---|
| `npm run dev:frontend` | Start Expo |
| `npm run dev:backend` | Start Express API with watch mode |
| `npm run lint` | ESLint across workspaces |
| `npm run typecheck` | `tsc --noEmit` across workspaces |

## Phases

See `docs/` for the phased build plan and folder/asset conventions.

**Current:** Phase 1 — navigation shell & design system (no backend wired yet).

## Asset / image policy

Product photos belong in Supabase Storage, not the app bundle. Local seed scripts under `scripts/` are for **test data only** — production listings must use vendor-uploaded or manufacturer-licensed images. Do not scrape competitor or brand catalog photos.
