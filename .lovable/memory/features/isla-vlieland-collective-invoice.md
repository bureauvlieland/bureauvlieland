---
name: Isla Vlieland Verzamelfactuur
description: Bagagevervoer multi-project invoices parsed via separate AI prompt; matched op klantnaam (fuzzy) → booked als extra kost per project; partner_id="bagagevervoer-vlieland"
type: feature
---
Isla Vlieland B.V. (bagagevervoer-vlieland) facturen bevatten meerdere klantopdrachten op één factuur, zonder Resnr.

- parse-collective-invoice accepteert `supplier_type: "doeksen" | "isla"`; auto-detect via inbox.scan_result.supplier_name (regex `isla|bagage`).
- Aparte AI-extractie (`extract_isla_invoice`) levert `lines[{customer_name, delivery_date, description, amount_*}]`.
- Server fuzzy-matcht customer_name tegen `program_requests` (token-overlap + normalisatie van b.v./fam./etc.), drempel 0.6, top 5 suggesties.
- Alle Isla-rijen komen terug als `match_status="ambiguous"` (met `suggested_projects`) of `"unmatched"`; admin moet expliciet boeken als extra kost via AdminAddCostSheet — er is geen automatische koppeling aan een bestaand item.
- Inbox-knop "Verzamelfactuur" is nu altijd zichtbaar; primair (amber) als isLikelyCollective (Doeksen/rederij/Isla/bagage), anders outline naast primaire "Verwerken".
- `guessPartnerId` mapt isla|bagage → "bagagevervoer-vlieland", doeksen|rederij → "rederij".
