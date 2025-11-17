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
  email: z.string().email("Ongeldig email adres").max(255, "Maximaal 255 karakters"),
  phone: z.string().min(10, "Ongeldig telefoonnummer").max(20, "Maximaal 20 karakters"),
  message: z.string().min(10, "Minimaal 10 karakters").max(1000, "Maximaal 1000 karakters"),
});

type FormValues = z.infer<typeof formSchema>;

export default function Offerte() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const formRef = useRef<HTMLDivElement>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      message: "",
    },
  });

  const handleChatToQuote = (chatSummary: string) => {
    // Pre-fill the message field with chat summary
    form.setValue("message", chatSummary);
    
    // Scroll to form
    setTimeout(() => {
      formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 100);
    
    toast({
      title: "Chat info overgenomen",
      description: "Je kunt de gegevens nog aanvullen of aanpassen voordat je verzendt.",
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
              <p className="text-lg text-muted-foreground mb-4">
                Vul onderstaand formulier in voor een snelle aanvraag
              </p>
              <p className="text-sm text-muted-foreground">
                💬 Wil je liever advies over programma's? Chat met onze AI assistent (rechtsonder)
              </p>
            </div>

            <div className="bg-card rounded-lg shadow-lg p-6 md:p-8">
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
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

                  <FormField
                    control={form.control}
                    name="message"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Vertel ons over je evenement *</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Bijv: Teamuitje voor 25 personen, 1 dag in juni, sportief thema..."
                            className="resize-none min-h-[120px]"
                            {...field}
                          />
                        </FormControl>
                        <FormDescription>
                          Aantal personen, datum(s), type evenement, voorkeuren
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

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
