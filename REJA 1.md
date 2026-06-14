# SimKarta — To’liq Loyiha Rejasi (APK uchun)

> Bu hujjatni Claude Code’da oching (VS Code) va qadama-qadam ishlang.
> Stack: **FastAPI + PostgreSQL** (backend, Railway) · **React Native + Expo** (mobil) · **EAS Build** (APK — Android Studio kerak emas).

-----

## 0. Loyiha haqida qisqacha

SimKarta — simkarta tarqatish va sotuvni boshqarish tizimi. 3 xil rol:

- **Admin** — ombordan hodimlarga simkarta beradi, hammasini kuzatadi
- **Agent** — tochka (do’kon) ochadi, 3 rasm + GPS bilan, o’z bazasidan simkarta qo’yadi
- **Sotuvchi** — tochkadan yoki o’z bazasidan (offisda) sotadi

Asosiy qoidalar:

- Simkarta turlari: Beeline, Ucell, Uzmobile, Mobiuz, OQ
- Agent simkartani faqat **qo’sha** oladi (minus qilolmaydi)
- Agent tochkani faqat **o’sha joyda (100 m)** turib yangilaydi (GPS qulf)
- Har agent **hamma tochkalarni** ko’radi (xarita + yo’l ko’rsat bilan)
- Har hodimning **o’z simkarta bazasi** (zaxira) bor
- Admin hammasini telefondan real-time kuzatadi

-----

## 1. ARXITEKTURA

```
┌─────────────────┐         ┌──────────────────┐         ┌─────────────┐
│  Mobil ilova    │  HTTPS  │  Backend (API)   │         │ PostgreSQL  │
│  Expo / RN      │ ──────> │  FastAPI         │ ──────> │  (Railway)  │
│  (telefon)      │  JSON   │  (Railway)       │         │             │
└─────────────────┘         └──────────────────┘         └─────────────┘
        │                            │
        │                            └─> Rasm fayllar: Cloudinary yoki S3
        │
        └─> APK (EAS Build bulutda)
```

**Texnologiyalar:**

|Qism        |Texnologiya            |Nega                          |
|------------|-----------------------|------------------------------|
|Backend API |FastAPI (Python)       |RestoPOS’dagidek, sizga tanish|
|Baza        |PostgreSQL             |Railway’da bepul beriladi     |
|Auth        |JWT (access token)     |Oddiy, mobил uchun mos        |
|Rasm saqlash|Cloudinary (bepul reja)|Bazada base64 saqlash yomon   |
|Mobil       |React Native + Expo    |APK Android Studio’siz        |
|APK build   |EAS Build              |Bulutda, kompyuter qiynalmaydi|
|Joylash     |Railway                |RestoPOS’dagidek              |

-----

## 2. MA’LUMOTLAR BAZASI (PostgreSQL sxema)

