import { useState, useEffect } from "react";
import DOMPurify from "dompurify";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Save, Eye, Code, Variable } from "lucide-react";

interface EmailTemplate {
  id: string;
  name: string;
  description: string | null;
  subject: string;
  body_html: string;
  variables: string[];
  is_active: boolean;
}

interface EmailTemplateSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  template: EmailTemplate | null;
  onSave: (template: Partial<EmailTemplate> & { id: string }) => void;
  isSaving: boolean;
}

export function EmailTemplateSheet({
  open,
  onOpenChange,
  template,
  onSave,
  isSaving,
}: EmailTemplateSheetProps) {
  const [subject, setSubject] = useState("");
  const [bodyHtml, setBodyHtml] = useState("");
  const [isActive, setIsActive] = useState(true);

  useEffect(() => {
    if (template) {
      setSubject(template.subject);
      setBodyHtml(template.body_html);
      setIsActive(template.is_active);
    }
  }, [template]);

  if (!template) return null;

  const handleSave = () => {
    onSave({
      id: template.id,
      subject,
      body_html: bodyHtml,
      is_active: isActive,
    });
  };

  // Generate preview HTML with sample values
  const generatePreview = () => {
    let preview = bodyHtml;
    const sampleValues: Record<string, string> = {
      customer_name: "Jan de Vries",
      customer_company: "Acme B.V.",
      customer_email: "jan@acme.nl",
      customer_phone: "06-12345678",
      number_of_people: "25",
      number_of_guests: "25",
      portal_url: "https://bureauvlieland.nl/mijn-programma/abc123",
      activity_name: "Zeehondentocht",
      partner_name: "Vlieland Outdoor Center",
      quoted_price: "35,00",
      status_note: "Graag voor 14:00 verzamelen bij de haven.",
      cancellation_reason: "Datum past niet meer.",
      accommodation_name: "Hotel Seeduyn",
      price_total: "2.450,00",
      valid_until: "15 maart 2026",
      arrival_date: "1 april 2026",
      departure_date: "3 april 2026",
      special_requests: "Vegetarisch ontbijt voor 3 gasten.",
      invite_url: "https://bureauvlieland.nl/partner/uitnodiging/xyz",
      budget: "€75-100",
      description: "We zoeken een actief bedrijfsuitje voor 25 medewerkers.",
    };

    // Replace variables with sample values
    Object.entries(sampleValues).forEach(([key, value]) => {
      preview = preview.replace(new RegExp(`\\{\\{${key}\\}\\}`, "g"), value);
    });

    // Remove Handlebars conditionals for preview
    preview = preview.replace(/\{\{#if\s+\w+\}\}/g, "");
    preview = preview.replace(/\{\{\/if\}\}/g, "");

    return preview;
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-2xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{template.name}</SheetTitle>
          <SheetDescription>
            {template.description || "Bewerk de inhoud van deze email template."}
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-6 mt-6">
          {/* Active toggle */}
          <div className="flex items-center justify-between">
            <Label htmlFor="is-active">Template actief</Label>
            <Switch
              id="is-active"
              checked={isActive}
              onCheckedChange={setIsActive}
            />
          </div>

          {/* Subject */}
          <div className="space-y-2">
            <Label htmlFor="subject">Onderwerp</Label>
            <Input
              id="subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Email onderwerp..."
            />
          </div>

          {/* Variables info */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Variable className="h-4 w-4 text-slate-500" />
              <Label className="text-sm text-slate-500">Beschikbare variabelen</Label>
            </div>
            <div className="flex flex-wrap gap-1">
              {template.variables.map((variable) => (
                <Badge
                  key={variable}
                  variant="outline"
                  className="text-xs font-mono cursor-pointer hover:bg-slate-100"
                  onClick={() => {
                    navigator.clipboard.writeText(`{{${variable}}}`);
                  }}
                  title="Klik om te kopiëren"
                >
                  {`{{${variable}}}`}
                </Badge>
              ))}
            </div>
            <p className="text-xs text-slate-400">
              Klik op een variabele om te kopiëren. Gebruik {`{{#if variable}}...{{/if}}`} voor conditionele tekst.
            </p>
          </div>

          {/* Body with tabs for code/preview */}
          <Tabs defaultValue="code" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="code" className="flex items-center gap-2">
                <Code className="h-4 w-4" />
                HTML
              </TabsTrigger>
              <TabsTrigger value="preview" className="flex items-center gap-2">
                <Eye className="h-4 w-4" />
                Voorbeeld
              </TabsTrigger>
            </TabsList>
            <TabsContent value="code" className="mt-4">
              <Textarea
                value={bodyHtml}
                onChange={(e) => setBodyHtml(e.target.value)}
                placeholder="<h1>Email content...</h1>"
                className="font-mono text-sm min-h-[400px]"
              />
            </TabsContent>
            <TabsContent value="preview" className="mt-4">
              <div
                className="border rounded-lg p-4 min-h-[400px] bg-white prose prose-sm max-w-none"
                dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(generatePreview(), {
                  ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'h1', 'h2', 'h3', 'h4', 'ul', 'ol', 'li', 'a', 'table', 'tr', 'td', 'th', 'span', 'div', 'img'],
                  ALLOWED_ATTR: ['href', 'style', 'class', 'src', 'alt'],
                }) }}
              />
            </TabsContent>
          </Tabs>

          {/* Save button */}
          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Annuleren
            </Button>
            <Button onClick={handleSave} disabled={isSaving}>
              <Save className="h-4 w-4 mr-2" />
              {isSaving ? "Opslaan..." : "Opslaan"}
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
