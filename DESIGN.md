# RKS Academy: Design Spec

Source of truth: `/design-ref/*.png` (7 desktop screens + crest).
The screenshots are 1863px wide and appear to be captured at about **1.25× device scale**, which puts the CSS viewport near 1490px. Every measurement below is already converted to **CSS px** (screenshot px ÷ 1.25, rounded to the Tailwind scale).

---

## 1. Design tokens

### 1.1 Colour (the only colours allowed in the codebase)

| Token | Hex | Used for |
|---|---|---|
| `primary` | `#1F3FBF` | Primary buttons, active nav item, amounts, initials avatars, PAID chip, step numbers, eyebrow labels, links ("View all", "Receipt"), check icons in plan perks, KPI icon tiles |
| `primary-700` | `#18329A` | Hover/pressed state for primary |
| `primary-50` | `#EEF1FC` | UPI chip background, Intermediate/Advanced chip tint, pale blue icon tiles |
| `accent` | `#FFE600` | Active filter pill, "MOST POPULAR" badge, initials text on avatars, Tournament chip, highlighted headline words, "Shop now" button, top-bar avatar, KPI accent bar, active-nav left tick |
| `alert` | `#F26A1B` | DUE chip, pending amounts, discount tags, the pending-dues accent bar, late-fee icon, dues left rule, the notification dot, "Live status" dot |
| `alert-50` | `#FEF0E8` | Pending-dues and late-fee icon tile, "9 due" pill |
| `ink` | `#111111` | Headings, KPI numbers, hard offset shadow, the 1px card outline on the attendance summary and Fees ad strip |
| `navy` | `#0F1B4D` | Dashboard hero ad, login image overlay gradient end |
| `surface` | `#F4F6FB` | Page background, inner court-card panels, tab-track background, table header row, policy note bar |
| `white` | `#FFFFFF` | Cards, sidebar, top bar |
| `muted` | `#6B7280` | Secondary text (meta lines like "RKS101 · 12 yrs") |
| `line` | `#E6E9F2` | Card borders, dividers, input borders |
| `chip-grey` | `#EEF0F4` | Beginner chip, Cash chip, DONE status chip |

`primary-*`, `alert-50`, `muted`, `line` and `chip-grey` are derived neutrals and tints that the screenshots need. They live in `tailwind.config.ts` next to the six brand colours, so nothing outside the theme carries a raw hex value.

**Contrast rules:** yellow is never used for text on white. It appears only as a fill behind `ink` text, or as text on `primary`/`navy` (initials, highlighted headline words, batch time on the selected batch card). Orange text (`#F26A1B`) on white comes out near 3.0:1, so it is restricted to **large/bold** text (amounts ≥ 18px bold, chip labels in bold uppercase). Small orange text uses an `alert`-filled chip with white text instead.

### 1.2 Typography

| Role | Font | Size / weight (desktop) | Notes |
|---|---|---|---|
| Page title | Oswald 700, UPPERCASE | 40px / leading-none | "FEES", "PLAYERS", "ACADEMY OVERVIEW" |
| Eyebrow | Inter 700, UPPERCASE | 12px, tracking `0.2em`, `primary` | "COLLECTIONS & DUES", "THURSDAY, 05 NOV 2026" |
| Card / section title | Oswald 600, UPPERCASE | 20–22px | "TODAY ON COURT", "RECENT PAYMENTS", "COURT 1", "POLICIES" |
| KPI number | Oswald 700 | 32px | "30", "86%", "₹66,900" |
| Plan price | Oswald 700 | 40px | "₹1,500", followed by Inter 14 muted "per month" |
| Product price | Oswald 700 | 22px | struck MRP in Inter 12 muted, `line-through` |
| List amount | Oswald 700, `primary` | 20px | Recent payments, Fees table |
| Hero headline | Oswald 700, UPPERCASE | 40px (login 56px) | Some words wrapped in `<mark>`, rendered as `accent` text |
| Body | Inter 400/500 | 14–15px | |
| Name | Inter 600 | 16px | Player names in lists |
| Meta | Inter 400, `muted` | 12–13px | |
| Field label | Inter 600, UPPERCASE | 12px, tracking `0.08em` | "MOBILE NUMBER", "DATE" |
| Chip | Inter 600 | 11–12px | Status chips are uppercase with a leading dot |

