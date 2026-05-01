UPDATE public.building_blocks
SET vat_rate = 9
WHERE id IN ('boot-enkel-heen','boot-enkel-terug')
  AND vat_rate <> 9;