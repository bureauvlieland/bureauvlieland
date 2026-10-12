import { useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { usePartnerContext } from "@/lib/partnerPortalContext";
import type { PartnerDashboardData } from "@/types/partner";
import type { PartnerCommissionInvoice, PartnerCommissionInvoicesResponse } from "@/lib/partnerCommissionInvoices";
import { reportError } from "@/lib/errorReporting";

const FUNCTIONS_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1`;
const headers = { "Content-Type": "application/json", apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY };

/** Alle portaaldata van één partner, op het partnertoken (get-partner-dashboard). */
export async function fetchPartnerDashboard(token: string): Promise<PartnerDashboardData> {
  const response = await fetch(`${FUNCTIONS_URL}/get-partner-dashboard?token=${token}`, { headers });
  if (!response.ok) throw new Error("Kon de gegevens van het portaal niet laden");
  return (await response.json()) as PartnerDashboardData;
}

/** Commissiefacturen van het bureau aan deze partner, met tijdelijke pdf-links. */
export async function fetchPartnerCommissionInvoices(token: string): Promise<PartnerCommissionInvoice[]> {
  const response = await fetch(`${FUNCTIONS_URL}/get-partner-commission-invoices?token=${token}`, { headers: { apikey: headers.apikey } });
  if (!response.ok) throw new Error(`Kon commissiefacturen niet laden (${response.status})`);
  const body = (await response.json()) as PartnerCommissionInvoicesResponse;
  return body.invoices ?? [];
}

export const partnerDashboardKey = (token: string) => ["partner-dashboard", token] as const;
export const partnerCommissionInvoicesKey = (token: string) => ["partner-commission-invoices", token] as const;

/**
 * De enige datalaag van het partnerportaal (fase 1): de partner uit de
 * context, de dashboarddata via react-query (één keer per token, gedeeld
 * door alle pagina's) en `refetch` na een actie. Op de referentiepagina
 * komt alles uit `demo` en wordt er niets opgehaald.
 */
export function usePartnerPortal() {
  const ctx = usePartnerContext();
  const queryClient = useQueryClient();
  const token = ctx.partner.partner_token;
  const isDemo = Boolean(ctx.demo);

  const query = useQuery({
    queryKey: partnerDashboardKey(token),
    queryFn: () => fetchPartnerDashboard(token),
    enabled: !isDemo && Boolean(token),
    staleTime: 30_000,
  });

  const refetch = useCallback(async () => {
    if (isDemo) return;
    await queryClient.invalidateQueries({ queryKey: partnerDashboardKey(token) });
  }, [isDemo, queryClient, token]);

  if (query.error) reportError(query.error, { where: "usePartnerPortal" });

  return {
    partner: ctx.partner,
    partnerToken: token,
    isImpersonating: ctx.isImpersonating,
    urlSuffix: ctx.urlSuffix,
    isDemo,
    data: ctx.demo?.dashboard ?? query.data ?? null,
    isLoading: isDemo ? false : query.isPending,
    error: query.error ? (query.error instanceof Error ? query.error.message : "Er ging iets mis bij het laden") : null,
    refetch,
  };
}

/** De commissiefacturen van het bureau aan deze partner (tabblad Commissiefacturen). */
export function usePartnerCommissionInvoices() {
  const ctx = usePartnerContext();
  const queryClient = useQueryClient();
  const token = ctx.partner.partner_token;
  const isDemo = Boolean(ctx.demo);
  const query = useQuery({
    queryKey: partnerCommissionInvoicesKey(token),
    queryFn: () => fetchPartnerCommissionInvoices(token),
    enabled: !isDemo && Boolean(token),
    staleTime: 30_000,
  });
  if (query.error) reportError(query.error, { where: "usePartnerCommissionInvoices" });
  const refetch = useCallback(async () => {
    if (isDemo) return;
    await queryClient.invalidateQueries({ queryKey: partnerCommissionInvoicesKey(token) });
  }, [isDemo, queryClient, token]);
  return { invoices: ctx.demo?.commissionInvoices ?? query.data ?? [], isLoading: isDemo ? false : query.isPending, refetch };
}
