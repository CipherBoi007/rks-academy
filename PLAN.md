# RKS Academy: Implementation Plan

Companion to [DESIGN.md](DESIGN.md). The verified local toolchain is JDK 21.0.12, Maven 3.9.12, Node 24.13, npm 11, local PostgreSQL 17 (database `rks_db`), and Python 3.13 with Pillow (used for asset cropping).

---

## 1. Folder structure

```
/
├─ .env.example
├─ README.md  DESIGN.md  PLAN.md
├─ design-ref/                   # untouched references
├─ backend/
│  ├─ pom.xml                    # Spring Boot 3.5.x, Java 21
│  └─ src/main/java/in/rks/academy/
│     ├─ RksAcademyApplication.java
│     ├─ config/                 # CorsConfig, OpenApiConfig, ClockConfig (Asia/Kolkata), JacksonConfig
│     ├─ security/               # SecurityConfig, JwtService, JwtAuthFilter, AdminUserDetailsService
│     ├─ common/                 # ApiError, GlobalExceptionHandler, PageResponse<T>, Money utils, NotFoundException
│     ├─ auth/                   # AuthController, AuthService, dto/
│     ├─ admin/                  # AdminUser entity + repo
│     ├─ court/  coach/  batch/  # entity, repo, service, controller, dto/
│     ├─ player/                 # Player entity, PlayerSpecifications (filters), PlayerService, controller
│     ├─ attendance/             # AttendanceRecord, bulk save service, controller
│     ├─ billing/                # FeePlan, FeePolicy, Payment, BillingPeriodCalculator,
│     │                          # LateFeeCalculator, SiblingDiscountCalculator, DuesService,
│     │                          # PaymentService, ReceiptNumberGenerator, controllers
│     ├─ product/                # Product, ProductImage, ProductSpec, ProductVariant, ads
│     └─ dashboard/              # DashboardService, controller
│  └─ src/main/resources/
│     ├─ application.yml (+ application-dev.yml)
│     └─ db/migration/  V1__schema.sql  V2__seed_reference.sql  V3__seed_players.sql
│                       V4__seed_payments_attendance.sql  V5__seed_products.sql
│  └─ src/test/java/...          # unit tests for billing rules + reminders; ApiIT against a throwaway local rks_db_test
└─ frontend/
   ├─ package.json  next.config.ts  tailwind.config.ts  tsconfig.json  .env.example
   ├─ public/brand/crest.png  public/img/{login,hero,players,products}/...
   └─ src/
      ├─ app/
      │  ├─ layout.tsx                    # fonts, QueryProvider, Toaster
      │  ├─ (auth)/login/page.tsx
      │  ├─ (app)/layout.tsx              # AppShell: Sidebar / TopBar / BottomNav
      │  ├─ (app)/dashboard/page.tsx
      │  ├─ (app)/players/page.tsx  players/[id]/page.tsx
      │  ├─ (app)/attendance/page.tsx
      │  ├─ (app)/fees/page.tsx  fee-structure/page.tsx
      │  ├─ (app)/store/page.tsx  store/[id]/page.tsx
      │  ├─ receipts/[receiptNo]/page.tsx  # print layout, no shell
      │  ├─ api/auth/{login,logout}/route.ts   # sets/clears httpOnly JWT cookie
      │  └─ api/v1/[...path]/route.ts          # proxy → backend, attaches Bearer from cookie
      ├─ middleware.ts                    # redirects to /login without a session cookie
      ├─ components/ui/                   # Button, Card, KpiCard, Chip, Avatar, PillGroup, Select, Field,
      │                                   # SearchInput, SegmentedTabs, DataTable, ToggleGroup, Sheet, Skeleton,
      │                                   # EmptyState, PageHeader, StepLabel, InfoNote
      ├─ components/shell/                # Sidebar, TopBar, BottomNav, UserMenu
      ├─ components/domain/               # PlayerCard, PaymentRow, DueRow, CourtCard, PlanCard, PolicyCard,
      │                                   # ProductCard, ProductAd, AttendanceHeatmap, FeeTimeline, SkillStepper,
      │                                   # sheets/{PlayerSheet, RecordPaymentSheet, PlanSheet, PolicySheet, FiltersSheet}
      ├─ lib/                             # api client (fetch wrapper + ApiError), query keys, format (₹, IST dates), zod schemas
      └─ hooks/                           # usePlayers, useDues, useMediaQuery, useSessionDismiss …
```

