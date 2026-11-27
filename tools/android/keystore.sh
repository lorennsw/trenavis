#!/usr/bin/env bash
# Clave de firma de la app Android. Se crea una sola vez y se guarda en el KV de Cloudflare (privado de tu cuenta):
# sin ella no se pueden publicar actualizaciones con la misma firma. También guarda su huella SHA-256 para assetlinks.
set -euo pipefail
ACCOUNT=26daaf7d50d86f84e8b2d985db7012a0
NS=c27f8eab03c845a0a0b1036c21aa1b72
KV="https://api.cloudflare.com/client/v4/accounts/$ACCOUNT/storage/kv/namespaces/$NS/values"
# API de Cloudflare directamente: devuelve solo el valor (o 404 si no existe)
kv_get() { curl -sf -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" "$KV/$1" || true; }
kv_put() { curl -sf -X PUT -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" --data-binary "$2" "$KV/$1" >/dev/null; }

B64=$(kv_get android-keystore)
if [ -z "$B64" ]; then
  PASS=$(openssl rand -hex 16)
  keytool -genkeypair -keystore android.keystore -alias trenavis -keyalg RSA -keysize 2048 -validity 10000 \
    -storepass "$PASS" -keypass "$PASS" -dname "CN=TrenAvis, O=TrenAvis, C=ES" >/dev/null 2>&1
  kv_put android-keystore "$(base64 -w0 android.keystore)"
  kv_put android-keystore-pass "$PASS"
  echo "Clave de firma creada y guardada."
else
  echo "$B64" | tr -d '\n\r ' | base64 -d > android.keystore
  PASS=$(kv_get android-keystore-pass | tr -d '\n\r ')
  echo "Clave de firma recuperada."
fi
echo "::add-mask::$PASS"
echo "KS_PASS=$PASS" >> "${GITHUB_ENV:-/dev/null}"

FP=$(keytool -list -v -keystore android.keystore -alias trenavis -storepass "$PASS" | grep -m1 "SHA256:" | sed 's/.*SHA256: *//' | tr -d ' \r')
CUR=$(kv_get android-fingerprints)
NEW=$(node -e 'const c=(()=>{try{return JSON.parse(process.argv[1])}catch{return []}})();const f=process.argv[2];if(!c.includes(f))c.push(f);process.stdout.write(JSON.stringify(c))' "${CUR:-[]}" "$FP")
[ "$NEW" != "$CUR" ] && kv_put android-fingerprints "$NEW"
echo "Huella SHA-256: $FP"