```sql
-- Foydalanuvchilar (admin, agent, sotuvchi)
CREATE TABLE users (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    full_name   TEXT NOT NULL,
    phone       TEXT UNIQUE NOT NULL,        -- login uchun
    password_hash TEXT NOT NULL,
    role        TEXT NOT NULL,               -- 'admin' | 'agent' | 'seller'
    is_active   BOOLEAN DEFAULT TRUE,
    created_at  TIMESTAMPTZ DEFAULT now()
);

-- Har hodimning simkarta zaxirasi (qo'lidagi baza)
-- operator: beeline | ucell | uzmobile | mobiuz | oq
CREATE TABLE stock (
    user_id     UUID REFERENCES users(id) ON DELETE CASCADE,
    operator    TEXT NOT NULL,
    qty         INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (user_id, operator)
);

-- Tochkalar (agent ochgan do'konlar)
CREATE TABLE points (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_id    UUID REFERENCES users(id),    -- kim ochgan
    name        TEXT NOT NULL,                -- "Dilshod aka"
    location    TEXT NOT NULL,                -- "Quva, Anhor bo'yi"
    lat         DOUBLE PRECISION,             -- GPS
    lng         DOUBLE PRECISION,
    photo_outside TEXT,                       -- Cloudinary URL
    photo_inside  TEXT,
    photo_ad      TEXT,
    created_at  TIMESTAMPTZ DEFAULT now(),
    updated_at  TIMESTAMPTZ DEFAULT now()
);

-- Tochkadagi simkarta qoldig'i
CREATE TABLE point_stock (
    point_id    UUID REFERENCES points(id) ON DELETE CASCADE,
    operator    TEXT NOT NULL,
    qty         INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (point_id, operator)
);

-- Sotuvlar
CREATE TABLE sales (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    seller_id   UUID REFERENCES users(id),
    operator    TEXT NOT NULL,
    source      TEXT NOT NULL,                -- 'point' | 'office'
    point_id    UUID REFERENCES points(id),  -- agar source='point'
    created_at  TIMESTAMPTZ DEFAULT now()
);

-- Ombordan hodimga berilgan simkartalar tarixi
CREATE TABLE issues (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    to_user_id  UUID REFERENCES users(id),
    operator    TEXT NOT NULL,
    qty         INTEGER NOT NULL,
    created_at  TIMESTAMPTZ DEFAULT now()
);

-- Harakatlar tarixi (log)
CREATE TABLE activity_log (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID REFERENCES users(id),
    type        TEXT NOT NULL,                -- 'point_open' | 'sale' | 'issue' ...
    text        TEXT NOT NULL,
    created_at  TIMESTAMPTZ DEFAULT now()
);
```

-----

## 3. BACKEND API (FastAPI)

### 3.1 Papka tuzilishi

```
backend/
├── app/
│   ├── main.py             # FastAPI ilova
│   ├── database.py         # PostgreSQL ulanish (asyncpg/SQLAlchemy)
│   ├── models.py           # SQLAlchemy modellar
│   ├── schemas.py          # Pydantic sxemalar
│   ├── auth.py             # JWT login/token
│   ├── deps.py             # get_current_user, role tekshirish
│   └── routers/
│       ├── auth.py         # /login
│       ├── users.py        # hodimlar CRUD (admin)
│       ├── stock.py        # ombor / berish
│       ├── points.py       # tochkalar
│       └── sales.py        # sotuvlar
├── requirements.txt
├── Procfile                # Railway uchun
└── .env                    # DATABASE_URL, JWT_SECRET
```

### 3.2 API endpointlar

|Method|Endpoint       |Rol         |Tavsif                                          |
|------|---------------|------------|------------------------------------------------|
|POST  |`/auth/login`  |hammasi     |Telefon + parol → token                         |
|GET   |`/auth/me`     |hammasi     |O’z profilim                                    |
|GET   |`/users`       |admin       |Hodimlar ro’yxati + balanslar                   |
|POST  |`/users`       |admin       |Yangi hodim qo’shish                            |
|PATCH |`/users/{id}`  |admin       |Hodim o’zgartirish/o’chirish                    |
|GET   |`/stock/me`    |agent/seller|O’z bazam                                       |
|GET   |`/stock/all`   |admin       |Hamma balanslar                                 |
|POST  |`/stock/issue` |admin       |Hodimga simkarta berish                         |
|GET   |`/points`      |hammasi     |Hamma tochkalar (GPS bilan)                     |
|POST  |`/points`      |agent       |Yangi tochka (rasm + GPS), bazadan minus        |
|PATCH |`/points/{id}` |agent       |Tochkani yangilash (GPS tekshiruvi serverda ham)|
|POST  |`/sales/point` |seller      |Tochkadan sotish                                |
|POST  |`/sales/office`|seller      |Offisda o’z bazasidan sotish                    |
|GET   |`/sales/me`    |seller      |Mening sotuvlarim                               |
|GET   |`/dashboard`   |admin       |Umumiy statistika                               |
|GET   |`/logs`        |admin       |Harakatlar tarixi                               |

### 3.3 Muhim mantiq (server tomonda majburiy!)

> Mobil ilovaga ishonmaslik kerak — hamma tekshiruv serverda bo’lsin.

