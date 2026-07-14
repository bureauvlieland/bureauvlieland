import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  type ProgramRequestItem,
  type ProgramRequestHistory,
  type ProgramRequestWithItems,
  type ProgramType,
  type QuoteStatus,
  calculateStatusSummary,
} from "@/types/programRequest";
import type { AccommodationRequest, AccommodationQuote } from "@/types/accommodation";

export interface BillingDetails {
  billing_company_name: string;
  billing_kvk_number: string;
  billing_vat_number: string;
  billing_address_street: string;
  billing_address_postal: string;
  billing_address_city: string;
  billing_contact_name: string;
  billing_contact_email: string;
  billing_reference: string;
}

export interface AccommodationSummary {
  hasAccommodation: boolean;
  status: "none" | "pending" | "quoted" | "selected";
  selectedQuote: AccommodationQuote | null;
  totalQuotes: number;
}

interface UseCustomerProgramReturn {
  program: ProgramRequestWithItems | null;
  history: ProgramRequestHistory[];
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  updateItem: (itemId: string, updates: Partial<ProgramRequestItem>) => void;
  removeItem: (itemId: string) => void;
  addItem: (blockId: string, dayIndex: number, preferredTime: string | null, notes: string) => void;
  getPendingChanges: () => PendingChange[];
  submitChanges: () => Promise<boolean>;
  /** Item-ids die de klant lokaal heeft aangeklikt om te verwijderen, maar
   *  waarvoor nog niet op "Wijzigingen opslaan" is geklikt. Het onderdeel
   *  blijft zichtbaar in de tijdlijn met een "wordt verwijderd"-badge. */
  pendingRemovals: Set<string>;
  isPendingRemoval: (itemId: string) => boolean;
  updateProgramDetails: (updates: { selectedDates?: Date[]; numberOfPeople?: number; programDescription?: string }) => Promise<boolean>;
  updateGuestDetails: (updates: { guest_names?: string | null; dietary_notes?: string | null; room_assignment?: string | null }) => Promise<boolean>;
  updateBillingDetails: (details: BillingDetails) => Promise<boolean>;
  acceptTerms: (signatureName?: string) => Promise<boolean>;
  cancelRequest: (reason?: string, cancelAccommodation?: boolean) => Promise<boolean>;
  acceptItem: (itemId: string) => Promise<boolean>;
  cancelItem: (itemId: string) => Promise<boolean>;
  submitCounterProposal: (itemId: string, counterTime: string, counterNote: string) => Promise<boolean>;
  acceptQuoteProposal: () => Promise<boolean>;
  approveQuoteItem: (itemId: string) => Promise<boolean>;
  bulkApproveQuoteItems: () => Promise<{ approved: number; failed: number; autoSentToPartner: number }>;
  statusSummary: ReturnType<typeof calculateStatusSummary>;
  // Accommodation data
  accommodation: AccommodationRequest | null;
  accommodationQuotes: AccommodationQuote[];
  accommodationSummary: AccommodationSummary;
  selectAccommodationQuote: (quoteId: string) => Promise<boolean>;
  // Server-resolved data for portal consumers (avoids extra anon DB reads)
  billingLinesByItem: Record<string, any[]>;
  blockVatRates: Record<string, number>;
  extrasByQuoteId: Record<string, any[]>;
}



export interface PendingChange {
  type: "time_changed" | "day_changed" | "notes_changed" | "removed" | "added" | "people_changed";
  itemId: string;
  itemName: string;
  providerName: string;
  providerEmail?: string;
  oldValue?: string;
  newValue?: string;
  // For added items
  blockId?: string;
  dayIndex?: number;
  preferredTime?: string | null;
  notes?: string;
}

// Temporary ID prefix for locally added items (before submission)
const TEMP_ID_PREFIX = "temp-";

