import { useState, useEffect } from "react";
import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { Helmet } from "react-helmet";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useKenBurns } from "@/hooks/use-ken-burns";
import { type BuildingBlockCategory } from "@/types/buildingBlock";
import { usePublishedBuildingBlocks } from "@/hooks/useBuildingBlocks";
import { BuildingBlockCard } from "@/components/configurator/BuildingBlockCard";
import { ConfiguratorCart } from "@/components/configurator/ConfiguratorCart";
import { CategoryFilter } from "@/components/configurator/CategoryFilter";
import { RequestFormModal } from "@/components/configurator/RequestFormModal";
import { DraftRecoveryDialog } from "@/components/configurator/DraftRecoveryDialog";
import { HowItWorksBlock } from "@/components/configurator/HowItWorksBlock";
import { LogiesSuggestionBanner } from "@/components/configurator/LogiesSuggestionBanner";
import { SupportCTA } from "@/components/configurator/SupportCTA";
import { useCart } from "@/contexts/CartContext";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Save, Loader2 } from "lucide-react";
import heroImage from "@/assets/beach-signs.jpg";
import { formatDistanceToNow } from "date-fns";
import { nl } from "date-fns/locale";

const ProgrammaSamenstellen = () => {
  const kenBurns = useKenBurns();
  const { toast } = useToast();
  
  // Fetch building blocks from database
  const { data: buildingBlocks = [], isLoading: isLoadingBlocks } = usePublishedBuildingBlocks();
  const {
    cartItems,
    numberOfPeople,
    selectedDate,
    selectedDates,
    lastSaved,
    addToCart,
    removeFromCart,
    updateItem,
    reorderItems,
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
  } = useCart();

  // State
  const [selectedCategory, setSelectedCategory] = useState<BuildingBlockCategory | "all">("all");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showDraftDialog, setShowDraftDialog] = useState(false);

  // Check for existing draft on mount
  useEffect(() => {
    if (hasPendingDraft) {
      setShowDraftDialog(true);
    }
  }, [hasPendingDraft]);

  // Restore draft
  const handleRestoreDraft = () => {
    restoreDraft();
    toast({
      title: "Concept hersteld",
      description: "Uw eerder opgeslagen programma is geladen.",
    });
    setShowDraftDialog(false);
  };

  const handleDiscardDraft = () => {
    dismissDraft();
    setShowDraftDialog(false);
  };

  // Filter blocks by category
  const filteredBlocks = selectedCategory === "all"
    ? buildingBlocks
    : buildingBlocks.filter((block) => block.category === selectedCategory);

  // Cart handlers
  const handleAddToCart = (blockId: string) => {
    const block = buildingBlocks.find(b => b.id === blockId);
    const added = addToCart(blockId);
    if (added && block) {
      toast({
        title: "Toegevoegd aan uw programma",
        description: block.name,
        duration: 2000,
      });
    }
  };

  const handleSubmit = () => {
    if (cartItems.length === 0) {
      toast({
        title: "Geen onderdelen geselecteerd",
        description: "Voeg eerst onderdelen toe aan uw programma.",
        variant: "destructive",
      });
      return;
    }
    setIsModalOpen(true);
  };

  const handleRequestSuccess = () => {
    clearCart();
    setIsModalOpen(false);
  };

  // Show logies banner when multiple days selected
  const showLogiesBanner = selectedDates.length > 1;

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>Programma Samenstellen | Bureau Vlieland</title>
        <meta
          name="description"
          content="Stel uw programma op Vlieland samen. Kies activiteiten, catering en vervoer voor uw groep. Wij controleren beschikbaarheid en zorgen dat alles goed op elkaar aansluit."
        />
        <link rel="canonical" href="https://bureauvlieland.nl/programma-samenstellen" />
      </Helmet>
      <Navigation />

      <main>
        {/* Hero Section */}
        <section className="relative h-[50vh] min-h-[400px] flex items-center justify-center overflow-hidden">
          <div
            className="absolute inset-0 bg-cover bg-center"
            style={{
              backgroundImage: `url(${heroImage})`,
              ...kenBurns,
            }}
          >
            <div className="absolute inset-0 bg-gradient-to-r from-primary/80 via-primary/60 to-transparent" />
          </div>

          <div className="relative z-10 text-center text-primary-foreground px-4 max-w-4xl">
            <h1 className="text-4xl md:text-6xl font-display font-bold mb-4">
              Stel uw programma op Vlieland samen
            </h1>
            <p className="text-lg md:text-xl text-primary-foreground/90 max-w-2xl mx-auto mb-2">
              Kies activiteiten, catering en vervoer voor uw groep.
              Wij controleren beschikbaarheid en zorgen dat alles goed op elkaar aansluit.
            </p>
            <p className="text-base text-primary-foreground/80 max-w-2xl mx-auto mb-3">
              Bij meerdaagse verblijven kunnen wij ook passende logies voor uw groep verzorgen.
            </p>
            <p className="text-sm text-primary-foreground/70 max-w-xl mx-auto">
              Activiteiten worden uitgevoerd door zorgvuldig geselecteerde lokale partners.
            </p>
          </div>
        </section>

        {/* Back link */}
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl py-4">
          <div className="flex items-center justify-between">
            <Link to="/diensten">
              <Button variant="ghost" size="sm" className="gap-2">
                <ArrowLeft className="h-4 w-4" />
                Terug naar onderdelen
              </Button>
            </Link>
            {lastSaved && cartItems.length > 0 && (
              <div className="hidden md:flex items-center gap-2 text-xs text-muted-foreground">
                <Save className="h-3 w-3" />
                <span>
                  Opgeslagen {formatDistanceToNow(lastSaved, { addSuffix: true, locale: nl })}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Main Content */}
        <section className="pb-32 lg:pb-16">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl">
            {/* How it works block */}
            <HowItWorksBlock />

            {/* Logies suggestion banner (conditional) */}
            <LogiesSuggestionBanner 
              isVisible={showLogiesBanner} 
              selectedDates={selectedDates}
              numberOfPeople={numberOfPeople}
            />

            <div className="grid lg:grid-cols-3 gap-8">
              {/* Left: Building blocks grid */}
              <div className="lg:col-span-2">
                {/* Category filter with support CTA */}
                <div className="mb-6">
                  <div className="flex items-start justify-between gap-4 mb-4">
                    <h2 className="text-2xl font-display font-bold">
                      Kies uw onderdelen
                    </h2>
                    <SupportCTA />
                  </div>
                  
                  <p className="text-sm text-muted-foreground mb-4">
                    Geschikt voor groepen vanaf 8 personen.
                  </p>
                  
                  <CategoryFilter
                    selectedCategory={selectedCategory}
                    onCategoryChange={setSelectedCategory}
                  />
                </div>

                {/* Blocks grid */}
                {isLoadingBlocks ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    <span className="ml-2 text-muted-foreground">Onderdelen laden...</span>
                  </div>
                ) : (
                  <>
                    <div className="grid sm:grid-cols-2 gap-6">
                      {filteredBlocks.map((block) => (
                        <BuildingBlockCard
                          key={block.id}
                          block={block}
                          onAdd={handleAddToCart}
                          isInCart={isInCart(block.id)}
                        />
                      ))}
                    </div>

                    {filteredBlocks.length === 0 && (
                      <div className="text-center py-12 text-muted-foreground">
                        Geen onderdelen gevonden in deze categorie.
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* Right: Cart sidebar (sticky) - hidden on mobile/tablet */}
              <div className="lg:col-span-1 hidden lg:block">
                <div className="sticky top-24">
                  <ConfiguratorCart
                    cartItems={cartItems}
                    numberOfPeople={numberOfPeople}
                    selectedDates={selectedDates}
                    selectedDate={selectedDate}
                    onRemoveItem={removeFromCart}
                    onUpdateItem={updateItem}
                    onPeopleChange={setNumberOfPeople}
                    onDateChange={setSelectedDate}
                    onAddDate={addDate}
                    onRemoveDate={removeDate}
                    onSubmit={handleSubmit}
                    onReorderItems={reorderItems}
                  />
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />

      {/* Draft Recovery Dialog */}
      {pendingDraft && (
        <DraftRecoveryDialog
          isOpen={showDraftDialog}
          onRestore={handleRestoreDraft}
          onDiscard={handleDiscardDraft}
          itemCount={pendingDraft.cartItems.length}
          savedAt={new Date(pendingDraft.savedAt)}
        />
      )}

      {/* Request Form Modal */}
      <RequestFormModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        cartItems={cartItems}
        numberOfPeople={numberOfPeople}
        selectedDate={selectedDate}
        selectedDates={selectedDates}
      />
    </div>
  );
};

export default ProgrammaSamenstellen;
