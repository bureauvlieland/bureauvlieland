

## Plan: PDF-upload bij logiesofferte + bevestigingstekst aanpassen

### Twee onderdelen

**1. Bevestigingsdialoog tekst aanpassen**
De tekst "De accommodatie zal contact met u opnemen om de reservering af te ronden" klopt niet altijd. Aanpassen naar een neutralere formulering, bijv.: "Bureau Vlieland neemt contact met u op over de verdere afhandeling."

**2. PDF-document upload voor partner bij offerte-indienst**

De database heeft al `quote_attachment_path` en `quote_attachment_filename` kolommen op `accommodation_quotes`, maar ze worden nergens gevuld. Er is een `quote-documents` storage bucket, maar die is alleen toegankelijk voor admins.

**Wat we bouwen:**

- **Storage**: nieuw bucket `accommodation-quote-attachments` met RLS-policies voor partners (upload/lezen eigen bestanden) en admins (alles lezen). Klanten lezen via een publieke URL of signed URL.
- **Partner quote sheet**: file-upload veld toevoegen naast het bestaande URL-veld. Partner kan een PDF/document uploaden. Bij herindienst kan een nieuw document geüpload worden (vervangt het vorige in de quote, maar historie wordt bewaard).
- **Submit-flow**: bij indienst het bestand uploaden naar storage, `quote_attachment_path` en `quote_attachment_filename` vullen op de quote. Bij herindienst: oud document-pad loggen in historie (via `accommodation_quote_history`), nieuw document opslaan.
- **Klantportaal**: in `AccommodationQuoteDetailSheet` het bijgevoegde document tonen als downloadlink naast de bestaande externe URL.
- **Admin**: in `AdminAccommodationQuoteSheet` het document ook tonen (werkt al deels, maar path is nooit gevuld).

**Documenthistorie**: de bestaande `accommodation_quote_history` tabel slaat al snapshots op bij reset. Het `quote_attachment_path` zit daar al in. Geen extra tabel nodig — bij elke herindienst wordt de vorige versie automatisch bewaard in de history.

### Wijzigingen

| Bestand | Actie |
|---|---|
| `src/components/accommodation-portal/SelectQuoteDialog.tsx` | Bevestigingstekst aanpassen |
| `src/components/partner-portal/PartnerAccommodationQuoteSheet.tsx` | File-upload input toevoegen, bestand meegeven bij submit |
| `src/pages/PartnerAccommodation.tsx` | Bestand uploaden naar storage bij submit, path/filename opslaan |
| `src/components/accommodation-portal/AccommodationQuoteDetailSheet.tsx` | Download-link voor bijlage tonen |
| Migratie | Bucket `accommodation-quote-attachments` aanmaken met RLS-policies voor partners en public read |

Vijf bestanden + 1 migratie.

