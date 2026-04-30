#!/usr/bin/env bash
# ============================================================================
# SVI — Hardening del Supabase self-hosted (HARDENING §14)
# ============================================================================
# Aplica idempotentemente:
#   §14.1 SMTP (con SMTP_PROVIDER=resend|gmail|none)
#   §14.2 DISABLE_SIGNUP=true
#   §14.3 ADDITIONAL_REDIRECT_URLS con hosts de producción
#
# Uso (en el VPS):
#   1. Editar las CONFIG_* de abajo o pasarlas como env vars antes de correr.
#   2. cd /root/svi-erp/infra/scripts
#   3. sudo bash harden-supabase-self-hosted.sh
#
# El script:
#   - Hace backup automático del .env del Supabase (.env.bak.YYYYMMDDHHMMSS)
#   - Aplica los cambios de forma idempotente (no rompe si ya están aplicados)
#   - Reinicia el container `auth` para que tome los cambios
#   - Hace smoke test (curl /health del auth) al final
# ============================================================================

set -euo pipefail

# ─── CONFIG (override via env vars) ──────────────────────────────────────────
SUPABASE_DIR="${SUPABASE_DIR:-/root/supabase-svi}"
ENV_FILE="${SUPABASE_DIR}/.env"

# SMTP
SMTP_PROVIDER="${SMTP_PROVIDER:-none}"        # resend | gmail | none
SMTP_API_KEY="${SMTP_API_KEY:-}"              # Resend API key
SMTP_GMAIL_USER="${SMTP_GMAIL_USER:-}"        # email gmail (si provider=gmail)
SMTP_GMAIL_APP_PASSWORD="${SMTP_GMAIL_APP_PASSWORD:-}"  # app password (si provider=gmail)
SMTP_SENDER_NAME="${SMTP_SENDER_NAME:-SVI}"
SMTP_ADMIN_EMAIL="${SMTP_ADMIN_EMAIL:-devwolf.contacto@gmail.com}"

# Redirect URLs — separados por coma, con /** al final
EXTRA_REDIRECT_URLS="${EXTRA_REDIRECT_URLS:-https://svi.srv878399.hstgr.cloud/**,https://svi-erp.srv878399.hstgr.cloud/**}"

# Disable signup (true cierra el self-signup)
DISABLE_SIGNUP="${DISABLE_SIGNUP:-true}"

# ─── Helpers ─────────────────────────────────────────────────────────────────
log()  { printf "\n\033[1;36m▶ %s\033[0m\n" "$*"; }
ok()   { printf "  \033[1;32m✓\033[0m %s\n" "$*"; }
warn() { printf "  \033[1;33m⚠\033[0m %s\n" "$*"; }
err()  { printf "  \033[1;31m✗\033[0m %s\n" "$*" >&2; }

# Set or update a key=value pair in the env file (idempotente)
set_env() {
  local key="$1" value="$2" file="$3"
  if grep -qE "^${key}=" "$file"; then
    # Reemplazar línea existente
    sed -i "s|^${key}=.*|${key}=${value}|" "$file"
    ok "set ${key}=${value}"
  else
    printf "\n%s=%s\n" "$key" "$value" >> "$file"
    ok "added ${key}=${value}"
  fi
}

# Append URLs a ADDITIONAL_REDIRECT_URLS si no están ya
ensure_redirect_url() {
  local url="$1" file="$2"
  if grep -qE "^ADDITIONAL_REDIRECT_URLS=" "$file"; then
    if ! grep "^ADDITIONAL_REDIRECT_URLS=" "$file" | grep -q "$url"; then
      sed -i "s|^ADDITIONAL_REDIRECT_URLS=\(.*\)|ADDITIONAL_REDIRECT_URLS=\1,${url}|" "$file"
      ok "added redirect: $url"
    else
      ok "redirect ya presente: $url"
    fi
  else
    printf "\nADDITIONAL_REDIRECT_URLS=%s\n" "$url" >> "$file"
    ok "added ADDITIONAL_REDIRECT_URLS=$url"
  fi
}

# ─── Pre-flight ──────────────────────────────────────────────────────────────
log "Pre-flight checks"

if [[ ! -f "$ENV_FILE" ]]; then
  err "No existe $ENV_FILE. Setear SUPABASE_DIR a la ruta correcta."
  exit 1
fi
ok "Archivo .env encontrado: $ENV_FILE"

if ! command -v docker >/dev/null 2>&1; then
  err "docker no encontrado en PATH"
  exit 1
fi
ok "docker disponible"

# ─── Backup ──────────────────────────────────────────────────────────────────
log "Backup del .env actual"
BACKUP="${ENV_FILE}.bak.$(date -u +%Y%m%d%H%M%S)"
cp "$ENV_FILE" "$BACKUP"
ok "Backup: $BACKUP"

# ─── §14.2 DISABLE_SIGNUP ────────────────────────────────────────────────────
log "§14.2 — DISABLE_SIGNUP"
set_env "DISABLE_SIGNUP" "$DISABLE_SIGNUP" "$ENV_FILE"

# ─── §14.3 ADDITIONAL_REDIRECT_URLS ──────────────────────────────────────────
log "§14.3 — ADDITIONAL_REDIRECT_URLS"
IFS=',' read -ra URLS <<< "$EXTRA_REDIRECT_URLS"
for url in "${URLS[@]}"; do
  ensure_redirect_url "$url" "$ENV_FILE"
done

