import { useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";

interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  body_html: string;
  variables: string[];
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  template: EmailTemplate | null;
}

// Sample values for known variables. Unknown variables fall back to a
// placeholder string based on the variable name.
const SAMPLE_VALUES: Record<string, string> = {
  partner_name: "Strandpaviljoen De Vuurtoren",
  customer_name: "Familie De Vries",
  contact_name: "Janneke de Vries",
  block_name: "Wadlooptocht bij zonsondergang",
  activity_name: "Wadlooptocht bij zonsondergang",
  project_name: "Teamuitje De Vries B.V.",
  project_date: "vrijdag 12 juni 2026",
  start_date: "12 juni 2026",
  end_date: "14 juni 2026",
  arrival_date: "12 juni 2026",
  departure_date: "14 juni 2026",
  event_date: "12 juni 2026",
  days_since: "5",
  days_until: "7",
  number_of_guests: "18",
  number_of_people: "18",
  people_count: "18",
  duration: "2 uur",
  time: "18:30",
  start_time: "18:30",
  portal_url: "https://bureauvlieland.nl/partner?token=voorbeeld",
  dashboard_url: "https://bureauvlieland.nl/partner",
  accept_url: "https://bureauvlieland.nl/partner/aanvraag/voorbeeld",
  customer_portal_url: "https://bureauvlieland.nl/mijn-programma/voorbeeld",
  request_url: "https://bureauvlieland.nl/partner/aanvraag/voorbeeld",
  quote_url: "https://bureauvlieland.nl/partner/offerte/voorbeeld",
  price: "€ 450,00",
  total_price: "€ 1.245,00",
  commission_amount: "€ 124,50",
  invoice_number: "BV-2026-0123",
  invoice_amount: "€ 1.245,00",
  reference: "BV-2026-0123",
  notes: "Graag verzamelen bij de haven, warme kleding aanbevolen.",
  message: "Graag verzamelen bij de haven, warme kleding aanbevolen.",
  description: "Een sportieve wadlooptocht met ervaren gids.",
  reason: "Helaas zijn we op deze datum al volgeboekt.",
  bureau_email: "info@bureauvlieland.nl",
  bureau_phone: "+31 6 12 34 56 78",
};

function fillTemplate(text: string, overrides: Record<string, string>): string {
  return text.replace(/\{\{\s*([\w.-]+)\s*\}\}/g, (_match, key: string) => {
    const value = overrides[key];
    if (value !== undefined && value !== "") return value;
    const sample = SAMPLE_VALUES[key];
    if (sample !== undefined) return sample;
    return `[${key}]`;
  });
}

export function EmailTemplatePreviewDialog({ open, onOpenChange, template }: Props) {
  const [overrides, setOverrides] = useState<Record<string, string>>({});

  const initialValues = useMemo(() => {
    if (!template) return {} as Record<string, string>;
    const out: Record<string, string> = {};
    for (const v of template.variables ?? []) {
      out[v] = overrides[v] ?? SAMPLE_VALUES[v] ?? "";
    }
    return out;
  }, [template, overrides]);

  if (!template) return null;

  const renderedSubject = fillTemplate(template.subject ?? "", overrides);
  const renderedBody = fillTemplate(template.body_html ?? "", overrides);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] p-0 overflow-hidden">
        <DialogHeader className="px-6 pt-6">
          <DialogTitle>Preview: {template.name}</DialogTitle>
          <DialogDescription>
            Voorbeeld van hoe deze e-mail eruit ziet met testdata. Pas
            variabelen aan om de uitkomst te checken.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-[260px_1fr] gap-0 border-t">
          {/* Variables panel */}
          <div className="border-r bg-slate-50/60 max-h-[70vh] overflow-y-auto p-4 space-y-3">
            <div className="text-xs font-medium uppercase tracking-wide text-slate-500">
              Variabelen
            </div>
            {(template.variables ?? []).length === 0 ? (
              <p className="text-sm text-slate-500">Geen variabelen.</p>
            ) : (
              (template.variables ?? []).map((v) => (
                <div key={v} className="space-y-1">
                  <Label className="text-xs font-mono">{`{{${v}}}`}</Label>
                  <Input
                    value={initialValues[v] ?? ""}
                    onChange={(e) =>
                      setOverrides((prev) => ({ ...prev, [v]: e.target.value }))
                    }
                    className="h-8 text-xs"
                  />
                </div>
              ))
            )}
          </div>

          {/* Email preview */}
          <ScrollArea className="max-h-[70vh]">
            <div className="p-6 space-y-4">
              <div className="rounded-md border bg-white">
                <div className="border-b px-4 py-3 space-y-1">
                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <Badge variant="outline" className="text-[10px]">
                      Onderwerp
                    </Badge>
                  </div>
                  <div className="font-medium text-slate-900">
                    {renderedSubject}
                  </div>
                </div>
                <div className="px-4 py-2 text-xs text-slate-500 border-b bg-slate-50">
                  Van: Bureau Vlieland &lt;info@bureauvlieland.nl&gt; · Aan:{" "}
                  {overrides.partner_name ||
                    SAMPLE_VALUES.partner_name}{" "}
                  &lt;partner@voorbeeld.nl&gt;
                </div>
                <iframe
                  title="Email preview"
                  className="w-full min-h-[480px] bg-white"
                  sandbox=""
                  srcDoc={`<!doctype html><html><head><meta charset="utf-8"><style>body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#0f172a;margin:0;padding:16px;line-height:1.5;font-size:14px}a{color:#2563eb}</style></head><body>${renderedBody}</body></html>`}
                />
              </div>
            </div>
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  );
}
