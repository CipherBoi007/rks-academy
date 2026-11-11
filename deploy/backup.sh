#!/bin/sh
# Nightly PostgreSQL backup: one compressed custom-format dump per night in /backups, older ones pruned.
# Runs inside the postgres image (pg_dump matches the server version).
set -eu

keep_days="${BACKUP_KEEP_DAYS:-30}"
at="${BACKUP_AT:-02:30}"

dump() {
  file="/backups/rks-$(date +%Y%m%d-%H%M).dump"
  if pg_dump --format=custom --compress=9 --file="$file.part"; then
    mv "$file.part" "$file"
    echo "$(date -Iseconds) backup ok: $file ($(du -h "$file" | cut -f1))"
  else
    rm -f "$file.part"
    echo "$(date -Iseconds) BACKUP FAILED" >&2
  fi
  find /backups -name 'rks-*.dump' -mtime +"$keep_days" -delete
}

echo "Backups at $at daily into /backups, keeping $keep_days days"
# The API creates the schema on its first start; wait for it so the start-up backup isn't an empty database.
until psql -tAc "select 1 from flyway_schema_history limit 1" >/dev/null 2>&1; do
  sleep 10
done
dump # one at start-up, so a fresh deploy has a backup straight away
while true; do
  now=$(date +%s)
  next=$(date -d "$(date +%Y-%m-%d) $at" +%s 2>/dev/null || date -D "%Y-%m-%d %H:%M" -d "$(date +%Y-%m-%d) $at" +%s)
  [ "$next" -le "$now" ] && next=$((next + 86400))
  sleep $((next - now))
  dump
done
