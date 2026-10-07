# Emergency Ambulance Dispatch — Backend

A production-ready REST API for an emergency ambulance dispatch system.
Callers create emergency requests, dispatchers assign ambulances using a
priority + distance algorithm, drivers / trips / hospitals are tracked,
and payments are processed through Stripe. Built with **Node.js**,
**TypeScript**, **Express 5**, **Prisma 7** and **PostgreSQL**.

> Structure, naming, and module layout follow the project's internal
> reference backend (GearUP) and improve on it where the emergency
> domain requires it (Zod validation, soft delete, Stripe webhooks,
> transaction-safe dispatch).

---

## Features

- **JWT auth** with access + refresh tokens, bcrypt password hashing.
- **Three primary roles** only: `CALLER`, `DISPATCHER`, `ADMIN`. Driver
  and Hospital are *entities*, not auth roles.
- **Emergency lifecycle** with controlled status transitions and a
  heuristic priority suggester.
- **Dispatch workflow** with **transaction-safe** ambulance assignment
  (no two dispatchers can grab the same ambulance at once).
- **Trip management** with hospital selection, fare estimate based on
  Haversine distance, and per-stage timestamps.
- **Stripe Checkout** payment integration with **webhook signature
  verification** and idempotent status updates.
- **Soft delete** for critical resources (`User`, `Ambulance`, `Driver`,
  `Hospital`, `EmergencyRequest`).
- **Audit log** of every important action.
- **Admin statistics** and audit-log browsing endpoints.
- **Helmet + CORS + express-rate-limit** for security.
- **PostgreSQL + Prisma 7** with split-schema files and `@prisma/adapter-pg`.
- **Vitest** unit + integration tests.
- **Postman collection** for every endpoint.

---

## Technology Stack

| Layer | Tool |
|---|---|
| Runtime | Node.js 22+ |
| Language | TypeScript 5.6 (strict) |
| HTTP | Express 5 |
| ORM | Prisma 7 + `@prisma/adapter-pg` |
| Database | PostgreSQL |
| Auth | JWT (`jsonwebtoken`), bcrypt (`bcryptjs`) |
| Validation | Zod |
| Payments | Stripe Checkout + webhooks |
| Security | Helmet, CORS, express-rate-limit |
| Tests | Vitest + supertest |
| Bundler | tsup (production) + tsx (dev) |

---

## Architecture

```
src/
├── app.ts              # Express app composition (CORS, helmet, routes)
├── server.ts           # Process entry point (connects DB, starts listener)
└── app/
    ├── config/         # Centralised env config
    ├── lib/            # Prisma client, Stripe client
    ├── middleware/     # auth, validate, rateLimit, globalErrorHandler, notFound
    ├── utils/          # AppError, catchAsync, jwt, sendResponse, pagination,
    │                   # distance, stateMachine, audit, request helpers
    └── modules/        # auth | user | ambulance | driver | hospital |
                        # emergency | dispatch | trip | payment | admin | audit
        └── <name>/
            ├── <name>.controller.ts
            ├── <name>.interface.ts
            ├── <name>.route.ts
            ├── <name>.service.ts
            └── <name>.validation.ts   (Zod schemas)
```

Each module follows the same shape:
- **route.ts** wires HTTP verbs to controllers, applies auth + validation.
- **controller.ts** is a thin wrapper that delegates to the service.
- **service.ts** owns the business logic, transactions, and Prisma calls.
- **validation.ts** defines Zod schemas for body / query / params.

---

## Database Design

The Prisma schema lives under `prisma/schema/` and is split by domain:

```
schema.prisma          # generator + datasource
enums.prisma           # all enums centralised
user.prisma            # User, Profile, RefreshToken
ambulance.prisma       # Ambulance, Driver
hospital.prisma
emergency.prisma       # EmergencyRequest, EmergencyStatusHistory
dispatch.prisma        # DispatchAssignment
trip.prisma
payment.prisma
auditLog.prisma
```

### Entity relationships

