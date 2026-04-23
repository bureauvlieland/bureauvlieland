import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { nl } from "date-fns/locale";
import {
  Plus,
  Search,
  MoreVertical,
  Pencil,
  Trash2,
  Circle,
  Clock,
  AlertTriangle,
  AlertCircle,
  Calendar,
  Filter,
  Loader2,
  ExternalLink,
  ChevronDown,
  CheckSquare,
  AlarmClock,
  Mail,
  Activity,
  CheckCircle2,
  XCircle,
  Send,
  User,
  RefreshCw,
  Building2,
  FileText,
  ClipboardList,
  CalendarOff,
  RotateCcw,
  Brush,
} from "lucide-react";
import { Link } from "react-router-dom";
import { Helmet } from "react-helmet";
import { autoTodoTypeConfig, type AutoTodoType } from "@/lib/autoTodoCreator";
import { ResendEmailDialog } from "@/components/admin/ResendEmailDialog";
import { TodoAgeChip } from "@/components/admin/TodoAgeChip";
import { TodoSnoozeChip } from "@/components/admin/TodoSnoozeChip";

// ─── Types ───────────────────────────────────────────────────
interface Todo {
  id: string;
  title: string;
  description: string | null;
  priority: string;
  status: string;
  due_date: string | null;
  related_request_id: string | null;
  related_partner_id: string | null;
  auto_type: string | null;
  auto_entity_id: string | null;
  snoozed_until: string | null;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
}

interface Partner {
  id: string;
  name: string;
}

interface ProgramRequest {
  id: string;
  customer_name: string;
  customer_company: string | null;
}

// ─── Config ──────────────────────────────────────────────────
const priorityConfig = {
  low: { label: "Laag", color: "bg-slate-100 text-slate-700", icon: Circle },
  normal: { label: "Normaal", color: "bg-blue-100 text-blue-700", icon: Clock },
  high: { label: "Hoog", color: "bg-orange-100 text-orange-700", icon: AlertTriangle },
  urgent: { label: "Urgent", color: "bg-red-100 text-red-700", icon: AlertCircle },
};

const statusConfig = {
  todo: { label: "Te doen", color: "bg-slate-100 text-slate-700" },
  in_progress: { label: "Bezig", color: "bg-blue-100 text-blue-700" },
  done: { label: "Klaar", color: "bg-green-100 text-green-700" },
};

