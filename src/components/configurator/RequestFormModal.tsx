import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { nl } from "date-fns/locale";
import { getBlockById, calculateBureauFee, groupBlocksByType, type BuildingBlock } from "@/data/configuratorMockData";
import { CheckCircle, Loader2, Building2, Users2, Info, AlertCircle } from "lucide-react";

interface RequestFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  cartItems: string[];
  numberOfPeople: number;
  selectedDate: Date | undefined;
}

export const RequestFormModal = ({
  isOpen,
  onClose,
  cartItems,
  numberOfPeople,
  selectedDate,
}: RequestFormModalProps) => {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    company: "",
    notes: "",
  });

  const blocks = cartItems.map((id) => getBlockById(id)).filter(Boolean) as BuildingBlock[];
  const bureauFee = calculateBureauFee(numberOfPeople);
  const groupedBlocks = groupBlocksByType(blocks);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    // Simulate API call (will be replaced with actual edge function)
    await new Promise((resolve) => setTimeout(resolve, 1500));

    setIsSubmitting(false);
    setIsSuccess(true);

    toast({
      title: "Aanvraag verzonden!",
      description: "We nemen binnen 24 uur contact met je op.",
    });

    // Reset after showing success
    setTimeout(() => {
      setIsSuccess(false);
      setFormData({
        name: "",
        email: "",
        phone: "",
        company: "",
        notes: "",
      });
      onClose();
    }, 2000);
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  if (isSuccess) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-md">
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <CheckCircle className="h-16 w-16 text-green-500 mb-4" />
            <h3 className="text-2xl font-semibold mb-2">Aanvraag verzonden!</h3>
            <p className="text-muted-foreground">
              We nemen binnen 24 uur contact met je op om de details te bespreken.
            </p>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Programma Aanvraag Versturen</DialogTitle>
          <DialogDescription>
            Vul je gegevens in zodat we contact kunnen opnemen om de details te bespreken.
          </DialogDescription>
        </DialogHeader>

        {/* Process explanation */}
        <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900 rounded-lg p-4 mb-4">
            <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="font-medium text-blue-900 dark:text-blue-100 mb-2">Zo werkt de facturatie:</p>
              <ul className="text-blue-800 dark:text-blue-200 space-y-1">
                <li>• <strong>Activiteiten</strong> worden apart gefactureerd door de betreffende aanbieders</li>
                <li>• Elke aanbieder bevestigt apart – je ontvangt dus mogelijk meerdere facturen</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Summary grouped by invoice type */}
        <div className="bg-muted/50 rounded-lg p-4 mb-4">
          <h4 className="font-medium mb-3">Je aanvraag wordt verstuurd naar:</h4>
          
          <div className="space-y-3 text-sm">
            {/* Bureau Vlieland */}
            {(groupedBlocks.bureau.length > 0 || groupedBlocks.partner.length > 0) && (
              <div className="flex items-start gap-2">
                <Building2 className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                <div>
                  <span className="font-medium">Bureau Vlieland factureert:</span>
                  <ul className="text-muted-foreground mt-1">
                    {groupedBlocks.bureau.map((block) => (
                      <li key={block.id}>• {block.name} ({block.provider})</li>
                    ))}
                    <li>• Handling fee + coördinatie (€ {bureauFee})</li>
                  </ul>
                </div>
              </div>
            )}

            {/* Partners */}
            {groupedBlocks.partner.length > 0 && (
              <div className="flex items-start gap-2">
                <Users2 className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                <div>
                  <span className="font-medium">Wordt aangevraagd bij aanbieders:</span>
                  <ul className="text-muted-foreground mt-1">
                    {groupedBlocks.partner.map((block) => (
                      <li key={block.id}>• {block.name} → {block.provider}</li>
                    ))}
                  </ul>
                </div>
              </div>
            )}

            {/* Self-arranged */}
            {groupedBlocks.self_arranged.length > 0 && (
              <div className="flex items-start gap-2">
                <Info className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-medium text-amber-700 dark:text-amber-500">Zelf te regelen (links volgen in bevestigingsmail):</span>
                  <ul className="text-muted-foreground mt-1">
                    {groupedBlocks.self_arranged.map((block) => (
                      <li key={block.id}>• {block.name}</li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
          </div>

          {/* Meta info */}
          <div className="grid grid-cols-2 gap-2 text-sm mt-4 pt-3 border-t">
            <div>
              <span className="text-muted-foreground">Datum: </span>
              <span className="font-medium">
                {selectedDate
                  ? format(selectedDate, "d MMMM yyyy", { locale: nl })
                  : "Nog niet gekozen"}
              </span>
            </div>
            <div>
              <span className="text-muted-foreground">Aantal personen: </span>
              <span className="font-medium">{numberOfPeople}</span>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="name">Naam *</Label>
              <Input
                id="name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                required
                placeholder="Je volledige naam"
              />
            </div>
            <div>
              <Label htmlFor="company">Bedrijf / Organisatie</Label>
              <Input
                id="company"
                name="company"
                value={formData.company}
                onChange={handleChange}
                placeholder="Naam van je bedrijf"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="email">E-mailadres *</Label>
              <Input
                id="email"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleChange}
                required
                placeholder="je@email.nl"
              />
            </div>
            <div>
              <Label htmlFor="phone">Telefoonnummer *</Label>
              <Input
                id="phone"
                name="phone"
                type="tel"
                value={formData.phone}
                onChange={handleChange}
                required
                placeholder="06-12345678"
              />
            </div>
          </div>


          <div>
            <Label htmlFor="notes">Opmerkingen / Wensen</Label>
            <Textarea
              id="notes"
              name="notes"
              value={formData.notes}
              onChange={handleChange}
              placeholder="Bijzonderheden, dieetwensen, speciale verzoeken..."
              rows={4}
            />
          </div>

          <div className="flex gap-3 pt-4">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1">
              Annuleren
            </Button>
            <Button type="submit" disabled={isSubmitting} className="flex-1">
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Verzenden...
                </>
              ) : (
                "Aanvraag versturen"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
