import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";
import {
  FileText,
  Upload,
  Download,
  Trash2,
  Loader2,
  Paperclip,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { nl } from "date-fns/locale";

export interface ProjectDocument {
  id: string;
  program_request_id: string | null;
  accommodation_request_id: string | null;
  scope: "project" | "accommodation";
  file_path: string;
  file_name: string;
  file_size: number | null;
  mime_type: string | null;
  label: string | null;
  description: string | null;
  uploaded_by: "admin" | "customer" | "partner";
  uploaded_by_partner_id: string | null;
  uploaded_by_name: string | null;
  is_visible_to_partners: boolean;
  is_visible_to_customer: boolean;
  created_at: string;
}

interface Props {
  programRequestId?: string | null;
  accommodationRequestId?: string | null;
  customerToken?: string | null;
  viewer: "admin" | "customer" | "partner";
  canUpload?: boolean;
  title?: string;
  emptyHint?: string;
  compact?: boolean;
  showVisibilityToggles?: boolean; // admin only
}

const ACCEPT =
  ".pdf,.doc,.docx,.xls,.xlsx,.csv,.txt,.png,.jpg,.jpeg,.webp";
const MAX_MB = 20;

function fmtSize(bytes: number | null | undefined) {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export function ProjectDocumentsPanel({
  programRequestId,
  accommodationRequestId,
  customerToken,
  viewer,
  canUpload = true,
  title = "Documenten",
  emptyHint = "Nog geen documenten geüpload.",
  compact = false,
  showVisibilityToggles = false,
}: Props) {
  const [docs, setDocs] = useState<ProjectDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [label, setLabel] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const target = programRequestId
    ? { program_request_id: programRequestId }
    : accommodationRequestId
      ? { accommodation_request_id: accommodationRequestId }
      : null;

  const load = async () => {
    if (!target) return;
    setLoading(true);
    const { data, error } = await supabase.functions.invoke("project-documents", {
      body: {
        action: "list",
        ...target,
        customer_token: customerToken ?? null,
      },
    });
    setLoading(false);
    if (error) {
      toast({ title: "Documenten laden mislukt", description: error.message, variant: "destructive" });
      return;
    }
    setDocs((data as any)?.documents ?? []);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [programRequestId, accommodationRequestId, customerToken]);

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0 || !target) return;
    setBusy(true);
    try {
      for (const file of Array.from(files)) {
        if (file.size > MAX_MB * 1024 * 1024) {
          toast({ title: `${file.name} is te groot`, description: `Max ${MAX_MB} MB`, variant: "destructive" });
          continue;
        }
        const { data, error } = await supabase.functions.invoke("project-documents", {
          body: {
            action: "sign-upload",
            ...target,
            customer_token: customerToken ?? null,
            file_name: file.name,
            file_size: file.size,
            mime_type: file.type || "application/octet-stream",
            label: label || null,
          },
        });
        if (error || !data?.upload_url) {
          toast({ title: `Upload voorbereiden mislukt (${file.name})`, description: error?.message ?? (data as any)?.error, variant: "destructive" });
          continue;
        }
        const put = await fetch(data.upload_url, {
          method: "PUT",
          headers: { "Content-Type": file.type || "application/octet-stream" },
          body: file,
        });
        if (!put.ok) {
          toast({ title: `Upload mislukt (${file.name})`, variant: "destructive" });
          continue;
        }
      }
      setLabel("");
      if (fileRef.current) fileRef.current.value = "";
      await load();
      toast({ title: "Upload gereed" });
    } finally {
      setBusy(false);
    }
  };

  const download = async (doc: ProjectDocument) => {
    const { data, error } = await supabase.functions.invoke("project-documents", {
      body: {
        action: "sign-download",
        document_id: doc.id,
        customer_token: customerToken ?? null,
        program_request_id: doc.program_request_id,
        accommodation_request_id: doc.accommodation_request_id,
      },
    });
    if (error || !(data as any)?.url) {
      toast({ title: "Download mislukt", description: error?.message, variant: "destructive" });
      return;
    }
    window.open((data as any).url, "_blank", "noopener");
  };

  const remove = async (doc: ProjectDocument) => {
    if (!confirm(`"${doc.file_name}" verwijderen?`)) return;
    const { error, data } = await supabase.functions.invoke("project-documents", {
      body: {
        action: "delete",
        document_id: doc.id,
        customer_token: customerToken ?? null,
        program_request_id: doc.program_request_id,
        accommodation_request_id: doc.accommodation_request_id,
      },
    });
    if (error || (data as any)?.error) {
      toast({ title: "Verwijderen mislukt", description: error?.message ?? (data as any)?.error, variant: "destructive" });
      return;
    }
    toast({ title: "Verwijderd" });
    await load();
  };

  const toggleVisibility = async (
    doc: ProjectDocument,
    field: "is_visible_to_partners" | "is_visible_to_customer",
    value: boolean,
  ) => {
    // Admin-only path uses direct supabase (admin RLS covers it)
    const { error } = await supabase
      .from("project_documents")
      .update({ [field]: value } as any)
      .eq("id", doc.id);
    if (error) {
      toast({ title: "Bijwerken mislukt", description: error.message, variant: "destructive" });
      return;
    }
    await load();
  };

  const canDelete = (doc: ProjectDocument) => {
    if (viewer === "admin") return true;
    if (viewer === "customer") return doc.uploaded_by === "customer";
    if (viewer === "partner") return doc.uploaded_by === "partner";
    return false;
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <Paperclip className="h-4 w-4" /> {title}
          {docs.length > 0 && (
            <span className="text-xs font-normal text-muted-foreground">({docs.length})</span>
          )}
        </h3>
      </div>

      {canUpload && (
        <Card className="p-3 space-y-2 border-dashed">
          {!compact && (
            <div className="space-y-1.5">
              <Label htmlFor="doc-label" className="text-xs">Label (optioneel)</Label>
              <Input
                id="doc-label"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder="bv. Kamerindeling, Gastenlijst"
                className="h-8 text-sm"
                disabled={busy}
              />
            </div>
          )}
          <div className="flex items-center gap-2">
            <input
              ref={fileRef}
              type="file"
              accept={ACCEPT}
              multiple
              className="hidden"
              onChange={(e) => handleFiles(e.target.files)}
              disabled={busy}
            />
            <Button
              size="sm"
              variant="outline"
              onClick={() => fileRef.current?.click()}
              disabled={busy}
              className="w-full"
            >
              {busy ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Upload className="h-4 w-4 mr-2" />}
              Bestand(en) uploaden
            </Button>
          </div>
          <p className="text-[11px] text-muted-foreground">
            PDF, Word, Excel, CSV of afbeelding — max {MAX_MB} MB per bestand.
          </p>
        </Card>
      )}

      {loading ? (
        <div className="text-sm text-muted-foreground flex items-center gap-2">
          <Loader2 className="h-4 w-4 animate-spin" /> Laden…
        </div>
      ) : docs.length === 0 ? (
        <p className="text-sm text-muted-foreground italic">{emptyHint}</p>
      ) : (
        <ul className="space-y-2">
          {docs.map((doc) => (
            <li key={doc.id} className="border rounded-lg p-2.5 bg-card">
              <div className="flex items-start gap-2">
                <FileText className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                <div className="flex-1 min-w-0">
                  <button
                    className="text-sm font-medium text-left hover:underline truncate block w-full"
                    onClick={() => download(doc)}
                    title={doc.file_name}
                  >
                    {doc.label ? `${doc.label} — ` : ""}{doc.file_name}
                  </button>
                  <p className="text-[11px] text-muted-foreground">
                    {fmtSize(doc.file_size)} · {doc.uploaded_by_name ?? doc.uploaded_by} · {formatDistanceToNow(new Date(doc.created_at), { addSuffix: true, locale: nl })}
                  </p>
                  {showVisibilityToggles && viewer === "admin" && (
                    <div className="flex flex-wrap gap-3 mt-1.5">
                      <label className="flex items-center gap-1.5 text-[11px]">
                        <Switch
                          checked={doc.is_visible_to_partners}
                          onCheckedChange={(v) => toggleVisibility(doc, "is_visible_to_partners", v)}
                        />
                        Zichtbaar voor partners
                      </label>
                      <label className="flex items-center gap-1.5 text-[11px]">
                        <Switch
                          checked={doc.is_visible_to_customer}
                          onCheckedChange={(v) => toggleVisibility(doc, "is_visible_to_customer", v)}
                        />
                        Zichtbaar voor klant
                      </label>
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <Button size="icon" variant="ghost" onClick={() => download(doc)} title="Downloaden">
                    <Download className="h-4 w-4" />
                  </Button>
                  {canDelete(doc) && (
                    <Button size="icon" variant="ghost" onClick={() => remove(doc)} title="Verwijderen">
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  )}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
