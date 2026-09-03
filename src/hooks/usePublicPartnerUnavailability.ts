/**
 * Publieke (anon-veilige) beschikbaarheid van partners.
 * Leest alleen partner_id + periode via een security definer functie —
 * de interne reden blijft binnen het admin/partner-domein.
 */
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface PublicUnavailability {
  partner_id: string;
  start_date: string;
  end_date: string;
}

export interface PartnerAvailabilityNote {
  /** Eerstvolgende (of lopende) periode waarin de partner niet inzetbaar is. */
  start_date: string;
  end_date: string;
  /** True als de periode nu al loopt. */
  isCurrent: boolean;
}

const todayISO = () => new Date().toISOString().slice(0, 10);

export const usePublicPartnerUnavailability = (enabled = true) => {
  const { data, isLoading } = useQuery({
    queryKey: ["public-partner-unavailability"],
    enabled,
    staleTime: 5 * 60 * 1000,
    queryFn: async (): Promise<PublicUnavailability[]> => {
      const { data, error } = await supabase.rpc("get_public_partner_unavailability");
      if (error) throw error;
      return (data ?? []) as PublicUnavailability[];
    },
  });

  const byPartner = new Map<string, PartnerAvailabilityNote>();
  const today = todayISO();

  (data ?? [])
    .slice()
    .sort((a, b) => a.start_date.localeCompare(b.start_date))
    .forEach((p) => {
      if (byPartner.has(p.partner_id)) return;
      byPartner.set(p.partner_id, {
        start_date: p.start_date,
        end_date: p.end_date,
        isCurrent: p.start_date <= today && p.end_date >= today,
      });
    });

  return { byPartner, periods: data ?? [], isLoading };
};

/** True als de datum binnen een niet-beschikbare periode van deze partner valt. */
export const isPartnerUnavailableOn = (
  periods: PublicUnavailability[] | undefined,
  partnerId: string | null | undefined,
  isoDate: string | null | undefined,
): boolean => {
  if (!periods || !partnerId || !isoDate) return false;
  return periods.some(
    (p) => p.partner_id === partnerId && p.start_date <= isoDate && p.end_date >= isoDate,
  );
};