**Tochka ochish (`POST /points`):**

1. Agent bazasida yetarli simkarta bormi? → yo’q bo’lsa `400`
1. Tranzaksiya: agent `stock` dan minus, `points` + `point_stock` yaratish
1. Log yozish

**Tochkani yangilash (`PATCH /points/{id}`):**

1. So’rovda agentning hozirgi `lat/lng` keladi
1. Server tochka koordinatasi bilan masofani hisoblaydi (Haversine)
1. Agar > 100 m → `403 Juda uzoqdasiz` (mobil aldashiga yo’l qo’ymaslik)
1. Bazadan minus, tochka qoldig’iga plyus

**Offisda sotish (`POST /sales/office`):**

1. Sotuvchi bazasida bu operator bormi? → yo’q bo’lsa `400`
1. Sotuvchi `stock` dan minus, `sales` yozuvi

-----

## 4. MOBIL ILOVA (React Native + Expo)

### 4.1 O’rnatish (kompyuterda, bir marta)

```bash
# Node.js o'rnatilgan bo'lsin (nodejs.org)
npm install -g eas-cli
npx create-expo-app simkarta-mobile
cd simkarta-mobile
```

### 4.2 Kerakli paketlar

```bash
npx expo install expo-location          # GPS
npx expo install expo-image-picker      # Kamera/rasm
npx expo install expo-secure-store      # Token saqlash
npm install axios                       # API so'rovlar
npm install @react-navigation/native @react-navigation/bottom-tabs
npx expo install react-native-screens react-native-safe-area-context
npm install react-native-maps           # Xarita (yoki Linking bilan Google Maps)
```

### 4.3 Papka tuzilishi

```
simkarta-mobile/
├── app.json                # Expo config (ruxsatlar shu yerda)
├── eas.json                # EAS Build config
├── src/
│   ├── api.js              # axios — backend URL, token
│   ├── auth.js             # login, token saqlash
│   ├── theme.js            # ranglar (yashil #1b8a5a)
│   ├── screens/
│   │   ├── LoginScreen.js
│   │   ├── AdminDashboard.js
│   │   ├── AdminStock.js       # ombor / berish
│   │   ├── AdminPoints.js
│   │   ├── AgentPoints.js      # tochkalar + GPS
│   │   ├── NewPointScreen.js   # rasm + GPS
│   │   ├── SellerSell.js
│   │   └── ...
│   └── components/
│       ├── SimChip.js
│       ├── Stepper.js          # qo'lda raqam yozish bilan
│       └── PhotoPicker.js      # kamera
└── App.js
```

### 4.4 Muhim: ruxsatlar (`app.json`)

```json
{
  "expo": {
    "name": "SimKarta",
    "slug": "simkarta",
    "android": {
      "package": "uz.simkarta.app",
      "permissions": ["ACCESS_FINE_LOCATION", "CAMERA"],
      "versionCode": 1
    },
    "plugins": [
      ["expo-location", { "locationWhenInUsePermission": "Tochka joylashuvini aniqlash uchun" }],
      ["expo-image-picker", { "cameraPermission": "Tochka rasmlarini olish uchun" }]
    ]
  }
}
```

### 4.5 GPS olish (web’dagi `navigator.geolocation` o’rniga)

```javascript
import * as Location from 'expo-location';

async function getGPS() {
  const { status } = await Location.requestForegroundPermissionsAsync();
  if (status !== 'granted') throw new Error('GPS rad etildi');
  const pos = await Location.getCurrentPositionAsync({
    accuracy: Location.Accuracy.High,
  });
  return { lat: pos.coords.latitude, lng: pos.coords.longitude, acc: pos.coords.accuracy };
}
```

### 4.6 Rasm olish (kamera)

```javascript
import * as ImagePicker from 'expo-image-picker';

async function takePhoto() {
  const { status } = await ImagePicker.requestCameraPermissionsAsync();
  if (status !== 'granted') throw new Error('Kamera rad etildi');
  const res = await ImagePicker.launchCameraAsync({ quality: 0.6 });
  if (!res.canceled) return res.assets[0].uri;  // keyin Cloudinary'ga yuklash
}
```

