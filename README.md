# BuildMart

Construction materials marketplace plus a private work-bidding desk. Shoppers buy pipes, cement, wires, paints and fittings with a Zepto-style flow. Builders open site work. Service companies bid privately. After the builder accepts, both sides talk only inside BuildMart so the platform stays the middle contact and holds commission.

Support: **+91 63002 63868** · **purendeeswar444@gmail.com** (8am–8pm IST).

## What you can do

**Shop (Expo web / phone)** — `http://localhost:8081`
- Browse categories, search, cart, checkout, saved addresses, wishlist
- Pin an exact delivery location on a map
- **Work** tab: open a vacancy, bid privately, accept a company, talk in the BuildMart bridge
- Owner estimate is hidden from everyone except the builder and admin

**API** — `http://localhost:4000`
- Catalog, auth, orders, payments, geo, hire/bids, admin

**Admin** — `http://localhost:5173`
- Dashboard, live orders, catalog (add / hide / delete / **edit selling price & MRP**)
- Work & bids: owner + bidder details, estimate, award, delete, bridge thread

Price edits in admin write to Postgres. The shop reads `/api/v1/catalog/products` on each home/category load, so the new selling price appears after you refresh or reopen the page.

## Repo layout

| Package | Path | Role |
|---|---|---|
| Shop | `frontend/` | Expo 57 + React Native + TypeScript |
| API | `backend/` | Express + TypeScript |
| Admin | `admin-web/` | Vite + React |
| Shared | `shared/` | Types / constants |

Database is **Neon PostgreSQL**. Local secrets live in gitignored `.env` files. See `docs/CREDENTIALS.md` for test logins and `docs/TECH_STACK.md` for services and free-tier limits.

## Prerequisites

- Node.js 20+
- npm 10+
- Neon project (or Docker Postgres from `docker-compose.yml`)
- Optional: Expo Go for a physical phone

## Setup

```bash
npm install
cp .env.example .env
# also copy public keys into frontend/.env as EXPO_PUBLIC_*
```

Fill `DATABASE_URL` (pooled) and `DATABASE_URL_UNPOOLED` (direct) from Neon. Other keys are optional until you need that feature.

Windows PowerShell:

```powershell
.\make.ps1 install
.\make.ps1 up
```

Git Bash / Make:

```bash
make install
make up
```

| Command | What it does |
|---|---|
| `make install` / `.\make.ps1 install` | `npm install` (this is a Node app, not pip) |
| `make up` | Start API `:4000`, shop `:8081`, admin `:5173` |
| `make down` | Stop them |
| `make test` | Hire unit tests (no server) |
| `make test-dry` | Live hire/bid/bridge dry-run (API must be up) |
| `make migrate` | Apply schema to Postgres |

Or start pieces yourself:

```bash
npm run dev:backend
npm run dev:frontend
npm run dev:admin
```

## Auth roles

| Role | Typical use |
|---|---|
| `homeowner` | Shop, open work, bid |
| `contractor` / `civil_engineer` / `vendor` | Same shop + work desk |
| `admin` | Admin portal only (full catalog, jobs, phones) |

Public signup cannot create `admin`. Local development seeds four test users — see `docs/CREDENTIALS.md`. Those accounts are **off in production**.

## Work / bidding rules

1. A builder opens work (trade, requirements, bid window, optional private estimate).
2. Companies bid amounts. One bidder cannot see another’s price.
3. The builder sees every bid on **their** job. Estimate stays hidden from bidders.
4. After accept, BuildMart opens an in-app thread. Phone / WhatsApp / email are not shared and are blocked in chat.
5. Admin sees owner + bidder contacts, estimate, bids, and the thread. Commission is stored at **8%** of the winning bid.

## Tests

```bash
npm run test:unit          # 18 hire rule cases
npm run test:dry           # 25 live API cases (creates then deletes a job)
npm run smoke --workspace=@buildmart/backend
```

## Notes

- Shop web is a centered phone/desktop canvas (`frontend/src/theme/layout.ts`, max 1180px). Admin tables scroll sideways on small screens.
- Product photos: upload in admin (stored under `backend/uploads/`) or paste a URL. Do not scrape brand catalogs.
- Do not commit `.env`, tokens, or live payment keys.
