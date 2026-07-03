import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface ResendEmailArgs {
  email_log_id: string;
  override_recipient_email?: string;
  override_recipient_name?: string;
}

export function useResendEmail() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (args: ResendEmailArgs) => {
      const { data, error } = await supabase.functions.invoke("resend-email", {
        body: args,
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      return data as { ok: true; new_email_log_id: string };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["project-communications"] });
    },
  });
}
