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
import { CalendarIcon, Loader2, Plus, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { nl } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { logAdminActivity, AdminActions, EntityTypes } from "@/lib/adminLogger";
import { resolveBureauInvoiceType } from "@/lib/bureauInvoiceType";
import { reportError } from "@/lib/errorReporting";
import type { ProjectInvoiceSpec } from "@/lib/projectInvoiceSpec";
import { chooseStoredLines } from "@/lib/bureauInvoiceLines";

const formSchema = z.object({
  invoice_number: z.string().min(1, "Factuurnummer is verplicht"),
  invoice_date: z.date({ required_error: "Factuurdatum is verplicht" }),
  invoice_type: z.enum(["partial", "final", "credit"]),
  amount_excl_vat: z.coerce.number().min(0.01, "Bedrag moet groter zijn dan 0"),
  vat_amount: z.coerce.number(),
  description: z.string().optional(),
});

type FormData = z.infer<typeof formSchema>;

interface RegisterBureauInvoiceDialogProps {
  isOpen: boolean;
  onClose: () => void;
  requestId: string;
  suggestedAmount?: number;
  /** Btw-groepen van het voorgestelde bedrag (het openstaande deel van het
   *  project, pro rata uit `scaleVatGroups`). De invulvelden volgen hun som. */
  suggestedVatGroups?: { rate: number; exclVat: number; vatAmount: number }[];
  /** Bedrag dat nog open staat op het project (projecttotaal − reeds gefactureerd). */
  outstandingAmount?: number;
  /** Projecttotaal incl. BTW. */
  projectTotal?: number;
  /** Reeds gefactureerd bedrag incl. BTW. */
  alreadyInvoiced?: number;
  /** Specificatie van het project; dekt de factuur het hele project, dan worden haar regels bevroren bij de factuur. */
  spec?: ProjectInvoiceSpec | null;
  onSuccess: () => void;
}

export const RegisterBureauInvoiceDialog = ({
  isOpen,
  onClose,
  requestId,
  suggestedAmount = 0,
  suggestedVatGroups = [],
  outstandingAmount,
  projectTotal,
  alreadyInvoiced,
  spec = null,
  onSuccess,
}: RegisterBureauInvoiceDialogProps) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [manualVatLines, setManualVatLines] = useState<{ rate: number; exclVat: number; vatAmount: number }[]>([]);
  const [overrideConfirmed, setOverrideConfirmed] = useState(false);

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

  // Bij openen: voorstel = het openstaande deel van het project.
  useEffect(() => {
    if (!isOpen || !requestId) return;
    form.setValue(
      "invoice_type",
      resolveBureauInvoiceType({
        invoiceAmountInclVat: suggestedAmount,
        projectTotalInclVat: projectTotal,
        outstandingAmountInclVat: outstandingAmount,
        alreadyInvoicedInclVat: alreadyInvoiced,
      }),
    );
    // Prefill: de btw-groepen van het openstaande bedrag; de invulvelden
    // volgen hun som (effect hieronder). Zonder groepen: vlak 21 %.
    const initialVatLines = suggestedVatGroups.length > 0
      ? suggestedVatGroups.map((line) => ({ ...line }))
      : [{ rate: 21, exclVat: Math.round((suggestedAmount / 1.21) * 100) / 100, vatAmount: Math.round((suggestedAmount - suggestedAmount / 1.21) * 100) / 100 }];
    setManualVatLines(initialVatLines);
  }, [isOpen, requestId, suggestedAmount, suggestedVatGroups, outstandingAmount, projectTotal, alreadyInvoiced, form]);

  useEffect(() => {
    const excl = Math.round(manualVatLines.reduce((sum, line) => sum + Number(line.exclVat || 0), 0) * 100) / 100;
    const vat = Math.round(manualVatLines.reduce((sum, line) => sum + Number(line.vatAmount || 0), 0) * 100) / 100;
    form.setValue("amount_excl_vat", excl, { shouldValidate: true });
    form.setValue("vat_amount", vat, { shouldValidate: true });
  }, [manualVatLines, form]);

  const amountExclVat = parseFloat(String(form.watch("amount_excl_vat"))) || 0;
  const vatAmount = parseFloat(String(form.watch("vat_amount"))) || 0;
  const totalInclVat = amountExclVat + vatAmount;
  const invoiceType = form.watch("invoice_type");

  const hasOutstanding = outstandingAmount != null && outstandingAmount > 0;
  const tolerance = 0.01;
  const exceedsOutstanding = hasOutstanding && totalInclVat > (outstandingAmount as number) + tolerance;
  // Voor 'partial' is overschrijden blokkerend tenzij expliciet bevestigd; voor 'final'/'credit' alleen waarschuwen.
  const blockingExceed = exceedsOutstanding && invoiceType === "partial" && !overrideConfirmed;

  const onSubmit = async (data: FormData) => {
    if (blockingExceed) {
      toast.error("Bedrag overschrijdt het openstaand bedrag. Vink de bevestiging aan of pas het bedrag aan.");
      return;
    }
    const confirmMsg = `Je staat op het punt € ${totalInclVat.toLocaleString("nl-NL", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} incl. BTW te registreren als factuur ${data.invoice_number}.\n\nDoorgaan?`;
    if (!window.confirm(confirmMsg)) return;

    setIsSubmitting(true);
    try {
      const { data: session } = await supabase.auth.getSession();

      // Insert bureau invoice
      const { data: inserted, error: invoiceError } = await supabase
        .from("bureau_invoices")
        .insert({
          request_id: requestId,
          invoice_number: data.invoice_number,
          invoice_date: format(data.invoice_date, "yyyy-MM-dd"),
          amount_excl_vat: data.amount_excl_vat,
          vat_amount: data.vat_amount,
          invoice_type: data.invoice_type,
          description: data.description || null,
          created_by: session.session?.user.id,
        })
        .select("id")
        .single();

      if (invoiceError) throw invoiceError;

      // Regels bevriezen: de hele specificatie als deze factuur het hele
      // project dekt, anders een samenvatting per btw-tarief.
      const storedLines = chooseStoredLines({
        spec,
        invoiceType: data.invoice_type,
        invoiceNumber: data.invoice_number,
        amountInclVat: totalInclVat,
        alreadyInvoicedInclVat: alreadyInvoiced ?? 0,
        vatGroups: manualVatLines.map((l) => ({
          rate: Number(l.rate),
          exclVat: Number(l.exclVat) || 0,
          vatAmount: Number(l.vatAmount) || 0,
          inclVat: (Number(l.exclVat) || 0) + (Number(l.vatAmount) || 0),
        })),
        subDescription: data.description || null,
      });
      if (inserted?.id && storedLines.length > 0) {
        const { error: linesError } = await supabase
          .from("bureau_invoice_lines")
          .insert(storedLines.map((line) => ({ ...line, invoice_id: inserted.id })));
        if (linesError) reportError(linesError, { where: "RegisterBureauInvoiceDialog: factuurregels opslaan" });
      }

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

      // Note: completion_status is now automatically recalculated by a database trigger
      // on bureau_invoices (recalculate_program_completion_status). No manual update needed.

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
      setOverrideConfirmed(false);
      onSuccess();
      onClose();
    } catch (error) {
      reportError(error, { where: "RegisterBureauInvoiceDialog: Error registering invoice" });
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
            {(hasOutstanding || projectTotal != null) && (
              <div className="rounded-md border border-primary/30 bg-primary/5 p-3 space-y-1 text-sm">
                {projectTotal != null && (
                  <div className="flex justify-between text-muted-foreground">
                    <span>Projecttotaal</span>
                    <span className="tabular-nums">
                      €{(projectTotal ?? 0).toLocaleString("nl-NL", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                )}
                {alreadyInvoiced != null && alreadyInvoiced > 0 && (
                  <div className="flex justify-between text-muted-foreground">
                    <span>Reeds gefactureerd</span>
                    <span className="tabular-nums">
                      −€{alreadyInvoiced.toLocaleString("nl-NL", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                )}
                {hasOutstanding && (
                  <div className="flex justify-between font-semibold text-primary pt-1 border-t border-primary/20">
                    <span>Openstaand (te factureren)</span>
                    <span className="tabular-nums text-base">
                      €{(outstandingAmount ?? 0).toLocaleString("nl-NL", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                )}
              </div>
            )}
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

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <FormLabel>BTW-uitsplitsing</FormLabel>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setManualVatLines((lines) => [...lines, { rate: 0, exclVat: 0, vatAmount: 0 }])}
                >
                  <Plus className="h-4 w-4" /> Regel
                </Button>
              </div>
              <div className="grid grid-cols-[70px_1fr_1fr_36px] gap-2 text-xs text-muted-foreground">
                <span>Tarief %</span><span>Grondslag excl.</span><span>BTW-bedrag</span><span />
              </div>
              {manualVatLines.map((line, index) => (
                <div key={`${index}-${line.rate}`} className="grid grid-cols-[70px_1fr_1fr_36px] gap-2">
                  <Input type="number" step="0.01" value={line.rate} onChange={(event) => setManualVatLines((lines) => lines.map((item, itemIndex) => itemIndex === index ? { ...item, rate: Number(event.target.value) } : item))} />
                  <Input type="number" step="0.01" value={line.exclVat} onChange={(event) => setManualVatLines((lines) => lines.map((item, itemIndex) => itemIndex === index ? { ...item, exclVat: Number(event.target.value) } : item))} />
                  <Input type="number" step="0.01" value={line.vatAmount} onChange={(event) => setManualVatLines((lines) => lines.map((item, itemIndex) => itemIndex === index ? { ...item, vatAmount: Number(event.target.value) } : item))} />
                  <Button type="button" variant="ghost" size="icon" disabled={manualVatLines.length === 1} onClick={() => setManualVatLines((lines) => lines.filter((_, itemIndex) => itemIndex !== index))} aria-label="BTW-regel verwijderen">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>

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
                        readOnly
                        {...field}
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
                      <Input type="number" step="0.01" {...field} readOnly />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="p-3 bg-muted rounded-md space-y-1 text-sm">
              {suggestedVatGroups.length > 0 && (
                <>
                  <p className="text-xs text-muted-foreground font-medium">BTW-uitsplitsing projecttotaal:</p>
                  {suggestedVatGroups.map((g) => (
                    <div key={g.rate} className="flex justify-between text-muted-foreground">
                      <span>BTW {g.rate}%</span>
                      <span className="tabular-nums">
                        excl. €{g.exclVat.toLocaleString("nl-NL", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} · BTW €{g.vatAmount.toLocaleString("nl-NL", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
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

            {exceedsOutstanding && (
              <div className="rounded-md border border-destructive/50 bg-destructive/10 p-3 space-y-2 text-sm">
                <p className="font-semibold text-destructive">
                  Let op: dit bedrag (€{totalInclVat.toLocaleString("nl-NL", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}) is hoger dan het openstaand bedrag (€{(outstandingAmount ?? 0).toLocaleString("nl-NL", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}).
                </p>
                <p className="text-xs text-muted-foreground">
                  Controleer of je het juiste bedrag invult. Voor een 2e/3e factuur hoor je alleen het <strong>restbedrag</strong> in te vullen, niet het projecttotaal.
                </p>
                {invoiceType === "partial" && (
                  <label className="flex items-start gap-2 text-xs cursor-pointer">
                    <input
                      type="checkbox"
                      checked={overrideConfirmed}
                      onChange={(e) => setOverrideConfirmed(e.target.checked)}
                      className="mt-0.5"
                    />
                    <span>Ja, ik weet zeker dat dit bedrag klopt en ik wil meer factureren dan het openstaand bedrag.</span>
                  </label>
                )}
              </div>
            )}

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
              <Button type="submit" disabled={isSubmitting || blockingExceed}>
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
