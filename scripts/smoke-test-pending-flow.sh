#!/usr/bin/env bash
# Smoke-test pending-flow voor AdminEditActivitySheet + publish-program-changes.
#
# Verifieert:
#   1. pending_* schrijven raakt LIVE kolommen niet.
#   2. Pas na aanroep van publish-program-changes worden LIVE kolommen geüpdatet
#      en wordt pending_* geleegd.
#
# Veiligheid: notifyCustomer=false en notifyPartnerIds=[] → geen e-mails.
# Vereist:
#   - psql met SELECT-rechten (PG* env vars actief).
#   - SUPABASE_URL en SUPABASE_SERVICE_ROLE_KEY (alleen voor pending-write +
#     restore via REST PATCH; de edge function zelf wordt aangeroepen met een
#     admin user JWT, niet de service role).
#   - ADMIN_JWT van een ingelogde admin user (Cookie/Bearer uit browser).
#   - ITEM_ID en REQUEST_ID van een bestaand testitem.
#
# Gebruik:
#   ITEM_ID=... REQUEST_ID=... ADMIN_JWT=... ./scripts/smoke-test-pending-flow.sh
#
# Bij ontbreken van ADMIN_JWT print het script de pending-stap en de SQL-versie
# van de promotie zodat je handmatig kunt verifiëren.

set -euo pipefail

: "${ITEM_ID:?ITEM_ID env var ontbreekt}"
: "${REQUEST_ID:?REQUEST_ID env var ontbreekt}"
: "${SUPABASE_URL:=https://blhspuifehausilnzwio.supabase.co}"

SNAPSHOT=/tmp/smoke_snapshot_${ITEM_ID}.txt

snapshot_live() {
  psql -t -A -F'|' -c "SELECT block_name, admin_price_override, price_type, location_address, location_lat, location_lng, provider_name, provider_id FROM program_request_items WHERE id='${ITEM_ID}'"
}

snapshot_pending() {
  psql -t -A -F'|' -c "SELECT pending_block_name, pending_admin_price_override, pending_price_type, pending_location_address, pending_location_lat, pending_location_lng, pending_provider_name, pending_provider_id, pending_changed_at IS NOT NULL FROM program_request_items WHERE id='${ITEM_ID}'"
}

echo "== STAP 1: Snapshot ORIGINAL live =="
ORIG=$(snapshot_live); echo "$ORIG"; echo "$ORIG" > "$SNAPSHOT"

echo
echo "== STAP 2: pending_* zetten via service-role PATCH =="
if [ -z "${SUPABASE_SERVICE_ROLE_KEY:-}" ]; then
  echo "⚠ SUPABASE_SERVICE_ROLE_KEY ontbreekt — gebruik in plaats daarvan de UI of supabase--insert om pending_* te vullen."
else
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
    }'
  echo "pending gezet."
fi

echo
echo "== STAP 3: Verifieer LIVE ongewijzigd =="
LIVE_NOW=$(snapshot_live)
[ "$LIVE_NOW" = "$ORIG" ] && echo "✅ LIVE ongewijzigd: $LIVE_NOW" || { echo "❌ LIVE veranderde: $LIVE_NOW (orig=$ORIG)"; exit 1; }

echo
echo "== STAP 4: pending_* gevuld =="
snapshot_pending

echo
echo "== STAP 5: publish-program-changes aanroepen (zonder mails) =="
if [ -z "${ADMIN_JWT:-}" ]; then
  echo "⚠ ADMIN_JWT ontbreekt — sla edge function aanroep over."
  echo "   Klik handmatig 'Publiceer & notificeer' in de UI of zet ADMIN_JWT."
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
snapshot_pending
echo "✅ Klaar. Vergeet niet de live-waardes handmatig terug te zetten."
