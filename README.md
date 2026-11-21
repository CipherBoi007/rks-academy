# RKS Academy

A management system for **Raja Kumaran Sethupathi Sports Academy, Ramanathapuram**, a multi-court badminton academy. It runs the day-to-day of the academy:
- players, batches, courts and coaches
- attendance and skill progress
- calendar-month fees with receipts
- WhatsApp fee reminders
- the RKS Pro Shop
- a separate app where **families** follow their players: parents and guardians for children, adults for themselves

This README is the developer guide. It explains what the system does, how every part fits together, and the non-obvious decisions behind it: authentication, the proxy, the database schema, free-tier hosting and the WhatsApp setup. Read it top to bottom once; after that, use the table of contents.

| Part | Stack |
|---|---|
| `backend/` | Spring Boot 3.5 · Java 21 · Maven · Spring Data JPA · Spring Security (JWT) · Flyway · springdoc (Swagger UI) |
| `frontend/` | Next.js 15 (App Router) · TypeScript (strict) · Tailwind CSS · TanStack Query · React Hook Form + Zod · lucide-react |
| Database | PostgreSQL 15+. Locally: database `rks_db`. Hosted: Supabase. |
| Hosting | Vercel (web) + Render (API) + Supabase (database), or one server with Docker Compose |

---

## Table of contents

