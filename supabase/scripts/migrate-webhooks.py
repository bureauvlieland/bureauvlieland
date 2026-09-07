#!/usr/bin/env python3
"""Zet de webhooks van Mailjet en Twilio om naar het nieuwe Supabase-project.

Haalt de benodigde sleutels op via de tijdelijke edge function secrets-export
(oude project, admin-login), en gebruikt daarmee de API's van Mailjet en
Twilio. Toont URL's met het token afgeschermd; waarden komen niet in beeld.

  --list        alleen tonen wat er nu geregistreerd staat (standaard)
  --apply       omzetten naar het nieuwe project
  --target old  (met --apply) terugzetten naar het oude project (vangnet)

Omgevingsvariabelen: OLD_URL OLD_ANON_KEY ADMIN_EMAIL ADMIN_PASSWORD NEW_URL
"""
import base64, json, os, re, sys, urllib.parse, urllib.request, urllib.error

apply = "--apply" in sys.argv
target = sys.argv[sys.argv.index("--target") + 1] if "--target" in sys.argv else "new"

def need(n):
    v = os.environ.get(n)
    if not v: sys.exit(f"Omgevingsvariabele {n} ontbreekt")
    return v

OLD_URL = need("OLD_URL").rstrip("/"); NEW_URL = need("NEW_URL").rstrip("/")
BASE = (NEW_URL if target == "new" else OLD_URL) + "/functions/v1"

def call(url, body=None, headers=None, method=None, form=False):
    if body is not None:
        data = urllib.parse.urlencode(body).encode() if form else json.dumps(body).encode()
    else:
        data = None
    h = {"User-Agent": "bureauvlieland-migratie/1.0", **(headers or {})}
    if body is not None:
        h["Content-Type"] = "application/x-www-form-urlencoded" if form else "application/json"
    req = urllib.request.Request(url, data=data, headers=h, method=method)
    try:
        with urllib.request.urlopen(req, timeout=60) as r:
            raw = r.read(); return r.status, (json.loads(raw) if raw else None)
    except urllib.error.HTTPError as e:
        return e.code, e.read().decode()[:300]
    except urllib.error.URLError as e:
        return 0, f"niet bereikbaar ({e.reason}); staat de host in de netwerkregels van de Claude-omgeving?"

# --- sleutels ophalen -------------------------------------------------------
anon = need("OLD_ANON_KEY")
st, sess = call(f"{OLD_URL}/auth/v1/token?grant_type=password",
                {"email": need("ADMIN_EMAIL"), "password": need("ADMIN_PASSWORD")}, {"apikey": anon})
if st != 200: sys.exit(f"Inloggen op oud project mislukt: HTTP {st}")
st, res = call(f"{OLD_URL}/functions/v1/secrets-export", headers={"apikey": anon, "Authorization": f"Bearer {sess['access_token']}"})
if st != 200: sys.exit(f"secrets-export: HTTP {st} {res}")
S = res["secrets"]
for n in ["MAILJET_API_KEY", "MAILJET_SECRET_KEY", "MAILJET_WEBHOOK_TOKEN", "MAILJET_INBOUND_WEBHOOK_SECRET",
          "TWILIO_ACCOUNT_SID", "TWILIO_AUTH_TOKEN", "TWILIO_WHATSAPP_NUMBER"]:
    if n not in S: sys.exit(f"Secret {n} ontbreekt in het oude project")

def mask(url):
    return re.sub(r"(token=)[^&]+", r"\1***", url or "")

# --- Mailjet ----------------------------------------------------------------
mj = {"Authorization": "Basic " + base64.b64encode(f"{S['MAILJET_API_KEY']}:{S['MAILJET_SECRET_KEY']}".encode()).decode()}
MJ = "https://api.mailjet.com/v3/REST"
EVENTS = ["sent", "open", "click", "bounce", "blocked", "spam", "unsub"]
event_target = f"{BASE}/mailjet-event-webhook?token={S['MAILJET_WEBHOOK_TOKEN']}"
parse_target = f"{BASE}/inbound-email?token={S['MAILJET_INBOUND_WEBHOOK_SECRET']}"

print("== Mailjet event-webhook")
st, cbs = call(f"{MJ}/eventcallbackurl", headers=mj)
if st != 200: sys.exit(f"Mailjet eventcallbackurl: HTTP {st} {cbs}")
cbs = cbs["Data"]
for cb in cbs:
    print(f"  [{cb['ID']}] {cb['EventType']:8} v{cb['Version']} {cb['Status']:6} {mask(cb['Url'])}")
if not cbs: print("  (geen)")

print("== Mailjet inbound parse")
st, routes = call(f"{MJ}/parseroute", headers=mj)
if st != 200: sys.exit(f"Mailjet parseroute: HTTP {st} {routes}")
routes = routes["Data"]
for r in routes:
    print(f"  [{r['ID']}] {r.get('Email','?'):40} {mask(r['Url'])}")
if not routes: print("  (geen)")

# --- Twilio -----------------------------------------------------------------
tw = {"Authorization": "Basic " + base64.b64encode(f"{S['TWILIO_ACCOUNT_SID']}:{S['TWILIO_AUTH_TOKEN']}".encode()).decode()}
TW = f"https://api.twilio.com/2010-04-01/Accounts/{S['TWILIO_ACCOUNT_SID']}"
wa_target = f"{BASE}/whatsapp-webhook"
number = S["TWILIO_WHATSAPP_NUMBER"].replace("whatsapp:", "")

