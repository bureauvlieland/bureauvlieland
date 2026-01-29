import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Helmet } from "react-helmet";
import { supabase } from "@/integrations/supabase/client";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import {
  Search,
  FileText,
  RefreshCw,
  Edit,
  Mail,
} from "lucide-react";
import { EmailTemplateSheet } from "@/components/admin/EmailTemplateSheet";

interface EmailTemplate {
  id: string;
  name: string;
  description: string | null;
  subject: string;
  body_html: string;
  variables: string[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// Category mapping for templates
const templateCategories: Record<string, string> = {
  program_request_bureau: "Programma",
  program_request_customer: "Programma",
  program_request_partner: "Programma",
  quote_request_bureau: "Offerte",
  quote_request_customer: "Offerte",
  status_confirmed: "Status",
  status_unavailable: "Status",
  status_alternative: "Status",
  customer_program_update_partner: "Wijziging",
  counter_proposal_partner: "Wijziging",
  cancellation_customer: "Annulering",
  cancellation_partner: "Annulering",
  cancellation_bureau: "Annulering",
  partner_invitation: "Partner",
  proforma_commission_notification: "Commissie",
  accommodation_request_bureau: "Logies",
  accommodation_request_customer: "Logies",
  accommodation_quote_notification: "Logies",
  accommodation_selected_partner: "Logies",
  accommodation_selected_customer: "Logies",
};

const AdminEmailTemplates = () => {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTemplate, setSelectedTemplate] = useState<EmailTemplate | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  const { data: templates = [], isLoading, refetch, isRefetching } = useQuery({
    queryKey: ["admin-email-templates"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("email_templates")
        .select("*")
        .order("id");

      if (error) throw error;
      return data as EmailTemplate[];
    },
  });

  const updateTemplateMutation = useMutation({
    mutationFn: async (template: Partial<EmailTemplate> & { id: string }) => {
      const { error } = await supabase
        .from("email_templates")
        .update({
          subject: template.subject,
          body_html: template.body_html,
          is_active: template.is_active,
        })
        .eq("id", template.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-email-templates"] });
      toast.success("Template opgeslagen");
      setSheetOpen(false);
    },
    onError: (error) => {
      toast.error("Fout bij opslaan: " + error.message);
    },
  });

  const filteredTemplates = templates.filter((template) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      template.name.toLowerCase().includes(query) ||
      template.subject.toLowerCase().includes(query) ||
      (template.description?.toLowerCase().includes(query) ?? false)
    );
  });

  const handleEditTemplate = (template: EmailTemplate) => {
    setSelectedTemplate(template);
    setSheetOpen(true);
  };

  const handleSaveTemplate = (template: Partial<EmailTemplate> & { id: string }) => {
    updateTemplateMutation.mutate(template);
  };

  // Group templates by category
  const groupedTemplates = filteredTemplates.reduce((acc, template) => {
    const category = templateCategories[template.id] || "Overig";
    if (!acc[category]) acc[category] = [];
    acc[category].push(template);
    return acc;
  }, {} as Record<string, EmailTemplate[]>);

  const categoryOrder = ["Programma", "Offerte", "Status", "Wijziging", "Annulering", "Logies", "Partner", "Overig"];

  return (
    <>
      <Helmet>
        <title>Email Templates | Admin | Bureau Vlieland</title>
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>
      <AdminLayout>
        <div className="p-6 space-y-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Email Templates</h1>
              <p className="text-slate-500 mt-1">
                Beheer de inhoud van alle transactionele emails
              </p>
            </div>
            <Button
              variant="outline"
              onClick={() => refetch()}
              disabled={isRefetching}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isRefetching ? "animate-spin" : ""}`} />
              Vernieuwen
            </Button>
          </div>

          {/* Search */}
          <Card>
            <CardContent className="pt-6">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="Zoeken op naam of onderwerp..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </CardContent>
          </Card>

          {/* Results count */}
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <FileText className="h-4 w-4" />
            <span>
              {filteredTemplates.length} {filteredTemplates.length === 1 ? "template" : "templates"} gevonden
            </span>
          </div>

          {/* Templates by category */}
          {isLoading ? (
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <Skeleton key={i} className="h-32 w-full" />
              ))}
            </div>
          ) : filteredTemplates.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center text-slate-500">
                <Mail className="h-12 w-12 mx-auto mb-4 text-slate-300" />
                <p>Geen templates gevonden</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-6">
              {categoryOrder
                .filter((cat) => groupedTemplates[cat]?.length > 0)
                .map((category) => (
                  <div key={category}>
                    <h2 className="text-lg font-semibold text-slate-700 mb-3">{category}</h2>
                    <div className="grid gap-4">
                      {groupedTemplates[category].map((template) => (
                        <Card key={template.id} className="hover:shadow-md transition-shadow">
                          <CardContent className="p-4">
                            <div className="flex items-start justify-between gap-4">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                  <h3 className="font-medium text-slate-900">{template.name}</h3>
                                  {!template.is_active && (
                                    <Badge variant="secondary" className="text-xs">Inactief</Badge>
                                  )}
                                </div>
                                {template.description && (
                                  <p className="text-sm text-slate-500 mb-2">{template.description}</p>
                                )}
                                <div className="flex items-center gap-2 text-sm">
                                  <Mail className="h-4 w-4 text-slate-400" />
                                  <span className="text-slate-600 truncate">{template.subject}</span>
                                </div>
                                {template.variables.length > 0 && (
                                  <div className="flex flex-wrap gap-1 mt-2">
                                    {template.variables.slice(0, 5).map((variable) => (
                                      <Badge key={variable} variant="outline" className="text-xs font-mono">
                                        {`{{${variable}}}`}
                                      </Badge>
                                    ))}
                                    {template.variables.length > 5 && (
                                      <Badge variant="outline" className="text-xs">
                                        +{template.variables.length - 5} meer
                                      </Badge>
                                    )}
                                  </div>
                                )}
                              </div>
                              <div className="flex gap-2 shrink-0">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleEditTemplate(template)}
                                >
                                  <Edit className="h-4 w-4 mr-1" />
                                  Bewerken
                                </Button>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
                ))}
            </div>
          )}
        </div>
      </AdminLayout>

      <EmailTemplateSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        template={selectedTemplate}
        onSave={handleSaveTemplate}
        isSaving={updateTemplateMutation.isPending}
      />
    </>
  );
};

export default AdminEmailTemplates;
