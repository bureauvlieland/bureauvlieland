
# Plan: Handleidingen Onderdeel Verifiëren en Volledig Implementeren

## Analyse

Na onderzoek van de code blijkt dat het handleidingen onderdeel **correct is geïmplementeerd**:

1. **Route geregistreerd** in `src/App.tsx` (regel 149):
   ```
   <Route path="/partner/handleidingen" element={<PartnerGuides />} />
   ```

2. **Menu-item aanwezig** in `src/components/partner-portal/PartnerLayout.tsx` (regel 68):
   ```
   { title: "Handleidingen", url: `/partner/handleidingen${urlSuffix}`, icon: BookOpen }
   ```

3. **Pagina compleet** in `src/pages/PartnerGuides.tsx` met alle help artikelen:
   - Aan de slag (account activeren, wachtwoord wijzigen, bedrijfsgegevens)
   - Aanvragen verwerken (bevestigen, alternatief, afwijzen)
   - Beschikbaarheid beheren
   - Facturatie & commissiemodel
   - Logies (voor logiespartners)
   - Veelgestelde vragen

## Mogelijke Oorzaken

Als je het menu-item niet ziet, kan dit komen door:

1. **Niet ingelogd als partner** - De sidebar wordt alleen getoond na authenticatie
2. **Cache/build vertraging** - Wijzigingen zijn mogelijk nog niet volledig gebuild
3. **Admin impersonation zonder refresh** - Na navigatie moet de pagina soms vernieuwd worden

## Verificatiestappen

Om te verifiëren dat het werkt:
1. Log in via `/partner/login` met een partner account
2. Of gebruik admin impersonation: `/partner/dashboard?impersonate=[partner-id]`
3. De sidebar zou "Handleidingen" moeten tonen tussen "Facturatie" en "Instellingen"

## Geen Code Wijzigingen Nodig

De implementatie is compleet. De code bevat:
- Volledige PartnerGuides pagina met Accordion-based help artikelen
- Correct menu-item in de PartnerLayout sidebar
- Geregistreerde route in App.tsx

**Actie:** Ververs de pagina en log in als partner om het handleidingen onderdeel te zien.
