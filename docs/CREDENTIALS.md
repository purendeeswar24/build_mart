# Credentials and who uses what

Local-only accounts and which env keys each flow needs. **Do not put live production secrets in this file.** Real keys stay in gitignored `.env` / `backend/.env` / `frontend/.env`.

These test users exist only when `NODE_ENV=development` and `ALLOW_TEST_ACCOUNTS` is not set to `false`. Production always locks them.

## Shop and Work desk (`http://localhost:8081`)

Sign in with **User ID + password**. Sign out before switching people.

| Use case | User ID | Password | What you should see |
|---|---|---|---|
| Everyday shopper / second bidder | `test` | `test` | Buy materials. Bid on others’ work. **No owner estimate.** |
| Builder who opens work | `builder` | `builder` | Own vacancies, all bids on them, **private estimate**, accept + bridge chat. |
| Service company | `bidder` | `bidder` | Place/update a private bid. **No other bids, no estimate.** After accept, bridge chat only. |
| Admin using the shop | `admin` | `admin` | Can open a job and see the estimate (admin), but is not the owner. Prefer the admin portal. |

You cannot register as `admin` from the public signup form.

## Admin portal (`http://localhost:5173`)

| Use case | User ID | Password |
|---|---|---|
| Full ops access | `admin` | `admin` |

Non-admin accounts are rejected at the admin login page even if the password is correct.

Admin can: change **MRP and selling price** (shop updates on next catalog load), hide/delete products, list orders, see every hire job (owner phone/email, bidder phone/email, estimate), award, delete, and reply in the bridge thread.

## Support (shown in the app)

| Field | Value |
|---|---|
| Mobile | +91 63002 63868 (`6300263868`) |
| Email | purendeeswar444@gmail.com |

## Environment keys (names only)

Copy from `.env.example`. Never commit filled values.

| Variable | Who needs it | Used for |
|---|---|---|
| `DATABASE_URL` | API | Neon pooled Postgres |
| `DATABASE_URL_UNPOOLED` | migrate / seed | Neon direct connection |
| `AUTH_SECRET` | API | Signed session tokens (required in production) |
| `RESEND_API_KEY` / `RESEND_FROM_EMAIL` | API | Email OTP / register |
| `RAZORPAY_KEY_ID` / `RAZORPAY_KEY_SECRET` | API | Payments (test keys are fine locally) |
| `EXPO_PUBLIC_RAZORPAY_KEY_ID` | Shop | Checkout on web |
| `EXPO_PUBLIC_API_BASE_URL` | Shop | Defaults to `http://localhost:4000` |
| `GOOGLE_MAPS_API_KEY` | API geo (optional) | Rooftop reverse-geocode |
| `EXPO_PUBLIC_GOOGLE_MAPS_API_KEY` | Shop (optional) | Not required for the Leaflet pin picker |
| `CORS_ORIGINS` | API production | Allowed web origins |
| `ALLOW_TEST_ACCOUNTS` | API | Set `false` to disable the four users above even in dev |

## How to verify estimate privacy

1. Sign in as `builder`, open a work, set an estimate.
2. Sign out. Sign in as `test` or `bidder` — same job has **no** rupee estimate.
3. Open admin → Work & bids — estimate is in the table.

## Production

- Turn off test accounts (`NODE_ENV=production` or `ALLOW_TEST_ACCOUNTS=false`).
- Set a long random `AUTH_SECRET`.
- Use Razorpay live keys only when you are ready to take real money.
- Do not reuse these local passwords on a public host.
