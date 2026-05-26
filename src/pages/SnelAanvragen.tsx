import { useEffect, useRef, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { Helmet } from "react-helmet";
import { format } from "date-fns";
import { nl } from "date-fns/locale";
import { CalendarIcon, Plus, Trash2, Users, ArrowRight, ArrowLeft, Sparkles } from "lucide-react";

import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

import { useCart } from "@/contexts/CartContext";
import { usePublishedBuildingBlocks, getBlockById } from "@/hooks/useBuildingBlocks";
import { AddActivitySheet } from "@/components/customer-portal/AddActivitySheet";
import { CheckoutContactForm } from "@/components/configurator/CheckoutContactForm";
import { CheckoutSuccess } from "@/components/configurator/CheckoutSuccess";
import { categoryLabels } from "@/types/buildingBlock";

type Phase = "select" | "contact" | "success";

const SKIP_DEFAULTS = new Set(["boot-enkel-heen", "boot-enkel-terug", "boot-retour", "fiets-huur"]);

const SnelAanvragen = () => {
  const { toast } = useToast();
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
    clearCart,
    isInCart,
  } = useCart();

  const [phase, setPhase] = useState<Phase>("select");
  const [addSheetOpen, setAddSheetOpen] = useState(false);
  const [customerToken, setCustomerToken] = useState<string | null>(null);
  const handledRef = useRef<string | null>(null);

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
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleSuccess = (token: string) => {
    setCustomerToken(token);
    setPhase("success");
    window.scrollTo({ top: 0, behavior: "smooth" });
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

      <main className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-3xl py-10 md:py-14">
        {phase === "select" && (
          <>
            <header className="mb-8 text-center">
              <Badge variant="secondary" className="mb-3">
                <Sparkles className="h-3.5 w-3.5 mr-1.5" />
                Losse aanvraag
              </Badge>
              <h1 className="text-3xl md:text-4xl font-display font-bold mb-3">
                Vraag uw activiteit aan
              </h1>
              <p className="text-muted-foreground">
                Kies een datum, vul uw gegevens in en wij komen met een passend voorstel terug.
                Geen heel programma nodig.
              </p>
            </header>

            <Card className="mb-6">
              <CardContent className="p-5 space-y-5">
                <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                  Wanneer & met hoeveel personen
                </h2>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Gewenste datum</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full justify-start text-left font-normal",
                            !date && "text-muted-foreground"
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {date ? format(date, "EEEE d MMMM yyyy", { locale: nl }) : "Kies datum"}
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
                  <div className="space-y-2">
                    <Label htmlFor="people" className="flex items-center gap-1.5">
                      <Users className="h-3.5 w-3.5" /> Aantal personen
                    </Label>
                    <Input
                      id="people"
                      type="number"
                      min={1}
                      max={500}
                      value={numberOfPeople}
                      onChange={(e) =>
                        setNumberOfPeople(Math.max(1, parseInt(e.target.value) || 1))
                      }
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="mb-6">
              <CardContent className="p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                    Activiteiten ({visibleItems.length})
                  </h2>
                  <Button size="sm" variant="outline" onClick={() => setAddSheetOpen(true)}>
                    <Plus className="h-3.5 w-3.5 mr-1" /> Activiteit toevoegen
                  </Button>
                </div>

                {visibleItems.length === 0 ? (
                  <p className="text-sm text-muted-foreground italic py-4 text-center">
                    Nog geen activiteit gekozen. Klik op "Activiteit toevoegen".
                  </p>
                ) : (
                  <div className="space-y-3">
                    {visibleItems.map((item) => {
                      const block = getBlockById(allBlocks, item.blockId);
                      if (!block) return null;
                      return (
                        <div
                          key={item.blockId}
                          className="flex flex-col sm:flex-row gap-3 p-3 rounded-lg border bg-card"
                        >
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0">
                                <p className="font-medium text-sm leading-tight truncate">
                                  {block.name}
                                </p>
                                <p className="text-xs text-muted-foreground mt-0.5">
                                  {categoryLabels[block.category] ?? block.category}
                                  {block.provider?.name && ` · ${block.provider.name}`}
                                </p>
                              </div>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 shrink-0 text-muted-foreground hover:text-destructive"
                                onClick={() => removeFromCart(item.blockId)}
                                aria-label="Verwijderen"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
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
                                onChange={(e) =>
                                  updateItem(item.blockId, {
                                    preferredTime: e.target.value || null,
                                  })
                                }
                                className="h-8 w-32"
                              />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>

            <div className="flex flex-col sm:flex-row gap-3 justify-between items-stretch sm:items-center">
              <Button asChild variant="ghost" size="sm">
                <Link to="/bouwstenen">
                  <ArrowLeft className="h-4 w-4 mr-1" /> Terug naar alle bouwstenen
                </Link>
              </Button>
              <div className="flex flex-col sm:flex-row gap-2">
                <Button asChild variant="outline">
                  <Link to="/programma-samenstellen">
                    Toch meerdaags programma
                  </Link>
                </Button>
                <Button onClick={handleSubmitToContact} size="lg">
                  Door naar contactgegevens
                  <ArrowRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            </div>

            <AddActivitySheet
              open={addSheetOpen}
              onOpenChange={setAddSheetOpen}
              existingBlockIds={cartItems.map((i) => i.blockId)}
              onAddActivity={handleAdd}
            />
          </>
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
      </main>

      <Footer />
    </div>
  );
};

export default SnelAanvragen;