### 4.7 Token saqlash

```javascript
import * as SecureStore from 'expo-secure-store';
// saqlash: await SecureStore.setItemAsync('token', token)
// o'qish:  await SecureStore.getItemAsync('token')
```

-----

## 5. APK YASASH (EAS Build — Android Studio’siz)

```bash
# 1. Expo akkaunt (bepul) — expo.dev'da ro'yxatdan o'ting
eas login

# 2. Build konfiguratsiya
eas build:configure

# 3. eas.json'ga APK profili qo'shing:
```

```json
{
  "build": {
    "preview": {
      "android": { "buildType": "apk" }
    },
    "production": {
      "android": { "buildType": "app-bundle" }
    }
  }
}
```

```bash
# 4. APK build (BULUTDA — kompyuter qiynalmaydi)
eas build -p android --profile preview

# 5. 10-15 daqiqada link beradi → APK'ni yuklab oling
#    Telefonlarga yuborib o'rnatasiz
```

> **Muhim:** APK build bulutda Expo serverida bo’ladi. Kompyuteringizga faqat Node.js va eas-cli kerak — Android Studio, Java, SDK shart emas.

-----

## 6. JOYLASH (Railway)

### Backend:

1. GitHub’ga `backend/` push qiling
1. Railway → New Project → Deploy from GitHub
1. Railway → Add PostgreSQL (avtomatik `DATABASE_URL` beradi)
1. Environment: `JWT_SECRET`, `CLOUDINARY_URL` qo’shing
1. `Procfile`: `web: uvicorn app.main:app --host 0.0.0.0 --port $PORT`

### Mobil ilova backend URL’i:

`src/api.js` da Railway bergan URL’ni yozasiz:

```javascript
const API_URL = 'https://simkarta-backend.up.railway.app';
```

-----

## 7. ISH TARTIBI (bosqichma-bosqich)

|Bosqich|Vazifa                                   |Taxminiy|
|-------|-----------------------------------------|--------|
|1      |Backend: baza + auth + login             |1-2 kun |
|2      |Backend: stock, points, sales endpointlar|2-3 kun |
|3      |Backend’ni Railway’ga joylash + test     |1 kun   |
|4      |Mobil: login + navigatsiya skeleti       |1 kun   |
|5      |Mobil: agent (tochka, GPS, kamera)       |2-3 kun |
|6      |Mobil: sotuvchi + admin ekranlar         |2-3 kun |
|7      |Cloudinary rasm yuklash ulash            |1 kun   |
|8      |EAS Build → birinchi APK + test          |1 kun   |
|9      |Tuzatish, dizayn jilolash                |2-3 kun |

-----

## 8. CLAUDE CODE’DA BOSHLASH

VS Code’da yangi papka oching va Claude Code’ga shu buyruqni bering:

```
Men SimKarta nomli simkarta tarqatish tizimi qilyapman.
REJA.md faylни o'qi. 1-bosqichdan boshla: FastAPI backend,
PostgreSQL, JWT auth, /auth/login va /auth/me endpointlari.
Papka tuzilishini REJA.md 3.1 bo'limidagidek qil.
```

Keyin har bosqichda REJA.md’ning tegishli bo’limiga ishora qilasiz.

-----

## 9. KEYINGI BOSQICH (ixtiyoriy)

- Telegram bot — admin’ga real-time bildirishnoma (yangi tochka, sotuv)
- Excel hisobot eksport
- Push-bildirishnoma (Expo Notifications)
- Tochkalar xaritada bir ekranda (klaster bilan)
- Offline rejim (internet yo’qda ishlab, keyin sinxron)

-----

**Eslatma:** Hozirgi Claude’da yasagan web demo (`SimKarta.jsx`) — dizayn va mantiq namunasi. Mobil ilovada ekranlar shunga o’xshash bo’ladi, faqat React Native komponentlari bilan (View, Text, TouchableOpacity). Ranglar va tuzilishni undan oling.