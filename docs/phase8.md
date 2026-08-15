# Phase 8 — Polish, performance & Play Store prep

## UX hardening
- Skeletons: Home, category/search grids
- Empty + error states with retry / clear-filters CTAs
- Offline banner (web online/offline events)
- Error boundary around the app tree
- `SafeImage` fallback for broken assets
- Inline address / auth validation helpers (`utils/validation.ts`)
- Touch targets / a11y labels on key icon buttons (`theme/a11y.ts`)

## Performance
- `queryProductsPaged` + infinite scroll on category & search (`PAGE_SIZE = 8`)
- FlatList `initialNumToRender` / `windowSize` tuned
- Product images already via `expo-image`

## Analytics
- `analytics.service` buffers `screen_view`, `add_to_cart`, `purchase` (console in `__DEV__`)

## Release config
- `frontend/eas.json` — development / preview (APK) / production (AAB)
- `frontend/app.json` — package `com.buildmart.app`, versionCode, location permission copy
- Replace `extra.eas.projectId` after `eas init`

## Commands
```bash
cd frontend
npx eas-cli login
npx eas init          # paste real projectId into app.json
npx eas build --platform android --profile preview
npx eas build --platform android --profile production
```

## Play Console checklist
See `docs/play-store/README.md`
