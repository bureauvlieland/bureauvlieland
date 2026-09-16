import { useState, useEffect, useCallback, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { Helmet } from "react-helmet";
import { useKenBurns } from "@/hooks/use-ken-burns";
import { BasicsForm, type BasicsFormData } from "@/components/configurator/BasicsForm";
import { ProgramBuilderView } from "@/components/configurator/ProgramBuilderView";
import { CheckoutStepIndicator } from "@/components/configurator/CheckoutStepIndicator";
import { wizardStepsFor, nextWizardPhase, previousWizardPhase, type ConfigPhase } from "@/lib/wizardSteps";
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
import heroImage from "@/assets/beach-signs.jpg";

/** Vervoer en fietsen blijven staan als Erwin's voorstel de rest vervangt. */
const KEEP_BLOCK_IDS = WIZARD_TRANSPORT_BLOCK_IDS;

const ProgrammaSamenstellen = () => {
  const kenBurns = useKenBurns();
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

  const hasTemplateParam = typeof window !== "undefined" && new URLSearchParams(window.location.search).has("template");
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

  // Check for existing draft on mount — skip when arriving with a template (explicit intent overrides draft)
  useEffect(() => {
    if (templateSlug) return;
    if (hasPendingDraft && pendingDraft && pendingDraft.cartItems.length > 0) {
      setShowDraftDialog(true);
      setPhase("program");
    }
  }, [hasPendingDraft, pendingDraft, templateSlug]);


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
    const nextSteps = wizardStepsFor({ situation: data.situation, numberOfDays: Math.max(1, data.selectedDates.length) });
    if (templateData && data.selectedDates.length > 0) {
      // Gekozen op /voorbeeldprogrammas: meteen inladen, daarna gewoon de
      // resterende stappen (logies, vervoer) doorlopen.
      applyTemplate(templateData, data.selectedDates[0], data.numberOfPeople);
      searchParams.delete("template");
      setSearchParams(searchParams, { replace: true });
      setPhase(nextWizardPhase(nextSteps, "template") ?? "program");
    } else {
      data.selectedDates.forEach((date, i) => {
        if (i === 0) setSelectedDate(date);
        else addDate(date);
      });
      setPhase("template");
    }
  }, [clearCart, wizardSituation, setWizardSituation, setNumberOfPeople, setSelectedDate, addDate, templateData, applyTemplate, searchParams, setSearchParams]);

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
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleSubmitSuccess = (token: string) => {
    setCustomerToken(token);
    setPhase("success");
    window.scrollTo({ top: 0, behavior: "smooth" });
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

      <main>
        {/* Hero — only on basics + program phases */}
        {showHero && (
          <section className="relative h-[40vh] min-h-[320px] flex items-center justify-center overflow-hidden">
            <div
              className="absolute inset-0 bg-cover bg-center"
              style={{ backgroundImage: `url(${heroImage})`, ...kenBurns }}
            >
              <div className="absolute inset-0 bg-gradient-to-r from-primary/80 via-primary/60 to-transparent" />
            </div>
            <div className="relative z-10 text-center text-primary-foreground px-4 max-w-4xl">
              <h1 className="text-4xl md:text-5xl font-display font-bold mb-3">
                {phase === "basics" ? "Welkom bij Bureau Vlieland" : "Stel zelf uw programma samen"}
              </h1>
              <p className="text-lg text-primary-foreground/90 max-w-2xl mx-auto">
                {phase === "basics"
                  ? "Vertel ons in een paar stappen wat u wenst — wij stellen vrijblijvend een offerte op maat samen."
                  : "Voeg activiteiten, catering en vervoer toe. Wij verwerken uw wensen tot een offerte."}
              </p>
            </div>
          </section>
        )}

        {/* Step indicator — visible on all phases */}
        <CheckoutStepIndicator currentStep={phase} steps={steps} />

        {/* Content */}
        <section className={`py-10 md:py-14 ${phase === "program" ? "pb-28" : ""}`}>
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl">
            {phase === "basics" && (
              <BasicsForm
                onSubmit={handleBasicsSubmit}
                templateName={templateData?.name ?? null}
                templateDurationDays={templateData?.duration_days ?? null}
                initialSituation={wizardSituation.situation}
                initialNumberOfPeople={numberOfPeople}
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
          </div>
        </section>
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
