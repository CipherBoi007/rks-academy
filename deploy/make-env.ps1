# Creates every environment value for the Vercel + Render + Supabase deployment, ready to copy and paste.
#
# Run from Command Prompt or PowerShell:
#   powershell -ExecutionPolicy Bypass -File D:\RKS\deploy\make-env.ps1
#
# Output goes to deploy\secrets\ (git-ignored). Generated secrets are kept in deploy\secrets\keys.txt and reused
# on later runs, so you can run this again (e.g. once you know your Vercel address) without breaking anything.

$ErrorActionPreference = "Stop"
$out = Join-Path $PSScriptRoot "secrets"
New-Item -ItemType Directory -Force $out | Out-Null

function New-Secret {
    $bytes = New-Object byte[] 32
    [Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($bytes)
    ($bytes | ForEach-Object { $_.ToString("x2") }) -join ""
}

function Ask([string]$question, [string]$default) {
    if ($default) { $answer = Read-Host "$question [$default]" } else { $answer = Read-Host $question }
    if ([string]::IsNullOrWhiteSpace($answer)) { return $default }
    return $answer.Trim()
}

function Write-Plain([string]$name, [string]$text) {
    [IO.File]::WriteAllText((Join-Path $out $name), $text, (New-Object Text.UTF8Encoding($false)))
}

# --- Secrets: generated once, then reused ---
$keysFile = Join-Path $out "keys.txt"
$keys = @{}
if (Test-Path $keysFile) {
    Get-Content $keysFile | ForEach-Object { $k, $v = $_ -split "=", 2; if ($v) { $keys[$k] = $v } }
}
foreach ($name in "JWT_SECRET", "PROXY_KEY", "BACKUP_PASSPHRASE") {
    if (-not $keys[$name]) { $keys[$name] = New-Secret }
}
Write-Plain "keys.txt" (($keys.GetEnumerator() | Sort-Object Name | ForEach-Object { "$($_.Name)=$($_.Value)" }) -join "`r`n")

Write-Host ""
Write-Host "RKS Academy - deployment values" -ForegroundColor Cyan
Write-Host "Press Enter to accept the value in [brackets]."
Write-Host ""

# --- Supabase ---
Write-Host "Supabase: Connect -> Session pooler -> copy the URI (it looks like" -ForegroundColor Yellow
Write-Host "postgresql://postgres.abcd:[YOUR-PASSWORD]@aws-0-ap-southeast-1.pooler.supabase.com:5432/postgres)" -ForegroundColor Yellow
do {
    $uri = Ask "Paste the Session pooler URI" ""
    $m = [regex]::Match("$uri", '^postgres(?:ql)?://([^:@/]+)(?::[^@]*)?@([^:/]+):(\d+)/([A-Za-z0-9_]+)')
    if (-not $m.Success) { Write-Host "That doesn't look like the URI. Try again." -ForegroundColor Red }
} until ($m.Success)
$dbUser = $m.Groups[1].Value
$dbHost = $m.Groups[2].Value
$dbPort = $m.Groups[3].Value
$dbName = $m.Groups[4].Value
if ($dbPort -ne "5432") {
    Write-Host "Port $dbPort is the Transaction pooler. Use the Session pooler (port 5432); switching to 5432." -ForegroundColor Red
    $dbPort = "5432"
}

$secure = Read-Host "Supabase database password (hidden)" -AsSecureString
$dbPassword = [Runtime.InteropServices.Marshal]::PtrToStringAuto(
    [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure))
if ([string]::IsNullOrWhiteSpace($dbPassword)) { throw "The database password is required." }
if ($dbPassword -notmatch '^[A-Za-z0-9]+$') {
    Write-Host "Warning: the password has symbols or spaces. Some paste boxes treat # as a comment." -ForegroundColor Red
    Write-Host "Safest: Supabase -> Project Settings -> Database -> Reset password, letters and digits only." -ForegroundColor Red
}

# --- Addresses and academy details ---
$renderUrl = (Ask "Render API address (shown after you create the service)" "https://rks-api.onrender.com").TrimEnd("/")
$vercelUrl = (Ask "Vercel site address (use the default until you have it, then run this again)" "https://example.com").TrimEnd("/")
$whatsapp = Ask "Academy WhatsApp number, country code + number, digits only" "910000000000"
$phone = Ask "Academy phone printed on receipts" "+91 00000 00000"
$ownerName = Ask "Owner's name (for the first login)" "R. Sethupathi"
do {
    $ownerMobile = Ask "Owner's 10-digit mobile" ""
} until ($ownerMobile -match '^\d{10}$')

$jdbc = "jdbc:postgresql://${dbHost}:${dbPort}/${dbName}?sslmode=require"
$pgUrl = "postgresql://${dbUser}:$([Uri]::EscapeDataString($dbPassword))@${dbHost}:${dbPort}/${dbName}?sslmode=require"

# --- Render: Environment -> "Add from .env" ---
Write-Plain "render.env" @"
DB_URL=$jdbc
DB_USERNAME=$dbUser
DB_PASSWORD=$dbPassword
DB_POOL_SIZE=5
APP_JWT_SECRET=$($keys["JWT_SECRET"])
APP_PROXY_KEY=$($keys["PROXY_KEY"])
APP_FRONTEND_ORIGIN=$vercelUrl
APP_WHATSAPP_NUMBER=$whatsapp
APP_ACADEMY_PHONE=$phone
APP_WHATSAPP_PROVIDER=log
APP_REMINDERS_ENABLED=false
"@

# --- Vercel: Settings -> Environment Variables -> paste ---
Write-Plain "vercel.env" @"
BACKEND_URL=$renderUrl
BACKEND_PROXY_KEY=$($keys["PROXY_KEY"])
"@

# --- GitHub: Settings -> Secrets and variables -> Actions ---
Write-Plain "github-secrets.txt" @"
Add each as a separate "New repository secret" (name on the left, value on the right):

SUPABASE_DB_URL
$pgUrl

BACKUP_PASSPHRASE
$($keys["BACKUP_PASSPHRASE"])

Keep BACKUP_PASSPHRASE somewhere safe as well (e.g. a password manager): backups can't be opened without it.
"@

# --- cron-job.org ---
Write-Plain "cron-job.txt" @"
cron-job.org -> Create cronjob
  URL:       $renderUrl/actuator/health
  Schedule:  every 14 minutes
  Notify on failure: on
"@

# --- Owner setup, run once from this PC after Render has deployed ---
$backend = Resolve-Path (Join-Path $PSScriptRoot "..\backend")
Write-Plain "create-owner.cmd" @"
@echo off
rem Creates the first owner login in the live database. Run once, after Render has deployed successfully.
cd /d "$backend"
call mvn -q -DskipTests package || exit /b 1
set "DB_URL=$jdbc"
set "DB_USERNAME=$dbUser"
set "DB_PASSWORD=$($dbPassword.Replace('%', '%%'))"
set "APP_JWT_SECRET=$($keys["JWT_SECRET"])"
java -jar target\rks-academy.jar --setup-owner --name="$ownerName" --mobile=$ownerMobile --server.port=0
echo.
echo Sign in with the one-time PIN printed above, then set your own PIN.
pause
"@

Write-Host ""
Write-Host "Done. Files in $out :" -ForegroundColor Green
Write-Host "  render.env          -> Render: Environment -> Add from .env -> paste"
Write-Host "  vercel.env          -> Vercel: Settings -> Environment Variables -> paste"
Write-Host "  github-secrets.txt  -> GitHub: Settings -> Secrets and variables -> Actions"
Write-Host "  cron-job.txt        -> cron-job.org"
Write-Host "  create-owner.cmd    -> double-click once Render shows 'Live'"
Write-Host ""
Write-Host "These files contain passwords. They are git-ignored; never share or commit them." -ForegroundColor Yellow
