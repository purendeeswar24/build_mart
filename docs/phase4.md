# Phase 4 — PDP, search & filters

## Filters
- Sticky chips: Brand + dynamic attribute keys from `product_variants.attributes`
- Bottom sheet: sort, brand multi-select, attribute multi-select, price min/max
- Selected filters show as removable chips; Clear all resets
- Query path: `productsService.queryProducts` / `getFilterFacets` (seed-backed; swap to Supabase later)

## PDP
- Image carousel, variant pills, stock gate on Add
- Expandable Description / Specs / Warranty / Delivery
- Compatible accessories + similar products carousels

## Search
- Debounced query + suggestions
- Same filter sheet as category results
- Recent searches in AsyncStorage