**Auth flow:** the login form posts to the Next route `/api/auth/login`, which calls the backend `/api/v1/auth/login` and stores the JWT in an **httpOnly, SameSite=Lax cookie**. The browser then calls the same-origin `/api/v1/*` proxy, which forwards the request with `Authorization: Bearer`. Because the token never sits in JS-readable storage and `middleware.ts` can guard routes server-side, this is the default. The backend still enables CORS for `FRONTEND_ORIGIN`, which covers direct calls and Swagger.

---

## 2. Data model (PostgreSQL, Flyway)

Every table has `id BIGSERIAL PK`, `created_at`, and `updated_at timestamptz`. Money columns are `NUMERIC(10,2)`. Dates are `DATE`, interpreted in Asia/Kolkata.

| Table | Columns | Constraints |
|---|---|---|
| `admin_user` | name, mobile (10 digits), pin_hash (BCrypt), role `OWNER\|COACH`, coach_id FK nullable, must_change_pin bool, active | unique(mobile) |
| `court` | name, surface_type, sort_order | unique(name) |
| `coach` | name, title (e.g. "Junior Coach"), mobile | |
| `batch` | name, court_id FK, coach_id FK, start_time `TIME`, end_time, days_of_week `VARCHAR` (e.g. `MON,TUE,WED,THU,FRI`), level (nullable = mixed), active | |
| `fee_plan` | name, level_label, price, period_months, sessions_per_week, most_popular bool, sort_order, active | at most one `most_popular` (partial unique index) |
| `fee_plan_perk` | fee_plan_id FK, position, text | `@ElementCollection` |
| `player` | code (`RKS101`), name, dob, gender `MALE\|FEMALE\|OTHER`, photo_url, contact_relation (SELF/PARENT/GUARDIAN), contact_name, contact_mobile, blood_group, address, level, batch_id FK, fee_plan_id FK, join_date, plan_start_date (always the 1st of a month), active, sibling_group_id `UUID` nullable | unique(code); index(name), index(batch_id) |
| `player_level_history` | player_id, level, achieved_on | feeds the level stepper |
| `player_skill` | player_id, skill `FOOTWORK\|SMASH\|DEFENCE\|NET_PLAY\|STAMINA`, score 0–100, updated_on | PK(player_id, skill); the skill bars |
| `attendance_record` | player_id, batch_id, date, status `PRESENT\|ABSENT`, marked_by FK admin_user | **unique(player_id, batch_id, date)** |
| `fee_policy` | registration_fee, sibling_discount_2nd_pct, sibling_discount_3rd_pct, late_fee_after_day, late_fee_base, late_fee_per_day, late_fee_max, **effective_from DATE** | unique(effective_from) |
| `payment` | receipt_no (`RKS/26/1126`), player_id, fee_plan_id, plan_amount, sibling_discount, late_fee, registration_fee, adjustment (desk override, needs a note), **amount** (total), mode `UPI\|CASH`, paid_on, period_from, period_to, note, recorded_by | unique(receipt_no); **unique(player_id, period_from)**, so a period can't be paid twice |
| `receipt_sequence` | year (2-digit), next_value | row-locked when a number is issued |
| `product` | brand, category `RACKETS\|SHUTTLECOCKS\|SHOES\|GRIPS\|BAGS\|JERSEYS`, name, description, price, mrp, rating NUMERIC(2,1), review_count, stock (nullable = untracked), tag_label, advertised bool, ad_placement `HERO\|INLINE\|STRIP` nullable, ad_headline, ad_highlight, active | |
| `product_image` | product_id, position, url | |
| `product_spec` | product_id, position, label, value | |
| `product_variant` | product_id, group_name (e.g. "Weight"), value (e.g. "4U") | |
| `admin_user` (V4) | + token_version (session revocation) | |
| `court`, `coach` (V4) | + active (turned off, never deleted) | |
| `payment` (V4) | + voided_at, voided_by, void_reason | unique(player_id, period_from) **for live payments only** |
| `parent_account` (V5) | mobile (unique), token_version, last_login_at | access always derived from active players with that parent_mobile |
| `fee_reminder` | player_id, period_from, to_mobile, amount, message, status `SENT\|FAILED`, provider, provider_message_id, error, attempts, sent_at | **unique(player_id, period_from)**: one reminder per period |

**One deviation from the brief: FeePolicy.** The brief asks for a single row, but "changes take effect from the next billing cycle" requires the old values to stay in force until then. I'll store **versioned rows**:
- `GET /fee-policy` returns the version in force today, plus any scheduled next version.
- `PUT /fee-policy` inserts or replaces the pending version, effective from the 1st of next month.

