// Centrale BTW-berekening helper
// Voorkomt afrondingsfouten door consistent te werken met 2 decimalen

export interface VatBreakdown {
  amountExclVat: number;
  vatRate: number;
  vatAmount: number;
  amountInclVat: number;
}

const round2 = (n: number): number => Math.round(n * 100) / 100;

/**
 * Berekent BTW-bedrag en totaal incl. BTW op basis van bedrag exclusief en BTW%.
 */
export function calculateVatAmounts(exclVat: number, vatRate: number): VatBreakdown {
  const safeExcl = round2(Number(exclVat) || 0);
  const safeRate = Number(vatRate) || 0;
  const vatAmount = round2(safeExcl * (safeRate / 100));
  const amountInclVat = round2(safeExcl + vatAmount);
  return {
    amountExclVat: safeExcl,
    vatRate: safeRate,
    vatAmount,
    amountInclVat,
  };
}

/**
 * Berekent excl. BTW en BTW-bedrag op basis van bedrag inclusief en BTW%.
 */
export function calculateFromInclVat(inclVat: number, vatRate: number): VatBreakdown {
  const safeIncl = round2(Number(inclVat) || 0);
  const safeRate = Number(vatRate) || 0;
  const exclVat = round2(safeIncl / (1 + safeRate / 100));
  const vatAmount = round2(safeIncl - exclVat);
  return {
    amountExclVat: exclVat,
    vatRate: safeRate,
    vatAmount,
    amountInclVat: safeIncl,
  };
}
