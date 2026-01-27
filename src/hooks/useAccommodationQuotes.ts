import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { AccommodationRequest, AccommodationQuote, RoomConfiguration } from '@/types/accommodation';

interface QuotesSummary {
  total: number;
  received: number;
  selected: number;
}

interface UseAccommodationQuotesReturn {
  request: AccommodationRequest | null;
  quotes: AccommodationQuote[];
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  selectQuote: (quoteId: string) => Promise<boolean>;
  quotesSummary: QuotesSummary;
}

export function useAccommodationQuotes(token: string | undefined): UseAccommodationQuotesReturn {
  const [request, setRequest] = useState<AccommodationRequest | null>(null);
  const [quotes, setQuotes] = useState<AccommodationQuote[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!token) {
      setError('Geen geldige token');
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Fetch the accommodation request by token
      const { data: requestData, error: requestError } = await supabase
        .from('accommodation_requests')
        .select('*')
        .eq('customer_token', token)
        .maybeSingle();

      if (requestError) {
        throw new Error('Fout bij ophalen aanvraag');
      }

      if (!requestData) {
        setError('Aanvraag niet gevonden of verlopen');
        setIsLoading(false);
        return;
      }

      // Transform the database row to our typed interface
      const transformedRequest: AccommodationRequest = {
        id: requestData.id,
        customer_token: requestData.customer_token,
        customer_name: requestData.customer_name,
        customer_email: requestData.customer_email,
        customer_phone: requestData.customer_phone,
        customer_company: requestData.customer_company,
        arrival_date: requestData.arrival_date,
        departure_date: requestData.departure_date,
        number_of_guests: requestData.number_of_guests,
        accommodation_type: requestData.accommodation_type as AccommodationRequest['accommodation_type'],
        room_count: requestData.room_count,
        room_occupancy: requestData.room_occupancy,
        room_types: (requestData.room_types as string[]) || [],
        location_preference: (requestData.location_preference as string[]) || [],
        facilities_required: (requestData.facilities_required as string[]) || [],
        budget_range: requestData.budget_range,
        special_requests: requestData.special_requests,
        wants_activities: requestData.wants_activities || false,
        linked_program_id: requestData.linked_program_id,
        status: requestData.status as AccommodationRequest['status'],
        admin_notes: requestData.admin_notes,
        created_at: requestData.created_at,
        updated_at: requestData.updated_at,
        expires_at: requestData.expires_at,
      };

      setRequest(transformedRequest);

      // Fetch quotes for this request
      const { data: quotesData, error: quotesError } = await supabase
        .from('accommodation_quotes')
        .select(`
          *,
          partner:partners(id, name, email)
        `)
        .eq('request_id', requestData.id)
        .in('status', ['submitted', 'selected'])
        .order('price_per_person_per_night', { ascending: true });

      if (quotesError) {
        console.error('Error fetching quotes:', quotesError);
      } else {
        const transformedQuotes: AccommodationQuote[] = (quotesData || []).map((q) => ({
          id: q.id,
          request_id: q.request_id,
          partner_id: q.partner_id,
          accommodation_name: q.accommodation_name,
          description: q.description,
          room_configuration: (q.room_configuration as unknown as RoomConfiguration[]) || [],
          price_total: q.price_total,
          price_per_person_per_night: q.price_per_person_per_night,
          price_includes_vat: q.price_includes_vat ?? true,
          vat_rate: q.vat_rate ?? 9,
          includes: (q.includes as string[]) || [],
          conditions: q.conditions,
          valid_until: q.valid_until,
          status: q.status as AccommodationQuote['status'],
          submitted_at: q.submitted_at,
          selected_at: q.selected_at,
          partner_notes: q.partner_notes,
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
          partner: q.partner as AccommodationQuote['partner'],
        }));
        setQuotes(transformedQuotes);
      }
    } catch (err) {
      console.error('Error in useAccommodationQuotes:', err);
      setError(err instanceof Error ? err.message : 'Onbekende fout');
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const selectQuote = async (quoteId: string): Promise<boolean> => {
    if (!token) return false;

    try {
      const response = await supabase.functions.invoke('select-accommodation-quote', {
        body: { token, quoteId },
      });

      if (response.error) {
        throw new Error(response.error.message || 'Fout bij selecteren offerte');
      }

      // Refetch data after selection
      await fetchData();
      return true;
    } catch (err) {
      console.error('Error selecting quote:', err);
      setError(err instanceof Error ? err.message : 'Fout bij selecteren offerte');
      return false;
    }
  };

  // Calculate quotes summary
  const quotesSummary: QuotesSummary = {
    total: quotes.length,
    received: quotes.filter((q) => q.status === 'submitted' || q.status === 'selected').length,
    selected: quotes.filter((q) => q.status === 'selected').length,
  };

  return {
    request,
    quotes,
    isLoading,
    error,
    refetch: fetchData,
    selectQuote,
    quotesSummary,
  };
}
