

# Plan: Illustratie genereren voor Vlieland Outdoor Center activiteiten

## Doel

Een voorbeeldillustratie genereren in een moderne, vlakke illustratiestijl voor één van de 17 activiteiten van Vlieland Outdoor Center.

## Voorbeeld activiteit

**Blokarten** - Een populaire en visueel aantrekkelijke activiteit die goed werkt als illustratie.

## Technische aanpak

### Stap 1: Illustratie genereren

Gebruik van Lovable AI image generation (google/gemini-2.5-flash-image) met een prompt zoals:

```
Modern flat illustration style, beach land sailing (blokart) activity on 
Vlieland beach, colorful minimalist design, people racing on sand yachts, 
Dutch island setting with dunes in background, vibrant colors, 
clean vector-style illustration, no text
```

### Stap 2: Afbeelding opslaan

- Upload naar de `building-block-images` storage bucket
- Bestandsnaam: `voc-blokarten.webp`

### Stap 3: Database bijwerken

```sql
UPDATE building_blocks 
SET image_url = '[storage-url]/voc-blokarten.webp'
WHERE id = 'voc-blokarten';
```

## Resultaat

Na goedkeuring genereer ik één voorbeeldillustratie voor Blokarten. Als de stijl bevalt, kan ik daarna alle 17 activiteiten van dezelfde illustraties voorzien.

## Illustratiestijl kenmerken

- **Kleurenpalet**: Warme, levendige kleuren (zandtinten, zeeblauw, zonnig geel)
- **Vormgeving**: Vlakke, geometrische vormen zonder complexe schaduwen
- **Sfeer**: Energiek, uitnodigend, professioneel
- **Consistentie**: Alle illustraties in dezelfde stijl voor een samenhangend geheel

