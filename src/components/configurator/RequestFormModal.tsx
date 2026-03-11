import { useState } from "react";
import { Link } from "react-router-dom";
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
import { 
  groupBlocksByType, 
  type BuildingBlock, 
  type CartItemDetail 
} from "@/types/buildingBlock";
import { usePublishedBuildingBlocks, getBlockById } from "@/hooks/useBuildingBlocks";
import { CheckCircle, Loader2, Building2, Info, AlertCircle, ExternalLink, MessageSquare, ArrowRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { generateCustomerToken } from "@/types/programRequest";
import { trackProgramRequestSubmitted } from "@/lib/analytics";
import { getEntryPage, inferEventTypeFromPath } from "@/lib/entryPageTracker";

// Event type options for the dropdown
const EVENT_TYPE_OPTIONS = [
  { value: "bedrijfsuitje", label: "Bedrijfsuitje" },
  { value: "teamuitje", label: "Teamuitje / Teambuilding" },
  { value: "heisessie", label: "Heisessie / MT-dag" },
  { value: "incentive", label: "Incentive reis" },
  { value: "zakelijk_evenement", label: "Zakelijk evenement" },
  { value: "bruiloft", label: "Bruiloft" },
  { value: "familieweekend", label: "Familieweekend" },
  { value: "groepsweekend", label: "Groepsweekend" },
  { value: "jubileum", label: "Jubileum" },
  { value: "anders", label: "Anders" },
] as const;

interface RequestFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  cartItems: CartItemDetail[];
  numberOfPeople: number;
  selectedDate: Date | undefined;
  selectedDates?: Date[];
}

