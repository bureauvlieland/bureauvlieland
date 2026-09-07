#!/usr/bin/env python3
"""Zet de secrets van de edge functions over van het oude naar het nieuwe project.

Haalt ze op bij de tijdelijke edge function secrets-export in het oude project
(ingelogd als admin) en zet ze via de Supabase beheer-API in het nieuwe project.
Toont alleen namen en lengtes, nooit waarden.

Omgevingsvariabelen: OLD_URL OLD_ANON_KEY ADMIN_EMAIL ADMIN_PASSWORD NEW_REF
SUPABASE_ACCESS_TOKEN. Optie --dry-run: alleen ophalen en tellen.
"""
import json, os, sys, urllib.request, urllib.error

dry_run = "--dry-run" in sys.argv

def need(n):
    v = os.environ.get(n)
    if not v:
        sys.exit(f"Omgevingsvariabele {n} ontbreekt")
    return v

OLD_URL = need("OLD_URL").rstrip("/"); OLD_ANON = need("OLD_ANON_KEY")
NEW_REF = need("NEW_REF"); TOKEN = need("SUPABASE_ACCESS_TOKEN")

def call(url, body=None, headers=None, method=None):
    data = json.dumps(body).encode() if body is not None else None
    h = {"User-Agent": "bureauvlieland-migratie/1.0", **(headers or {})}
    req = urllib.request.Request(url, data=data, headers=h, method=method)
    try:
        with urllib.request.urlopen(req, timeout=60) as r:
            raw = r.read()
            return r.status, (json.loads(raw) if raw else None)
    except urllib.error.HTTPError as e:
        return e.code, e.read().decode()[:300]

# 1. Inloggen op het oude project
st, sess = call(f"{OLD_URL}/auth/v1/token?grant_type=password",
                {"email": need("ADMIN_EMAIL"), "password": need("ADMIN_PASSWORD")},
                {"apikey": OLD_ANON, "Content-Type": "application/json"})
if st != 200:
    sys.exit(f"Inloggen op oud project mislukt: HTTP {st}")
jwt = sess["access_token"]

# 2. Secrets ophalen
st, res = call(f"{OLD_URL}/functions/v1/secrets-export",
               headers={"apikey": OLD_ANON, "Authorization": f"Bearer {jwt}"})
if st == 404:
    sys.exit("secrets-export staat nog niet op het oude project (Lovable: \"deploy de edge function secrets-export\")")
if st != 200:
    sys.exit(f"secrets-export: HTTP {st} {res}")
secrets = res["secrets"]; missing = res["missing"]
print(f"Opgehaald uit oud project: {len(secrets)} secrets")
for n in sorted(secrets):
    print(f"  {n:34} {len(secrets[n]):>4} tekens")
if missing:
    print(f"Geen waarde in oud project ({len(missing)}): {', '.join(missing)}")

# 3. Wat staat er al in het nieuwe project?
mgmt = {"Authorization": f"Bearer {TOKEN}", "Content-Type": "application/json"}
st, existing = call(f"https://api.supabase.com/v1/projects/{NEW_REF}/secrets", headers=mgmt)
if st != 200:
    sys.exit(f"Beheer-API nieuw project: HTTP {st} {existing}")
have = {s["name"] for s in existing}
print(f"Al aanwezig in nieuw project: {len(have)} secrets" + (f" ({', '.join(sorted(have))})" if have else ""))

if dry_run:
    print("\nDry-run: niets gezet."); sys.exit(0)

# 4. Zetten (bestaande worden overschreven)
payload = [{"name": n, "value": v} for n, v in secrets.items()]
st, res = call(f"https://api.supabase.com/v1/projects/{NEW_REF}/secrets", payload, mgmt, "POST")
if st not in (200, 201):
    sys.exit(f"Secrets zetten mislukt: HTTP {st} {res}")

st, after = call(f"https://api.supabase.com/v1/projects/{NEW_REF}/secrets", headers=mgmt)
names_after = {s["name"] for s in after}
ok = [n for n in secrets if n in names_after]
print(f"\nKlaar: {len(ok)} van {len(secrets)} secrets staan nu in het nieuwe project.")
nog = [n for n in ["GEMINI_API_KEY", "OPENAI_API_KEY"] if n not in names_after]
if nog:
    print(f"Nog handmatig toevoegen (bestaan niet in Lovable): {', '.join(nog)}")
