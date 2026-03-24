import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ClipboardList, ArrowRight } from "lucide-react";
import { toast } from "sonner";

interface AdminTodo {
  id: string;
  title: string;
  priority: string;
  due_date: string | null;
  status: string;
  related_request_id: string | null;
}

export const DashboardTodoWidget = () => {
  const [todos, setTodos] = useState<AdminTodo[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchTodos = async () => {
    const { data, error } = await supabase
      .from("admin_todos")
      .select("id, title, priority, due_date, status, related_request_id")
      .in("status", ["todo", "in_progress"])
      .order("priority", { ascending: true })
      .order("due_date", { ascending: true, nullsFirst: false })
      .limit(5);

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
    high: "bg-red-100 text-red-700",
    medium: "bg-amber-100 text-amber-700",
    low: "bg-slate-100 text-slate-600",
  };

  if (isLoading || todos.length === 0) return null;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <ClipboardList className="h-5 w-5" />
            Openstaande todo's
          </CardTitle>
          <Button variant="ghost" size="sm" asChild>
            <Link to="/admin/todos" className="gap-1">
              Alle todo's <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {todos.map((todo) => (
          <div
            key={todo.id}
            className="flex items-start gap-3 p-2 rounded-lg hover:bg-slate-50 transition-colors"
          >
            <Checkbox
              className="mt-0.5"
              onCheckedChange={() => handleComplete(todo.id)}
            />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{todo.title}</p>
              {todo.due_date && (
                <p className="text-xs text-slate-500">
                  {new Date(todo.due_date).toLocaleDateString("nl-NL", { weekday: "short", day: "numeric", month: "short" })}
                </p>
              )}
            </div>
            <Badge className={priorityColor[todo.priority] || priorityColor.low} variant="secondary">
              {todo.priority === "high" ? "Hoog" : todo.priority === "medium" ? "Gemiddeld" : "Laag"}
            </Badge>
          </div>
        ))}
      </CardContent>
    </Card>
  );
};