Fonts load through `next/font/google` (Oswald 500/600/700, Inter 400/500/600/700) and are exposed as `font-display` and `font-sans`.

### 1.3 Radius, borders, shadows, spacing

| Token | Value | Used on |
|---|---|---|
| `rounded-xl` | 12px | Buttons, inputs, inner court slot cards, attendance toggle group |
| `rounded-2xl` | 16px | All cards, KPI cards, product cards, the hero ad |
| `rounded-full` | pill | Filter pills, chips, avatars, the tab-segment track |
| `shadow-hard` | `3px 3px 0 #111111` | Primary buttons ("Enter academy", "Record payment", "Add player", "Take attendance", "Save attendance") |
| `shadow-hard-primary` | `4px 4px 0 #1F3FBF` | The "Most Popular" plan card, which also gets a 1.5px `ink` border |
| `shadow-card` | `0 1px 2px rgba(17,17,17,.04)` | Default card: a 1px `line` border and an almost flat shadow |
| Card padding | 20px (`p-5`); dense lists use 16px | |
| Page padding | 32px horizontal, 32px top (desktop); 16px on mobile | |
| Grid gap | 16px (KPIs, products); 12px (player cards) | |
| Sidebar width | 256px expanded, 72px collapsed | |
| Top bar height | 64px | |

Pressed state for hard-shadow buttons: `translate(2px,2px)` with the shadow reduced to `1px 1px 0`.
Focus ring: `ring-2 ring-primary ring-offset-2` on every interactive element.

### 1.4 Iconography
lucide-react, 20px, stroke 1.75. Mapping: Dashboard `LayoutGrid`, Players `Users`, Attendance `CalendarCheck`, Fees `ReceiptIndianRupee`, Store `ShoppingBag`, Fee Structure `BadgePercent`, Sign out `LogOut`, Collapse `ChevronsLeft`, Bell `Bell`, phone `Phone`, PIN `Lock`, search `Search`, filters `SlidersHorizontal`, location `MapPin`, time `Clock`, warning `TriangleAlert`, receipt `FileText`, tag `Tag`, Edit `Pencil`, check `Check`, Save `Save`, Mark all `CheckCheck`, Add player `UserPlus`, Add plan/Record `Plus`.

---

## 2. Components (shared library)

