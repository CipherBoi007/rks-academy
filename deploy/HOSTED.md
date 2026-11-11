# Hosting on Vercel + Render + Supabase

```
Parents & staff ──▶ Vercel (Next.js, region sin1) ──▶ Render (Spring Boot API, Singapore) ──▶ Supabase (PostgreSQL, Singapore)
                     holds the session cookies         answers only requests that carry        data + uploaded photos
                                                        the shared proxy key
cron-job.org ──every 14 min──▶ API health check (keeps Render awake; also touches the database)
GitHub Actions ──every 3 days──▶ database query + encrypted backup (keeps Supabase awake)
```

Put all three in **Singapore**. Every page makes several database calls, so splitting regions makes each page slow.

> **Free-tier fine print.**
> - Vercel's Hobby plan is for **non-commercial** use, so a business using the app needs Vercel Pro.
> - Render's free plan sleeps after 15 idle minutes and gives you 750 instance-hours a month. That is enough for one always-on service, so don't run a second free service.
> - Supabase's free plan pauses after 7 idle days and keeps no backups you can download.
>
> This guide works around the sleeping and pausing. It can't work around the plan terms.

---

## 1. Put the code on GitHub

Create a **private** repository and push the whole `RKS` folder: `frontend/`, `backend/`, `render.yaml` and `.github/`. Vercel and Render both deploy from it.

## 2. Supabase: the database

