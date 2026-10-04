-- Commissies fase 0: data opschonen (docs/plan-commissiefacturen.md §2.3 en §4).
-- Bewust defensief: elke stap werkt alleen op precies de bekende rijen en
-- doet niets als de situatie afwijkt van wat het plan beschrijft.
--
-- NIET in deze migratie (vraagt eerst controle door Erwin): het verkeerde
-- factuurnummer bij Fortuna 202600127, de btw-tarieven van de hotelofferte en
-- het bevestigde onderdeel in het geannuleerde project.
-- De herberekening van commission_amount staat in
-- 20261003120000_commissie-fase1-trigger-en-guard.sql.

-- 1) De drie verouderde conceptfacturen verwijderen. Alleen echte concepten
--    die nooit zijn verstuurd.
DO $$
DECLARE
  v_ids uuid[];
BEGIN
  SELECT array_agg(id) INTO v_ids
  FROM commission_invoices
  WHERE invoice_number IN ('BVC-2607-0001', 'BVC-2607-0002', 'BVC-2610-0001')
    AND status = 'draft'
    AND sent_at IS NULL
    AND forwarded_to_accounting_at IS NULL
    AND paid_at IS NULL;

  IF v_ids IS NULL THEN
    RAISE NOTICE 'Fase 0: geen conceptfacturen om te verwijderen';
    RETURN;
  END IF;

  -- Markering op losse inkoopfacturen terugdraaien (BVC-2610-0001 zette die).
  UPDATE partner_purchase_invoices
     SET commission_invoiced_at = NULL,
         commission_invoice_id = NULL
   WHERE commission_invoice_id = ANY (v_ids)
      OR id IN (
        SELECT purchase_invoice_id FROM commission_invoice_lines
        WHERE invoice_id = ANY (v_ids) AND purchase_invoice_id IS NOT NULL
      );

  DELETE FROM commission_invoice_lines WHERE invoice_id = ANY (v_ids);
  DELETE FROM commission_invoices WHERE id = ANY (v_ids);
  RAISE NOTICE 'Fase 0: % conceptfacturen verwijderd', array_length(v_ids, 1);
END $$;

-- 2) Inkoopfacturen 202600127 en 202600246 (Fortuna) weer vrijgeven voor de
--    werklijst, ook als het concept al eerder is verwijderd.
UPDATE partner_purchase_invoices
   SET commission_invoiced_at = NULL,
       commission_invoice_id = NULL
 WHERE invoice_number IN ('202600127', '202600246')
   AND commission_invoiced_at IS NOT NULL
   AND NOT EXISTS (
     SELECT 1 FROM commission_invoices ci
     WHERE ci.id = partner_purchase_invoices.commission_invoice_id
       AND ci.status <> 'draft'
   );

-- 3) Dubbele Zuiver-registratie T-261008: verwijder de admin-versie die aan het
--    project hangt (geen onderdeel, geen allocaties). Alleen als het er precies
--    twee zijn en precies één daarvan een projectfactuur is.
DO $$
DECLARE
  v_dups uuid[];
  v_project_level uuid[];
BEGIN
  SELECT array_agg(i.id) INTO v_dups
  FROM partner_purchase_invoices i
  JOIN partners p ON p.id = i.partner_id
  WHERE i.invoice_number = 'T-261008' AND p.name ILIKE 'Zuiver%';

  SELECT array_agg(i.id) INTO v_project_level
  FROM partner_purchase_invoices i
  WHERE i.id = ANY (COALESCE(v_dups, '{}'))
    AND i.item_id IS NULL
    AND i.commission_invoiced_at IS NULL
    AND NOT EXISTS (
      SELECT 1 FROM partner_purchase_invoice_allocations a WHERE a.invoice_id = i.id
    );

  IF COALESCE(array_length(v_dups, 1), 0) = 2 AND COALESCE(array_length(v_project_level, 1), 0) = 1 THEN
    DELETE FROM partner_purchase_invoices WHERE id = v_project_level[1];
    RAISE NOTICE 'Fase 0: dubbele inkoopfactuur T-261008 verwijderd';
  ELSE
    RAISE NOTICE 'Fase 0: T-261008 niet aangeraakt (gevonden: %, projectniveau: %)',
      COALESCE(array_length(v_dups, 1), 0), COALESCE(array_length(v_project_level, 1), 0);
  END IF;
END $$;
