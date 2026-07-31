## Doel
In de Werkbank-tab **Financieel / afgerond** meerdere taken in één keer afronden of archiveren, zodat je niet elke taak apart hoeft te openen.

## Wat je krijgt
- Een selectievakje per taak, plus een vakje per projectgroep ("selecteer alle taken van dit project") en een "Alles selecteren" bovenaan de lijst.
- Een actiebalk die verschijnt zodra er iets geselecteerd is: "X geselecteerd" met twee knoppen:
  - **Afronden** — markeert de taken als afgehandeld (status `done`).
  - **Archiveren** — markeert de taken als niet relevant (status `dismissed`), voor restpunten die nooit meer opgepakt hoeven worden.
- Bij meer dan 5 taken eerst een korte bevestiging, zodat je niet per ongeluk een halve lijst wegwerkt.
- Na de actie: melding met het aantal bijgewerkte taken, lijst en badge-tellingen verversen zich meteen, selectie wordt geleegd.

## Belangrijk om te weten
Automatisch gegenereerde taken (commissie ontbrekende/niet-gekoppelde factuur, inkoopfactuur) worden door de nachtelijke reconciliatie opnieuw aangemaakt zolang de onderliggende situatie niet is opgelost. "Archiveren" is dus vooral bedoeld voor oude ruis; taken waar écht nog een factuur of koppeling mist, komen terug. Dat vermeld ik in een korte hint boven de lijst.

## Technisch
- `src/components/admin/werkbank/FinanceTodoList.tsx`: lokale `Set<string>` met geselecteerde todo-id's, checkbox-kolom, groeps- en globale select-all (met indeterminate state), sticky actiebalk.
- Bulk-update via één call: `supabase.from("admin_todos").update({ status, completed_at }).in("id", ids)` — `completed_at` alleen bij `done`.
- Na succes `queryClient.invalidateQueries` op `werkbank-finance-todos`, `werkbank-inbox` en de todo-badge-queries, zoals `OrphanTodoPanel` dat al doet.
- Bevestiging via de bestaande `AlertDialog` uit shadcn; meldingen via `useToast`.
- Geen database- of edge-function-wijzigingen nodig; bestaande RLS voor admins dekt de update.