print("== Twilio telefoonnummers (sms/whatsapp inbound-webhook)")
st, nums = call(f"{TW}/IncomingPhoneNumbers.json?PageSize=50", headers=tw)
if st != 200: sys.exit(f"Twilio IncomingPhoneNumbers: HTTP {st} {nums}")
nums = nums["incoming_phone_numbers"]
for n in nums:
    flag = " <- WhatsApp-nummer" if n["phone_number"] == number else ""
    print(f"  [{n['sid']}] {n['phone_number']:16} sms_url={n.get('sms_url') or '-'}{flag}")
if not nums: print("  (geen)")

print("== Twilio WhatsApp senders (messaging.twilio.com)")
st, senders = call("https://messaging.twilio.com/v2/Channels/Senders?Channel=whatsapp&PageSize=50", headers=tw)
sender_list = []
if st == 200:
    sender_list = senders.get("senders", [])
    for sd in sender_list:
        wh = sd.get("webhook") or {}
        print(f"  [{sd['sid']}] {sd.get('sender_id','?'):26} status={sd.get('status','?'):10} callback_url={wh.get('callback_url') or '-'}")
    if not sender_list: print("  (geen)")
else:
    print(f"  niet opvraagbaar (HTTP {st} {senders}); zie console.twilio.com → Messaging → Senders → WhatsApp senders")

print("== Twilio messaging services")
st, svcs = call("https://messaging.twilio.com/v1/Services?PageSize=50", headers=tw)
svc_list = svcs.get("services", []) if st == 200 else []
for sv in svc_list:
    print(f"  [{sv['sid']}] {sv['friendly_name']:26} inbound_request_url={sv.get('inbound_request_url') or '-'}")
if st == 200 and not svc_list: print("  (geen)")
if st != 200: print(f"  niet opvraagbaar (HTTP {st} {svcs})")

if not apply:
    print(f"\nAlleen getoond, niets gewijzigd. Doel bij --apply ({target}): {BASE}/…")
    sys.exit(0)

# --- Omzetten ---------------------------------------------------------------
print(f"\n== Omzetten naar {target}: {BASE}")
# Mailjet events: verwijder afwijkende registraties, zorg voor één per type.
for cb in cbs:
    if cb["Url"] != event_target:
        st, _ = call(f"{MJ}/eventcallbackurl/{cb['ID']}", headers=mj, method="DELETE")
        print(f"  Mailjet event {cb['EventType']:8} oude registratie verwijderd (HTTP {st})")
st, cbs = call(f"{MJ}/eventcallbackurl", headers=mj); cbs = cbs["Data"]
have = {cb["EventType"] for cb in cbs if cb["Url"] == event_target}
for ev in EVENTS:
    if ev in have: print(f"  Mailjet event {ev:8} stond al goed"); continue
    st, r = call(f"{MJ}/eventcallbackurl", {"EventType": ev, "Url": event_target, "Version": 2, "Status": "alive", "IsBackup": False}, mj, "POST")
    print(f"  Mailjet event {ev:8} aangemaakt (HTTP {st})" + ("" if st in (200, 201) else f" {r}"))
# Mailjet parse routes
for r in routes:
    if r["Url"] == parse_target: print(f"  Mailjet parse [{r['ID']}] stond al goed"); continue
    st, res = call(f"{MJ}/parseroute/{r['ID']}", {"Url": parse_target}, mj, "PUT")
    print(f"  Mailjet parse [{r['ID']}] bijgewerkt (HTTP {st})" + ("" if st == 200 else f" {res}"))
# Twilio: nummer (sms_url), WhatsApp sender (webhook), messaging service (inbound)
for n in nums:
    if n["phone_number"] != number: continue
    if n.get("sms_url") == wa_target: print("  Twilio nummer stond al goed"); continue
    st, res = call(f"{TW}/IncomingPhoneNumbers/{n['sid']}.json", {"SmsUrl": wa_target, "SmsMethod": "POST"}, tw, "POST", form=True)
    print(f"  Twilio nummer sms_url bijgewerkt (HTTP {st})" + ("" if st == 200 else f" {res}"))
for sd in sender_list:
    if number not in sd.get("sender_id", ""): continue
    wh = sd.get("webhook") or {}
    if wh.get("callback_url") == wa_target: print("  Twilio WhatsApp sender stond al goed"); continue
    st, res = call(f"https://messaging.twilio.com/v2/Channels/Senders/{sd['sid']}", {"webhook": {"callback_url": wa_target, "callback_method": "POST"}}, tw, "POST")
    print(f"  Twilio WhatsApp sender webhook bijgewerkt (HTTP {st})" + ("" if st in (200, 202) else f" {res}"))
for sv in svc_list:
    cur = sv.get("inbound_request_url") or ""
    if "whatsapp-webhook" not in cur: continue
    if cur == wa_target: print(f"  Twilio service {sv['friendly_name']} stond al goed"); continue
    st, res = call(f"https://messaging.twilio.com/v1/Services/{sv['sid']}", {"InboundRequestUrl": wa_target, "InboundMethod": "POST"}, tw, "POST", form=True)
    print(f"  Twilio service {sv['friendly_name']} bijgewerkt (HTTP {st})" + ("" if st == 200 else f" {res}"))
print("\nKlaar. Controleer: Admin → E-mail gezondheid → Zelftest, en stuur een test-WhatsApp.")
