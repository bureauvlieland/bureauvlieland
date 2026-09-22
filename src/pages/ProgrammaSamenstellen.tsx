import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { Helmet } from "react-helmet";
import { BasicsForm, type BasicsFormData } from "@/components/configurator/BasicsForm";
import { ProgramBuilderView } from "@/components/configurator/ProgramBuilderView";
import { Container, Section, SectionHeader, StepperBar } from "@/components/system";
import { useScrollOnStepChange } from "@/hooks/useScrollOnStepChange";
import { wizardStepsFor, nextWizardPhase, previousWizardPhase, type ConfigPhase } from "@/lib/wizardSteps";
import { parseBlocksParam, type BlockPrefill } from "@/lib/referenceCases";
import { trackWizardStep } from "@/lib/analytics";
import { TemplateSelector } from "@/components/configurator/TemplateSelector";
import { CheckoutContactForm } from "@/components/configurator/CheckoutContactForm";
import { CheckoutSuccess } from "@/components/configurator/CheckoutSuccess";
import { DraftRecoveryDialog } from "@/components/configurator/DraftRecoveryDialog";
import { ExitIntentDraftDialog } from "@/components/configurator/ExitIntentDraftDialog";
import { TransportBikesStep } from "@/components/configurator/TransportBikesStep";
import { AccommodationWishStep } from "@/components/configurator/AccommodationWishStep";
import { useCart } from "@/contexts/CartContext";
import { useToast } from "@/hooks/use-toast";
import { useTemplateWithItems } from "@/hooks/useProgramTemplates";
import { usePublishedBuildingBlocks, getBlockById } from "@/hooks/useBuildingBlocks";
import type { CartItemDetail } from "@/types/buildingBlock";
import type { ProgramTemplate } from "@/types/programTemplate";
import {
  planTransportCartOps,
  inferCrossingFromCart,
  WIZARD_TRANSPORT_BLOCK_IDS,
  WATERTAXI_HEEN_ID,
  type TransportPreferences,
  type WizardSituation,
} from "@/lib/programWizardCart";

/** Vervoer en fietsen blijven staan als Erwin's voorstel de rest vervangt. */
const KEEP_BLOCK_IDS = WIZARD_TRANSPORT_BLOCK_IDS;

/**
 * Label van de volgende-knop per stap die volgt; de Stepper-labels zijn
 * kort ("Voorbeeld"), de knop noemt de stap voluit.
 */
const NEXT_LABELS: Partial<Record<ConfigPhase, string>> = {
  template: "Volgende: voorbeeldprogramma's",
  accommodation: "Volgende: logies",
  program: "Volgende: uw programma",
  contact: "Volgende: uw gegevens",
};

