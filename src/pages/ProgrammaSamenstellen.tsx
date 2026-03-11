import { useState, useEffect, useCallback } from "react";
import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { Helmet } from "react-helmet";
import { useKenBurns } from "@/hooks/use-ken-burns";
import { BasicsForm, type BasicsFormData } from "@/components/configurator/BasicsForm";
import { ProgramBuilderView } from "@/components/configurator/ProgramBuilderView";
import { RequestFormModal } from "@/components/configurator/RequestFormModal";
import { DraftRecoveryDialog } from "@/components/configurator/DraftRecoveryDialog";
import { useCart } from "@/contexts/CartContext";
import { useToast } from "@/hooks/use-toast";
import type { CartItemDetail } from "@/types/buildingBlock";
import heroImage from "@/assets/beach-signs.jpg";

type Phase = "basics" | "program";

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

  const [phase, setPhase] = useState<Phase>(
    cartItems.length > 0 ? "program" : "basics"
  );
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showDraftDialog, setShowDraftDialog] = useState(false);

  // Contact info is now collected in RequestFormModal at submission time

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
    // Remove all non-essential items, keep ferry + fiets
    cartItems.forEach((item) => {
      if (!KEEP_BLOCK_IDS.has(item.blockId)) {
        removeFromCart(item.blockId);
      }
    });
    // Add suggested items
    suggestions.forEach((s) => {
      if (!isInCart(s.blockId)) {
        addToCart(s.blockId, s.dayIndex ?? 0);
      }
    });
  }, [cartItems, removeFromCart, addToCart, isInCart]);

  const handleSubmit = () => {
    if (cartItems.length === 0) {
      toast({
        title: "Geen onderdelen geselecteerd",
        description: "Voeg eerst activiteiten toe aan uw programma.",
        variant: "destructive",
      });
      return;
    }
    setIsModalOpen(true);
  };

  const isBasicsPhase = phase === "basics";

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>Programma Samenstellen | Bureau Vlieland</title>
        <meta name="description" content="Stel uw programma op Vlieland samen. Kies activiteiten, catering en vervoer voor uw groep." />
        <link rel="canonical" href="https://bureauvlieland.nl/programma-samenstellen" />
        <meta property="og:title" content="Programma Samenstellen | Bureau Vlieland" />
        <meta property="og:description" content="Stel uw programma op Vlieland samen." />
        <meta property="og:image" content="https://bureauvlieland.nl/og-image.png" />
        <meta property="og:url" content="https://bureauvlieland.nl/programma-samenstellen" />
        <meta property="og:type" content="website" />
      </Helmet>
      <Navigation />

      <main>
        {/* Hero */}
        <section className="relative h-[40vh] min-h-[320px] flex items-center justify-center overflow-hidden">
          <div
            className="absolute inset-0 bg-cover bg-center"
            style={{ backgroundImage: `url(${heroImage})`, ...kenBurns }}
          >
            <div className="absolute inset-0 bg-gradient-to-r from-primary/80 via-primary/60 to-transparent" />
          </div>
          <div className="relative z-10 text-center text-primary-foreground px-4 max-w-4xl">
            <h1 className="text-4xl md:text-5xl font-display font-bold mb-3">
              {isBasicsPhase ? "Welkom bij Bureau Vlieland" : "Stel uw programma samen"}
            </h1>
            <p className="text-lg text-primary-foreground/90 max-w-2xl mx-auto">
              {isBasicsPhase
                ? "Wij helpen u graag bij het organiseren van een onvergetelijk programma op Vlieland."
                : "Voeg activiteiten, catering en vervoer toe. Wij regelen de rest."}
            </p>
          </div>
        </section>

        {/* Content */}
        <section className={`py-10 md:py-14 ${phase === "program" ? "pb-28" : ""}`}>
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl">
            {isBasicsPhase && <BasicsForm onSubmit={handleBasicsSubmit} />}

            {phase === "program" && (
              <ProgramBuilderView
                cartItems={cartItems}
                numberOfPeople={numberOfPeople}
                selectedDates={selectedDates}
                onRemoveItem={removeFromCart}
                onAddItem={handleAddItem}
                onUpdateItem={updateItem}
                onReorderItems={reorderItems}
                onSubmit={handleSubmit}
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

      <RequestFormModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        cartItems={cartItems}
        numberOfPeople={numberOfPeople}
        selectedDate={selectedDates[0]}
        selectedDates={selectedDates}
        prefillData={undefined}
      />
    </div>
  );
};

export default ProgrammaSamenstellen;
