import { useState } from "react";
import { Helmet } from "react-helmet";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/Footer";

const formSchema = z.object({
  eventType: z.string().min(1, "Selecteer een type evenement"),
  numberOfPeople: z.coerce.number().min(1, "Minimaal 1 persoon").max(1000, "Maximaal 1000 personen"),
  date: z.string().min(1, "Selecteer een datum"),
  catering: z.string().optional(),
  extraWishes: z.string().max(1000, "Maximaal 1000 karakters").optional(),
  name: z.string().min(2, "Naam is verplicht").max(100, "Maximaal 100 karakters"),
  email: z.string().email("Ongeldig email adres").max(255, "Maximaal 255 karakters"),
  phone: z.string().min(10, "Ongeldig telefoonnummer").max(20, "Maximaal 20 karakters"),
  company: z.string().max(100, "Maximaal 100 karakters").optional(),
});

type FormValues = z.infer<typeof formSchema>;

const eventTypes = [
  { value: "teamuitje", label: "Teamuitje" },
  { value: "training", label: "Training / Workshop" },
  { value: "evenement", label: "Evenement" },
  { value: "catering", label: "Catering" },
];

export default function Offerte() {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      eventType: "",
      numberOfPeople: 20,
      date: "",
      catering: "",
      extraWishes: "",
      name: "",
      email: "",
      phone: "",
      company: "",
    },
  });

  const eventType = form.watch("eventType");

  const onSubmit = async (data: FormValues) => {
    setIsSubmitting(true);
    
    try {
      const { data: result, error } = await supabase.functions.invoke(
        "send-quote-request",
        {
          body: data,
        }
      );

      if (error) throw error;

      toast({
        title: "Offerte aanvraag verstuurd!",
        description: "We nemen binnen 5 werkdagen contact met je op.",
      });

      form.reset();
    } catch (error) {
      console.error("Error submitting quote request:", error);
      toast({
        title: "Er ging iets mis",
        description: "Probeer het later opnieuw of neem direct contact op.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <Helmet>
        <title>Offerte Aanvragen - Bureau Vlieland</title>
        <meta
          name="description"
          content="Vraag een vrijblijvende offerte aan voor uw teamuitje, training, evenement of catering op Vlieland. Binnen 5 werkdagen persoonlijk contact."
        />
      </Helmet>

      <Navigation />

      <main className="min-h-screen bg-gradient-to-b from-background to-secondary/20">
        <div className="container mx-auto px-4 py-16 md:py-24">
          <div className="max-w-3xl mx-auto">
            <div className="text-center mb-12">
              <h1 className="text-4xl md:text-5xl font-bold mb-4 text-foreground">
                Offerte Aanvragen
              </h1>
              <p className="text-lg text-muted-foreground">
                Vul onderstaand formulier in en we nemen binnen 5 werkdagen contact met je op
              </p>
            </div>

            <div className="bg-card rounded-lg shadow-lg p-6 md:p-8">
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                  {/* Event Type */}
                  <FormField
                    control={form.control}
                    name="eventType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Type evenement *</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecteer type evenement" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {eventTypes.map((type) => (
                              <SelectItem key={type.value} value={type.value}>
                                {type.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Number of People */}
                  <FormField
                    control={form.control}
                    name="numberOfPeople"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Aantal personen *</FormLabel>
                        <FormControl>
                          <Input type="number" min="1" placeholder="Bijv. 20" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Date */}
                  <FormField
                    control={form.control}
                    name="date"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Gewenste datum of periode *</FormLabel>
                        <FormControl>
                          <Input type="text" placeholder="Bijv. 15 juni 2025 of Week 24" {...field} />
                        </FormControl>
                        <FormDescription>
                          Vul een specifieke datum of periode in
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Catering */}
                  {eventType && (
                    <FormField
                      control={form.control}
                      name="catering"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Catering wensen</FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder="Bijv. lunch buffet, bbq, drankjes, etc."
                              className="resize-none"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}

                  {/* Extra Wishes */}
                  <FormField
                    control={form.control}
                    name="extraWishes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Extra wensen of opmerkingen</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Vertel ons meer over jullie evenement..."
                            className="resize-none min-h-[120px]"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="border-t pt-8">
                    <h3 className="text-xl font-semibold mb-6">Contactgegevens</h3>

                    {/* Name */}
                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem className="mb-4">
                          <FormLabel>Naam *</FormLabel>
                          <FormControl>
                            <Input placeholder="Voor- en achternaam" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Email */}
                    <FormField
                      control={form.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem className="mb-4">
                          <FormLabel>Email *</FormLabel>
                          <FormControl>
                            <Input type="email" placeholder="naam@voorbeeld.nl" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Phone */}
                    <FormField
                      control={form.control}
                      name="phone"
                      render={({ field }) => (
                        <FormItem className="mb-4">
                          <FormLabel>Telefoon *</FormLabel>
                          <FormControl>
                            <Input type="tel" placeholder="06 12345678" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Company */}
                    <FormField
                      control={form.control}
                      name="company"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Bedrijf (optioneel)</FormLabel>
                          <FormControl>
                            <Input placeholder="Bedrijfsnaam" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <Button
                    type="submit"
                    className="w-full"
                    size="lg"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? "Versturen..." : "Offerte Aanvragen"}
                  </Button>
                </form>
              </Form>

              <div className="mt-8 p-4 bg-secondary/20 rounded-lg">
                <p className="text-sm text-muted-foreground text-center">
                  <strong>Let op:</strong> We nemen binnen 5 werkdagen contact met je op. 
                  Voor spoedvragen kun je ons bellen op{" "}
                  <a href="tel:+31562452700" className="text-primary hover:underline">
                    +31 (0)562 45 27 00
                  </a>
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </>
  );
}
