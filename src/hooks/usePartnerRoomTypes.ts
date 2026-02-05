import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import type { PartnerRoomType, PartnerRoomTypeInsert, PartnerRoomTypeUpdate } from "@/types/partnerRoomTypes";

export function usePartnerRoomTypes(partnerId?: string) {
  return useQuery({
    queryKey: ['partner-room-types', partnerId],
    queryFn: async () => {
      let query = supabase
        .from('partner_room_types')
        .select('*')
        .eq('is_active', true)
        .order('sort_order', { ascending: true })
        .order('name', { ascending: true });

      if (partnerId) {
        query = query.eq('partner_id', partnerId);
      }

      const { data, error } = await query;
      if (error) throw error;
      
      // Parse images JSONB to typed array
      return (data || []).map(room => ({
        ...room,
        facilities: room.facilities || [],
        images: Array.isArray(room.images) ? room.images : [],
      })) as PartnerRoomType[];
    },
    enabled: !!partnerId,
  });
}

export function useAddPartnerRoomType() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (roomType: PartnerRoomTypeInsert) => {
      const { data, error } = await supabase
        .from('partner_room_types')
        .insert(roomType)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['partner-room-types', variables.partner_id] });
      toast({
        title: "Kamertype toegevoegd",
        description: "Het kamertype is succesvol opgeslagen.",
      });
    },
    onError: (error) => {
      console.error('Error adding room type:', error);
      toast({
        title: "Fout bij toevoegen",
        description: "Er is een fout opgetreden bij het toevoegen van het kamertype.",
        variant: "destructive",
      });
    },
  });
}

export function useUpdatePartnerRoomType() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, partnerId, data }: { id: string; partnerId: string; data: PartnerRoomTypeUpdate }) => {
      const { data: result, error } = await supabase
        .from('partner_room_types')
        .update(data)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return { result, partnerId };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['partner-room-types', result.partnerId] });
      toast({
        title: "Kamertype bijgewerkt",
        description: "De wijzigingen zijn opgeslagen.",
      });
    },
    onError: (error) => {
      console.error('Error updating room type:', error);
      toast({
        title: "Fout bij bijwerken",
        description: "Er is een fout opgetreden bij het bijwerken van het kamertype.",
        variant: "destructive",
      });
    },
  });
}

export function useDeletePartnerRoomType() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, partnerId }: { id: string; partnerId: string }) => {
      // Soft delete by setting is_active to false
      const { error } = await supabase
        .from('partner_room_types')
        .update({ is_active: false })
        .eq('id', id);

      if (error) throw error;
      return { partnerId };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['partner-room-types', result.partnerId] });
      toast({
        title: "Kamertype verwijderd",
        description: "Het kamertype is verwijderd.",
      });
    },
    onError: (error) => {
      console.error('Error deleting room type:', error);
      toast({
        title: "Fout bij verwijderen",
        description: "Er is een fout opgetreden bij het verwijderen van het kamertype.",
        variant: "destructive",
      });
    },
  });
}