```
User
 ├── Profile             (1-1)
 ├── RefreshToken        (1-many, rotated)
 ├── EmergencyRequest    (1-many, as caller)
 ├── Payment             (1-many)
 └── AuditLog            (1-many)

EmergencyRequest
 ├── EmergencyStatusHistory
 ├── DispatchAssignment
 └── Trip (1-1, created on first assign)

Ambulance
 ├── Driver
 ├── DispatchAssignment
 └── Trip

Trip
 ├── Hospital
 └── Payment
```

### Indexes (additive)

```text
User.email                          (unique)
User.role
User.status

EmergencyRequest.callerId
EmergencyRequest.status
EmergencyRequest.priority
EmergencyRequest.createdAt

Ambulance.status
Ambulance.isActive

DispatchAssignment.emergencyRequestId
DispatchAssignment.ambulanceId
DispatchAssignment.dispatcherId
DispatchAssignment.status

Payment.tripId          (unique)
Payment.userId
Payment.status

AuditLog.userId
AuditLog.entity, entityId
AuditLog.action
AuditLog.createdAt
```

### State machines

```
EmergencyRequest:
PENDING → DISPATCHING → ASSIGNED → EN_ROUTE → ARRIVED → PICKED_UP
  → HOSPITAL_SELECTED → HOSPITAL_ARRIVED → COMPLETED
any non-terminal → CANCELLED  (caller only while PENDING/DISPATCHING)

Trip:
NOT_STARTED → EN_ROUTE → AT_SCENE → PATIENT_ONBOARD → AT_HOSPITAL → COMPLETED

Ambulance:
AVAILABLE → RESERVED → EN_ROUTE → AT_SCENE → PATIENT_ONBOARD → AT_HOSPITAL → AVAILABLE
+ branches to MAINTENANCE / OFFLINE.

Payment:
PENDING → PROCESSING → PAID / FAILED / CANCELLED
PAID → REFUNDED
```

Invalid transitions throw `AppError(400)`. See
`src/app/utils/stateMachine.ts`.

---

## Authentication & RBAC

