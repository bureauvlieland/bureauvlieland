import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { nl } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { logAdminActivity, AdminActions, EntityTypes } from "@/lib/adminLogger";

const formSchema = z.object({
  invoice_number: z.string().min(1, "Factuurnummer is verplicht"),
  invoice_date: z.date({ required_error: "Factuurdatum is verplicht" }),
  invoice_type: z.enum(["partial", "final", "credit"]),
  amount_excl_vat: z.coerce.number().min(0.01, "Bedrag moet groter zijn dan 0"),
  vat_amount: z.coerce.number().min(0, "BTW kan niet negatief zijn"),
  description: z.string().optional(),
});

type FormData = z.infer<typeof formSchema>;

interface RegisterBureauInvoiceDialogProps {
  isOpen: boolean;
  onClose: () => void;
  requestId: string;
  suggestedAmount?: number;
  onSuccess: () => void;
}

export const RegisterBureauInvoiceDialog = ({
  isOpen,
  onClose,
  requestId,
  suggestedAmount = 0,
  onSuccess,
}: RegisterBureauInvoiceDialogProps) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [vatBreakdown, setVatBreakdown] = useState<{ rate: number; excl: number; vat: number }[]>([]);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      invoice_number: "",
      invoice_date: new Date(),
      invoice_type: "partial",
      amount_excl_vat: Math.round((suggestedAmount / 1.21) * 100) / 100,
      vat_amount: Math.round((suggestedAmount - suggestedAmount / 1.21) * 100) / 100,
      description: "",
    },
  });

  // On open, try to suggest amount + VAT breakdown from billing lines of confirmed items
  useEffect(() => {
    if (!isOpen || !requestId) return;
    (async () => {
      const { data: items } = await supabase
        .from("program_request_items")
        .select("id")
        .eq("request_id", requestId)
        .in("status", ["confirmed", "accepted", "executed"]);
      const itemIds = (items || []).map((i) => i.id);
      if (itemIds.length === 0) {
        setVatBreakdown([]);
        return;
      }
      const { data: lines } = await supabase
        .from("program_item_billing_lines")
        .select("vat_rate, amount_excl_vat, vat_amount, amount_incl_vat")
        .in("item_id", itemIds);
      if (!lines || lines.length === 0) {
        setVatBreakdown([]);
        return;
      }
      // Group by VAT rate
      const byRate: Record<number, { excl: number; vat: number }> = {};
      let totalExcl = 0;
      let totalVat = 0;
      lines.forEach((l) => {
        const r = Number(l.vat_rate);
        if (!byRate[r]) byRate[r] = { excl: 0, vat: 0 };
        byRate[r].excl += Number(l.amount_excl_vat);
        byRate[r].vat += Number(l.vat_amount);
        totalExcl += Number(l.amount_excl_vat);
        totalVat += Number(l.vat_amount);
      });
      const breakdown = Object.entries(byRate)
        .sort(([a], [b]) => Number(a) - Number(b))
        .map(([rate, v]) => ({ rate: Number(rate), excl: v.excl, vat: v.vat }));
      setVatBreakdown(breakdown);
      // Auto-fill form with totals
      form.setValue("amount_excl_vat", Math.round(totalExcl * 100) / 100);
      form.setValue("vat_amount", Math.round(totalVat * 100) / 100);
    })();
  }, [isOpen, requestId, form]);

  const amountExclVat = parseFloat(String(form.watch("amount_excl_vat"))) || 0;
  const vatAmount = parseFloat(String(form.watch("vat_amount"))) || 0;
  const totalInclVat = amountExclVat + vatAmount;

  const onSubmit = async (data: FormData) => {
    setIsSubmitting(true);
    try {
      const { data: session } = await supabase.auth.getSession();

      // Insert bureau invoice
      const { error: invoiceError } = await supabase.from("bureau_invoices").insert({
        request_id: requestId,
        invoice_number: data.invoice_number,
        invoice_date: format(data.invoice_date, "yyyy-MM-dd"),
        amount_excl_vat: data.amount_excl_vat,
        vat_amount: data.vat_amount,
        invoice_type: data.invoice_type,
        description: data.description || null,
        created_by: session.session?.user.id,
      });

      if (invoiceError) throw invoiceError;

      // Add history entry
      await supabase.from("program_request_history").insert({
        request_id: requestId,
        action: `Bureau Vlieland factuur geregistreerd: ${data.invoice_number}`,
        actor: "admin",
        actor_name: "Bureau Vlieland",
        new_value: {
          invoice_number: data.invoice_number,
          amount_incl_vat: totalInclVat,
          type: data.invoice_type,
        },
      });

      // Update completion status — auto-complete when nothing remains outstanding
      const projectedOutstanding = (typeof suggestedAmount === "number" ? suggestedAmount : 0) - totalInclVat;
      const nextStatus = projectedOutstanding <= 0.005 ? "fully_invoiced" : "partially_invoiced";
      const updatePayload: Record<string, unknown> = { completion_status: nextStatus };
      if (nextStatus === "fully_invoiced") {
        updatePayload.completed_at = new Date().toISOString();
        updatePayload.completed_by = session.session?.user.id ?? null;
      }
      await supabase
        .from("program_requests")
        .update(updatePayload)
        .eq("id", requestId);

      await logAdminActivity({
        action: AdminActions.INVOICE_REGISTERED,
        entityType: EntityTypes.REQUEST,
        entityId: requestId,
        details: {
          invoice_number: data.invoice_number,
          amount_incl_vat: totalInclVat,
        },
      });

      toast.success("Factuur geregistreerd");
      form.reset();
      onSuccess();
      onClose();
    } catch (error) {
      console.error("Error registering invoice:", error);
      toast.error("Fout bij registreren factuur");
    } finally {
      setIsSubmitting(false);
    }
  };

  const invoiceTypeLabels = {
    partial: "Deelfactuur",
    final: "Eindfactuur",
    credit: "Creditnota",
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Factuur Registreren</DialogTitle>
          <DialogDescription>
            Registreer een factuur die Bureau Vlieland aan de klant heeft gestuurd.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="invoice_number"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Factuurnummer *</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="BV-2026-0001" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="invoice_date"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Factuurdatum *</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full pl-3 text-left font-normal",
                            !field.value && "text-muted-foreground"
                          )}
                        >
                          {field.value ? (
                            format(field.value, "EEE d MMMM yyyy", { locale: nl })
                          ) : (
                            <span>Selecteer datum</span>
                          )}
                          <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={field.value}
                        onSelect={field.onChange}
                        locale={nl}
                      />
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="invoice_type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Type *</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {Object.entries(invoiceTypeLabels).map(([value, label]) => (
                        <SelectItem key={value} value={value}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="amount_excl_vat"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Bedrag excl. BTW *</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        {...field}
                        onChange={(e) => {
                          field.onChange(e);
                          // Auto-calculate VAT at 21%
                          const excl = parseFloat(e.target.value) || 0;
                          form.setValue("vat_amount", Math.round(excl * 0.21 * 100) / 100);
                        }}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="vat_amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>BTW bedrag *</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="p-3 bg-muted rounded-md space-y-1 text-sm">
              {vatBreakdown.length > 0 && (
                <>
                  <p className="text-xs text-muted-foreground font-medium">Voorstel uit factuurregels:</p>
                  {vatBreakdown.map((b) => (
                    <div key={b.rate} className="flex justify-between text-muted-foreground">
                      <span>BTW {b.rate}%</span>
                      <span className="tabular-nums">
                        excl. €{b.excl.toLocaleString("nl-NL", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} · BTW €{b.vat.toLocaleString("nl-NL", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </div>
                  ))}
                  <div className="border-t my-1" />
                </>
              )}
              <div className="flex justify-between font-semibold">
                <span>Totaal incl. BTW</span>
                <span>
                  €{totalInclVat.toLocaleString("nl-NL", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
            </div>

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Omschrijving</FormLabel>
                  <FormControl>
                    <Textarea {...field} placeholder="Optionele toelichting..." rows={2} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose}>
                Annuleren
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Factuur Opslaan
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};
