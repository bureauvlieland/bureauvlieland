import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { ProjectCommunication, CommunicationType, CommunicationDirection } from "@/types/projectCommunication";

interface UseProjectCommunicationsOptions {
  requestId?: string;
  accommodationId?: string;
}

interface CreateCommunicationData {
  request_id?: string | null;
  accommodation_id?: string | null;
  communication_type: CommunicationType;
  direction: CommunicationDirection;
  subject?: string;
  content: string;
  contact_name?: string;
  contact_email?: string;
  communication_date: string;
}

export function useProjectCommunications({ requestId, accommodationId }: UseProjectCommunicationsOptions) {
  const queryClient = useQueryClient();
  const queryKey = ["project-communications", requestId, accommodationId];

  const { data: communications = [], isLoading, error } = useQuery({
    queryKey,
    queryFn: async () => {
      let query = supabase
        .from("project_communications")
        .select("*")
        .order("communication_date", { ascending: false });

      if (requestId) {
        query = query.eq("request_id", requestId);
      } else if (accommodationId) {
        query = query.eq("accommodation_id", accommodationId);
      } else {
        return [];
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as ProjectCommunication[];
    },
    enabled: !!(requestId || accommodationId),
  });

  const createMutation = useMutation({
    mutationFn: async (data: CreateCommunicationData) => {
      const { data: session } = await supabase.auth.getSession();
      
      const { data: created, error } = await supabase
        .from("project_communications")
        .insert({
          ...data,
          logged_by: session?.session?.user?.id || null,
        })
        .select()
        .single();

      if (error) throw error;
      return created;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("project_communications")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
    },
  });

  return {
    communications,
    isLoading,
    error,
    createCommunication: createMutation.mutateAsync,
    isCreating: createMutation.isPending,
    deleteCommunication: deleteMutation.mutateAsync,
    isDeleting: deleteMutation.isPending,
  };
}
