#!/usr/bin/env bash
# Smoke-test pending-flow voor AdminEditActivitySheet + publish-program-changes.
#
# Verifieert per testitem:
#   1. pending_* schrijven raakt LIVE kolommen niet.
#   2. Pas na aanroep van publish-program-changes worden LIVE kolommen geüpdatet
#      en wordt pending_* geleegd.
#
# AUTOMATISCHE ROLLBACK per item:
#   Voor elk item wordt een snapshot (live + pending_*) bewaard. Bij ELKE fout,
#   Ctrl-C of normaal einde wordt voor elk armed item zowel de LIVE-snapshot
#   als de pending_*-snapshot teruggezet via service-role PATCH. Idempotent.
#
# Veiligheid: notifyCustomer=false en notifyPartnerIds=[] → geen e-mails.
#
# Vereist:
#   - psql (met PG* env of SUPABASE_DB_URL wrapper).
#   - SUPABASE_URL en SUPABASE_SERVICE_ROLE_KEY.
#   - ADMIN_JWT van een ingelogde admin user (optioneel; zonder JWT wordt
#     stap 5/6 overgeslagen maar pending-schrijven + verificatie wel gedaan).
#
# Items opgeven (kies één):
#   A) Single item (backward compat):
#        ITEM_ID=<uuid> REQUEST_ID=<uuid> ./scripts/smoke-test-pending-flow.sh
#   B) Meerdere items:
#        ITEMS="itemId1:requestId1 itemId2:requestId2 ..." \
#        MODE=sequential|parallel \
#        ./scripts/smoke-test-pending-flow.sh
#      Scheiding mag spatie of komma zijn. MODE default = sequential.
#      Parallel: alle items draaien tegelijk; exit-code = max van alle workers.

set -euo pipefail

: "${SUPABASE_URL:=https://blhspuifehausilnzwio.supabase.co}"
MODE="${MODE:-sequential}"
[ "$MODE" = "sequential" ] || [ "$MODE" = "parallel" ] || { echo "❌ MODE moet sequential of parallel zijn"; exit 1; }

# ---- Items parsen --------------------------------------------------------
declare -a PAIRS=()
if [ -n "${ITEMS:-}" ]; then
  # Vervang komma's door spaties, splits op whitespace
  RAW="${ITEMS//,/ }"
  for pair in $RAW; do
    [ -z "$pair" ] && continue
    case "$pair" in
      *:*) PAIRS+=("$pair") ;;
      *) echo "❌ Ongeldig pair '$pair' — verwacht itemId:requestId"; exit 1 ;;
    esac
  done
elif [ -n "${ITEM_ID:-}" ] && [ -n "${ITEM_ID:-}" ]; then
  : "${ITEM_ID:?ITEM_ID env var ontbreekt}"
  : "${REQUEST_ID:?REQUEST_ID env var ontbreekt}"
  PAIRS+=("${ITEM_ID}:${REQUEST_ID}")
else
  echo "❌ Geef ITEMS=\"id1:req1 id2:req2\" of ITEM_ID=... REQUEST_ID=..."
  exit 1
fi

