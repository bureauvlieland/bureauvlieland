import { createContext, useContext } from "react";
import type { PartnerDashboardData } from "@/types/partner";
import type { PartnerCommissionInvoice } from "@/lib/partnerCommissionInvoices";

/**
 * De ingelogde partner (of de partner die een admin bekijkt via
 * `?impersonate=`), één keer opgezocht door `PartnerLayout` en hier
 * beschikbaar voor elke pagina (partnerportaal fase 1, "één datalaag").
 * Pagina's halen de portaaldata op met `usePartnerPortal()`. De Provider
 * staat in `components/partner-portal/PartnerPortalContext.tsx`.
 */
export interface PartnerInfo {
  id: string;
  name: string;
  email: string;
  /** Contactadres voor boekingen, als dat afwijkt van het accountadres. */
  contact_email?: string | null;
  partner_token: string;
  commission_percentage: number;
  accommodation_commission_percentage?: number | null;
  partner_type: string | null;
  map_tenant_slug: string | null;
  /** Alleen voor logiespartners: de omschrijving onder een offerte. */
  accommodation_description?: string | null;
}

export interface PartnerPortalContextValue {
  partner: PartnerInfo;
  isImpersonating: boolean;
  /** `?impersonate=<id>` om aan interne links te hangen, anders leeg. */
  urlSuffix: string;
  /**
   * Vaste data voor de referentiepagina `/ontwerp/partnerportaal`: dan wordt
   * er niets opgehaald en doen acties niets.
   */
  demo?: {
    dashboard: PartnerDashboardData;
    commissionInvoices: PartnerCommissionInvoice[];
  } | null;
}

export const PartnerPortalContext = createContext<PartnerPortalContextValue | null>(null);

export function usePartnerContext(): PartnerPortalContextValue {
  const ctx = useContext(PartnerPortalContext);
  if (!ctx) throw new Error("usePartnerContext: alleen binnen PartnerLayout (of de referentiepagina) te gebruiken");
  return ctx;
}

export function impersonateSuffix(impersonate: string | null): string {
  return impersonate ? `?impersonate=${impersonate}` : "";
}
