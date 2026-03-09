## Projecten verwijderen, Logies in navigatie, en Communicatie-privacy

### Drie onderdelen

**1. Projecten verwijderen met loskoppeling logies**

Momenteel kan een project niet verwijderd worden (geen DELETE policy). Bij verwijdering moet de vraag gesteld worden of de  koppeling met logiesaanvragen behouden moet blijven — de logiesaanvraag draait zelfstandig door of dat de logiesaanvraag ook verwijderd dient te worden..

Aanpak:

- Bij verwijdering: `linked_accommodation_id` op het project op `null` zetten, en `linked_program_id` op de accommodation_request op `null` zetten — daarna het project soft-deleten (status → `deleted`) of hard-deleten inclusief cascade van `program_request_items`, `project_communications`, `admin_todos`, `bureau_invoices`, `accepted_terms_log`, `email_log` referenties.
- Soft-delete (status = `deleted`) is veiliger — data blijft beschikbaar voor facturatie-historie. Projectoverzicht filtert `deleted` standaard uit.
- Bevestigingsdialog met waarschuwing als er gekoppelde logiesaanvragen, facturen of commissies zijn.

**2. Logies als apart item in de sidebar**

`/admin/logies` bestaat al maar staat niet in de navigatie. Toevoegen aan de Operationeel sectie. Per logiesaanvraag tonen of het gekoppeld is aan een maatwerk-project (bureau_central) of direct aan de klant:

- Badge/kolom "Maatwerk" vs "Direct" op basis van het gekoppelde `program_requests.invoicing_mode`
- Bij losgekoppelde aanvragen (geen `linked_program_id`): tonen als "Zelfstandig"

**3. Communicatie-privacy bij bureau_central logies**

Belangrijk probleem gevonden: de `send-customer-accommodation-message` functie stuurt momenteel bij bureau_central projecten wél klant-PII (email, telefoon) naar de partner. Dit schendt het privacy-first principe.

Aanpak:

- In `send-customer-accommodation-message`: check `invoicing_mode` van het gekoppelde project
- Bij `bureau_central`: klant-contactgegevens verbergen in de email, Reply-To instellen op `hallo@bureauvlieland.nl` in plaats van het klant-emailadres, en bericht BCC'en naar Bureau Vlieland zodat zij als tussenpersoon fungeren
- Bij `partner_direct`: bestaand gedrag behouden (Reply-To = klant)
- In het klantportaal: bij `bureau_central` de "Stuur bericht" knop naar de partner verbergen of omzetten naar "Stuur bericht via Bureau Vlieland"

### Technische wijzigingen

**Database:**

```sql
-- Soft-delete support
-- program_requests.status al bestaand, voegen 'deleted' toe als waarde

-- RLS policy voor delete (of update naar deleted)
CREATE POLICY "Admins can delete program requests"
ON public.program_requests FOR DELETE TO authenticated
USING (is_admin(auth.uid()));
```

**Bestanden:**


| Bestand                                                           | Wijziging                                                                      |
| ----------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| `src/components/admin/AdminLayout.tsx`                            | "Logies" toevoegen aan Operationeel sectie (Hotel icon)                        |
| `src/pages/admin/AdminProjects.tsx`                               | Verwijder-knop per project met bevestigingsdialog, loskoppeling logies         |
| `src/pages/admin/AdminAccommodation.tsx`                          | Kolom "Type" toevoegen: Maatwerk/Direct/Zelfstandig                            |
| `supabase/functions/send-customer-accommodation-message/index.ts` | Privacy-check: bij bureau_central PII verbergen, Reply-To naar Bureau Vlieland |
| `src/components/customer-portal/ContactAccommodationDialog.tsx`   | Bij bureau_central uitleg tonen dat bericht via Bureau Vlieland gaat           |


### Communicatieflow bij bureau_central (nieuw)

```text
Klant stuurt bericht → Bureau Vlieland ontvangt (als tussenpersoon)
                     → Bureau Vlieland stuurt door naar partner (zonder klant-PII)
                     → Partner antwoordt aan Bureau Vlieland
                     → Bureau Vlieland stuurt door naar klant
```

Bij `partner_direct` blijft het huidige model: klant communiceert direct met partner.