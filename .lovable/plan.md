

# Template toepassen en Programma opslaan als template

## Wat wordt er gebouwd?

Twee nieuwe admin-functionaliteiten op de projectdetailpagina:

1. **Template toepassen op bestaand project** -- Een knop "Template toepassen" waarmee een admin een voorbeeldprogramma kan selecteren en alle bouwstenen in een keer kan toevoegen aan een bestaand project.

2. **Programma opslaan als template** -- Een knop "Opslaan als template" waarmee de huidige activiteiten van een project als nieuw voorbeeldprogramma worden opgeslagen.

---

## Functionaliteit in detail

### 1. Template toepassen

- Nieuwe knop naast "Activiteit toevoegen" op de projectdetailpagina
- Opent een dialog met:
  - Lijst van alle gepubliceerde templates (naam, duur, aantal bouwstenen, indicatieve prijs)
  - Preview van de geselecteerde template (welke bouwstenen per dag)
  - Bevestigknop "Toepassen"
- Bij bevestiging worden alle template-items als `program_request_items` ingevoegd met:
  - `day_index` en `preferred_time` uit de template
  - `status: "pending"`, `item_quote_status: "concept"`
  - `skip_partner_notification: true` (admin voegt handmatig toe)
  - Provider-info uit de gekoppelde `building_block`
- Bestaande activiteiten blijven behouden (template wordt toegevoegd, niet vervangen)
- Admin logging na toepassen

### 2. Opslaan als template

- Nieuwe knop in het activiteiten-kaartje (dropdown of naast de andere knoppen)
- Opent een dialog met:
  - Naam voor de template (verplicht)
  - ID/slug (auto-gegenereerd uit naam)
  - Korte beschrijving (optioneel)
  - Duur wordt automatisch bepaald op basis van het maximale `day_index + 1`
  - Optie om direct te publiceren of als concept op te slaan
- Bij bevestiging:
  - Nieuwe rij in `program_templates`
  - Voor elke `program_request_item` wordt een `program_template_item` aangemaakt met `block_id`, `day_index`, `preferred_time`, en `sort_order`
  - Bevestigingsmelding met link naar template-beheer

---

## Technische details

### Nieuwe componenten

| Component | Doel |
|---|---|
| `src/components/admin/ApplyTemplateDialog.tsx` | Dialog voor template selectie en toepassing op een project |
| `src/components/admin/SaveAsTemplateDialog.tsx` | Dialog voor het opslaan van een programma als template |

### Wijzigingen in bestaande bestanden

| Bestand | Wijziging |
|---|---|
| `src/pages/admin/AdminRequestDetail.tsx` | Twee nieuwe knoppen toevoegen in de activiteiten-card header + state en imports |

### Geen database-wijzigingen nodig
De bestaande tabellen `program_templates`, `program_template_items`, `program_request_items` en `building_blocks` bevatten alle benodigde kolommen.

### Data flow: Template toepassen

1. Admin selecteert template in dialog
2. Template-items worden opgehaald via `useTemplateWithItems`
3. Voor elk template-item wordt de bijbehorende `building_block` opgezocht (provider-info nodig)
4. Batch-insert in `program_request_items` via Supabase
5. Refetch project-data, toon bevestiging

### Data flow: Opslaan als template

1. Admin vult naam en slug in
2. Insert in `program_templates` met afgeleide `duration_days`
3. Voor elk `program_request_item` een insert in `program_template_items` met `block_id`, `day_index`, `preferred_time`
4. Toon bevestiging met optie om naar template-beheer te navigeren

