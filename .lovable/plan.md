
# Gastenlijst uitbreiden + documenten uploaden

## Deel 1 — Gastenlijst ontbreekt in logies-bewerken

**Probleem:** Op de logies-aanvraag (LOG-…) toont "Bewerken" alleen Kamerindeling. Gastenlijst en dieetwensen zijn er niet, omdat die kolommen alleen op `program_requests` staan, niet op `accommodation_requests`.

**Oplossing:**
- Migratie: kolommen `guest_names text` en `dietary_notes text` toevoegen aan `accommodation_requests`.
- `AdminGuestDetailsDialog` (scope `accommodation_request`) uitbreiden zodat óók Gastenlijst + Dieetwensen bewerkt kunnen worden (zelfde velden als bij programma).
- `AdminAccommodationDetail` het "Groep & wensen"-blok voeden met de nieuwe velden (`showDietary=true`, guest_names uit request).
- Klantomgeving (`EditGuestDetailsDialog` + `CustomerProgram`/`useCustomerProgram`) laten schrijven naar `accommodation_requests.guest_names` / `dietary_notes` als er een gekoppelde logies-aanvraag is.
- Partner-portal (`PartnerAccommodationRequestCard`, `PartnerAccommodationQuoteSheet`) tonen guest_names/dietary_notes (waar relevant) uit de accommodation_request.

## Deel 2 — Documenten uploaden (spreadsheet / Word / PDF)

**Scope (bevestigd):** Beide niveaus mogelijk (project-breed én per aanvraag). Alle partners op het project mogen projectdocumenten zien.

### Nieuwe tabel `project_documents`
Kolommen (naast standaard id / created_at / updated_at):
- `program_request_id uuid` (nullable, FK → program_requests)
- `accommodation_request_id uuid` (nullable, FK → accommodation_requests)  
  → precies één van beide is verplicht (CHECK).
- `scope text` = `'project' | 'accommodation'` (afgeleid; voor RLS-eenvoud).
- `file_path text` (pad in storage bucket)
- `file_name text`, `file_size bigint`, `mime_type text`
- `uploaded_by text` = `'admin' | 'customer' | 'partner'`
- `uploaded_by_user_id uuid` (nullable, auth.users)
- `uploaded_by_partner_id text` (nullable)
- `uploaded_by_name text` (voor tonen zonder join)
- `label text` (bv. "Kamerindeling", "Gastenlijst"), `description text` (nullable)
- `is_visible_to_partners boolean` default `true` (admin kan intern toggelen)
- `is_visible_to_customer boolean` default `true`

### Storage bucket `project-documents` (privé)
- Bucket aanmaken via `supabase--storage_create_bucket` (public=false).
- Paden: `program/{program_request_id}/{uuid}-{filename}` of `accommodation/{accommodation_request_id}/{uuid}-{filename}`.
- Downloaden via signed URLs (edge function) zodat RLS werkt.

### RLS-policies op `project_documents`
- **Admin**: alles (via `is_admin(auth.uid())`).
- **Klant** (anon met customer_token) — geen auth-context, dus via edge function `list-project-documents` + `get-project-document-url` (token verifieert program_requests.customer_token of accommodation_requests.customer_token). Directe RLS voor `anon`: alleen SELECT waar het bijbehorende program/accommodation een niet-verlopen customer_token heeft — te complex, dus liever edge-function met service-role. Zelfde voor upload: edge function `upload-project-document` (klant PUT via signed upload URL, edge maakt rij aan).
- **Partner** (authenticated): SELECT wanneer `is_visible_to_partners = true` én de partner een `program_request_items`- of `accommodation_quotes`-relatie heeft met het gekoppelde project. Helper: `partner_can_view_program_request(_uid, _prid)` (nieuw) + bestaande `partner_can_view_accommodation_request`.
- **Klant-upload via anon RLS** kan ook, maar edge function is veiliger; we kiezen edge function.

### Edge functions
- `upload-project-document` — accepteert customer_token OF admin JWT OF partner JWT, valideert scope, geeft signed upload URL terug + maakt rij aan (of maakt rij aan ná bevestiging van upload).  
  Voor eenvoud: klant/partner uploaden via een 2-staps flow: 1) POST metadata → edge geeft signed URL, 2) client PUTs bestand, 3) POST confirm → edge markeert als upload_complete.
- `get-project-document-url` — geeft signed download URL (15 min) op basis van rechten.
- `delete-project-document` — admin en uploader-zelf.

### UI-componenten
Nieuwe herbruikbare component `ProjectDocumentsPanel` met props `{ programRequestId?, accommodationRequestId?, viewer: 'admin' | 'customer' | 'partner', canUpload, canDelete }`:
- Lijst met naam / grootte / uploader / datum + download-knop.
- Upload-zone (drag & drop + file picker), toegestane types: `.pdf, .doc, .docx, .xls, .xlsx, .csv, .png, .jpg, .jpeg`, max 20 MB.
- Optioneel label-veld ("bv. Kamerindeling").

Inbouwen in:
- **Admin** — `AdminAccommodationDetail` (rechterkolom, onder "Groep & wensen") en `AdminRequestDetail` (nieuw tabblad "Documenten" of blok onder de header). Admin ziet zowel project- als accommodation-scope documenten.
- **Klant** — `CustomerProgram` (nieuw kaartje "Documenten") en `CustomerAccommodation` (idem). Klant mag zelf uploaden.
- **Partner** — `PartnerAccommodationRequestCard` + `PartnerAccommodationQuoteSheet` én `PartnerItemSheet`: read-only lijst met download-knoppen. Partner ziet alleen documenten met `is_visible_to_partners=true` van het project waar hij aan werkt.

## Buiten scope
- Versionering van documenten (nieuwe upload = nieuwe rij).
- Antivirus-scan (later).

## Technische samenvatting
- 1 migratie: velden op `accommodation_requests` + tabel `project_documents` + helper-function `partner_can_view_program_request` + RLS + GRANTs.
- 1 bucket-aanmaak (`project-documents`, private).
- 3 edge functions (upload, get-url, delete).
- 1 nieuwe React-component + integratie op admin/klant/partner pagina's.
- Uitbreiding `AdminGuestDetailsDialog` + `EditGuestDetailsDialog` + `useCustomerProgram` voor gastenlijst op accommodation-scope.
