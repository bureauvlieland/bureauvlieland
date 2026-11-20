import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { reportError } from "@/lib/errorReporting";
import type { ProjectInvoiceSpec } from "@/lib/projectInvoiceSpec";
import {
  isEmptySyncPlan,
  planProformaSync,
  specToProformaLines,
  type Proforma,
  type ProformaLine,
  type ProformaLineInput,
  type ProformaSyncPlan,
} from "@/lib/proforma";

/** Offertestatussen waarbij de klant akkoord is en de proforma mag bestaan. */
export const isAcceptedQuoteStatus = (status: string | null | undefined): boolean =>
  status === "akkoord_ontvangen" || status === "definitief_bevestigd";

interface UseProformaArgs {
  requestId: string | null | undefined;
  quoteStatus: string | null | undefined;
  /** De ene berekening van het project; null zolang die nog niet geladen is. */
  spec: ProjectInvoiceSpec | null;
  /** Pas waar als alle bronnen van de specificatie geladen zijn. */
  specReady: boolean;
  /** Maak de proforma vanzelf aan zodra het project akkoord is en er nog geen is. */
  autoCreate?: boolean;
}

const toRows = (proformaId: string, inputs: ProformaLineInput[]) => inputs.map((row) => ({ ...row, proforma_id: proformaId }));

/**
 * De proforma van een project (docs/plan-proforma-factuur.md, fase 1):
 * laadt het concept met zijn regels, maakt het bij akkoord aan uit de
 * specificatie en houdt de offerteregels gelijk aan de specificatie
 * (`planProformaSync`, plan §3.4). Vervangen, inkoop- en handmatige regels
 * blijven staan.
 */
export function useProforma({ requestId, quoteStatus, spec, specReady, autoCreate = false }: UseProformaArgs) {
  const [proforma, setProforma] = useState<Proforma | null>(null);
  const [lines, setLines] = useState<ProformaLine[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);
  const creatingRef = useRef(false);
  const syncingRef = useRef(false);
  const lastSignatureRef = useRef<string | null>(null);

  const isAccepted = isAcceptedQuoteStatus(quoteStatus);

  const load = useCallback(async () => {
    if (!requestId) {
      setProforma(null);
      setLines([]);
      setLoading(false);
      return;
    }
    // Het concept als dat er is, anders de laatst geregistreerde proforma
    // (fase 3: na registreren blijft het werkblad alleen-lezen zichtbaar).
    const { data: heads, error } = await supabase
      .from("project_proformas")
      .select("*")
      .eq("request_id", requestId)
      .order("created_at", { ascending: false });
    const head = (heads ?? []).find((h) => h.status === "concept") ?? (heads ?? [])[0] ?? null;
    if (error) {
      reportError(error, { where: "useProforma.load" });
      setLoading(false);
      return;
    }
    if (!head) {
      setProforma(null);
      setLines([]);
      setLoading(false);
      return;
    }
    const { data: rows, error: linesError } = await supabase
      .from("project_proforma_lines")
      .select("*")
      .eq("proforma_id", head.id)
      .order("sort_order", { ascending: true });
    if (linesError) reportError(linesError, { where: "useProforma.load.lines" });
    setProforma(head as unknown as Proforma);
    setLines((rows ?? []) as unknown as ProformaLine[]);
    setLoading(false);
  }, [requestId]);

  useEffect(() => {
    setLoading(true);
    lastSignatureRef.current = null;
    void load();
  }, [load]);

  const freshLines = useMemo(() => (spec && specReady ? specToProformaLines(spec) : null), [spec, specReady]);
  const freshSignature = useMemo(() => (freshLines ? JSON.stringify(freshLines) : null), [freshLines]);

  /** Maakt het concept aan uit de specificatie van nu. */
  const create = useCallback(async (): Promise<boolean> => {
    if (!requestId || !freshLines || creatingRef.current) return false;
    creatingRef.current = true;
    setBusy(true);
    try {
      const { data: session } = await supabase.auth.getSession();
      const { data: head, error } = await supabase
        .from("project_proformas")
        .insert({ request_id: requestId, created_by: session.session?.user.id ?? null })
        .select("*")
        .single();
      if (error || !head) throw error ?? new Error("Proforma niet aangemaakt");
      if (freshLines.length > 0) {
        const { error: linesError } = await supabase.from("project_proforma_lines").insert(toRows(head.id, freshLines));
        if (linesError) throw linesError;
      }
      lastSignatureRef.current = freshSignature;
      await load();
      return true;
    } catch (err) {
      reportError(err, { where: "useProforma.create" });
      // Een tweede scherm kan hem net hebben aangemaakt: dan gewoon laden.
      await load();
      return false;
    } finally {
      creatingRef.current = false;
      setBusy(false);
    }
  }, [requestId, freshLines, freshSignature, load]);

  // Bij akkoord ontstaat de proforma vanzelf (fase 1: zodra een beheerder
  // het project opent met de specificatie geladen).
  useEffect(() => {
    if (!autoCreate || loading || proforma || !isAccepted || !freshLines) return;
    void create();
  }, [autoCreate, loading, proforma, isAccepted, freshLines, create]);

  const applyPlan = useCallback(
    async (proformaId: string, plan: ProformaSyncPlan) => {
      if (plan.deletes.length > 0) {
        const { error } = await supabase.from("project_proforma_lines").delete().in("id", plan.deletes);
        if (error) throw error;
      }
      for (const { id, patch } of plan.updates) {
        const { error } = await supabase.from("project_proforma_lines").update(patch).eq("id", id);
        if (error) throw error;
      }
      if (plan.inserts.length > 0) {
        const { error } = await supabase.from("project_proforma_lines").insert(toRows(proformaId, plan.inserts));
        if (error) throw error;
      }
    },
    [],
  );

  // Volg-logica: zodra de specificatie verandert, trekken we de offerteregels
  // gelijk. Eén keer per unieke specificatie, nooit twee keer tegelijk.
  useEffect(() => {
    if (!proforma || proforma.status !== "concept" || !freshLines || !freshSignature) return;
    if (syncingRef.current || lastSignatureRef.current === freshSignature) return;
    const plan = planProformaSync(lines, freshLines);
    lastSignatureRef.current = freshSignature;
    if (isEmptySyncPlan(plan)) return;
    syncingRef.current = true;
    (async () => {
      try {
        await applyPlan(proforma.id, plan);
        setLastSyncedAt(new Date().toISOString());
        await load();
      } catch (err) {
        reportError(err, { where: "useProforma.sync" });
        lastSignatureRef.current = null;
      } finally {
        syncingRef.current = false;
      }
    })();
  }, [proforma, lines, freshLines, freshSignature, applyPlan, load]);

  return {
    proforma,
    lines,
    loading,
    busy,
    isAccepted,
    canCreate: isAccepted && !proforma && !!freshLines && !loading,
    isRegistered: proforma?.status === "registered",
    create,
    reload: load,
    lastSyncedAt,
  };
}
