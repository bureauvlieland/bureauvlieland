import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { Helmet } from "react-helmet";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useKenBurns } from "@/hooks/use-ken-burns";
import { type BuildingBlockCategory, type BuildingBlock } from "@/types/buildingBlock";
import { AddToCartDialog } from "@/components/configurator/AddToCartDialog";
import { usePublishedBuildingBlocks } from "@/hooks/useBuildingBlocks";
import { BuildingBlockCard } from "@/components/configurator/BuildingBlockCard";
import { BuildingBlockListItem } from "@/components/configurator/BuildingBlockListItem";
import { ConfiguratorCart } from "@/components/configurator/ConfiguratorCart";
import { CategoryFilter } from "@/components/configurator/CategoryFilter";
import { ViewToggle } from "@/components/configurator/ViewToggle";
import { RequestFormModal } from "@/components/configurator/RequestFormModal";
import { DraftRecoveryDialog } from "@/components/configurator/DraftRecoveryDialog";
import { HowItWorksBlock } from "@/components/configurator/HowItWorksBlock";
import { LogiesSuggestionBanner } from "@/components/configurator/LogiesSuggestionBanner";

import { ConfiguratorWizard, type ProgramType } from "@/components/configurator/ConfiguratorWizard";
import { useCart } from "@/contexts/CartContext";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Save, Loader2, Settings2 } from "lucide-react";
import heroImage from "@/assets/beach-signs.jpg";
import { formatDistanceToNow } from "date-fns";
import { nl } from "date-fns/locale";
import type { ProgramTemplate } from "@/types/programTemplate";

