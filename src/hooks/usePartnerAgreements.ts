import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

/**
 * Partnerafspraken met akkoord in het portaal
 * (docs/plan-bruiloftsdoorverwijzingen.md → Partnerafspraken). Admin beheert
 * de afspraken per versie; de partner leest en accepteert in het portaal.
 * RLS laat een partner alleen gepubliceerde afspraken zien die voor hem gelden.
 */
export type PartnerAgreementRow = Database["public"]["Tables"]["partner_agreements"]["Row"];
export type PartnerAgreementInsert = Database["public"]["Tables"]["partner_agreements"]["Insert"];
export type PartnerAgreementAcceptanceRow = Database["public"]["Tables"]["partner_agreement_acceptances"]["Row"];

export interface AgreementPartner {
  id: string;
  name: string;
  is_active: boolean;
  receives_wedding_referrals: boolean;
}

export const PARTNER_AGREEMENTS_KEY = ["partner-agreements"];
export const PARTNER_AGREEMENT_ACCEPTANCES_KEY = ["partner-agreement-acceptances"];

// ── Admin ────────────────────────────────────────────────────────────────

export function usePartnerAgreements() {
  return useQuery({
    queryKey: PARTNER_AGREEMENTS_KEY,
    queryFn: async () => {
      const { data, error } = await supabase.from("partner_agreements").select("*").order("key").order("version", { ascending: false });
      if (error) throw error;
      return (data ?? []) as PartnerAgreementRow[];
    },
  });
}

export function usePartnerAgreementAcceptances(partnerId?: string) {
  return useQuery({
    queryKey: [...PARTNER_AGREEMENT_ACCEPTANCES_KEY, partnerId ?? "alle"],
    queryFn: async () => {
      let q = supabase.from("partner_agreement_acceptances").select("*").order("accepted_at", { ascending: false });
      if (partnerId) q = q.eq("partner_id", partnerId);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as PartnerAgreementAcceptanceRow[];
    },
  });
}

export function useAgreementPartners() {
  return useQuery({
    queryKey: ["partner-agreement-partners"],
    queryFn: async () => {
      const { data, error } = await supabase.from("partners").select("id, name, is_active, receives_wedding_referrals").order("name");
      if (error) throw error;
      return (data ?? []) as AgreementPartner[];
    },
  });
}

export function useSavePartnerAgreement() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { id: string | null; values: PartnerAgreementInsert }) => {
      if (input.id) {
        const { error } = await supabase.from("partner_agreements").update(input.values).eq("id", input.id);
        if (error) throw error;
        return input.id;
      }
      const { data, error } = await supabase.from("partner_agreements").insert(input.values).select("id").single();
      if (error) throw error;
      return data.id as string;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: PARTNER_AGREEMENTS_KEY });
    },
    onError: (e: Error) => toast.error("Afspraak niet opgeslagen", { description: e.message }),
  });
}

export function useSetPartnerAgreementStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { id: string; status: "draft" | "published" | "withdrawn" }) => {
      const patch: Database["public"]["Tables"]["partner_agreements"]["Update"] = { status: input.status };
      if (input.status === "published") patch.published_at = new Date().toISOString();
      const { error } = await supabase.from("partner_agreements").update(patch).eq("id", input.id);
      if (error) throw error;
    },
    onSuccess: (_d, v) => {
      void qc.invalidateQueries({ queryKey: PARTNER_AGREEMENTS_KEY });
      toast.success(v.status === "published" ? "Afspraak gepubliceerd; partners zien hem nu in het portaal" : v.status === "withdrawn" ? "Afspraak ingetrokken" : "Terug naar concept");
    },
    onError: (e: Error) => toast.error("Status niet gewijzigd", { description: e.message }),
  });
}

