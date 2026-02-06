import { useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";

interface ProgramItem {
  block_id: string;
  block_name: string;
  day_index: number;
  preferred_time: string | null;
}

interface SaveAsTemplateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  items: ProgramItem[];
}

const slugify = (text: string) =>
  text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

export const SaveAsTemplateDialog = ({
  open,
  onOpenChange,
  items,
}: SaveAsTemplateDialogProps) => {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isPublished, setIsPublished] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const slug = useMemo(() => slugify(name), [name]);
  const durationDays = useMemo(
    () => (items.length > 0 ? Math.max(...items.map((i) => i.day_index)) + 1 : 1),
    [items]
  );

  const handleSave = async () => {
    if (!name.trim() || !slug) {
      toast.error("Vul een naam in");
      return;
    }

    setIsSaving(true);
    try {
      // Insert template
      const { error: templateError } = await supabase
        .from("program_templates")
        .insert({
          id: slug,
          name: name.trim(),
          short_description: description.trim() || null,
          description: null,
          duration_days: durationDays,
          is_published: isPublished,
          sort_order: 0,
          target_group: null,
          image_url: null,
          indicative_price_pp: null,
        });

      if (templateError) {
        if (templateError.code === "23505") {
          toast.error("Er bestaat al een template met deze ID. Kies een andere naam.");
          return;
        }
        throw templateError;
      }

      // Insert template items
      const templateItems = items.map((item, idx) => ({
        template_id: slug,
        block_id: item.block_id,
        day_index: item.day_index,
        preferred_time: item.preferred_time,
        sort_order: idx,
        notes: null,
      }));

      if (templateItems.length > 0) {
        const { error: itemsError } = await supabase
          .from("program_template_items")
          .insert(templateItems);

        if (itemsError) throw itemsError;
      }

      toast.success("Template opgeslagen!", {
        action: {
          label: "Naar templates",
          onClick: () => navigate("/admin/templates"),
        },
      });

      onOpenChange(false);
      setName("");
      setDescription("");
      setIsPublished(false);
    } catch (error) {
      console.error("Error saving template:", error);
      toast.error("Fout bij opslaan template");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Opslaan als template</DialogTitle>
          <DialogDescription>
            Sla de huidige {items.length} activiteiten op als herbruikbaar voorbeeldprogramma
            ({durationDays} {durationDays === 1 ? "dag" : "dagen"}).
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="template-name">Naam *</Label>
            <Input
              id="template-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="bijv. Actief bedrijfsuitje 2 dagen"
            />
            {slug && (
              <p className="text-xs text-muted-foreground">
                ID: <code className="bg-muted px-1 py-0.5 rounded">{slug}</code>
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="template-desc">Korte beschrijving</Label>
            <Textarea
              id="template-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Omschrijving van het programma..."
              rows={3}
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="template-publish">Direct publiceren</Label>
              <p className="text-xs text-muted-foreground">
                Zichtbaar in de configurator voor klanten
              </p>
            </div>
            <Switch
              id="template-publish"
              checked={isPublished}
              onCheckedChange={setIsPublished}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annuleren
          </Button>
          <Button onClick={handleSave} disabled={!name.trim() || isSaving}>
            {isSaving ? "Opslaan..." : "Opslaan"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
