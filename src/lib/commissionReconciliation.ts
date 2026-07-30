/**
 * Frontend-toegang tot de commissie-reconciliatielogica.
 *
 * De implementatie staat in `supabase/functions/_shared/commissionReconciliation.ts`
 * zodat admin-UI en edge functions gegarandeerd dezelfde matchregels gebruiken.
 */
export * from "../../supabase/functions/_shared/commissionReconciliation";
