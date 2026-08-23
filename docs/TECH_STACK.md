# Tech stack, logic, and service limits

What BuildMart runs on, why each piece is there, and what is free vs paid.

## Stack

| Layer | Choice | Why |
|---|---|---|
| Shop | Expo 57, React Native, TypeScript | One app for Android, iOS, and web |
| Admin | Vite 6 + React 19 | Fast ops UI, proxies `/api` to the Express server |
| API | Node 20, Express, TypeScript | REST under `/api/v1` |
| DB | Neon (Lakebase) Postgres | Serverless Postgres, pooled + direct URLs |
| Auth | HMAC-signed session tokens + `user_credentials` | Password login; email OTP via Resend |
| Maps (shop pin) | Leaflet + Esri satellite / OSM streets | No Google key required for drag-pin |
| Reverse geocode | Google (if key) → Overpass → Nominatim → Photon → BigDataCloud | Best available, then free fallbacks |
| Drive distance (admin orders) | OSRM public demo + straight-line fallback | Routing without a billed Maps key |
| Payments | Razorpay test/live | Checkout; totals recomputed from catalog `selling_price` |
| Email | Resend | Register / email OTP |
| Images | Local `backend/uploads` or image URL | Admin upload, 5 MB cap |
| Tests | `node:assert` unit file + live dry-run script | No extra test runner |

## Core product logic

**Catalog**
- Products and variants live in Postgres (`selling_price`, `mrp`, stock, `listing_status`).
- Shop `products.service` prefers `/api/v1/catalog/products`. If the API is down it falls back to the local seed catalog.
- Admin PATCH of `mrp` / `sellingPrice` updates `product_variants`. Orders use the **current catalog selling price**, not whatever the client sends.
- Hidden listings (`listing_status=hidden` or `is_active=false`) stay out of the shop.

**Work / bids**
- Tables: `hire_jobs`, `hire_bids`, `hire_messages`.
- Rules in `backend/src/services/hire.rules.ts`: bid window, completing-soon (36h), 8% commission, who can see estimate/bids, contact scrubbing.
- Bidders never receive `ownerEstimate` or other bids. Admin and the job owner do.
- After award, chat is the only bridge. Phone / WhatsApp / email in messages are rejected.

**Auth**
- `POST /api/v1/auth/login` with userId + password.
- Tokens are HMAC-signed. Unsigned admin tokens are rejected.
- Public roles: homeowner, contractor, civil_engineer, vendor. Not admin.

## Services: free, trial, limits

### Neon Postgres — used (free tier available)

- **What:** Hosted Postgres. API uses the **pooled** URL. `make migrate` uses the **unpooled** URL.
- **Cost:** Neon has a free plan (one project, compute hours, storage cap). Scale-to-zero can add a cold-start delay after idle.
- **Limit:** Free compute/storage quotas change; check [neon.tech/pricing](https://neon.tech/pricing). Exceeding them pauses the project until you upgrade.
- **Logic:** All catalog, users, orders, hire jobs.

### Resend — email OTP (free tier)

- **What:** Transactional email for register / email OTP.
- **Cost:** Free ~**100 emails/day** on the hobby plan (confirm current quota on [resend.com](https://resend.com)).
- **Limit:** Without a verified domain, mail usually only delivers to the Resend account inbox. Production needs a verified domain.
- **Logic:** `backend/src/config/mailer.ts`, `otp.service.ts`. Phone OTP does **not** send SMS yet (`SMS_UNAVAILABLE`).

### Razorpay — payments (test is free)

- **What:** Create order + signature verify.
- **Cost:** **Test keys are free** forever. Live keys take a % + GST per settlement (see Razorpay pricing).
- **Limit:** Test cards do not move real money. Native Razorpay SDK is not wired; web checkout uses the key id in Expo public env.
- **Logic:** Order totals are server-side from catalog prices.

### OpenStreetMap / Nominatim — free, rate-limited

- **What:** Reverse geocode fallback when Google is missing.
- **Cost:** Free for light use if you send a valid User-Agent and cache.
- **Limit:** Nominatim usage policy is roughly **1 request/second** for the public instance. Heavy traffic needs your own instance or a paid geocoder.
- **Logic:** `backend/src/services/geo.service.ts`.

### Overpass API — free, rate-limited

- **What:** Nearby buildings for a tighter address than zone-level Nominatim.
- **Cost:** Free public instances.
- **Limit:** Can throttle or time out. We fail over to the next provider.

### Photon / BigDataCloud — free fallbacks

- **Photon:** Komoot’s Nominatim-based geocoder, free public endpoint, courtesy use only.
- **BigDataCloud:** Free client-side / low-volume reverse geocode; coarse compared with Google rooftop.

### OSRM public demo — free, no SLA

- **What:** Drive km / minutes from the Hyderabad hub to the order pin (admin Orders).
- **Cost:** Free demo server.
- **Limit:** Not for production load. If it fails, admin still shows straight-line km.
- **Logic:** `backend/src/services/routing.service.ts`.

### Esri World Imagery + OSM tiles (Leaflet)

- **What:** Satellite default + street toggle on the address pin picker.
- **Cost:** Tile use is free for typical demo traffic; Esri/OSM have attribution and fair-use rules.
- **Limit:** Not a licensed enterprise imagery contract. For a public launch, confirm tile ToS or switch to a billed map.

### Google Maps / Geocoding / Places — optional, billed

- **What:** Rooftop reverse-geocode if `GOOGLE_MAPS_API_KEY` is a real key.
- **Cost:** Google Cloud **$200/month free credit** is common for new accounts; after that, Geocoding/Places are pay-as-you-go.
- **Limit:** Placeholder keys are ignored. Without a live key we stay on the free geo stack (street + landmark, not guaranteed rooftop).

### Expo / Metro

- **What:** Shop bundler and web/native runtime.
- **Cost:** Expo is free. EAS Build / Submit is paid if you use their cloud builds.
- **Limit:** Cursor’s simple browser cannot show the geolocation **Allow** prompt. Use Chrome at `http://localhost:8081`.

### Supabase (legacy / optional)

- Env still accepts `SUPABASE_*`. Catalog and auth now run on Neon + local credentials. You can leave these unset.

### Unsplash / Pexels

- Only for optional **seed image scripts**, not the live shop path. Free API keys have monthly request caps.

## What is not wired yet

- Real SMS (MSG91 or similar) — phone login returns unavailable
- Live Razorpay money movement until live keys + KYC
- Commission **collection** after a hire award (amount is stored, not charged)
- Native Razorpay SDK on Android/iOS

## Suggested production upgrades (when you outgrow free)

1. Neon paid compute if the project sleeps too often.
2. Resend domain + higher tier for OTP volume.
3. Self-hosted Nominatim/OSRM or Google/Mapbox if geo traffic grows.
4. Object storage (S3 / Neon object storage) instead of disk `uploads/`.
5. Razorpay live + webhook secret.
