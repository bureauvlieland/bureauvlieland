/**
 * Totalen van een verzamelfactuur van Rederij Doeksen.
 *
 * Doeksen zet de toeristenbelasting in een eigen kolom ("TB", 0 % btw) naast
 * het ticketbedrag incl. btw, en houdt de commissie voor het bureau op de
 * factuur in. Wat er onderaan als "Netto bedrag" staat — en wat Doeksen
 * incasseert — is dus tickets + toeristenbelasting − commissie.
 *
 * De sheet en de verwerking rekenden alleen tickets − commissie. Op de factuur
 * van september 2026 (€ 549,44 tickets, € 43,86 TB, € 27,48 commissie) kwam
 * het verwachte incassobedrag daardoor op € 521,96 terwijl Doeksen € 565,82
 * afschrijft; de bankmatching zou die incasso nooit herkennen en de
 * toeristenbelasting stond nergens als inkoop geboekt.
 *
 * Of de toeristenbelasting al in het factuurtotaal zit, laten we het "Netto
 * bedrag" zelf uitwijzen: dat getal staat letterlijk op de PDF en past maar bij
 * één van de twee lezingen. Zonder nettobedrag gaan we uit van de kolomindeling
 * van Doeksen: toeristenbelasting bovenop het totaal.
 *
 * Dependency-vrij; zelfde regel als supabase/functions/_shared/collectiveInvoiceTotals.ts.
 */

export interface CollectiveInvoiceTotalsInput {
  total_incl_vat: number | null | undefined;
  total_tourist_tax?: number | null;
  total_supplier_commission?: number | null;
  net_to_pay?: number | null;
}

export interface CollectiveInvoiceTotals {
  /** Toeristenbelasting op de factuur, 0 als die er niet op staat. */
  touristTax: number;
  /** Zit de toeristenbelasting al in `total_incl_vat`? Anders komt hij erbovenop. */
  touristTaxIncluded: boolean;
  /** Wat het bureau de partner verschuldigd is: tickets incl. btw plus toeristenbelasting. */
  grossInclTouristTax: number;
  /** Wat de partner incasseert: het verschuldigde bedrag minus de ingehouden commissie. */
  expectedNetToPay: number;
}

const round2 = (n: number) => Number(n.toFixed(2));

export function collectiveInvoiceTotals(input: CollectiveInvoiceTotalsInput): CollectiveInvoiceTotals {
  const totalIncl = Number(input.total_incl_vat ?? 0) || 0;
  const touristTax = Math.max(0, Number(input.total_tourist_tax ?? 0) || 0);
  const commission = Math.max(0, Number(input.total_supplier_commission ?? 0) || 0);
  const netOnPdf = Number(input.net_to_pay ?? 0) || 0;

  if (touristTax === 0) {
    return {
      touristTax: 0,
      touristTaxIncluded: true,
      grossInclTouristTax: round2(totalIncl),
      expectedNetToPay: round2(totalIncl - commission),
    };
  }

  const netIfOnTop = round2(totalIncl + touristTax - commission);
  const netIfIncluded = round2(totalIncl - commission);
  const touristTaxIncluded = netOnPdf > 0
    ? Math.abs(netOnPdf - netIfIncluded) < Math.abs(netOnPdf - netIfOnTop)
    : false;

  return {
    touristTax,
    touristTaxIncluded,
    grossInclTouristTax: touristTaxIncluded ? round2(totalIncl) : round2(totalIncl + touristTax),
    expectedNetToPay: touristTaxIncluded ? netIfIncluded : netIfOnTop,
  };
}
