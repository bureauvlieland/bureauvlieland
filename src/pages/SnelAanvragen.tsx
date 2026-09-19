import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Helmet } from "react-helmet";
import { format } from "date-fns";
import { nl } from "date-fns/locale";
import { CalendarIcon, CalendarOff, Plus, Trash2, Users } from "lucide-react";

import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import {
  Container,
  EmptyState,
  FormField,
  FunnelHead,
  Section,
  SectionHeader,
  StepperBar,
  WizardFooter,
  type StepperStep,
} from "@/components/system";
import { useScrollOnStepChange } from "@/hooks/useScrollOnStepChange";

import { useCart } from "@/contexts/CartContext";
import { usePublishedBuildingBlocks, getBlockById } from "@/hooks/useBuildingBlocks";
import { AddActivitySheet } from "@/components/customer-portal/AddActivitySheet";
import { ExitIntentDraftDialog } from "@/components/configurator/ExitIntentDraftDialog";
import { CheckoutContactForm } from "@/components/configurator/CheckoutContactForm";
import { CheckoutSuccess } from "@/components/configurator/CheckoutSuccess";
import { categoryLabels } from "@/types/buildingBlock";

type Phase = "select" | "contact" | "success";

const STEPS: StepperStep[] = [
  { key: "select", label: "Activiteiten" },
  { key: "contact", label: "Gegevens" },
  { key: "success", label: "Versturen" },
];

const SKIP_DEFAULTS = new Set(["boot-enkel-heen", "boot-enkel-terug", "boot-retour", "fiets-huur"]);

