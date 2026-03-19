

## Probleem: Bouwsteen wordt niet echt verwijderd

De `useDeleteBuildingBlock` hook doet een **soft delete** (`is_active: false`), maar de admin-query haalt **alle** bouwstenen op zonder te filteren op `is_active`. Resultaat: de toast zegt "verwijderd", maar het item blijft zichtbaar.

### Oplossing

Twee aanpassingen:

**1. `src/hooks/useBuildingBlocks.ts` — Hard delete in plaats van soft delete**

De `useDeleteBuildingBlock` mutatie wijzigen van `.update({ is_active: false })` naar `.delete()`. Dit verwijdert de bouwsteen daadwerkelijk uit de database.

```typescript
// Was:
.update({ is_active: false })

// Wordt:
.delete()
```

**2. Vangnet: admin-query filteren op `is_active`**

Als extra veiligheid (voor het geval er nog soft-deleted items in de database staan) een filter toevoegen aan de admin-query:

```typescript
.eq("is_active", true)
```

Dit zorgt ervoor dat eventueel eerder soft-deleted items ook niet meer getoond worden.

