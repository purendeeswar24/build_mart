# Phase 6 — Checkout, payments & order placement

## Checkout
- Address (editable), collapsible item summary, payment methods
- **UPI / Card** → Razorpay demo sheet (Alert: Pay success / Fail / Cancel)
- **COD** only when `isCodEligible(pincode)` — e.g. `500032` yes, `122002` no

## Place order flow
1. Re-validate stock (`stock.service`)
2. Create local `orders` row (AsyncStorage)
3. COD → `confirmed` + decrement stock + clear cart → confirmation
4. Online → `pending_payment` → demo checkout → on success `confirmPaid` (decrement + paid) → confirmation; on fail stay pending with retry

## Confirmation
- `OrderConfirmation` screen: order id, ETA, Track / Continue shopping

## Backend (demo)
- `POST /api/v1/orders`
- `POST /api/v1/payments/create-order` / `verify`
- Without Razorpay secrets → demo payloads

## Supabase
- `docs/supabase/phase6_schema.sql` — `orders`, `order_items`, `decrement_stock` RPC

## Demo tips
- OTP `123456` → checkout
- Razorpay alert: **Pay success** / **Fail payment**
- Force OOS: `stockService.forceZero('v1a')` in a console/script, or lower qty in overrides
- COD-ineligible: address with pincode `122002`
