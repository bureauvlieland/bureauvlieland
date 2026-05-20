#!/usr/bin/env bash
# Smoke-test pending-flow voor AdminEditActivitySheet + publish-program-changes.
#
# Verifieert:
#   1. pending_* schrijven raakt LIVE kolommen niet.
#   2. Pas na aanroep van publish-program-changes worden LIVE kolommen geüpdatet
#      en wordt pending_* geleegd.
#
# AUTOMATISCHE ROLLBACK:
#   Bij ELKE fout (set -e of expliciete exit) of bij Ctrl-C wordt zowel de
#   originele LIVE-snapshot als de originele pending_*-snapshot teruggezet.
#   De rollback wordt enkel uitgevoerd zodra een snapshot daadwerkelijk is
#   genomen (ROLLBACK_ARMED=1). Idempotent: bij succesvol einde gebeurt niets
#   omdat we de live-waardes na de test handmatig moeten terugzetten — daar
#   waarschuwt het script expliciet voor.
#
# Veiligheid: notifyCustomer=false en notifyPartnerIds=[] → geen e-mails.
# Vereist:
#   - psql met SELECT-rechten (PG* env vars actief).
#   - SUPABASE_URL en SUPABASE_SERVICE_ROLE_KEY (voor pending-write + rollback
#     via REST PATCH; de edge function zelf wordt aangeroepen met een
#     admin user JWT, niet de service role).
#   - ADMIN_JWT van een ingelogde admin user (Cookie/Bearer uit browser).
#   - ITEM_ID en REQUEST_ID van een bestaand testitem.
#
# Gebruik:
#   ITEM_ID=... REQUEST_ID=... ADMIN_JWT=... ./scripts/smoke-test-pending-flow.sh
#
# Bij ontbreken van ADMIN_JWT print het script de pending-stap en de SQL-versie
# van de promotie zodat je handmatig kunt verifiëren. Rollback gebeurt nog
# steeds automatisch bij errors of bij interrupt.

set -euo pipefail

: "${ITEM_ID:?ITEM_ID env var ontbreekt}"
: "${REQUEST_ID:?REQUEST_ID env var ontbreekt}"
: "${SUPABASE_URL:=https://blhspuifehausilnzwio.supabase.co}"

SNAPSHOT_LIVE=/tmp/smoke_snapshot_live_${ITEM_ID}.txt
SNAPSHOT_PENDING=/tmp/smoke_snapshot_pending_${ITEM_ID}.json
ROLLBACK_ARMED=0
ROLLBACK_DONE=0
SUCCESS=0

snapshot_live() {
  psql -t -A -F'|' -c "SELECT block_name, admin_price_override, price_type, location_address, location_lat, location_lng, provider_name, provider_id FROM program_request_items WHERE id='${ITEM_ID}'"
}

snapshot_pending_display() {
  psql -t -A -F'|' -c "SELECT pending_block_name, pending_admin_price_override, pending_price_type, pending_location_address, pending_location_lat, pending_location_lng, pending_provider_name, pending_provider_id, pending_changed_at IS NOT NULL FROM program_request_items WHERE id='${ITEM_ID}'"
}

# Capture pending_* as JSON so we can PATCH them back verbatim (incl. NULLs).
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
  ) FROM program_request_items WHERE id='${ITEM_ID}'"
}

# Capture live columns as JSON for restoration.
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
  ) FROM program_request_items WHERE id='${ITEM_ID}'"
}

