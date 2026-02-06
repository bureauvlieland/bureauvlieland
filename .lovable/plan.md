

# Plan: Opschonen Testdata in Test & Live Database

## Samenvatting

Alle testdata wordt verwijderd uit beide databases (Test en Live), waarbij alleen de aanvragen van **Jack Frieling** behouden blijven.

---

## Te Behouden Records

| Tabel | ID | Naam |
|-------|-----|------|
| program_requests | `b8c87342-7fd9-43ce-a04f-36e6f17aa5fa` | Jack Frieling |
| program_requests | `d57eefa0-d422-42cf-893a-6a0cec0b9ac7` | Jack Frieling |
| accommodation_requests | `ed3bf3a1-b29d-4f12-a898-e90e35f92ceb` | Jack Frieling |

---

## Aanpak per Database

### Test Database (Preview)
- Wordt automatisch uitgevoerd via Lovable's insert tool
- Direct effect op de preview omgeving

### Live Database (Productie)
- SQL-queries worden gegenereerd die je handmatig uitvoert
- Via: **Cloud View → Run SQL → Selecteer "Live"**

---

## Te Verwijderen Data

### Stap 1: Gerelateerde records eerst verwijderen (foreign key dependencies)

```sql
-- 1a. Verwijder program_request_history voor te verwijderen requests
DELETE FROM program_request_history 
WHERE request_id NOT IN (
  'b8c87342-7fd9-43ce-a04f-36e6f17aa5fa',
  'd57eefa0-d422-42cf-893a-6a0cec0b9ac7'
);

-- 1b. Verwijder program_request_items voor te verwijderen requests
DELETE FROM program_request_items 
WHERE request_id NOT IN (
  'b8c87342-7fd9-43ce-a04f-36e6f17aa5fa',
  'd57eefa0-d422-42cf-893a-6a0cec0b9ac7'
);

-- 1c. Verwijder accepted_terms_log voor te verwijderen requests
DELETE FROM accepted_terms_log 
WHERE request_id NOT IN (
  'b8c87342-7fd9-43ce-a04f-36e6f17aa5fa',
  'd57eefa0-d422-42cf-893a-6a0cec0b9ac7'
);

-- 1d. Verwijder bureau_invoices voor te verwijderen requests
DELETE FROM bureau_invoices 
WHERE request_id NOT IN (
  'b8c87342-7fd9-43ce-a04f-36e6f17aa5fa',
  'd57eefa0-d422-42cf-893a-6a0cec0b9ac7'
);

-- 1e. Verwijder partner_purchase_invoices voor te verwijderen requests
DELETE FROM partner_purchase_invoices 
WHERE request_id NOT IN (
  'b8c87342-7fd9-43ce-a04f-36e6f17aa5fa',
  'd57eefa0-d422-42cf-893a-6a0cec0b9ac7'
);

-- 1f. Verwijder project_communications voor te verwijderen requests
DELETE FROM project_communications 
WHERE request_id NOT IN (
  'b8c87342-7fd9-43ce-a04f-36e6f17aa5fa',
  'd57eefa0-d422-42cf-893a-6a0cec0b9ac7'
);

-- 1g. Verwijder admin_todos gerelateerd aan te verwijderen requests
DELETE FROM admin_todos 
WHERE related_request_id NOT IN (
  'b8c87342-7fd9-43ce-a04f-36e6f17aa5fa',
  'd57eefa0-d422-42cf-893a-6a0cec0b9ac7'
)
AND related_request_id IS NOT NULL;
```

### Stap 2: Accommodation gerelateerde data

```sql
-- 2a. Verwijder accommodation_quote_extras voor te verwijderen quotes
DELETE FROM accommodation_quote_extras 
WHERE quote_id IN (
  SELECT id FROM accommodation_quotes 
  WHERE request_id != 'ed3bf3a1-b29d-4f12-a898-e90e35f92ceb'
);

-- 2b. Verwijder accommodation_quotes voor te verwijderen requests
DELETE FROM accommodation_quotes 
WHERE request_id != 'ed3bf3a1-b29d-4f12-a898-e90e35f92ceb';

-- 2c. Verwijder project_communications voor te verwijderen accommodation requests
DELETE FROM project_communications 
WHERE accommodation_id NOT IN ('ed3bf3a1-b29d-4f12-a898-e90e35f92ceb')
AND accommodation_id IS NOT NULL;
```

### Stap 3: Email logs opschonen

```sql
-- 3a. Verwijder email_log voor te verwijderen requests
DELETE FROM email_log 
WHERE related_request_id NOT IN (
  'b8c87342-7fd9-43ce-a04f-36e6f17aa5fa',
  'd57eefa0-d422-42cf-893a-6a0cec0b9ac7'
)
AND related_request_id IS NOT NULL;

-- 3b. Verwijder email_log voor te verwijderen accommodation requests
DELETE FROM email_log 
WHERE related_accommodation_id NOT IN ('ed3bf3a1-b29d-4f12-a898-e90e35f92ceb')
AND related_accommodation_id IS NOT NULL;
```

### Stap 4: Hoofdtabellen opschonen

```sql
-- 4a. Verwijder program_requests (behalve Jack Frieling)
DELETE FROM program_requests 
WHERE id NOT IN (
  'b8c87342-7fd9-43ce-a04f-36e6f17aa5fa',
  'd57eefa0-d422-42cf-893a-6a0cec0b9ac7'
);

-- 4b. Verwijder accommodation_requests (behalve Jack Frieling)
DELETE FROM accommodation_requests 
WHERE id != 'ed3bf3a1-b29d-4f12-a898-e90e35f92ceb';
```

### Stap 5: Overige test data

```sql
-- 5a. Verwijder alle shared_programs (test configuraties)
DELETE FROM shared_programs;

-- 5b. Verwijder admin_todos zonder request relatie (optioneel)
-- DELETE FROM admin_todos WHERE related_request_id IS NULL;
```

---

## Uitvoering

### Test Database
Ik zal de queries automatisch uitvoeren via de insert tool.

### Live Database
Na goedkeuring ontvang je een gecombineerde SQL-query die je kunt uitvoeren via:
1. Open **Cloud View** (backend beheer)
2. Ga naar **Run SQL**
3. Selecteer **"Live"** in de environment selector
4. Plak de SQL en voer uit

---

## Waarschuwing

- **Onomkeerbaar**: Verwijderde data kan niet worden hersteld
- **Controleer eerst**: Zorg dat Jack Frieling's data correct is geïdentificeerd
- **Live apart**: Live database vereist handmatige uitvoering

