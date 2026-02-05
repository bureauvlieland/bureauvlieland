import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { PartnerExtraPreset, PartnerExtraPresetInsert } from '@/types/accommodationExtras';

export function usePartnerExtraPresets(partnerId?: string) {
  return useQuery({
    queryKey: ['partner-extra-presets', partnerId],
    queryFn: async () => {
      let query = supabase
        .from('partner_extra_presets')
        .select('*')
        .eq('is_active', true)
        .order('category', { ascending: true })
        .order('sort_order', { ascending: true });

      if (partnerId) {
        query = query.eq('partner_id', partnerId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as PartnerExtraPreset[];
    },
    enabled: partnerId !== undefined,
  });
}

export function useAddPartnerExtraPreset() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (preset: PartnerExtraPresetInsert) => {
      const { data, error } = await supabase
        .from('partner_extra_presets')
        .insert(preset)
        .select()
        .single();

      if (error) throw error;
      return data as PartnerExtraPreset;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['partner-extra-presets'] });
    },
  });
}

export function useUpdatePartnerExtraPreset() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<PartnerExtraPreset> & { id: string }) => {
      const { data, error } = await supabase
        .from('partner_extra_presets')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as PartnerExtraPreset;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['partner-extra-presets'] });
    },
  });
}

export function useDeletePartnerExtraPreset() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('partner_extra_presets')
        .update({ is_active: false })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['partner-extra-presets'] });
    },
  });
}
