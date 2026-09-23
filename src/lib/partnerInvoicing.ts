/**
 * Frontend-toegang tot de regel "mag deze partner factureren?".
 *
 * De implementatie staat in `supabase/functions/_shared/partnerInvoicing.ts`
 * zodat partnerportaal en edge functions gegarandeerd dezelfde regel hanteren.
 */
export * from "../../supabase/functions/_shared/partnerInvoicing";
