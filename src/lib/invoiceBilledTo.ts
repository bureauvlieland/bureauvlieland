/**
 * Frontend-toegang tot de regel "aan wie factureerde de partner?".
 *
 * De implementatie staat in `supabase/functions/_shared/invoiceBilledTo.ts`
 * zodat partnerportaal, admin en edge functions dezelfde regel hanteren.
 */
export * from "../../supabase/functions/_shared/invoiceBilledTo";
