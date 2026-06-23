import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { nl } from "date-fns/locale";
import {
  Inbox, Mail, Loader2, Sparkles, AlertCircle, CheckCircle,
  RefreshCw, Download, Trash2, UserPlus, FileText,
} from "lucide-react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useSalesInbox } from "@/hooks/useSalesInbox";
import type { SalesInboxItem, SalesInboxStatus } from "@/types/salesInbox";
import { toast } from "sonner";

export default function AdminSalesInbox() {
  const navigate = useNavigate();
  const [tab, setTab] = useState<SalesInboxStatus | "all">("new");
  const { items, isLoading, discard, rescan } = useSalesInbox(tab);
  const [processing, setProcessing] = useState<SalesInboxItem | null>(null);
  const [viewBody, setViewBody] = useState<SalesInboxItem | null>(null);

  const handleDownload = async (path: string) => {
    const { data, error } = await supabase.storage
      .from("email-attachments")
      .createSignedUrl(path, 3600);
    if (!error && data?.signedUrl) window.open(data.signedUrl, "_blank");
  };

  const renderScanStatus = (item: SalesInboxItem) => {
    switch (item.scan_status) {
      case "pending":
      case "scanning":
        return (
          <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
            <Loader2 className="h-3 w-3 mr-1 animate-spin" /> Scant…
          </Badge>
        );
      case "scanned":
        return (
          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
            <Sparkles className="h-3 w-3 mr-1" /> Gescand
          </Badge>
        );
      case "failed":
        return (
          <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
            <AlertCircle className="h-3 w-3 mr-1" /> Mislukt
          </Badge>
        );
    }
  };

  return (
    <AdminLayout>
      <div className="p-6 space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Inbox className="h-8 w-8" /> Sales Inbox
          </h1>
          <p className="text-muted-foreground">
            Forward of stuur sales-aanvragen naar{" "}
            <code className="bg-muted px-1.5 py-0.5 rounded text-sm">sales@reply.bureauvlieland.nl</code>{" "}
            — ze worden automatisch gescand en kun je met één klik omzetten naar een project.
          </p>
        </div>

        <Tabs value={tab} onValueChange={(v) => setTab(v as SalesInboxStatus | "all")}>
          <TabsList>
            <TabsTrigger value="new">Nieuw</TabsTrigger>
            <TabsTrigger value="processed">Verwerkt</TabsTrigger>
            <TabsTrigger value="discarded">Genegeerd</TabsTrigger>
            <TabsTrigger value="all">Alle</TabsTrigger>
          </TabsList>
        </Tabs>

        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => <Skeleton key={i} className="h-32" />)}
          </div>
        ) : !items || items.length === 0 ? (
          <Card>
            <CardContent className="py-16 text-center text-muted-foreground">
              <Mail className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="font-medium">Geen items</p>
              <p className="text-sm mt-1">
                Stuur een aanvraag naar sales@reply.bureauvlieland.nl om te starten.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {items.map((item) => (
              <Card key={item.id}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-base flex items-center gap-2 flex-wrap">
                        <Mail className="h-4 w-4 shrink-0" />
                        <span className="truncate">{item.subject || "(geen onderwerp)"}</span>
                        {renderScanStatus(item)}
                        {item.status === "processed" && (
                          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                            <CheckCircle className="h-3 w-3 mr-1" /> Verwerkt
                          </Badge>
                        )}
                        {item.status === "discarded" && (
                          <Badge variant="outline" className="bg-slate-50 text-slate-600">
                            Genegeerd
                          </Badge>
                        )}
                      </CardTitle>
                      <CardDescription className="mt-1">
                        Van: <strong>{item.from_name || item.from_email}</strong> &lt;{item.from_email}&gt; ·{" "}
                        {format(new Date(item.created_at), "EEE d MMM yyyy HH:mm", { locale: nl })}
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-0 space-y-3">
                  {item.scan_result && (
                    <div className="bg-muted/40 rounded-md p-3 text-sm grid grid-cols-2 md:grid-cols-4 gap-2">
                      <div>
                        <div className="text-xs text-muted-foreground">Contactpersoon</div>
                        <div className="font-medium truncate">{item.scan_result.customer_name || "—"}</div>
                      </div>
                      <div>
                        <div className="text-xs text-muted-foreground">Bedrijf</div>
                        <div className="font-medium truncate">{item.scan_result.customer_company || "—"}</div>
                      </div>
                      <div>
                        <div className="text-xs text-muted-foreground">Personen</div>
                        <div className="font-medium">{item.scan_result.number_of_people ?? "—"}</div>
                      </div>
                      <div>
                        <div className="text-xs text-muted-foreground">Datums</div>
                        <div className="font-medium truncate">
                          {item.scan_result.preferred_dates?.join(", ") || "—"}
                        </div>
                      </div>
                      {item.scan_result.wishes && (
                        <div className="col-span-2 md:col-span-4">
                          <div className="text-xs text-muted-foreground">Wensen</div>
                          <div className="text-sm whitespace-pre-wrap">{item.scan_result.wishes}</div>
                        </div>
                      )}
                    </div>
                  )}

                  {item.scan_status === "failed" && item.scan_error && (
                    <div className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-md p-2">
                      {item.scan_error}
                    </div>
                  )}

                  {item.attachments && item.attachments.length > 0 && (
                    <div className="text-xs text-muted-foreground">
                      📎 {item.attachments.length} bijlage(n)
                    </div>
                  )}

                  <div className="flex flex-wrap gap-2">
                    <Button size="sm" variant="outline" onClick={() => setViewBody(item)}>
                      <FileText className="h-3 w-3 mr-1" /> Mail bekijken
                    </Button>
                    {(item.attachments || []).map((a) => (
                      <Button
                        key={a.path}
                        size="sm"
                        variant="outline"
                        onClick={() => handleDownload(a.path)}
                      >
                        <Download className="h-3 w-3 mr-1" /> {a.name}
                      </Button>
                    ))}
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => rescan.mutate(item)}
                      disabled={rescan.isPending}
                    >
                      <RefreshCw className={`h-3 w-3 mr-1 ${rescan.isPending ? "animate-spin" : ""}`} />
                      Opnieuw scannen
                    </Button>
                    {item.status === "new" && (
                      <>
                        <Button
                          size="sm"
                          onClick={() => setProcessing(item)}
                          disabled={item.scan_status === "scanning" || item.scan_status === "pending"}
                        >
                          <UserPlus className="h-3 w-3 mr-1" /> Maak project
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => discard.mutate(item.id)}
                        >
                          <Trash2 className="h-3 w-3 mr-1" /> Negeer
                        </Button>
                      </>
                    )}
                    {item.status === "processed" && item.processed_request_id && (
                      <Button size="sm" variant="outline" asChild>
                        <Link to={`/admin/projecten/${item.processed_request_id}`}>
                          Open project
                        </Link>
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {processing && (
        <CreateRequestDialog
          item={processing}
          onClose={() => setProcessing(null)}
          onCreated={(id) => {
            setProcessing(null);
            navigate(`/admin/projecten/${id}`);
          }}
        />
      )}

      {viewBody && (
        <Dialog open onOpenChange={(o) => !o && setViewBody(null)}>
          <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{viewBody.subject || "(geen onderwerp)"}</DialogTitle>
              <DialogDescription>
                {viewBody.from_name || viewBody.from_email} &lt;{viewBody.from_email}&gt;
              </DialogDescription>
            </DialogHeader>
            <pre className="text-sm whitespace-pre-wrap font-sans">
              {viewBody.body_text || "(geen tekst-inhoud)"}
            </pre>
          </DialogContent>
        </Dialog>
      )}
    </AdminLayout>
  );
}

function CreateRequestDialog({
  item, onClose, onCreated,
}: {
  item: SalesInboxItem;
  onClose: () => void;
  onCreated: (id: string) => void;
}) {
  const r = item.scan_result;
  const [form, setForm] = useState({
    customer_name: r?.customer_name || item.from_name || "",
    customer_email: r?.customer_email || item.from_email || "",
    customer_phone: r?.customer_phone || "",
    customer_company: r?.customer_company || "",
    number_of_people: r?.number_of_people ?? 20,
    selected_dates: (r?.preferred_dates || []).join(", "),
    general_notes: [r?.wishes, r?.budget_indication ? `Budget: ${r.budget_indication}` : null,
      r?.source ? `Bron: ${r.source}` : null].filter(Boolean).join("\n\n"),
  });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async () => {
    if (!form.customer_name.trim() || !form.customer_email.trim()) {
      toast.error("Naam en e-mail zijn verplicht");
      return;
    }
    setSaving(true);
    try {
      const dates = form.selected_dates.split(",").map((s) => s.trim()).filter(Boolean);
      const { data, error } = await supabase.functions.invoke("create-request-from-sales-inbox", {
        body: {
          inbox_id: item.id,
          customer_name: form.customer_name.trim(),
          customer_email: form.customer_email.trim(),
          customer_phone: form.customer_phone.trim() || null,
          customer_company: form.customer_company.trim() || null,
          number_of_people: Number(form.number_of_people) || 20,
          selected_dates: dates,
          general_notes: form.general_notes.trim() || null,
        },
      });
      if (error || data?.error) {
        throw new Error(data?.error || error?.message || "Aanmaken mislukt");
      }
      toast.success("Project aangemaakt");
      onCreated(data.request_id);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Aanmaken mislukt");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Maak project van sales-aanvraag</DialogTitle>
          <DialogDescription>
            Controleer en bewerk de geparste gegevens. Bij opslaan wordt een nieuw project aangemaakt.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Contactpersoon *</Label>
              <Input value={form.customer_name} onChange={(e) => setForm({ ...form, customer_name: e.target.value })} />
            </div>
            <div>
              <Label>E-mail *</Label>
              <Input value={form.customer_email} onChange={(e) => setForm({ ...form, customer_email: e.target.value })} />
            </div>
            <div>
              <Label>Telefoon</Label>
              <Input value={form.customer_phone} onChange={(e) => setForm({ ...form, customer_phone: e.target.value })} />
            </div>
            <div>
              <Label>Bedrijf</Label>
              <Input value={form.customer_company} onChange={(e) => setForm({ ...form, customer_company: e.target.value })} />
            </div>
            <div>
              <Label>Aantal personen</Label>
              <Input
                type="number"
                min={1}
                value={form.number_of_people}
                onChange={(e) => setForm({ ...form, number_of_people: Number(e.target.value) })}
              />
            </div>
            <div>
              <Label>Datums (komma-gescheiden)</Label>
              <Input
                value={form.selected_dates}
                onChange={(e) => setForm({ ...form, selected_dates: e.target.value })}
                placeholder="bv. 15 mei 2026, 16 mei 2026"
              />
            </div>
          </div>
          <div>
            <Label>Notities / wensen</Label>
            <Textarea
              rows={6}
              value={form.general_notes}
              onChange={(e) => setForm({ ...form, general_notes: e.target.value })}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose} disabled={saving}>Annuleren</Button>
          <Button onClick={handleSubmit} disabled={saving}>
            {saving && <Loader2 className="h-3 w-3 mr-1 animate-spin" />}
            Maak project
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