export const useCustomerProgram = (token: string): UseCustomerProgramReturn => {
  const [program, setProgram] = useState<ProgramRequestWithItems | null>(null);
  const [history, setHistory] = useState<ProgramRequestHistory[]>([]);
  const [originalItems, setOriginalItems] = useState<ProgramRequestItem[]>([]);
  const [accommodation, setAccommodation] = useState<AccommodationRequest | null>(null);
  const [accommodationQuotes, setAccommodationQuotes] = useState<AccommodationQuote[]>([]);
  const [addedItems, setAddedItems] = useState<Array<{
    tempId: string;
    blockId: string;
    blockName: string;
    blockCategory: string;
    providerName: string;
    providerId: string;
    providerEmail: string | null;
    blockType: string;
    dayIndex: number;
    preferredTime: string | null;
    notes: string;
    imageUrl: string | null;
    imageAsset: string | null;
  }>>([]);
  const [billingLinesByItem, setBillingLinesByItem] = useState<Record<string, any[]>>({});
  const [blockVatRates, setBlockVatRates] = useState<Record<string, number>>({});
  const [extrasByQuoteId, setExtrasByQuoteId] = useState<Record<string, any[]>>({});
  const [pendingRemovals, setPendingRemovals] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);


  const fetchProgram = useCallback(async () => {

    if (!token) {
      setError("Geen token opgegeven");
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Single source of truth: get-customer-program edge function (service-role,
      // token-validated). Replaces the previous fan-out of anon SELECTs across
      // program_requests, program_request_items, building_blocks,
      // program_request_history, accommodation_requests, accommodation_quotes,
      // program_item_billing_lines and accommodation_quote_extras.
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
      const response = await fetch(
        `${supabaseUrl}/functions/v1/get-customer-program?token=${encodeURIComponent(token)}`,
        { headers: { apikey: supabaseKey, Authorization: `Bearer ${supabaseKey}` } },
      );

      if (response.status === 404) {
        setError("Programma niet gevonden of verlopen");
        return;
      }
      if (!response.ok) {
        throw new Error(`Edge function returned ${response.status}`);
      }

      const payload = await response.json();
      const programData = payload.program;
      if (!programData) {
        setError("Programma niet gevonden of verlopen");
        return;
      }

      // Pending-flow: nieuw toegevoegde items zijn voor de klant pas zichtbaar
      // nadat admin op "Publiceer & notificeer" heeft geklikt.
      const visibleItems = ((programData.items as any[]) || []).filter(
        (it: any) => !it.pending_added,
      );

      // Accommodation request transformation (if linked)
      const accomData = payload.linkedAccommodation;
      if (accomData) {
        const transformedAccom: AccommodationRequest = {
          id: accomData.id,
          customer_token: accomData.customer_token,
          customer_name: accomData.customer_name,
          customer_email: accomData.customer_email,
          customer_phone: accomData.customer_phone,
          customer_company: accomData.customer_company,
          reference_number: accomData.reference_number,
          arrival_date: accomData.arrival_date,
          departure_date: accomData.departure_date,
          number_of_guests: accomData.number_of_guests,
          accommodation_type: accomData.accommodation_type as AccommodationRequest["accommodation_type"],
          room_count: accomData.room_count,
          room_occupancy: accomData.room_occupancy,
          room_types: (accomData.room_types as string[]) || [],
          location_preference: (accomData.location_preference as string[]) || [],
          facilities_required: (accomData.facilities_required as string[]) || [],
          budget_range: accomData.budget_range,
          special_requests: accomData.special_requests,
          wants_activities: accomData.wants_activities || false,
          linked_program_id: accomData.linked_program_id,
          quotes_requested_count: accomData.quotes_requested_count ?? 0,
          quotes_declined_count: (accomData as any).quotes_declined_count ?? 0,
          status: accomData.status as AccommodationRequest["status"],
          admin_notes: accomData.admin_notes,
          room_assignment: (accomData as any).room_assignment ?? null,
          guest_details_updated_at: (accomData as any).guest_details_updated_at ?? null,
          created_at: accomData.created_at,
          updated_at: accomData.updated_at,
          expires_at: accomData.expires_at,
        };
        setAccommodation(transformedAccom);

        const transformedQuotes: AccommodationQuote[] = ((payload.accommodationQuotes as any[]) || []).map((q: any) => ({
          id: q.id,
          request_id: q.request_id,
          partner_id: q.partner_id,
          accommodation_name: q.accommodation_name,
          description: q.description,
          room_configuration: q.room_configuration || [],
          price_total: q.price_total,
          price_per_person_per_night: q.price_per_person_per_night,
          price_includes_vat: q.price_includes_vat ?? true,
          vat_rate: q.vat_rate ?? 9,
          includes: (q.includes as string[]) || [],
          conditions: q.conditions,
          valid_until: q.valid_until,
          status: q.status,
          submitted_at: q.submitted_at,
          selected_at: q.selected_at,
          partner_notes: q.partner_notes,
          customer_terms_accepted_at: q.customer_terms_accepted_at,
          customer_signature_name: q.customer_signature_name,
          quote_attachment_path: q.quote_attachment_path,
          quote_attachment_filename: q.quote_attachment_filename,
          quote_attachment_url: q.quote_attachment_url ?? null,
          quote_external_url: q.quote_external_url,
          invoiced_amount: q.invoiced_amount,
          invoiced_number: q.invoiced_number,
          invoiced_date: q.invoiced_date,
          invoiced_file_path: q.invoiced_file_path,
          commission_percentage: q.commission_percentage,
          commission_amount: q.commission_amount,
          commission_status: q.commission_status,
          commission_invoiced_at: q.commission_invoiced_at,
          created_at: q.created_at,
          updated_at: q.updated_at,
          partner: q.partner,
        }));
        setAccommodationQuotes(transformedQuotes);
      } else {
        setAccommodation(null);
        setAccommodationQuotes([]);
      }

      const programWithItems: ProgramRequestWithItems = {
        ...programData,
        selected_dates: programData.selected_dates as string[],
        origin: ((programData as { origin?: string | null }).origin ?? "self_service"),
        quote_status: programData.quote_status as QuoteStatus | null,
        items: visibleItems as ProgramRequestItem[],
      };
      if (programData.quote_pdf_url) {
        (programWithItems as any).quote_pdf_url = programData.quote_pdf_url;
      }

      setProgram(programWithItems);
      setOriginalItems(JSON.parse(JSON.stringify(payload.rawItems || visibleItems)));
      setHistory((payload.history || []) as ProgramRequestHistory[]);
      setBillingLinesByItem(payload.billingLinesByItem || {});
      setBlockVatRates(payload.blockVatRates || {});
      setExtrasByQuoteId(payload.extrasByQuoteId || {});
    } catch (err) {
      console.error("Error fetching program:", err);
      setError("Er ging iets mis bij het ophalen van uw programma");
    } finally {
      setIsLoading(false);
    }
  }, [token]);


  useEffect(() => {
    fetchProgram();
  }, [fetchProgram]);

  const updateItem = useCallback((itemId: string, updates: Partial<ProgramRequestItem>) => {
    setProgram((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        items: prev.items.map((item) =>
          item.id === itemId ? { ...item, ...updates } : item
        ),
      };
    });
  }, []);

  const removeItem = useCallback((itemId: string) => {
    // If it's a temp item (added but not submitted), remove from addedItems entirely
    if (itemId.startsWith(TEMP_ID_PREFIX)) {
      setAddedItems((prev) => prev.filter((item) => item.tempId !== itemId));
      setProgram((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          items: prev.items.filter((item) => item.id !== itemId),
        };
      });
      return;
    }

    // For existing items: toggle membership in pendingRemovals. We do NOT
    // mutate the local item status to "cancelled" anymore — the item blijft
    // zichtbaar in de tijdlijn met een "wordt verwijderd"-banner totdat de
    // klant expliciet op "Wijzigingen opslaan" klikt. Zo kan de klant nooit
    // meer denken dat het al opgeslagen is en het bij refresh terug zien
    // komen zonder dat duidelijk was dat het nog niet was doorgevoerd.
    setPendingRemovals((prev) => {
      const next = new Set(prev);
      if (next.has(itemId)) {
        next.delete(itemId);
      } else {
        next.add(itemId);
      }
      return next;
    });
  }, []);

  const isPendingRemoval = useCallback(
    (itemId: string) => pendingRemovals.has(itemId),
    [pendingRemovals],
  );


  const addItem = useCallback(async (
    blockId: string, 
    dayIndex: number, 
    preferredTime: string | null, 
    notes: string
  ) => {
    if (!program) return;

    // Fetch the block details
    const { data: block, error } = await supabase
      .from("building_blocks")
      .select(`
        *,
        provider:partners(id, name, email)
      `)
      .eq("id", blockId)
      .single();

    if (error || !block) {
      console.error("Error fetching block:", error);
      return;
    }

    const tempId = `${TEMP_ID_PREFIX}${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    // Add to addedItems state
    const newAddedItem = {
      tempId,
      blockId: block.id,
      blockName: block.name,
      blockCategory: block.category,
      providerName: block.provider?.name || "Bureau Vlieland",
      providerId: block.provider?.id || "bureau",
      providerEmail: block.provider?.email || null,
      blockType: block.block_type,
      dayIndex,
      preferredTime,
      notes,
      imageUrl: block.image_url,
      imageAsset: block.image_asset,
    };
    
    setAddedItems((prev) => [...prev, newAddedItem]);

    // Also add to program items for display
    const newProgramItem: ProgramRequestItem = {
      id: tempId,
      request_id: program.id,
      block_id: block.id,
      block_name: block.name,
      block_category: block.category,
      provider_name: block.provider?.name || "Bureau Vlieland",
      provider_id: block.provider?.id || "bureau",
      provider_email: block.provider?.email || null,
      block_type: block.block_type,
      price_indication: block.price_adult ? `€${block.price_adult}` : null,
      duration: block.duration || null,
      day_index: dayIndex,
      preferred_time: preferredTime,
      customer_notes: notes,
      status: "pending",
      status_note: null,
      status_updated_at: null,
      status_updated_by: null,
      version: 1,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      executed_at: null,
      customer_accepted_at: null,
      quoted_price: null,
      quoted_at: null,
      quoted_notes: null,
      proposed_time: null,
      proposed_date: null,
      // Customer counter-proposal fields
      customer_counter_time: null,
      customer_counter_note: null,
      customer_counter_at: null,
      confirmed_time: null,
      // Image data for display
      image_url: block.image_url,
      image_asset: block.image_asset,
      // Quote mode fields (null for self-service added items)
      item_quote_status: null,
      admin_price_override: null,
      admin_price_notes: block.price_adult_note || null,
      skip_partner_notification: false,
      price_type: block.price_type || "per_person",
      external_url: block.external_url || null,
      // Per-item approval
      customer_approved_at: null,
      override_people: null,
    };

    setProgram((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        items: [...prev.items, newProgramItem],
      };
    });
  }, [program]);

  const getPendingChanges = useCallback((): PendingChange[] => {
    if (!program) return [];

    const changes: PendingChange[] = [];

    program.items.forEach((item) => {
      // Check if this is a newly added item (temp ID)
      if (item.id.startsWith(TEMP_ID_PREFIX)) {
        const addedItem = addedItems.find((a) => a.tempId === item.id);
        if (addedItem) {
          changes.push({
            type: "added",
            itemId: item.id,
            itemName: item.block_name,
            providerName: item.provider_name,
            providerEmail: item.provider_email || undefined,
            blockId: addedItem.blockId,
            dayIndex: addedItem.dayIndex,
            preferredTime: addedItem.preferredTime,
            notes: addedItem.notes,
          });
        }
        return;
      }

      const original = originalItems.find((o) => o.id === item.id);
      if (!original) return;

      // Check for time changes
      if (item.preferred_time !== original.preferred_time) {
        changes.push({
          type: "time_changed",
          itemId: item.id,
          itemName: item.block_name,
          providerName: item.provider_name,
          providerEmail: item.provider_email || undefined,
          oldValue: original.preferred_time || "Flexibel",
          newValue: item.preferred_time || "Flexibel",
        });
      }

      // Check for day changes
      if (item.day_index !== original.day_index) {
        changes.push({
          type: "day_changed",
          itemId: item.id,
          itemName: item.block_name,
          providerName: item.provider_name,
          providerEmail: item.provider_email || undefined,
          oldValue: `Dag ${original.day_index + 1}`,
          newValue: `Dag ${item.day_index + 1}`,
        });
      }

      // Check for override_people changes (normalize: null/undefined/groupTotal all mean "use group total")
      const normalizeOverride = (val: number | null | undefined, groupTotal: number) => {
        if (val == null || val === groupTotal) return null;
        return val;
      };
      const groupTotal = program.number_of_people || 0;
      const normalizedCurrent = normalizeOverride(item.override_people, groupTotal);
      const normalizedOriginal = normalizeOverride(original.override_people, groupTotal);

      if (normalizedCurrent !== normalizedOriginal) {
        changes.push({
          type: "people_changed",
          itemId: item.id,
          itemName: item.block_name,
          providerName: item.provider_name,
          providerEmail: item.provider_email || undefined,
          oldValue: normalizedOriginal ? String(normalizedOriginal) : "groepstotaal",
          newValue: normalizedCurrent ? String(normalizedCurrent) : "groepstotaal",
        });
      }

      // Check for cancellation (removal) via pendingRemovals set.
      // We keep the legacy status-flip check too so ander code dat toch nog
      // status='cancelled' zet niet stilletjes stopt met werken.
      const markedForRemoval =
        pendingRemovals.has(item.id) ||
        (item.status === "cancelled" && original.status !== "cancelled");
      if (markedForRemoval) {
        changes.push({
          type: "removed",
          itemId: item.id,
          itemName: item.block_name,
          providerName: item.provider_name,
          providerEmail: item.provider_email || undefined,
        });
      }
    });

    return changes;
  }, [program, originalItems, addedItems, pendingRemovals]);

  const submitChanges = useCallback(async (): Promise<boolean> => {
    if (!program) return false;

    const changes = getPendingChanges();
    if (changes.length === 0) return true;

    // Zorg dat de items-payload die naar de edge function gaat de
    // pending-removals correct als status='cancelled' toont — de bestaande
    // edge function-logica leest zowel change.type als de item-status.
    const itemsForPayload = program.items.map((item) =>
      pendingRemovals.has(item.id)
        ? { ...item, status: "cancelled" as const }
        : item,
    );

    try {
      // Call edge function to update items and send notifications
      const { error } = await supabase.functions.invoke("update-customer-program", {
        body: {
          token: token,
          changes: changes,
          items: itemsForPayload,
          origin: window.location.origin, // For test mode detection
        },
      });

      if (error) throw error;

      // Clear pending removals — refetch levert de gecancelde items met de
      // echte status='cancelled' terug uit de database.
      setPendingRemovals(new Set());
      await fetchProgram();
      return true;
    } catch (err) {
      console.error("Error submitting changes:", err);
      return false;
    }
  }, [program, token, getPendingChanges, fetchProgram, pendingRemovals]);


  const updateProgramDetails = useCallback(async (updates: { 
    selectedDates?: Date[]; 
    numberOfPeople?: number;
    programDescription?: string;
  }): Promise<boolean> => {
    if (!program) return false;

    try {
      const programDetails: { selectedDates?: string[]; numberOfPeople?: number; programDescription?: string } = {};
      
      if (updates.selectedDates) {
        // Use local date formatting to avoid timezone shifts
        // toISOString() converts to UTC which can shift the date backwards
        programDetails.selectedDates = updates.selectedDates.map(d => {
          const year = d.getFullYear();
          const month = String(d.getMonth() + 1).padStart(2, '0');
          const day = String(d.getDate()).padStart(2, '0');
          return `${year}-${month}-${day}`;
        });
      }
      if (updates.numberOfPeople) {
        programDetails.numberOfPeople = updates.numberOfPeople;
      }
      if (updates.programDescription !== undefined) {
        programDetails.programDescription = updates.programDescription;
      }

      const { error } = await supabase.functions.invoke("update-customer-program", {
        body: {
          token: token,
          programDetails,
          origin: window.location.origin, // For test mode detection
        },
      });

      if (error) throw error;

      await fetchProgram();
      return true;
    } catch (err) {
      console.error("Error updating program details:", err);
      return false;
    }
  }, [program, token, fetchProgram]);

  const updateGuestDetails = useCallback(async (updates: {
    guest_names?: string | null;
    dietary_notes?: string | null;
    room_assignment?: string | null;
  }): Promise<boolean> => {
    if (!program) return false;
    try {
      const { error } = await supabase.functions.invoke("update-customer-program", {
        body: {
          token,
          guestDetails: updates,
          origin: window.location.origin,
        },
      });
      if (error) throw error;
      await fetchProgram();
      return true;
    } catch (err) {
      console.error("Error updating guest details:", err);
      return false;
    }
  }, [program, token, fetchProgram]);

  const updateBillingDetails = useCallback(async (details: BillingDetails): Promise<boolean> => {
    if (!program) return false;

    try {
      const { error } = await supabase.functions.invoke("update-customer-program", {
        body: {
          token: token,
          billingDetails: details,
          origin: window.location.origin,
        },
      });

      if (error) throw error;

      await fetchProgram();
      return true;
    } catch (err) {
      console.error("Error updating billing details:", err);
      return false;
    }
  }, [program, token, fetchProgram]);

  const acceptTerms = useCallback(async (signatureName?: string): Promise<boolean> => {
    if (!program) return false;

    try {
      const { error } = await supabase.functions.invoke("update-customer-program", {
        body: {
          token: token,
          acceptTerms: true,
          signatureName: signatureName || null,
          origin: window.location.origin,
        },
      });

      if (error) throw error;

      await fetchProgram();
      return true;
    } catch (err) {
      console.error("Error accepting terms:", err);
      return false;
    }
  }, [program, token, fetchProgram]);

  const cancelRequest = useCallback(async (reason?: string, cancelAccommodation?: boolean): Promise<boolean> => {
    if (!program) return false;

    try {
      const { error } = await supabase.functions.invoke("cancel-program-request", {
        body: {
          token: token,
          reason,
          cancelAccommodation: cancelAccommodation ?? true,
          origin: window.location.origin, // For test mode detection
        },
      });

      if (error) throw error;

      // Set program to null to show cancelled state
      setProgram(null);
      setError("Deze aanvraag is geannuleerd");
      return true;
    } catch (err) {
      console.error("Error cancelling request:", err);
      return false;
    }
  }, [program, token]);

  const selectAccommodationQuote = useCallback(async (quoteId: string): Promise<boolean> => {
    if (!accommodation) return false;

    try {
      const response = await supabase.functions.invoke("select-accommodation-quote", {
        body: { token: accommodation.customer_token, quoteId },
      });

      if (response.error) {
        throw new Error(response.error.message || "Fout bij selecteren offerte");
      }

      // Refetch data after selection
      await fetchProgram();
      return true;
    } catch (err) {
      console.error("Error selecting accommodation quote:", err);
      return false;
    }
  }, [accommodation, fetchProgram]);

  // Accept a confirmed item (klant akkoord)
  const acceptItem = useCallback(async (itemId: string): Promise<boolean> => {
    if (!program) return false;

    try {
      const { error } = await supabase.functions.invoke("update-customer-program", {
        body: {
          token: token,
          acceptItemId: itemId,
          origin: window.location.origin,
        },
      });

      if (error) throw error;

      await fetchProgram();
      return true;
    } catch (err) {
      console.error("Error accepting item:", err);
      return false;
    }
  }, [program, token, fetchProgram]);

  // Cancel a specific item
  const cancelItem = useCallback(async (itemId: string): Promise<boolean> => {
    if (!program) return false;

    try {
      const { error } = await supabase.functions.invoke("update-customer-program", {
        body: {
          token: token,
          cancelItemId: itemId,
          origin: window.location.origin,
        },
      });

      if (error) throw error;

      await fetchProgram();
      return true;
    } catch (err) {
      console.error("Error cancelling item:", err);
      return false;
    }
  }, [program, token, fetchProgram]);

  // Submit counter proposal for an item
  const submitCounterProposal = useCallback(async (itemId: string, counterTime: string, counterNote: string): Promise<boolean> => {
    if (!program) return false;

    try {
      const { error } = await supabase.functions.invoke("update-customer-program", {
        body: {
          token: token,
          counterProposal: {
            itemId,
            counterTime,
            counterNote,
          },
          origin: window.location.origin,
        },
      });

      if (error) throw error;

      await fetchProgram();
      return true;
    } catch (err) {
      console.error("Error submitting counter proposal:", err);
      return false;
    }
  }, [program, token, fetchProgram]);

  // Detect admin impersonation via URL param (?impersonate=admin or any value with admin token)
  const isAdminImpersonating = (): boolean => {
    if (typeof window === "undefined") return false;
    const params = new URLSearchParams(window.location.search);
    return params.get("impersonate") === "admin";
  };

  // Helper: extract a meaningful error from a Supabase functions.invoke error.
  // The default `error.message` is the unhelpful "Edge Function returned a non-2xx status code".
  // The actual JSON body returned by the edge function lives on `error.context` (a Response),
  // so we read it once and surface its `error` field if present.
  const extractEdgeError = async (err: any, fallback: string): Promise<string> => {
    // Try to extract a meaningful error message from a FunctionsHttpError.
    // The body Response on err.context can only be read once, so we try carefully.
    try {
      const ctx = err?.context;
      if (ctx) {
        // Try .json() first
        if (typeof ctx.json === "function") {
          try {
            const cloned = typeof ctx.clone === "function" ? ctx.clone() : ctx;
            const body = await cloned.json();
            console.error("[extractEdgeError] body:", body);
            if (body?.error) return typeof body.error === "string" ? body.error : JSON.stringify(body.error);
            if (body?.message) return body.message;
          } catch (jsonErr) {
            // fallback to text
            try {
              const cloned = typeof ctx.clone === "function" ? ctx.clone() : ctx;
              const text = await cloned.text();
              console.error("[extractEdgeError] text body:", text);
              if (text) {
                try {
                  const parsed = JSON.parse(text);
                  if (parsed?.error) return parsed.error;
                  if (parsed?.message) return parsed.message;
                } catch {
                  return text.length < 300 ? text : fallback;
                }
              }
            } catch {
              /* ignore */
            }
          }
        }
        if (typeof ctx.error === "string") return ctx.error;
      }
    } catch (e) {
      console.error("[extractEdgeError] failed to parse:", e);
    }
    if (typeof err?.message === "string" && !err.message.includes("non-2xx")) {
      return err.message;
    }
    console.error("[extractEdgeError] fallback used. raw err:", err);
    return fallback;
  };

  // Accept quote proposal (for maatwerk quotes)
  const acceptQuoteProposal = useCallback(async (): Promise<boolean> => {
    if (!program) return false;

    try {
      const adminOverride = isAdminImpersonating();
      const { data, error } = await supabase.functions.invoke("accept-quote-proposal", {
        body: {
          token: token,
          origin: window.location.origin,
          ...(adminOverride ? { admin_override: true } : {}),
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      await fetchProgram();
      return true;
    } catch (err: any) {
      console.error("Error accepting quote proposal:", err);
      const message = await extractEdgeError(
        err,
        "Er ging iets mis bij het accorderen van dit voorstel"
      );
      toast.error(message);
      return false;
    }
  }, [program, token, fetchProgram]);

  // Approve a single quote item (per-item approval in quote mode)
  const approveQuoteItem = useCallback(async (itemId: string): Promise<boolean> => {
    if (!program) return false;

    try {
      const adminOverride = isAdminImpersonating();
      const { data, error } = await supabase.functions.invoke("approve-quote-item", {
        body: {
          token: token,
          item_id: itemId,
          origin: window.location.origin,
          ...(adminOverride ? { admin_override: true } : {}),
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      await fetchProgram();
      return true;
    } catch (err: any) {
      console.error("Error approving quote item:", err);
      const message = await extractEdgeError(
        err,
        "Er ging iets mis bij het accorderen van dit onderdeel"
      );
      toast.error(message);
      return false;
    }
  }, [program, token, fetchProgram]);

  // Bulk-approve: alle nog-niet-goedgekeurde quote-items in één klantactie.
  const bulkApproveQuoteItems = useCallback(async (): Promise<{
    approved: number;
    failed: number;
    autoSentToPartner: number;
  }> => {
    if (!program) return { approved: 0, failed: 0, autoSentToPartner: 0 };

    const adminOverride = isAdminImpersonating();
    const isProposalPhase = program.quote_status === "offerte_verstuurd";
    const candidates = program.items.filter(
      (i: any) =>
        i.status !== "cancelled" &&
        i.block_type !== "self_arranged" &&
        !i.customer_approved_at &&
        (isProposalPhase || ["offerte_verstuurd", "in_afstemming", "bevestigd"].includes(i.item_quote_status || "")),
    );

    let approved = 0;
    let failed = 0;
    let autoSentToPartner = 0;

    for (const item of candidates) {
      try {
        const { data, error } = await supabase.functions.invoke("approve-quote-item", {
          body: {
            token,
            item_id: item.id,
            origin: window.location.origin,
            ...(adminOverride ? { admin_override: true } : {}),
          },
        });
        if (error || data?.error) {
          failed++;
        } else {
          approved++;
          if (data?.auto_partner_sent) autoSentToPartner++;
        }
      } catch {
        failed++;
      }
    }

    await fetchProgram();

    if (approved > 0 && failed === 0) {
      toast.success(
        autoSentToPartner > 0
          ? `${approved} onderdelen goedgekeurd · ${autoSentToPartner} aanvraag/aanvragen verzonden naar aanbieders`
          : `${approved} onderdelen goedgekeurd`,
      );
    } else if (approved > 0 && failed > 0) {
      toast.warning(`${approved} goedgekeurd, ${failed} mislukt`);
    } else if (failed > 0) {
      toast.error("Goedkeuren mislukt. Probeer het later opnieuw.");
    }

    return { approved, failed, autoSentToPartner };
  }, [program, token, fetchProgram]);


  const statusSummary = program
    ? calculateStatusSummary(program.items)
    : { total: 0, confirmed: 0, pending: 0, alternative: 0, unavailable: 0, cancelled: 0, counter_proposed: 0, customerApproved: 0, awaitingPartnerSend: 0, priceChanged: 0, bureauManaged: 0, partnerTotal: 0, partnerConfirmed: 0, progress: 0 };

  // Accommodation summary
  const accommodationSummary: AccommodationSummary = {
    hasAccommodation: !!accommodation,
    status: !accommodation
      ? "none"
      : accommodationQuotes.some((q) => q.status === "selected")
      ? "selected"
      : accommodationQuotes.some((q) => q.status === "submitted")
      ? "quoted"
      : "pending",
    selectedQuote: accommodationQuotes.find((q) => q.status === "selected") || null,
    totalQuotes: accommodationQuotes.filter((q) => q.status === "submitted" || q.status === "selected").length,
  };

  return {
    program,
    history,
    isLoading,
    error,
    refetch: fetchProgram,
    updateItem,
    removeItem,
    addItem,
    getPendingChanges,
    submitChanges,
    pendingRemovals,
    isPendingRemoval,

    updateProgramDetails,
    updateGuestDetails,
    updateBillingDetails,
    acceptTerms,
    cancelRequest,
    acceptItem,
    cancelItem,
    submitCounterProposal,
    acceptQuoteProposal,
    approveQuoteItem,
    bulkApproveQuoteItems,
    statusSummary,
    // Accommodation
    accommodation,
    accommodationQuotes,
    accommodationSummary,
    selectAccommodationQuote,
    // Server-resolved data for portal consumers
    billingLinesByItem,
    blockVatRates,
    extrasByQuoteId,
  };

};