# ─── §14.1 SMTP ──────────────────────────────────────────────────────────────
log "§14.1 — SMTP ($SMTP_PROVIDER)"
case "$SMTP_PROVIDER" in
  resend)
    if [[ -z "$SMTP_API_KEY" ]]; then
      err "SMTP_PROVIDER=resend pero SMTP_API_KEY vacío. Setear: export SMTP_API_KEY=re_xxx"
      exit 1
    fi
    set_env "SMTP_HOST"         "smtp.resend.com" "$ENV_FILE"
    set_env "SMTP_PORT"         "465"             "$ENV_FILE"
    set_env "SMTP_USER"         "resend"          "$ENV_FILE"
    set_env "SMTP_PASS"         "$SMTP_API_KEY"   "$ENV_FILE"
    set_env "SMTP_SENDER_NAME"  "$SMTP_SENDER_NAME" "$ENV_FILE"
    set_env "SMTP_ADMIN_EMAIL"  "$SMTP_ADMIN_EMAIL" "$ENV_FILE"
    ;;
  gmail)
    if [[ -z "$SMTP_GMAIL_USER" || -z "$SMTP_GMAIL_APP_PASSWORD" ]]; then
      err "SMTP_PROVIDER=gmail requiere SMTP_GMAIL_USER y SMTP_GMAIL_APP_PASSWORD"
      exit 1
    fi
    set_env "SMTP_HOST"         "smtp.gmail.com"           "$ENV_FILE"
    set_env "SMTP_PORT"         "465"                      "$ENV_FILE"
    set_env "SMTP_USER"         "$SMTP_GMAIL_USER"         "$ENV_FILE"
    set_env "SMTP_PASS"         "$SMTP_GMAIL_APP_PASSWORD" "$ENV_FILE"
    set_env "SMTP_SENDER_NAME"  "$SMTP_SENDER_NAME"        "$ENV_FILE"
    set_env "SMTP_ADMIN_EMAIL"  "$SMTP_ADMIN_EMAIL"        "$ENV_FILE"
    ;;
  none)
    warn "SMTP_PROVIDER=none — saltando SMTP. Magic links + reset password no funcionarán."
    warn "Cuando estés listo, correr de nuevo con SMTP_PROVIDER=resend SMTP_API_KEY=re_xxx"
    ;;
  *)
    err "SMTP_PROVIDER desconocido: $SMTP_PROVIDER (esperaba: resend|gmail|none)"
    exit 1
    ;;
esac

# ─── Restart auth container ──────────────────────────────────────────────────
log "Reiniciando container auth"
cd "$SUPABASE_DIR"
if docker compose ps auth >/dev/null 2>&1; then
  docker compose up -d auth
  ok "auth reiniciado"
else
  warn "Container 'auth' no encontrado en compose. Probando 'supabase-auth'..."
  if docker compose ps supabase-auth >/dev/null 2>&1; then
    docker compose up -d supabase-auth
    ok "supabase-auth reiniciado"
  else
    err "No encontré container de auth. Ver: docker compose ps"
    exit 1
  fi
fi

# ─── Smoke test ──────────────────────────────────────────────────────────────
log "Smoke test"
sleep 3
SUPABASE_URL="${NEXT_PUBLIC_SUPABASE_URL:-https://supabase-svi.srv878399.hstgr.cloud}"
HTTP=$(curl -s -o /dev/null -w "%{http_code}" --max-time 5 "$SUPABASE_URL/auth/v1/health" || echo "000")
if [[ "$HTTP" == "200" ]]; then
  ok "auth /health responde 200"
else
  warn "auth /health devolvió $HTTP — verificar logs: docker compose logs auth"
fi

# ─── Resumen ─────────────────────────────────────────────────────────────────
log "Resumen final"
echo
echo "  DISABLE_SIGNUP        = $(grep '^DISABLE_SIGNUP=' "$ENV_FILE" | cut -d= -f2)"
echo "  ADDITIONAL_REDIRECT_URLS = $(grep '^ADDITIONAL_REDIRECT_URLS=' "$ENV_FILE" | cut -d= -f2-)"
echo "  SMTP_HOST             = $(grep '^SMTP_HOST=' "$ENV_FILE" | cut -d= -f2)"
echo "  SMTP_USER             = $(grep '^SMTP_USER=' "$ENV_FILE" | cut -d= -f2)"
echo "  SMTP_SENDER_NAME      = $(grep '^SMTP_SENDER_NAME=' "$ENV_FILE" | cut -d= -f2)"
echo "  Backup                = $BACKUP"
echo
ok "Hardening Supabase aplicado."
log "Próximos pasos manuales:"
cat <<'NEXT'
  1. Studio → Authentication → URL Configuration:
       Site URL: https://svi-erp.srv878399.hstgr.cloud
       Redirect URLs: agregar https://svi.srv878399.hstgr.cloud/** y https://svi-erp.srv878399.hstgr.cloud/**
     (Las redirect URLs viven tanto en .env como en Studio. El .env las
     mete en runtime; Studio las mete en la DB. Tener ambas consistentes.)
  2. Probar reset de password desde el portal:
       /portal/login → "Olvidé mi clave" → debe llegar email.
  3. Verificar que self-signup quedó bloqueado:
       curl -X POST $SUPABASE_URL/auth/v1/signup -H "apikey: $ANON_KEY" \
         -H "Content-Type: application/json" \
         -d '{"email":"test@test.com","password":"abc12345"}'
     Debe devolver: {"code":"signup_disabled","message":"..."}
NEXT