| Component | Spec |
|---|---|
| **Button** | Variants: `primary` (blue fill, white text, `shadow-hard`, 44px tall, `rounded-xl`, 600 weight), `secondary` (white, 1px `line` border, ink text; used for "Fee structure", "Edit plan", "Mark all present"), `accent` (yellow fill, ink text, no shadow; "Shop now"), `ghost`/`link` (primary text + arrow). Optional leading/trailing icon. |
| **PageHeader** | Eyebrow plus Oswald title on the left, with an actions slot on the right. On mobile the actions wrap under the title, and the primary action may turn into a FAB-style sticky button. |
| **Card** | White, `rounded-2xl`, 1px `line` border, `p-5`. Variant `outlined-ink` draws a 1px `ink` border (attendance summary, Fees ad strip). |
| **KpiCard** | Label (Inter 14 muted), icon tile at top-right (40px, `rounded-xl`, `primary` fill with white icon, or `alert-50` with orange icon for dues), Oswald number, and a meta line. **Accent bar:** a 40×4px `rounded-full` bar sitting on the top edge, inset 12px from the left (`accent` by default, `alert` for dues, `primary` for "Via UPI"). The Fees page uses a compact variant without the icon. |
| **Chip** | `status`: PAID (`primary` fill, white text, white dot), DUE (`alert` fill, white text, white dot). `level`: Beginner (`chip-grey`, ink), Intermediate/Advanced (white with 1px `primary` border and `primary` text), Tournament (`accent` fill with 1px ink-ish border, ink text). `mode`: UPI (`primary-50`, `primary` text), Cash (`chip-grey`, ink). `slot`: DONE (`chip-grey`, muted), UPCOMING (`primary-50`, `primary`). |
| **Avatar** | Sizes 32/40/48/56. Shows the photo when `photoUrl` is set, otherwise a `primary` circle with `accent` Oswald initials. The top-bar user avatar inverts this: `accent` circle, ink initials, 1px ink border. |
| **FilterPill / PillGroup** | `rounded-full`, 40px tall (44px on touch), 1px `line` border, white. Active: `accent` fill, ink text, 600 weight. Behaves as a single-select radiogroup. |
| **Select** | White, 1px `line`, `rounded-xl`, 40px, `ChevronDown`. Native `<select>` styled, so mobile pickers work. |
| **SearchInput** | Full width, 48px, `rounded-xl`, leading `Search` icon. |
| **Input / Field** | Uppercase label above, input with an optional leading icon, 48px, `rounded-xl`, error text below in alert colour. |
| **SegmentedTabs** | A track (`surface`, `rounded-xl`) holding tabs. The active tab is a `primary` fill with white text and `rounded-xl`; the rest are muted. "Pending (9)" carries a count. |
| **DataTable** | Header row on `surface`, rows 56px with a 1px `line` divider. It turns into a card list below `md` (see §4). |
| **ToggleGroup (Present/Absent)** | Two joined buttons with a 1px `line` border and `rounded-xl`. Present when selected: `primary` fill, white. Absent when selected: `alert` fill, white. Unselected: white with ink text and icon. |
| **StepLabel** | A 20px `primary` circle with a white number, followed by an uppercase label ("1 DATE"). |
| **SelectableCard** | Batch picker. Selected: `primary` fill, white title, `accent` meta line, `accent` check at the right. Unselected: white card with a `line` border. |
| **CourtCard** | `surface` panel, `rounded-2xl`, holding an Oswald "COURT 1" title, a `MapPin` + surface type on the right, and a stack of **SlotCard**s (white, `rounded-xl`: blue time with `Clock`, a status chip, the batch name, "Coach X · N players"). An empty slot renders as a dashed/very light card reading "Open for court booking". |
| **PaymentRow** | Avatar, name, meta "05 Nov 2026 · UPI · Annual", and the amount right-aligned in Oswald `primary`. |
| **DueRow** | A card with a 3px `alert` left rule; name, then batch plus level chip; on the right, the orange amount over "19 days". |
| **PlayerCard** | 56px avatar; name at Inter 600 16px; status chip at the top-right; "RKS101 · 12 yrs"; level chip plus "Batch · Court" meta. The whole card is a link to the profile. |
| **PlanCard** | Level label (muted 13px), Oswald title, Oswald price with period, 3 perks with `Check` icons, and a full-width secondary "Edit plan" button. The `mostPopular` variant adds an ink border, `shadow-hard-primary`, and a yellow "MOST POPULAR" badge straddling the top edge. |
| **PolicyCard** | 48px icon tile, label, Oswald value (orange for the late fee), description. |
| **InfoNote** | `surface` bar with an icon and muted text ("Policies apply automatically…"). |
| **ProductCard** | Square image (`aspect-square object-cover`, rounded top). Orange tag at the top-left (Inter 700 11px uppercase, white on `alert`, `rounded-md`). Rating pill at the bottom-right (white, star icon in yellow with an ink stroke, "4.8"). Below: "YONEX · RACKETS" (Inter 700 11px, tracking 0.2em, `primary`), name (Inter 500 16px), Oswald price plus struck MRP. |
| **ProductAd** | `hero` / `inline` / `strip`; see §3.9. |
| **Sheet** | A right-side drawer from `md` up: 420px, full height, header with title, subtitle and `X`, a scrollable body, and a footer action, over a dimmed and blurred backdrop. Below `md` it is a bottom sheet (`rounded-t-2xl`, drag handle, max-h 90vh, safe-area padding). Built on a single `<Dialog>` primitive with a focus trap and Esc to close. |
| **Skeleton** | `surface`-coloured shimmer blocks shaped like each card type. |
| **EmptyState** | Icon in a pale tile, Oswald title, muted line, optional action. |
| **Toast** | Bottom-centre on mobile (above the tab bar), top-right on desktop. Error toasts carry an `alert` left rule. |

