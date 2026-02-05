import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { PartnerExtraPreset, PartnerExtraPresetInsert } from '@/types/accommodationExtras';

export function usePartnerExtraPresets() {
  return useQuery({
    queryKey: ['partner-extra-presets'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('partner_extra_presets')
        .select('*')
        .eq('is_active', true)
        .order('sort_order', { ascending: true });

      if (error) throw error;
      return data as PartnerExtraPreset[];
    },
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

export function useDeletePartnerExtraPreset() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('partner_extra_presets')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['partner-extra-presets'] });
    },
  });
}