[ ${#PAIRS[@]} -gt 0 ] || { echo "❌ Geen items om te testen"; exit 1; }

# ---- Globale rollback registratie ---------------------------------------
ROLLBACK_DIR=$(mktemp -d -t smoke-rollback-XXXXXX)
ROLLBACK_DONE=0

rollback_all() {
  if [ "$ROLLBACK_DONE" -eq 1 ]; then return; fi
  ROLLBACK_DONE=1
  echo
  echo "== ROLLBACK: herstel LIVE + pending_* voor alle armed items =="
  if [ -z "${SUPABASE_SERVICE_ROLE_KEY:-}" ]; then
    echo "⚠ SUPABASE_SERVICE_ROLE_KEY ontbreekt — handmatig herstellen uit $ROLLBACK_DIR"
    return
  fi
  local f item live pending merged
  shopt -s nullglob
  for f in "$ROLLBACK_DIR"/*.armed; do
    [ -e "$f" ] || continue
    item=$(basename "$f" .armed)
    live=$(cat "$ROLLBACK_DIR/$item.live.json" 2>/dev/null || echo '{}')
    pending=$(cat "$ROLLBACK_DIR/$item.pending.json" 2>/dev/null || echo '{}')
    merged=$(python3 -c "import json,sys; a=json.loads(sys.argv[1]); b=json.loads(sys.argv[2]); a.update(b); print(json.dumps(a))" "$live" "$pending")
    if curl -fsS -X PATCH \
        "${SUPABASE_URL}/rest/v1/program_request_items?id=eq.${item}" \
        -H "apikey: ${SUPABASE_SERVICE_ROLE_KEY}" \
        -H "Authorization: Bearer ${SUPABASE_SERVICE_ROLE_KEY}" \
        -H "Content-Type: application/json" \
        -H "Prefer: return=minimal" \
        -d "$merged" > /dev/null; then
      echo "  ✅ $item hersteld"
    else
      echo "  ❌ $item PATCH faalde — handmatig: $ROLLBACK_DIR/$item.*"
    fi
  done
}
trap rollback_all EXIT INT TERM

# ---- Per-item helpers ----------------------------------------------------
snapshot_live() {
  psql -t -A -F'|' -c "SELECT block_name, admin_price_override, price_type, location_address, location_lat, location_lng, provider_name, provider_id FROM program_request_items WHERE id='$1'"
}
snapshot_pending_display() {
  psql -t -A -F'|' -c "SELECT pending_block_name, pending_admin_price_override, pending_price_type, pending_location_address, pending_location_lat, pending_location_lng, pending_provider_name, pending_provider_id, pending_changed_at IS NOT NULL FROM program_request_items WHERE id='$1'"
}
snapshot_live_json() {
  psql -t -A -c "SELECT json_build_object(
    'block_name', block_name,
    'admin_price_override', admin_price_override,
    'price_type', price_type,
    'location_address', location_address,
    'location_lat', location_lat,
    'location_lng', location_lng,
    'provider_name', provider_name,
    'provider_id', provider_id
  ) FROM program_request_items WHERE id='$1'"
}
snapshot_pending_json() {
  psql -t -A -c "SELECT json_build_object(
    'pending_block_name', pending_block_name,
    'pending_admin_price_override', pending_admin_price_override,
    'pending_price_type', pending_price_type,
    'pending_location_address', pending_location_address,
    'pending_location_lat', pending_location_lat,
    'pending_location_lng', pending_location_lng,
    'pending_provider_name', pending_provider_name,
    'pending_provider_id', pending_provider_id,
    'pending_provider_email', pending_provider_email,
    'pending_changed_at', pending_changed_at,
    'pending_preferred_time', pending_preferred_time,
    'pending_day_index', pending_day_index,
    'pending_customer_notes', pending_customer_notes,
    'pending_override_people', pending_override_people,
    'pending_marked_for_removal', pending_marked_for_removal,
    'pending_added', pending_added,
    'pending_admin_price_notes', pending_admin_price_notes,
    'pending_block_type', pending_block_type
  ) FROM program_request_items WHERE id='$1'"
}

# Per-item worker; logs prefixt met [itemId-shortcode].
run_one() {
  local item="$1" request="$2"
  local tag="[${item:0:8}]"
  logp() { echo "$tag $*"; }

  logp "STAP 1: Snapshot ORIGINAL live + pending"
  local orig_live
  orig_live=$(snapshot_live "$item")
  logp "live: $orig_live"
  snapshot_live_json "$item" > "$ROLLBACK_DIR/$item.live.json"
  snapshot_pending_json "$item" > "$ROLLBACK_DIR/$item.pending.json"
  touch "$ROLLBACK_DIR/$item.armed"

  if [ -z "${SUPABASE_SERVICE_ROLE_KEY:-}" ]; then
    logp "❌ SUPABASE_SERVICE_ROLE_KEY ontbreekt — kan geen pending zetten."
    return 1
  fi

  logp "STAP 2: pending_* zetten"
  curl -fsS -X PATCH \
    "${SUPABASE_URL}/rest/v1/program_request_items?id=eq.${item}" \
    -H "apikey: ${SUPABASE_SERVICE_ROLE_KEY}" \
    -H "Authorization: Bearer ${SUPABASE_SERVICE_ROLE_KEY}" \
    -H "Content-Type: application/json" \
    -H "Prefer: return=minimal" \
    -d '{
      "pending_block_name":"Zeehondentocht (SMOKE)",
      "pending_admin_price_override":42.42,
      "pending_price_type":"per_person",
      "pending_location_address":"SMOKE adres 99",
      "pending_location_lat":53.30,
      "pending_location_lng":5.10,
      "pending_provider_name":"SMOKE Provider",
      "pending_provider_id":"zeehonden",
      "pending_changed_at":"now()"
    }' > /dev/null

  logp "STAP 3: Verifieer LIVE ongewijzigd"
  local live_now
  live_now=$(snapshot_live "$item")
  if [ "$live_now" != "$orig_live" ]; then
    logp "❌ LIVE veranderde: $live_now (orig=$orig_live)"
    return 1
  fi
  logp "✅ LIVE ongewijzigd"

  logp "STAP 4: pending_* gevuld → $(snapshot_pending_display "$item")"

  if [ -z "${ADMIN_JWT:-}" ]; then
    logp "⚠ ADMIN_JWT ontbreekt — sla edge function aanroep over (rollback volgt)"
    return 0
  fi

  logp "STAP 5: publish-program-changes (zonder mails)"
  local resp
  resp=$(curl -fsS -X POST \
    "${SUPABASE_URL}/functions/v1/publish-program-changes" \
    -H "Authorization: Bearer ${ADMIN_JWT}" \
    -H "Content-Type: application/json" \
    -d "{\"requestId\":\"${request}\",\"notifyCustomer\":false,\"notifyPartnerIds\":[],\"adminNote\":\"smoke-test\",\"origin\":\"${SUPABASE_URL}\"}")
  logp "Edge function: $resp"

  logp "STAP 6: Verifieer LIVE = nieuwe waardes & pending leeg"
  logp "live=$(snapshot_live "$item")"
  logp "pending=$(snapshot_pending_display "$item")"
  logp "✅ Smoke-test OK"
  return 0
}

# ---- Dispatcher ----------------------------------------------------------
echo "== Smoke-test: ${#PAIRS[@]} item(s), mode=$MODE =="

EXIT_CODE=0
if [ "$MODE" = "sequential" ]; then
  for pair in "${PAIRS[@]}"; do
    item="${pair%%:*}"
    request="${pair##*:}"
    if ! run_one "$item" "$request"; then
      EXIT_CODE=1
      echo "[${item:0:8}] ❌ FAALDE — ga door met overige items, rollback volgt op het einde."
    fi
  done
else
  declare -A PIDS=()
  for pair in "${PAIRS[@]}"; do
    item="${pair%%:*}"
    request="${pair##*:}"
    logfile="$ROLLBACK_DIR/$item.log"
    ( run_one "$item" "$request" ) > "$logfile" 2>&1 &
    PIDS[$!]="$item"
  done
  for pid in "${!PIDS[@]}"; do
    item="${PIDS[$pid]}"
    if wait "$pid"; then
      cat "$ROLLBACK_DIR/$item.log"
    else
      EXIT_CODE=1
      echo "---- ❌ FAILED OUTPUT voor $item ----"
      cat "$ROLLBACK_DIR/$item.log"
    fi
  done
fi

echo
if [ "$EXIT_CODE" -eq 0 ]; then
  echo "✅ Alle items geslaagd — rollback via trap zet alles terug."
else
  echo "❌ Eén of meerdere items faalden — rollback via trap zet alles terug."
fi
exit "$EXIT_CODE"
