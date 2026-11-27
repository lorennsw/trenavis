#!/usr/bin/env bash
# Crea (si no existe) la base de datos D1 "trenavis-db" y pone su id en worker/wrangler.toml antes de desplegar.
set -euo pipefail
CFG=worker/wrangler.toml
NAME=trenavis-db
list() { npx wrangler d1 list --json 2>/dev/null; }
if ! JSON=$(list); then echo "::warning::El token de Cloudflare no puede usar D1"; exit 1; fi
ID=$(node -e "const l=JSON.parse(process.argv[1]);const d=l.find(x=>x.name===process.argv[2]);process.stdout.write(d?d.uuid:'')" "$JSON" "$NAME")
if [ -z "$ID" ]; then
  npx wrangler d1 create "$NAME" >/dev/null
  JSON=$(list)
  ID=$(node -e "const l=JSON.parse(process.argv[1]);const d=l.find(x=>x.name===process.argv[2]);process.stdout.write(d?d.uuid:'')" "$JSON" "$NAME")
fi
[ -n "$ID" ] || { echo "No se pudo obtener el id de D1"; exit 1; }
sed -i "s/D1_DATABASE_ID/$ID/" "$CFG"
echo "D1 $NAME: $ID"
