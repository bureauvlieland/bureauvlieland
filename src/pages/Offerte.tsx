import { useState, useRef, useEffect } from "react";
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
import { QuoteChatAssistant } from "@/components/QuoteChatAssistant";

const formSchema = z.object({
  name: z.string().min(2, "Naam is verplicht").max(100, "Maximaal 100 karakters"),
  company: z.string().max(100, "Maximaal 100 karakters").optional(),
  email: z.string().email("Ongeldig email adres").max(255, "Maximaal 255 karakters"),
  phone: z.string().min(10, "Ongeldig telefoonnummer").max(20, "Maximaal 20 karakters"),
  numberOfPeople: z.string().min(1, "Aantal personen is verplicht"),
  startDate: z.string().min(1, "Gewenste startdatum is verplicht"),
  numberOfDays: z.string().min(1, "Aantal dagen is verplicht"),
  budgetPerPerson: z.string().min(1, "Budget indicatie is verplicht"),
  description: z.string().max(2000, "Maximaal 2000 karakters").optional(),
});

type FormValues = z.infer<typeof formSchema>;

export default function Offerte() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const formRef = useRef<HTMLDivElement>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      company: "",
      email: "",
      phone: "",
      numberOfPeople: "",
      startDate: "",
      numberOfDays: "",
      budgetPerPerson: "",
      description: "",
    },
  });

  const handleChatToQuote = (chatSummary: string) => {
    // Scroll to form
    setTimeout(() => {
      formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 100);
    
    toast({
      title: "Chat info beschikbaar",
      description: "Vul het formulier in met je contactgegevens en evenement details.",
    });
  };

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
          <div className="max-w-3xl mx-auto" ref={formRef}>
            <div className="text-center mb-12">
              <h1 className="text-4xl md:text-5xl font-bold mb-4 text-foreground">
                Offerte Aanvragen
              </h1>
              <p className="text-lg text-muted-foreground">
                Vul onderstaand formulier in en ontvang binnen 5 werkdagen een op maat gemaakte offerte
              </p>
            </div>

            <div className="bg-card rounded-lg shadow-lg p-6 md:p-8">
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Naam *</FormLabel>
                          <FormControl>
                            <Input placeholder="Voor- en achternaam" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="company"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Bedrijfsnaam</FormLabel>
                          <FormControl>
                            <Input placeholder="Optioneel" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField
                      control={form.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email *</FormLabel>
                          <FormControl>
                            <Input type="email" placeholder="naam@voorbeeld.nl" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="phone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Telefoon *</FormLabel>
                          <FormControl>
                            <Input type="tel" placeholder="06 12345678" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="border-t pt-6">
                    <h3 className="text-lg font-semibold mb-4">Evenement Details</h3>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <FormField
                        control={form.control}
                        name="numberOfPeople"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Aantal personen *</FormLabel>
                            <FormControl>
                              <Input type="number" placeholder="Bijv. 25" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="startDate"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Gewenste startdatum *</FormLabel>
                            <FormControl>
                              <Input type="date" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                      <FormField
                        control={form.control}
                        name="numberOfDays"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Aantal dagen *</FormLabel>
                            <FormControl>
                              <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <SelectTrigger>
                                  <SelectValue placeholder="Selecteer aantal dagen" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="1">1 dag</SelectItem>
                                  <SelectItem value="2">2 dagen</SelectItem>
                                  <SelectItem value="3">3 dagen</SelectItem>
                                  <SelectItem value="4">4 dagen</SelectItem>
                                  <SelectItem value="5+">5+ dagen</SelectItem>
                                </SelectContent>
                              </Select>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="budgetPerPerson"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Budget indicatie p.p. *</FormLabel>
                            <FormControl>
                              <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <SelectTrigger>
                                  <SelectValue placeholder="Selecteer budget range" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="€50-€100">€50 - €100</SelectItem>
                                  <SelectItem value="€100-€150">€100 - €150</SelectItem>
                                  <SelectItem value="€150-€200">€150 - €200</SelectItem>
                                  <SelectItem value="€200-€300">€200 - €300</SelectItem>
                                  <SelectItem value="€300+">€300+</SelectItem>
                                </SelectContent>
                              </Select>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>

                  <div className="border-t pt-6">
                    <FormField
                      control={form.control}
                      name="description"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Omschrijving / Bijzondere wensen</FormLabel>
                          <FormControl>
                            <Textarea 
                              placeholder="Vertel ons meer over jullie evenement, doelstellingen, of bijzondere wensen..." 
                              className="min-h-[120px]"
                              {...field} 
                            />
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

      <QuoteChatAssistant onUseForQuote={handleChatToQuote} />
      <Footer />
    </>
  );
}
