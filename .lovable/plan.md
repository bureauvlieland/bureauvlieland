

## Plan: Chat-knop minder in de weg laten zitten

De "Hulp nodig?" chat-bubble staat `fixed bottom-6 right-6` en overlapt met content op het partnerdashboard (en mogelijk andere pagina's).

### Oplossing

In `src/components/chat/ChatWidget.tsx` de positie van de floating bubble aanpassen:
- Van `bottom-6 right-6` naar `bottom-4 right-4` (iets compacter)
- De knop kleiner maken: van `h-14 w-14` naar `h-12 w-12`
- Het "Hulp nodig?" label verbergen — pas tonen bij hover
- Opacity verlagen naar ~70% wanneer niet gehoverd, zodat het minder in de weg zit maar wel zichtbaar blijft

### Wijzigingen

| Bestand | Actie |
|---|---|
| `src/components/chat/ChatWidget.tsx` | Bubble kleiner, subtielere styling met hover-reveal van label |

Eén bestand, kleine CSS-aanpassingen.

