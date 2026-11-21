# Deploying RKS Academy

> Hosting on **Vercel + Render + Supabase** instead? Follow [HOSTED.md](HOSTED.md).

A single small server runs everything with Docker. Caddy is the only thing exposed to the internet and handles HTTPS automatically. The web app, API and PostgreSQL sit on a private network.

```
Internet ──443──▶ Caddy ──▶ web (Next.js) ──▶ api (Spring Boot) ──▶ db (PostgreSQL 16, incl. uploaded photos)
                                      backup ──▶ ./backups (nightly pg_dump)
```

## 1. What you need

- A Linux server in the Mumbai region with **2 vCPU, 4 GB RAM and 40 GB disk**, running Ubuntu 24.04. Examples: DigitalOcean, AWS Lightsail.
- A domain, e.g. `app.rksacademy.in`, with an **A record pointing at the server's IP**.
- Firewall: allow ports **22, 80 and 443** only.

## 2. First install (about 20 minutes)

```bash
# On the server, as a sudo user
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER && newgrp docker

git clone <your repository> rks && cd rks/deploy
cp .env.example .env
nano .env        # fill in DOMAIN, POSTGRES_PASSWORD, APP_JWT_SECRET (see the comments in the file)
chmod 600 .env

docker compose -f docker-compose.prod.yml --env-file .env up -d --build
docker compose -f docker-compose.prod.yml --env-file .env ps     # all services "healthy"/"running"
```

Open `https://<your domain>`. The first visit can take up to a minute while Caddy obtains the certificate.

**Create the owner login** (one time only):

```bash
docker compose -f docker-compose.prod.yml --env-file .env run --rm api --setup-owner --name="R. Sethupathi" --mobile=9XXXXXXXXX
```

It prints a one-time PIN, which must be changed at first sign-in. Then, from **Settings**:
- Add coach logins (each gets its own one-time PIN).
- Check courts, coaches and batches.
- Add the players.

Production starts with no demo data: only the courts, coaches, batches, fee plans and the policy.

## 3. Backups

- **Nightly:** the `backup` service writes `deploy/backups/rks-YYYYMMDD-HHMM.dump` at 02:30 IST, plus one at start-up, and keeps 30 days.
- **Off-site copies:** a backup on the same server doesn't survive losing the server. Copy `deploy/backups` daily to object storage. For example, with rclone configured for DigitalOcean Spaces or AWS S3:
  ```bash
  # crontab -e
  15 3 * * * rclone sync /home/<user>/rks/deploy/backups spaces:rks-backups --max-age 31d
  ```
- **Uploaded photos** are stored in the database, so every dump above includes them.
- **Restore drill, monthly.** Untested backups are not backups:
  ```bash
  ./restore.sh backups/rks-20261110-0230.dump     # asks you to type RESTORE
  ```

## 4. Updating

```bash
cd rks && git pull
cd deploy && docker compose -f docker-compose.prod.yml --env-file .env up -d --build
```

- Database changes apply automatically on start-up (Flyway).
- Take a manual backup first for big releases:
  ```bash
  docker compose -f docker-compose.prod.yml --env-file .env exec backup sh -c 'pg_dump -Fc -f /backups/pre-update.dump'
  ```

## 5. Monitoring

- **Uptime:** add `https://<your domain>/login` to a free uptime monitor (e.g. UptimeRobot) with SMS or email alerts.
- **Logs:** `docker compose -f docker-compose.prod.yml --env-file .env logs -f --tail=200 api`
- **Health:** each container has a health check, and `docker compose ps` shows its state.

## 6. Turning on WhatsApp fee reminders

Reminders run at **09:00 IST on the 1st** of every month. Until this section is done they are recorded but **not sent**: Settings → WhatsApp shows "Recording only".

1. **Meta Business account.** In [Meta Business Manager](https://business.facebook.com), verify the academy as a business (free; needs GST or Udyam details).
2. **WhatsApp Business Platform.** Create an app, add the WhatsApp product, and register the academy's dedicated number. A number already used in the WhatsApp phone app must be removed from it first.
3. **Message template.**
   - Name: `fee_reminder`. Category: **Utility**. Language: **English**.
   - Body, exactly:
     ```
     Vanakkam {{1}}! Fee reminder from RKS Academy for {{2}} ({{3}}): {{4}} plan for {{5}} is {{6}}. Please pay by {{7}} to avoid a late fee. Thank you!
     ```
   - Sample values: `K. Murugan`, `Aravind Murugan`, `RKS101`, `Monthly`, `Nov 2026`, `₹1,500`, `10 Nov 2026`.
   - Approval usually takes minutes to a day.
   - This is the only template. Parents sign in with a PIN, so the family app works without WhatsApp.
4. **Permanent access token.** Create a System User with the `whatsapp_business_messaging` permission and generate a token. Temporary tokens expire in 24 hours.
5. **Configure** `.env`:
   ```
   APP_WHATSAPP_PROVIDER=cloud
   APP_WHATSAPP_PHONE_NUMBER_ID=<from the WhatsApp API setup page>
   APP_WHATSAPP_ACCESS_TOKEN=<the permanent token>
   ```
   Then run `docker compose ... up -d`. The API refuses to start if `cloud` is chosen without both values.
6. **Test.** In Settings → WhatsApp, send a test message to your own phone. Meta's exact error is shown if anything is wrong, for example "(#132001) Template name does not exist".

Meta bills each message to the academy's account (utility messages in India cost about ₹0.12 each).

## 7. Trial week checklist

Before relying on it for real fees:

- [ ] Owner and every coach can sign in on their own phones and have set their own PINs
- [ ] All players added, with correct batch, plan, join date and contact (parent, guardian, or the player if 18+) mobile
- [ ] Every player who has already paid for this month is recorded (otherwise they will show as due)
- [ ] One week of attendance taken by the coaches
- [ ] One payment recorded, its receipt printed, then voided and recorded again
- [ ] A CSV export opened in Excel by the accountant
- [ ] A WhatsApp test message received
- [ ] A parent (or an adult player) signs in to `https://<your domain>/family` with their mobile number and PIN and sees their players
- [ ] A backup restored on a test copy

## 8. Security notes

- Secrets live only in `.env` on the server (`chmod 600`). Rotating `APP_JWT_SECRET` signs everyone out.
- The API, its docs and PostgreSQL are never exposed. Only Caddy listens on the internet.
- Sessions are revoked instantly when a PIN is changed or reset, or a login is turned off.
- After 5 wrong PINs, a mobile number is locked for 5 minutes.
- Keep the server patched: `sudo apt update && sudo apt upgrade -y` monthly, or enable unattended-upgrades.
