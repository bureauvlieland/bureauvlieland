import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
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
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { nl } from "date-fns/locale";
import {
  type BuildingBlock,
  type CartItemDetail,
  categoryLabels,
} from "@/types/buildingBlock";
import { usePublishedBuildingBlocks, getBlockById } from "@/hooks/useBuildingBlocks";
import {
  CheckCircle,
  Loader2,
  ExternalLink,
  ArrowRight,
  Users,
  Calendar,
  Clock,
  MessageSquare,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { generateCustomerToken } from "@/types/programRequest";
import { trackProgramRequestSubmitted } from "@/lib/analytics";
import { getEntryPage, inferEventTypeFromPath } from "@/lib/entryPageTracker";
import { sortCartItemsForDay } from "@/lib/cartSorting";
import { HowItWorksBlock } from "./HowItWorksBlock";

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

interface ReviewAndSubmitSheetProps {
  isOpen: boolean;
  onClose: () => void;
  cartItems: CartItemDetail[];
  numberOfPeople: number;
  selectedDate: Date | undefined;
  selectedDates?: Date[];
  prefillData?: {
    name: string;
    email: string;
    phone: string;
    company: string;
    eventType: string;
  };
}

export const ReviewAndSubmitSheet = ({
  isOpen,
  onClose,
  cartItems,
  numberOfPeople,
  selectedDate,
  selectedDates = [],
  prefillData,
}: ReviewAndSubmitSheetProps) => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [customerToken, setCustomerToken] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(5);
  const [formData, setFormData] = useState({
    name: prefillData?.name || "",
    email: prefillData?.email || "",
    phone: prefillData?.phone || "",
    company: prefillData?.company || "",
    notes: "",
    eventType: prefillData?.eventType || "",
  });

  const entryPage = getEntryPage();
  const inferredEventType = entryPage ? inferEventTypeFromPath(entryPage.path) : null;
  const { data: allBlocks = [] } = usePublishedBuildingBlocks();

  const effectiveDates = selectedDates.length > 0 ? selectedDates : selectedDate ? [selectedDate] : [];

  // Countdown + redirect after success
  useEffect(() => {
    if (!isSuccess || !customerToken) return;
    if (countdown <= 0) {
      navigate(`/mijn-programma/${customerToken}`);
      return;
    }
    const timer = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [isSuccess, customerToken, countdown, navigate]);

  // Group items by day
  const totalDays = effectiveDates.length || 1;
  const getItemsForDay = (dayIndex: number) =>
    sortCartItemsForDay(
      cartItems.filter((item) => (item.dayIndex ?? 0) === dayIndex),
      dayIndex,
      totalDays
    );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
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
          preferredTime: item.preferredTime,
          itemNotes: item.notes,
          dayIndex: item.dayIndex ?? 0,
        };
      });

      const formattedDates = effectiveDates.map((d) =>
        format(d, "d MMMM yyyy", { locale: nl })
      );
      const isoDates = effectiveDates.map((d) => d.toISOString().split("T")[0]);

      const finalEventType =
        formData.eventType || inferredEventType || "niet_gespecificeerd";

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
          program_type: "self_service",
          program_description: finalEventType,
        })
        .select()
        .single();

      if (insertError) throw insertError;

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
          price_indication: null,
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

      await supabase.from("program_request_history").insert({
        request_id: requestData.id,
        action: "created",
        actor: "customer",
        actor_name: formData.name,
        new_value: { items_count: blocksWithDetails.length },
      });

      const { error } = await supabase.functions.invoke(
        "send-program-request",
        {
          body: {
            name: formData.name,
            email: formData.email,
            phone: formData.phone,
            company: formData.company,
            notes: formData.notes,
            numberOfPeople,
            selectedDate: formattedDates[0],
            selectedDates: formattedDates,
            numberOfDays: effectiveDates.length,
            bureauFee: 0,
            blocks: blocksWithDetails,
            customerToken: token,
            origin: window.location.origin,
          },
        }
      );

      if (error) throw error;

      trackProgramRequestSubmitted({
        value: 0,
        numberOfPeople,
        numberOfDays: effectiveDates.length,
        eventType: finalEventType,
        entryPage: entryPage?.path || "direct",
        utmSource: entryPage?.utm_source,
        utmMedium: entryPage?.utm_medium,
        utmCampaign: entryPage?.utm_campaign,
        items: blocksWithDetails.map((b) => ({
          id: b.id,
          name: b.name,
          category: b.category,
          provider: b.provider,
        })),
      });

      setCustomerToken(token);
      setIsSuccess(true);
      setCountdown(5);

      toast({
        title: "Aanvraag verzonden!",
        description: "Check je inbox voor de bevestigingsmail.",
      });
    } catch (error: any) {
      console.error("Error sending program request:", error);
      toast({
        title: "Er ging iets mis",
        description:
          error.message ||
          "Probeer het later opnieuw of neem direct contact met ons op.",
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
      // Navigate immediately on manual close during success
      if (customerToken) {
        navigate(`/mijn-programma/${customerToken}`);
        return;
      }
      setIsSuccess(false);
      setCustomerToken(null);
      setFormData({
        name: prefillData?.name || "",
        email: prefillData?.email || "",
        phone: prefillData?.phone || "",
        company: prefillData?.company || "",
        notes: "",
        eventType: prefillData?.eventType || "",
      });
    }
    onClose();
  };

  // ── Success view ──
  if (isSuccess) {
    const successBlocks = cartItems
      .map((item) => getBlockById(allBlocks, item.blockId))
      .filter(Boolean) as BuildingBlock[];
    const selfArrangedBlocks = successBlocks.filter(
      (b) => b.block_type === "self_arranged"
    );

    return (
      <Sheet open={isOpen} onOpenChange={handleClose}>
        <SheetContent
          side="right"
          className="sm:max-w-lg w-full flex flex-col overflow-y-auto"
        >
          <div className="flex flex-col items-center justify-center py-10 text-center flex-1">
            <CheckCircle className="h-16 w-16 text-green-500 mb-4" />
            <h3 className="text-2xl font-semibold mb-2">Aanvraag verzonden!</h3>
            <p className="text-muted-foreground mb-6">
              Check je inbox voor de bevestigingsmail met alle details.
            </p>

            <p className="text-sm text-muted-foreground mb-4">
              U wordt automatisch doorgestuurd naar uw programmapagina in{" "}
              <span className="font-semibold text-foreground">{countdown}</span>{" "}
              {countdown === 1 ? "seconde" : "seconden"}...
            </p>

            <Button
              onClick={() =>
                customerToken &&
                navigate(`/mijn-programma/${customerToken}`)
              }
              className="gap-2"
            >
              Direct bekijken
              <ArrowRight className="h-4 w-4" />
            </Button>

            {selfArrangedBlocks.length > 0 && (
              <div className="w-full bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 rounded-lg p-4 mt-6 text-left">
                <p className="font-medium text-amber-900 dark:text-amber-100 mb-2 flex items-center gap-2">
                  <ExternalLink className="h-4 w-4" />
                  Zelf te regelen
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
                          → {block.name}
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      ) : (
                        <span className="text-sm text-muted-foreground">
                          → {block.name}
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>
    );
  }

  // ── Main review sheet ──
  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent
        side="right"
        className="sm:max-w-xl w-full flex flex-col overflow-hidden p-0"
      >
        <SheetHeader className="px-6 pt-6 pb-2">
          <SheetTitle>Overzicht en versturen</SheetTitle>
          <SheetDescription>
            Controleer uw programma en vul uw gegevens in om de aanvraag te
            versturen.
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-6 pb-6 space-y-6">
          {/* ── Section 1: Program overview per day ── */}
          <div>
            <h3 className="font-semibold text-sm text-foreground mb-3">
              Uw programma
            </h3>

            {/* Meta */}
            <div className="flex flex-wrap gap-3 text-sm text-muted-foreground mb-4">
              <span className="inline-flex items-center gap-1">
                <Users className="h-3.5 w-3.5" />
                {numberOfPeople} personen
              </span>
              <span className="inline-flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5" />
                {effectiveDates.length === 1
                  ? format(effectiveDates[0], "d MMMM yyyy", { locale: nl })
                  : `${effectiveDates.length} dagen`}
              </span>
            </div>

            {/* Per-day listing */}
            <div className="space-y-4">
              {effectiveDates.map((date, dayIndex) => {
                const dayItems = getItemsForDay(dayIndex);
                if (dayItems.length === 0) return null;
                return (
                  <div key={dayIndex}>
                    {effectiveDates.length > 1 && (
                      <p className="text-xs font-medium text-muted-foreground mb-2">
                        Dag {dayIndex + 1} —{" "}
                        {format(date, "EEEE d MMMM", { locale: nl })}
                      </p>
                    )}
                    <div className="space-y-1.5">
                      {dayItems.map((item) => {
                        const block = getBlockById(allBlocks, item.blockId);
                        if (!block) return null;
                        return (
                          <div
                            key={item.blockId}
                            className="flex items-start gap-3 py-2 px-3 rounded-lg bg-muted/40"
                          >
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-sm leading-tight">
                                {block.name}
                              </p>
                              <div className="flex flex-wrap items-center gap-2 mt-1">
                                {block.duration && (
                                  <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                                    <Clock className="h-3 w-3" />
                                    {block.duration}
                                  </span>
                                )}
                                <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                                  {categoryLabels[block.category]}
                                </Badge>
                                {item.preferredTime && (
                                  <span className="text-xs text-primary font-medium">
                                    {item.preferredTime}
                                  </span>
                                )}
                              </div>
                              {item.notes && (
                                <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                                  <MessageSquare className="h-3 w-3 shrink-0" />
                                  {item.notes}
                                </p>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* ── Section 2: How it works ── */}
          <HowItWorksBlock compact />

          {/* ── Section 3: Contact form ── */}
          <div>
            <h3 className="font-semibold text-sm text-foreground mb-3">
              Uw gegevens
            </h3>
            <form onSubmit={handleSubmit} id="review-form" className="space-y-4">
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

              <div>
                <Label htmlFor="eventType">Type uitje (optioneel)</Label>
                <Select
                  value={formData.eventType || inferredEventType || ""}
                  onValueChange={(value) =>
                    setFormData((prev) => ({ ...prev, eventType: value }))
                  }
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

              <Button
                type="submit"
                className="w-full"
                disabled={isSubmitting}
                size="lg"
              >
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
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};
