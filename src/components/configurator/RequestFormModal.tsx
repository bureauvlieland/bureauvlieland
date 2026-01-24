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
import { getBlockById, getProviderById, calculateBureauFee, groupBlocksByType, type BuildingBlock, type CartItemDetail } from "@/data/configuratorMockData";
import { CheckCircle, Loader2, Building2, Users2, Info, AlertCircle, ExternalLink, Clock, MessageSquare } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface RequestFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  cartItems: CartItemDetail[];
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
  const [successBlocks, setSuccessBlocks] = useState<BuildingBlock[]>([]);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    company: "",
    notes: "",
  });

  const blocks = cartItems
    .map((item) => getBlockById(item.blockId))
    .filter(Boolean) as BuildingBlock[];
  const bureauFee = calculateBureauFee(numberOfPeople);
  const groupedBlocks = groupBlocksByType(blocks);

  // Helper to get cart item detail by blockId
  const getCartItem = (blockId: string): CartItemDetail | undefined => {
    return cartItems.find((item) => item.blockId === blockId);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const blocksWithDetails = cartItems.map((item) => {
        const block = getBlockById(item.blockId);
        const provider = getProviderById(block?.providerId || "");
        return {
          id: block?.id || "",
          name: block?.name || "",
          category: block?.category || "",
          provider: block?.provider || "",
          providerId: block?.providerId || "",
          providerEmail: provider?.email || "",
          priceIndication: block?.priceIndication || "",
          priceNote: block?.priceNote,
          blockType: block?.blockType || "partner",
          externalUrl: block?.externalUrl,
          preferredTime: item.preferredTime,
          itemNotes: item.notes,
        };
      });

      const { data, error } = await supabase.functions.invoke("send-program-request", {
        body: {
          name: formData.name,
          email: formData.email,
          phone: formData.phone,
          company: formData.company,
          notes: formData.notes,
          numberOfPeople,
          selectedDate: selectedDate ? format(selectedDate, "d MMMM yyyy", { locale: nl }) : undefined,
          bureauFee,
          blocks: blocksWithDetails,
        },
      });

      if (error) throw error;

      setSuccessBlocks(blocks);
      setIsSuccess(true);

      toast({
        title: "Aanvraag verzonden!",
        description: "Check je inbox voor de bevestigingsmail.",
      });
    } catch (error: any) {
      console.error("Error sending program request:", error);
      toast({
        title: "Er ging iets mis",
        description: error.message || "Probeer het later opnieuw of neem direct contact met ons op.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const handleClose = () => {
    if (isSuccess) {
      setIsSuccess(false);
      setSuccessBlocks([]);
      setFormData({
        name: "",
        email: "",
        phone: "",
        company: "",
        notes: "",
      });
    }
    onClose();
  };

  // Render block with time/notes
  const renderBlockDetail = (block: BuildingBlock) => {
    const cartItem = getCartItem(block.id);
    return (
      <li key={block.id} className="py-1">
        <span className="font-medium">{block.name}</span>
        <span className="text-muted-foreground"> → {block.provider}</span>
        {cartItem?.preferredTime && (
          <span className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
            <Clock className="h-3 w-3" />
            Gewenste tijd: {cartItem.preferredTime}
          </span>
        )}
        {cartItem?.notes && (
          <span className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
            <MessageSquare className="h-3 w-3" />
            {cartItem.notes.length > 50 ? cartItem.notes.substring(0, 50) + "..." : cartItem.notes}
          </span>
        )}
      </li>
    );
  };

  // Success screen with external links for self-arranged items
  if (isSuccess) {
    const selfArrangedBlocks = successBlocks.filter((b) => b.blockType === "self_arranged");
    
    return (
      <Dialog open={isOpen} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-md">
          <div className="flex flex-col items-center justify-center py-6 text-center">
            <CheckCircle className="h-16 w-16 text-green-500 mb-4" />
            <h3 className="text-2xl font-semibold mb-2">Aanvraag verzonden!</h3>
            <p className="text-muted-foreground mb-4">
              Check je inbox voor de bevestigingsmail met alle details.
            </p>
            
            {selfArrangedBlocks.length > 0 && (
              <div className="w-full bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 rounded-lg p-4 mt-2 text-left">
                <p className="font-medium text-amber-900 dark:text-amber-100 mb-2 flex items-center gap-2">
                  <ExternalLink className="h-4 w-4" />
                  Zelf te regelen
                </p>
                <p className="text-sm text-amber-800 dark:text-amber-200 mb-3">
                  Onderstaande onderdelen regel je zelf:
                </p>
                <ul className="space-y-2">
                  {selfArrangedBlocks.map((block) => (
                    <li key={block.id}>
                      {block.externalUrl ? (
                        <a
                          href={block.externalUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-primary hover:underline flex items-center gap-1"
                        >
                          → {block.name} ({block.provider})
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      ) : (
                        <span className="text-sm text-muted-foreground">
                          → {block.name} ({block.provider})
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            
            <Button onClick={handleClose} className="mt-6">
              Sluiten
            </Button>
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
              <p className="font-medium text-blue-900 dark:text-blue-100 mb-2">Dit is een vrijblijvende aanvraag</p>
              <ul className="text-blue-800 dark:text-blue-200 space-y-1">
                <li>• Je betaalt nu nog niets – facturatie volgt pas na bevestiging van een activiteit</li>
                <li>• Prijzen zijn indicatief (per persoon of per activiteit, afhankelijk van de aanbieder)</li>
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
                    {groupedBlocks.bureau.map((block) => renderBlockDetail(block))}
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
                    {groupedBlocks.partner.map((block) => renderBlockDetail(block))}
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
