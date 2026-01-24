import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
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
  CheckCircle2,
  Circle,
  Clock,
  AlertTriangle,
  AlertCircle,
  Calendar,
  Link as LinkIcon,
  Filter,
  Loader2,
} from "lucide-react";
import { Link } from "react-router-dom";

interface Todo {
  id: string;
  title: string;
  description: string | null;
  priority: string;
  status: string;
  due_date: string | null;
  related_request_id: string | null;
  related_partner_id: string | null;
  created_at: string;
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

const AdminTodos = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("active");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTodo, setEditingTodo] = useState<Todo | null>(null);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    priority: "normal",
    status: "todo",
    due_date: "",
    related_request_id: "",
    related_partner_id: "",
  });

  // Fetch todos
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
      return data as Todo[];
    },
  });

  // Fetch partners for linking
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

  // Fetch requests for linking
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

  // Create/Update mutation
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
        const { error } = await supabase
          .from("admin_todos")
          .update(payload)
          .eq("id", data.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("admin_todos").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-todos"] });
      toast({ title: editingTodo ? "Todo bijgewerkt" : "Todo aangemaakt" });
      handleCloseDialog();
    },
    onError: (error) => {
      toast({
        title: "Fout",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("admin_todos").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-todos"] });
      toast({ title: "Todo verwijderd" });
    },
  });

  // Toggle status mutation
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
      setFormData({
        title: "",
        description: "",
        priority: "normal",
        status: "todo",
        due_date: "",
        related_request_id: "",
        related_partner_id: "",
      });
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

  const filteredTodos = todos.filter((todo) =>
    todo.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    todo.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

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

  return (
    <AdminLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Todo's</h1>
            <p className="text-slate-600">Beheer je taken en actiepunten</p>
          </div>
          <Button onClick={() => handleOpenDialog()} className="gap-2">
            <Plus className="h-4 w-4" />
            Nieuwe todo
          </Button>
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
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">
              {filteredTodos.length} todo{filteredTodos.length !== 1 && "'s"}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : filteredTodos.length === 0 ? (
              <div className="py-12 text-center text-muted-foreground">
                Geen todo's gevonden
              </div>
            ) : (
              <div className="divide-y">
                {filteredTodos.map((todo) => {
                  const priority = priorityConfig[todo.priority as keyof typeof priorityConfig] || priorityConfig.normal;
                  const status = statusConfig[todo.status as keyof typeof statusConfig] || statusConfig.todo;
                  const PriorityIcon = priority.icon;
                  const linkedPartner = getLinkedPartnerName(todo.related_partner_id);
                  const linkedRequest = getLinkedRequestLabel(todo.related_request_id);
                  const isOverdue = todo.due_date && new Date(todo.due_date) < new Date() && todo.status !== "done";

                  return (
                    <div
                      key={todo.id}
                      className={`flex items-start gap-4 p-4 hover:bg-slate-50 transition-colors ${
                        todo.status === "done" ? "opacity-60" : ""
                      }`}
                    >
                      {/* Checkbox */}
                      <Checkbox
                        checked={todo.status === "done"}
                        onCheckedChange={(checked) => {
                          toggleStatusMutation.mutate({
                            id: todo.id,
                            newStatus: checked ? "done" : "todo",
                          });
                        }}
                        className="mt-1"
                      />

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start gap-2 flex-wrap">
                          <span
                            className={`font-medium ${
                              todo.status === "done" ? "line-through text-muted-foreground" : ""
                            }`}
                          >
                            {todo.title}
                          </span>
                          <Badge variant="outline" className={priority.color}>
                            <PriorityIcon className="h-3 w-3 mr-1" />
                            {priority.label}
                          </Badge>
                          <Badge variant="outline" className={status.color}>
                            {status.label}
                          </Badge>
                        </div>

                        {todo.description && (
                          <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                            {todo.description}
                          </p>
                        )}

                        <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground flex-wrap">
                          {todo.due_date && (
                            <span className={`flex items-center gap-1 ${isOverdue ? "text-red-600 font-medium" : ""}`}>
                              <Calendar className="h-3 w-3" />
                              {format(new Date(todo.due_date), "d MMM yyyy", { locale: nl })}
                              {isOverdue && " (verlopen)"}
                            </span>
                          )}
                          {linkedPartner && (
                            <Link
                              to="/admin/partners"
                              className="flex items-center gap-1 hover:text-primary"
                            >
                              <LinkIcon className="h-3 w-3" />
                              {linkedPartner}
                            </Link>
                          )}
                          {linkedRequest && (
                            <Link
                              to="/admin/aanvragen"
                              className="flex items-center gap-1 hover:text-primary"
                            >
                              <LinkIcon className="h-3 w-3" />
                              {linkedRequest}
                            </Link>
                          )}
                        </div>
                      </div>

                      {/* Actions */}
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleOpenDialog(todo)}>
                            <Pencil className="h-4 w-4 mr-2" />
                            Bewerken
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => {
                              if (confirm("Weet je zeker dat je deze todo wilt verwijderen?")) {
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
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Create/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingTodo ? "Todo bewerken" : "Nieuwe todo"}
            </DialogTitle>
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
                <Select
                  value={formData.priority}
                  onValueChange={(v) => setFormData({ ...formData, priority: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
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
                <Select
                  value={formData.status}
                  onValueChange={(v) => setFormData({ ...formData, status: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
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
                <SelectTrigger>
                  <SelectValue placeholder="Geen koppeling" />
                </SelectTrigger>
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
                <SelectTrigger>
                  <SelectValue placeholder="Geen koppeling" />
                </SelectTrigger>
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
              <Button type="button" variant="outline" onClick={handleCloseDialog}>
                Annuleren
              </Button>
              <Button type="submit" disabled={saveMutation.isPending}>
                {saveMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : null}
                {editingTodo ? "Opslaan" : "Aanmaken"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
};

export default AdminTodos;
