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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { nl } from "date-fns/locale";
import { getBlockById, calculateBureauFee } from "@/data/configuratorMockData";
import { CheckCircle, Loader2 } from "lucide-react";

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
    numberOfDays: "1",
    notes: "",
  });

  const blocks = cartItems.map((id) => getBlockById(id)).filter(Boolean);
  const bureauFee = calculateBureauFee(numberOfPeople);

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
        numberOfDays: "1",
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

        {/* Summary */}
        <div className="bg-muted/50 rounded-lg p-4 mb-4">
          <h4 className="font-medium mb-2">Samenvatting</h4>
          <div className="grid grid-cols-2 gap-2 text-sm">
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
            <div className="col-span-2">
              <span className="text-muted-foreground">Geselecteerd: </span>
              <span className="font-medium">
                {blocks.map((b) => b?.name).join(", ")}
              </span>
            </div>
            <div className="col-span-2">
              <span className="text-muted-foreground">Bureau fee: </span>
              <span className="font-medium">€ {bureauFee}</span>
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
            <Label htmlFor="numberOfDays">Aantal dagen</Label>
            <Select
              value={formData.numberOfDays}
              onValueChange={(value) =>
                setFormData((prev) => ({ ...prev, numberOfDays: value }))
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecteer aantal dagen" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">1 dag (dagtocht)</SelectItem>
                <SelectItem value="2">2 dagen (1 overnachting)</SelectItem>
                <SelectItem value="3">3 dagen (2 overnachtingen)</SelectItem>
                <SelectItem value="4+">4+ dagen</SelectItem>
              </SelectContent>
            </Select>
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
