import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ListTodo, Check, X, ExternalLink, ArrowRightLeft, Archive, Layers, ServerCog, Trash2, HeartPulse } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { CommissionExemptDialog } from "@/components/admin/CommissionExemptDialog";
import { isSystemTodo, looseGroupKey } from "@/lib/inboxAssemble";
import { useInboxTodoActions } from "@/hooks/useInboxTodoActions";

interface LinkableInvoice {
  id: string;
  partner_id: string | null;
  partner_name?: string | null;
  invoice_number: string | null;
  invoice_date: string | null;
  amount_incl_vat: number | null;
  request_id?: string | null;
}

interface TodoRow {
  id: string;
  title: string;
  description: string | null;
  priority: "low" | "normal" | "high" | "urgent";
  due_date: string | null;
  auto_type: string | null;
  auto_entity_id: string | null;
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
  const [exemptOpen, setExemptOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<string[] | null>(null);
  const { run } = useInboxTodoActions({ onResolved: () => onResolved?.() });

  const { data: todo, isLoading } = useQuery<TodoRow | null>({
    queryKey: ["werkbank-orphan-todo", todoId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("admin_todos")
        .select("id, title, description, priority, due_date, auto_type, auto_entity_id, related_partner_id, related_request_id, created_at")
        .eq("id", todoId)
        .maybeSingle();
      if (error) throw error;
      return (data ?? null) as TodoRow | null;
    },
  });

  // Identieke losse auto-taken (zelfde soort + titel) — de inbox vouwt die
  // samen tot één rij; hier tonen we ze allemaal zodat je ze in één keer
  // kunt afhandelen.
  const { data: siblings = [] } = useQuery<TodoRow[]>({
    queryKey: ["werkbank-orphan-todo", todoId, "group"],
    enabled: !!todo?.auto_type,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("admin_todos")
        .select("id, title, description, priority, due_date, auto_type, auto_entity_id, related_partner_id, related_request_id, created_at")
        .eq("auto_type", todo!.auto_type!)
        .is("related_request_id", null)
        .not("status", "in", "(done,dismissed)")
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      const key = looseGroupKey(todo!);
      return ((data ?? []) as TodoRow[]).filter((t) => looseGroupKey(t) === key);
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

  const isUnlinkedInvoiceTodo = todo?.auto_type === "commission_unlinked_invoice" && !!todo?.auto_entity_id;

  const { data: invoice } = useQuery<LinkableInvoice | null>({
    queryKey: ["werkbank-orphan-todo-invoice", todo?.auto_entity_id],
    enabled: !!isUnlinkedInvoiceTodo,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("partner_purchase_invoices")
        .select("id, partner_id, invoice_number, invoice_date, amount_incl_vat, request_id, partners(name)")
        .eq("id", todo!.auto_entity_id!)
        .maybeSingle();
      if (error) throw error;
      if (!data) return null;
      const row = data as any;
      return {
        id: row.id,
        partner_id: row.partner_id,
        partner_name: row.partners?.name ?? null,
        invoice_number: row.invoice_number,
        invoice_date: row.invoice_date,
        amount_incl_vat:
          row.amount_incl_vat !== null && row.amount_incl_vat !== undefined
            ? Number(row.amount_incl_vat)
            : null,
        request_id: row.request_id,
      } satisfies LinkableInvoice;
    },
  });

  const refreshAll = () => {
    queryClient.invalidateQueries({ queryKey: ["werkbank-inbox"] });
    queryClient.invalidateQueries({ queryKey: ["werkbank-orphan-todo", todoId] });
  };

  if (isLoading) {
    return <div className="p-6 text-sm text-muted-foreground">Laden…</div>;
  }
  if (!todo) {
    return <div className="p-6 text-sm text-muted-foreground">Taak niet meer gevonden.</div>;
  }

  const system = isSystemTodo(todo);
  const groupIds = siblings.length > 1 ? siblings.map((s) => s.id) : [todo.id];
  const groupCount = groupIds.length;
  const isAuto = !!todo.auto_type;

  return (
    <div className="space-y-4 p-4">
      <div>
        <div className="flex items-center gap-1.5 text-xs uppercase tracking-wide text-muted-foreground">
          {system ? <ServerCog className="h-3.5 w-3.5" /> : null}
          {system ? "Systeemmelding" : "Losse taak"}
        </div>
        <h2 className="mt-1 text-xl font-semibold leading-snug">{todo.title}</h2>
        <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <Badge variant="outline">Prio: {todo.priority}</Badge>
          {todo.auto_type && <Badge variant="secondary">{todo.auto_type}</Badge>}
          {todo.due_date && <span>Deadline {todo.due_date}</span>}
          <span>Aangemaakt {new Date(todo.created_at).toLocaleDateString("nl-NL")}</span>
        </div>
      </div>

      {system && (
        <Card className="border-sky-200 bg-sky-50/60">
          <CardContent className="flex flex-wrap items-center justify-between gap-3 py-3 text-sm">
            <div className="min-w-0">
              <div className="font-medium">Dit is een melding van de dagelijkse zelftest.</div>
              <div className="text-xs text-muted-foreground">
                De taak wordt automatisch afgerond zodra de zelftest weer slaagt. Bekijk de details en herstelhints op Email health.
              </div>
            </div>
            <Button size="sm" variant="outline" className="gap-1 bg-white" onClick={() => navigate("/admin/email-health")}>
              <HeartPulse className="h-3.5 w-3.5" /> Bekijk zelftest
            </Button>
          </CardContent>
        </Card>
      )}

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

          {isUnlinkedInvoiceTodo && invoice && (
            <div className="rounded-md border bg-background px-3 py-2 text-sm">
              <div className="text-xs uppercase text-muted-foreground">Inkoopfactuur</div>
              <div className="font-medium">
                {invoice.invoice_number || "zonder nummer"}
                {invoice.amount_incl_vat !== null && (
                  <span className="ml-2 text-xs text-muted-foreground tabular-nums">
                    {new Intl.NumberFormat("nl-NL", { style: "currency", currency: "EUR" }).format(
                      invoice.amount_incl_vat,
                    )}{" "}
                    incl. btw
                  </span>
                )}
              </div>
              <div className="mt-2 flex flex-wrap gap-2">
                {/* Doorbelasten en de verdeling voor de commissie gebeuren in het
                    werkblad op het project; zonder project eerst de regels verdelen. */}
                <Button
                  size="sm"
                  className="h-7 gap-1"
                  onClick={() =>
                    navigate(
                      invoice.request_id
                        ? `/admin/projecten/${invoice.request_id}?tab=financien`
                        : `/admin/inkoopfacturen?search=${encodeURIComponent(invoice.invoice_number ?? "")}`,
                    )
                  }
                >
                  <ArrowRightLeft className="h-3.5 w-3.5" />
                  {invoice.request_id ? "Naar werkblad Doorbelasten" : "Regels verdelen over projecten"}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 gap-1"
                  onClick={() => setExemptOpen(true)}
                >
                  <Archive className="h-3.5 w-3.5" /> Commissievrij markeren
                </Button>
              </div>
            </div>
          )}

          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="outline" className="gap-1" onClick={() => void run("done", [todo.id])}>
              <Check className="h-4 w-4" /> Opgepakt
            </Button>
            <Button size="sm" variant="ghost" className="gap-1" onClick={() => void run("dismissed", [todo.id])}>
              <X className="h-4 w-4" /> Niet relevant
            </Button>
            {isAuto && groupCount === 1 && (
              <Button
                size="sm"
                variant="ghost"
                className="gap-1 text-destructive hover:text-destructive"
                onClick={() => setConfirmDelete([todo.id])}
              >
                <Trash2 className="h-4 w-4" /> Verwijderen
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {groupCount > 1 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm">
              <Layers className="h-4 w-4 text-sky-600" /> {groupCount} identieke taken
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-xs text-muted-foreground">
              Dezelfde melding is meerdere keren aangemaakt. Je kunt ze hier in één keer afhandelen.
            </p>
            <ul className="divide-y rounded-md border text-xs">
              {siblings.map((s) => (
                <li key={s.id} className={cn("flex items-center justify-between gap-2 px-3 py-1.5", s.id === todo.id && "bg-muted/50")}>
                  <span className="truncate">{s.title}</span>
                  <span className="shrink-0 text-muted-foreground">
                    {new Date(s.created_at).toLocaleDateString("nl-NL", { day: "numeric", month: "short" })}
                  </span>
                </li>
              ))}
            </ul>
            <div className="flex flex-wrap gap-2">
              <Button size="sm" className="gap-1" onClick={() => void run("done", groupIds)}>
                <Check className="h-4 w-4" /> Alles opgepakt
              </Button>
              <Button size="sm" variant="outline" className="gap-1" onClick={() => void run("dismissed", groupIds)}>
                <X className="h-4 w-4" /> Alles niet relevant
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="gap-1 text-destructive hover:text-destructive"
                onClick={() => setConfirmDelete(groupIds)}
              >
                <Trash2 className="h-4 w-4" /> Alles verwijderen
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {todo.auto_entity_id && (
        <CommissionExemptDialog
          open={exemptOpen}
          onOpenChange={setExemptOpen}
          rows={[{ type: "purchase_invoice", id: todo.auto_entity_id }]}
          onDone={() => {
            refreshAll();
            onResolved?.();
          }}
        />
      )}

      <AlertDialog open={confirmDelete !== null} onOpenChange={(o) => !o && setConfirmDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmDelete && confirmDelete.length > 1 ? `${confirmDelete.length} taken definitief verwijderen?` : "Taak definitief verwijderen?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              Dit kan niet ongedaan gemaakt worden. Komt de aanleiding terug, dan maakt het systeem de taak opnieuw aan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuleren</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={(e) => {
                e.preventDefault();
                const ids = confirmDelete ?? [];
                setConfirmDelete(null);
                void run("delete", ids);
              }}
            >
              Verwijderen
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
