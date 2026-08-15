# Phase 5 — Cart, addresses & tools

## Cart
- AsyncStorage persistence (`@buildmart/cart`)
- Line items with variant + unit price; `addMany` for Bundle Builder
- Delivery fee: free at ₹999+ (`deliveryFeeFor`)

## Addresses
- Seed addresses + serviceable pincode check (`address.service`)
- Account → Saved addresses; Cart/Checkout address picker
- Non-serviceable pincode blocks checkout (e.g. try `500034`)
- Demo serviceable: `500032`, `500001`, `122001`, …

## Capacity calculator
- People × buffer days → recommended water tanks
- Entry: Home “Tank size” tile / banner; Categories header CTA

## Bundle Builder (PDP)
- Checkbox accessories under “Complete your setup”
- **Add all to cart** uses `addMany`

## Wiring
- `AddressProvider` wraps cart in `App.tsx`
- Header city/ETA from selected address
- Stacks: `CartStack`, `AccountStack`, calculator on Home + Categories
