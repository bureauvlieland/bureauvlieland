import { Paperclip } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

/**
 * Bijlagen van een inkomende e-mail. `inbound-email` zet ze in de bucket
 * `email-attachments` en bewaart naam, grootte, mime en pad in
 * `project_communications.metadata.attachments`. Gedeeld door het
 * projectdossier en het Berichtencentrum.
 */
export interface AttachmentMeta {
  name: string;
  size: number;
  mime: string;
  path: string;
}

export function readAttachments(metadata?: Record<string, unknown> | null): AttachmentMeta[] {
  return Array.isArray(metadata?.attachments)
    ? (metadata!.attachments as AttachmentMeta[]).filter((a) => a && typeof a.path === "string")
    : [];
}

function formatSize(bytes: number) {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function EmailAttachments({
  metadata,
  className,
}: {
  metadata?: Record<string, unknown> | null;
  className?: string;
}) {
  const attachments = readAttachments(metadata);
  if (attachments.length === 0) return null;

  const handleOpen = async (path: string, name: string) => {
    const { data, error } = await supabase.storage
      .from("email-attachments")
      .createSignedUrl(path, 60 * 10);
    if (error || !data?.signedUrl) {
      toast.error("Bijlage kon niet worden geopend");
      return;
    }
    // Nieuw tabblad; de browser kiest tonen of downloaden op basis van het mime-type
    const a = document.createElement("a");
    a.href = data.signedUrl;
    a.target = "_blank";
    a.rel = "noopener noreferrer";
    a.download = name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div className={className ?? "mt-2 flex flex-wrap gap-2"}>
      {attachments.map((a, idx) => (
        <button
          key={`${a.path}-${idx}`}
          type="button"
          onClick={() => handleOpen(a.path, a.name)}
          className="inline-flex items-center gap-1.5 rounded-md border bg-muted/40 hover:bg-muted px-2 py-1 text-xs transition-colors max-w-full"
          title={`${a.name} — ${formatSize(a.size)}`}
        >
          <Paperclip className="h-3 w-3 flex-shrink-0 text-muted-foreground" />
          <span className="truncate max-w-[200px]">{a.name}</span>
          {a.size > 0 && (
            <span className="text-muted-foreground flex-shrink-0">({formatSize(a.size)})</span>
          )}
        </button>
      ))}
    </div>
  );
}