const SnelAanvragen = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { data: allBlocks = [] } = usePublishedBuildingBlocks();

  const {
    cartItems,
    numberOfPeople,
    selectedDates,
    addToCart,
    removeFromCart,
    updateItem,
    setNumberOfPeople,
    setSelectedDate,
    isInCart,
  } = useCart();

  const [phase, setPhase] = useState<Phase>("select");
  const [addSheetOpen, setAddSheetOpen] = useState(false);
  const [customerToken, setCustomerToken] = useState<string | null>(null);
  const handledRef = useRef<string | null>(null);
  const stepperRef = useRef<HTMLDivElement>(null);
  useScrollOnStepChange(stepperRef, phase);

  // Handle ?block=<id> deep link
  useEffect(() => {
    const blockId = searchParams.get("block");
    if (!blockId || handledRef.current === blockId) return;
    handledRef.current = blockId;

    // Clear any program-mode defaults (ferry/bike) from prior visits
    cartItems.forEach((i) => {
      if (SKIP_DEFAULTS.has(i.blockId)) removeFromCart(i.blockId);
    });

    if (!isInCart(blockId)) {
      const added = addToCart(blockId, 0);
      if (added) toast({ title: "Toegevoegd aan uw aanvraag", duration: 1500 });
    }

    searchParams.delete("block");
    setSearchParams(searchParams, { replace: true });
  }, [searchParams, cartItems, isInCart, addToCart, removeFromCart, setSearchParams, toast]);

  // Filter out any ferry/fiets defaults from view
  const visibleItems = cartItems.filter((i) => !SKIP_DEFAULTS.has(i.blockId));
  const date = selectedDates[0];

  const handleAdd = (blockId: string) => {
    if (!isInCart(blockId)) {
      const added = addToCart(blockId, 0);
      if (added) toast({ title: "Toegevoegd", duration: 1200 });
    }
    setAddSheetOpen(false);
  };

  const handleSubmitToContact = () => {
    if (visibleItems.length === 0) {
      toast({ title: "Voeg eerst een activiteit toe", variant: "destructive" });
      return;
    }
    if (!date) {
      toast({ title: "Kies een gewenste datum", variant: "destructive" });
      return;
    }
    setPhase("contact");
  };

  const handleSuccess = (token: string) => {
    setCustomerToken(token);
    setPhase("success");
  };

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>Activiteit los aanvragen | Bureau Vlieland</title>
        <meta
          name="description"
          content="Vraag een of enkele losse activiteiten aan op Vlieland. Eenvoudig, zonder verplicht meerdaags programma."
        />
        <link rel="canonical" href="https://bureauvlieland.nl/snel-aanvragen" />
      </Helmet>
      <Navigation />

      <main id="main-content">
        {phase !== "success" && (
          <FunnelHead
            eyebrow="Losse aanvraag"
            title="Vraag uw activiteit aan"
            intro="Kies een datum, vul uw gegevens in en wij komen met een passend voorstel. Geen heel programma nodig."
          />
        )}
        <StepperBar ref={stepperRef} steps={STEPS} current={phase} />

        <Section spacing="compact">
          <Container size="prose">
            {phase === "select" && (
              <div className="space-y-6">
                <Card className="p-5 sm:p-6">
                  <SectionHeader as="h2" size="md" weight="medium" title="Wanneer en met hoeveel personen?" className="mb-5" />
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <Label htmlFor="snel-datum" className="flex items-center gap-1">
                        Gewenste datum
                        <span className="text-destructive" aria-hidden="true">
                          *
                        </span>
                      </Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            id="snel-datum"
                            type="button"
                            variant="outline"
                            className={cn("w-full justify-start font-normal", !date && "text-muted-foreground")}
                          >
                            <CalendarIcon aria-hidden="true" />
                            {date ? format(date, "EEEE d MMMM yyyy", { locale: nl }) : "Kies een datum"}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={date}
                            onSelect={(d) => setSelectedDate(d ?? undefined)}
                            locale={nl}
                            disabled={{ before: new Date() }}
                            initialFocus
                            className={cn("p-3 pointer-events-auto")}
                          />
                        </PopoverContent>
                      </Popover>
                    </div>
                    <FormField label="Aantal personen" htmlFor="snel-personen" required leading={<Users />}>
                      <Input
                        type="number"
                        min={1}
                        max={500}
                        value={numberOfPeople}
                        onChange={(e) => setNumberOfPeople(Math.max(1, parseInt(e.target.value) || 1))}
                      />
                    </FormField>
                  </div>
                </Card>

                <Card className="p-5 sm:p-6">
                  <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
                    <SectionHeader as="h2" size="md" weight="medium" title={`Activiteiten (${visibleItems.length})`} />
                    {visibleItems.length > 0 && (
                      <Button type="button" size="sm" variant="outline" onClick={() => setAddSheetOpen(true)}>
                        <Plus aria-hidden="true" />
                        Activiteit toevoegen
                      </Button>
                    )}
                  </div>

                  {visibleItems.length === 0 ? (
                    <EmptyState
                      icon={<CalendarOff />}
                      title="Nog geen activiteit gekozen"
                      description="Voeg een of meer activiteiten toe die u wilt aanvragen."
                      action={
                        <Button type="button" variant="outline" size="sm" onClick={() => setAddSheetOpen(true)}>
                          <Plus aria-hidden="true" />
                          Activiteit toevoegen
                        </Button>
                      }
                    />
                  ) : (
                    <ul className="space-y-3">
                      {visibleItems.map((item) => {
                        const block = getBlockById(allBlocks, item.blockId);
                        if (!block) return null;
                        return (
                          <li key={item.blockId} className="rounded-lg border border-border bg-card p-3">
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0">
                                <p className="truncate text-sm font-medium leading-tight">{block.name}</p>
                                <p className="mt-0.5 text-xs text-muted-foreground">
                                  {categoryLabels[block.category] ?? block.category}
                                  {block.provider?.name && ` · ${block.provider.name}`}
                                </p>
                              </div>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="shrink-0 text-muted-foreground hover:text-destructive"
                                onClick={() => removeFromCart(item.blockId)}
                                aria-label={`${block.name} verwijderen`}
                              >
                                <Trash2 aria-hidden="true" />
                              </Button>
                            </div>
                            <div className="mt-2 flex items-center gap-2">
                              <Label htmlFor={`time-${item.blockId}`} className="text-xs text-muted-foreground">
                                Gewenste tijd (optioneel)
                              </Label>
                              <Input
                                id={`time-${item.blockId}`}
                                type="time"
                                value={item.preferredTime ?? ""}
                                onChange={(e) => updateItem(item.blockId, { preferredTime: e.target.value || null })}
                                className="h-8 w-32"
                              />
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </Card>

                <WizardFooter
                  onBack={() => navigate("/bouwstenen")}
                  backLabel="Terug naar alle bouwstenen"
                  onNext={handleSubmitToContact}
                  nextLabel="Volgende: uw gegevens"
                  note={
                    <>
                      Liever een compleet programma?{" "}
                      <Link to="/programma-samenstellen" className="underline underline-offset-2 hover:text-foreground">
                        Stel zelf uw programma samen
                      </Link>
                      .
                    </>
                  }
                />

                <AddActivitySheet
                  open={addSheetOpen}
                  onOpenChange={setAddSheetOpen}
                  existingBlockIds={cartItems.map((i) => i.blockId)}
                  onAddActivity={handleAdd}
                />
              </div>
            )}

            {phase === "contact" && (
              <CheckoutContactForm
                cartItems={visibleItems}
                numberOfPeople={numberOfPeople}
                selectedDates={date ? [date] : []}
                onBack={() => setPhase("select")}
                onSuccess={handleSuccess}
              />
            )}

            {phase === "success" && customerToken && (
              <CheckoutSuccess customerToken={customerToken} cartItems={visibleItems} />
            )}
          </Container>
        </Section>
      </main>

      <Footer />
      <ExitIntentDraftDialog />
    </div>
  );
};

export default SnelAanvragen;
