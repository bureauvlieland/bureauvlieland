import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Helmet } from "react-helmet";
import { format } from "date-fns";
import { nl } from "date-fns/locale";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Search,
  Mail,
  RefreshCw,
  Calendar,
  CheckCircle2,
  XCircle,
  Clock,
  ExternalLink,
  Building2,
  User,
  FileText,
  Send,
} from "lucide-react";

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

// Email type labels for display
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
  accommodation_quote_notification: { label: "Logies offerte notificatie", category: "Logies" },
  accommodation_selected_partner: { label: "Logies gekozen (Partner)", category: "Logies" },
  accommodation_selected_customer: { label: "Logies gekozen (Klant)", category: "Logies" },
};

const statusConfig: Record<string, { icon: React.ReactNode; color: string; label: string }> = {
  sent: { icon: <CheckCircle2 className="h-4 w-4" />, color: "bg-green-100 text-green-800", label: "Verzonden" },
  failed: { icon: <XCircle className="h-4 w-4" />, color: "bg-red-100 text-red-800", label: "Mislukt" },
  pending: { icon: <Clock className="h-4 w-4" />, color: "bg-amber-100 text-amber-800", label: "In wachtrij" },
};

const AdminMessages = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");

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
      // Type filter
      if (typeFilter !== "all" && email.email_type !== typeFilter) {
        return false;
      }

      // Status filter
      if (statusFilter !== "all" && email.status !== statusFilter) {
        return false;
      }

      // Search query
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
  }, [emails, typeFilter, statusFilter, searchQuery]);

  // Stats
  const stats = useMemo(() => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);

    return {
      total: emails.length,
      sent: emails.filter(e => e.status === "sent").length,
      failed: emails.filter(e => e.status === "failed").length,
      today: emails.filter(e => new Date(e.created_at) >= today).length,
      thisWeek: emails.filter(e => new Date(e.created_at) >= weekAgo).length,
    };
  }, [emails]);

  const uniqueTypes = useMemo(() => {
    const types = new Set(emails.map((e) => e.email_type));
    return Array.from(types).sort();
  }, [emails]);

  const getRelatedLink = (email: EmailLog): { href: string; label: string } | null => {
    if (email.related_request_id) {
      return { href: `/admin/aanvragen/${email.related_request_id}`, label: "Aanvraag" };
    }
    if (email.related_accommodation_id) {
      return { href: `/admin/logies/${email.related_accommodation_id}`, label: "Logies" };
    }
    if (email.related_partner_id) {
      return { href: `/admin/partners/${email.related_partner_id}`, label: "Partner" };
    }
    return null;
  };

  return (
    <>
      <Helmet>
        <title>Berichtencentrum | Admin | Bureau Vlieland</title>
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>
      <AdminLayout>
        <div className="p-6 space-y-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Berichtencentrum</h1>
              <p className="text-slate-500 mt-1">
                Overzicht van alle verzonden transactionele emails
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

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <Mail className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{stats.total}</p>
                    <p className="text-xs text-slate-500">Totaal</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <CheckCircle2 className="h-5 w-5 text-green-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{stats.sent}</p>
                    <p className="text-xs text-slate-500">Verzonden</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-red-100 rounded-lg">
                    <XCircle className="h-5 w-5 text-red-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{stats.failed}</p>
                    <p className="text-xs text-slate-500">Mislukt</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-amber-100 rounded-lg">
                    <Send className="h-5 w-5 text-amber-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{stats.today}</p>
                    <p className="text-xs text-slate-500">Vandaag</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-purple-100 rounded-lg">
                    <Calendar className="h-5 w-5 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{stats.thisWeek}</p>
                    <p className="text-xs text-slate-500">Deze week</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Filters */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input
                    placeholder="Zoeken op onderwerp, ontvanger..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Select value={typeFilter} onValueChange={setTypeFilter}>
                  <SelectTrigger className="w-full md:w-56">
                    <SelectValue placeholder="Email type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Alle types</SelectItem>
                    {uniqueTypes.map((type) => (
                      <SelectItem key={type} value={type}>
                        {emailTypeLabels[type]?.label || type}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-full md:w-40">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Alle statussen</SelectItem>
                    <SelectItem value="sent">Verzonden</SelectItem>
                    <SelectItem value="failed">Mislukt</SelectItem>
                    <SelectItem value="pending">In wachtrij</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Results summary */}
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <Mail className="h-4 w-4" />
            <span>
              {filteredEmails.length} {filteredEmails.length === 1 ? "email" : "emails"} gevonden
            </span>
          </div>

          {/* Email table */}
          <Card>
            <CardContent className="p-0">
              {isLoading ? (
                <div className="p-6 space-y-4">
                  {[...Array(10)].map((_, i) => (
                    <Skeleton key={i} className="h-12 w-full" />
                  ))}
                </div>
              ) : filteredEmails.length === 0 ? (
                <div className="p-12 text-center text-slate-500">
                  <Mail className="h-12 w-12 mx-auto mb-4 text-slate-300" />
                  <p>Geen emails gevonden</p>
                  <p className="text-sm mt-1">
                    Emails worden gelogd zodra ze worden verstuurd via de edge functions.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-40">Datum/Tijd</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Ontvanger</TableHead>
                        <TableHead className="max-w-xs">Onderwerp</TableHead>
                        <TableHead>Link</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredEmails.map((email) => {
                        const typeInfo = emailTypeLabels[email.email_type] || {
                          label: email.email_type,
                          category: "Overig",
                        };
                        const statusInfo = statusConfig[email.status] || statusConfig.pending;
                        const relatedLink = getRelatedLink(email);

                        return (
                          <TableRow key={email.id}>
                            <TableCell className="whitespace-nowrap">
                              <div className="flex items-center gap-2 text-sm">
                                <Calendar className="h-4 w-4 text-slate-400" />
                                <div>
                                  <div className="font-medium">
                                    {format(new Date(email.created_at), "d MMM yyyy", { locale: nl })}
                                  </div>
                                  <div className="text-slate-500">
                                    {format(new Date(email.created_at), "HH:mm")}
                                  </div>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div>
                                <Badge variant="outline" className="text-xs">
                                  {typeInfo.category}
                                </Badge>
                                <p className="text-sm mt-1">{typeInfo.label}</p>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <User className="h-4 w-4 text-slate-400" />
                                <div>
                                  {email.recipient_name && (
                                    <div className="font-medium text-sm">{email.recipient_name}</div>
                                  )}
                                  <div className="text-sm text-slate-500">{email.recipient_email}</div>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell className="max-w-xs">
                              <p className="text-sm truncate" title={email.subject}>
                                {email.subject}
                              </p>
                            </TableCell>
                            <TableCell>
                              {relatedLink ? (
                                <Link
                                  to={relatedLink.href}
                                  className="inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800"
                                >
                                  <ExternalLink className="h-3 w-3" />
                                  {relatedLink.label}
                                </Link>
                              ) : (
                                <span className="text-slate-400">-</span>
                              )}
                            </TableCell>
                            <TableCell>
                              <Badge className={statusInfo.color} variant="secondary">
                                <span className="flex items-center gap-1">
                                  {statusInfo.icon}
                                  {statusInfo.label}
                                </span>
                              </Badge>
                              {email.error_message && (
                                <p className="text-xs text-red-600 mt-1 max-w-32 truncate" title={email.error_message}>
                                  {email.error_message}
                                </p>
                              )}
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
      </AdminLayout>
    </>
  );
};

export default AdminMessages;
