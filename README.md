# CarGuy

Automotive social platform — feed, marketplace, services, garage, messaging, and more.

## Apps

| App | Stack | Path |
| --- | --- | --- |
| API | NestJS + Prisma + PostgreSQL | `apps/api` |
| Web | Next.js 15 | `apps/web` |
| Mobile | Flutter (Android / iOS / web) | `apps/mobile` |

## Getting Started

Requires **Node 20+**, **pnpm 9+**, **PostgreSQL**, and for mobile **Flutter 3.24+**.

```bash
pnpm install
cp apps/api/.env.example apps/api/.env   # fill secrets
pnpm --filter @carguy/api prisma:deploy
pnpm --filter @carguy/api prisma:seed
pnpm dev                                 # API + Web
```

```bash
cd apps/mobile && flutter pub get && flutter run
```

- API: http://localhost:4000/api
- Web: http://localhost:3000
- Swagger: http://localhost:4000/api/docs

### Demo logins (after seed)

| User | Password |
| --- | --- |
| `test1` | `123` |
| `test2` | `1234` |

## Scripts

| Command | Description |
| --- | --- |
| `pnpm dev` | API + Web |
| `pnpm --filter @carguy/api prisma:seed` | Seed DB (includes demo posts) |
