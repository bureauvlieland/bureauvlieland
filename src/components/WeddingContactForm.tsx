import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Send, Loader2, Heart } from "lucide-react";
import { z } from "zod";

const formSchema = z.object({
  name: z.string().trim().min(1, "Naam is verplicht").max(100, "Naam is te lang"),
  email: z.string().trim().email("Ongeldig e-mailadres").max(255, "E-mail is te lang"),
  phone: z.string().trim().max(20, "Telefoonnummer is te lang").optional(),
  weddingDate: z.string().optional(),
  guestCount: z.string().optional(),
  message: z.string().trim().min(1, "Bericht is verplicht").max(2000, "Bericht is te lang"),
});

export const WeddingContactForm = () => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    weddingDate: "",
    guestCount: "",
    message: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    // Clear error when user types
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: "" }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    // Validate form data
    const result = formSchema.safeParse(formData);
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      result.error.errors.forEach((err) => {
        if (err.path[0]) {
          fieldErrors[err.path[0] as string] = err.message;
        }
      });
      setErrors(fieldErrors);
      return;
    }

    setIsSubmitting(true);

    try {
      const { error } = await supabase.functions.invoke("send-wedding-inquiry", {
        body: formData,
      });

      if (error) throw error;

      setIsSubmitted(true);
      toast.success("Aanvraag verzonden! Je ontvangt een bevestiging per e-mail.");
    } catch (error: any) {
      console.error("Error submitting form:", error);
      toast.error("Er ging iets mis. Probeer het later opnieuw.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSubmitted) {
    return (
      <div className="text-center py-12">
        <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-primary/10 flex items-center justify-center">
          <Heart className="w-8 h-8 text-primary" />
        </div>
        <h3 className="text-2xl font-display font-bold text-foreground mb-4">
          Bedankt voor jullie aanvraag!
        </h3>
        <p className="text-muted-foreground max-w-md mx-auto">
          Karla neemt zo snel mogelijk contact met jullie op om de mogelijkheden 
          voor jullie droombruiloft op Vlieland te bespreken.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid sm:grid-cols-2 gap-6">
        <div className="space-y-2">
          <Label htmlFor="name">Naam *</Label>
          <Input
            id="name"
            name="name"
            value={formData.name}
            onChange={handleChange}
            placeholder="Jullie namen"
            className={errors.name ? "border-destructive" : ""}
          />
          {errors.name && <p className="text-sm text-destructive">{errors.name}</p>}
        </div>
        <div className="space-y-2">
          <Label htmlFor="email">E-mail *</Label>
          <Input
            id="email"
            name="email"
            type="email"
            value={formData.email}
            onChange={handleChange}
            placeholder="jullie@email.nl"
            className={errors.email ? "border-destructive" : ""}
          />
          {errors.email && <p className="text-sm text-destructive">{errors.email}</p>}
        </div>
      </div>

      <div className="grid sm:grid-cols-2 gap-6">
        <div className="space-y-2">
          <Label htmlFor="phone">Telefoonnummer</Label>
          <Input
            id="phone"
            name="phone"
            type="tel"
            value={formData.phone}
            onChange={handleChange}
            placeholder="06-12345678"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="weddingDate">Gewenste trouwdatum</Label>
          <Input
            id="weddingDate"
            name="weddingDate"
            type="date"
            value={formData.weddingDate}
            onChange={handleChange}
            min={new Date().toISOString().split("T")[0]}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="guestCount">Aantal gasten (indicatie)</Label>
        <Input
          id="guestCount"
          name="guestCount"
          value={formData.guestCount}
          onChange={handleChange}
          placeholder="Bijv. 50-80 personen"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="message">Vertel over jullie droombruiloft *</Label>
        <Textarea
          id="message"
          name="message"
          value={formData.message}
          onChange={handleChange}
          placeholder="Wat zijn jullie wensen? Waar dromen jullie van?"
          rows={5}
          className={errors.message ? "border-destructive" : ""}
        />
        {errors.message && <p className="text-sm text-destructive">{errors.message}</p>}
      </div>

      <Button type="submit" size="lg" className="w-full gap-2" disabled={isSubmitting}>
        {isSubmitting ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin" />
            Versturen...
          </>
        ) : (
          <>
            <Send className="w-5 h-5" />
            Verstuur aanvraag
          </>
        )}
      </Button>
    </form>
  );
};
