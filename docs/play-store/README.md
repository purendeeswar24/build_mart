# Play Store assets & release checklist

## Branding (ship with app)
Already in `frontend/assets/images/branding/`:
- `app-icon.png` — 1024×1024 preferred
- `splash.png` — navy `#181A22` + amber logo

## Store listing assets (create before production submit)
| Asset | Spec |
|-------|------|
| Feature graphic | 1024 × 500 |
| Phone screenshots | ≥ 2, 16:9 or 9:16 |
| Short description | ≤ 80 chars |
| Full description | materials + 30-min delivery pitch |
| Privacy policy URL | Required |

Suggested short description:  
`Cement, tanks, wires & more — delivered to your site in minutes.`

## Internal testing track
1. `eas build --platform android --profile production` → AAB  
2. Play Console → Testing → Internal testing → upload AAB  
3. Smoke: Register → Browse → Search → Filter → PDP → Cart → Checkout → Track  

## Permissions rationale (Play form)
- **Location** — delivery ETA / serviceable pincode (when Maps wired)  
- **Internet** — catalog, auth, payments  

## Secrets
Never commit Razorpay secret / Supabase service role.  
Frontend only: `EXPO_PUBLIC_*` (see `frontend/.env.example`).
