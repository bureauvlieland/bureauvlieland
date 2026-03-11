

# Fix: Verkeerde interne links in admin chat

## Probleem
Twee bestanden gebruiken `/admin/requests/${id}` — een Engelse URL die niet bestaat. De correcte route is `/admin/aanvragen/${id}`.

## Wijzigingen

| Bestand | Huidige waarde | Nieuwe waarde |
|---|---|---|
| `src/pages/admin/AdminChat.tsx` (regel 195) | `/admin/requests/${activeConversation.request_id}` | `/admin/aanvragen/${activeConversation.request_id}` |
| `src/components/admin/chat/ChatConversationItem.tsx` (regel 53) | `/admin/requests/${conv.request_id}` | `/admin/aanvragen/${conv.request_id}` |

Dat zijn de enige twee plekken. Alle overige interne admin-links gebruiken al de correcte Nederlandse paden (`/admin/aanvragen/`, `/admin/logies/`, `/admin/partners/`, `/admin/berichten/`, etc.).

