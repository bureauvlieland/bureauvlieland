

## Plan: Admin logiesaanvraag maken vanuit projectpagina

### Status: ✅ Geïmplementeerd

### Wat is gebouwd

1. **`AdminCreateAccommodationSheet.tsx`**: Nieuw sheet-component waarmee admin direct een logiesaanvraag kan aanmaken vanuit de projectpagina, met automatisch overgenomen klantgegevens
2. **`AdminRequestDetail.tsx`**: Knop "Logiesaanvraag maken" opent nu de sheet i.p.v. navigeren naar publieke pagina
3. **Database**: Direct insert in `accommodation_requests` met `linked_program_id`, update `program_requests.linked_accommodation_id`
4. **Geen klant-notificatie**: Aanvraag wordt aangemaakt als bureau, zonder automatische bevestigingsmails
