import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import type { FeeScheduleLike } from "@/lib/weddingReferralFee";

/**
 * Gegevens voor de admin-pagina Bruiloften (docs/plan-bruiloftsdoorverwijzingen.md):
 * de doorverwijzingen, de partners die ze ontvangen en de staffels. Alle
 * tabellen zijn alleen voor admins (RLS).
 */
export type WeddingReferralRow = Database["public"]["Tables"]["wedding_referrals"]["Row"];
export type WeddingReferralInsert = Database["public"]["Tables"]["wedding_referrals"]["Insert"];
export type WeddingReferralUpdate = Database["public"]["Tables"]["wedding_referrals"]["Update"];
export type FeeScheduleRow = Database["public"]["Tables"]["wedding_referral_fee_schedules"]["Row"];

export interface ReferralPartner {
  id: string;
  name: string;
  email: string;
  contact_email: string | null;
  wedding_referral_email: string | null;
  receives_wedding_referrals: boolean;
  is_active: boolean;
  phone: string | null;
  website_url: string | null;
}

export const WEDDING_REFERRALS_KEY = ["wedding-referrals"];
export const WEDDING_FEE_SCHEDULES_KEY = ["wedding-referral-fee-schedules"];
export const WEDDING_PARTNERS_KEY = ["wedding-referral-partners"];

/** Het adres waar een doorverwijzing naartoe gaat: apart adres, anders contactadres, anders loginadres. */
export const referralEmailFor = (p: Pick<ReferralPartner, "email" | "contact_email" | "wedding_referral_email">): string =>
  p.wedding_referral_email?.trim() || p.contact_email?.trim() || p.email;

export function useWeddingReferrals() {
  return useQuery({
    queryKey: WEDDING_REFERRALS_KEY,
    queryFn: async () => {
      // Eerst vervallen doorverwijzingen bijwerken (idempotent; de cron doet dit 's nachts ook).
      const { error: expireError } = await supabase.rpc("expire_wedding_referrals");
      if (expireError) console.warn("expire_wedding_referrals:", expireError.message);
      const { data, error } = await supabase.from("wedding_referrals").select("*").order("referred_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as WeddingReferralRow[];
    },
  });
}

export function useWeddingFeeSchedules() {
  return useQuery({
    queryKey: WEDDING_FEE_SCHEDULES_KEY,
    queryFn: async () => {
      const { data, error } = await supabase.from("wedding_referral_fee_schedules").select("*").order("effective_from", { ascending: false });
      if (error) throw error;
      return (data ?? []) as FeeScheduleRow[];
    },
  });
}

export const asFeeSchedule = (s: FeeScheduleRow): FeeScheduleLike => ({
  id: s.id,
  effective_from: s.effective_from,
  tiers: s.tiers,
  multi_day_surcharge: Number(s.multi_day_surcharge),
});

/** Alle partners (voor namen in overzichten); `receives_wedding_referrals` zegt wie te kiezen is. */
export function useWeddingReferralPartners() {
  return useQuery({
    queryKey: WEDDING_PARTNERS_KEY,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("partners")
        .select("id, name, email, contact_email, wedding_referral_email, receives_wedding_referrals, is_active, phone, website_url")
        .order("name");
      if (error) throw error;
      return (data ?? []) as ReferralPartner[];
    },
  });
}

export function useSaveWeddingReferral() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { id: string | null; values: WeddingReferralInsert }) => {
      if (input.id) {
        const { error } = await supabase.from("wedding_referrals").update(input.values as WeddingReferralUpdate).eq("id", input.id);
        if (error) throw error;
        return input.id;
      }
      const { data, error } = await supabase.from("wedding_referrals").insert(input.values).select("id").single();
      if (error) throw error;
      return data.id as string;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: WEDDING_REFERRALS_KEY });
    },
    onError: (e: Error) => toast.error("Opslaan mislukt", { description: e.message }),
  });
}

export function useUpdateWeddingReferral() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { id: string; patch: WeddingReferralUpdate }) => {
      const { error } = await supabase.from("wedding_referrals").update(input.patch).eq("id", input.id);
      if (error) throw error;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: WEDDING_REFERRALS_KEY });
    },
    onError: (e: Error) => toast.error("Bijwerken mislukt", { description: e.message }),
  });
}

export function useDeleteWeddingReferral() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("wedding_referrals").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: WEDDING_REFERRALS_KEY });
      toast.success("Doorverwijzing verwijderd");
    },
    onError: (e: Error) => toast.error("Verwijderen mislukt", { description: e.message }),
  });
}

export function useSaveWeddingFeeSchedule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (values: Database["public"]["Tables"]["wedding_referral_fee_schedules"]["Insert"]) => {
      const { error } = await supabase.from("wedding_referral_fee_schedules").insert(values);
      if (error) throw error;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: WEDDING_FEE_SCHEDULES_KEY });
      toast.success("Staffel toegevoegd");
    },
    onError: (e: Error) => toast.error("Staffel niet opgeslagen", { description: e.message }),
  });
}

export function useDeleteWeddingFeeSchedule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("wedding_referral_fee_schedules").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: WEDDING_FEE_SCHEDULES_KEY });
      toast.success("Staffel verwijderd");
    },
    onError: (e: Error) =>
      toast.error("Staffel niet verwijderd", {
        description: e.message.includes("violates foreign key") ? "Er hangen al doorverwijzingen aan deze staffel." : e.message,
      }),
  });
}