The billing logic always reads the version that is effective on a payment's `period_from`. In the UI this still behaves as a single policy.

---

## 3. Business rules (`billing` package, pure services, unit-tested)

| Rule | Implementation |
|---|---|
| **Billing periods (calendar months)** | Every period starts on the 1st. `plan_start_date` is the 1st of the joining month, so a mid-month joiner pays the full plan for that month. Periods repeat every `plan.period_months` from `plan_start_date`, which means quarterly and annual periods also begin on the 1st of the joining month. On a plan change, `plan_start_date` becomes the 1st of the first month not yet covered by a payment. |
| **Dues** | A player is due when they are active and no payment covers `currentPeriod.from`, meaning there is no payment where `period_from ≤ from ≤ period_to`. **Days overdue = today − period.from.** Amount due = plan price − sibling discount + late fee, plus the registration fee if the player has never paid. Only the current period counts. Arrears from older periods are out of scope. |
| **Late fee** | Uses the policy in force for that period. Let `cutoff` = day `lateFeeAfterDay` (10) of the period's first month, and `n` = days from `cutoff` to the payment date (or to today, for dues). If `n ≤ 0`, the fee is 0. Otherwise it is `min(max, base + perDay × (n − 1))`: ₹100 on the 11th, ₹110 on the 12th, and so on, capped at ₹300. |
| **Sibling discount** | Active players sharing a `sibling_group_id` are ranked by `join_date`, then `id`. Rank 2 gets `sibling_discount_2nd_pct`, and rank 3 and later get `sibling_discount_3rd_pct`, applied to the plan price. Applied automatically by `PaymentService.quote()` and `record()`, and shown as a line item on the receipt. |
| **Policy effective date** | `PolicyResolver.forDate(period.from)`. |
| **Recording a payment** | `POST /payments` carries `{playerId, mode, paidOn, planId?}`. The server computes the period, discount, late fee and registration fee (the client never sends money totals), issues the receipt no., and saves. `POST /payments/quote` returns the same breakdown without saving, which powers the live preview in the sheet. Paying twice for a period that is already covered returns 409. |
| **Receipt number** | `RKS/{yy}/{n}` with a per-year sequence. It is seeded to continue after the highest seeded number. |
| **Clock** | A single `Clock` bean set to Asia/Kolkata. `APP_DEMO_DATE` is bound **only in the `dev` profile**, which sets it to 2026-11-05. When it is unset, the real date in Asia/Kolkata is used. |
| **Fee visibility** | COACH tokens get 403 on payments, dues, fee-policy and player payments. For coaches, fee-plan prices and the money fields on the dashboard come back as `null`. Players still carry a `feeStatus` of PAID/DUE. |
| **First login / setup** | Production seeds no login. `java -jar rks-academy.jar --setup-owner --name="…" --mobile=…` creates the first OWNER (and refuses if one already exists), prints a one-time PIN, and sets `must_change_pin`. While that flag is set, the JWT only allows `/auth/me` and `/auth/change-pin`. |

Unit tests: period math (month-end and leap years, quarterly/annual), dues detection (covered, uncovered, overlapping), late-fee thresholds (before the day, on the day, mid-range, capped), sibling ranking (1st/2nd/3rd/4th, inactive sibling ignored), policy versioning (a change today does not affect the current cycle), receipt sequence, and the attendance bulk upsert. Integration tests (local PostgreSQL, a dedicated `rks_db_test` database that is wiped every run): Flyway migrates and seeds; login returns a JWT; a protected endpoint returns 401 without one; players filter; record payment end to end.

---

## 4. REST API: `/api/v1`, JSON, DTOs as Java records

Lists of players, payments, dues and products return `PageResponse<T> { content, page, size, totalElements, totalPages }` and take `?page=&size=`. Small reference lists (courts, batches, fee plans) and a player's own history come back as plain arrays.
Errors return `ApiError { status, code, message, fieldErrors[], path, timestamp }`, handled by a `@RestControllerAdvice` for validation, not-found, conflict, auth, and fallback cases.