export function useDeletePartnerAgreement() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("partner_agreements").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: PARTNER_AGREEMENTS_KEY });
      toast.success("Concept verwijderd");
    },
    onError: (e: Error) =>
      toast.error("Niet verwijderd", { description: e.message.includes("violates foreign key") ? "Er zijn al akkoorden op deze versie." : e.message }),
  });
}

// ── Partnerportaal ──────────────────────────────────────────────────────

export interface CurrentPartner {
  id: string;
  name: string;
  email: string;
  is_active: boolean;
  receives_wedding_referrals: boolean;
}

/**
 * De ingelogde partner, of de partner die een admin bekijkt via
 * `?impersonate=`. Dezelfde opzoeking als PartnerLayout; die geeft de partner
 * niet door aan zijn kinderen.
 */
export function useCurrentPartner() {
  const [searchParams] = useSearchParams();
  const impersonate = searchParams.get("impersonate");
  const [state, setState] = useState<{ partner: CurrentPartner | null; isImpersonating: boolean; userEmail: string; isLoading: boolean }>({
    partner: null,
    isImpersonating: false,
    userEmail: "",
    isLoading: true,
  });

  useEffect(() => {
    let actief = true;
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        if (actief) setState({ partner: null, isImpersonating: false, userEmail: "", isLoading: false });
        return;
      }
      const kolommen = "id, name, email, is_active, receives_wedding_referrals";
      if (impersonate) {
        const { data: isAdmin } = await supabase.rpc("is_admin", { _user_id: session.user.id });
        if (isAdmin) {
          const { data } = await supabase.from("partners").select(kolommen).eq("id", impersonate).maybeSingle();
          if (actief) setState({ partner: (data as CurrentPartner | null) ?? null, isImpersonating: true, userEmail: session.user.email ?? "", isLoading: false });
          return;
        }
      }
      const { data } = await supabase.from("partners").select(kolommen).eq("auth_user_id", session.user.id).eq("is_active", true).maybeSingle();
      if (actief) setState({ partner: (data as CurrentPartner | null) ?? null, isImpersonating: false, userEmail: session.user.email ?? "", isLoading: false });
    })();
    return () => {
      actief = false;
    };
  }, [impersonate]);

  return state;
}

/** Wat de partner mag zien: RLS filtert op gepubliceerd en van toepassing. */
export function usePartnerPortalAgreements(partnerId: string | null) {
  const agreements = useQuery({
    queryKey: ["partner-portal-agreements", partnerId],
    enabled: Boolean(partnerId),
    queryFn: async () => {
      const { data, error } = await supabase.from("partner_agreements").select("*").order("version", { ascending: false });
      if (error) throw error;
      return (data ?? []) as PartnerAgreementRow[];
    },
  });
  const acceptances = useQuery({
    queryKey: ["partner-portal-acceptances", partnerId],
    enabled: Boolean(partnerId),
    queryFn: async () => {
      const { data, error } = await supabase.from("partner_agreement_acceptances").select("*").eq("partner_id", partnerId!).order("accepted_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as PartnerAgreementAcceptanceRow[];
    },
  });
  return { agreements: agreements.data ?? [], acceptances: acceptances.data ?? [], isLoading: agreements.isLoading || acceptances.isLoading };
}

export function useAcceptPartnerAgreement() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { agreementId: string; partnerId: string }) => {
      const { error } = await supabase.from("partner_agreement_acceptances").insert({
        agreement_id: input.agreementId,
        partner_id: input.partnerId,
        user_agent: typeof navigator === "undefined" ? "" : navigator.userAgent.slice(0, 300),
      });
      if (error) throw error;
    },
    onSuccess: (_d, v) => {
      void qc.invalidateQueries({ queryKey: ["partner-portal-acceptances", v.partnerId] });
      void qc.invalidateQueries({ queryKey: PARTNER_AGREEMENT_ACCEPTANCES_KEY });
      toast.success("Dank u wel, uw akkoord is vastgelegd");
    },
    onError: (e: Error) => toast.error("Akkoord niet vastgelegd", { description: e.message }),
  });
}
