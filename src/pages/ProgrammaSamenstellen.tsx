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
import { useCart } from "@/contexts/CartContext";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Info, Save, Loader2 } from "lucide-react";
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
      description: "Je eerder opgeslagen programma is geladen.",
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
    addToCart(blockId);
  };

  const handleSubmit = () => {
    if (cartItems.length === 0) {
      toast({
        title: "Geen items geselecteerd",
        description: "Voeg eerst bouwstenen toe aan je programma.",
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

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>Programma Samenstellen | Bureau Vlieland</title>
        <meta
          name="description"
          content="Stel zelf je bedrijfsuitje samen uit onze bouwstenen: activiteiten, catering en vervoer op Vlieland. Ontvang direct een indicatieve prijs."
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
              Bouw je eigen programma in 5 minuten
            </h1>
            <p className="text-lg md:text-xl text-primary-foreground/90 max-w-2xl mx-auto">
              Selecteer je favoriete bouwstenen, kies je datum en groepsgrootte. 
              Je aanvraag is vrijblijvend – je betaalt pas na bevestiging.
            </p>
          </div>
        </section>

        {/* Back link */}
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl py-4">
          <div className="flex items-center justify-between">
            <Link to="/bouwstenen">
              <Button variant="ghost" size="sm" className="gap-2">
                <ArrowLeft className="h-4 w-4" />
                Terug naar bouwstenen overzicht
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
            {/* Info banner */}
            <div className="bg-muted/50 border border-border rounded-lg p-4 mb-8 flex items-start gap-3">
              <Info className="h-5 w-5 text-primary shrink-0 mt-0.5" />
              <div className="text-sm text-muted-foreground">
                <p className="font-medium text-foreground mb-2">Zo werkt het – 3 eenvoudige stappen</p>
                <ol className="space-y-1 list-decimal list-inside">
                  <li><strong>Kies bouwstenen</strong> – Voeg activiteiten, catering en vervoer toe aan je programma</li>
                  <li><strong>Vul je gegevens in</strong> – Datum, groepsgrootte en contactinfo</li>
                  <li><strong>Ontvang bevestiging</strong> – Aanbieders bevestigen binnen 5 werkdagen</li>
                </ol>
              </div>
            </div>

            <div className="grid lg:grid-cols-3 gap-8">
              {/* Left: Building blocks grid */}
              <div className="lg:col-span-2">
                {/* Category filter */}
                <div className="mb-6">
                  <h2 className="text-2xl font-display font-bold mb-4">
                    Kies je bouwstenen
                  </h2>
                  <CategoryFilter
                    selectedCategory={selectedCategory}
                    onCategoryChange={setSelectedCategory}
                  />
                </div>

                {/* Blocks grid */}
                {isLoadingBlocks ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    <span className="ml-2 text-muted-foreground">Bouwstenen laden...</span>
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
                        Geen bouwstenen gevonden in deze categorie.
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
