import { useAppSettings } from "@/hooks/useAppSettings";
import { usePartnerContext } from "@/lib/partnerPortalContext";

/**
 * Hoe een partner zijn factuur aanlevert (plan-inkoopfacturen-via-inbox.md,
 * §3.1): standaard mailt hij de pdf naar de inkoop-inbox ("mail"). De
 * instelling `partner_invoice_registration_enabled` zet de oude
 * registratiedialogen terug ("register"), als noodrem. Op de
 * referentiepagina altijd "mail".
 */
export function usePartnerInvoiceRoute(): "mail" | "register" {
  const { demo } = usePartnerContext();
  const { getSetting } = useAppSettings();
  if (demo) return "mail";
  return getSetting<boolean>("partner_invoice_registration_enabled", false) === true ? "register" : "mail";
}
