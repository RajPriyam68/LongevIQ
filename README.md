# LongevIQ

**Your AI Health Copilot for a Longer, Healthier Life.**

LongevIQ is a production-grade, AI-powered healthcare and wellness SaaS platform. Users can manage
health profiles, upload and understand medical reports, chat with their documents, track health
metrics, and receive educational nutrition, workout, and medication-reminder guidance.

> **Educational and wellness-focused.** LongevIQ never diagnoses diseases, never prescribes
> treatments, and never replaces a physician. Every AI response includes a medical disclaimer.

---

## Architecture at a Glance

```
┌─────────────┐        ┌──────────────┐        ┌──────────────────┐
│   Browser   │ ─────▶ │  Next.js 15  │ ─────▶ │   Express API    │
│  (React 19) │        │   (App)      │ /api   │  (v1, REST)      │
└─────────────┘        └──────────────┘        └────────┬─────────┘
                                                       │ Prisma
                                                ┌──────┴──────┐
                                                │ PostgreSQL │
                                                │  + pgvector │
                                                └─────────────┘
```

- **Monorepo** managed with npm workspaces.
- **Clean Architecture** on the backend: Controller → Service → Repository → Database.
- **Shared package** (`@longeviq/shared`) holds cross-app types and constants.
- **AI logic isolated** behind services (added from Sprint 5 onward).
- **Docker + Docker Compose + Nginx** for local and production deployment.
- **GitHub Actions** runs lint, typecheck, tests, build, and Docker builds.

---

## Repository Structure

```
apps/
  api/        Express + TypeScript REST API (versioned, /api/v1)
  web/        Next.js 15 App Router frontend (React 19, Tailwind, shadcn/ui)
packages/
  shared/     Shared types, enums, constants (@longeviq/shared)
docker/
  nginx/      Nginx reverse-proxy configuration
docs/         Architecture, API, environment and security documentation
.github/
  workflows/  CI pipeline
```

## Tech Stack

| Layer       | Technologies                                                                  |
| ----------- | ----------------------------------------------------------------------------- |
| Frontend    | Next.js 15, React 19, TypeScript, Tailwind CSS, shadcn/ui, RHF, Zod, TanStack Query, Zustand, Axios, Recharts, Framer Motion |
| Backend     | Node.js 22, Express.js, TypeScript                                            |
| Database    | PostgreSQL, Prisma ORM, pgvector                                               |
| AI          | OpenAI-compatible models, Google Gemini, LangChain, RAG, OCR, Whisper, TTS    |
| Auth        | JWT + refresh tokens, Google OAuth, RBAC                                      |
| Storage     | AWS S3                                                                         |
| Deployment  | Docker, Docker Compose, Nginx, GitHub Actions, AWS, Vercel                    |

---

## Prerequisites

- Node.js 22 LTS (`node >= 22`)
- npm 10+
- Docker + Docker Compose (for the database and containerized deployment)

## Getting Started

```bash
# 1. Install dependencies
npm install

# 2. Configure environment
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env

# 3. Start infrastructure (PostgreSQL + pgvector, Redis)
docker compose up -d postgres redis

# 4. Start both apps (web on :3000, api on :4000)
npm run dev
```

- Web: http://localhost:3000
- API health: http://localhost:4000/api/v1/health
- API through the web proxy: http://localhost:3000/api/v1/health

## Scripts

| Command                 | Description                                  |
| ----------------------- | -------------------------------------------- |
| `npm run dev`           | Run API + Web in watch mode                  |
| `npm run build`         | Build shared, api, then web                  |
| `npm run typecheck`     | Typecheck all workspaces                     |
| `npm run lint`          | ESLint across api and web                    |
| `npm run test`          | Vitest suites for api and web                |
| `npm run format`        | Format the whole repository with Prettier    |
| `npm run format:check`  | Verify formatting                            |

## Deployment

```bash
docker compose up -d --build
```

Nginx (port 80) routes `/` to the web container and `/api/*` to the API container.
See `docs/DEPLOYMENT.md` and `docs/ENVIRONMENT.md` for details.

### Sprint 1 — Authentication & User Management

- **API**: register, login, refresh (rotation + reuse detection), logout, email verification,
  resend verification, Google OAuth, and current-user profile/password endpoints under
  `/api/v1/auth` and `/api/v1/users`.
- **Security**: argon2id password hashing, short-lived HS256 access JWTs, DB-backed opaque refresh
  tokens stored in an httpOnly cookie, per-IP auth rate limiting, and audit logging for auth
  events.
- **Data model**: `User`, `RefreshToken`, `EmailVerificationToken`, `AuditLog` (Prisma migration
  `20260807021245_add_auth_and_audit`).
- **Frontend**: sign-in, register, verify-email, Google callback, and account pages; Zustand auth
  store with persistence; axios client with single-flight refresh interceptor; auth-guarded
  `/account`.
- **Tests**: 20 API tests (unit + DB-backed integration) and 14 web tests.
- **Demo accounts** (seed): `admin@longeviq.dev`, `doctor@longeviq.dev`, `demo@longeviq.dev`
  (passwords documented in `apps/api/prisma/seed.ts`).

---

## Roadmap (Sprints)

| Sprint | Scope                                                        |
| ------ | ------------------------------------------------------------ |
| 0      | Project planning & setup **(done)**                          |
| 1      | Authentication & user management **(done)**                   |
| 2      | Health dashboard                                             |
| 3      | Medical report upload & management                           |
| 4      | OCR + medical report parsing                                 |
| 5      | Medical knowledge base (RAG)                                 |
| 6      | AI health assistant                                          |
| 7      | Nutrition planner                                            |
| 8      | Workout planner                                              |
| 9      | Medication reminder                                          |
| 10     | Voice assistant                                              |
| 11     | Health score & analytics                                     |
| 12     | Doctor portal                                                |
| 13     | Admin dashboard                                              |
| 14     | Notifications                                                |
| 15     | Deployment & DevOps                                          |
| 16     | Testing & optimization                                       |
| 17     | Production release                                           |

---

## Medical Safety

LongevIQ is designed for **educational and wellness purposes only**. It must never:

- diagnose disease,
- prescribe medicine,
- or replace a physician.

Every AI-generated health response includes:

> *This information is intended for educational purposes only and is not a substitute for
> professional medical advice, diagnosis, or treatment.*

The disclaimer is enforced centrally via `MEDICAL_DISCLAIMER` in `packages/shared`.

## License

Proprietary. All rights reserved.