| Endpoint | Role(s) |
|---|---|
| `POST /api/v1/auth/register` | public (creates CALLER) |
| `POST /api/v1/auth/login` | public |
| `POST /api/v1/auth/refresh` | public (requires refresh token) |
| `POST /api/v1/auth/logout` | any authenticated user |
| `GET/PATCH /api/v1/users/me` | any authenticated user |
| `/api/v1/emergencies` | CALLER sees their own only; DISPATCHER / ADMIN see all |
| `/api/v1/ambulances` GET | DISPATCHER, ADMIN |
| `/api/v1/ambulances` write | ADMIN |
| `/api/v1/drivers` | ADMIN |
| `/api/v1/hospitals` GET | any authenticated user |
| `/api/v1/hospitals` write | ADMIN |
| `/api/v1/dispatch/*` | DISPATCHER, ADMIN |
| `/api/v1/trips` GET | any (CALLER only sees own) |
| `/api/v1/trips/:id/status` | DISPATCHER, ADMIN |
| `/api/v1/payments/create` | CALLER (only the trip's caller) |
| `/api/v1/payments/webhook` | Stripe (signature-verified) |
| `/api/v1/admin/*` | ADMIN |
| `/api/v1/audit` | ADMIN |

---

## API Surface (33+ meaningful endpoints)

```
GET    /api/v1/health
POST   /api/v1/auth/register
POST   /api/v1/auth/login
POST   /api/v1/auth/refresh
POST   /api/v1/auth/logout
GET    /api/v1/users/me
PATCH  /api/v1/users/me

POST   /api/v1/emergencies
GET    /api/v1/emergencies
GET    /api/v1/emergencies/:id
PATCH  /api/v1/emergencies/:id
PATCH  /api/v1/emergencies/:id/cancel
DELETE /api/v1/emergencies/:id

POST   /api/v1/ambulances
GET    /api/v1/ambulances
GET    /api/v1/ambulances/:id
PATCH  /api/v1/ambulances/:id
DELETE /api/v1/ambulances/:id

POST   /api/v1/drivers
GET    /api/v1/drivers
GET    /api/v1/drivers/:id
PATCH  /api/v1/drivers/:id
DELETE /api/v1/drivers/:id

POST   /api/v1/hospitals
GET    /api/v1/hospitals
GET    /api/v1/hospitals/:id
PATCH  /api/v1/hospitals/:id
DELETE /api/v1/hospitals/:id

GET    /api/v1/dispatch/available-ambulances
POST   /api/v1/dispatch/:emergencyId/assign
PATCH  /api/v1/dispatch/:assignmentId/reassign
PATCH  /api/v1/dispatch/:assignmentId/status
GET    /api/v1/dispatch/assignments

GET    /api/v1/trips
GET    /api/v1/trips/:id
PATCH  /api/v1/trips/:id/status
PATCH  /api/v1/trips/:id/hospital

POST   /api/v1/payments/create
GET    /api/v1/payments
GET    /api/v1/payments/:id
GET    /api/v1/payments/admin/all
POST   /api/v1/payments/webhook        (Stripe)

GET    /api/v1/admin/users
POST   /api/v1/admin/users
GET    /api/v1/admin/users/:id
PATCH  /api/v1/admin/users/:id
DELETE /api/v1/admin/users/:id
PATCH  /api/v1/admin/users/:id/restore
GET    /api/v1/admin/statistics

GET    /api/v1/audit
```

Every endpoint returns the standard envelope:

```json
{ "success": true, "statusCode": 200, "message": "...", "data": {} }
```

Errors:

```json
{ "success": false, "statusCode": 400, "message": "...", "errors": [] }
```

---

## Environment Variables

Copy `.env.example` → `.env` and fill in real values.

| Variable | Description |
|---|---|
| `NODE_ENV` | `development` / `production` |
| `PORT` | HTTP port (default `5000`) |
| `CLIENT_URL` | Allowed CORS origin (comma-separated) |
| `DATABASE_URL` | Postgres connection string |
| `JWT_ACCESS_SECRET` | Access token HMAC secret (long random) |
| `JWT_REFRESH_SECRET` | Refresh token HMAC secret (long random) |
| `JWT_ACCESS_EXPIRES_IN` | e.g. `1d` |
| `JWT_REFRESH_EXPIRES_IN` | e.g. `7d` |
| `BCRYPT_SALT_ROUNDS` | 10 by default |
| `STRIPE_SECRET_KEY` | Stripe test/live secret key |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook signing secret |
| `STRIPE_CURRENCY` | e.g. `usd` |
| `REDIS_URL` | Optional. Not used in this assignment. |

---

## Installation

```bash
# 1. Install dependencies
npm install

# 2. Copy env template and fill in DATABASE_URL + JWT secrets
cp .env.example .env

# 3. Generate Prisma client
npm run prisma:generate

# 4. Create the database and apply migrations
npm run prisma:migrate -- --name init

# 5. Seed demo data (admin / dispatcher / caller accounts, 4 ambulances, 3 hospitals)
npm run prisma:seed

# 6. Start dev server
npm run dev
```

> `npm run prisma:migrate` runs `prisma migrate dev` which expects a
> reachable PostgreSQL. For production, use `npm run prisma:deploy`
> (which runs `prisma migrate deploy`).

---

## Development

```bash
npm run dev              # tsx watch src/server.ts
npm run build            # tsup → dist/server.js
npm start                # node dist/server.js
npm test                 # vitest run
npm run test:watch
npm run prisma:studio
```

### Seeded demo accounts

The seed script creates three accounts (password is the same for all):

```
admin@ambulance.local      → ADMIN
dispatch@ambulance.local   → DISPATCHER
caller@ambulance.local     → CALLER
```

> The default demo password is set in `prisma/seed.ts` (search for
> `DEMO_PASSWORD`). Change it before deploying to any non-local
> environment.

---

## Stripe Setup (Webhook)

Stripe webhooks must verify the signature against a shared secret.
Locally:

```bash
# 1. Install the Stripe CLI: https://docs.stripe.com/stripe-cli
# 2. Login and run the listener (forwards Stripe events to your local API)
stripe listen --forward-to localhost:5000/api/v1/payments/webhook
```

The CLI prints a `whsec_...` signing secret. Set it as
`STRIPE_WEBHOOK_SECRET` in `.env` and restart the API.

For production (Render, Fly, etc.):

1. In the Stripe dashboard → Developers → Webhooks → Add endpoint.
2. URL: `https://<your-domain>/api/v1/payments/webhook`.
3. Subscribe to `checkout.session.completed`,
   `checkout.session.expired`, and `payment_intent.payment_failed`.
4. Copy the signing secret into `STRIPE_WEBHOOK_SECRET`.

The webhook handler:

- Verifies the signature via `stripe.webhooks.constructEvent`.
- Looks up the payment by `sessionId` (or `transactionId` for
  `payment_intent.*` events).
- Updates the payment status.
- Writes an audit log entry.
- Is **idempotent** — a second delivery of the same event is a no-op.

---

## Concurrency-safe dispatch

The most important business rule is that **two dispatchers must not be
able to assign the same ambulance at the same time**. We achieve this
in `dispatchService.assignAmbulance` using a `prisma.$transaction`:

1. Read the emergency (must be dispatchable).
2. Atomic `tx.ambulance.updateMany({ where: { id, status: "AVAILABLE" },
   data: { status: "RESERVED" } })`. Only one concurrent transaction
   can update the row; the loser sees `count === 0` and is rejected.
3. Cancel any non-terminal prior assignments.
4. Create the `DispatchAssignment` row.
5. Drive the emergency forward (`PENDING → DISPATCHING → ASSIGNED`).
6. Create the `Trip` (or repoint it on reassignment).
7. Write the audit log inside the same transaction.

If the transaction throws, every change is rolled back — no ambulance
can end up `RESERVED` without a corresponding assignment.

---

## Deployment (Render / Fly / Railway)

1. Push the repo to GitHub.
2. Create a new Web Service on Render.
3. **Build command:** `npm install && npx prisma generate && npm run build`
4. **Start command:** `npx prisma migrate deploy && npm start`
5. Provision a managed PostgreSQL database and put its connection
   string in `DATABASE_URL`.
6. Fill the rest of the env vars in the Render dashboard.
7. Configure the Stripe webhook to point at the public URL.

A `GET /api/v1/health` endpoint is exposed for uptime checks.

---

## Postman Collection

`docs/postman/emergency-ambulance-dispatch.postman_collection.json`
contains every endpoint with example bodies, environment variables, and
auth headers. The `Login` request sets `accessToken` and `refreshToken`
automatically; subsequent requests use `{{accessToken}}`.

---

## Testing

```bash
npm test
```

Currently included:

- `tests/distance.test.ts` — Haversine + proximity sort.
- `tests/pagination.test.ts` — page/limit/sort whitelist.
- `tests/stateMachine.test.ts` — emergency, trip, ambulance transitions.
- `tests/validation.test.ts` — Zod schemas + priority suggester.
- `tests/http.test.ts` — `AppError`, `catchAsync`, `sendResponse`.
- `tests/webhook.test.ts` — Stripe signature verification.

28 tests, all passing.

---

## Known Limitations

- **No social login** — by design, to keep the auth surface small and
  demonstrable.
- **No Redis** — the database is the source of truth. Redis would be
  a cache/optimisation layer, not a dependency.
- **No real-time updates** — the API is REST-only. The `Ambulance`
  status is updated synchronously by the dispatcher, which the spec
  explicitly accepts.
- **Multer/Cloudinary file uploads** — out of scope for this build.
  Driver and ambulance documents would slot in as a separate module.

---

## ER Diagram (text)

```
                ┌──────────┐
                │   User   │
                └────┬─────┘
       ┌─────────────┼─────────────┬─────────────┐
       │             │             │             │
       v             v             v             v
   Profile      RefreshToken   EmergencyReq    Payment
                                  │
                          ┌───────┴───────┐
                          │               │
                  StatusHistory   DispatchAssignment
                                          │
                                          v
                                       Ambulance
                                          │
                                  ┌───────┴───────┐
                                  │               │
                                Driver           Trip
                                                  │
                                            ┌─────┴─────┐
                                            │           │
                                         Hospital    Payment
```

---

## License

ISC.
