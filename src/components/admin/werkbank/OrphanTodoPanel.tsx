import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ListTodo, Check, X, ExternalLink } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";

interface TodoRow {
  id: string;
  title: string;
  description: string | null;
  priority: "low" | "normal" | "high" | "urgent";
  due_date: string | null;
  auto_type: string | null;
  related_partner_id: string | null;
  related_request_id: string | null;
  created_at: string;
}

const PRIORITY_TONE: Record<TodoRow["priority"], string> = {
  urgent: "border-red-200 bg-red-50 text-red-700",
  high:   "border-amber-200 bg-amber-50 text-amber-700",
  normal: "border-slate-200 bg-slate-50 text-slate-700",
  low:    "border-slate-200 bg-white text-slate-600",
};

export function OrphanTodoPanel({ todoId, onResolved }: { todoId: string; onResolved?: () => void }) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const { data: todo, isLoading } = useQuery<TodoRow | null>({
    queryKey: ["werkbank-orphan-todo", todoId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("admin_todos")
        .select("id, title, description, priority, due_date, auto_type, related_partner_id, related_request_id, related_accommodation_request_id, created_at")
        .eq("id", todoId)
        .maybeSingle();
      if (error) throw error;
      return (data ?? null) as TodoRow | null;
    },
  });

  const { data: partner } = useQuery({
    queryKey: ["werkbank-orphan-todo-partner", todo?.related_partner_id],
    enabled: !!todo?.related_partner_id,
    queryFn: async () => {
      const { data } = await supabase
        .from("partners")
        .select("id, name, email, contact_email")
        .eq("id", todo!.related_partner_id!)
        .maybeSingle();
      return data;
    },
  });

  const refreshAll = () => {
    queryClient.invalidateQueries({ queryKey: ["werkbank-inbox"] });
    queryClient.invalidateQueries({ queryKey: ["werkbank-orphan-todo", todoId] });
    queryClient.invalidateQueries({ queryKey: ["claudia-recommendations"] });
    queryClient.invalidateQueries({ queryKey: ["claudia-recommendations-count"] });
  };

  const setStatus = async (status: "done" | "dismissed") => {
    const patch: Record<string, unknown> = { status };
    if (status === "done") patch.completed_at = new Date().toISOString();
    const { error } = await supabase.from("admin_todos").update(patch).eq("id", todoId);
    if (error) {
      toast({ title: "Kon niet bijwerken", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: status === "done" ? "Opgepakt" : "Gemarkeerd als niet relevant" });
    refreshAll();
    onResolved?.();
  };

  if (isLoading) {
    return <div className="p-6 text-sm text-muted-foreground">Laden…</div>;
  }
  if (!todo) {
    return <div className="p-6 text-sm text-muted-foreground">Taak niet meer gevonden.</div>;
  }

  return (
    <div className="space-y-4 p-4">
      <div>
        <div className="text-xs uppercase tracking-wide text-muted-foreground">Losse taak</div>
        <h2 className="mt-1 text-xl font-semibold leading-snug">{todo.title}</h2>
        <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <Badge variant="outline">Prio: {todo.priority}</Badge>
          {todo.auto_type && <Badge variant="secondary">{todo.auto_type}</Badge>}
          {todo.due_date && <span>Deadline {todo.due_date}</span>}
          <span>Aangemaakt {new Date(todo.created_at).toLocaleDateString("nl-NL")}</span>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm">
            <ListTodo className="h-4 w-4 text-amber-600" /> Taak
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className={cn("rounded-md border px-3 py-2 text-sm", PRIORITY_TONE[todo.priority])}>
            <div className="font-medium leading-snug">{todo.title}</div>
            {todo.description && (
              <div className="mt-1 whitespace-pre-wrap text-xs opacity-80">{todo.description}</div>
            )}
          </div>

          {partner && (
            <div className="rounded-md border bg-background px-3 py-2 text-sm">
              <div className="text-xs uppercase text-muted-foreground">Partner</div>
              <div className="font-medium">{partner.name}</div>
              <div className="text-xs text-muted-foreground">{partner.contact_email || partner.email}</div>
              <Button
                size="sm"
                variant="outline"
                className="mt-2 h-7 gap-1"
                onClick={() => navigate(`/admin/partners/${partner.id}`)}
              >
                Open partner <ExternalLink className="h-3.5 w-3.5" />
              </Button>
            </div>
          )}

          <div className="flex gap-2">
            <Button size="sm" variant="outline" className="gap-1" onClick={() => setStatus("done")}>
              <Check className="h-4 w-4" /> Opgepakt
            </Button>
            <Button size="sm" variant="ghost" className="gap-1" onClick={() => setStatus("dismissed")}>
              <X className="h-4 w-4" /> Niet relevant
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