---

## 3. Screens

### 3.0 App shell (every authenticated screen)
- **Sidebar** (white, right border `line`, 256px): a header block with the 48px crest, "RKS ACADEMY" (Oswald 700 24px `primary`) and "Ramanathapuram, Tamil Nadu" (12px muted), with a divider under it. Nav items are 48px tall, `rounded-xl`, 16px horizontal padding, icon + label at Inter 500 16px. **Active:** `primary` fill, white text, a yellow icon, and a 4px yellow tick on the left edge. Order: Dashboard, Players, Attendance, Fees, Store, Fee Structure. A bottom block, separated by a divider, holds **Sign out** and **Collapse** (`ChevronsLeft`).
- **Top bar** (white, 64px, bottom border): "Vanakkam," (12px muted) over "Coach R. Sethupathi" (Inter 600 16px) on the left. On the right: a `Bell` with an orange 8px dot and a 44px yellow avatar showing "RS".
- **Content**: `surface` background, max width roughly 1240px, 32px padding.

### 3.1 Login
- A split screen, 50/50. **Left:** a full-bleed badminton photo with a `primary` multiply tint and a gradient to `navy` at the bottom. Bottom-left copy: the eyebrow "EST. RAMANATHAPURAM" (`accent`, tracking 0.25em), then the headline "TRAIN HARD. **PLAY PROUD.**" (Oswald 56px, white with the last two words in `accent`), then "4 courts · 6 batches · 3 coaches — one place to run the academy." (white/80).
- **Right:** a white panel with the content centred at max-w 380px: the crest (about 190px), "RAJA KUMARAN SETHUPATHI SPORTS ACADEMY" (Oswald 700 32px ink, centred), "Ramanathapuram · Admin console" (muted), the MOBILE NUMBER field (`Phone` icon, +91 prefix), the PIN field (`Lock` icon, masked, 4–6 digits), and a full-width "Enter academy →" primary button with the hard shadow.
- The caption "Prototype — any input works." is **replaced** by real auth errors. Optionally a "Forgot PIN? Contact the owner." line.

### 3.2 Dashboard
1. **Hero ProductAd**: a `navy` card, `rounded-2xl`, about 240px tall. A product action image is anchored right and faded into the navy. On the left: an "18% OFF" orange tag plus the "RKS PRO SHOP · SPONSORED" eyebrow (white/70), the Oswald headline "SMASH HARDER **THIS SEASON**", a body line with the price and struck MRP, and a yellow "Shop now →" button.
2. **PageHeader**: the eyebrow is today's date ("THURSDAY, 05 NOV 2026"), the title is "ACADEMY OVERVIEW", and the action is "Take attendance" (primary, `CalendarCheck`).
3. **KPI row** (4 columns): Active players `30` / "+3 this month"; Today's attendance `86%` / "22 of 26 checked in"; Fees collected `₹66,900` / "November · 12 payments"; Pending dues `₹35,900` (orange) / "9 players", with an orange accent bar and the orange icon tile.
4. **Today on court** card: the title on the left and "● Live status" on the right. Four CourtCards sit in a 4-column grid, each listing that day's slots, with "Open for court booking" placeholders where a court has only one slot.
5. Bottom grid (≈ 3fr / 2fr): **Recent payments** (6 PaymentRows, "View all →" pointing to Fees) and **Dues alert** (a "⚠ 9 due" pill plus the top 5 DueRows sorted by days overdue).