1. On [supabase.com](https://supabase.com), create a **New project**.
   - Region: **Southeast Asia (Singapore)**.
   - Database password: use **letters and digits only**. This avoids URL-encoding trouble later. Save it in a password manager.
2. **Turn off the Data API.** The app never uses it.
   - Go to *Project Settings → Data API*.
   - Disable it, or remove `public` from *Exposed schemas*.
   - The app also turns on row-level security for every table, as a second lock.
3. Get the connection details:
   - Click **Connect**, then choose **Session pooler**. Don't use *Direct connection*: it is IPv6-only and Render can't reach it.
   - Don't use the *Transaction pooler* either, because it breaks Java prepared statements.
   - You'll see something like:
     `postgresql://postgres.abcdefghijkl:[YOUR-PASSWORD]@aws-0-ap-southeast-1.pooler.supabase.com:5432/postgres`
   - Write down three values:
     - **host**: `aws-0-ap-southeast-1.pooler.supabase.com`
     - **user**: `postgres.abcdefghijkl`
     - **password**

You don't create any tables yourself. The API creates them on first start (Flyway migrations V1–V6).

## 3. Generate every value (one script)

From Command Prompt or PowerShell:

```cmd
powershell -ExecutionPolicy Bypass -File D:\RKS\deploy\make-env.ps1
```

It asks for the Supabase Session pooler URI and password, your addresses, and the owner's name and mobile. It then writes these files to `deploy\secrets\`, which git ignores:

| File | Where it goes |
|---|---|
| `render.env` | Render → Environment → *Add from .env* |
| `vercel.env` | Vercel → Settings → Environment Variables (paste) |
| `github-secrets.txt` | GitHub → Settings → Secrets and variables → Actions |
| `cron-job.txt` | cron-job.org |
| `create-owner.cmd` | Double-click once Render is live (step 5) |

Secrets are generated once and reused. Run it again whenever an address changes, for example once you know your Vercel URL.

To generate a single secret by hand instead, run this in **PowerShell** (not Command Prompt). It prints a random value:

```powershell
$b = New-Object byte[] 48; [Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($b); [Convert]::ToBase64String($b)
```

- Run it once for the **proxy key**. Render calls it `APP_PROXY_KEY` and Vercel calls it `BACKEND_PROXY_KEY`. Use the same value in both.
- Run it again for the **backup passphrase**, used in step 7. Keep it safe: without it, your backups can't be opened.

Render generates the JWT secret by itself.

## 4. Render: the API

1. On [render.com](https://render.com), go to **New → Blueprint**, pick your repository, and Render reads `render.yaml`.
2. It asks for the secret values:

   | Key | Value |
   |---|---|
   | `DB_URL` | `jdbc:postgresql://<host>:5432/postgres?sslmode=require` |
   | `DB_USERNAME` | `postgres.<project-ref>` |
   | `DB_PASSWORD` | your Supabase password |
   | `APP_PROXY_KEY` | the proxy key from step 3 |
   | `APP_FRONTEND_ORIGIN` | put `https://example.com` for now and fix it in step 6 |

3. Deploy. The first build takes about 5–10 minutes.
4. Open `https://<service>.onrender.com/actuator/health`. It should show `{"status":"UP"}`.
5. Open `https://<service>.onrender.com/api/v1/config/public`. It should return **404**: the API ignores anyone without the proxy key. That's correct.

Also set these in *Environment* when you have them. Each change redeploys.

- `APP_WHATSAPP_NUMBER`: the academy's real WhatsApp number, digits with country code, e.g. `9198xxxxxxxx`.
- `APP_ACADEMY_PHONE`: printed on receipts.

> `APP_REMINDERS_ENABLED` starts as `false`. Leave it off until WhatsApp is live (section 8). In "log" mode a month's reminders are recorded as sent and won't go out again later.

## 5. Create the owner login (once, from your PC)

Render's free plan has no shell, so run the one-time owner setup on your own machine against Supabase. It needs Java 21.

```powershell
cd D:\RKS\backend
mvn -q -DskipTests package
$env:DB_URL = "jdbc:postgresql://<host>:5432/postgres?sslmode=require"
$env:DB_USERNAME = "postgres.<project-ref>"
$env:DB_PASSWORD = "<supabase password>"
$env:APP_JWT_SECRET = "only-needed-to-start-not-stored-0123456789"
java -jar target\rks-academy.jar --setup-owner --name="R. Sethupathi" --mobile=9xxxxxxxxx --server.port=0
Remove-Item Env:DB_PASSWORD, Env:DB_URL, Env:DB_USERNAME, Env:APP_JWT_SECRET
```

- It prints a **one-time PIN**. Sign in with it and you'll be asked to set your own.
- It refuses to run if an owner already exists.
- Production never has the demo data or the dev login (9000000000 / 1234).

## 6. Vercel: the web app

1. On [vercel.com](https://vercel.com), go to **Add New → Project** and import the repository.
2. Set **Root Directory** to `frontend`. Next.js is detected automatically.
3. Add these environment variables (Production):

   | Key | Value |
   |---|---|
   | `BACKEND_URL` | `https://<service>.onrender.com` (no trailing slash) |
   | `BACKEND_PROXY_KEY` | the proxy key from step 3 |

4. Deploy. `frontend/vercel.json` pins the server functions to Singapore (`sin1`).
5. Go back to Render and set `APP_FRONTEND_ORIGIN` to your Vercel address, e.g. `https://rks-academy.vercel.app`. If you add your own domain later, use that instead.
6. Open the site, sign in as the owner, and change the PIN.

## 7. Keeping everything awake

**Render (every 14 minutes).** Use [cron-job.org](https://cron-job.org). It's free, runs on time, and emails you when the API is down.

1. Sign up, then click **Create cronjob**.
2. URL: `https://<service>.onrender.com/actuator/health`.
3. Schedule: every **14** minutes.
4. Turn on *Notify me on failure*.

Each ping also checks the database connection, so Supabase sees activity all day too.

> Why not ping from the web app itself?
> - A browser only pings while someone has the app open, so nothing would ping at night.
> - Vercel's Hobby cron runs at most once a day.
>
> If your repository is **public**, you can use the included workflow instead: set repository variable `KEEP_API_AWAKE=true` and secret `API_HEALTH_URL`. Don't use it on a private repository: about 3,100 runs a month is more than GitHub's free 2,000 minutes.

**Supabase (every 3 days) plus backups.** `.github/workflows/keep-db-awake.yml` runs a light query every third day at 03:00 IST. When a passphrase is set, it also saves an encrypted backup, kept for 3 weeks.

1. In GitHub, go to **Settings → Secrets and variables → Actions → New repository secret**:
   - `SUPABASE_DB_URL` = `postgresql://postgres.<project-ref>:<password>@<host>:5432/postgres?sslmode=require`
   - `BACKUP_PASSPHRASE` = the passphrase from step 3
2. Go to **Actions → Keep database awake → Run workflow** to test it now. The log should show `courts: N`, and the run should have a backup file attached.

To restore a backup, download the artifact, then:

```bash
gpg --decrypt rks-20261111-0300.dump.gpg > rks.dump      # asks for the passphrase
pg_restore --clean --if-exists --no-owner -d "postgresql://...<target database>..." rks.dump
```

Practise this once on a spare Supabase project. A backup you've never restored isn't a backup.

## 8. WhatsApp (Meta), from zero

You need this for both **fee reminders** and **parent sign-in codes**. Until it's done, parents can't sign in to the family app. Staff logins work without it.

**A. Accounts (one-time, ~20 minutes)**

1. Use a personal Facebook account (it stays private) to open [business.facebook.com](https://business.facebook.com). Create a **Business portfolio** named *Raja Kumaran Sethupathi Sports Academy*.
2. Open [developers.facebook.com](https://developers.facebook.com) and go to **My Apps → Create app**.
   - Use case: **Connect with customers through WhatsApp**. On older screens, choose type **Business**.
   - Link it to the business portfolio.
3. In the app, open **WhatsApp → API Setup**. Meta gives you a free **test number** and a **temporary token** that lasts 24 hours.
4. Under *To*, add **your own mobile** and verify it with the code Meta sends. While testing, the test number can only message up to 5 verified numbers.

**B. Templates.** Open **WhatsApp Manager → Message templates → Create template**. When choosing the language, pick **English**, not "English (US)": the app sends language code `en`.

1. **`fee_reminder`**
   - Category: **Utility**.
   - Body, exactly:
     ```
     Vanakkam {{1}}! Fee reminder from RKS Academy for {{2}} ({{3}}): {{4}} plan for {{5}} is {{6}}. Please pay by {{7}} to avoid a late fee. Thank you!
     ```
   - Samples: `K. Murugan`, `Aravind Murugan`, `RKS101`, `Monthly`, `Nov 2026`, `₹1,500`, `10 Nov 2026`.
2. **`login_code`**
   - Category: **Authentication**.
   - Code delivery: **Copy code**.
   - Meta writes the text ("*{{1}} is your verification code.*"). Optionally add the security note and a 5-minute expiry; codes expire after 5 minutes anyway.

Approval usually takes minutes, sometimes up to a day.

**C. A token that doesn't expire**

1. In **Business settings → Users → System users**, click **Add**. Give it a name like `rks-api` and the role **Admin**.
2. Click **Assign assets**:
   - your **app**, with full control
   - your **WhatsApp account**, with full control
3. Click **Generate token**:
   - App: yours
   - Expiry: **Never**
   - Permissions: `whatsapp_business_messaging` and `whatsapp_business_management`
4. Copy the token now, because Meta won't show it again.

**D. Test it with the test number**

1. In Render, set:
   ```
   APP_WHATSAPP_PROVIDER=cloud
   APP_WHATSAPP_PHONE_NUMBER_ID=<"Phone number ID" on the API Setup page; not the phone number>
   APP_WHATSAPP_ACCESS_TOKEN=<system user token>
   ```
2. Sign in as the owner and go to **Settings → WhatsApp → Send test** with your verified mobile. You should get the fee reminder.
3. Sign in at `/family` with a player whose parent mobile is your verified number. The code should arrive on WhatsApp.
4. If something fails, the app shows Meta's exact error. For example:
   - `(#132001) Template name does not exist`: wrong name or language.
   - `(#131030) Recipient phone number not in allowed list`: the number isn't verified for the test number.

**E. Go live with the academy's own number**

1. Choose a number that isn't on WhatsApp. If it's in the WhatsApp app now, delete that WhatsApp account from the phone first. A new SIM is simplest.
2. Go to **WhatsApp Manager → Phone numbers → Add phone number**.
   - Display name: *RKS Academy*. Meta reviews it, usually within a day.
   - Verify the number by SMS or call, and set a two-step PIN.
3. Under **WhatsApp Manager → Payment settings**, add a payment method. Meta bills each template message, roughly ₹0.12 each for utility and authentication messages in India. Check Meta's current pricing page.
4. Optional, but do it soon: run **Business verification** in Business settings → Security Centre (GST or Udyam documents). Unverified businesses can message about 250 people a day. That's enough to start, but verification lifts the limit.
5. If Meta asks you to switch the app to **Live** mode, it needs a public **privacy policy URL**. Since the app stores children's details, have one anyway (India's DPDP Act).
6. In Render, change `APP_WHATSAPP_PHONE_NUMBER_ID` to the new number's ID. Send yourself a test again.
7. Set `APP_REMINDERS_ENABLED=true`. From now on, reminders go out at **09:00 IST on the 1st**. If Render was asleep or restarting at that moment, they are sent when it next starts on the 1st–3rd, in the daytime only. You can also send them from Settings at any time; nobody is messaged twice.

## 9. Production checklist

- [ ] `/actuator/health` shows UP, and `/api/v1/...` called directly returns 404 (the proxy key is working)
- [ ] The Supabase Data API is off
- [ ] The owner has signed in and changed the one-time PIN; each coach has their own login
- [ ] cron-job.org is pinging every 14 minutes, with failure emails on
- [ ] "Keep database awake" ran successfully once by hand, and a backup was restored on a spare project
- [ ] The WhatsApp test message and a parent sign-in code both arrived
- [ ] `APP_REMINDERS_ENABLED=true` only after WhatsApp is live
- [ ] `APP_WHATSAPP_NUMBER` and `APP_ACADEMY_PHONE` are the academy's real numbers
- [ ] The trial-week checklist in [README.md](README.md#7-trial-week-checklist)

## What changes when you outgrow the free tiers

- **Render Starter** ($7/month) doesn't sleep. Remove the cron-job.org ping.
- **Supabase Pro** ($25/month) doesn't pause and keeps daily backups. Keep the GitHub backup anyway as an off-site copy.
- **Vercel Pro** is required for commercial use.

None of these needs a code change.
