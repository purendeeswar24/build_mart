# BuildMart — Production readiness

This app runs in **demo mode** until secrets are configured. With secrets set, it switches to **live** auth, catalog, orders, and Razorpay verification.

## 1. Configure environment

**Root / backend** (`.env`):

```env
NODE_ENV=production
PORT=4000
SUPABASE_URL=https://YOUR_PROJECT.supabase.co
SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
RAZORPAY_KEY_ID=rzp_live_...   # or rzp_test_ for staging
RAZORPAY_KEY_SECRET=...
RAZORPAY_WEBHOOK_SECRET=...
```

**Frontend** (`frontend/.env`):

```env
EXPO_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=...
EXPO_PUBLIC_API_BASE_URL=https://api.yourdomain.com
EXPO_PUBLIC_RAZORPAY_KEY_ID=rzp_live_...
```

Never put the Razorpay **secret** or Supabase **service role** in the frontend.

## 2. Apply database schema

In the Supabase SQL editor, run:

`docs/supabase/production_schema.sql`

Then seed `categories`, `products`, and `product_variants` (or keep local seed until you import).

Enable **Phone** auth (SMS provider) in Supabase Auth settings for OTP.

## 3. What goes live automatically

| Area | Demo (no secrets) | Production (secrets set) |
|------|-------------------|---------------------------|
| Auth | OTP `123456` | Supabase phone OTP / email |
| API auth | Demo bearer token | Supabase JWT verified on backend |
| Catalog | Local `seedCatalog` | Supabase `categories` + `products` when seeded |
| Orders | AsyncStorage | Persisted in Supabase via API |
| Stock | Local seed | `decrement_stock` RPC |
| Payments | Demo Alert + soft verify | Razorpay Orders API + HMAC verify |
| Security | Headers + rate limit | Same + HSTS + strict CORS |

## 4. Deploy checklist

- [ ] Run `production_schema.sql`
- [ ] Seed catalog rows (or accept seed fallback)
- [ ] Supabase Phone OTP provider configured
- [ ] Backend deployed with service role + Razorpay secret
- [ ] Frontend `EXPO_PUBLIC_API_BASE_URL` points at HTTPS API
- [ ] `GET /health` shows `ready.supabase: true`, `ready.razorpay: true`
- [ ] Place a test COD order + a test UPI/card order in Razorpay test mode
- [ ] EAS production build (`frontend/eas.json`) with real `projectId`
- [ ] Native Razorpay SDK (optional): add `react-native-razorpay` in a custom Expo Dev Client for in-app sheet

## 5. Local demo (no cloud)

```bash
npm run dev:backend
npm run dev:frontend
```

OTP: `123456`. Serviceable pincodes: `500032`, `122001`, etc.

## 7. Automated tests

```bash
# From repo root
npm run typecheck
npm run smoke          # API smoke (backend must be running on :4000)
npm run test --workspace=frontend   # catalog integrity
npm run build:backend
```

Expected: **10/10 API smoke PASS**, typecheck clean, backend build OK.
