

## Wijzigingen

### 1. Verwijderknop toevoegen per rij in quote-mode

In de activiteitentabel is er in quote-mode (regel 1196-1205) alleen een potlood-knop. Hier wordt een verwijderknop naast gezet, identiek aan de niet-quote-mode variant (direct delete, geen bevestiging).

**Bestand: `src/pages/admin/AdminRequestDetail.tsx`**

Regel 1196-1205: Wijzig de enkele edit-knop naar een groep met edit + delete:
```typescript
<TableCell>
  <div className="flex items-center gap-1">
    <Button variant="ghost" size="icon" onClick={() => setEditingItem(item)} className="h-8 w-8">
      <Pencil className="h-4 w-4" />
    </Button>
    <Button
      variant="ghost"
      size="icon"
      className="h-8 w-8 text-destructive hover:text-destructive"
      onClick={async () => {
        const { error } = await supabase
          .from("program_request_items")
          .delete()
          .eq("id", item.id);
        if (!error) {
          toast.success("Activiteit verwijderd");
          fetchRequestData();
        } else {
          toast.error("Fout bij verwijderen");
        }
      }}
    >
      <Trash2 className="h-4 w-4" />
    </Button>
  </div>
</TableCell>
```

### 2. "Programma leegmaken" knop toevoegen

In de knoppenbalk boven de tabel (regel 1043-1107), een extra knop toevoegen die alle actieve items (day_index >= 0) in één keer verwijdert. Alleen zichtbaar als er items zijn.

```typescript
{items.filter(i => i.day_index >= 0).length > 0 && (
  <Button
    variant="outline"
    className="text-destructive hover:text-destructive"
    onClick={async () => {
      const activeItems = items.filter(i => i.day_index >= 0);
      const { error } = await supabase
        .from("program_request_items")
        .delete()
        .in("id", activeItems.map(i => i.id));
      if (!error) {
        toast.success(`${activeItems.length} activiteiten verwijderd`);
        fetchRequestData();
      } else {
        toast.error("Fout bij leegmaken");
      }
    }}
  >
    <Trash2 className="h-4 w-4 mr-2" />
    Alles verwijderen
  </Button>
)}
```

### Samenvatting
- Verwijderknop (prullenbak) direct in elke rij, ook in quote-mode — geen bevestigingsdialoog
- "Alles verwijderen" knop in de toolbar boven de tabel om het hele programma in één keer leeg te maken

