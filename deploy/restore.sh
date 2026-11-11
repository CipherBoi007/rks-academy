#!/bin/sh
# Restores a backup into the running database. DESTRUCTIVE: replaces the current data.
#   ./restore.sh backups/rks-20261110-0230.dump
set -eu

file="${1:?Usage: ./restore.sh backups/rks-YYYYMMDD-HHMM.dump}"
[ -f "$file" ] || { echo "No such file: $file" >&2; exit 1; }

printf 'This replaces ALL current data with %s. Type RESTORE to continue: ' "$file"
read -r answer
[ "$answer" = "RESTORE" ] || { echo "Cancelled."; exit 1; }

compose="docker compose -f docker-compose.prod.yml --env-file .env"
$compose stop api web
$compose exec -T db sh -c 'pg_restore --clean --if-exists --no-owner -U "$POSTGRES_USER" -d "$POSTGRES_DB"' < "$file"
$compose start api web
echo "Restored $file."
