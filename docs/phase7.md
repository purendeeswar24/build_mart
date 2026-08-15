# Phase 7 — Orders, tracking & account

## Orders
- List from AsyncStorage (newest first) with status badge + thumbs
- Detail: address, payment, status tracker, **map stub** when `out_for_delivery`
- **Reorder** — adds in-stock lines; warns on skipped OOS items
- **Cancel** — only `confirmed` / `packed`; reason picker; restores stock
- **Simulate next status (demo)** — advance tracker without Supabase

## Account
- Edit profile (name, phone, email, role, GSTIN for pros)
- Addresses (Phase 5), order history shortcut → Orders tab
- **Wishlist** — heart on ProductCard / PDP; persists `@buildmart/wishlist`
- Settings (clear demo data), Help & support (phone / email / address)
- Pros: **Request bulk quote** form + GSTIN capture

## Admin (scaffold)
- `admin-web/` Vite + React — Dashboard / Orders / Products
- Run: `npm run dev:admin` → http://localhost:5173

## Supabase
- `docs/supabase/phase7_schema.sql` — `wishlist_items`, `cancel_reason`
