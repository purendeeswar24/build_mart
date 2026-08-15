# Phase 3 — Catalog & Home feed

## Local demo (default)
The app loads taxonomy + 20 products from `frontend/src/data/seedCatalog.ts` via `products.service.ts`. No Supabase keys required.

## Live Supabase
1. Run `docs/supabase/phase3_schema.sql` in the Supabase SQL editor.
2. Insert categories/products/variants (or adapt the seed into SQL inserts).
3. Set real values in `frontend/.env`:
   - `EXPO_PUBLIC_SUPABASE_URL`
   - `EXPO_PUBLIC_SUPABASE_ANON_KEY`
4. Restart Expo. Top-level categories will prefer Supabase when configured; product rows still use the local seed until you add a full remote fetch in `products.service.ts`.