### 3.3 Players
- PageHeader: eyebrow "30 ENROLLED · 6 BATCHES", title "PLAYERS", action "Add player" (`UserPlus`).
- A filter card holding: the SearchInput "Search by name or ID (e.g. RKS105)"; row 2 with the "All batches" select, the "All courts" select, and fee-status pills (Any fee status / Paid / Due); row 3 with the `SlidersHorizontal` icon and level pills (All levels / Beginner / Intermediate / Advanced / Tournament).
- "Showing **30** players" (muted, with the count in bold).
- A 3-column PlayerCard grid.
- An **inline ProductAd** at the bottom: a white card holding an 80px product thumbnail, the eyebrow "FROM THE RKS PRO SHOP", an Oswald product name, the `primary` price with struck MRP, an orange "ACADEMY PRICE" tag clipped to the top-right corner, and a `primary` `ArrowRight` at the far right.

### 3.4 Attendance
- PageHeader: eyebrow "DAILY CHECK-IN", title "ATTENDANCE".
- Selector card: **1 DATE** (a date input showing DD-MM-YYYY, with a calendar icon) and **2 COURT** (pills Court 1–4) on the same row; below them, **3 BATCH** with a 2-column SelectableCard for that court's batches (name plus "6:00 AM – 7:00 AM · Coach S. Divya").
- Summary card (`outlined-ink`): "**0** Present  **0** Absent  **4** Unmarked". The numbers are Oswald 24px in blue, orange and ink. "Mark all present" (secondary, `CheckCheck`) sits on the right, and a thin progress track (`surface`, filled with `primary`) runs along the bottom.
- Rows: a white card with a 48px avatar, the name, then "RKS101" plus a level chip, and the Present/Absent ToggleGroup on the right.
- "Save attendance" (primary, `Save`) sits below the list.

### 3.5 Fees
- PageHeader: eyebrow "COLLECTIONS & DUES", title "FEES". Actions: "Fee structure" (secondary) and "Record payment" (primary, `Plus`).
- 3 compact KPI cards: Collected `₹66,900` (yellow bar), Pending `₹35,900` (orange bar, orange number), Via UPI `79%` (blue bar).
- SegmentedTabs, centred on the track: **Collections** | Pending (9) | History.
  - *Collections*: this month's payments.
  - *Pending*: the dues list (DueRow layout with a "Record payment" quick action).
  - *History*: all payments, paginated, with month and mode filters.
- Table columns: Player (32px avatar + name) · Receipt (muted mono-ish) · Plan · Date · Mode chip · Amount (Oswald `primary`, right-aligned) · "Receipt" link (`FileText` icon, `primary`).
- A **strip ProductAd** at the bottom: an `outlined-ink` bar with a 40px orange tag tile, "**19% OFF** · Li-Ning Saga Lite Court Shoe at ₹3,499", and a dismiss `X` at the right.

### 3.6 Fee Structure
- PageHeader: eyebrow "PLANS & POLICIES", title "FEE STRUCTURE", action "Add plan".
- 4 PlanCards: Monthly ₹1,500/month (Beginner & Intermediate); **Quarterly ₹4,200 per 3 months, Most Popular** (All skill levels); Annual ₹15,000/year (All skill levels); Tournament Squad ₹2,500/month (Advanced & Tournament). Perks are exactly as shown.
- "POLICIES" section title, then 3 PolicyCards:
  - Registration fee ₹1,000 ("Academy jersey, ID card & insurance cover"), with a `Ticket` icon on a blue tile.
  - Sibling discount 10% off ("10% off the second child's plan, 15% off the third"), with a `Users` icon on a blue tile.
  - Late fee rule ₹100, in orange ("₹100 after the 10th of the month, then ₹10/day (max ₹300)"), with a `Clock` icon on an orange tile.
- InfoNote: "Policies apply automatically when fees are recorded. Changes take effect from next billing cycle."
- *Added (not in the screenshot):* an "Edit policies" secondary button above the policy cards, which opens a policy sheet.