| Method | Path | Notes | Role |
|---|---|---|---|
| POST | `/auth/login` | `{mobile, pin}` → `{token, expiresAt, user{name, role, initials}}` | public |
| GET | `/auth/me` | current user | any |
| GET | `/dashboard/summary` | activePlayers, newThisMonth, attendancePct, presentToday, expectedToday, collectedThisMonth, paymentsThisMonth, pendingDues, duePlayers | any |
| GET | `/dashboard/today-courts` | courts[] → slots[] {batch, time, coach, playerCount, status DONE\|LIVE\|UPCOMING} | any |
| GET | `/courts` · `/batches?courtId=&date=` | `date` filters batches to those running on that weekday | any |
| GET / POST | `/players` | GET: `?q=&batchId=&courtId=&level=&feeStatus=PAID\|DUE&active=` (paginated, includes feeStatus). POST: create (server assigns the next `RKS###` code) | GET any / POST owner |
| GET / PUT / DELETE | `/players/{id}` | DELETE only for a player added by mistake (no payments, attendance or payment reports); otherwise 409 | GET any / write owner |
| POST | `/players/{id}/leave` · `/players/{id}/rejoin` | left players keep their history and drop off lists, dues and reminders | owner |
| GET | `/players/{id}/attendance?from=&to=` | heatmap data + percentage | any |
| GET | `/players/{id}/payments` | fee history timeline, newest first | owner |
| GET | `/players/{id}/progress` | level history + skill scores | any |
| PUT | `/players/{id}/skills` | update skill scores | owner, coach |
| POST / DELETE | `/players/{id}/photo` | multipart upload (JPG/PNG/WebP ≤ 2 MB), served via `/files/players/{name}` | owner |
| GET | `/attendance?date=&batchId=` | roster for the batch with existing status | any |
| POST | `/attendance` | `{date, batchId, entries[{playerId, status}]}`, a bulk upsert | owner, coach |
| GET | `/payments?from=&to=&mode=&playerId=` | paginated, newest first | any |
| POST | `/payments/quote` · `/payments` | breakdown / record | owner |
| GET | `/receipts/{yy}/{number}` | receipt for `RKS/{yy}/{number}` (academy details, line items, amount in words) | owner |
| GET | `/payments/summary?month=` | collected, count, UPI %, pending, due count | owner |
| GET | `/products/{id}/related` | same category first, then same brand | any |
| GET | `/config/public` | academy name, WhatsApp number, business date (`today`) | public |
| POST | `/notifications/fee-reminders` | send this month's outstanding WhatsApp reminders now (also runs automatically at 09:00 IST on the 1st) | owner |
| GET | `/notifications/fee-reminders?month=` · `/status` | reminder log and sent/failed counts | owner |
| GET / POST / PUT | `/staff` (`/{id}`) · POST `/staff/{id}/reset-pin` | logins; create and reset return a one-time PIN (`Cache-Control: no-store`) | owner |
| POST / PUT | `/courts` · `/coaches` · `/batches` (`/{id}`) | create and edit; turn off only when nothing active depends on it; no court double-booking | owner |
| POST | `/payments/{id}/void` | void with a reason; stays on record, stops counting | owner |
| GET | `/exports/payments.csv` · `/dues.csv` · `/players.csv` · `/attendance.csv` | UTF-8 CSV, formula-safe, up to 1 year per export | owner |
| POST | `/products/images` · `/products/{id}/restore` | product photo upload (JPG/PNG/WebP ≤ 2 MB); restore an archived product | owner |
| GET / POST | `/notifications/whatsapp` · `/notifications/whatsapp/test` | WhatsApp setup status; send one test message | owner |
| POST | `/family/auth/login` · `/family/auth/set-pin` | parent sign-in with mobile + PIN (lockout, no enumeration) | public |
| GET | `/family/me` · `/family/children/{id}` (+ `/attendance`, `/progress`, `/payments`, `/due`) · `/family/receipts/{yy}/{n}` | the parent's own children only; anything else is 404 | parent |
| GET | `/family/shop/products` (`/{id}`, `/{id}/related`) · `/family/shop/ads?placement=` | shop and offers (offers exist only here) | parent |
| POST | `/auth/change-pin` | required before anything else when `mustChangePin` | any |
| GET | `/dues` | `?sort=daysOverdue` returns a list with amount, daysOverdue, lateFee | any |
| GET / POST / PUT / DELETE | `/fee-plans` (`/{id}`) | DELETE archives the plan, and is blocked while players are on it | GET any / write owner |
| GET / PUT | `/fee-policy` | current + pending (see §2) | GET any / PUT owner |
| GET / POST / PUT / DELETE | `/products` (`/{id}`) | GET: `?q=&category=&page=` | GET any / write owner |
| GET | `/products/ads?placement=HERO\|INLINE\|STRIP` | one advertised product, or 204 | any |

Swagger UI is served at `/swagger-ui.html` with JWT bearer auth configured.
The word "Student" does not appear anywhere: entity names, DTOs, endpoints, seed data and UI copy all use Player, Coach, Batch and Court.

