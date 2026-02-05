import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { 
  AccommodationQuoteExtra, 
  AccommodationQuoteExtraInsert, 
  AccommodationQuoteExtraUpdate 
} from '@/types/accommodationExtras';

export function useQuoteExtras(quoteId: string | undefined) {
  return useQuery({
    queryKey: ['quote-extras', quoteId],
    queryFn: async () => {
      if (!quoteId) return [];
      
      const { data, error } = await supabase
        .from('accommodation_quote_extras')
        .select('*')
        .eq('quote_id', quoteId)
        .order('sort_order', { ascending: true });

      if (error) throw error;
      return data as AccommodationQuoteExtra[];
    },
    enabled: !!quoteId,
  });
}

export function useAddQuoteExtra() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (extra: AccommodationQuoteExtraInsert) => {
      const { data, error } = await supabase
        .from('accommodation_quote_extras')
        .insert(extra)
        .select()
        .single();

      if (error) throw error;
      return data as AccommodationQuoteExtra;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['quote-extras', data.quote_id] });
    },
  });
}

export function useUpdateQuoteExtra() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      id, 
      quoteId, 
      updates 
    }: { 
      id: string; 
      quoteId: string; 
      updates: AccommodationQuoteExtraUpdate 
    }) => {
      const { data, error } = await supabase
        .from('accommodation_quote_extras')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return { data: data as AccommodationQuoteExtra, quoteId };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['quote-extras', result.quoteId] });
    },
  });
}

export function useDeleteQuoteExtra() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, quoteId }: { id: string; quoteId: string }) => {
      const { error } = await supabase
        .from('accommodation_quote_extras')
        .delete()
        .eq('id', id);

      if (error) throw error;
      return { quoteId };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['quote-extras', result.quoteId] });
    },
  });
}
