import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
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
import { toast } from "sonner";
import { Loader2, Send } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const formSchema = z.object({
  recipientType: z.enum(["custom", "customer", "partner"]),
  recipientEmail: z.string().email("Voer een geldig e-mailadres in"),
  recipientName: z.string().optional(),
  subject: z.string().min(1, "Onderwerp is verplicht"),
  body: z.string().min(1, "Bericht is verplicht"),
});

type FormData = z.infer<typeof formSchema>;

interface Recipient {
  label: string;
  email: string;
  name: string;
  type: "customer" | "partner";
  partnerId?: string;
}

interface SendProjectEmailSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  requestId?: string;
  accommodationId?: string;
  recipients: Recipient[];
  onEmailSent?: () => void;
}

export function SendProjectEmailSheet({
  open,
  onOpenChange,
  requestId,
  accommodationId,
  recipients,
  onEmailSent,
}: SendProjectEmailSheetProps) {
  const [isSending, setIsSending] = useState(false);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      recipientType: recipients.length > 0 ? "customer" : "custom",
      recipientEmail: "",
      recipientName: "",
      subject: "",
      body: "",
    },
  });

  const recipientType = form.watch("recipientType");

  const handleRecipientSelect = (value: string) => {
    if (value === "custom") {
      form.setValue("recipientType", "custom");
      form.setValue("recipientEmail", "");
      form.setValue("recipientName", "");
    } else {
      const recipient = recipients.find((r) => r.email === value);
      if (recipient) {
        form.setValue("recipientType", recipient.type);
        form.setValue("recipientEmail", recipient.email);
        form.setValue("recipientName", recipient.name);
      }
    }
  };

  const onSubmit = async (data: FormData) => {
    setIsSending(true);
    try {
      const selectedRecipient = recipients.find((r) => r.email === data.recipientEmail);

      const { data: result, error } = await supabase.functions.invoke("send-project-email", {
        body: {
          recipientEmail: data.recipientEmail,
          recipientName: data.recipientName || undefined,
          subject: data.subject,
          body: data.body,
          requestId: requestId || undefined,
          accommodationId: accommodationId || undefined,
          partnerId: selectedRecipient?.partnerId || undefined,
        },
      });

      if (error) throw error;

      toast.success(`E-mail verstuurd naar ${data.recipientEmail}`);
      form.reset();
      onOpenChange(false);
      onEmailSent?.();
    } catch (error) {
      console.error("Error sending email:", error);
      toast.error("Fout bij het versturen van de e-mail");
    } finally {
      setIsSending(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Send className="h-5 w-5" />
            E-mail versturen
          </SheetTitle>
          <SheetDescription>
            Verstuur een e-mail vanuit Bureau Vlieland. Het bericht wordt automatisch gelogd bij dit project.
          </SheetDescription>
        </SheetHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 mt-6">
            {/* Recipient selector */}
            <FormItem>
              <FormLabel>Ontvanger</FormLabel>
              <Select
                onValueChange={handleRecipientSelect}
                defaultValue={recipients.length > 0 ? recipients[0].email : "custom"}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecteer ontvanger" />
                </SelectTrigger>
                <SelectContent>
                  {recipients.map((r) => (
                    <SelectItem key={r.email} value={r.email}>
                      {r.label} — {r.email}
                    </SelectItem>
                  ))}
                  <SelectItem value="custom">Ander e-mailadres...</SelectItem>
                </SelectContent>
              </Select>
            </FormItem>

            {recipientType === "custom" && (
              <>
                <FormField
                  control={form.control}
                  name="recipientName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Naam ontvanger</FormLabel>
                      <FormControl>
                        <Input placeholder="Naam" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="recipientEmail"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>E-mailadres</FormLabel>
                      <FormControl>
                        <Input type="email" placeholder="email@voorbeeld.nl" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </>
            )}

            <FormField
              control={form.control}
              name="subject"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Onderwerp</FormLabel>
                  <FormControl>
                    <Input placeholder="Onderwerp van de e-mail" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="body"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Bericht</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Typ uw bericht..."
                      className="min-h-[200px]"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <p className="text-xs text-muted-foreground">
              Het bericht wordt verstuurd vanuit hallo@bureauvlieland.nl met Bureau Vlieland-opmaak.
            </p>

            <div className="flex gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                className="flex-1"
              >
                Annuleren
              </Button>
              <Button type="submit" disabled={isSending} className="flex-1">
                {isSending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Send className="mr-2 h-4 w-4" />
                )}
                Versturen
              </Button>
            </div>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  );
}
