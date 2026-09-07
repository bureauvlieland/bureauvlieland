#!/usr/bin/env bash
# Maakt mark-migrations-applied.sql uit de bestandsnamen in supabase/migrations/.
set -euo pipefail
cd "$(dirname "$0")/../.."
echo "-- Gegenereerd uit supabase/migrations/ (ls | sed). Opnieuw maken na nieuwe migraties:"
echo "--   supabase/scripts/gen-migration-history.sh > supabase/scripts/mark-migrations-applied.sql"
echo "-- Lovable registreerde migraties onder een versienummer dat 1-2 seconden afwijkt van de"
echo "-- bestandsnaam in de repo. De Supabase CLI zou daardoor alle migraties opnieuw willen"
echo "-- draaien. Dit zet de historie gelijk aan de repo, zonder iets uit te voeren."
echo "BEGIN;"
echo "TRUNCATE supabase_migrations.schema_migrations;"
echo "INSERT INTO supabase_migrations.schema_migrations (version, name) VALUES"
ls supabase/migrations/*.sql | xargs -n1 basename | sed -E "s/^([0-9]+)_(.*)\.sql$/  ('\1', '\2'),/" | sed '$ s/,$/;/'
echo "COMMIT;"
