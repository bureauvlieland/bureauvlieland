/** Ankers, mailto, tel en externe adressen zijn geen router-links. */
export const isPlainHref = (to: string): boolean => /^(#|mailto:|tel:|https?:)/.test(to);