// Deep link + quick action config per auto_type
const autoTypeActionConfig: Record<string, {
  getLink: (todo: Todo) => string;
  linkLabel: string;
}> = {
  partner_reminder: {
    getLink: (t) => t.related_request_id ? `/admin/aanvragen/${t.related_request_id}` : "/admin/aanvragen",
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
    getLink: (t) => t.related_request_id ? `/admin/aanvragen/${t.related_request_id}` : "/admin/aanvragen",
    linkLabel: "Bekijk project",
  },
  commission_pending: {
    getLink: () => "/admin/commissies",
    linkLabel: "Bekijk commissies",
  },
  terms_reminder: {
    getLink: (t) => t.related_request_id ? `/admin/aanvragen/${t.related_request_id}` : "/admin/aanvragen",
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
    getLink: (t) => t.related_request_id ? `/admin/aanvragen/${t.related_request_id}` : "/admin/aanvragen",
    linkLabel: "Bekijk aanvraag",
  },
  quote_expired_partner: {
    getLink: (t) => t.related_request_id ? `/admin/logies/${t.related_request_id}` : "/admin/logies",
    linkLabel: "Bekijk logies",
  },
  all_partners_responded: {
    getLink: (t) => t.related_request_id ? `/admin/aanvragen/${t.related_request_id}` : "/admin/aanvragen",
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
  customer_status_email_due: {
    getLink: (t) => t.related_request_id ? `/admin/aanvragen/${t.related_request_id}?action=status-email` : "/admin/projecten",
    linkLabel: "Stuur status-mail",
  },
  customer_status_update_due: {
    getLink: (t) => t.related_request_id ? `/admin/aanvragen/${t.related_request_id}?action=status-email` : "/admin/projecten",
    linkLabel: "Stuur status-mail",
  },
  customer_inputs_missing: {
    getLink: (t) => t.related_request_id ? `/admin/aanvragen/${t.related_request_id}?action=status-email` : "/admin/projecten",
    linkLabel: "Stuur herinnering",
  },
};

// ─── Email Log Config ─────────────────────────────────────────
const emailTypeLabels: Record<string, { label: string; category: string }> = {
  program_request_bureau: { label: "Programma aanvraag (Bureau)", category: "Programma" },
  program_request_customer: { label: "Programma aanvraag (Klant)", category: "Programma" },
  program_request_partner: { label: "Programma aanvraag (Partner)", category: "Programma" },
  quote_request_bureau: { label: "Offerte aanvraag (Bureau)", category: "Offerte" },
  quote_request_customer: { label: "Offerte aanvraag (Klant)", category: "Offerte" },
  status_confirmed: { label: "Status: Bevestigd", category: "Status" },
  status_unavailable: { label: "Status: Niet beschikbaar", category: "Status" },
  status_alternative: { label: "Status: Alternatief", category: "Status" },
  customer_program_update_partner: { label: "Programma wijziging (Partner)", category: "Wijziging" },
  cancellation_customer: { label: "Annulering (Klant)", category: "Annulering" },
  cancellation_partner: { label: "Annulering (Partner)", category: "Annulering" },
  cancellation_bureau: { label: "Annulering (Bureau)", category: "Annulering" },
  partner_invitation: { label: "Partner uitnodiging", category: "Partner" },
  accommodation_request_bureau: { label: "Logies aanvraag (Bureau)", category: "Logies" },
  accommodation_request_customer: { label: "Logies aanvraag (Klant)", category: "Logies" },
  accommodation_quote_request_partner: { label: "Logies offerteaanvraag (Partner)", category: "Logies" },
  accommodation_quote_notification: { label: "Logies offerte notificatie", category: "Logies" },
  accommodation_selected_partner: { label: "Logies gekozen (Partner)", category: "Logies" },
  accommodation_selected_customer: { label: "Logies gekozen (Klant)", category: "Logies" },
};

const emailStatusConfig: Record<string, { icon: React.ReactNode; color: string; label: string }> = {
  sent: { icon: <CheckCircle2 className="h-4 w-4" />, color: "bg-green-100 text-green-800", label: "Verzonden" },
  failed: { icon: <XCircle className="h-4 w-4" />, color: "bg-red-100 text-red-800", label: "Mislukt" },
  pending: { icon: <Clock className="h-4 w-4" />, color: "bg-amber-100 text-amber-800", label: "In wachtrij" },
};

// ─── Activity Log Config ─────────────────────────────────────
const actionLabels: Record<string, { label: string; color: string }> = {
  partner_created: { label: "Partner aangemaakt", color: "bg-green-100 text-green-800" },
  partner_updated: { label: "Partner bijgewerkt", color: "bg-blue-100 text-blue-800" },
  partner_activated: { label: "Partner geactiveerd", color: "bg-green-100 text-green-800" },
  partner_deactivated: { label: "Partner gedeactiveerd", color: "bg-red-100 text-red-800" },
  partner_invited: { label: "Partner uitgenodigd", color: "bg-purple-100 text-purple-800" },
  request_viewed: { label: "Aanvraag bekeken", color: "bg-slate-100 text-slate-800" },
  request_status_changed: { label: "Aanvraag status gewijzigd", color: "bg-amber-100 text-amber-800" },
  request_cancelled: { label: "Aanvraag geannuleerd", color: "bg-red-100 text-red-800" },
  item_status_changed: { label: "Item status gewijzigd", color: "bg-amber-100 text-amber-800" },
  item_commission_updated: { label: "Commissie bijgewerkt", color: "bg-blue-100 text-blue-800" },
  todo_created: { label: "Todo aangemaakt", color: "bg-green-100 text-green-800" },
  todo_updated: { label: "Todo bijgewerkt", color: "bg-blue-100 text-blue-800" },
  todo_deleted: { label: "Todo verwijderd", color: "bg-red-100 text-red-800" },
  todo_completed: { label: "Todo afgerond", color: "bg-green-100 text-green-800" },
  admin_login: { label: "Admin ingelogd", color: "bg-slate-100 text-slate-800" },
  admin_logout: { label: "Admin uitgelogd", color: "bg-slate-100 text-slate-800" },
  unavailability_created: { label: "Blokkering toegevoegd", color: "bg-orange-100 text-orange-800" },
  unavailability_updated: { label: "Blokkering bijgewerkt", color: "bg-orange-100 text-orange-800" },
  unavailability_deleted: { label: "Blokkering verwijderd", color: "bg-orange-100 text-orange-800" },
};

const entityIcons: Record<string, React.ReactNode> = {
  partner: <Building2 className="h-4 w-4" />,
  program_request: <FileText className="h-4 w-4" />,
  program_request_item: <FileText className="h-4 w-4" />,
  admin_todo: <ClipboardList className="h-4 w-4" />,
  user: <User className="h-4 w-4" />,
  partner_unavailability: <CalendarOff className="h-4 w-4" />,
};

// ─── Taken Tab ───────────────────────────────────────────────
type TakenView = "list" | "project";

const TakenTab = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [viewMode, setViewMode] = useState<TakenView>("list");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("active");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTodo, setEditingTodo] = useState<Todo | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [snoozeDialogTodo, setSnoozeDialogTodo] = useState<Todo | null>(null);
  const [snoozeDate, setSnoozeDate] = useState("");
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    priority: "normal",
    status: "todo",
    due_date: "",
    related_request_id: "",
    related_partner_id: "",
  });

  const today = new Date().toISOString().split("T")[0];

  const { data: todos = [], isLoading } = useQuery({
    queryKey: ["admin-todos", statusFilter, priorityFilter],
    queryFn: async () => {
      let query = supabase
        .from("admin_todos")
        .select("*")
        .order("created_at", { ascending: false });

      if (statusFilter === "active") {
        query = query.in("status", ["todo", "in_progress"]);
      } else if (statusFilter !== "all") {
        query = query.eq("status", statusFilter);
      }

      if (priorityFilter !== "all") {
        query = query.eq("priority", priorityFilter);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as Todo[];
    },
  });

  const { data: partners = [] } = useQuery({
    queryKey: ["admin-partners-list"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("partners")
        .select("id, name")
        .eq("is_active", true)
        .order("name");
      if (error) throw error;
      return data as Partner[];
    },
  });

  const { data: requests = [] } = useQuery({
    queryKey: ["admin-requests-list"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("program_requests")
        .select("id, customer_name, customer_company")
        .eq("status", "active")
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data as ProgramRequest[];
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (data: typeof formData & { id?: string }) => {
      const payload = {
        title: data.title,
        description: data.description || null,
        priority: data.priority,
        status: data.status,
        due_date: data.due_date || null,
        related_request_id: data.related_request_id || null,
        related_partner_id: data.related_partner_id || null,
        completed_at: data.status === "done" ? new Date().toISOString() : null,
      };
      if (data.id) {
        const { error } = await supabase.from("admin_todos").update(payload).eq("id", data.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("admin_todos").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-todos"] });
      queryClient.invalidateQueries({ queryKey: ["admin-todo-count"] });
      toast({ title: editingTodo ? "Taak bijgewerkt" : "Taak aangemaakt" });
      handleCloseDialog();
    },
    onError: (error) => {
      toast({ title: "Fout", description: error.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("admin_todos").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-todos"] });
      queryClient.invalidateQueries({ queryKey: ["admin-todo-count"] });
      toast({ title: "Taak verwijderd" });
    },
  });

  const toggleStatusMutation = useMutation({
    mutationFn: async ({ id, newStatus }: { id: string; newStatus: string }) => {
      const { error } = await supabase
        .from("admin_todos")
        .update({
          status: newStatus,
          completed_at: newStatus === "done" ? new Date().toISOString() : null,
        })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-todos"] });
      queryClient.invalidateQueries({ queryKey: ["admin-todo-count"] });
    },
  });

  const bulkDoneMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      const { error } = await supabase
        .from("admin_todos")
        .update({ status: "done", completed_at: new Date().toISOString() })
        .in("id", ids);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-todos"] });
      queryClient.invalidateQueries({ queryKey: ["admin-todo-count"] });
      setSelectedIds(new Set());
      toast({ title: `${selectedIds.size} taken afgerond` });
    },
  });

  const snoozeMutation = useMutation({
    mutationFn: async ({ id, until }: { id: string; until: string }) => {
      const { error } = await supabase
        .from("admin_todos")
        .update({ snoozed_until: until })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-todos"] });
      queryClient.invalidateQueries({ queryKey: ["admin-todo-count"] });
      setSnoozeDialogTodo(null);
      setSnoozeDate("");
      toast({ title: "Taak gesnoozed" });
    },
  });

  // Cleanup stale todos
  const [showCleanupConfirm, setShowCleanupConfirm] = useState(false);
  const cleanupMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("cleanup-stale-todos");
      if (error) throw error;
      return data as { cleaned: number; details: Record<string, number> };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["admin-todos"] });
      queryClient.invalidateQueries({ queryKey: ["admin-todo-count"] });
      setShowCleanupConfirm(false);
      toast({
        title: `${data.cleaned} taken opgeschoond`,
        description: data.cleaned === 0
          ? "Alle taken zijn al up-to-date."
          : "Verouderde taken zijn op 'klaar' gezet.",
      });
    },
    onError: (err: any) => {
      toast({ title: "Fout bij opschonen", description: err.message, variant: "destructive" });
    },
  });

  const handleOpenDialog = (todo?: Todo) => {
    if (todo) {
      setEditingTodo(todo);
      setFormData({
        title: todo.title,
        description: todo.description || "",
        priority: todo.priority,
        status: todo.status,
        due_date: todo.due_date || "",
        related_request_id: todo.related_request_id || "",
        related_partner_id: todo.related_partner_id || "",
      });
    } else {
      setEditingTodo(null);
      setFormData({ title: "", description: "", priority: "normal", status: "todo", due_date: "", related_request_id: "", related_partner_id: "" });
    }
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingTodo(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    saveMutation.mutate({ ...formData, id: editingTodo?.id });
  };

  // Filter: hide snoozed todos (unless showing all/done)
  const visibleTodos = useMemo(() => {
    return todos.filter((todo) => {
      // Hide snoozed for active view
      if (statusFilter === "active" && todo.snoozed_until && todo.snoozed_until > today) {
        return false;
      }
      // Search
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        return todo.title.toLowerCase().includes(q) || todo.description?.toLowerCase().includes(q);
      }
      return true;
    });
  }, [todos, searchQuery, statusFilter, today]);

  // Group by auto_type
  const groupedTodos = useMemo(() => {
    const groups: Record<string, Todo[]> = { manual: [] };
    for (const todo of visibleTodos) {
      const key = todo.auto_type || "manual";
      if (!groups[key]) groups[key] = [];
      groups[key].push(todo);
    }
    return groups;
  }, [visibleTodos]);

  // Group by project (related_request_id)
  const projectGroupedTodos = useMemo(() => {
    const groups: Record<string, Todo[]> = {};
    for (const todo of visibleTodos) {
      const key = todo.related_request_id || "__no_project";
      if (!groups[key]) groups[key] = [];
      groups[key].push(todo);
    }
    // Sort: projects with most urgent/high priority todos first
    const priorityWeight: Record<string, number> = { urgent: 0, high: 1, normal: 2, low: 3 };
    return Object.entries(groups).sort(([, a], [, b]) => {
      const aMin = Math.min(...a.map(t => priorityWeight[t.priority] ?? 2));
      const bMin = Math.min(...b.map(t => priorityWeight[t.priority] ?? 2));
      return aMin - bMin;
    });
  }, [visibleTodos]);

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const getLinkedPartnerName = (partnerId: string | null) => {
    if (!partnerId) return null;
    return partners.find((p) => p.id === partnerId)?.name;
  };

  const getLinkedRequestLabel = (requestId: string | null) => {
    if (!requestId) return null;
    const request = requests.find((r) => r.id === requestId);
    if (!request) return requestId.slice(0, 8);
    return request.customer_company || request.customer_name;
  };

  const renderTodoItem = (todo: Todo) => {
    const priority = priorityConfig[todo.priority as keyof typeof priorityConfig] || priorityConfig.normal;
    const _status = statusConfig[todo.status as keyof typeof statusConfig] || statusConfig.todo;
    const PriorityIcon = priority.icon;
    const linkedPartner = getLinkedPartnerName(todo.related_partner_id);
    const linkedRequest = getLinkedRequestLabel(todo.related_request_id);
    const isOverdue = todo.due_date && new Date(todo.due_date) < new Date() && todo.status !== "done";
    const isSnoozed = todo.snoozed_until && todo.snoozed_until > today;
    const actionConfig = todo.auto_type ? autoTypeActionConfig[todo.auto_type] : null;

    return (
      <div
        key={todo.id}
        className={`flex items-center gap-2 py-2 px-3 hover:bg-slate-50 transition-colors ${
          todo.status === "done" ? "opacity-60" : ""
        } ${isSnoozed ? "opacity-50" : ""}`}
      >
        <Checkbox
          checked={todo.status === "done"}
          onCheckedChange={(checked) => {
            toggleStatusMutation.mutate({ id: todo.id, newStatus: checked ? "done" : "todo" });
          }}
          className="shrink-0"
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <PriorityIcon className={`h-3 w-3 shrink-0 ${priority.color.split(" ")[1]}`} />
            <span className={`text-sm font-medium truncate ${todo.status === "done" ? "line-through text-muted-foreground" : ""}`}>
              {todo.title}
            </span>
            {isSnoozed && (
              <Badge variant="outline" className="bg-purple-50 text-purple-700 text-[10px] px-1.5 py-0">
                <AlarmClock className="h-2.5 w-2.5 mr-0.5" />
                {format(new Date(todo.snoozed_until!), "d MMM", { locale: nl })}
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2 mt-0.5 text-[11px] text-muted-foreground flex-wrap">
            {todo.description && (
              <span className="line-clamp-1">{todo.description}</span>
            )}
            <TodoAgeChip createdAt={todo.created_at} />
            {todo.snoozed_until && todo.snoozed_until > today && (
              <TodoSnoozeChip snoozedUntil={todo.snoozed_until} snoozedAt={todo.updated_at} />
            )}
            {todo.due_date && (
              <span className={`flex items-center gap-0.5 shrink-0 ${isOverdue ? "text-red-600 font-medium" : ""}`}>
                <Calendar className="h-2.5 w-2.5" />
                {format(new Date(todo.due_date), "d MMM", { locale: nl })}
                {isOverdue && " ⚠"}
              </span>
            )}
            {linkedPartner && todo.related_partner_id && (
              <Link
                to={`/admin/partners/${todo.related_partner_id}`}
                className="flex items-center gap-0.5 hover:text-primary text-blue-600 shrink-0"
              >
                <Building2 className="h-2.5 w-2.5" />
                {linkedPartner}
              </Link>
            )}
            {linkedRequest && todo.related_request_id && (
              <Link
                to={`/admin/aanvragen/${todo.related_request_id}`}
                className="flex items-center gap-0.5 hover:text-primary text-blue-600 shrink-0"
              >
                <FileText className="h-2.5 w-2.5" />
                {linkedRequest}
              </Link>
            )}
          </div>
        </div>

        {actionConfig && todo.status !== "done" && (
          <Link to={actionConfig.getLink(todo)} className="shrink-0">
            <Button variant="outline" size="sm" className="h-7 gap-1 text-[11px] px-2 whitespace-nowrap">
              <ExternalLink className="h-3 w-3" />
              {actionConfig.linkLabel}
            </Button>
          </Link>
        )}

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0">
              <MoreVertical className="h-3.5 w-3.5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => handleOpenDialog(todo)}>
              <Pencil className="h-4 w-4 mr-2" />
              Bewerken
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => {
                const d = new Date(Date.now() + 86400000).toISOString().split("T")[0];
                snoozeMutation.mutate({ id: todo.id, until: d });
              }}
            >
              <AlarmClock className="h-4 w-4 mr-2" />
              Snooze 1 dag
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => {
                const d = new Date(Date.now() + 3 * 86400000).toISOString().split("T")[0];
                snoozeMutation.mutate({ id: todo.id, until: d });
              }}
            >
              <AlarmClock className="h-4 w-4 mr-2" />
              Snooze 3 dagen
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => {
                const d = new Date(Date.now() + 7 * 86400000).toISOString().split("T")[0];
                snoozeMutation.mutate({ id: todo.id, until: d });
              }}
            >
              <AlarmClock className="h-4 w-4 mr-2" />
              Snooze 1 week
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => { setSnoozeDialogTodo(todo); setSnoozeDate(""); }}>
              <Calendar className="h-4 w-4 mr-2" />
              Kies datum…
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => {
                if (confirm("Weet je zeker dat je deze taak wilt verwijderen?")) {
                  deleteMutation.mutate(todo.id);
                }
              }}
              className="text-red-600"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Verwijderen
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    );
  };

  const groupLabels: Record<string, string> = {
    manual: "Handmatige taken",
    ...Object.fromEntries(
      Object.entries(autoTodoTypeConfig).map(([key, config]) => [key, config.label])
    ),
  };

  // Build groupOrder including any unknown auto_types as fallback
  const knownKeys = new Set(["manual", ...Object.keys(autoTodoTypeConfig)]);
  const extraKeys = Object.keys(groupedTodos).filter((k) => !knownKeys.has(k));
  const groupOrder = ["manual", ...Object.keys(autoTodoTypeConfig), ...extraKeys];

  return (
    <>
      <div className="space-y-4">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">
              {visibleTodos.filter((t) => t.status !== "done").length} openstaande taken
            </h2>
          </div>
          <div className="flex gap-2">
            {/* View toggle */}
            <div className="flex border rounded-md overflow-hidden">
              <Button
                variant={viewMode === "list" ? "default" : "ghost"}
                size="sm"
                onClick={() => setViewMode("list")}
                className="rounded-none text-xs"
              >
                <ClipboardList className="h-3.5 w-3.5 mr-1" />
                Lijst
              </Button>
              <Button
                variant={viewMode === "project" ? "default" : "ghost"}
                size="sm"
                onClick={() => setViewMode("project")}
                className="rounded-none text-xs"
              >
                <FileText className="h-3.5 w-3.5 mr-1" />
                Per project
              </Button>
            </div>
            {selectedIds.size > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => bulkDoneMutation.mutate(Array.from(selectedIds))}
                disabled={bulkDoneMutation.isPending}
              >
                <CheckSquare className="h-4 w-4 mr-1" />
                {selectedIds.size} afvinken
              </Button>
            )}
            <Button
              size="sm"
              variant="outline"
              onClick={() => setShowCleanupConfirm(true)}
              disabled={cleanupMutation.isPending}
              className="gap-2"
            >
              {cleanupMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Brush className="h-4 w-4" />
              )}
              Opschonen
            </Button>
            <Button size="sm" onClick={() => handleOpenDialog()} className="gap-2">
              <Plus className="h-4 w-4" />
              Nieuwe taak
            </Button>
          </div>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Zoeken..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[160px]">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Actief</SelectItem>
                  <SelectItem value="all">Alles</SelectItem>
                  <SelectItem value="todo">Te doen</SelectItem>
                  <SelectItem value="in_progress">Bezig</SelectItem>
                  <SelectItem value="done">Klaar</SelectItem>
                </SelectContent>
              </Select>
              <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                <SelectTrigger className="w-[160px]">
                  <SelectValue placeholder="Prioriteit" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Alle prioriteiten</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                  <SelectItem value="high">Hoog</SelectItem>
                  <SelectItem value="normal">Normaal</SelectItem>
                  <SelectItem value="low">Laag</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Todo List */}
        {isLoading ? (
          <Card>
            <CardContent className="py-12 flex items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </CardContent>
          </Card>
        ) : visibleTodos.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              Geen taken gevonden
            </CardContent>
          </Card>
        ) : viewMode === "project" ? (
          /* Per-project grouped view */
          projectGroupedTodos.map(([requestId, todos]) => {
            const projectLabel = requestId === "__no_project"
              ? "Niet gekoppeld aan project"
              : getLinkedRequestLabel(requestId) || requestId.slice(0, 8);

            return (
              <Collapsible key={requestId} defaultOpen>
                <Card>
                  <CollapsibleTrigger className="w-full">
                    <CardHeader className="py-2 px-3 cursor-pointer hover:bg-muted/50 transition-colors">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-xs font-medium flex items-center gap-2">
                          <ChevronDown className="h-3.5 w-3.5 transition-transform" />
                          <FileText className="h-3.5 w-3.5 text-muted-foreground" />
                          {projectLabel}
                          <Badge variant="secondary" className="ml-1 text-[10px]">{todos.length}</Badge>
                        </CardTitle>
                        {requestId !== "__no_project" && (
                          <Link
                            to={`/admin/aanvragen/${requestId}`}
                            className="text-xs text-primary hover:underline"
                            onClick={(e) => e.stopPropagation()}
                          >
                            Open project →
                          </Link>
                        )}
                      </div>
                    </CardHeader>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <CardContent className="p-0">
                      <div className="divide-y">
                        {todos.map(renderTodoItem)}
                      </div>
                    </CardContent>
                  </CollapsibleContent>
                </Card>
              </Collapsible>
            );
          })
        ) : (
          /* Standard grouped-by-type view */
          groupOrder
            .filter((key) => groupedTodos[key]?.length > 0)
            .map((groupKey) => (
              <Collapsible key={groupKey} defaultOpen>
                <Card>
                  <CollapsibleTrigger className="w-full">
                    <CardHeader className="py-2 px-3 cursor-pointer hover:bg-muted/50 transition-colors">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-xs font-medium flex items-center gap-2">
                          <ChevronDown className="h-3.5 w-3.5 transition-transform" />
                          {groupLabels[groupKey] || groupKey}
                          <Badge variant="secondary" className="ml-1 text-[10px]">{groupedTodos[groupKey].length}</Badge>
                        </CardTitle>
                      </div>
                    </CardHeader>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <CardContent className="p-0">
                      <div className="divide-y">
                        {groupedTodos[groupKey].map(renderTodoItem)}
                      </div>
                    </CardContent>
                  </CollapsibleContent>
                </Card>
              </Collapsible>
            ))
        )}
      </div>

      {/* Create/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingTodo ? "Taak bewerken" : "Nieuwe taak"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">Titel *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Wat moet er gebeuren?"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Beschrijving</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Extra details..."
                rows={3}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Prioriteit</Label>
                <Select value={formData.priority} onValueChange={(v) => setFormData({ ...formData, priority: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Laag</SelectItem>
                    <SelectItem value="normal">Normaal</SelectItem>
                    <SelectItem value="high">Hoog</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={formData.status} onValueChange={(v) => setFormData({ ...formData, status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todo">Te doen</SelectItem>
                    <SelectItem value="in_progress">Bezig</SelectItem>
                    <SelectItem value="done">Klaar</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="due_date">Deadline</Label>
              <Input
                id="due_date"
                type="date"
                value={formData.due_date}
                onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Koppel aan aanvraag</Label>
              <Select
                value={formData.related_request_id}
                onValueChange={(v) => setFormData({ ...formData, related_request_id: v === "none" ? "" : v })}
              >
                <SelectTrigger><SelectValue placeholder="Geen koppeling" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Geen koppeling</SelectItem>
                  {requests.map((req) => (
                    <SelectItem key={req.id} value={req.id}>
                      {req.customer_company || req.customer_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Koppel aan partner</Label>
              <Select
                value={formData.related_partner_id}
                onValueChange={(v) => setFormData({ ...formData, related_partner_id: v === "none" ? "" : v })}
              >
                <SelectTrigger><SelectValue placeholder="Geen koppeling" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Geen koppeling</SelectItem>
                  {partners.map((partner) => (
                    <SelectItem key={partner.id} value={partner.id}>
                      {partner.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleCloseDialog}>Annuleren</Button>
              <Button type="submit" disabled={saveMutation.isPending}>
                {saveMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                {editingTodo ? "Opslaan" : "Aanmaken"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Snooze Dialog */}
      <Dialog open={!!snoozeDialogTodo} onOpenChange={() => setSnoozeDialogTodo(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Taak snoozen</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Verberg deze taak tot een gekozen datum.
            </p>
            <div className="space-y-2">
              <Label>Snooze tot</Label>
              <Input
                type="date"
                value={snoozeDate}
                onChange={(e) => setSnoozeDate(e.target.value)}
                min={new Date(Date.now() + 86400000).toISOString().split("T")[0]}
              />
            </div>
            <div className="flex gap-2">
              {[1, 3, 7].map((days) => {
                const d = new Date(Date.now() + days * 86400000);
                return (
                  <Button
                    key={days}
                    variant="outline"
                    size="sm"
                    onClick={() => setSnoozeDate(d.toISOString().split("T")[0])}
                  >
                    {days === 1 ? "Morgen" : `${days} dagen`}
                  </Button>
                );
              })}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSnoozeDialogTodo(null)}>Annuleren</Button>
            <Button
              disabled={!snoozeDate || snoozeMutation.isPending}
              onClick={() => {
                if (snoozeDialogTodo && snoozeDate) {
                  snoozeMutation.mutate({ id: snoozeDialogTodo.id, until: snoozeDate });
                }
              }}
            >
              {snoozeMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Snooze
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Cleanup Confirmation Dialog */}
      <Dialog open={showCleanupConfirm} onOpenChange={setShowCleanupConfirm}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Verouderde taken opschonen</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Dit ruimt alle taken op die niet meer relevant zijn: geannuleerde of afgeronde projecten, 
            reeds verwerkte offertes en verouderde herinneringen. Wil je doorgaan?
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCleanupConfirm(false)}>Annuleren</Button>
            <Button
              onClick={() => cleanupMutation.mutate()}
              disabled={cleanupMutation.isPending}
            >
              {cleanupMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Opschonen
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

// ─── E-maillog Tab ───────────────────────────────────────────
interface EmailLog {
  id: string;
  email_type: string;
  subject: string;
  recipient_email: string;
  recipient_name: string | null;
  related_request_id: string | null;
  related_accommodation_id: string | null;
  related_partner_id: string | null;
  related_item_id: string | null;
  status: string;
  error_message: string | null;
  sent_by: string | null;
  created_at: string;
  sent_at: string | null;
}

const EmailLogTab = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [emailStatusFilter, setEmailStatusFilter] = useState<string>("all");
  const [resendDialogOpen, setResendDialogOpen] = useState(false);
  const [selectedEmail, setSelectedEmail] = useState<EmailLog | null>(null);

  const { data: emails = [], isLoading, refetch, isRefetching } = useQuery({
    queryKey: ["admin-email-logs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("email_log")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(500);
      if (error) throw error;
      return data as EmailLog[];
    },
  });

  const filteredEmails = useMemo(() => {
    return emails.filter((email) => {
      if (typeFilter !== "all" && email.email_type !== typeFilter) return false;
      if (emailStatusFilter !== "all" && email.status !== emailStatusFilter) return false;
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const typeLabel = emailTypeLabels[email.email_type]?.label.toLowerCase() || email.email_type.toLowerCase();
        return (
          email.subject.toLowerCase().includes(query) ||
          email.recipient_email.toLowerCase().includes(query) ||
          (email.recipient_name?.toLowerCase().includes(query) ?? false) ||
          typeLabel.includes(query)
        );
      }
      return true;
    });
  }, [emails, typeFilter, emailStatusFilter, searchQuery]);

  const stats = useMemo(() => {
    const now = new Date();
    const todayDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    return {
      total: emails.length,
      sent: emails.filter((e) => e.status === "sent").length,
      failed: emails.filter((e) => e.status === "failed").length,
      today: emails.filter((e) => new Date(e.created_at) >= todayDate).length,
    };
  }, [emails]);

  const uniqueTypes = useMemo(() => {
    return Array.from(new Set(emails.map((e) => e.email_type))).sort();
  }, [emails]);

  const getRelatedLink = (email: EmailLog) => {
    if (email.related_request_id) return { href: `/admin/aanvragen/${email.related_request_id}`, label: "Aanvraag" };
    if (email.related_accommodation_id) return { href: `/admin/logies/${email.related_accommodation_id}`, label: "Logies" };
    if (email.related_partner_id) return { href: `/admin/partners/${email.related_partner_id}`, label: "Partner" };
    return null;
  };

  return (
    <>
      <div className="space-y-4">
        {/* Stats row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card><CardContent className="pt-4 pb-3"><div className="flex items-center gap-3"><div className="p-2 bg-blue-100 rounded-lg"><Mail className="h-4 w-4 text-blue-600" /></div><div><p className="text-xl font-bold">{stats.total}</p><p className="text-xs text-muted-foreground">Totaal</p></div></div></CardContent></Card>
          <Card><CardContent className="pt-4 pb-3"><div className="flex items-center gap-3"><div className="p-2 bg-green-100 rounded-lg"><CheckCircle2 className="h-4 w-4 text-green-600" /></div><div><p className="text-xl font-bold">{stats.sent}</p><p className="text-xs text-muted-foreground">Verzonden</p></div></div></CardContent></Card>
          <Card><CardContent className="pt-4 pb-3"><div className="flex items-center gap-3"><div className="p-2 bg-red-100 rounded-lg"><XCircle className="h-4 w-4 text-red-600" /></div><div><p className="text-xl font-bold">{stats.failed}</p><p className="text-xs text-muted-foreground">Mislukt</p></div></div></CardContent></Card>
          <Card><CardContent className="pt-4 pb-3"><div className="flex items-center gap-3"><div className="p-2 bg-amber-100 rounded-lg"><Send className="h-4 w-4 text-amber-600" /></div><div><p className="text-xl font-bold">{stats.today}</p><p className="text-xs text-muted-foreground">Vandaag</p></div></div></CardContent></Card>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Zoeken op onderwerp, ontvanger..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-9" />
              </div>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-full md:w-56"><SelectValue placeholder="Email type" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Alle types</SelectItem>
                  {uniqueTypes.map((type) => (<SelectItem key={type} value={type}>{emailTypeLabels[type]?.label || type}</SelectItem>))}
                </SelectContent>
              </Select>
              <Select value={emailStatusFilter} onValueChange={setEmailStatusFilter}>
                <SelectTrigger className="w-full md:w-40"><SelectValue placeholder="Status" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Alle statussen</SelectItem>
                  <SelectItem value="sent">Verzonden</SelectItem>
                  <SelectItem value="failed">Mislukt</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline" onClick={() => refetch()} disabled={isRefetching} size="sm">
                <RefreshCw className={`h-4 w-4 ${isRefetching ? "animate-spin" : ""}`} />
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Table */}
        <Card>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-6 space-y-4">{[...Array(5)].map((_, i) => (<Skeleton key={i} className="h-12 w-full" />))}</div>
            ) : filteredEmails.length === 0 ? (
              <div className="p-12 text-center text-muted-foreground"><Mail className="h-12 w-12 mx-auto mb-4 opacity-30" /><p>Geen emails gevonden</p></div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-36">Datum</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Ontvanger</TableHead>
                      <TableHead className="max-w-xs">Onderwerp</TableHead>
                      <TableHead>Link</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="w-16">Acties</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredEmails.map((email) => {
                      const typeInfo = emailTypeLabels[email.email_type] || { label: email.email_type, category: "Overig" };
                      const statusInfo = emailStatusConfig[email.status] || emailStatusConfig.pending;
                      const relatedLink = getRelatedLink(email);
                      return (
                        <TableRow key={email.id}>
                          <TableCell className="whitespace-nowrap text-sm">
                            <div>{format(new Date(email.created_at), "EEE d MMM yyyy", { locale: nl })}</div>
                            <div className="text-muted-foreground">{format(new Date(email.created_at), "HH:mm")}</div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-xs">{typeInfo.category}</Badge>
                            <p className="text-sm mt-1">{typeInfo.label}</p>
                          </TableCell>
                          <TableCell>
                            <div className="text-sm">
                              {email.recipient_name && <div className="font-medium">{email.recipient_name}</div>}
                              <div className="text-muted-foreground">{email.recipient_email}</div>
                            </div>
                          </TableCell>
                          <TableCell className="max-w-xs"><p className="text-sm truncate">{email.subject}</p></TableCell>
                          <TableCell>
                            {relatedLink ? (
                              <Link to={relatedLink.href} className="inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800">
                                <ExternalLink className="h-3 w-3" />{relatedLink.label}
                              </Link>
                            ) : <span className="text-muted-foreground">-</span>}
                          </TableCell>
                          <TableCell>
                            <Badge className={statusInfo.color} variant="secondary">
                              {statusInfo.icon}<span className="ml-1">{statusInfo.label}</span>
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setSelectedEmail(email); setResendDialogOpen(true); }}>
                              <RotateCcw className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <ResendEmailDialog
        open={resendDialogOpen}
        onOpenChange={setResendDialogOpen}
        email={selectedEmail}
        onSuccess={() => {
          setResendDialogOpen(false);
          setSelectedEmail(null);
        }}
      />
    </>
  );
};

