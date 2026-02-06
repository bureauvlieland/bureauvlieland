
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
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
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { toast } from "sonner";
import { CalendarIcon, Loader2, Mail, Phone, Send, FileText } from "lucide-react";
import { cn } from "@/lib/utils";
import { nl } from "date-fns/locale";
import { useProjectCommunications } from "@/hooks/useProjectCommunications";
import { COMMUNICATION_TYPE_OPTIONS, type CommunicationType, type CommunicationDirection } from "@/types/projectCommunication";

const formSchema = z.object({
  communication_type: z.enum(["email_in", "email_out", "phone", "note"]),
  subject: z.string().optional(),
  content: z.string().min(1, "Inhoud is verplicht"),
  contact_name: z.string().optional(),
  contact_email: z.string().email().optional().or(z.literal("")),
  communication_date: z.date(),
});

type FormData = z.infer<typeof formSchema>;

interface AddCommunicationSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  requestId?: string;
  accommodationId?: string;
  defaultContactName?: string;
  defaultContactEmail?: string;
}

export function AddCommunicationSheet({
  open,
  onOpenChange,
  requestId,
  accommodationId,
  defaultContactName,
  defaultContactEmail,
}: AddCommunicationSheetProps) {
  const { createCommunication, isCreating } = useProjectCommunications({
    requestId,
    accommodationId,
  });

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      communication_type: "note",
      subject: "",
      content: "",
      contact_name: defaultContactName || "",
      contact_email: defaultContactEmail || "",
      communication_date: new Date(),
    },
  });

  const communicationType = form.watch("communication_type");

  const getDirection = (type: CommunicationType): CommunicationDirection => {
    switch (type) {
      case "email_in":
        return "inbound";
      case "email_out":
        return "outbound";
      case "phone":
        return "inbound"; // Default, could be either
      case "note":
        return "internal";
      default:
        return "internal";
    }
  };

  const onSubmit = async (data: FormData) => {
    try {
      await createCommunication({
        request_id: requestId || null,
        accommodation_id: accommodationId || null,
        communication_type: data.communication_type as CommunicationType,
        direction: getDirection(data.communication_type as CommunicationType),
        subject: data.subject || undefined,
        content: data.content,
        contact_name: data.contact_name || undefined,
        contact_email: data.contact_email || undefined,
        communication_date: data.communication_date.toISOString(),
      });

      toast.success("Communicatie toegevoegd");
      form.reset({
        communication_type: "note",
        subject: "",
        content: "",
        contact_name: defaultContactName || "",
        contact_email: defaultContactEmail || "",
        communication_date: new Date(),
      });
      onOpenChange(false);
    } catch (error) {
      console.error("Error creating communication:", error);
      toast.error("Fout bij toevoegen communicatie");
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "email_in":
        return <Mail className="h-4 w-4" />;
      case "email_out":
        return <Send className="h-4 w-4" />;
      case "phone":
        return <Phone className="h-4 w-4" />;
      case "note":
        return <FileText className="h-4 w-4" />;
      default:
        return null;
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-md overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Communicatie loggen</SheetTitle>
          <SheetDescription>
            Voeg een email, telefoongesprek of notitie toe aan dit project.
          </SheetDescription>
        </SheetHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 mt-6">
            <FormField
              control={form.control}
              name="communication_type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Type</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecteer type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {COMMUNICATION_TYPE_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          <div className="flex items-center gap-2">
                            {getTypeIcon(option.value)}
                            {option.label}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="communication_date"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Datum</FormLabel>
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
                            format(field.value, "d MMMM yyyy, HH:mm", { locale: nl })
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
                        disabled={(date) => date > new Date()}
                      />
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />

            {(communicationType === "email_in" || communicationType === "email_out" || communicationType === "phone") && (
              <>
                <FormField
                  control={form.control}
                  name="contact_name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Contactpersoon</FormLabel>
                      <FormControl>
                        <Input placeholder="Naam van de contactpersoon" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {(communicationType === "email_in" || communicationType === "email_out") && (
                  <FormField
                    control={form.control}
                    name="contact_email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input
                            type="email"
                            placeholder="email@voorbeeld.nl"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}
              </>
            )}

            {(communicationType === "email_in" || communicationType === "email_out") && (
              <FormField
                control={form.control}
                name="subject"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Onderwerp</FormLabel>
                    <FormControl>
                      <Input placeholder="Onderwerp van de email" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <FormField
              control={form.control}
              name="content"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    {communicationType === "note" ? "Notitie" : "Samenvatting / Inhoud"}
                  </FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder={
                        communicationType === "note"
                          ? "Schrijf je notitie..."
                          : "Korte samenvatting van de communicatie..."
                      }
                      className="min-h-[120px]"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                className="flex-1"
              >
                Annuleren
              </Button>
              <Button type="submit" disabled={isCreating} className="flex-1">
                {isCreating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Toevoegen
              </Button>
            </div>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  );
}
