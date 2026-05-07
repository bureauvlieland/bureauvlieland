import { useEffect, useState } from "react";
import { z } from "zod";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

const customerSchema = z.object({
  customer_name: z.string().trim().min(1, "Naam is verplicht").max(120, "Naam is te lang"),
  customer_email: z.string().trim().email("Ongeldig e-mailadres").max(255),
  customer_phone: z.string().trim().min(4, "Telefoonnummer is te kort").max(40, "Telefoonnummer is te lang"),
  customer_company: z.string().trim().max(160, "Bedrijfsnaam is te lang").optional().or(z.literal("")),
});

export interface EditableCustomer {
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  customer_company: string | null;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customer: EditableCustomer | null;
  onSaved: () => void;
}

export const EditCustomerDialog = ({ open, onOpenChange, customer, onSaved }: Props) => {
  const [form, setForm] = useState<EditableCustomer>({
    customer_name: "",
    customer_email: "",
    customer_phone: "",
    customer_company: "",
  });
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (customer) {
      setForm({
        customer_name: customer.customer_name ?? "",
        customer_email: customer.customer_email ?? "",
        customer_phone: customer.customer_phone ?? "",
        customer_company: customer.customer_company ?? "",
      });
    }
  }, [customer]);

  const handleSave = async () => {
    if (!customer) return;

    const parsed = customerSchema.safeParse(form);
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Ongeldige invoer");
      return;
    }

    const oldEmail = customer.customer_email;
    const newValues = {
      customer_name: parsed.data.customer_name,
      customer_email: parsed.data.customer_email,
      customer_phone: parsed.data.customer_phone,
      customer_company: parsed.data.customer_company || null,
    };

    setIsSaving(true);
    try {
      // Update all program_requests for this customer (matched by old email)
      const { error: prErr } = await supabase
        .from("program_requests")
        .update(newValues)
        .eq("customer_email", oldEmail);
      if (prErr) throw prErr;

      // Mirror to accommodation_requests for the same email
      const { error: arErr } = await supabase
        .from("accommodation_requests")
        .update(newValues)
        .eq("customer_email", oldEmail);
      if (arErr) throw arErr;

      toast.success("Klantgegevens bijgewerkt");
      onOpenChange(false);
      onSaved();
    } catch (err) {
      console.error("Error updating customer:", err);
      toast.error("Bijwerken mislukt — probeer het opnieuw");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Klantgegevens bewerken</DialogTitle>
          <DialogDescription>
            Wijzigingen worden toegepast op alle aanvragen en logies-aanvragen van deze klant.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="cust-name">Naam</Label>
            <Input
              id="cust-name"
              value={form.customer_name}
              onChange={(e) => setForm({ ...form, customer_name: e.target.value })}
              maxLength={120}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="cust-company">Bedrijf (optioneel)</Label>
            <Input
              id="cust-company"
              value={form.customer_company ?? ""}
              onChange={(e) => setForm({ ...form, customer_company: e.target.value })}
              maxLength={160}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="cust-email">E-mail</Label>
            <Input
              id="cust-email"
              type="email"
              value={form.customer_email}
              onChange={(e) => setForm({ ...form, customer_email: e.target.value })}
              maxLength={255}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="cust-phone">Telefoon</Label>
            <Input
              id="cust-phone"
              value={form.customer_phone}
              onChange={(e) => setForm({ ...form, customer_phone: e.target.value })}
              maxLength={40}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSaving}>
            Annuleren
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? "Opslaan..." : "Opslaan"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
