# CarGuy Mobile (Flutter)

Android / iOS client for the CarGuy NestJS API. Next.js web app remains in `apps/web`.

## Prerequisites

1. [Flutter SDK](https://docs.flutter.dev/get-started/install) ≥ 3.24
2. Running API + Postgres (`pnpm dev:api` from repo root, after DB is up)
3. Generate platform folders if missing:

```bash
cd apps/mobile
flutter create . --project-name carguy_mobile --org ge.carguy
```

This keeps existing `lib/`, `pubspec.yaml`, and `assets/`.

## Configure API URL

Default (Android emulator → host machine):

```
http://10.0.2.2:4000/api
```

iOS simulator / desktop:

```bash
flutter run --dart-define=API_BASE_URL=http://127.0.0.1:4000/api
```

Physical device (use your LAN IP):

```bash
flutter run --dart-define=API_BASE_URL=http://192.168.x.x:4000/api
```

## Run

```bash
cd apps/mobile
flutter pub get
flutter run
```

## Features

- Auth (email/password, JWT refresh, Google deep link ready via `carguy://`)
- Feed, stories hooks, marketplace, services, map, garage
- Forum, news, events, insurance, discounts, booking, AI mechanic
- Messages (REST + Socket.IO `/chat`)
- Notifications socket `/notifications`
- Business billing checkout (10 GEL/month)
- Global search `GET /search`
- **In-app voice/video calls** (WebRTC + Socket.IO `/calls`) from profile & chat

## Permissions

Android: camera, microphone, internet, location (see `android/app/src/main/AndroidManifest.xml`).  
iOS: add `NSCameraUsageDescription` / `NSMicrophoneUsageDescription` in `ios/Runner/Info.plist` after `flutter create`.

## DB migration (calls)

Apply API migration for `CallSession`:

```bash
cd apps/api
pnpm exec prisma migrate deploy
# or: pnpm exec prisma migrate dev
```

## Test business account

- Email: `business@test.ge`
- Password: `Business123!`
