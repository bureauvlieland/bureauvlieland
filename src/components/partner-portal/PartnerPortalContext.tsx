import type { ReactNode } from "react";
import { PartnerPortalContext, type PartnerPortalContextValue } from "@/lib/partnerPortalContext";

export type { PartnerInfo, PartnerPortalContextValue } from "@/lib/partnerPortalContext";

/** Zet de partner (en op de referentiepagina de vaste data) voor alle pagina's eronder. */
export const PartnerPortalProvider = ({ value, children }: { value: PartnerPortalContextValue; children: ReactNode }) => (
  <PartnerPortalContext.Provider value={value}>{children}</PartnerPortalContext.Provider>
);