// ─── Activiteitenlog Tab ─────────────────────────────────────
interface ActivityLogEntry {
  id: string;
  user_id: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  details: Record<string, unknown> | null;
  created_at: string;
}

const ActivityLogTab = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [entityFilter, setEntityFilter] = useState<string>("all");
  const [actionFilter, setActionFilter] = useState<string>("all");

  const { data: logs = [], isLoading, refetch, isRefetching } = useQuery({
    queryKey: ["admin-activity-logs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("admin_activity_log")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(500);
      if (error) throw error;
      return data as ActivityLogEntry[];
    },
  });

  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      if (entityFilter !== "all" && log.entity_type !== entityFilter) return false;
      if (actionFilter !== "all" && log.action !== actionFilter) return false;
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const actionLabel = actionLabels[log.action]?.label.toLowerCase() || log.action.toLowerCase();
        return actionLabel.includes(query) || log.entity_id?.toLowerCase().includes(query) || JSON.stringify(log.details || {}).toLowerCase().includes(query);
      }
      return true;
    });
  }, [logs, entityFilter, actionFilter, searchQuery]);

  const uniqueActions = useMemo(() => Array.from(new Set(logs.map((l) => l.action))).sort(), [logs]);
  const uniqueEntities = useMemo(() => Array.from(new Set(logs.map((l) => l.entity_type))).sort(), [logs]);

  const formatDetails = (details: Record<string, unknown> | null): string => {
    if (!details) return "-";
    const entries = Object.entries(details);
    if (entries.length === 0) return "-";
    return entries.map(([key, value]) => `${key.replace(/_/g, " ")}: ${typeof value === "object" ? JSON.stringify(value) : String(value)}`).join(", ");
  };

  return (
    <div className="space-y-4">
      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Zoeken in activiteiten..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-9" />
            </div>
            <Select value={entityFilter} onValueChange={setEntityFilter}>
              <SelectTrigger className="w-full md:w-48"><SelectValue placeholder="Entiteit" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Alle entiteiten</SelectItem>
                {uniqueEntities.map((entity) => (<SelectItem key={entity} value={entity}>{entity.replace(/_/g, " ")}</SelectItem>))}
              </SelectContent>
            </Select>
            <Select value={actionFilter} onValueChange={setActionFilter}>
              <SelectTrigger className="w-full md:w-48"><SelectValue placeholder="Actie" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Alle acties</SelectItem>
                {uniqueActions.map((action) => (<SelectItem key={action} value={action}>{actionLabels[action]?.label || action}</SelectItem>))}
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={() => refetch()} disabled={isRefetching} size="sm">
              <RefreshCw className={`h-4 w-4 ${isRefetching ? "animate-spin" : ""}`} />
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="text-sm text-muted-foreground flex items-center gap-2">
        <Activity className="h-4 w-4" />
        {filteredLogs.length} {filteredLogs.length === 1 ? "activiteit" : "activiteiten"}
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 space-y-4">{[...Array(5)].map((_, i) => (<Skeleton key={i} className="h-12 w-full" />))}</div>
          ) : filteredLogs.length === 0 ? (
            <div className="p-12 text-center text-muted-foreground"><Activity className="h-12 w-12 mx-auto mb-4 opacity-30" /><p>Geen activiteiten gevonden</p></div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-36">Datum</TableHead>
                    <TableHead>Actie</TableHead>
                    <TableHead>Entiteit</TableHead>
                    <TableHead className="max-w-xs">Details</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredLogs.map((log) => {
                    const actionInfo = actionLabels[log.action] || { label: log.action, color: "bg-slate-100 text-slate-800" };
                    return (
                      <TableRow key={log.id}>
                        <TableCell className="whitespace-nowrap text-sm">
                          <div>{format(new Date(log.created_at), "EEE d MMM yyyy", { locale: nl })}</div>
                          <div className="text-muted-foreground">{format(new Date(log.created_at), "HH:mm:ss")}</div>
                        </TableCell>
                        <TableCell><Badge className={actionInfo.color} variant="secondary">{actionInfo.label}</Badge></TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {entityIcons[log.entity_type] || <FileText className="h-4 w-4" />}
                            <div>
                              <div className="text-sm font-medium capitalize">{log.entity_type.replace(/_/g, " ")}</div>
                              {log.entity_id && <div className="text-xs text-muted-foreground font-mono">{log.entity_id.substring(0, 8)}...</div>}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="max-w-xs">
                          <div className="text-sm text-muted-foreground truncate" title={formatDetails(log.details)}>{formatDetails(log.details)}</div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

// ─── Main Page ───────────────────────────────────────────────
const AdminTodos = () => {
  return (
    <>
      <Helmet>
        <title>Taken | Admin | Bureau Vlieland</title>
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>
      <AdminLayout>
        <div className="p-6 space-y-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Operationeel Centrum</h1>
            <p className="text-slate-600">Taken, e-mails en activiteiten op één plek</p>
          </div>

          <Tabs defaultValue="taken" className="space-y-4">
            <TabsList>
              <TabsTrigger value="taken" className="gap-2">
                <ClipboardList className="h-4 w-4" />
                Taken
              </TabsTrigger>
              <TabsTrigger value="email" className="gap-2">
                <Mail className="h-4 w-4" />
                E-maillog
              </TabsTrigger>
              <TabsTrigger value="activity" className="gap-2">
                <Activity className="h-4 w-4" />
                Activiteitenlog
              </TabsTrigger>
            </TabsList>

            <TabsContent value="taken">
              <TakenTab />
            </TabsContent>
            <TabsContent value="email">
              <EmailLogTab />
            </TabsContent>
            <TabsContent value="activity">
              <ActivityLogTab />
            </TabsContent>
          </Tabs>
        </div>
      </AdminLayout>
    </>
  );
};

export default AdminTodos;
