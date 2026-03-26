import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ClipboardList, ArrowRight, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { autoTodoTypeConfig, type AutoTodoType } from "@/lib/autoTodoCreator";
import { formatDistanceToNow } from "date-fns";
import { nl } from "date-fns/locale";

interface AdminTodo {
  id: string;
  title: string;
  priority: string;
  due_date: string | null;
  status: string;
  related_request_id: string | null;
  related_partner_id: string | null;
  auto_type: string | null;
  auto_entity_id: string | null;
  created_at: string;
}

// Deep link config per auto_type
const autoTypeActionConfig: Record<string, {
  getLink: (todo: AdminTodo) => string;
  linkLabel: string;
}> = {
  partner_reminder: {
    getLink: (t) => t.related_request_id ? `/admin/aanvragen/${t.related_request_id}` : "/admin/projecten",
    linkLabel: "Bekijk aanvraag",
  },
  quote_review: {
    getLink: (t) => t.related_request_id ? `/admin/logies/${t.related_request_id}` : "/admin/logies",
    linkLabel: "Bekijk offerte",
  },
  quote_pending_partner: {
    getLink: (t) => t.related_partner_id ? `/admin/partners/${t.related_partner_id}` : "/admin/partners",
    linkLabel: "Bekijk partner",
  },
  quote_pending_customer: {
    getLink: (t) => t.related_request_id ? `/admin/aanvragen/${t.related_request_id}` : "/admin/projecten",
    linkLabel: "Bekijk project",
  },
  commission_pending: {
    getLink: () => "/admin/commissies",
    linkLabel: "Bekijk commissies",
  },
  terms_reminder: {
    getLink: (t) => t.related_request_id ? `/admin/aanvragen/${t.related_request_id}` : "/admin/projecten",
    linkLabel: "Bekijk project",
  },
  invoicing_ready: {
    getLink: () => "/admin/facturatie",
    linkLabel: "Naar facturatie",
  },
  availability_conflict: {
    getLink: (t) => t.related_partner_id ? `/admin/partners/${t.related_partner_id}` : "/admin/partners",
    linkLabel: "Bekijk partner",
  },
  request_no_response: {
    getLink: (t) => t.related_request_id ? `/admin/aanvragen/${t.related_request_id}` : "/admin/projecten",
    linkLabel: "Bekijk aanvraag",
  },
  all_partners_responded: {
    getLink: (t) => t.related_request_id ? `/admin/aanvragen/${t.related_request_id}` : "/admin/projecten",
    linkLabel: "Bekijk project",
  },
  new_request_received: {
    getLink: (t) => t.related_request_id ? `/admin/aanvragen/${t.related_request_id}` : "/admin/projecten",
    linkLabel: "Bekijk aanvraag",
  },
  quote_ready_to_send: {
    getLink: (t) => t.related_request_id ? `/admin/aanvragen/${t.related_request_id}` : "/admin/projecten",
    linkLabel: "Verstuur offerte",
  },
  send_items_to_partners: {
    getLink: (t) => t.related_request_id ? `/admin/aanvragen/${t.related_request_id}` : "/admin/projecten",
    linkLabel: "Naar partners sturen",
  },
  partner_status_update: {
    getLink: (t) => t.related_request_id ? `/admin/aanvragen/${t.related_request_id}` : "/admin/projecten",
    linkLabel: "Beoordeel reactie",
  },
  forward_accommodation_quote: {
    getLink: (t) => t.related_request_id ? `/admin/logies/${t.related_request_id}` : "/admin/logies",
    linkLabel: "Doorsturen",
  },
  quote_expiring_soon: {
    getLink: (t) => t.related_request_id ? `/admin/aanvragen/${t.related_request_id}` : "/admin/projecten",
    linkLabel: "Bekijk offerte",
  },
  customer_counter_proposal: {
    getLink: (t) => t.related_request_id ? `/admin/aanvragen/${t.related_request_id}` : "/admin/projecten",
    linkLabel: "Beoordeel",
  },
  bureau_item_pricing: {
    getLink: (t) => t.related_request_id ? `/admin/aanvragen/${t.related_request_id}` : "/admin/projecten",
    linkLabel: "Prijs invullen",
  },
  post_execution_feedback: {
    getLink: (t) => t.related_request_id ? `/admin/aanvragen/${t.related_request_id}` : "/admin/projecten",
    linkLabel: "Bekijk project",
  },
  post_execution_invoice_check: {
    getLink: (t) => t.related_request_id ? `/admin/aanvragen/${t.related_request_id}` : "/admin/projecten",
    linkLabel: "Bekijk factuur",
  },
  accommodation_selected: {
    getLink: (t) => t.related_request_id ? `/admin/logies/${t.related_request_id}` : "/admin/logies",
    linkLabel: "Bevestig logies",
  },
  accommodation_quote_declined: {
    getLink: (t) => t.related_request_id ? `/admin/logies/${t.related_request_id}` : "/admin/logies",
    linkLabel: "Bekijk logies",
  },
  quote_expired_partner: {
    getLink: (t) => t.related_request_id ? `/admin/logies/${t.related_request_id}` : "/admin/logies",
    linkLabel: "Bekijk logies",
  },
};