1. [Who uses it and what they can do](#1-who-uses-it-and-what-they-can-do)
2. [Architecture at a glance](#2-architecture-at-a-glance)
3. [Repository layout](#3-repository-layout)
4. [Local development](#4-local-development)
5. [How a request travels through the system](#5-how-a-request-travels-through-the-system)
6. [Authentication and sessions](#6-authentication-and-sessions)
7. [Roles and permissions](#7-roles-and-permissions)
8. [Backend guide](#8-backend-guide)
9. [API reference (overview)](#9-api-reference-overview)
10. [Database](#10-database)
11. [Business rules: billing](#11-business-rules-billing)
12. [Fee reminders and WhatsApp](#12-fee-reminders-and-whatsapp)
13. [The family app (parents and adult players)](#13-the-family-app-parents-and-adult-players)
14. [The shop and advertisements](#14-the-shop-and-advertisements)
15. [Image uploads](#15-image-uploads)
16. [Frontend guide](#16-frontend-guide)
17. [Configuration reference](#17-configuration-reference)
18. [Testing](#18-testing)
19. [Deployment](#19-deployment)
20. [Keeping free tiers awake, and backups](#20-keeping-free-tiers-awake-and-backups)
21. [Security model](#21-security-model)
22. [Operations runbook](#22-operations-runbook)
23. [Troubleshooting](#23-troubleshooting)
24. [Rules for contributors](#24-rules-for-contributors)
25. [Glossary](#25-glossary)
26. [Other documents](#26-other-documents)

---

## 1. Who uses it and what they can do

There are three kinds of user, in two separate apps.

| User | App | Signs in with | Can do |
|---|---|---|---|
| **Owner** | Staff app (`/`) | Mobile + PIN | Everything: players, fees, payments, fee structure, courts, batches, coaches, staff logins, shop, exports, WhatsApp settings |
| **Coach** | Staff app (`/`) | Mobile + PIN | View players, batches and the shop; take attendance; update skill scores. **Never sees fee amounts**, only a PAID/DUE chip. |
| **Parent** | Family app (`/family`) | Mobile + one-time code sent on WhatsApp | Read-only view of *their own* children: batch, attendance, skills, fees due, fee history, receipts; browse the shop |

**Main screens in the staff app**

| Screen | Path | What it does |
|---|---|---|
| Dashboard | `/dashboard` | Today's courts and batches, collections, dues, payment-mode split, recent payments |
| Players | `/players`, `/players/[id]` | List, search, filter, add or edit a player; the profile shows info, attendance heatmap, skills and fee timeline |
| Attendance | `/attendance` | Mark a batch present or absent for a day |
| Fees | `/fees` | Dues, record a payment (with a quote preview), receipts, void, send reminders, CSV export |
| Fee structure | `/fee-structure` | Fee plans (Monthly, Quarterly, …) and the fee policy (late fee, sibling discount, registration fee) |
| Store | `/store`, `/store/[id]` | The RKS Pro Shop: products, photos, specs, options, offers and ads |
| Settings | `/settings` | Staff logins, courts and batches, coaches, WhatsApp status and test |
| Receipts | `/receipts/[yy]/[n]` | Printable receipt |
| Change PIN | `/change-pin` | Forced on first sign-in with a one-time PIN |

The word **"Student" is never used** anywhere: in the UI, the code or the database. The terms are **Player, Coach, Batch and Court**.

---

## 2. Architecture at a glance

### Local development

```
Browser ──▶ Next.js dev server :3000 ──(server-side fetch)──▶ Spring Boot :8080 ──▶ PostgreSQL :5432 (rks_db)
            pages + /api/* route handlers                     REST API /api/v1           schema "public"
```

### Hosted (Vercel + Render + Supabase)

```
Parents & staff
      │ HTTPS
      ▼
Vercel (Next.js, region sin1)           holds the session cookies (httpOnly); proxies /api/v1/*
      │ HTTPS + Authorization: Bearer <JWT> + X-RKS-Proxy-Key
      ▼
Render (Spring Boot API, Singapore)     answers only requests carrying the proxy key
      │ JDBC over TLS (Supabase session pooler, port 5432)
      ▼
Supabase (PostgreSQL, Singapore)        all data + uploaded photos, in schema "rks"

cron-job.org ──every 14 min──▶ Render /actuator/health     (keeps Render awake; also touches the database)
GitHub Actions ──every 3 days──▶ Supabase query + encrypted backup (keeps Supabase awake)
Render API ──▶ graph.facebook.com (WhatsApp Cloud API)    (fee reminders only)
```

### Three ideas to keep in mind

1. **The browser never talks to the API directly, and never sees a token.** The browser only calls the Next.js app on its own domain. Next.js keeps the JWT in an **httpOnly cookie** and forwards each API call server-side, adding `Authorization: Bearer <token>`. See [section 5](#5-how-a-request-travels-through-the-system).
2. **The API trusts the database, not the token.** On every request, the API looks the user up again: role, active status, session version, and whether a parent still has active children. Revoking access therefore takes effect immediately. See [section 6](#6-authentication-and-sessions).
3. **Business dates are Asia/Kolkata calendar dates, and money is exact.** One `Clock` bean is the only source of "now". Money is `NUMERIC(10,2)` in the database and `BigDecimal` in Java, in INR.

---

## 3. Repository layout

```
RKS/
├── README.md                 ← this guide
├── DESIGN.md                 ← visual design: tokens, fonts, components, screen-by-screen notes
├── PLAN.md                   ← original implementation plan: data model, rules, API list, decisions
├── render.yaml               ← Render Blueprint for the API (optional; manual setup also works)
├── .github/workflows/
│   ├── keep-db-awake.yml     ← every 3 days: light query + optional encrypted backup (Supabase)
│   └── keep-api-awake.yml    ← every 14 min ping (opt-in; for public repos only)
├── deploy/
│   ├── HOSTED.md             ← step-by-step: Vercel + Render + Supabase + WhatsApp (Meta)
│   ├── README.md             ← alternative: one server with Docker Compose + Caddy (HTTPS)
│   ├── make-env.ps1          ← asks a few questions, writes every env value ready to paste
│   ├── secrets/              ← output of make-env.ps1 (git-ignored; contains passwords)
│   ├── docker-compose.prod.yml, Caddyfile, backup.sh, restore.sh, .env.example
├── design-ref/               ← the original design screenshots
├── backend/
│   ├── Dockerfile            ← multi-stage build; small JRE image sized for 512 MB hosts
│   ├── pom.xml
│   └── src/
│       ├── main/java/in/rks/academy/   ← packages by feature (see section 8)
│       ├── main/resources/
│       │   ├── application.yml         ← production-safe defaults; secrets come from env
│       │   ├── application-dev.yml     ← dev profile: demo data, dev logins, demo date
│       │   └── db/migration/           ← Flyway V1…V6 (schema, reference data)
│       │       db/demo/                ← V2_1…V2_5 demo data (dev profile only)
│       └── test/java/…                 ← unit tests + ApiIT (integration)
└── frontend/
    ├── Dockerfile, next.config.ts, vercel.json, tailwind.config.ts
    ├── e2e/                  ← Playwright tests (app, family, owner tools, responsive)
    ├── public/               ← brand assets, demo product images (/demo), fonts
    └── src/
        ├── middleware.ts     ← redirects signed-out users to the right sign-in page
        ├── app/
        │   ├── (auth)/login/            staff sign-in
        │   ├── (app)/…                  staff app: dashboard, players, attendance, fees, …
        │   ├── family/login/            parent sign-in (WhatsApp code)
        │   ├── family/(portal)/…        family app: home, child, shop
        │   ├── receipts/, family/receipts/   printable receipts
        │   ├── change-pin/
        │   └── api/
        │       ├── auth/{login,logout,change-pin}/   staff session cookie handlers
        │       ├── family-auth/{verify,logout}/      family session cookie handlers
        │       └── v1/[...path]/                     the same-origin proxy to the API
        ├── components/ui/      generic building blocks (Button, Card, Sheet, Field, Chip, …)
        ├── components/domain/  app-specific pieces (profile, ReceiptView, ProductAd, sheets/, settings/)
        ├── components/shell/   staff app frame (Sidebar, TopBar, BottomNav)
        ├── components/family/  family app frame (FamilyShell)
        └── lib/                api client, query hooks, types, formatting, theme, images, server/session
```

---

## 4. Local development

### Prerequisites

| Tool | Version | Check |
|---|---|---|
| PostgreSQL (with pgAdmin, optional) | 15+ | `psql --version` |
| JDK | 21 | `java -version` |
| Maven | 3.9+ | `mvn -v` |
| Node.js | 20+ (22 recommended) | `node -v` |

Docker is **not** needed for local development.

### Step 1: database

Create it once, in pgAdmin or psql:

```sql
CREATE DATABASE rks_db;
```

The dev profile connects as `postgres` / `root` on `localhost:5432`. Override this with `DB_URL`, `DB_USERNAME` and `DB_PASSWORD`. **You never create tables by hand**: Flyway creates them, and loads the demo data, the first time the API starts.

### Step 2: API on <http://localhost:8080>

```bash
cd backend
SPRING_PROFILES_ACTIVE=dev mvn spring-boot:run
```

PowerShell: `$env:SPRING_PROFILES_ACTIVE="dev"; mvn spring-boot:run`

- Swagger UI: <http://localhost:8080/swagger-ui.html> (dev only). Call `POST /api/v1/auth/login`, then click **Authorize** and paste the token.
- Health: <http://localhost:8080/actuator/health>.

### Step 3: web app on <http://localhost:3000>

```bash
cd frontend
cp .env.example .env.local     # BACKEND_URL=http://localhost:8080
npm install
npm run dev
```

### Dev-only logins

> ⚠️ These exist **only in the `dev` profile**. They are seeded from `db/demo`, which Flyway loads only when `dev` is active. Production never has them.

| Role | Mobile | PIN |
|---|---|---|
| Owner (R. Sethupathi) | `9000000000` | `123456` |
| Coach (S. Divya) | `9000000001` | `123456` |
| Coach (M. Anand) | `9000000002` | `123456` |

**Family app in dev:** open `/family/login` and enter `9000000101` (Aravind Murugan's parent). For a family with two children use `9000020001`; for three, use `9000020002`. In dev, WhatsApp only logs messages, so **the sign-in screen shows the code** for you to type in.

### The demo date

The `dev` profile pins the business date to **2026-11-05** (`APP_DEMO_DATE` in `application-dev.yml`). The seeded data therefore reproduces the design screenshots: ₹66,900 from 12 payments, 9 players due, 79% via UPI.
- Only the calendar date is pinned; the time of day is real, so batches move from upcoming to done during the day.
- Set `APP_DEMO_DATE=` (empty) to use today's date with the demo data.
- **Outside `dev` the variable is ignored**: production always uses today's date in Asia/Kolkata. This lives in `config/ClockConfig.java`.

### Resetting the dev database

```sql
DROP DATABASE rks_db; CREATE DATABASE rks_db;
```

Restart the API and Flyway re-creates and re-seeds everything.

---

## 5. How a request travels through the system

Example: the owner opens a player's profile, which calls `GET /api/v1/players/42`.

```
1. Browser          fetch("/api/v1/players/42")            same origin; the cookie rks_session goes along automatically
2. Next middleware  src/middleware.ts                       page routes only: no cookie → redirect to /login (API routes are skipped)
3. Route handler    src/app/api/v1/[...path]/route.ts
                    ├─ crossSite(): rejects non-GET requests whose Origin isn't this site (CSRF guard)
                    ├─ picks the cookie: rks_family for /api/v1/family/*, rks_session for everything else
                    ├─ builds headers: Authorization: Bearer <JWT>, X-RKS-Proxy-Key (if configured), content-type
                    └─ fetch(`${BACKEND_URL}/api/v1/players/42`)  ← server-side; the browser never sees the token
4. API filters      ProxyKeyFilter   → no or wrong X-RKS-Proxy-Key → 404 (only when APP_PROXY_KEY is set)
                    CORS             → only APP_FRONTEND_ORIGIN
                    JwtAuthFilter    → verifies the JWT, then re-reads the user from the database (section 6)
                    SecurityConfig   → URL rules, then @PreAuthorize on the controller/method
5. Controller       PlayerController.get(42)  → PlayerService (transaction) → repositories → PostgreSQL
6. Response         DTO record → JSON → back through the route handler (status, content-type, cache headers) → browser
```

**Why a proxy?**
- The token can live in an **httpOnly** cookie, which page scripts can never read.
- The API needs **no CORS** for the browser.
- The API can stay private, on a private network or behind a shared key.

**Sign-in and sign-out don't go through the generic proxy**, because they have to set or clear cookies. They use dedicated route handlers:

| Route handler | Calls | Cookie |
|---|---|---|
| `POST /api/auth/login` | `POST /api/v1/auth/login` | sets `rks_session` |
| `POST /api/auth/change-pin` | `POST /api/v1/auth/change-pin` | replaces `rks_session` (new session version) |
| `POST /api/auth/logout` | none | clears `rks_session` |
| `POST /api/family-auth/login` | `POST /api/v1/family/auth/login` | sets `rks_family` (not for a one-time PIN) |
| `POST /api/family-auth/set-pin` | `POST /api/v1/family/auth/set-pin` | sets or replaces `rks_family` |
| `POST /api/family-auth/logout` | none | clears `rks_family` |

**Cookie settings:** `httpOnly`, `SameSite=Lax`, `Secure` in production, `path=/`. Each expires with its token.

---

## 6. Authentication and sessions

### Staff (owner, coach): mobile + PIN

1. `POST /api/v1/auth/login` with `{ mobile, pin }`. The mobile is 10 digits; the PIN is **6 to 12 digits**, stored hashed (BCrypt).
2. **Lockout:** after **5 wrong PINs** a mobile number is locked for **5 minutes** (`LoginAttemptLimiter`). It counts per mobile number, not per IP, so the proxy hiding client IPs doesn't weaken it.
3. On success the API returns a JWT. `sub` is the user id, `tv` is the user's **token version**, and the token is signed with `APP_JWT_SECRET` and lasts `APP_JWT_TTL` (default 12h).
4. **Forced PIN change:** new logins, PIN resets and the production owner setup all issue a **one-time PIN**. Until it is changed, the user only gets the authority `PIN_CHANGE_REQUIRED`, so only `GET /auth/me` and `POST /auth/change-pin` work. The UI sends them to `/change-pin`.
5. **PIN length is 6 to 12 digits.** One-time PINs are 6 digits.
   - A PIN set **before** the 6-digit minimum (4 or 5 digits) still signs in **once**. The API then sets `must_change_pin`, so the user has to choose a new 6–12 digit PIN before anything else works. Nobody is locked out by the rule change.
6. **Weak PINs are refused** when a user picks one (`PinPolicy`): one digit repeated (`111111`), straight sequences (`123456`, `987654`), and common patterns (`121212`, `112233`, `123123`, …). The dev seed uses `123456` only because seeded PINs bypass that check (set by the dev-only migration `db/demo/V6_1`).

### Session revocation: the token version

Every `admin_user` and `family_account` row has a `token_version`. It is copied into the JWT as `tv`. On each request `JwtAuthFilter` compares the two, and a mismatch means the token is ignored.

The version is incremented when:
- the PIN is changed or reset
- a staff login is turned off
- a parent chooses **sign out everywhere**, changes their PIN, or the owner issues them a new one

So **one database update signs that person out of every device instantly**, without a token blacklist.

### Parents: mobile + PIN

Parents sign in like staff, with no message sent, so sign-in costs nothing however often the form is used. (Until V7 a code was sent on WhatsApp, which Meta bills per message.)

1. **The owner issues a one-time PIN** from the player's profile (**Family app → Create PIN / Reset PIN**): `POST /api/v1/players/{id}/family-login/pin`, owner only.
   - It creates the `family_account` for the player's contact mobile if needed, stores a **bcrypt hash** in `pin_hash`, sets `must_change_pin` and bumps `token_version` (signing the parent out everywhere).
   - The PIN is shown once. The owner passes it on in person, by phone, or with **Send from my WhatsApp** (opens the owner's own WhatsApp; nothing goes through the academy's paid number).
   - Everyone on one contact number shares one sign-in (brothers and sisters, or a parent who also plays), because it belongs to the mobile number. Reset PIN is also the fix for a forgotten PIN.
2. `POST /api/v1/family/auth/login` with `{ mobile, pin }`.
   - A wrong number and a wrong PIN get the same `401`, so nobody can probe which numbers are parents.
   - **5 wrong PINs in a row lock the number for 5 minutes** (`LoginAttemptLimiter`, kept apart from staff lockouts).
   - With a one-time PIN the answer is `{ mustChangePin: true }` and **no token**.
3. `POST /api/v1/family/auth/set-pin` with `{ mobile, currentPin, newPin }` replaces the PIN (6 to 12 digits, easy ones refused) and returns a family JWT: claim `kind: "family"`, subject = `parent_account.id`, lasting `APP_JWT_FAMILY_TTL` (default 30 days). The portal's **Change PIN** uses the same endpoint.
4. **Access is re-checked on every request:** the parent must still have **at least one active player** with that mobile number. Deactivating the child or changing the number ends access immediately.
5. **Dev only:** `db/demo/V7_1` gives every demo parent PIN `123456`.

### Staff and family are fully separate

- **Separate cookies:** `rks_session` and `rks_family`.
- **Separate token kinds:** a family token never grants a staff role, and the reverse is also true.
- **Separate API areas:** `/api/v1/family/**` requires `ROLE_PARENT`; everything else requires a staff role.
- **Ownership checks:** `FamilyService` checks ownership on every child and receipt. Anything that isn't the parent's own returns **404, not 403**, so its existence isn't revealed.

---

## 7. Roles and permissions

| Capability | Owner | Coach | Parent |
|---|:-:|:-:|:-:|
| Dashboard (collections, dues, payment split) | ✅ | ⚠️ no money figures | ❌ |
| Players: list, view profile | ✅ | ✅ | own children only |
| Players: add, edit, deactivate, photo | ✅ | ❌ | ❌ |
| Attendance: take or edit | ✅ | ✅ | view own children |
| Skills: update scores | ✅ | ✅ | view own children |
| Fee amounts, dues, payments, receipts | ✅ | ❌ (PAID/DUE chip only) | own children only |
| Record or void a payment | ✅ | ❌ | ❌ |
| Fee plans and fee policy | ✅ | ❌ | ❌ |
| Courts, batches, coaches | ✅ | view | ❌ |
| Staff logins | ✅ | ❌ | ❌ |
| Shop: view | ✅ | ✅ | ✅ (with offers) |
| Shop: edit, upload photos, choose ads | ✅ | ❌ | ❌ |
| **Shop advertisements shown** | ❌ | ❌ | ✅ **only here** |
| CSV exports | ✅ | ❌ | ❌ |
| WhatsApp settings, test, send reminders | ✅ | ❌ | ❌ |

These rules are enforced **in the API**, by `@PreAuthorize` on controllers and methods plus the URL rules in `SecurityConfig`. The UI only hides what the API would refuse anyway, using `OwnerOnly` and the nav filtering in `components/shell/nav.ts`. Any fee, payment, dues, policy, reminder or export endpoint returns **403** for a coach.

---

## 8. Backend guide

### Packages (`backend/src/main/java/in/rks/academy/`)

Code is grouped **by feature**, not by layer.

| Package | Responsibility | Key classes |
|---|---|---|
| `auth` | Staff sign-in, `/me`, PIN change | `AuthController`, `AuthService`, `PinPolicy`, `TemporaryPin` |
| `security` | Filters and security configuration | `SecurityConfig`, `JwtService`, `JwtAuthFilter`, `ProxyKeyFilter`, `LoginAttemptLimiter`, `CurrentUser` |
| `admin` | Staff logins (owner/coach accounts) | `AdminUser`, `StaffService`, `StaffController` |
| `player` | Players, profile, skills, level history, file endpoint | `Player`, `PlayerService`, `PlayerController` |
| `attendance` | Attendance records | `AttendanceService`, `AttendanceController` |
| `billing` | **All fee logic**: plans, policy, periods, quotes, payments, receipts, dues | `FeeRules` (pure), `BillingService`, `PaymentService`, `PolicyService`, `FeePlanService`, `ReceiptNumberGenerator` |
| `facility` | Courts, coaches and batches admin (overlap rules) | `FacilityService`, `FacilityController` |
| `court`, `coach`, `batch` | Their entities and repositories | |
| `dashboard` | Dashboard figures and today's courts | `DashboardService` |
| `product` | The shop: products, images, specs, variants, ads | `ProductService`, `ProductController` |
| `export` | CSV exports | `ExportService`, `Csv` |
| `notification` | Fee reminders and WhatsApp | `FeeReminderService`, `FeeReminderScheduler`, `WhatsAppSender` + `LogWhatsAppSender` / `CloudApiWhatsAppSender`, `WhatsAppSetupController` |
| `family` | Parent sign-in and the family API | `FamilyAuthService`, `FamilyService`, `FamilyController`, `ParentAccount` |
| `config` | Typed settings, clock, web config, public config | `AppProperties`, `ClockConfig`, `WebConfig`, `PublicConfigController` |
| `common` | Shared pieces | `ApiException`, `GlobalExceptionHandler`, `ApiError`, `PageResponse`, `FileStorageService`, `IndianRupeeWords` |
| `setup` | The one-time production owner setup | `OwnerSetupRunner` |

### Conventions

- **Controller → Service → Repository.**
  - **Controllers** are thin: validation (`@Valid`), mapping and authorization.
  - **Services** hold the logic and the transactions. A class-level `@Transactional(readOnly = true)` is the default, and each writing method adds its own `@Transactional`. **If you add a method that writes, give it `@Transactional`**, or PostgreSQL rejects the write with "read-only transaction".
  - **Repositories** are Spring Data JPA.
- **DTOs are Java records** (`*Dtos.java`). Entities never leave the service layer.
- **Pure rules are separated from I/O.** `billing/FeeRules` has no Spring or database code, which makes it easy to unit-test. Put new calculations there.
- **Errors:**
  - Throw `ApiException.badRequest / notFound / conflict / forbidden(...)` with a stable `code`.
  - `GlobalExceptionHandler` turns every error into one JSON shape:
    ```json
    { "status": 400, "code": "VALIDATION_FAILED", "message": "…",
      "fieldErrors": [{ "field": "mobile", "message": "Enter a 10-digit mobile number" }],
      "path": "/api/v1/players", "timestamp": "…" }
    ```
  - Stack traces and internal messages are never sent.
- **Time:** always `LocalDate.now(clock)` / `Instant.now(clock)` using the injected `Clock`, **never** `LocalDate.now()`. That keeps the demo date and the tests deterministic.
- **Money:** `BigDecimal` with scale 2, rounded to whole rupees where the rules say so. Never `double`.
- **Paging:** list endpoints return `PageResponse<T>`: `{ content, page, size, totalElements, totalPages }`.

### Profiles

| Profile | When | What it changes |
|---|---|---|
| *(none)* | Production | Production-safe defaults. Required secrets must be set (`APP_JWT_SECRET`, `DB_PASSWORD`), API docs are off, no demo data, real date |
| `dev` | Local development | Adds the `db/demo` migrations (demo data and dev logins), pins `APP_DEMO_DATE`, turns Swagger on, shows family codes on screen, uses throwaway secrets, logs `DEBUG` |

**Never set `SPRING_PROFILES_ACTIVE=dev` on a server.**

### The one-time owner setup

Production has **no seeded logins**. Create the first owner once:

```bash
java -jar target/rks-academy.jar --setup-owner --name="R. Sethupathi" --mobile=9XXXXXXXXX --server.port=0
```

- It prints a random one-time PIN and exits.
- It refuses if an owner already exists.
- `--server.port=0` avoids clashing with anything already on port 8080.

On Render, where there is no shell, run it **from your PC** against the hosted database. `deploy/make-env.ps1` writes a ready-made `create-owner.cmd` for this.

---

## 9. API reference (overview)

All endpoints are under `/api/v1`, JSON in and out. The full, live list is in Swagger UI in dev: <http://localhost:8080/swagger-ui.html>.

| Area | Endpoints | Who |
|---|---|---|
| Auth | `POST /auth/login`, `GET /auth/me`, `POST /auth/change-pin` | public / any staff |
| Public config | `GET /config/public`: academy name, WhatsApp number, today's date | public |
| Dashboard | `GET /dashboard/summary`, `GET /dashboard/today-courts` | staff (money figures owner only) |
| Players | `GET/POST /players`, `GET/PUT/DELETE /players/{id}`, `POST/DELETE /players/{id}/photo`, `GET /players/{id}/attendance`, `GET /players/{id}/progress`, `PUT /players/{id}/skills` | owner; coach read + skills |
| Files | `GET /files/{players\|products}/{name}` | signed-in |
| Attendance | `GET /attendance`, `POST /attendance` | staff |
| Payments | `GET /payments`, `GET /payments/summary`, `POST /payments/quote`, `POST /payments`, `POST /payments/{id}/void`, `GET /receipts/{yy}/{n}`, `GET /dues`, `GET /players/{id}/payments` | owner |
| Fee structure | `GET/POST /fee-plans`, `GET/PUT/DELETE /fee-plans/{id}`, `GET/PUT /fee-policy` | owner |
| Facilities | `GET/POST /courts`, `PUT /courts/{id}`, `GET/POST /coaches`, `PUT /coaches/{id}`, `GET/POST /batches`, `PUT /batches/{id}` | owner (reads also staff) |
| Staff logins | `GET/POST /staff`, `PUT /staff/{id}`, `POST /staff/{id}/reset-pin` | owner |
| Shop | `GET/POST /products`, `GET/PUT/DELETE /products/{id}`, `POST /products/{id}/restore`, `GET /products/{id}/related`, `POST /products/images` | owner edits; staff read |
| Exports | `GET /exports/{payments,dues,players,attendance}.csv` | owner |
| Reminders | `POST /notifications/fee-reminders` (send now), `GET …` (log), `GET …/status` | owner |
| WhatsApp | `GET /notifications/whatsapp` (status), `POST /notifications/whatsapp/test` | owner |
| Family | `POST /family/auth/login`, `POST /family/auth/set-pin`, `GET /family/me`, `POST /family/sign-out-everywhere`, `GET /family/children/{id}` (+ `/attendance`, `/progress`, `/payments`, `/due`), `GET /family/receipts/{yy}/{n}`, `GET /family/shop/products` (+ `/{id}`, `/{id}/related`), `GET /family/shop/ads` | parent |
| Health | `GET /actuator/health` (outside `/api`; no proxy key needed) | public |

---

## 10. Database

### Migrations (Flyway)

The schema is created and evolved **only** by Flyway scripts, which run automatically when the API starts.

| Script | What it does |
|---|---|
| `db/migration/V1__schema.sql` | All core tables: courts, coaches, staff, batches, fee plans and policy, players, skills, level history, attendance, payments, receipt numbers, products |
| `V2__reference_data.sql` | Reference data every install needs: skills, the default fee policy and plans |
| `V3__fee_reminders.sql` | `fee_reminder`: one row per player per billing period |
| `V4__admin_and_voids.sql` | Staff-login columns (token version, forced PIN change) and payment voids |
| `V5__family_portal.sql` | `parent_account`, `login_code` |
| `V7__family_pins.sql` | parent PINs (`pin_hash`, `must_change_pin`); drops `login_code` |
| `V8__payment_reports.sql` | `payment_report`, `payment_report_item`: UPI payments families report, confirmed or rejected by the owner |
| `V9__player_contacts.sql` | `player.parent_*` becomes `contact_*` plus `contact_relation` (SELF, PARENT, GUARDIAN); `parent_account` becomes `family_account` |
| `V10__drop_occupation_and_school.sql` | drops `player.contact_occupation` and `player.school`: never used, so not collected |
| `V6__stored_files_and_rls.sql` | `stored_file` (uploaded images), and **row-level security switched on** for every table |
| `db/demo/V2_1 … V2_5` | **Dev only:** demo staff logins, players, payments, attendance, products |
| `db/demo/V6_1` | **Dev only:** moves the demo logins' PIN from `1234` to `123456` (PINs became 6–12 digits) |

**Tables:** `court`, `coach`, `admin_user`, `batch`, `fee_plan`, `fee_plan_perk`, `fee_policy`, `player`, `player_level_history`, `player_skill`, `attendance_record`, `payment`, `receipt_sequence`, `product`, `product_image`, `product_spec`, `product_variant`, `fee_reminder`, `parent_account`, `stored_file`, plus Flyway's own `flyway_schema_history`.

**Rules for migrations:**
- **Never edit a migration that has run anywhere.** Flyway checksums every script and refuses to start if one changes. Add a new `V7__what_it_does.sql` instead.
- The JPA setting `ddl-auto: validate` means Hibernate **checks** that entities match the tables but never changes the schema. Update the entity and add a migration together.
- Demo data goes in `db/demo` with a version between the real ones (for example `V2_6__…`), so it only loads in `dev`.

### The schema: `public` locally, `rks` when hosted

`DB_SCHEMA` (default `public`) decides which PostgreSQL schema holds the app's tables. It sets three things together:
- Flyway's schema, which is created if missing and also holds `flyway_schema_history`
- the connection's `search_path`, through Hikari
- Hibernate's default schema

**On Supabase we use `DB_SCHEMA=rks`.** Supabase keeps its own objects in `public`, and Flyway refuses to start in a non-empty schema that it didn't create. The error looks like: *"Found non-empty schema(s) "public" but no schema history table"*. Never "fix" that with `baselineOnMigrate`: it would mark the migrations as applied without creating the tables. A separate schema also keeps the tables out of Supabase's Data API, which only publishes `public`.

### Row-level security (V6)

Supabase can publish tables over HTTP to anyone holding the project's public "anon" key. As a second lock:
- V6 enables **row-level security with no policies** on every table, so those API roles see nothing.
- The application connects as the **table owner**, and RLS doesn't apply to owners, so the app is unaffected.
- On plain PostgreSQL this changes nothing.
- `flyway_schema_history` is skipped: Flyway locks it while migrating, so altering it would wait forever.

### Money, time and IDs

- Money: `NUMERIC(10,2)`, INR.
- Timestamps: `TIMESTAMPTZ`. Business dates are `DATE`, as Asia/Kolkata calendar dates. Hibernate's JDBC time zone is Asia/Kolkata.
- Receipt numbers look like `RKS/26/1007` and come from `receipt_sequence`: per year, gap-free, and safe under concurrent payments.

### Connections

`DB_POOL_SIZE` sets the Hikari pool, default 10. **Keep it at 5 or below on Supabase's free tier**, where the session pooler caps connections.

---

## 11. Business rules: billing

Billing logic lives in `billing/FeeRules` (pure and unit-tested) and the billing services.

- **Calendar-month billing.** Every billing period starts on the **1st** of a month.
  - A player who joins mid-month pays the **full** plan for the joining month.
  - Quarterly and annual periods also start on the 1st of the joining month.
- **Fee plans:** Monthly, Quarterly, Annual, and anything else the owner defines. Each plan has a price, a length in months, and optional perks.
- **Dues.** A player is due when no payment covers the start of their current period. "Days overdue" counts from the period start, or from the join date if that's later.
- **Late fee** (from the policy): ₹100 from the **11th** of the period's first month, then ₹10 per day, capped at ₹300. The **joining month is exempt**.
- **Sibling discount**, applied automatically by join order among active siblings: **10% for the 2nd child, 15% for the 3rd and later**.
- **Registration fee:** charged on a player's **first** payment only.
- **Policy versioning.** When the owner edits the policy, the change takes effect on the **1st of next month**, and the current cycle keeps its terms. Old versions are kept for history.
- **Quotes.** `POST /payments/quote` shows the full breakdown before saving: plan, discount, late fee, registration and total. The same code computes the quote and the saved payment.
- **Amount override** at the desk is allowed. The difference is stored as an adjustment, a reason is **required**, and it is printed on the receipt.
- **Voiding a payment** requires a reason:
  - The payment stays on record with its receipt marked **VOID**.
  - It stops counting in totals.
  - The period becomes due again.
  - Voided payments never show in "recent payments".
- **Receipts** are numbered per year without gaps and show the amount in words: "Rupees One Thousand Five Hundred Only", from `IndianRupeeWords`.

---

## 12. Fee reminders and WhatsApp

### What is sent, and when

At **09:00 IST on the 1st of every month** (`APP_REMINDERS_CRON`, default `0 0 9 1 * *`), the API sends a WhatsApp message to the parent of every **active player whose new billing period starts this month and isn't paid yet**. Players who prepaid, or who are mid-way through a quarterly or annual period, get nothing.

> Vanakkam K. Murugan! Fee reminder from RKS Academy for Aravind Murugan (RKS101): Monthly plan for Nov 2026 is ₹1,500. Please pay by 10 Nov 2026 to avoid a late fee. Thank you!

- **Never twice.** Each player is reminded at most once per billing period (`fee_reminder` has one row per player and period). Running the job again only retries failed sends.
- **On demand:** the owner can send outstanding reminders from **Fees → Send now** (`POST /notifications/fee-reminders`).
- **Catch-up after downtime.** If the API was asleep or restarting at 09:00 on the 1st, `FeeReminderScheduler.catchUpAfterStart()` sends the reminders when the API next starts. It only does this on the **1st–3rd**, between **09:00 and 20:00 IST**, and only if nothing was sent for that month yet. It never runs at night and never doubles up.

### Providers (`APP_WHATSAPP_PROVIDER`)

| Provider | What happens | Use |
|---|---|---|
| `log` (default) | Each message is **recorded as sent and written to the log**; nobody is contacted | development, and production before Meta is set up |
| `cloud` | Sent through the **WhatsApp Business Cloud API** (`graph.facebook.com/v23.0/{phone-number-id}/messages`) using approved templates | live |

> ⚠️ **Keep `APP_REMINDERS_ENABLED=false` until WhatsApp is live.** In `log` mode a month's reminders are recorded as "sent", so switching to `cloud` later won't send that month again.

### Templates (must be approved in Meta's WhatsApp Manager)

| Name | Category | Language | Body | Parameters |
|---|---|---|---|---|
| `fee_reminder` | Utility | English (`en`) | `Vanakkam {{1}}! Fee reminder from RKS Academy for {{2}} ({{3}}): {{4}} plan for {{5}} is {{6}}. Please pay by {{7}} to avoid a late fee. Thank you!` | parent name, player name, player ID, plan, period, amount, pay-by date |

Choose **English (`en`)**, not "English (US)" (`en_US`). The app sends language code `en` (`APP_WHATSAPP_TEMPLATE_LANG`).

When Meta rejects a message, the app stores and shows Meta's exact error, for example `(#132001) Template name does not exist`. **Settings → WhatsApp** shows the current mode and can send a test message. The full Meta setup, from creating accounts to going live, is in [deploy/HOSTED.md §8](deploy/HOSTED.md#8-whatsapp-meta-from-zero).

---

## 13. The family app (parents and adult players)

**Who signs in.** Every player has one **contact** who manages their account (`player.contact_relation`):

| Relation | Who | Rules |
|---|---|---|
| `PARENT` / `GUARDIAN` | a child's parent or guardian | their name is required |
| `SELF` | the player themselves | 18 or over only (`MINOR_NEEDS_GUARDIAN` otherwise); the contact name is always the player's own |

The contact's mobile number is the family-app sign-in, fee reminders go to it, and receipts say "Received from" the contact. Everyone on one number shares one `family_account`, so a parent who also plays sees themselves (marked **You**) and their children in one app, with one Fees page and one UPI payment. Sibling discounts stay explicit (**Sibling at RKS** on the player form), so an adult and their child sharing a number are never treated as siblings.


Path: **`/family`**. Its own frame (`FamilyShell`): a light header, a two-tab bar (Home, Shop) on phones, and a wide layout on desktop.

| Page | Shows |
|---|---|
| `/family/login` | Two steps: mobile number, then the 6-digit WhatsApp code |
| `/family` (home) | Greeting; a summary (players, fees paid or due, average attendance); the shop offer banner; one card per child |
| `/family/child/[id]` | Read-only profile: info, attendance heatmap, skill progress, fee timeline with receipt links, an offer strip |
| `/family/shop`, `/family/shop/[id]` | The shop with academy prices and an "Enquire on WhatsApp" button |
| `/family/receipts/[yy]/[n]` | Printable receipt (own children only) |

**Home page layout**

| Screen | Layout |
|---|---|
| Phone | One column. Each child card shows the name and the blue batch card. **"Show attendance & fees"** opens it to reveal court and coach, attendance, fee status and the progress button. |
| Tablet and up (≥768px) | Cards are always fully open, with a "View progress" button in the card header |
| Desktop (≥1024px) | Children on the left, a sticky help-and-shop panel on the right |
| Very wide (≥1760px) | Two children per row |

**Parents can never see** other players, academy totals, coaches' data, or any edit control.

---

## 14. The shop and advertisements

- The owner manages products in **Store**: brand, category, price and MRP, photos (up to 8), specs, options/variants, rating and an optional **offer** (headline, highlight, copy, banner image, placement).
- **Advertisements appear only in the family app**, never to owners or coaches. This is a firm product rule. They come in three variants, all in `components/domain/ProductAd.tsx`:
  - **hero**: the big navy banner on the family home
  - **inline**: a card on the family shop page
  - **strip**: a dismissible bar on the child page. A dismissal is remembered for the browser session (`sessionStorage` key `rks:ad:{variant}:{id}`).
- Shop pages link to `/family/shop/{id}`. "Enquire on WhatsApp" opens `wa.me/{APP_WHATSAPP_NUMBER}` with a pre-filled message. **There's no online payment**: purchases happen at the academy.
- Demo product images are static files in `frontend/public/demo/`. Images the owner uploads are stored in the database (next section).

---

## 15. Image uploads

There are product photos (shop) and player photos. By design, players are shown with an **initials avatar**, but the upload exists.

1. **The browser shrinks the image first** (`frontend/src/lib/images.ts`, `prepareImage`):
   - It accepts JPG, PNG or WebP up to 25 MB, so straight from a phone camera is fine.
   - It scales to at most **1600px** on the longest side (product and banner images) or **800px** (player photos). It never enlarges.
   - It re-encodes as **WebP** at quality 0.82, falling back to **JPEG** with a white background where the browser can't write WebP.
   - It keeps the photo's orientation, and **removes embedded metadata such as GPS location**.
   - Typical result: a 4000×3000, ~7 MB photo becomes 1600×1200, ~250 KB.
2. **The API checks it again** (`FileStorageService`): the declared type, ≤ 2 MB, and the **magic bytes** (a renamed non-image is rejected). It then stores it under a random name.
3. **It is stored in PostgreSQL, in table `stored_file`** (`kind`, `name`, `content_type`, `data BYTEA`):
   - Hosts like Render **wipe their disk on every redeploy**, so files on disk would vanish.
   - Database backups automatically include the images.
4. **It is served from** `/api/v1/files/{players|products}/{name}`, to signed-in users only, with `Cache-Control: private, max-age=30 days, immutable` (names never repeat).
5. **Replacing or removing** an image deletes its row.

Because uploaded images sit behind the authenticated proxy, `next/image` renders them with `unoptimized` (`isUpload()` in `lib/images.ts`). The Next.js optimiser can't fetch them without the user's cookie.

**Capacity:** Supabase's free tier allows a 500 MB database, which is roughly a few thousand resized photos alongside the data. If that ever becomes too small, all storage code is in `FileStorageService` and could move to object storage (Supabase Storage, S3 or Cloudinary) without touching anything else.

---

## 16. Frontend guide

### Routing (App Router)

- Route groups: `(auth)` is the staff sign-in, `(app)` is the staff app (wrapped by `AppShell`), and `family/(portal)` is the family app (wrapped by `FamilyShell`).
- `src/middleware.ts` only redirects. A missing cookie sends you to the right sign-in page, and a signed-in user is kept off the sign-in page. **Real access control is the API's job.**
- Next.js 15 passes `params` as a Promise. Pages use `use(params)`.

### Data fetching

- **One API client:** `lib/api.ts` → `api<T>(path, { method, body })`.
  - It calls `/api/v1/...` (the proxy) and throws `ApiError` with the server's `code`, `message` and `fieldErrors`.
  - `errorMessage(e)` turns any error into a friendly sentence.
- **TanStack Query hooks:** `lib/queries.ts` (staff app) and `lib/family.ts` (family app). The query keys live in `keys` and `familyKeys`. After a mutation, invalidate the matching keys.
- **Every screen handles four states**, using `LoadingRegion` / `Skeleton`, `EmptyState` and `ErrorState` (with retry) from `components/ui/States.tsx`:
  - **loading:** skeletons, announced to screen readers
  - **empty**
  - **error:** with a retry button
  - **data**

### Forms

- React Hook Form + Zod.
- `applyServerErrors` (`lib/forms.ts`) maps the API's `fieldErrors` onto the form fields, so server validation shows next to the right input.
- Big forms open in a `Sheet` (`components/domain/sheets/`): a side panel on desktop and a bottom sheet on phones.

### Design system

- **All colours come from `src/lib/theme.ts`**, the single source, which feeds Tailwind.
  - primary `#1F3FBF`, accent `#FFE600`, alert `#F26A1B`, ink `#111111`, navy `#0F1B4D`, surface `#F4F6FB`
  - **Never hard-code a colour** in a component. Use the Tailwind classes (`bg-primary`, `text-alert-700`, …) or `alpha()`.
- **Fonts:** Oswald (display/headings, uppercase) and Inter (body). Both are self-hosted with `next/font/local`, so the build never needs Google Fonts.
- **Shared components:** `components/ui/` (Button with `buttonClass()`, Card, Chip/StatusChip/LevelChip, Field/Input/Select, Sheet, Toast, Pills, SegmentedTabs, KpiCard, Avatar, …). Extend these rather than restyling inline.
- Full visual spec: [DESIGN.md](DESIGN.md).

### Responsive rules (mobile-first)

- Build for a phone first, then add `sm:`, `md:`, `lg:`, `xl:` and `2xl:` layouts.
- **There must be no horizontal page scroll at any width.** The Playwright responsive test checks 360, 390, 768, 1024 and 1440px.
  - Grid children need `min-w-0` / `minmax(0,1fr)`.
  - Anything that scrolls sideways must be its own `overflow-x-auto relative` container.
- Tap targets are at least **44px** (`min-h-11`).
- The staff app uses a bottom tab bar on phones and a sidebar on desktop. The family app uses a bottom tab bar on phones and a header nav on desktop.

### Accessibility

- Semantic headings and landmarks.
- `aria-label` on icon-only buttons.
- `role="meter"` for attendance bars, and `aria-expanded` / `aria-controls` on the collapsible cards.
- Visible focus rings, and colour never used alone (chips also carry text).

### Security headers (production only, `next.config.ts`)

A strict Content-Security-Policy (only this site's own scripts, styles, images and API), HSTS, `X-Frame-Options: DENY`, `nosniff`, a referrer policy and a permissions policy. They are off in `next dev`, because hot reload needs `eval`.

---

## 17. Configuration reference

The backend reads **environment variables** (Spring doesn't read `.env` files by itself). `backend/.env.example` is the **local** example. For hosting, generate the values with `deploy/make-env.ps1` ([section 19](#19-deployment)).

### Backend

| Variable | Default | Notes |
|---|---|---|
| `SPRING_PROFILES_ACTIVE` | *(none)* | `dev` locally; **unset in production** |
| `DB_URL` | `jdbc:postgresql://localhost:5432/rks_db` | Supabase: `jdbc:postgresql://<session-pooler-host>:5432/postgres?sslmode=require` |
| `DB_USERNAME` / `DB_PASSWORD` | `postgres` / `root` in dev | Supabase user looks like `postgres.<project-ref>`. Password required outside dev. |
| `DB_SCHEMA` | `public` | **`rks` on Supabase** ([section 10](#the-schema-public-locally-rks-when-hosted)) |
| `DB_POOL_SIZE` | `10` | ≤ 5 on Supabase free |
| `APP_JWT_SECRET` | *(required outside dev)* | ≥ 32 random characters. Changing it signs everyone out. |
| `APP_JWT_TTL` / `APP_JWT_FAMILY_TTL` | `12h` / `30d` | Staff and family session length |
| `APP_FRONTEND_ORIGIN` | `http://localhost:3000` | The web app's address (CORS). Several can be separated with commas. |
| `APP_PROXY_KEY` | *(empty = off)* | **Set it whenever the API has a public URL** (Render). Every `/api` call must carry it in `X-RKS-Proxy-Key`. |
| `APP_WHATSAPP_NUMBER` | `910000000000` | **Placeholder.** The academy's WhatsApp number for "Enquire on WhatsApp": country code + number, digits only |
| `APP_ACADEMY_PHONE` | `+91 00000 00000` | Printed on receipts |
| `APP_UPI_ID` / `APP_UPI_PAYEE` | empty / `RKS Academy` | Where parents pay from the family app's Fees page (UPI link and QR). Empty shows "pay at the academy desk" |
| `APP_WHATSAPP_PROVIDER` | `log` | `log` or `cloud` |
| `APP_WHATSAPP_PHONE_NUMBER_ID` / `APP_WHATSAPP_ACCESS_TOKEN` | *(empty)* | Required for `cloud`; the API refuses to start without them |
| `APP_WHATSAPP_TEMPLATE` / `APP_WHATSAPP_TEMPLATE_LANG` | `fee_reminder` / `en` | Template name and language |
| `APP_WHATSAPP_API_URL` | `https://graph.facebook.com/v23.0` | Bump the version when Meta retires it |
| `APP_REMINDERS_ENABLED` / `APP_REMINDERS_CRON` | `true` / `0 0 9 1 * *` | The cron runs in Asia/Kolkata. Keep it `false` until WhatsApp is live. |
| `APP_API_DOCS` | `false` | Swagger outside dev (keep it off in production) |
| `APP_DEMO_DATE` | `2026-11-05` in dev | Read **only** under the `dev` profile |
| `JAVA_OPTS` | tuned for 512 MB (see `backend/Dockerfile`) | JVM flags in the Docker image |
| `PORT` | `8080` | Hosts like Render set it automatically |

### Frontend

| Variable | Default | Notes |
|---|---|---|
| `BACKEND_URL` | `http://localhost:8080` | Server-side only. The API's base address, without a trailing slash. |
| `BACKEND_PROXY_KEY` | *(empty)* | The same value as the API's `APP_PROXY_KEY` |

The frontend has **no `NEXT_PUBLIC_*` variables**: nothing secret or configurable is built into the browser bundle. The academy name, WhatsApp number and today's date come from `GET /api/v1/config/public` at runtime.

---

## 18. Testing

| Command | Covers |
|---|---|
| `cd backend && mvn verify` | **79 unit tests**: billing rules (calendar periods, late fee and cap, sibling ranking and discounts, policy versions, rounding), reminder service, WhatsApp client, PIN policy, rupees in words, lockout, proxy-key filter. **23 integration tests** (`ApiIT`): the whole app against a throwaway `rks_db_test` database on local PostgreSQL (created and wiped automatically by `TestDatabase`), driving the HTTP API end to end: auth, roles, players, payments, voids, receipts, exports, uploads, family isolation. |
| `cd frontend && npm run typecheck && npm run lint && npm test && npm run build` | TypeScript strict, ESLint with zero warnings, Vitest (formatting, dates, image sizing), production build |
| `cd frontend && npm run test:e2e` | **22 Playwright tests** against a running stack (see below): login, dashboard numbers, filters, profile, attendance, coach restrictions, payment and receipt, fee structure, store and ads, owner tools, the family app (sign-in, isolation, shop), and a responsive sweep at 360/390/768/1024/1440px (no horizontal scroll, 44px tab targets). Screenshots go to `frontend/e2e/.screens/`. |

**Running the browser tests:**
1. Drop and recreate `rks_db`. The tests expect the fresh demo data.
2. Start the API with `SPRING_PROFILES_ACTIVE=dev`.
3. Build and start the web app, or use `npm run dev`, which works but is slower on first page loads.
4. `npm run test:e2e`. If Playwright's Chromium download is blocked, use an installed browser: `E2E_CHANNEL=msedge npm run test:e2e` (or `chrome`).

Five wrong family PINs lock that number for 5 minutes (in memory, so restarting the API clears it).

---

## 19. Deployment

There are two supported ways to deploy:

| | **A. Hosted: Vercel + Render + Supabase** | **B. One server: Docker Compose** |
|---|---|---|
| Guide | [deploy/HOSTED.md](deploy/HOSTED.md) | [deploy/README.md](deploy/README.md) |
| Cost | Free tiers possible (with the keep-awake tricks); Vercel needs Pro for commercial use | One small VPS (~₹500–1,000/month) |
| HTTPS | automatic | automatic (Caddy) |
| API exposure | public URL, locked with the proxy key | private network; only Caddy is exposed |
| Backups | GitHub Actions (encrypted, 3 weeks) | nightly `pg_dump` + restore script |

### Hosted deployment in short (A)

1. **Push** the repository to a **private** GitHub repo.
2. **Supabase:**
   - Create a new project in **Singapore**, with a password of **letters and digits only**.
   - Turn **off** the Data API.
   - Copy the **Session pooler** URI. Not the direct connection, which is IPv6-only and Render can't reach it. Not the transaction pooler either, which breaks Java prepared statements.
3. **Generate every value:**
   ```cmd
   powershell -ExecutionPolicy Bypass -File D:\RKS\deploy\make-env.ps1
   ```
   It writes `deploy/secrets/`:
   - `render.env`
   - `vercel.env`
   - `github-secrets.txt`
   - `cron-job.txt`
   - `create-owner.cmd`
   - `keys.txt`, the master copy of the generated secrets

   Secrets are generated once and reused when you run it again.
4. **Render:**
   - New → Web Service: Docker, Root Directory `backend`, region **Singapore**, plan Free, Health Check Path `/actuator/health`.
   - Environment → **Add from .env**, then paste `render.env`.
   - It must include `DB_SCHEMA=rks`, `DB_POOL_SIZE=5`, `APP_PROXY_KEY`, `APP_JWT_SECRET`, and `APP_REMINDERS_ENABLED=false`.
5. **Owner login:** when Render shows **Live**, double-click `deploy/secrets/create-owner.cmd` and note the one-time PIN.
6. **Vercel:** import the repo with Root Directory `frontend`, paste `vercel.env` into Environment Variables, and deploy. `frontend/vercel.json` pins the functions to `sin1`.
7. **Run `make-env.ps1` again** with the real Vercel and Render addresses. Update `APP_FRONTEND_ORIGIN` on Render (and `BACKEND_URL` on Vercel if it changed).
8. **Keep-awake and backups:** see [section 20](#20-keeping-free-tiers-awake-and-backups).
9. **WhatsApp:** follow [HOSTED.md §8](deploy/HOSTED.md#8-whatsapp-meta-from-zero). Turn `APP_REMINDERS_ENABLED=true` on only once a test message arrives.

### What was changed to make the free tiers safe

| Problem | Fix |
|---|---|
| Render wipes its disk on redeploy and restart | Images are stored in the database (`stored_file`) |
| The API has a public `onrender.com` URL | `ProxyKeyFilter`: without the shared key every `/api` call gets 404; `/actuator/health` stays open for pings |
| Supabase's Data API publishes the `public` schema | The app uses its own schema `rks`; RLS is on every table; the Data API is switched off |
| Flyway refuses Supabase's non-empty `public` | `DB_SCHEMA=rks` |
| 512 MB RAM on Render | JVM tuned in the Dockerfile (60% heap, serial GC, small stacks); pool of 5 |
| A sleeping Render can take ~1 minute to wake | `export const maxDuration = 60` on the proxy and auth route handlers, so Vercel waits; all three services in Singapore |
| Reminders missed if Render restarts at 09:00 on the 1st | Startup catch-up (1st–3rd, daytime only, never twice) |
| Supabase's free tier has no downloadable backups | Encrypted `pg_dump` every 3 days via GitHub Actions |

---

## 20. Keeping free tiers awake, and backups

| Service | Free-tier limit | What keeps it awake | Where it's set up |
|---|---|---|---|
| **Render** | Sleeps after **15 min** idle; 750 instance-hours/month (enough for **one** always-on service) | **cron-job.org** calls `https://<service>.onrender.com/actuator/health` every **14 min**. The health check also checks the database, so Supabase sees activity all day. | cron-job.org website ([HOSTED.md §7](deploy/HOSTED.md#7-keeping-everything-awake)): URL from `deploy/secrets/cron-job.txt`, every 14 minutes, failure emails on, timeout 30s |
| **Supabase** | **Paused after 7 days** without activity | `.github/workflows/keep-db-awake.yml` runs `select count(*) from rks.court` **every 3 days** at 03:00 IST | GitHub → Settings → Secrets and variables → Actions: `SUPABASE_DB_URL`, `BACKUP_PASSPHRASE` (both in `deploy/secrets/github-secrets.txt`) |

**Why not ping from the web app?**
- A browser only pings while someone has the app open, so nothing would happen at night.
- Vercel's free cron runs at most once a day.

`keep-api-awake.yml` exists as an alternative to cron-job.org for **public** repositories only. It's off unless the repository variable `KEEP_API_AWAKE=true` is set. On a private repository it would use about 3,100 Actions minutes a month, more than the free 2,000, and once they ran out the database job would stop too.

### Backups

- When `BACKUP_PASSPHRASE` is set, the same 3-day workflow takes a `pg_dump` of the `rks` schema.
- It encrypts it with **AES-256** (gpg, symmetric) and attaches it to the run as an artifact, kept **21 days**.
- Uploaded images are included, because they live in the database.

**Restore:**
```bash
gpg --decrypt rks-YYYYMMDD-HHMM.dump.gpg > rks.dump          # asks for BACKUP_PASSPHRASE
pg_restore --clean --if-exists --no-owner -d "postgresql://…target…" rks.dump
```

Practise a restore on a spare Supabase project once. **Without the passphrase a backup can't be opened**: keep `deploy/secrets/keys.txt` in a password manager.

---

## 21. Security model

- **No token in the browser:** JWTs live in httpOnly, SameSite=Lax, Secure cookies. Route handlers attach them server-side.
- **CSRF:** SameSite cookies, plus the proxy refuses any non-GET request whose `Origin` isn't the site itself (`crossSite()`).
- **Access comes from the database, not the token:** role, active status, token version, and a parent's active children are re-read on every request.
- **Instant revocation:** a token-version bump on PIN change or reset, login deactivation, or "sign out everywhere".
- **Forced PIN change** for every one-time PIN; weak PINs refused; **lockout** after 5 wrong PINs (5 min).
- **Parent codes:** stored only as an HMAC; 5-minute expiry; 5 attempts; 1/min and 5/hour; no hint whether a number is registered.
- **Isolation:** parents get 404 for anything not theirs; staff and family tokens and cookies never mix; coaches never get fee amounts.
- **Uploads:** type, size and magic-byte checks; random names; served only to signed-in users with `nosniff`; GPS metadata stripped in the browser.
- **Public API locked:** `X-RKS-Proxy-Key`, compared in constant time; 404 otherwise.
- **Database:** its own schema; RLS on every table; Supabase Data API off; TLS (`sslmode=require`).
- **Errors** never include stack traces or internal messages.
- **Secrets** are only in environment variables. The `deploy/secrets/` folder is git-ignored. Production has no seeded logins and API docs are off.
- **Headers:** CSP, HSTS, frame denial, nosniff, a referrer policy and a permissions policy.

---

## 22. Operations runbook

| Task | How |
|---|---|
| Create the first owner (production) | `create-owner.cmd` from `make-env.ps1`, or `java -jar rks-academy.jar --setup-owner --name=… --mobile=… --server.port=0` with the production `DB_*` and `DB_SCHEMA` set |
| Add a coach or another owner | Settings → Staff logins → Add. Give them the one-time PIN; they set their own. |
| A coach forgot their PIN | Settings → Staff logins → Reset PIN. This ends their sessions immediately. |
| Someone leaves | Settings → Staff logins → turn the login off. All their sessions end immediately. |
| A payment was entered wrongly | Fees → open the payment → **Void** with a reason, then record it again |
| Send this month's reminders now | Fees → Pending → Send now (people already reminded are skipped) |
| Check WhatsApp | Settings → WhatsApp: shows the mode and any issues; **Send test** to a number |
| Give the accountant data | Fees → Export: payments, dues, players or attendance CSV |
| A parent can't sign in | The number must match an **active** player's parent mobile exactly. Issue a new one-time PIN from the player's profile (Parent app → Reset PIN); it also clears a 5-minute lockout. |
| Change the reminder time | `APP_REMINDERS_CRON` (Spring cron with seconds, Asia/Kolkata), e.g. `0 30 8 1 * *` for 08:30 on the 1st |
| Rotate the JWT secret | Change `APP_JWT_SECRET` on Render. Everyone is signed out. |
| Rotate the proxy key | Change `APP_PROXY_KEY` (Render) **and** `BACKEND_PROXY_KEY` (Vercel) to the same new value, then redeploy both |
| Restore a backup | [Section 20](#backups) |
| Upgrade the WhatsApp API version | `APP_WHATSAPP_API_URL=https://graph.facebook.com/vXX.0` |

---

## 23. Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| API won't start: *Found non-empty schema(s) "public" but no schema history table* | Supabase's `public` already has objects | Set **`DB_SCHEMA=rks`**. Never use `baselineOnMigrate`. |
| API won't start: *Validate failed: Migration checksum mismatch* | A migration that already ran was edited | Undo the edit; put changes in a new `V{n}` script |
| Calling the Render URL in a browser gives **404** for every `/api/...` | Working as designed: the proxy key is missing | Use the Vercel site. For curl, add `-H "X-RKS-Proxy-Key: …"`. |
| The site says it can't reach the server | `BACKEND_URL` is wrong, the keys don't match, or Render is still waking | Check Vercel's `BACKEND_URL` and that `BACKEND_PROXY_KEY` = `APP_PROXY_KEY`, then wait a minute and retry |
| `prepared statement "S_1" already exists` | Connected through Supabase's **transaction** pooler (port 6543) | Use the **session** pooler (port 5432) |
| API can't connect to `db.<ref>.supabase.co` | The direct host is IPv6-only | Use the session pooler host |
| Login works but every call is 401 | `APP_JWT_SECRET` changed, or the clock/token expired | Sign in again |
| *cannot execute INSERT in a read-only transaction* | A service method that writes lacks `@Transactional` | Add `@Transactional` to that method |
| Family sign-in: no code arrives | Provider is `log`, the template isn't approved, or the language isn't `en` | Settings → WhatsApp shows the mode and Meta's error |
| Parents get *"Wait a minute…"* | Per-number code limits | Wait (1/min, 5/hour) |
| Upload: *Couldn't make that photo small enough* | An unusual image that's still > 2 MB after resizing | Use another photo or crop it |
| Images show as broken after a redeploy | Uploaded before images moved to the database | Re-upload them |
| `'$b' is not recognized…` when generating a secret | A PowerShell command was run in Command Prompt | Use `make-env.ps1`, or prefix the command with `powershell -NoProfile -Command "…"` |
| GitHub "Keep database awake" fails | Missing `SUPABASE_DB_URL`, or the password isn't URL-encoded | Use the value from `github-secrets.txt` (already encoded) |
| Local API: port 8080 or 5432 already in use | Another API or PostgreSQL is running | Stop it, or change `server.port` / `DB_URL` |

---

## 24. Rules for contributors

1. **Never use the word "Student".** Use Player, Coach, Batch and Court.
2. **No hard-coded colours.** Use tokens from `lib/theme.ts`, through Tailwind classes.
3. **Coaches never see fee amounts**, in the API or the UI.
4. **Ads only in the family app.**
5. **Never use the WhatsApp number from the design screenshots.** It may belong to a real person. Use the `APP_WHATSAPP_NUMBER` config.
6. **Players have no photos by default.** Show the initials avatar.
7. **Time comes from the injected `Clock`. Money is `BigDecimal` / `NUMERIC(10,2)`.**
8. **Schema changes need a new Flyway migration**, never an edit to an old one. Update the JPA entity in the same change.
9. **Writing service methods need `@Transactional`.**
10. **Enforce access in the API.** The UI only hides what the API would refuse anyway.
11. **Every screen handles loading, empty and error states**, and works from 360px wide with no horizontal scroll.
12. **Run all the checks before you push:** `mvn verify` plus the frontend typecheck, lint, test and build. After any UI change, run the e2e suite against a fresh `rks_db`.
13. **Keep the docs in step:**
    - a new env var goes in [section 17](#17-configuration-reference), `backend/.env.example` and `deploy/make-env.ps1`
    - a new endpoint goes in [section 9](#9-api-reference-overview)
    - a new migration goes in [section 10](#10-database)
14. **Never commit secrets.** That means `deploy/secrets/`, `.env`, `.env.local` and dumps, all of which git already ignores.

---

## 25. Glossary

| Term | Meaning |
|---|---|
| **Player** | A child enrolled at the academy. Code format `RKS101`. |
| **Batch** | A recurring training slot: court, coach, days, start and end time, level |
| **Court** | A physical court. Batches can't overlap on the same court. |
| **Fee plan** | Price and length (1, 3 or 12 months …) a player is billed on |
| **Fee policy** | The academy-wide rules: late fee, cap, sibling discounts, registration fee. Versioned by month. |
| **Billing period** | The months a payment covers; always starts on the 1st |
| **Due** | A player whose current period has no covering payment |
| **Quote** | The calculated breakdown of what a player owes right now |
| **Void** | Cancelling a wrong payment while keeping its record |
| **Token version (`tv`)** | A per-account counter in the JWT; bumping it signs that account out everywhere |
| **Proxy key** | The shared secret that lets only the web app call a public API |
| **Session pooler** | Supabase's connection endpoint (port 5432) used by the API |
| **`log` / `cloud` provider** | Record-only WhatsApp vs. real sending through Meta |
| **Demo date** | The pinned date (2026-11-05) used in the dev profile |

---

## 26. Other documents

| Document | For |
|---|---|
| [deploy/HOSTED.md](deploy/HOSTED.md) | Step-by-step hosted deployment (Vercel + Render + Supabase), keep-awake, backups, **WhatsApp/Meta setup from zero**, production checklist |
| [deploy/README.md](deploy/README.md) | Single-server Docker Compose deployment with Caddy HTTPS, nightly backups, restore, trial-week checklist |
| [DESIGN.md](DESIGN.md) | Visual design: tokens, typography, components, screen-by-screen notes from the design references |
| [PLAN.md](PLAN.md) | The original plan: data model, business rules, API list and design decisions. Some details have evolved since; this README describes the current state. |
| `backend/.env.example`, `frontend/.env.example` | Local environment examples |
