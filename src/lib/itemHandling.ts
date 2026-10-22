/**
 * Frontend-toegang tot de afhandeling en facturatieroute van een onderdeel
 * (offerte / bevestiging / mededeling; via bureau / verblijfsnota / klant
 * rechtstreeks). De implementatie staat in
 * `supabase/functions/_shared/itemHandling.ts` zodat portalen en edge
 * functions gegarandeerd dezelfde regel hanteren.
 */
export * from "../../supabase/functions/_shared/itemHandling";