### 3.7 Store
- PageHeader: eyebrow "RKS PRO SHOP · ACADEMY PRICES", title "STORE".
- SearchInput "Search rackets, shuttles, shoes…".
- Category pills: All / Rackets / Shuttlecocks / Shoes / Grips / Bags / Jerseys.
- A 4-column ProductCard grid of 12 products (see the seed data in PLAN.md).

### 3.8 Player Profile, Product Detail and Record Payment (references added 2026-11-07)

**Player Profile** `/players/[id]`, from `Individual.png`
- A "← All players" back link (primary, Inter 500).
- **Header card** (`outlined-ink`, `rounded-2xl`, overflow hidden):
  - The top band is about 96px of `primary` with thin diagonal stripes (a `repeating-linear-gradient` of white at 8% opacity, 45°). A 96px avatar with a 3px white ring overlaps the band and the white body; it uses initials because players have no photos.
  - The name is Oswald 700 at 36px, UPPERCASE, followed by a PAID/DUE chip.
  - The meta line reads "RKS101 · 12 yrs · Boy ·" followed by a level chip. Gender maps MALE to Boy and FEMALE to Girl.
  - On the right: "Call parent" (secondary, `Phone`, a `tel:` link) and "Collect fee" (primary, `ReceiptIndianRupee`, owner only; opens the Record payment drawer for this player).
- **3 info cards** (3 columns): PERSONAL, PARENT, TRAINING.
  - PERSONAL and PARENT are lists of rows, each with a 16px `primary` icon, a muted 12px label and a 16px value, separated by `line` dividers.
    - Personal: Date of birth (`Cake`), Blood group (`Droplet`), School (`GraduationCap`), Address (`MapPin`).
    - Parent: Guardian (`User`), Phone (`Phone`), Occupation (`Briefcase`), Joined RKS (`Cake`/`CalendarDays`).
  - TRAINING is laid out differently:
    - A `primary` batch tile: the "BATCH" eyebrow in white/70, the batch name in Oswald 22px white UPPERCASE, and the time in `accent`.
    - Two `surface` mini tiles: Court and Plan, each with a muted label above a 18px semibold value.
    - A white coach row: a 44px initials avatar, "Coach S. Divya" and the title "Junior Coach" in muted text.
- **ATTENDANCE card** (≈ 3fr) and **SKILL PROGRESS card** (≈ 2fr) sit side by side.
  - Attendance:
    - The % sits at the top-right in Oswald 32px `primary`.
    - The grid has 7 rows (M T W T F S S), with week columns labelled by month at the top. Cells are 24px, `rounded-md`.
    - Present = `primary`, Absent = `alert`, No session = `surface`. Today gets a 2px `accent` ring.
    - The legend reads "Present (82) · Absent (0) · No session".
  - Skill progress:
    - At the top, a 4-step level stepper. Done or current steps show a numbered `accent` circle with ink text; future steps are a white circle with a `line` border. The last step uses a `Trophy` icon. Labels sit below at 12px, and the connector line is `line`.
    - Below that, 5 skill bars: Footwork, Smash, Defence, Net play, Stamina. Each shows the label with "45/100" on the right, then an 8px `surface` track with a `primary` fill and an 8px `accent` knob at the end.
    - Owners and coaches can edit the scores with an "Update skills" sheet.
