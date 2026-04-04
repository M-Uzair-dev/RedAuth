# RedAuth

A production-ready Express + TypeScript authentication backend. Secure, device-aware sessions out of the box — drop it in and build on top.

> All code is hand-written with zero AI-generated code.

**Author:** Uzair Manan
**License:** ISC
**Repository:** [M-Uzair-dev/Authetication-Template](https://github.com/M-Uzair-dev/Authetication-Template)
**Issues:** [GitHub Issues](https://github.com/M-Uzair-dev/Authetication-Template/issues)

---

## Features

- Dual-token session management (access + refresh JWT via httpOnly cookies)
- Device-scoped sessions — one refresh token per device per user, multiple concurrent sessions supported
- Refresh token rotation with automatic theft detection (nukes all sessions on replay attack)
- Redis-based sliding window rate limiting, user caching, and instant token revocation
- BullMQ worker queues for async email delivery with retry + backoff
- Scheduled token cleanup cron (every 10 minutes)
- Zod v4 input validation on every endpoint
- Timing-attack mitigations on all sensitive endpoints (forgot password, resend email, login)
- HTML email templates for verification, login alerts, and password reset

---

## Tech Stack

| Layer | Technology |
|---|---|
| Runtime | Node.js v20+ (ESM) |
| Framework | Express 5 |
| Language | TypeScript (NodeNext module resolution) |
| Database | PostgreSQL via Prisma 7 + `pg` pool adapter |
| Cache / Queue broker | Redis via ioredis |
| Background jobs | BullMQ |
| Validation | Zod 4 |
| Auth | jsonwebtoken + bcrypt (cost 12) |
| Email | Nodemailer |
| Security headers | Helmet |

---

## File Structure

```
AuthTemplate/
├── src/
│   ├── index.ts                    # App entry — middleware stack, routes, server start
│   ├── controllers/
│   │   ├── auth.controller.ts      # Login, signup, password reset, email verification, logout
│   │   └── user.controller.ts      # Get/update/delete user, sessions, revoke session
│   ├── services/
│   │   ├── auth.service.ts         # Core auth business logic
│   │   ├── token.service.ts        # JWT signing, verification, rotation, revocation
│   │   ├── email.service.ts        # Email template rendering + BullMQ job dispatch
│   │   └── user.service.ts         # User CRUD, session queries
│   ├── routes/
│   │   ├── auth.route.ts           # /auth/* route definitions + rate limiter attachment
│   │   └── user.route.ts           # /user/* route definitions
│   ├── middleware/
│   │   └── verifyUser.ts           # JWT auth middleware, sets req.userId, records last-active
│   ├── schemas/
│   │   ├── auth.schema.ts          # Zod schemas for all auth endpoint inputs
│   │   └── user.schema.ts          # Zod schemas for user update and session revoke
│   ├── errors/
│   │   └── errors.ts               # appError class + errorType enum
│   ├── utils/
│   │   ├── rateLimiter.ts          # Redis sliding window rate limiter factory
│   │   ├── cacheUser.ts            # Redis user cache read/write/delete (Zod-validated)
│   │   ├── handleError.ts          # Centralized error handler (appError, ZodError, unknown)
│   │   └── getRequestInfo.ts       # Parses User-Agent + IP for login metadata
│   ├── lib/
│   │   ├── prisma.ts               # Prisma client singleton with pg pool adapter
│   │   └── redis.ts                # ioredis client singleton
│   ├── queues/
│   │   ├── email.queue.ts          # BullMQ email queue definition
│   │   └── tokenCleanup.queue.ts   # BullMQ cleanup queue with repeating job
│   ├── workers/
│   │   ├── email.worker.ts         # Processes email jobs, handles retry/failure cleanup
│   │   └── tokenCleanup.worker.ts  # Deletes expired tokens from DB every 10 minutes
│   ├── emails/
│   │   ├── emailVerification.html  # Verification email template
│   │   ├── loginAlert.html         # Login alert email template
│   │   └── passwordReset.html      # Password reset email template
│   └── types/
│       └── express.d.ts            # Express Request augmentation (req.userId)
├── prisma/
│   ├── schema.prisma               # User + Token models
│   └── migrations/                 # Migration history
├── postman-collection.json         # Importable Postman collection (all 14 endpoints)
├── API_ROUTES.md                   # Full API reference — request/response shapes
├── env_example.txt                 # All required environment variables with defaults
├── package.json
└── tsconfig.json
```

---

## Prerequisites

- **Node.js** v20+
- **PostgreSQL** database (local or hosted)
- **Redis** server (local Docker or hosted)
- **SMTP credentials** (e.g. Gmail app password)

---

## Setup

### 1. Clone & Install

```bash
git clone https://github.com/M-Uzair-dev/Authetication-Template.git
cd Authetication-Template
npm install
```

### 2. Environment Variables

```bash
cp env_example.txt .env
```

Fill in all values:

| Variable | Description | Default |
|---|---|---|
| `DATABASE_URL` | PostgreSQL connection string | — |
| `ACCESS_TOKEN_SECRET` | JWT signing secret for access tokens | — |
| `ACCESS_TOKEN_EXPIRY` | Access token lifetime in **milliseconds** | `900000` (15 min) |
| `REFRESH_TOKEN_SECRET` | JWT signing secret for refresh tokens | — |
| `REFRESH_TOKEN_EXPIRY` | Refresh token lifetime in **milliseconds** | `604800000` (7 days) |
| `RESET_TOKEN_SECRET` | JWT signing secret for password reset tokens | — |
| `RESET_TOKEN_EXPIRY` | Reset token lifetime in **milliseconds** | `1800000` (30 min) |
| `VERIFICATION_TOKEN_SECRET` | JWT signing secret for email verification tokens | — |
| `VERIFICATION_TOKEN_EXPIRY` | Verification token lifetime in **milliseconds** | `172800000` (2 days) |
| `MAIL_HOST` | SMTP host | `smtp.gmail.com` |
| `MAIL_PORT` | SMTP port | `587` |
| `MAIL_USER` | SMTP username / sender address | — |
| `MAIL_PASS` | SMTP password or app password | — |
| `REDIS_HOST` | Redis host | `127.0.0.1` |
| `REDIS_PORT` | Redis port | `6379` |
| `FRONTEND_URL` | Frontend base URL (used in email links) | — |

> All four JWT secrets must be set or the server will throw on startup. Use long, random strings (32+ characters each).

### 3. Redis

```bash
# First time — downloads the image and starts the container
docker run -d --name redis-server -p 6379:6379 redis

# Subsequent starts
docker start redis-server
```

### 4. Database

```bash
# Apply migrations
npx prisma migrate deploy

# Reset during development
npx prisma migrate reset

# Open Prisma Studio (GUI)
npx prisma studio
```

### 5. Run

```bash
# Development (TypeScript watch + nodemon)
npm run dev

# Production
npm run build
npm start
```

Server starts on `PORT` (default `5000`).

---

## API

Full request/response documentation for all 14 endpoints is in **[API_ROUTES.md](API_ROUTES.md)**.

### Route overview

| Method | Path | Auth | Description |
|---|---|---|---|
| `POST` | `/auth/signup` | — | Register a new account |
| `POST` | `/auth/login` | — | Login with email + password |
| `POST` | `/auth/forgotPassword` | — | Send password reset email |
| `POST` | `/auth/resetPassword` | — | Reset password via token |
| `POST` | `/auth/verifyEmail` | — | Verify email via token |
| `POST` | `/auth/resendVerificationEmail` | — | Resend verification email |
| `POST` | `/auth/logout` | Yes | Logout current device |
| `POST` | `/auth/logout-all` | Yes | Logout all devices |
| `POST` | `/auth/get-access-token` | — | Rotate tokens using refresh cookie |
| `GET` | `/user/me` | Yes | Get current user |
| `PATCH` | `/user/me` | Yes | Update current user |
| `DELETE` | `/user/me` | Yes | Delete account |
| `GET` | `/user/sessions` | Yes | List all active sessions |
| `POST` | `/user/revokeSession` | Yes | Revoke a specific session |

### Postman

Import `postman-collection.json` from the root of the repo into Postman. Set the `{{baseUrl}}` variable to `http://localhost:5000`.

---

## Architecture

### Token flow

```
Login / Signup
  └─ generateTokens()
       ├─ Signs access JWT  { id, email, tokenId }  (15 min)
       ├─ Signs refresh JWT { id, email, tokenId }  (7 days)
       └─ Upserts refresh token hash into Token table (keyed on userId + device)
            → Both set as httpOnly cookies

Authenticated request
  └─ verifyUser middleware
       ├─ Verifies access token signature
       ├─ Checks Redis for revoked-{tokenId} key
       └─ Sets req.userId, records last-active-{tokenId} in Redis (TTL: 7 days)

Access token expired  →  client calls POST /auth/get-access-token
  └─ Verifies refresh token
       ├─ tokenId not in DB → wipe ALL sessions (theft detected)
       └─ Rotate: delete old record, mint new access + refresh pair

Logout
  └─ Deletes refresh token from DB
  └─ Sets revoked-{tokenId} in Redis (TTL: 30 min) for instant revocation
```

### Rate limits

| Limiter | Applies to | Limit |
|---|---|---|
| `generalLimiter` | All routes | 100 req / 60 sec per IP |
| `strictAuthLimiter` | login, signup, resetPassword, verifyEmail, logout, logout-all, get-access-token | 10 req / 5 min per IP |
| `stricterEmailLimiter` | forgotPassword, resendVerificationEmail | 3 req / 5 min per IP |

Implemented as a Redis sorted-set sliding window — works correctly across multiple server instances.

### Email queue

- Jobs dispatched async via BullMQ (concurrency: 5)
- 3 retry attempts, exponential backoff starting at 5s
- On final failure: orphaned token record deleted from DB
- Triggered by: signup (verification), login (alert), forgot password (reset link)

### Database schema

**User** — `id`, `name`, `email` (unique), `password` (bcrypt), `emailVerified`, `createdAt`, `updatedAt`

**Token** — `id`, `userId` (FK cascade), `type` (EMAIL_VERIFICATION | PASSWORD_RESET | REFRESH_TOKEN), `tokenHash` (SHA-256 of JWT), `device`, `deviceName`, `lastActive`, `expiresAt`, `createdAt`

Indexes: `userId`, `tokenHash`, unique `(userId, device, type)`

---

## CORS

Configured for `http://localhost:3000` with `credentials: true`. Before deploying, update `src/index.ts` to read the origin from `process.env.FRONTEND_URL`.

---

## License

ISC