const ProgrammaSamenstellen = () => {
  const kenBurns = useKenBurns();
  const { toast } = useToast();
  const [searchParams] = useSearchParams();
  
  // Check if wizard should be skipped (e.g., returning from logies page)
  const skipWizard = searchParams.get("skip_wizard") === "true";
  
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
    loadFromTemplate,
  } = useCart();

  // Wizard state
  const [showWizard, setShowWizard] = useState(!skipWizard && cartItems.length === 0);
  const [programType, setProgramType] = useState<ProgramType | null>(null);

  // State
  const [selectedCategory, setSelectedCategory] = useState<BuildingBlockCategory | "all">("all");
  const [viewMode, setViewMode] = useState<"grid" | "list">(() => {
    return (localStorage.getItem("bv-view-mode") as "grid" | "list") || "grid";
  });
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showDraftDialog, setShowDraftDialog] = useState(false);
  const [pendingBlock, setPendingBlock] = useState<BuildingBlock | null>(null);

  // Check for existing draft on mount - if draft exists, skip wizard
  useEffect(() => {
    if (hasPendingDraft && pendingDraft && pendingDraft.cartItems.length > 0) {
      setShowDraftDialog(true);
      setShowWizard(false);
    }
  }, [hasPendingDraft, pendingDraft]);

  // If cart already has items, don't show wizard
  useEffect(() => {
    if (cartItems.length > 0 && showWizard) {
      setShowWizard(false);
    }
  }, [cartItems.length, showWizard]);

  // Restore draft
  const handleRestoreDraft = () => {
    restoreDraft();
    toast({
      title: "Concept hersteld",
      description: "Uw eerder opgeslagen programma is geladen.",
    });
    setShowDraftDialog(false);
    setShowWizard(false);
  };

  const handleDiscardDraft = () => {
    dismissDraft();
    setShowDraftDialog(false);
    // Show wizard after discarding draft
    setShowWizard(true);
  };

  // Handle wizard completion (empty start)
  const handleWizardComplete = (data: {
    programType: ProgramType | null;
    numberOfPeople: number;
    selectedDates: Date[];
    wantsAccommodation: boolean | null;
  }) => {
    // Apply wizard data to cart context
    setNumberOfPeople(data.numberOfPeople);
    
    // Set dates
    data.selectedDates.forEach((date, index) => {
      if (index === 0) {
        setSelectedDate(date);
      } else {
        addDate(date);
      }
    });

    setProgramType(data.programType);
    setShowWizard(false);

    // If user wants accommodation, redirect to logies page
    if (data.wantsAccommodation) {
      // Store intent in sessionStorage for the logies page
      const arrivalDate = data.selectedDates[0];
      const departureDate = data.selectedDates[data.selectedDates.length - 1];
      
      // Navigate to logies with prefilled data
      const params = new URLSearchParams({
        arrival: arrivalDate.toISOString().split('T')[0],
        departure: departureDate.toISOString().split('T')[0],
        guests: data.numberOfPeople.toString(),
        from: 'configurator'
      });
      
      window.location.href = `/logies-aanvragen?${params.toString()}`;
      return;
    }

    toast({
      title: "Gegevens opgeslagen",
      description: "Kies nu de onderdelen voor uw programma.",
      duration: 3000,
    });
  };

  // Handle template selection from wizard
  const handleTemplateSelected = (
    template: ProgramTemplate,
    wizardData: {
      programType: ProgramType | null;
      numberOfPeople: number;
      selectedDates: Date[];
      wantsAccommodation: boolean | null;
    }
  ) => {
    // Load template into cart
    const startDate = wizardData.selectedDates[0] || new Date();
    loadFromTemplate(template, startDate, wizardData.numberOfPeople);
    
    setProgramType(wizardData.programType);
    setShowWizard(false);

    toast({
      title: `"${template.name}" geladen`,
      description: "U kunt het programma nu naar wens aanpassen.",
      duration: 4000,
    });
  };

  // Filter blocks by category
  const filteredBlocks = selectedCategory === "all"
    ? buildingBlocks
    : buildingBlocks.filter((block) => block.category === selectedCategory);

  // Cart handlers
  const handleAddToCart = (blockId: string) => {
    const block = buildingBlocks.find(b => b.id === blockId);
    if (!block) return;
    // Open the dialog instead of adding directly
    setPendingBlock(block);
  };

  const handleConfirmAdd = (blockId: string, dayIndex: number, preferredTime: string | null) => {
    const block = buildingBlocks.find(b => b.id === blockId);
    const added = addToCart(blockId, dayIndex);
    if (added) {
      // Set preferred time if specified
      if (preferredTime) {
        updateItem(blockId, { preferredTime });
      }
      if (block) {
        toast({
          title: "Toegevoegd aan uw programma",
          description: block.name,
          duration: 2000,
        });
      }
    }
    setPendingBlock(null);
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
        <meta property="og:title" content="Programma Samenstellen | Bureau Vlieland" />
        <meta property="og:description" content="Stel uw programma op Vlieland samen. Kies activiteiten, catering en vervoer voor uw groep." />
        <meta property="og:image" content="https://bureauvlieland.nl/og-image.png" />
        <meta property="og:url" content="https://bureauvlieland.nl/programma-samenstellen" />
        <meta property="og:type" content="website" />
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
            {showWizard ? (
              <>
               <h1 className="text-4xl md:text-6xl font-display font-bold mb-4">
                  Welkom bij Bureau Vlieland
                </h1>
                <p className="text-lg md:text-xl text-primary-foreground/90 max-w-2xl mx-auto mb-2">
                  Wij helpen u graag bij het organiseren van een onvergetelijk programma op Vlieland.
                </p>
                <p className="text-base text-primary-foreground/80 max-w-xl mx-auto">
                  Geheel vrijblijvend. Na uw aanvraag ontvangt u een voorstel op maat.
                </p>
              </>
            ) : (
              <>
                <h1 className="text-4xl md:text-6xl font-display font-bold mb-4">
                  Stel zelf uw programma samen
                </h1>
                <p className="text-lg md:text-xl text-primary-foreground/90 max-w-2xl mx-auto mb-2">
                  Kies activiteiten, catering en vervoer voor uw groep.
                  Wij controleren beschikbaarheid en zorgen dat alles goed op elkaar aansluit.
                </p>
                <p className="text-sm text-primary-foreground/70 max-w-xl mx-auto">
                  Activiteiten worden uitgevoerd door zorgvuldig geselecteerde lokale partners.
                </p>
              </>
            )}
          </div>
        </section>

        {/* Wizard or Configurator */}
        {showWizard ? (
          <section className="py-12 md:py-16">
            <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl">
              <ConfiguratorWizard 
                onComplete={handleWizardComplete}
                onTemplateSelected={handleTemplateSelected}
                initialData={{
                  numberOfPeople,
                  selectedDates,
                }}
              />
            </div>
          </section>
        ) : (
          <>
            {/* Back link & edit settings */}
            <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <Link to="/diensten">
                    <Button variant="ghost" size="sm" className="gap-2">
                      <ArrowLeft className="h-4 w-4" />
                      Terug naar onderdelen
                    </Button>
                  </Link>
                  {programType && (
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="gap-2 text-muted-foreground"
                      onClick={() => setShowWizard(true)}
                    >
                      <Settings2 className="h-4 w-4" />
                      Wijzig gegevens
                    </Button>
                  )}
                </div>
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
                  cartItems={cartItems}
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
                        <div className="flex items-center gap-2">
                          <ViewToggle viewMode={viewMode} onChange={(m) => { setViewMode(m); localStorage.setItem("bv-view-mode", m); }} />
                        </div>
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
                        {viewMode === "grid" ? (
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
                        ) : (
                          <div className="flex flex-col gap-3">
                            {filteredBlocks.map((block) => (
                              <BuildingBlockListItem
                                key={block.id}
                                block={block}
                                onAdd={handleAddToCart}
                                isInCart={isInCart(block.id)}
                              />
                            ))}
                          </div>
                        )}

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
                    <div className="sticky top-24 max-h-[calc(100vh-7rem)] overflow-y-auto scrollbar-thin">
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
                        onCategoryFilter={setSelectedCategory}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </section>
          </>
        )}
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

      {/* Add to Cart Dialog */}
      <AddToCartDialog
        block={pendingBlock}
        isOpen={!!pendingBlock}
        onClose={() => setPendingBlock(null)}
        selectedDates={selectedDates}
        cartItems={cartItems}
        allBlocks={buildingBlocks}
        onConfirm={handleConfirmAdd}
      />
    </div>
  );
};

export default ProgrammaSamenstellen;
