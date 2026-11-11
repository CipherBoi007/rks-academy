# RKS Academy

A management system for **Raja Kumaran Sethupathi Sports Academy, Ramanathapuram**, a multi-court badminton academy. It covers players, batches, courts, attendance, fees, monthly WhatsApp fee reminders and the RKS Pro Shop.

| Part | Stack |
|---|---|
| `backend/` | Spring Boot 3.5 · Java 21 · PostgreSQL · Flyway · JWT · springdoc (Swagger UI) |
| `frontend/` | Next.js 15 (App Router) · TypeScript · Tailwind CSS · TanStack Query · React Hook Form + Zod |
| Database | Local PostgreSQL (pgAdmin): database `rks_db`, user `postgres` |

Design reference: [DESIGN.md](DESIGN.md). Data model, rules and API list: [PLAN.md](PLAN.md). **Production deployment: [deploy/README.md](deploy/README.md).**

---

## Quick start (local development)

You need PostgreSQL 15+ running locally, JDK 21, Maven 3.9+ and Node 20+.

**1. Database.** Create it once, in pgAdmin or psql:

```sql
CREATE DATABASE rks_db;
```

The dev profile connects as `postgres` / `root` on `localhost:5432`. Override this with `DB_URL`, `DB_USERNAME` and `DB_PASSWORD`. Flyway creates every table and loads the demo data on first start.

**2. API**, on <http://localhost:8080>:

```bash
cd backend
SPRING_PROFILES_ACTIVE=dev mvn spring-boot:run
```

In PowerShell: `$env:SPRING_PROFILES_ACTIVE="dev"; mvn spring-boot:run`.

**3. Web app**, on <http://localhost:3000>:

```bash
cd frontend
cp .env.example .env.local     # BACKEND_URL=http://localhost:8080
npm install
npm run dev
```

Open <http://localhost:3000> and sign in with a dev login (below).

- Swagger UI: <http://localhost:8080/swagger-ui.html>. Call `POST /api/v1/auth/login`, then click **Authorize** and paste the token.
- Health check: <http://localhost:8080/actuator/health>.

The browser only talks to the Next.js app. The app stores the login token in an **httpOnly cookie** and forwards `/api/v1/*` to the backend, so page scripts never see the token.

### Dev-only logins

> ⚠️ **These logins exist only in the `dev` profile.** They are seeded from `backend/src/main/resources/db/demo`, which Flyway loads only when `dev` is active. Production never gets them.

| Role | Mobile | PIN |
|---|---|---|
| Owner (R. Sethupathi) | `9000000000` | `1234` |
| Coach (S. Divya) | `9000000001` | `1234` |
| Coach (M. Anand) | `9000000002` | `1234` |

**What coaches can do:** view players, batches and the store; take attendance; update skill scores.

**What coaches never see:** fee amounts. They get the PAID/DUE chip only. Fees and Fee Structure are hidden from them, and every payment, dues, policy and reminder endpoint returns 403.

### Demo date

The `dev` profile pins the business date to **2026-11-05** (`APP_DEMO_DATE`), so the seeded data reproduces the design screenshots: ₹66,900 from 12 payments, 9 players due, 79% via UPI. Set `APP_DEMO_DATE=` (empty) to use the real date while keeping demo data. Outside `dev` the variable is ignored, and the app always uses today's date in Asia/Kolkata.

### Resetting the dev database

Drop and recreate `rks_db` (for example `DROP DATABASE rks_db; CREATE DATABASE rks_db;`) and restart the API. Flyway re-seeds it.

---

## Family app (parents)

Parents get their own app at **/family**, for example `http://localhost:3000/family`.

- **Sign-in:** the parent enters the mobile number the academy has on file, then a 6-digit code sent on WhatsApp. No password.
- **Code rules:** a code expires after 5 minutes and allows 5 tries. A parent can request a new code once a minute, 5 times an hour. The screen never reveals whether a number is registered.
- **In development** WhatsApp only logs messages, so the sign-in screen shows the code instead.
- **What a parent sees, all read-only:**
  - every child registered with their number, with batch, timing, court and coach
  - fee status and the amount due with its pay-by date
  - the attendance calendar and skill progress
  - fee history with printable receipts
