import { useState, useEffect, useCallback, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { Helmet } from "react-helmet";
import { useKenBurns } from "@/hooks/use-ken-burns";
import { BasicsForm, type BasicsFormData } from "@/components/configurator/BasicsForm";
import { ProgramBuilderView } from "@/components/configurator/ProgramBuilderView";
import { CheckoutStepIndicator, type ConfigPhase } from "@/components/configurator/CheckoutStepIndicator";
import { CheckoutContactForm } from "@/components/configurator/CheckoutContactForm";
import { CheckoutSuccess } from "@/components/configurator/CheckoutSuccess";
import { DraftRecoveryDialog } from "@/components/configurator/DraftRecoveryDialog";
import { useCart } from "@/contexts/CartContext";
import { useToast } from "@/hooks/use-toast";
import type { CartItemDetail } from "@/types/buildingBlock";
import heroImage from "@/assets/beach-signs.jpg";

const FERRY_HEEN_ID = "boot-enkel-heen";
const FERRY_TERUG_ID = "boot-enkel-terug";
const FIETS_ID = "fiets-huur";
const KEEP_BLOCK_IDS = new Set([FERRY_HEEN_ID, FERRY_TERUG_ID, FIETS_ID]);

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

  const [phase, setPhase] = useState<ConfigPhase>(
    cartItems.length > 0 ? "program" : "basics"
  );
  const [showDraftDialog, setShowDraftDialog] = useState(false);
  const [customerToken, setCustomerToken] = useState<string | null>(null);
  const [searchParams, setSearchParams] = useSearchParams();
  const handledBlockRef = useRef<string | null>(null);

  // Check for existing draft on mount
  useEffect(() => {
    if (hasPendingDraft && pendingDraft && pendingDraft.cartItems.length > 0) {
      setShowDraftDialog(true);
      setPhase("program");
    }
  }, [hasPendingDraft, pendingDraft]);

  // Auto-add default blocks when entering program phase
  useEffect(() => {
    if (phase === "program") {
      const lastDay = Math.max(0, selectedDates.length - 1);
      if (!isInCart(FERRY_HEEN_ID)) addToCart(FERRY_HEEN_ID, 0);
      if (!isInCart(FERRY_TERUG_ID)) addToCart(FERRY_TERUG_ID, lastDay);
      if (!isInCart(FIETS_ID)) addToCart(FIETS_ID, 0);
    }
  }, [phase]);

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

  const handleBasicsSubmit = useCallback((data: BasicsFormData) => {
    clearCart();
    setNumberOfPeople(data.numberOfPeople);
    data.selectedDates.forEach((date, i) => {
      if (i === 0) setSelectedDate(date);
      else addDate(date);
    });
    setPhase("program");
  }, [clearCart, setNumberOfPeople, setSelectedDate, addDate]);

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

  const showHero = phase === "basics" || phase === "program";

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>Stel zelf uw programma samen | Bureau Vlieland</title>
        <meta name="description" content="Stel uw programma op Vlieland samen en vraag vrijblijvend een offerte aan. Kies activiteiten, catering en vervoer voor uw groep." />
        <link rel="canonical" href="https://bureauvlieland.nl/programma-samenstellen" />
        <meta property="og:title" content="Stel zelf uw programma samen | Bureau Vlieland" />
        <meta property="og:description" content="Stel uw programma op Vlieland samen en vraag vrijblijvend een offerte aan." />
        <meta property="og:image" content="https://bureauvlieland.nl/og-image.png" />
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
        <CheckoutStepIndicator currentStep={phase} />

        {/* Content */}
        <section className={`py-10 md:py-14 ${phase === "program" ? "pb-28" : ""}`}>
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl">
            {phase === "basics" && <BasicsForm onSubmit={handleBasicsSubmit} />}

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
                    loadFromTemplate(template, selectedDates[0], numberOfPeople);
                  }
                }}
              />
            )}

            {phase === "contact" && (
              <CheckoutContactForm
                cartItems={cartItems}
                numberOfPeople={numberOfPeople}
                selectedDates={selectedDates}
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
    </div>
  );
};

export default ProgrammaSamenstellen;
