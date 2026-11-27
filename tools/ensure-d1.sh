#!/usr/bin/env bash
# Crea (si no existe) la base de datos D1 "trenavis-db" y pone su id en worker/wrangler.toml antes de desplegar.
set -euo pipefail
CFG=worker/wrangler.toml
NAME=trenavis-db
list() { npx wrangler d1 list --json 2>/dev/null; }
# Sin permiso de D1: se despliega sin base de datos (la app funciona; solo faltan los avisos push)
without_d1() { echo "::warning::$1 Se despliega sin avisos push."; sed -i '/^# >>> D1/,/^# <<< D1/d' "$CFG"; echo "d1=no" >> "${GITHUB_OUTPUT:-/dev/null}"; exit 0; }
if ! JSON=$(list); then without_d1 "El token de Cloudflare no tiene permiso de D1 (añade 'D1: Edit' al token)."; fi
ID=$(node -e "const l=JSON.parse(process.argv[1]);const d=l.find(x=>x.name===process.argv[2]);process.stdout.write(d?d.uuid:'')" "$JSON" "$NAME")
if [ -z "$ID" ]; then
  npx wrangler d1 create "$NAME" >/dev/null
  JSON=$(list)
  ID=$(node -e "const l=JSON.parse(process.argv[1]);const d=l.find(x=>x.name===process.argv[2]);process.stdout.write(d?d.uuid:'')" "$JSON" "$NAME")
fi
[ -n "$ID" ] || without_d1 "No se pudo obtener el id de D1."
sed -i "s/D1_DATABASE_ID/$ID/" "$CFG"
echo "D1 $NAME: $ID"
echo "d1=yes" >> "${GITHUB_OUTPUT:-/dev/null}"