- **What a parent can never see:** other players, any academy totals, or anything the staff edit.
- **Isolation:** another family's child or receipt returns "not found". Family and staff sessions use separate cookies, and neither can call the other's API.
- **Access ends** as soon as a child is deactivated or the parent's number changes.
- **Shop offers** (the banner, the shop card and the offer bar) appear **only in the family app**, never to owners or coaches. The owner picks the advertised products in the shop editor.

**Try it in dev:** open `/family/login` and enter `9000000101` (Aravind Murugan's parent). For a family with two children, use `9000020001` (Preethi and Pranav).

---

## What the owner manages in the app

- **Settings → Staff logins:** add owner and coach logins, reset PINs, turn logins off. New and reset logins get a one-time PIN that must be changed at first sign-in. Every change that should end a session takes effect immediately.
- **Settings → Courts & batches / Coaches:** add and edit them. Items are turned off rather than deleted, and turning one off is refused while something active depends on it. A court can't be double-booked at overlapping times.
- **Settings → WhatsApp:** shows whether reminders are really being sent, and sends a test message.
- **Store:** add and edit products, upload photos, set specs, options and offers, and archive or restore products.
- **Fees:**
  - **Void** a wrong payment with a reason. It stays on record with its receipt marked VOID, stops counting, and the period becomes due again.
  - **Export** CSV for the accountant: payments, dues, players and attendance.

---

## Monthly WhatsApp fee reminders

At **09:00 IST on the 1st of every month**, the API sends a WhatsApp reminder to the parent of every active player whose new billing period starts that month and isn't paid yet. Players who prepaid, or who are mid-way through a quarterly or annual period, get nothing. Example message:

> Vanakkam K. Murugan! Fee reminder from RKS Academy for Aravind Murugan (RKS101): Monthly plan for Nov 2026 is ₹1,500. Please pay by 10 Nov 2026 to avoid a late fee. Thank you!

- Each player is reminded **at most once per billing period**. Running it again only retries failed sends.
- Owners can send outstanding reminders on demand from **Fees → Pending → Send now**. They are logged at `GET /api/v1/notifications/fee-reminders`.
- **Providers** (`APP_WHATSAPP_PROVIDER`):
  - `log` (the default) records each reminder and writes it to the log **without contacting anyone**. This is safe for development.
  - `cloud` sends through the **WhatsApp Business Cloud API**. Set `APP_WHATSAPP_PHONE_NUMBER_ID` and `APP_WHATSAPP_ACCESS_TOKEN`, and create an approved message template (default name `fee_reminder`, language `en`) whose body has 7 parameters in this order: parent name, player name, player ID, plan, period, amount, pay-by date. Meta only delivers business-initiated messages through approved templates.
- Schedule and switch: `APP_REMINDERS_CRON` (default `0 0 9 1 * *`) and `APP_REMINDERS_ENABLED`.

---

## Environment

**Backend.** See `backend/.env.example`. Spring reads these from the environment; it does not read `.env` files on its own.

| Variable | Default | Notes |
|---|---|---|
| `SPRING_PROFILES_ACTIVE` | *(none)* | Use `dev` locally. Leave unset in production. |
| `DB_URL` | `jdbc:postgresql://localhost:5432/rks_db` | |
| `DB_USERNAME` / `DB_PASSWORD` | `postgres` / `root` in dev | `DB_PASSWORD` is required outside dev. |
| `APP_JWT_SECRET` | *(required outside dev)* | At least 32 characters, e.g. `openssl rand -base64 48`. |
| `APP_JWT_TTL` | `12h` | |
| `APP_FRONTEND_ORIGIN` | `http://localhost:3000` | Allowed CORS origin. Separate several with commas. |
| `APP_WHATSAPP_NUMBER` | `910000000000` | **Placeholder.** The academy's WhatsApp number for "Enquire on WhatsApp", as country code and number, digits only. |
| `APP_WHATSAPP_PROVIDER` | `log` | `log` or `cloud` (see above). |
| `APP_WHATSAPP_PHONE_NUMBER_ID`, `APP_WHATSAPP_ACCESS_TOKEN` | *(empty)* | Required when the provider is `cloud`. |
| `APP_WHATSAPP_TEMPLATE`, `APP_WHATSAPP_TEMPLATE_LANG` | `fee_reminder`, `en` | |
| `APP_REMINDERS_ENABLED`, `APP_REMINDERS_CRON` | `true`, `0 0 9 1 * *` | The cron runs in Asia/Kolkata. |
| `APP_PROXY_KEY` | *(empty)* | When set, every `/api` call must carry it in `X-RKS-Proxy-Key` (the web app sends `BACKEND_PROXY_KEY`). Use it whenever the API has a public URL, e.g. on Render. |
| `DB_POOL_SIZE` | `10` | Database connections. Keep ≤ 5 on Supabase's free pooler. |
| `APP_ACADEMY_PHONE` | `+91 00000 00000` | Printed on receipts. |
| `APP_DEMO_DATE` | `2026-11-05` in dev | Read only under the `dev` profile. |

**Frontend.** See `frontend/.env.example`: `BACKEND_URL` (server-side only, default `http://localhost:8080`) and `BACKEND_PROXY_KEY` (same value as the API's `APP_PROXY_KEY`).

Uploaded images are stored in the database (`stored_file`), so they survive redeploys and are part of every backup.

---

## Production: first owner account

Production seeds **no logins**. Create the first owner once:

```bash
cd backend && mvn -q -DskipTests package
java -jar target/rks-academy.jar --setup-owner --name="R. Sethupathi" --mobile=9XXXXXXXXX
```

- The command prints a random one-time PIN and exits.
- The owner must change that PIN on first sign-in. Until they do, the API only allows `GET /auth/me` and `POST /auth/change-pin`.
- If an owner already exists, the command refuses and changes nothing.

The full production setup is in **[deploy/README.md](deploy/README.md)**:
- one `docker compose` command with automatic HTTPS
- nightly backups and a restore script
- monitoring
- WhatsApp go-live
- a trial-week checklist

---

## Tests and checks

| Command | What it covers |
|---|---|
| `cd backend && mvn verify` | **Unit tests** cover the billing rules (calendar-month periods, late fee after the 10th with its cap, sibling ranking and discounts, policy versioning, rounding), the reminder service, PIN strength, rupees in words and the login lockout. **Integration tests** (`ApiIT`) boot the app against a throwaway `rks_db_test` database on local PostgreSQL, created automatically and wiped every run, and drive the HTTP API end to end. |
| `cd frontend && npm run typecheck && npm run lint && npm test && npm run build` | TypeScript (strict), ESLint (zero warnings), Vitest unit tests for formatting and dates, and the production build. |
| `cd frontend && npm run test:e2e` | Playwright against a running stack (API on dev with a **fresh** `rks_db`, plus `npm start`). Covers login, dashboard figures, filters, profile, attendance save, the coach restrictions, recording a payment with its receipt, fee structure, the store and WhatsApp link, ad dismissal, and a responsive sweep at 360/390/768/1024/1440px that asserts no horizontal page scroll and 44px tab targets. Screenshots go to `frontend/e2e/.screens/`. |

## Business rules (summary)

- **Billing is by calendar month.** Every period starts on the 1st. A mid-month joiner pays the full plan for the joining month, and quarterly and annual periods start on the 1st of the joining month.
- **Dues:** a player is due when no payment covers the start of their current period. Days overdue are counted from the period start, or from the join date if that is later.
- **Late fee:** ₹100 on the 11th, then ₹10 per day, capped at ₹300 (all set by the policy). The joining month is exempt.
- **Sibling discount:** applied automatically by join order: 10% for the 2nd sibling, 15% for the 3rd and later.
- **Registration fee:** charged on a player's first payment.
- **Policy edits** take effect on the 1st of next month; the current cycle keeps its terms.
- **Overriding the amount** at the desk is allowed. The difference is stored as an adjustment, a reason is required, and it is printed on the receipt.