---

## 5. Seed data (taken from the screenshots)

- **Demo vs reference data:** `db/migration` holds the schema plus reference data: courts, coaches, batches, fee plans and the policy. The demo data (players, payments, attendance, products and logins) lives in `db/demo`, and Flyway loads it **only in the `dev` profile**.
- **Dev-only logins:** Owner R. Sethupathi `9000000000` / `123456`, and coaches S. Divya `9000000001` and M. Anand `9000000002`, also with PIN `123456`. (Originally `1234`; changed when PINs became 6 to 12 digits.)
- **WhatsApp:** `APP_WHATSAPP_NUMBER`, default placeholder `910000000000`, exposed through `GET /config/public`. The login placeholder is `+91 00000 00000`.
- **Images:** players have no photos (`photo_url` is NULL and the initials avatar is used). `POST /players/{id}/photo` uploads to `APP_UPLOAD_DIR`. Product and banner images are crops saved under `frontend/public/demo/`.
- **Courts:** Court 1 (Wooden synthetic), Court 2 (BWF synthetic mat), Court 3 (Wooden synthetic), Court 4 (BWF synthetic mat).
- **Coaches:** S. Divya, M. Anand, R. Sethupathi.
- **Batches:**

| Batch | Court | Time | Coach | Days |
|---|---|---|---|---|
| Morning Beginners | Court 1 | 6:00–7:00 AM | Divya | Mon–Fri |
| Evening Juniors | Court 1 | 4:30–5:30 PM | Divya | Mon–Fri |
| Morning Intermediate | Court 2 | 6:00–7:30 AM | Anand | Mon–Fri |
| Evening Intermediate | Court 2 | 5:30–7:00 PM | Anand | Mon–Fri |
| Morning Advanced | Court 3 | 7:00–8:30 AM | Sethupathi | Mon–Fri |
| Tournament Squad | Court 4 | 6:00–8:00 PM | Sethupathi | Mon–Sat |

- **30 players RKS101–RKS130**, with the exact names, ages (derived dob), levels, batches and PAID/DUE status from the Players screenshot. The DUE players are 103, 106, 110, 114, 117, 121, 125, 128 and 130, which makes 9. Batch counts match: 4/3/5/5/5/8. None of the 30 names share a family name, so I'll make two sibling groups visible by giving them the same parent: Pranav Balaji (RKS107) with Preethi Jayakumar (RKS122), and Kavya Ramesh (RKS102) with Abinaya Murali (RKS116) with Keerthana Palani (RKS124). The second group shows the 3rd-child rate. Join dates are set so that the siblings who appear in the November payments table (Preethi and Kavya) rank 1st and pay full price, which keeps the screenshot totals intact.
- **Fee plans:** the 4 plans with their perks exactly as shown, with Quarterly marked Most Popular. The policy is ₹1,000 registration, 10%/15% sibling discount, and a late fee after day 10 of ₹100 + ₹10/day up to ₹300.
- **Payments:** the 12 November payments shown, with the exact receipt numbers, which total ₹66,900. Also October and earlier history for the profile timelines, plus attendance for the last 12 weeks, with today's morning batches marked so the result lands near 86%.
- **Products:** 12 products from the Store screenshot with the same brands, categories, prices, MRPs, ratings and tags. Ads: hero is Astrox 77 Pro ("SMASH HARDER THIS SEASON"), inline is Mavis 350 Nylon (ACADEMY PRICE), and strip is Saga Lite Court Shoe (19% OFF). Each product gets specs and variants.

---

## 6. Phase checklist
- **Delivered as one build (2026-11-10)** at your request instead of phases: backend, local PostgreSQL, every screen and sheet, and the WhatsApp fee reminders. See the README for the checks.
- **Phase 1:** backend, Flyway, seeds, auth, all endpoints, Swagger, tests, with `mvn verify` green.
- **Phase 2:** Tailwind tokens, fonts, `components/ui` + shell, and a `/dev/kitchen-sink` page for visual checks (removed in Phase 4), with `next build` green.
- **Phase 3:** screens in the requested order, each with a skeleton, empty state and error toast, compared against `/design-ref` after each one.
- **Phase 4:** QA at 360/390/768/1024/1440 (Playwright screenshots of every route at every width, checked for horizontal overflow and 44px targets), contrast check, cleanup, README.

---

## 7. Decisions
The five open decisions were approved on 2026-11-05 with changes, and those changes are folded into §2–§5 above.