- **FEE HISTORY card** (owner only; coaches don't see this card at all). It is a vertical timeline:
  - The newest item has an `accent` dot; older items have `primary` ring dots, joined by a 2px `line` rail.
  - Each item shows the title "Nov 2026 · Monthly" (Inter 600 18px), the meta "05 Nov 2026 · UPI · Receipt RKS/26/1000" (the receipt number links to the receipt view), and the amount on the right in Oswald `primary`.
  - A current due is shown as a hollow `alert` dot with the amount in `alert`.

**Product Detail** `/store/[id]`, from `Product.png`
- A "← Back to store" link.
- Left column, about 50%: a square main image (`rounded-2xl`) with the orange tag at the top-left; below it, 96px thumbnails. The active thumbnail has a 2px `primary` ring.
- Right column:
  - "YONEX · RACKETS" (eyebrow), then the name in Oswald 40px UPPERCASE.
  - "★ 4.8 · 126 reviews · **Only 6 left**", with the stock warning in `alert` 600 when stock ≤ 10.
  - A price row: Oswald 44px `primary`, then the struck MRP, then a **yellow** "Save ₹2,500" chip (ink text). The chip is yellow, not orange.
  - The description (muted 16px).
  - The variant group label ("WEIGHT / GRIP", in the field-label style) and variant pills, with the selected one yellow.
  - The full-width primary "Enquire on WhatsApp" button with the hard shadow.
  - Three `surface` assurance tiles: Pick up at academy (`Package`), 100% genuine (`ShieldCheck`) and Ramnad delivery (`Truck`). Each has the icon in `primary` and muted 13px text.
  - A specs table: a white card with zebra rows (`surface` on even rows), the label muted on the left and the value at 600 on the right.
- "YOU MAY ALSO LIKE": 4 ProductCards from the same category first, then the same brand.
- The WhatsApp link is `https://wa.me/${APP_WHATSAPP_NUMBER}?text=` with the product, variant and price URL-encoded.

**Record Payment drawer**, from `Record payment.png`
- On desktop this is a **right-side drawer** (420px, full height, white, a `line` left border). The page behind it is dimmed and blurred (`bg-ink/20 backdrop-blur-sm`). Below `md` it becomes a bottom sheet.
- Header: the title "RECORD PAYMENT" (Oswald 28px), the subtitle "Log a fee collection and generate a receipt." (muted), and an `X` close button at the top-right; a divider separates it from the body.
- The body runs top to bottom:
  - **PLAYER**, a searchable select showing "Aravind Murugan · RKS101".
  - An info box (`surface`, `rounded-xl`) reading "Monthly plan · ₹1,500 per month" (600 weight), with "Morning Beginners · No dues" below (muted). When the player has a due, that second line reads "Due ₹1,500 · 4 days" in `alert`.
  - **AMOUNT (₹)**, an input prefilled with the server quote total. A small breakdown below it lists the plan, sibling discount, late fee and registration fee, shown only when any of them is non-zero. If the amount is edited away from the quote, a required "Reason" field appears and the difference is saved as an adjustment.
  - **MODE**, two equal toggle buttons: Cash (`Banknote`) and UPI (`Smartphone`). The selected one is `accent`-filled with an ink border.
  - **DATE**.
  - "Save & generate receipt" (primary, full width, `CircleCheck`), which opens the receipt view on success.
- **Every sheet** (Add/Edit Player, Add/Edit Plan, Update skills, Edit policy, Filters) follows this same drawer anatomy. No screenshot exists for the Add/Edit Plan sheet, so it uses this anatomy with these fields: Name, Level label, Price, Period (1/3/6/12 months), Sessions per week, Perks (an editable list of up to 6), and a Most Popular switch.
- **Receipt** `/receipts/[receiptNo]`: an A5-like white sheet with the crest, the academy name, the receipt no. "RKS/26/1126", date, player name and ID, plan, period from–to, a line-item table, the total in words and figures, the mode, a "Received by" line, and a footer. Its `@media print` stylesheet hides the shell and prints the receipt alone. A "Print" button calls `window.print()`.

### 3.9 ProductAd variants
| Variant | Where | Look | Mobile |
|---|---|---|---|
| `hero` | Dashboard top | Navy banner, tag + sponsored eyebrow, Oswald headline with yellow words, price line, yellow Shop now | Image moves behind the text as a dimmed backdrop; height grows to fit; button full width |
| `inline` | End of the Players list | White card, thumbnail, eyebrow, name, price, orange corner tag, arrow | Same, with the name clamped to 2 lines |
| `strip` | Fees bottom | Ink-outlined bar, orange tag tile, one-line copy, dismiss X | Fixed above the bottom tab bar, inset 12px, single-line truncate |

The backend picks the product through `GET /products/ads?placement=hero|inline|strip`. Each screen shows at most one ad. Dismissal goes into `sessionStorage` keyed by `ad:<placement>:<productId>`, wrapped in try/catch. Every ad links to the Product Detail page.

---

## 4. Responsive behaviour (mobile-first)

| Breakpoint | Shell |
|---|---|
| `< md` (< 768) | No sidebar. Sticky 56px top bar: crest + "RKS ACADEMY" on the left, bell + avatar (opens a menu with Fee Structure and Sign out) on the right. Fixed bottom tab bar, 64px plus safe-area: Home, Players, Attendance, Fees, Store. The active tab is a `primary` icon and label with a yellow 3px top tick. Content gets bottom padding equal to the tab bar height. The "Vanakkam" greeting moves into the page content as a small line above the PageHeader on Dashboard. |
| `md`–`lg` (768–1023) | Icon-only sidebar (72px), with labels shown as tooltips; no Collapse toggle. The top bar keeps the greeting. |
| `≥ lg` | Full sidebar as in the screenshots. The Collapse toggle switches between 256 and 72px and the choice is persisted in localStorage. |

Per screen:
- **Login**: below `md` the image panel becomes a 35vh top banner (photo with tint, the eyebrow and headline at 36px, the sub-line hidden). Below it sits the white form panel with a smaller crest (96px) and the name at 22px. Inputs are 48px and the button is 48px.
- **Dashboard**: the hero is stacked. KPIs sit in a `grid-cols-2` grid (with a smaller KPI number of 24px). Today on court becomes a horizontal `snap-x` scroller of court cards at 85% width with peek. Recent payments and Dues alert stack, with dues first because they are actionable. "Take attendance" turns into a full-width button under the title.
- **Players**: the search box sits on top, beside a "Filters (n)" button that opens a bottom sheet with batch, court, fee status and level, plus Apply/Reset. The card grid runs 1 column, then 2 at `md`, then 3 at `lg`. "Add player" becomes an icon+label button in the header.
- **Attendance**: date, court and batch stack vertically; the court pills scroll horizontally. The summary keeps the counts on one line, with "Mark all" as an icon button. Rows keep the toggle on the right, compacted to icon-only buttons of 44×44. "Save attendance" becomes a sticky bar above the tab bar.
- **Fees**: the KPIs scroll horizontally or sit in a 3-column grid of compact numbers. The tabs go full width. The table becomes cards (avatar, name, plan, date, mode chip, amount, receipt link). The ad strip sits above the bottom nav.
- **Fee Structure**: plans run 1 column, then 2 at `md`, then 4 at `lg`; the policies stack.
- **Store**: 2 columns, then 3 at `md`, then 4 at `lg`. Category pills scroll horizontally. On mobile the cards use a smaller price (18px) and a 2-line name clamp.
- **Product Detail**: the gallery comes first, then the info. The WhatsApp CTA is a sticky bottom bar above the tab bar.
- **All drawers** (sheets) become bottom sheets below `md`. The minimum tap target is 44px. `overflow-x: clip` is set on the body, and every scroller is explicit.

---

## 5. Gaps and inconsistencies found in the references (I'll handle them as noted)
1. **Dues amounts don't follow the late-fee rule.** For example, Gokul is 19 days overdue at ₹1,500 with no late fee, while Ishwarya shows ₹2,600 (2,500 + 100). The amounts will be **computed** by the rules engine, so they will differ slightly from the screenshot. I'll seed period dates so the order and day counts match.
2. **"22 of 26 checked in"**: today's attendance will be computed from seeded records for batches already held (roughly 85–86%).
3. **Receipt numbers** in the Fees table are not sequential (1126, 1000, 1133…). I'll seed them exactly as shown and continue new receipts from the max + 1.
4. **Photos:** players never use photos; everyone gets the initials avatar, though a photo can be uploaded later. Product, banner and login images are crops from the screenshots, kept in `frontend/public/demo/` so the real ones can be swapped in.
5. **Login caption** "Prototype — any input works." will not be shipped.