export const RequestFormModal = ({
  isOpen,
  onClose,
  cartItems,
  numberOfPeople,
  selectedDate,
  selectedDates = [],
}: RequestFormModalProps) => {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [successBlocks, setSuccessBlocks] = useState<BuildingBlock[]>([]);
  const [customerToken, setCustomerToken] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    company: "",
    notes: "",
    eventType: "",
  });

  // Pre-fill event type based on entry page
  const entryPage = getEntryPage();
  const inferredEventType = entryPage ? inferEventTypeFromPath(entryPage.path) : null;

  // Fetch blocks from database
  const { data: allBlocks = [] } = usePublishedBuildingBlocks();

  const blocks = cartItems
    .map((item) => getBlockById(allBlocks, item.blockId))
    .filter(Boolean) as BuildingBlock[];
  const groupedBlocks = groupBlocksByType(blocks);

  // Helper to get cart item detail by blockId
  const getCartItem = (blockId: string): CartItemDetail | undefined => {
    return cartItems.find((item) => item.blockId === blockId);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // Generate customer token
      const token = generateCustomerToken();
      
      const blocksWithDetails = cartItems.map((item) => {
        const block = getBlockById(allBlocks, item.blockId);
        return {
          id: block?.id || "",
          name: block?.name || "",
          category: block?.category || "",
          provider: block?.provider?.name || "Bureau Vlieland",
          providerId: block?.provider_id || "",
          providerEmail: block?.provider?.email || "",
          blockType: block?.block_type || "partner",
          externalUrl: block?.external_url,
          blockType: block?.block_type || "partner",
          externalUrl: block?.external_url,
          preferredTime: item.preferredTime,
          itemNotes: item.notes,
          dayIndex: item.dayIndex ?? 0,
        };
      });

      // Format dates for the request
      const effectiveDates = selectedDates.length > 0 ? selectedDates : (selectedDate ? [selectedDate] : []);
      const formattedDates = effectiveDates.map(d => format(d, "d MMMM yyyy", { locale: nl }));
      const isoDates = effectiveDates.map(d => d.toISOString().split('T')[0]);
      
      // Create program request in database
      // Event type is stored as description metadata, program_type is always 'self_service' for configurator
      const finalEventType = formData.eventType || inferredEventType || 'niet_gespecificeerd';
      
      const { data: requestData, error: insertError } = await supabase
        .from("program_requests")
        .insert({
          customer_token: token,
          customer_name: formData.name,
          customer_email: formData.email,
          customer_phone: formData.phone,
          customer_company: formData.company || null,
          number_of_people: numberOfPeople,
          selected_dates: isoDates,
          general_notes: formData.notes || null,
          program_type: 'self_service',
          program_description: finalEventType,
        })
        .select()
        .single();

      if (insertError) throw insertError;

      // Create program request items
      const itemsToInsert = blocksWithDetails.map((block) => {
        const fullBlock = getBlockById(allBlocks, block.id);
        return {
          request_id: requestData.id,
          block_id: block.id,
          block_name: block.name,
          block_category: block.category,
          provider_name: block.provider,
          provider_id: block.providerId,
          provider_email: block.providerEmail || null,
          block_type: block.blockType,
          price_indication: block.priceIndication || null,
          day_index: block.dayIndex,
          preferred_time: block.preferredTime || null,
          customer_notes: block.itemNotes || null,
          status: "pending",
          price_type: fullBlock?.price_type || "per_person",
          external_url: block.externalUrl || null,
        };
      });

      const { error: itemsError } = await supabase
        .from("program_request_items")
        .insert(itemsToInsert);

      if (itemsError) throw itemsError;

      // Log creation in history
      await supabase.from("program_request_history").insert({
        request_id: requestData.id,
        action: "created",
        actor: "customer",
        actor_name: formData.name,
        new_value: { items_count: blocksWithDetails.length },
      });

      // Send emails via edge function
      const { error } = await supabase.functions.invoke("send-program-request", {
        body: {
          name: formData.name,
          email: formData.email,
          phone: formData.phone,
          company: formData.company,
          notes: formData.notes,
          numberOfPeople,
          selectedDate: formattedDates[0], // For backwards compatibility
          selectedDates: formattedDates,
          numberOfDays: effectiveDates.length,
          bureauFee: 0,
          blocks: blocksWithDetails,
          customerToken: token,
          origin: window.location.origin, // For test mode detection
        },
      });

      if (error) throw error;

      // Track conversion event with event type and entry page
      const indicativeValue = calculateIndicativeTotal(blocks, numberOfPeople);
      trackProgramRequestSubmitted({
        value: indicativeValue,
        numberOfPeople,
        numberOfDays: effectiveDates.length,
        eventType: finalEventType,
        entryPage: entryPage?.path || 'direct',
        utmSource: entryPage?.utm_source,
        utmMedium: entryPage?.utm_medium,
        utmCampaign: entryPage?.utm_campaign,
        items: blocksWithDetails.map(b => ({
          id: b.id,
          name: b.name,
          category: b.category,
          provider: b.provider,
        })),
      });

      setSuccessBlocks(blocks);
      setCustomerToken(token);
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
      setCustomerToken(null);
      setFormData({
        name: "",
        email: "",
        phone: "",
        company: "",
        notes: "",
        eventType: "",
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
    const selfArrangedBlocks = successBlocks.filter((b) => b.block_type === "self_arranged");
    
    return (
      <Dialog open={isOpen} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-md">
          <div className="flex flex-col items-center justify-center py-6 text-center">
            <CheckCircle className="h-16 w-16 text-green-500 mb-4" />
            <h3 className="text-2xl font-semibold mb-2">Aanvraag verzonden!</h3>
            <p className="text-muted-foreground mb-4">
              Check je inbox voor de bevestigingsmail met alle details.
            </p>
            
            {/* Customer portal link */}
            {customerToken && (
              <div className="w-full bg-primary/10 border border-primary/20 rounded-lg p-4 mt-2 text-left">
                <p className="font-medium text-foreground mb-2 flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-primary" />
                  Volg uw aanvraag
                </p>
                <p className="text-sm text-muted-foreground mb-3">
                  Bekijk de status van uw activiteiten en voer eventuele wijzigingen door:
                </p>
                <Link to={`/mijn-programma/${customerToken}`} onClick={handleClose}>
                  <Button className="w-full">
                    Bekijk uw programma
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
              </div>
            )}
            
            {selfArrangedBlocks.length > 0 && (
              <div className="w-full bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 rounded-lg p-4 mt-4 text-left">
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
                      {block.external_url ? (
                        <a
                          href={block.external_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-primary hover:underline flex items-center gap-1"
                        >
                          → {block.name} ({block.provider?.name || "Externe aanbieder"})
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      ) : (
                        <span className="text-sm text-muted-foreground">
                          → {block.name} ({block.provider?.name || "Externe aanbieder"})
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            
            <Button onClick={handleClose} variant="outline" className="mt-6">
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
            Vul uw gegevens in zodat we contact kunnen opnemen om de details te bespreken.
          </DialogDescription>
        </DialogHeader>

        {/* Process explanation */}
        <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900 rounded-lg p-4 mb-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="font-medium text-blue-900 dark:text-blue-100 mb-2">Dit is een vrijblijvende aanvraag</p>
              <ul className="text-blue-800 dark:text-blue-200 space-y-1">
                <li>• U betaalt nu nog niets</li>
                <li>• Wij controleren beschikbaarheid bij de aanbieders</li>
                <li>• U ontvangt een voorstel met definitieve prijzen</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Summary grouped by invoice type */}
        <div className="bg-muted/50 rounded-lg p-4 mb-4">
          <h4 className="font-medium mb-3">Uw geselecteerde onderdelen:</h4>
          
          <div className="space-y-3 text-sm">
            {/* Bureau Vlieland */}
            {(groupedBlocks.bureau.length > 0 || groupedBlocks.partner.length > 0) && (
              <div className="flex items-start gap-2">
                <Building2 className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                <div>
                  <span className="font-medium">Activiteiten & catering:</span>
                  <ul className="text-muted-foreground mt-1">
                    {groupedBlocks.bureau.map((block) => renderBlockDetail(block))}
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
              <span className="text-muted-foreground">Datum(s): </span>
              <span className="font-medium">
                {selectedDates.length > 0 
                  ? selectedDates.map((d, i) => (
                      <span key={i}>
                        {i > 0 && ", "}
                        {format(d, "d MMM", { locale: nl })}
                      </span>
                    ))
                  : selectedDate
                    ? format(selectedDate, "d MMMM yyyy", { locale: nl })
                    : "Nog niet gekozen"}
              </span>
              {selectedDates.length > 1 && (
                <span className="text-muted-foreground ml-1">
                  ({selectedDates.length} dagen)
                </span>
              )}
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
                placeholder="Uw volledige naam"
              />
            </div>
            <div>
              <Label htmlFor="company">Bedrijf / Organisatie</Label>
              <Input
                id="company"
                name="company"
                value={formData.company}
                onChange={handleChange}
                placeholder="Naam van uw bedrijf"
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
                placeholder="uw@email.nl"
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

          {/* Event type dropdown */}
          <div>
            <Label htmlFor="eventType">Type uitje (optioneel)</Label>
            <Select
              value={formData.eventType || inferredEventType || ""}
              onValueChange={(value) => setFormData(prev => ({ ...prev, eventType: value }))}
            >
              <SelectTrigger id="eventType">
                <SelectValue placeholder="Selecteer type uitje..." />
              </SelectTrigger>
              <SelectContent>
                {EVENT_TYPE_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
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
              placeholder="Specifieke wensen, dieetwensen, toegankelijkheid, etc."
              className="min-h-[80px]"
              maxLength={2000}
            />
          </div>

          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Verzenden...
              </>
            ) : (
              <>
                Aanvraag versturen
                <ArrowRight className="ml-2 h-4 w-4" />
              </>
            )}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};
