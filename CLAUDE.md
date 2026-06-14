# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**SimKarta** — SIM card distribution and sales management system. Three user roles:

- **Admin** — issues SIM cards from warehouse to employees, monitors everything
- **Agent** — opens sale points (shops) with 3 photos + GPS, draws from personal stock
- **Seller** — sells from a point or personal office stock

SIM card operators: `beeline | ucell | uzmobile | mobiuz | oq`

The full technical specification is in `REJA 1.md` (written in Uzbek). When starting a new development phase, read the relevant section there.

## Architecture

```
Mobile App (React Native + Expo)
    │ HTTPS/JSON
    ▼
Backend API (FastAPI on Railway)
    │
    ├─► PostgreSQL (Railway managed)
    └─► Cloudinary (photos)

APK built via EAS Build (no Android Studio needed)
```

## Planned Directory Structure

```
backend/
├── app/
│   ├── main.py          # FastAPI app entry point
│   ├── database.py      # PostgreSQL connection
│   ├── models.py        # SQLAlchemy models
│   ├── schemas.py       # Pydantic schemas
│   ├── auth.py          # JWT generation/validation
│   ├── deps.py          # get_current_user, role guards
│   └── routers/
│       ├── auth.py      # POST /auth/login, GET /auth/me
│       ├── users.py     # employee CRUD (admin only)
│       ├── stock.py     # inventory issue/query
│       ├── points.py    # sale point CRUD
│       └── sales.py     # sales transactions
├── requirements.txt
├── Procfile             # web: uvicorn app.main:app --host 0.0.0.0 --port $PORT
└── .env                 # DATABASE_URL, JWT_SECRET, CLOUDINARY_URL

simkarta-mobile/
├── app.json             # Expo config + Android permissions
├── eas.json             # EAS Build profiles (preview=apk, production=aab)
├── src/
│   ├── api.js           # axios instance with Railway base URL + JWT header
│   ├── auth.js          # SecureStore token read/write
│   ├── theme.js         # primary color #1b8a5a
│   ├── screens/         # one file per role screen
│   └── components/      # SimChip, Stepper, PhotoPicker
└── App.js
```

## Commands

### Backend

```bash
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload          # local dev
```

Environment variables required: `DATABASE_URL`, `JWT_SECRET`, `CLOUDINARY_URL`

### Mobile

```bash
# Install (once)
npm install -g eas-cli
cd simkarta-mobile
npm install

# Local dev (Expo Go, no APK)
npx expo start

# Build APK (cloud — no Android Studio needed)
eas login
eas build -p android --profile preview   # ~10-15 min, returns download link

# Production app-bundle
eas build -p android --profile production
```

### Railway deployment

1. Push `backend/` to GitHub → Railway "Deploy from GitHub"
2. Add PostgreSQL service → `DATABASE_URL` auto-injected
3. Add env vars: `JWT_SECRET`, `CLOUDINARY_URL`
4. `Procfile` handles the start command

## Critical Business Logic (server-side enforced — never trust the client)

**Opening a point (`POST /points`):**
- Check agent's `stock` has sufficient qty for each operator being placed → `400` if not
- Transaction: decrement `stock`, create `points` + `point_stock` rows, write activity log

**Updating a point (`PATCH /points/{id}`):**
- Request includes agent's current `lat/lng`
- Server computes Haversine distance against the point's stored coordinates
- If > 100 m → `403` ("too far away") — prevents GPS spoofing from mobile
- Decrement agent `stock`, increment `point_stock`

**Office sale (`POST /sales/office`):**
- Verify seller's `stock` has the requested operator qty → `400` if not
- Decrement `stock`, write `sales` row

## Database Key Points

- Primary keys: `UUID` (`gen_random_uuid()`)
- Timestamps: `TIMESTAMPTZ DEFAULT now()`
- `stock` table: composite PK `(user_id, operator)` — one row per user per operator
- `point_stock` table: composite PK `(point_id, operator)`
- Images stored as Cloudinary URLs (text columns), not in the database

## Mobile Permissions (app.json)

```json
"android": {
  "package": "uz.simkarta.app",
  "permissions": ["ACCESS_FINE_LOCATION", "CAMERA"]
}
```

Plugins: `expo-location` (foreground) and `expo-image-picker` (camera).

## Auth

- Phone number + password → JWT access token
- Token stored in `SecureStore` (encrypted on device)
- All protected endpoints: `Authorization: Bearer <token>`
- Role checks in `deps.py` via `get_current_user`