const ProgrammaSamenstellen = () => {
  const { toast } = useToast();

  const {
    cartItems,
    numberOfPeople,
    selectedDates,
    addToCart,
    removeFromCart,
    updateItem,
    setNumberOfPeople,
    accommodationWish,
    setAccommodationWish,
    wizardSituation,
    setWizardSituation,
    transportPrefs,
    setTransportPrefs,
    setSelectedDate,
    addDate,
    removeDate,
    isInCart,
    hasPendingDraft,
    pendingDraft,
    restoreDraft,
    dismissDraft,
    clearCart,
    reorderItems,
    loadFromTemplate,
  } = useCart();

  const startParams = typeof window !== "undefined" ? new URLSearchParams(window.location.search) : null;
  const hasTemplateParam = Boolean(startParams?.has("template") || startParams?.has("blocks"));
  const [phase, setPhase] = useState<ConfigPhase>(
    hasTemplateParam ? "basics" : (cartItems.length > 0 ? "program" : "basics")
  );
  const [showDraftDialog, setShowDraftDialog] = useState(false);
  const [customerToken, setCustomerToken] = useState<string | null>(null);
  const [searchParams, setSearchParams] = useSearchParams();
  const handledBlockRef = useRef<string | null>(null);
  const { data: allBlocks = [] } = usePublishedBuildingBlocks();

  const templateSlug = searchParams.get("template");
  const { data: templateData } = useTemplateWithItems(templateSlug);

  // "Zoiets ook?" op een referentiepagina: dezelfde bouwstenen, per dag,
  // ingeladen na de basisstap (datum en groepsgrootte van deze groep). Het
  // inladen gebeurt in een effect, ná het leegmaken van het mandje, zodat
  // addToCart niet tegen een verouderd mandje controleert.
  const prefillBlocks = useMemo(() => parseBlocksParam(searchParams.get("blocks")), [searchParams]);
  const prefillDays = prefillBlocks.reduce((max, b) => Math.max(max, b.dayIndex + 1), 0);
  const prefillHandledRef = useRef(false);
  const [pendingPrefill, setPendingPrefill] = useState<BlockPrefill[] | null>(null);

  useEffect(() => {
    if (!pendingPrefill) return;
    pendingPrefill.forEach((b) => addToCart(b.blockId, b.dayIndex));
    setPendingPrefill(null);
  }, [pendingPrefill, addToCart]);

  // Welke stappen deze wizard heeft, hangt af van de situatie en het aantal dagen.
  const steps = wizardStepsFor({
    situation: wizardSituation.situation,
    numberOfDays: Math.max(1, selectedDates.length),
  });
  const goNext = useCallback(
    (from: ConfigPhase) => {
      const next = nextWizardPhase(steps, from);
      if (next) setPhase(next);
    },
    [steps],
  );
  const goBack = useCallback(
    (from: ConfigPhase) => {
      const prev = previousWizardPhase(steps, from);
      if (prev) setPhase(prev);
    },
    [steps],
  );
  // Bij elke stapwissel naar de stappenbalk scrollen: de volgende-knop staat
  // onderaan de vorige stap, en de nieuwe stap moet bovenaan beginnen.
  const stepperRef = useRef<HTMLDivElement>(null);
  useScrollOnStepChange(stepperRef, phase);

  const nextLabelFrom = (from: ConfigPhase): string => {
    const next = nextWizardPhase(steps, from);
    if (!next) return "Volgende";
    const label = NEXT_LABELS[next] ?? `Volgende: ${steps.find((s) => s.key === next)?.label.toLowerCase() ?? ""}`;
    return label.trim();
  };

  // Eén event per getoonde stap, zodat we in GA4 zien waar mensen afhaken.
  // `steps` krijgt elke render een nieuwe identiteit; de sleutels als string
  // veranderen alleen als de stappen echt wijzigen.
  const stepKeys = steps.map((s) => s.key).join(",");
  const lastTrackedPhase = useRef<ConfigPhase | null>(null);
  useEffect(() => {
    if (lastTrackedPhase.current === phase) return;
    lastTrackedPhase.current = phase;
    const keys = stepKeys.split(",");
    trackWizardStep({
      wizard: "programma-samenstellen",
      step: phase,
      stepIndex: keys.indexOf(phase) + 1,
      stepsTotal: keys.length,
    });
  }, [phase, stepKeys]);

  // Check for existing draft on mount — skip when arriving with a template (explicit intent overrides draft)
  useEffect(() => {
    if (templateSlug || prefillBlocks.length > 0 || prefillHandledRef.current) return;
    if (hasPendingDraft && pendingDraft && pendingDraft.cartItems.length > 0) {
      setShowDraftDialog(true);
      setPhase("program");
    }
  }, [hasPendingDraft, pendingDraft, templateSlug, prefillBlocks.length]);


  // Handle ?block=<id> deep link from /bouwstenen — auto-add and jump to program phase
  useEffect(() => {
    const blockId = searchParams.get("block");
    if (!blockId || handledBlockRef.current === blockId) return;
    handledBlockRef.current = blockId;

    if (phase === "basics") {
      setPhase("program");
    }
    if (!isInCart(blockId)) {
      const added = addToCart(blockId, 0);
      if (added) {
        toast({ title: "Toegevoegd aan uw programma", duration: 1800 });
      }
    }
    // Clean the query param so refresh doesn't re-trigger
    searchParams.delete("block");
    setSearchParams(searchParams, { replace: true });
  }, [searchParams, phase, isInCart, addToCart, setSearchParams, toast]);

  const handleRestoreDraft = () => {
    restoreDraft();
    toast({ title: "Concept hersteld", description: "Uw eerder opgeslagen programma is geladen." });
    setShowDraftDialog(false);
    setPhase("program");
  };

  const handleDiscardDraft = () => {
    dismissDraft();
    setShowDraftDialog(false);
    setPhase("basics");
  };

  // Voorbeeldprogramma inladen zonder vervoer: dat regelt de vervoerstap.
  // Bevat het programma zelf een watertaxi of privévaart, dan nemen we die
  // over als vervoerskeuze.
  const applyTemplate = useCallback(
    (template: ProgramTemplate, startDate: Date, people: number) => {
      const items = loadFromTemplate(template, startDate, people, { includeDefaultTransport: false });
      setTransportPrefs({
        ...transportPrefs,
        crossing: inferCrossingFromCart(items, transportPrefs.crossing),
      });
    },
    [loadFromTemplate, setTransportPrefs, transportPrefs],
  );

  const handleBasicsSubmit = useCallback((data: BasicsFormData) => {
    clearCart();
    const situation: WizardSituation = { ...wizardSituation, situation: data.situation };
    setWizardSituation(situation);
    setNumberOfPeople(data.numberOfPeople);
    const nextSteps = wizardStepsFor({
      situation: data.situation,
      numberOfDays: Math.max(1, data.selectedDates.length, templateData?.duration_days ?? 0),
    });
    if (templateData && data.selectedDates.length > 0) {
      // Gekozen op /voorbeeldprogrammas: meteen inladen, daarna gewoon de
      // resterende stappen (logies, vervoer) doorlopen.
      applyTemplate(templateData, data.selectedDates[0], data.numberOfPeople);
      searchParams.delete("template");
      setSearchParams(searchParams, { replace: true });
      setPhase(nextWizardPhase(nextSteps, "template") ?? "program");
    } else if (prefillBlocks.length > 0) {
      // Referentie "Zoiets ook?": de dagen van deze groep, de onderdelen van
      // de referentie; dagen die deze groep niet heeft, schuiven naar de laatste dag.
      data.selectedDates.forEach((date, i) => {
        if (i === 0) setSelectedDate(date);
        else addDate(date);
      });
      const laatsteDag = Math.max(0, data.selectedDates.length - 1);
      prefillHandledRef.current = true;
      setPendingPrefill(prefillBlocks.map((b) => ({ blockId: b.blockId, dayIndex: Math.min(b.dayIndex, laatsteDag) })));
      searchParams.delete("blocks");
      setSearchParams(searchParams, { replace: true });
      setPhase(nextWizardPhase(nextSteps, "template") ?? "program");
    } else {
      data.selectedDates.forEach((date, i) => {
        if (i === 0) setSelectedDate(date);
        else addDate(date);
      });
      setPhase("template");
    }
  }, [clearCart, wizardSituation, setWizardSituation, setNumberOfPeople, setSelectedDate, addDate, templateData, applyTemplate, prefillBlocks, searchParams, setSearchParams]);

  const handleTemplateSelected = useCallback((template: ProgramTemplate) => {
    if (selectedDates.length > 0) {
      applyTemplate(template, selectedDates[0], numberOfPeople);
    }
    goNext("template");
  }, [applyTemplate, selectedDates, numberOfPeople, goNext]);

  const handleTransportSubmit = useCallback((prefs: TransportPreferences, situation: WizardSituation) => {
    setTransportPrefs(prefs);
    setWizardSituation(situation);
    const watertaxiCapacity = getBlockById(allBlocks, WATERTAXI_HEEN_ID)?.max_people || undefined;
    const ops = planTransportCartOps(
      cartItems,
      situation.situation,
      prefs,
      Math.max(1, selectedDates.length),
      numberOfPeople,
      { watertaxiCapacity },
    );
    ops.forEach((op) => {
      if (op.action === "add") {
        addToCart(op.blockId, op.dayIndex);
        if (op.notes) updateItem(op.blockId, { notes: op.notes });
      } else {
        removeFromCart(op.blockId);
      }
    });
    setPhase("program");
  }, [cartItems, selectedDates.length, numberOfPeople, allBlocks, addToCart, removeFromCart, updateItem, setTransportPrefs, setWizardSituation]);


  const handleAddItem = useCallback((blockId: string, dayIndex: number) => {
    const added = addToCart(blockId, dayIndex);
    if (added) {
      toast({ title: "Toegevoegd", duration: 1500 });
    }
  }, [addToCart, toast]);

  const handleErwinSuggestion = useCallback((suggestions: CartItemDetail[]) => {
    cartItems.forEach((item) => {
      if (!KEEP_BLOCK_IDS.has(item.blockId)) {
        removeFromCart(item.blockId);
      }
    });
    suggestions.forEach((s) => {
      if (!isInCart(s.blockId)) {
        addToCart(s.blockId, s.dayIndex ?? 0);
      }
    });
  }, [cartItems, removeFromCart, addToCart, isInCart]);

  const handleGoToContact = () => {
    if (cartItems.length === 0) {
      toast({
        title: "Geen onderdelen geselecteerd",
        description: "Voeg eerst activiteiten toe aan uw programma.",
        variant: "destructive",
      });
      return;
    }
    setPhase("contact");
  };

  const handleSubmitSuccess = (token: string) => {
    setCustomerToken(token);
    setPhase("success");
  };

  const showHero = phase === "basics" || phase === "template" || phase === "accommodation" || phase === "transport" || phase === "program";

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>Stel zelf uw programma samen | Bureau Vlieland</title>
        <meta name="description" content="Stel uw programma op Vlieland samen en vraag vrijblijvend een offerte aan. Kies activiteiten, catering en vervoer voor uw groep." />
        <link rel="canonical" href="https://bureauvlieland.nl/programma-samenstellen" />
        <meta property="og:title" content="Stel zelf uw programma samen | Bureau Vlieland" />
        <meta property="og:description" content="Stel uw programma op Vlieland samen en vraag vrijblijvend een offerte aan." />
        <meta property="og:image" content="https://bureauvlieland.nl/og-image.jpg" />
        <meta property="og:url" content="https://bureauvlieland.nl/programma-samenstellen" />
        <meta property="og:type" content="website" />
      </Helmet>
      <Navigation />

      <main id="main-content">
        {/* Kop: alleen tijdens het samenstellen, niet bij gegevens en bevestiging */}
        {showHero && (
          <Section tone="dark" spacing="compact">
            <Container size="content">
              <SectionHeader
                as="h1"
                size="lg"
                onDark
                eyebrow="Programma samenstellen"
                title="Stel zelf uw programma samen"
                intro={
                  phase === "basics"
                    ? "Vertel ons in een paar stappen wat u wenst. Wij maken er vrijblijvend een voorstel op maat van."
                    : "Voeg activiteiten, catering en vervoer toe. Wij werken uw wensen uit tot een voorstel."
                }
              />
            </Container>
          </Section>
        )}

        {/* Stappen, op elke fase zichtbaar */}
        <StepperBar ref={stepperRef} steps={steps} current={phase} />

        {/* Inhoud van de stap */}
        <Section spacing="compact" className="pb-floating">
          <Container size="wide">
            {phase === "basics" && (
              <BasicsForm
                onSubmit={handleBasicsSubmit}
                templateName={templateData?.name ?? (prefillBlocks.length > 0 ? "Programma van een eerdere groep" : null)}
                templateDurationDays={templateData?.duration_days ?? null}
                templateEyebrow={templateData ? "Voorbeeldprogramma" : "Referentie"}
                templateIntro={
                  !templateData && prefillBlocks.length > 0
                    ? `Kies ${prefillDays > 1 ? `uw ${prefillDays} dagen` : "uw datum"} en het aantal personen. Daarna zetten wij dezelfde onderdelen in uw programma; u past aan wat u wilt.`
                    : undefined
                }
                initialSituation={wizardSituation.situation}
                initialNumberOfPeople={numberOfPeople}
                nextLabel={nextLabelFrom(templateData || prefillBlocks.length > 0 ? "template" : "basics")}
              />
            )}

            {phase === "template" && (
              <TemplateSelector
                durationDays={Math.max(1, selectedDates.length)}
                numberOfPeople={numberOfPeople}
                selectedDates={selectedDates}
                situation={wizardSituation.situation}
                onSelectTemplate={handleTemplateSelected}
                onStartEmpty={() => goNext("template")}
                onBack={() => setPhase("basics")}
              />
            )}

            {phase === "accommodation" && (
              <AccommodationWishStep
                numberOfPeople={numberOfPeople}
                wish={accommodationWish}
                onChange={setAccommodationWish}
                onBack={() => goBack("accommodation")}
                onSubmit={() => goNext("accommodation")}
                nextLabel={nextLabelFrom("accommodation")}
              />
            )}

            {phase === "transport" && (
              <TransportBikesStep
                situation={wizardSituation}
                initial={transportPrefs}
                numberOfPeople={numberOfPeople}
                numberOfDays={Math.max(1, selectedDates.length)}
                onBack={() => goBack("transport")}
                onSubmit={handleTransportSubmit}
                nextLabel={nextLabelFrom("transport")}
              />
            )}

            {phase === "program" && (
              <ProgramBuilderView
                cartItems={cartItems}
                numberOfPeople={numberOfPeople}
                selectedDates={selectedDates}
                onRemoveItem={removeFromCart}
                onAddItem={handleAddItem}
                onUpdateItem={updateItem}
                onReorderItems={reorderItems}
                onSubmit={handleGoToContact}
                submitLabel={nextLabelFrom("program")}
                onUpdatePeople={setNumberOfPeople}
                onAddDate={addDate}
                onRemoveDate={removeDate}
                onReplaceWithSuggestion={handleErwinSuggestion}
                onLoadTemplate={(template) => {
                  if (selectedDates.length > 0) {
                    // Vanuit de programmastap: vervoer en fietsen staan al, die blijven.
                    const keep = cartItems.filter((i) => KEEP_BLOCK_IDS.has(i.blockId));
                    loadFromTemplate(template, selectedDates[0], numberOfPeople, {
                      includeDefaultTransport: false,
                      keepItems: keep,
                    });
                  }
                }}
              />
            )}

            {phase === "contact" && (
              <CheckoutContactForm
                cartItems={cartItems}
                numberOfPeople={numberOfPeople}
                selectedDates={selectedDates}
                accommodationWish={accommodationWish}
                wizardSituation={wizardSituation}
                transportPrefs={transportPrefs}
                onBack={() => setPhase("program")}
                onSuccess={handleSubmitSuccess}
              />
            )}

            {phase === "success" && customerToken && (
              <CheckoutSuccess
                customerToken={customerToken}
                cartItems={cartItems}
              />
            )}
          </Container>
        </Section>
      </main>

      <Footer />

      {pendingDraft && (
        <DraftRecoveryDialog
          isOpen={showDraftDialog}
          onRestore={handleRestoreDraft}
          onDiscard={handleDiscardDraft}
          itemCount={pendingDraft.cartItems.length}
          savedAt={new Date(pendingDraft.savedAt)}
        />
      )}

      <ExitIntentDraftDialog />
    </div>
  );
};

export default ProgrammaSamenstellen;
