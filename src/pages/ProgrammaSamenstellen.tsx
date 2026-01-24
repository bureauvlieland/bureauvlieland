import { useState, useEffect, useCallback } from "react";
import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { Helmet } from "react-helmet";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useKenBurns } from "@/hooks/use-ken-burns";
import { buildingBlocks, type BlockCategory, type CartItemDetail } from "@/data/configuratorMockData";
import { BuildingBlockCard } from "@/components/configurator/BuildingBlockCard";
import { ConfiguratorCart } from "@/components/configurator/ConfiguratorCart";
import { CategoryFilter } from "@/components/configurator/CategoryFilter";
import { RequestFormModal } from "@/components/configurator/RequestFormModal";
import { CartDrawer } from "@/components/configurator/CartDrawer";
import { DraftRecoveryDialog } from "@/components/configurator/DraftRecoveryDialog";
import { useProgramDraft } from "@/hooks/useProgramDraft";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Info, Save } from "lucide-react";
import heroImage from "@/assets/beach-signs.jpg";
import { formatDistanceToNow } from "date-fns";
import { nl } from "date-fns/locale";

const ProgrammaSamenstellen = () => {
  const kenBurns = useKenBurns();
  const { toast } = useToast();
  const { draft, hasDraft, saveDraft, clearDraft, lastSaved } = useProgramDraft();

  // State
  const [cartItems, setCartItems] = useState<CartItemDetail[]>([]);
  const [numberOfPeople, setNumberOfPeople] = useState(20);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [selectedCategory, setSelectedCategory] = useState<BlockCategory | "all">("all");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [showDraftDialog, setShowDraftDialog] = useState(false);
  const [manualOrder, setManualOrder] = useState(false);

  // Check for existing draft on mount
  useEffect(() => {
    if (hasDraft && draft) {
      setShowDraftDialog(true);
    }
  }, []);

  // Auto-save draft when cart changes
  const saveCurrentDraft = useCallback(() => {
    if (cartItems.length > 0) {
      saveDraft({
        cartItems,
        numberOfPeople,
        selectedDate: selectedDate?.toISOString() || null,
        manualOrder,
      });
    }
  }, [cartItems, numberOfPeople, selectedDate, manualOrder, saveDraft]);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      saveCurrentDraft();
    }, 1000); // Debounce 1 second

    return () => clearTimeout(timeoutId);
  }, [cartItems, numberOfPeople, selectedDate, saveCurrentDraft]);

  // Restore draft
  const handleRestoreDraft = () => {
    if (draft) {
      setCartItems(draft.cartItems);
      setNumberOfPeople(draft.numberOfPeople);
      setSelectedDate(draft.selectedDate ? new Date(draft.selectedDate) : undefined);
      setManualOrder(draft.manualOrder);
      toast({
        title: "Concept hersteld",
        description: "Je eerder opgeslagen programma is geladen.",
      });
    }
    setShowDraftDialog(false);
  };

  const handleDiscardDraft = () => {
    clearDraft();
    setShowDraftDialog(false);
  };

  // Filter blocks by category
  const filteredBlocks = selectedCategory === "all"
    ? buildingBlocks
    : buildingBlocks.filter((block) => block.category === selectedCategory);

  // Cart handlers
  const handleAddToCart = (blockId: string) => {
    if (!cartItems.find(item => item.blockId === blockId)) {
      setCartItems((prev) => [...prev, {
        blockId,
        preferredTime: null,
        notes: "",
      }]);
      toast({
        title: "Toegevoegd aan programma",
        description: "Je kunt het item bekijken in je winkelmandje.",
      });
    }
  };

  const handleRemoveFromCart = (blockId: string) => {
    setCartItems((prev) => prev.filter((item) => item.blockId !== blockId));
  };

  const handleUpdateItem = (blockId: string, updates: Partial<CartItemDetail>) => {
    setCartItems((prev) =>
      prev.map((item) =>
        item.blockId === blockId ? { ...item, ...updates } : item
      )
    );
  };

  const handleReorderItems = (newItems: CartItemDetail[]) => {
    setCartItems(newItems);
    setManualOrder(true);
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
    clearDraft();
    setCartItems([]);
    setIsModalOpen(false);
  };

  // Check if a block is in the cart
  const isInCart = (blockId: string) => {
    return cartItems.some(item => item.blockId === blockId);
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
              Stel je programma samen
            </h1>
            <p className="text-lg md:text-xl text-primary-foreground/90 max-w-2xl mx-auto">
              Kies uit activiteiten, catering en vervoer. Wij regelen de rest en
              zorgen voor een onvergetelijk uitje.
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
        <section className="pb-16 lg:pb-16 pb-32">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl">
            {/* Info banner */}
            <div className="bg-muted/50 border border-border rounded-lg p-4 mb-8 flex items-start gap-3">
              <Info className="h-5 w-5 text-primary shrink-0 mt-0.5" />
              <div className="text-sm text-muted-foreground">
                <p className="font-medium text-foreground mb-2">Hoe werkt het?</p>
                <ol className="space-y-1 list-decimal list-inside">
                  <li>Kies bouwstenen en voeg ze toe aan je programma.</li>
                  <li>Vul het aantal personen en gewenste datum in.</li>
                  <li>Aanvragen worden door de betreffende aanbieders behandeld en bevestigd. Eventueel wordt er contact opgenomen om details te bespreken.</li>
                  <li>U betaalt pas na bevestiging en ontvangt hiervan een factuur van de aanbieder.</li>
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
              </div>

              {/* Right: Cart sidebar (sticky) - hidden on mobile/tablet */}
              <div className="lg:col-span-1 hidden lg:block">
                <div className="sticky top-24">
                  <ConfiguratorCart
                    cartItems={cartItems}
                    numberOfPeople={numberOfPeople}
                    selectedDate={selectedDate}
                    onRemoveItem={handleRemoveFromCart}
                    onUpdateItem={handleUpdateItem}
                    onPeopleChange={setNumberOfPeople}
                    onDateChange={setSelectedDate}
                    onSubmit={handleSubmit}
                    onReorderItems={handleReorderItems}
                  />
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />

      {/* Mobile/Tablet Cart Drawer */}
      <CartDrawer
        cartItems={cartItems}
        numberOfPeople={numberOfPeople}
        selectedDate={selectedDate}
        onRemoveItem={handleRemoveFromCart}
        onUpdateItem={handleUpdateItem}
        onPeopleChange={setNumberOfPeople}
        onDateChange={setSelectedDate}
        onSubmit={handleSubmit}
        onReorderItems={handleReorderItems}
        isOpen={isDrawerOpen}
        onOpenChange={setIsDrawerOpen}
        lastSaved={lastSaved}
      />

      {/* Draft Recovery Dialog */}
      {draft && (
        <DraftRecoveryDialog
          isOpen={showDraftDialog}
          onRestore={handleRestoreDraft}
          onDiscard={handleDiscardDraft}
          itemCount={draft.cartItems.length}
          savedAt={new Date(draft.savedAt)}
        />
      )}

      {/* Request Form Modal */}
      <RequestFormModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        cartItems={cartItems}
        numberOfPeople={numberOfPeople}
        selectedDate={selectedDate}
      />
    </div>
  );
};

export default ProgrammaSamenstellen;
