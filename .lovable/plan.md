Ik pas de factuurverdeling aan zodat het duidelijk en daadwerkelijk mogelijk is om één programma-onderdeel over meerdere BTW-tarieven te splitsen.

Plan:
1. **Plusknop op een regel hernoemen/duidelijk maken**
   - De plusknop naast een bestaande allocatieregel blijft dezelfde logica gebruiken: een extra regel voor **hetzelfde programma-onderdeel** toevoegen.
   - Ik maak dit zichtbaar met een tekstknop/tooltip zoals: **“BTW-regel toevoegen”** in plaats van alleen een generiek plusje.

2. **UI onderscheid tussen twee acties**
   - Actie op de regel: **BTW-regel toevoegen** = zelfde onderdeel, ander BTW-tarief.
   - Dropdown onderaan: **Nog een onderdeel toevoegen** = ander programma-onderdeel toevoegen.
   - Dit voorkomt de verwarring die nu in de screenshot ontstaat.

3. **Handmatig overnemen als factuurregels mogelijk maken bij meerdere BTW-regels op hetzelfde onderdeel**
   - Als alle ingevulde allocatieregels naar hetzelfde `item_id` wijzen, toon ik de checkbox **Direct overnemen als factuurregels** alsnog.
   - Bij opslaan worden dan meerdere `program_item_billing_lines` aangemaakt voor datzelfde onderdeel, elk met eigen bedrag en BTW-tarief.
   - De huidige blokkade blijft alleen gelden wanneer er echt meerdere verschillende programma-onderdelen zijn gekozen.

4. **Ook toepassen op extra project-splits**
   - Dezelfde verduidelijking wordt doorgevoerd in `ExtraProjectSplitBlock`, zodat de knop daar ook niet aanvoelt alsof hij een ander onderdeel toevoegt.

Technisch:
- Wijzigingen in `src/components/admin/AddPurchaseInvoiceDialog.tsx`.
- Kleine UI-tekst/knop-aanpassing in `src/components/admin/purchase-invoices/ExtraProjectSplitBlock.tsx`.
- Geen databasewijziging nodig; bestaande allocatie- en billing-line tabellen ondersteunen dit al.