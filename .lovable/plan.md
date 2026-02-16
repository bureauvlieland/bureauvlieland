

# Offerte-PDF beschikbaar maken in klantportaal

## Wat verandert

Wanneer een admin een maatwerkofferte verstuurt, wordt de PDF automatisch opgeslagen in storage. De klant kan deze vervolgens downloaden vanuit het klantportaal. Voor door de klant zelf samengestelde programma's is de bestaande "Download PDF"-knop al beschikbaar.

## Aanpak

### 1. Database: nieuw veld `quote_pdf_path`
Een nieuw tekstveld op `program_requests` om het pad naar de opgeslagen offerte-PDF bij te houden.

### 2. Storage bucket
Een nieuwe storage bucket `quote-documents` (privaat, toegang via signed URLs) voor het opslaan van offerte-PDF's.

### 3. Edge function `send-quote-offer` uitbreiden
Bij het versturen van de offerte:
- De base64 PDF die al beschikbaar is, opslaan in de `quote-documents` bucket
- Het pad opslaan in `program_requests.quote_pdf_path`

### 4. Edge function `get-customer-program` uitbreiden
- Als `quote_pdf_path` gevuld is, een signed URL genereren (geldig voor 1 uur) en meegeven in de response

### 5. Klantportaal: download-knop tonen
In `DesktopProgramView` en `MobileProgramView`:
- Voor maatwerk-programma's met een opgeslagen offerte: een "Bekijk offerte" knop tonen die de signed URL opent
- Voor self-service programma's: de bestaande ProgramPdfDownload knop blijft ongewijzigd

## Technische details

### Database-migratie
```sql
ALTER TABLE program_requests ADD COLUMN quote_pdf_path text;
```

### Storage bucket
```sql
INSERT INTO storage.buckets (id, name, public) VALUES ('quote-documents', 'quote-documents', false);

-- RLS: alleen service role kan schrijven, admins kunnen lezen
CREATE POLICY "Admins can read quote documents"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'quote-documents' AND public.is_admin(auth.uid()));

CREATE POLICY "Service role can manage quote documents"
  ON storage.objects FOR ALL
  USING (bucket_id = 'quote-documents' AND auth.role() = 'service_role');
```

### Bestanden die worden aangepast

1. **`supabase/functions/send-quote-offer/index.ts`**
   - Na het versturen van de e-mail: PDF opslaan in storage via service role client
   - Pad opslaan in `quote_pdf_path` op het program_request record

2. **`supabase/functions/get-customer-program/index.ts`**
   - Als `quote_pdf_path` gevuld is: signed URL genereren en meegeven als `quote_pdf_url`

3. **`src/hooks/useCustomerProgram.ts`**
   - `quote_pdf_url` uit de response opnemen in het program object

4. **`src/components/customer-portal/DesktopProgramView.tsx`**
   - "Bekijk offerte" knop toevoegen naast de bestaande ProgramPdfDownload knop, zichtbaar als `quote_pdf_url` beschikbaar is

5. **`src/components/customer-portal/MobileProgramView.tsx`**
   - Zelfde aanpassing als DesktopProgramView

### Voorbeeld weergave (desktop)
De offerte-knop verschijnt in het actie-menu bij het programma-overzicht:

```
[Download PDF]  [Bekijk offerte]  [Bewerken]
```

- "Download PDF" = bestaande programma-overzicht (altijd zichtbaar)
- "Bekijk offerte" = de door Bureau Vlieland opgestelde offerte-PDF (alleen zichtbaar bij maatwerk)

