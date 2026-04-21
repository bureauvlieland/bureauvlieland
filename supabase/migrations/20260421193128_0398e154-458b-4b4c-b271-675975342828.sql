UPDATE program_template_items
SET preferred_time = '16:50'
WHERE block_id = 'boot-retour'
  AND template_id IN (
    'chill-eilanddag',
    'actieve-eilanddag-voc',
    'culinaire-ontdekking',
    'wellness-natuur',
    'wellness-natuur-3d'
  );