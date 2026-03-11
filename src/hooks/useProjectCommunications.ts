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
      if (!requestId && !accommodationId) return [];

      // Fetch manual communications
      let commQuery = supabase
        .from("project_communications")
        .select("*")
        .order("communication_date", { ascending: false });

      if (requestId) {
        commQuery = commQuery.eq("request_id", requestId);
      } else if (accommodationId) {
        commQuery = commQuery.eq("accommodation_id", accommodationId);
      }

      // Fetch email log entries — need to query both request_id and accommodation_id
      // since some emails are linked to the accommodation, not the program request
      const emailQueries = [];

      if (requestId) {
        emailQueries.push(
          supabase
            .from("email_log")
            .select("*")
            .eq("related_request_id", requestId)
            .order("sent_at", { ascending: false })
        );
      }

      if (accommodationId) {
        emailQueries.push(
          supabase
            .from("email_log")
            .select("*")
            .eq("related_accommodation_id", accommodationId)
            .order("sent_at", { ascending: false })
        );
      }

      const [commResult, emailResult] = await Promise.all([
        commQuery,
        emailQuery,
      ]);

      if (commResult.error) throw commResult.error;
      if (emailResult.error) throw emailResult.error;

      const manualItems = (commResult.data || []).map((c) => ({
        ...c,
        communication_type: c.communication_type as CommunicationType,
        direction: c.direction as CommunicationDirection,
        metadata: (c.metadata || {}) as Record<string, unknown>,
        source: 'manual' as const,
      })) as ProjectCommunication[];

      const emailItems: ProjectCommunication[] = (emailResult.data || []).map((log) => ({
        id: `email_log_${log.id}`,
        request_id: log.related_request_id,
        accommodation_id: log.related_accommodation_id,
        communication_type: 'email_out' as CommunicationType,
        direction: 'outbound' as CommunicationDirection,
        subject: log.subject,
        content: '', // email_log doesn't store body
        contact_name: log.recipient_name,
        contact_email: log.recipient_email,
        logged_by: null,
        logged_at: log.created_at,
        communication_date: log.sent_at || log.created_at,
        metadata: {
          email_type: log.email_type,
          status: log.status,
          ...(log.metadata as Record<string, unknown> || {}),
        },
        created_at: log.created_at,
        updated_at: log.created_at,
        source: 'email_log' as const,
        email_type: log.email_type,
      }));

      // Deduplicate: skip email_log items that match a manual entry
      // (same subject + contact_email + within 1 minute)
      const dedupedEmailItems = emailItems.filter((emailItem) => {
        return !manualItems.some((manual) => {
          if (manual.subject !== emailItem.subject) return false;
          if (manual.contact_email !== emailItem.contact_email) return false;
          const manualDate = new Date(manual.communication_date).getTime();
          const emailDate = new Date(emailItem.communication_date).getTime();
          return Math.abs(manualDate - emailDate) < 60000; // 1 minute
        });
      });

      // Merge and sort by date descending
      const merged = [...manualItems, ...dedupedEmailItems].sort(
        (a, b) => new Date(b.communication_date).getTime() - new Date(a.communication_date).getTime()
      );

      return merged;
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