export const DashboardTodoWidget = () => {
  const [todos, setTodos] = useState<AdminTodo[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchTodos = async () => {
    const today = new Date().toISOString().split("T")[0];
    const { data, error } = await supabase
      .from("admin_todos")
      .select("id, title, priority, due_date, status, related_request_id, related_partner_id, auto_type, auto_entity_id, created_at")
      .in("status", ["todo", "in_progress"])
      .or(`snoozed_until.is.null,snoozed_until.lte.${today}`)
      .order("priority", { ascending: true })
      .order("created_at", { ascending: false })
      .limit(10);

    if (!error && data) {
      setTodos(data);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    fetchTodos();
  }, []);

  const handleComplete = async (id: string) => {
    const { error } = await supabase
      .from("admin_todos")
      .update({ status: "done", completed_at: new Date().toISOString() })
      .eq("id", id);

    if (error) {
      toast.error("Kon todo niet afvinken");
    } else {
      setTodos((prev) => prev.filter((t) => t.id !== id));
      toast.success("Todo afgerond");
    }
  };

  const priorityColor: Record<string, string> = {
    urgent: "border-l-red-500",
    high: "border-l-orange-500",
    normal: "border-l-blue-400",
    low: "border-l-slate-300",
  };

  if (isLoading) return null;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <ClipboardList className="h-5 w-5" />
            Werklijst
            {todos.length > 0 && (
              <Badge variant="secondary" className="ml-1 text-xs">
                {todos.length}
              </Badge>
            )}
          </CardTitle>
          <Button variant="ghost" size="sm" asChild>
            <Link to="/admin/todos" className="gap-1">
              Alle taken <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {todos.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">
            🎉 Geen openstaande taken
          </p>
        ) : (
          <div className="space-y-1.5">
            {todos.map((todo) => {
              const typeConfig = todo.auto_type
                ? autoTodoTypeConfig[todo.auto_type as AutoTodoType]
                : null;
              const actionConfig = todo.auto_type
                ? autoTypeActionConfig[todo.auto_type]
                : null;
              const actionLink = actionConfig?.getLink(todo);

              return (
                <div
                  key={todo.id}
                  className={`flex items-start gap-3 p-2.5 rounded-lg border-l-4 bg-card hover:bg-muted/50 transition-colors ${
                    priorityColor[todo.priority] || priorityColor.normal
                  }`}
                >
                  <Checkbox
                    className="mt-0.5"
                    onCheckedChange={() => handleComplete(todo.id)}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 mb-0.5 flex-wrap">
                      {typeConfig && (
                        <span className={`text-[10px] font-medium px-1.5 py-0 rounded ${typeConfig.bgColor} ${typeConfig.color}`}>
                          {typeConfig.label}
                        </span>
                      )}
                      <span className="text-[10px] text-muted-foreground">
                        {formatDistanceToNow(new Date(todo.created_at), { addSuffix: true, locale: nl })}
                      </span>
                    </div>
                    <p className="text-sm font-medium leading-tight">{todo.title}</p>
                    {todo.due_date && (
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Deadline: {new Date(todo.due_date).toLocaleDateString("nl-NL", { weekday: "short", day: "numeric", month: "short" })}
                      </p>
                    )}
                  </div>
                  {actionLink && (
                    <Button variant="ghost" size="sm" className="h-7 px-2 text-xs flex-shrink-0" asChild>
                      <Link to={actionLink}>
                        <ExternalLink className="h-3 w-3 mr-1" />
                        {actionConfig?.linkLabel || "Afhandelen"}
                      </Link>
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