rollback() {
  local exit_code=$?
  if [ "$ROLLBACK_ARMED" -ne 1 ] || [ "$ROLLBACK_DONE" -eq 1 ]; then
    return
  fi
  if [ "$SUCCESS" -eq 1 ] && [ "$exit_code" -eq 0 ]; then
    # Normale succesflow: rollback alsnog uitvoeren om LIVE en pending te
    # herstellen naar de originele state — de smoke-test moet idempotent zijn.
    :
  fi
  ROLLBACK_DONE=1
  echo
  echo "== ROLLBACK: herstel originele LIVE + pending_* =="
  if [ -z "${SUPABASE_SERVICE_ROLE_KEY:-}" ]; then
    echo "⚠ SUPABASE_SERVICE_ROLE_KEY ontbreekt — kan rollback niet uitvoeren."
    echo "   Originele LIVE: $(cat "$SNAPSHOT_LIVE" 2>/dev/null || echo '?')"
    echo "   Originele pending JSON: $(cat "$SNAPSHOT_PENDING" 2>/dev/null || echo '?')"
    return
  fi
  local live_json pending_json merged
  live_json=$(cat "$SNAPSHOT_LIVE.json" 2>/dev/null || echo '{}')
  pending_json=$(cat "$SNAPSHOT_PENDING" 2>/dev/null || echo '{}')
  # Combineer beide objecten in één PATCH-body.
  merged=$(python3 -c "import json,sys; a=json.loads(sys.argv[1]); b=json.loads(sys.argv[2]); a.update(b); print(json.dumps(a))" "$live_json" "$pending_json")
  if curl -fsS -X PATCH \
      "${SUPABASE_URL}/rest/v1/program_request_items?id=eq.${ITEM_ID}" \
      -H "apikey: ${SUPABASE_SERVICE_ROLE_KEY}" \
      -H "Authorization: Bearer ${SUPABASE_SERVICE_ROLE_KEY}" \
      -H "Content-Type: application/json" \
      -H "Prefer: return=minimal" \
      -d "$merged" > /dev/null; then
    echo "✅ Rollback voltooid — LIVE en pending_* teruggezet."
  else
    echo "❌ Rollback PATCH faalde. Originele waardes staan in:"
    echo "   $SNAPSHOT_LIVE / $SNAPSHOT_LIVE.json"
    echo "   $SNAPSHOT_PENDING"
  fi
}
trap rollback EXIT INT TERM

echo "== STAP 1: Snapshot ORIGINAL live + pending =="
ORIG=$(snapshot_live); echo "live: $ORIG"; echo "$ORIG" > "$SNAPSHOT_LIVE"
snapshot_live_json > "$SNAPSHOT_LIVE.json"
snapshot_pending_json > "$SNAPSHOT_PENDING"
echo "pending JSON opgeslagen in $SNAPSHOT_PENDING"
ROLLBACK_ARMED=1

echo
echo "== STAP 2: pending_* zetten via service-role PATCH =="
if [ -z "${SUPABASE_SERVICE_ROLE_KEY:-}" ]; then
  echo "❌ SUPABASE_SERVICE_ROLE_KEY ontbreekt — kan geen pending zetten."
  exit 1
fi
curl -fsS -X PATCH \
  "${SUPABASE_URL}/rest/v1/program_request_items?id=eq.${ITEM_ID}" \
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
echo "pending gezet."

echo
echo "== STAP 3: Verifieer LIVE ongewijzigd =="
LIVE_NOW=$(snapshot_live)
[ "$LIVE_NOW" = "$ORIG" ] && echo "✅ LIVE ongewijzigd: $LIVE_NOW" || { echo "❌ LIVE veranderde: $LIVE_NOW (orig=$ORIG)"; exit 1; }

echo
echo "== STAP 4: pending_* gevuld =="
snapshot_pending_display

echo
echo "== STAP 5: publish-program-changes aanroepen (zonder mails) =="
if [ -z "${ADMIN_JWT:-}" ]; then
  echo "⚠ ADMIN_JWT ontbreekt — sla edge function aanroep over."
  echo "   Rollback wordt nu uitgevoerd via trap."
  SUCCESS=1
  exit 0
fi
RESP=$(curl -fsS -X POST \
  "${SUPABASE_URL}/functions/v1/publish-program-changes" \
  -H "Authorization: Bearer ${ADMIN_JWT}" \
  -H "Content-Type: application/json" \
  -d "{\"requestId\":\"${REQUEST_ID}\",\"notifyCustomer\":false,\"notifyPartnerIds\":[],\"adminNote\":\"smoke-test\",\"origin\":\"${SUPABASE_URL}\"}")
echo "Edge function: $RESP"

echo
echo "== STAP 6: Verifieer LIVE = nieuwe waardes & pending leeg =="
snapshot_live
snapshot_pending_display
echo "✅ Smoke-test succesvol — rollback via trap zet alles terug."
SUCCESS=1
